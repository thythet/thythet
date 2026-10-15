//! The browser shell: web `Services`, drag-and-drop, and the eframe web runner.

use deckcraft_engine::Session;
use deckcraft_ui_egui::{Inbox, InboxEvent, InboxFile, Services, SlideApp};
use wasm_bindgen::JsCast as _;

#[path = "bible_data.rs"]
mod bible_data;

use serde_json::json;
use std::{cell::RefCell, rc::Rc};

const PRESENTATION_EXTS: &[&str] = &["deckcraft", "pptx", "potx", "ppsx", "txt", "md"];
const PICTURE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff"];
const AUDIO_EXTS: &[&str] = &["wav", "mp3", "m4a", "aac", "flac", "ogg", "opus", "aif", "aiff"];
const VIDEO_EXTS: &[&str] = &["mp4", "m4v", "mov", "webm"];
const CANVAS_ID: &str = "deckcraft_canvas";
const LOADING_ID: &str = "deckcraft_loading";

pub fn start() {
    eframe::WebLogger::init(log::LevelFilter::Info).ok();
    wasm_bindgen_futures::spawn_local(async {
        let Some(document) = web_sys::window().and_then(|w| w.document()) else {
            log::error!("no document");
            return;
        };
        let Some(canvas) = document.get_element_by_id(CANVAS_ID).and_then(|e| e.dyn_into::<web_sys::HtmlCanvasElement>().ok()) else {
            log::error!("missing <canvas id=\"{CANVAS_ID}\">");
            return;
        };
        let mut options = eframe::WebOptions::default();
        if query().contains("webgl")
            && let eframe::egui_wgpu::WgpuSetup::CreateNew(create) = &mut options.wgpu_options.wgpu_setup
        {
            create.instance_descriptor.backends = eframe::wgpu::Backends::GL;
        }
        let result = eframe::WebRunner::new()
            .start(
                canvas,
                options,
                Box::new(move |cc| {
                    if let Some(rs) = &cc.wgpu_render_state {
                        log::info!("deckcraft-web {}: wgpu backend {:?}", env!("CARGO_PKG_VERSION"), rs.adapter.get_info().backend);
                    }
                    let inbox: Inbox = Inbox::default();
                    let mut app = SlideApp::new(Session::new(), services(inbox.clone(), cc.egui_ctx.clone()));
                    let q = query();
                    if !q.contains("blank") {
                        if let Err(e) = deckcraft_engine::sample::open_sample(&mut app.session) {
                            log::error!("sample deck: {e}");
                        }
                    } else if let Err(e) = app.run("file.new", serde_json::json!({})) {
                        log::error!("new presentation: {e}");
                    }
                    if q.contains("show") {
                        app.start_show(0, false);
                    }
                    Ok(Box::new(WebShell { app, inbox, bible: BibleGenerator::default() }))
                }),
            )
            .await;
        if let Some(el) = document.get_element_by_id(LOADING_ID) {
            match result {
                Ok(()) => el.remove(),
                Err(e) => el.set_inner_html(&format!("<p>DeckCraft failed to start: {e:?}</p><p>A browser with WebGPU or WebGL2 is required.</p>")),
            }
        }
    });
}

fn query() -> String {
    web_sys::window().and_then(|w| w.location().search().ok()).unwrap_or_default()
}

/// Wraps the app to read dropped files asynchronously (browsers can't read them synchronously)
/// and feed them through the inbox.
struct WebShell {
    app: SlideApp,
    inbox: Inbox,
    bible: BibleGenerator,
}

impl eframe::App for WebShell {
    fn logic(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        let dropped = ctx.input_mut(|i| std::mem::take(&mut i.raw.dropped_files));
        for f in dropped {
            // Capture the document and slide now. The bytes arrive later, after the user may
            // have switched slides.
            let id = self.app.begin_external_file("drop");
            let inbox = self.inbox.clone();
            let ctx = ctx.clone();
            wasm_bindgen_futures::spawn_local(async move {
                let name = f.path().file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "dropped".into());
                match f.bytes_async().await {
                    Ok(bytes) => {
                        push_inbox(&inbox, InboxEvent::File(InboxFile { id, name, bytes }));
                        ctx.request_repaint();
                    }
                    Err(e) => {
                        log::error!("couldn't read dropped file {name}: {e}");
                        push_inbox(&inbox, InboxEvent::Cancelled { id });
                        ctx.request_repaint();
                    }
                }
            });
        }
        self.app.logic(ctx);
    }

    fn raw_input_hook(&mut self, _ctx: &egui::Context, raw: &mut egui::RawInput) {
        self.app.raw_input_hook(raw);
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        self.app.ui(ui);
        if self.app.show.is_none() {
            self.bible.ui(ui.ctx(), &mut self.app);
        }
    }
}



#[derive(Clone)]
struct BibleVerse {
    number: usize,
    text: String,
}

struct BibleBook {
    id: String,
    name: String,
    chapters: Vec<Vec<BibleVerse>>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum BibleGroupMode {
    One,
    Two,
    Three,
    BestFit,
}

impl BibleGroupMode {
    fn label(self) -> &'static str {
        match self {
            Self::One => "1 verse / slide",
            Self::Two => "2 verses / slide",
            Self::Three => "3 verses / slide",
            Self::BestFit => "Smart Best Fit",
        }
    }
}

struct BibleGenerator {
    open: bool,
    book_index: usize,
    chapter: usize,
    verse_start: usize,
    verse_end: usize,
    loaded_book: Option<BibleBook>,
    loaded_id: String,
    loading_id: String,
    pending_book: Rc<RefCell<Option<(String, Result<String, String>)>>>,
    group_mode: BibleGroupMode,
    max_font_size: f32,
    min_font_size: f32,
    include_reference: bool,
    include_verse_numbers: bool,
    title_slide: bool,
    font_family: String,
    status: String,
}

impl Default for BibleGenerator {
    fn default() -> Self {
        Self {
            open: false,
            book_index: 0,
            chapter: 1,
            verse_start: 1,
            verse_end: 1,
            loaded_book: None,
            loaded_id: String::new(),
            loading_id: String::new(),
            pending_book: Rc::new(RefCell::new(None)),
            group_mode: BibleGroupMode::BestFit,
            max_font_size: 34.0,
            min_font_size: 20.0,
            include_reference: true,
            include_verse_numbers: true,
            title_slide: false,
            font_family: String::new(),
            status: String::new(),
        }
    }
}

impl BibleGenerator {
    fn ui(&mut self, ctx: &egui::Context, app: &mut SlideApp) {
        egui::Area::new(egui::Id::new("deckcraft_bible_quick_button"))
            .anchor(egui::Align2::RIGHT_TOP, egui::vec2(-12.0, 88.0))
            .order(egui::Order::Foreground)
            .show(ctx, |ui| {
                egui::Frame::popup(ui.style()).show(ui, |ui| {
                    if ui.button("Bible Generate").clicked() {
                        self.open = true;
                    }
                });
            });

        if !self.open {
            return;
        }

        self.poll_book_load();
        self.ensure_book_loaded(ctx);
        let mut open = self.open;
        egui::Window::new("Bible Generate · Khmer 1954")
            .id(egui::Id::new("deckcraft_bible_generator"))
            .open(&mut open)
            .default_width(500.0)
            .min_width(420.0)
            .resizable(true)
            .collapsible(false)
            .show(ctx, |ui| {
                ui.label("Generate Bible slides directly into the current DeckCraft presentation.");
                ui.add_space(6.0);

                let old_book = self.book_index;
                egui::ComboBox::from_id_salt("bible_book")
                    .selected_text(bible_data::BOOKS.get(self.book_index).map(|b| b.1).unwrap_or("Bible"))
                    .width(ui.available_width())
                    .show_ui(ui, |ui| {
                        for (i, (_, name, _)) in bible_data::BOOKS.iter().enumerate() {
                            ui.selectable_value(&mut self.book_index, i, *name);
                        }
                    });
                if old_book != self.book_index {
                    self.loaded_id.clear();
                    self.loading_id.clear();
                    self.loaded_book = None;
                    self.chapter = 1;
                    self.verse_start = 1;
                    self.verse_end = 1;
                    self.ensure_book_loaded(ctx);
                }

                let chapter_count = self.loaded_book.as_ref().map_or(1, |b| b.chapters.len().max(1));
                ui.horizontal(|ui| {
                    ui.label("Chapter");
                    ui.add(egui::DragValue::new(&mut self.chapter).range(1..=chapter_count).speed(0.15));
                    let verse_count = self.current_verses().len().max(1);
                    if self.verse_start > verse_count { self.verse_start = verse_count; }
                    if self.verse_end > verse_count { self.verse_end = verse_count; }
                    ui.separator();
                    ui.label("Verses");
                    ui.add(egui::DragValue::new(&mut self.verse_start).range(1..=verse_count).speed(0.15));
                    ui.label("to");
                    ui.add(egui::DragValue::new(&mut self.verse_end).range(1..=verse_count).speed(0.15));
                    if self.verse_end < self.verse_start { self.verse_end = self.verse_start; }
                });

                ui.add_space(5.0);
                egui::ComboBox::from_id_salt("bible_group_mode")
                    .selected_text(self.group_mode.label())
                    .show_ui(ui, |ui| {
                        ui.selectable_value(&mut self.group_mode, BibleGroupMode::BestFit, BibleGroupMode::BestFit.label());
                        ui.selectable_value(&mut self.group_mode, BibleGroupMode::One, BibleGroupMode::One.label());
                        ui.selectable_value(&mut self.group_mode, BibleGroupMode::Two, BibleGroupMode::Two.label());
                        ui.selectable_value(&mut self.group_mode, BibleGroupMode::Three, BibleGroupMode::Three.label());
                    });

                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.include_verse_numbers, "Verse numbers");
                    ui.checkbox(&mut self.include_reference, "Reference");
                    ui.checkbox(&mut self.title_slide, "Title slide");
                });

                ui.horizontal(|ui| {
                    ui.label("Max font");
                    ui.add(egui::Slider::new(&mut self.max_font_size, 20.0..=54.0).suffix(" pt"));
                    ui.label("Min");
                    ui.add(egui::Slider::new(&mut self.min_font_size, 12.0..=32.0).suffix(" pt"));
                });
                if self.min_font_size > self.max_font_size {
                    self.min_font_size = self.max_font_size;
                }

                ui.horizontal(|ui| {
                    ui.label("Font");
                    ui.text_edit_singleline(&mut self.font_family);
                });
                ui.small("Leave Font blank to keep DeckCraft/theme font. Autofit Shrink is always applied so long Khmer verses do not crop.");

                ui.separator();
                let selected = self.selected_verses();
                let group_count = self.group_verses(&selected).len();
                ui.horizontal(|ui| {
                    ui.strong(format!("{} verse{}", selected.len(), if selected.len() == 1 { "" } else { "s" }));
                    ui.label(format!("→ {group_count} slide{}", if group_count == 1 { "" } else { "s" }));
                });

                egui::ScrollArea::vertical().max_height(175.0).show(ui, |ui| {
                    if selected.is_empty() {
                        ui.weak("No verses selected.");
                    } else {
                        for verse in selected.iter().take(12) {
                            ui.label(format!("{}  {}", verse.number, verse.text));
                        }
                        if selected.len() > 12 {
                            ui.weak(format!("…and {} more", selected.len() - 12));
                        }
                    }
                });

                if !self.status.is_empty() {
                    ui.separator();
                    ui.label(&self.status);
                }

                ui.separator();
                ui.horizontal(|ui| {
                    if ui.button("Generate Slides").clicked() {
                        match self.generate(app) {
                            Ok(n) => {
                                self.status = format!("Generated {n} Bible slide{}.", if n == 1 { "" } else { "s" });
                                app.notify(self.status.clone());
                            }
                            Err(e) => {
                                self.status = e.clone();
                                app.notify(e);
                            }
                        }
                    }
                    if ui.button("Select whole chapter").clicked() {
                        let n = self.current_verses().len().max(1);
                        self.verse_start = 1;
                        self.verse_end = n;
                    }
                    if ui.button("Close").clicked() {
                        self.open = false;
                    }
                });
            });
        self.open = open && self.open;
    }

    fn poll_book_load(&mut self) {
        let pending = self.pending_book.borrow_mut().take();
        let Some((id, result)) = pending else { return };
        if self.loading_id == id {
            self.loading_id.clear();
        }
        match result.and_then(|raw| parse_bible_book(&id, &raw)) {
            Ok(book) => {
                self.loaded_id = id;
                self.loaded_book = Some(book);
                self.chapter = 1;
                self.verse_start = 1;
                self.verse_end = 1;
                self.status.clear();
            }
            Err(e) => {
                self.loaded_book = None;
                self.loaded_id.clear();
                self.status = e;
            }
        }
    }

    fn ensure_book_loaded(&mut self, ctx: &egui::Context) {
        let Some((id, _, _)) = bible_data::BOOKS.get(self.book_index).copied() else { return };
        if self.loaded_id == id && self.loaded_book.is_some() {
            return;
        }
        if self.loading_id == id {
            return;
        }
        self.loading_id = id.to_string();
        self.status = format!("Loading {id} from Tahoe Bible data…");
        let pending = self.pending_book.clone();
        let ctx = ctx.clone();
        let id_owned = id.to_string();
        wasm_bindgen_futures::spawn_local(async move {
            let result = fetch_bible_book_text(&id_owned).await;
            *pending.borrow_mut() = Some((id_owned, result));
            ctx.request_repaint();
        });
    }

    fn current_verses(&self) -> &[BibleVerse] {
        self.loaded_book
            .as_ref()
            .and_then(|b| b.chapters.get(self.chapter.saturating_sub(1)))
            .map(Vec::as_slice)
            .unwrap_or(&[])
    }

    fn selected_verses(&self) -> Vec<BibleVerse> {
        let verses = self.current_verses();
        if verses.is_empty() { return Vec::new(); }
        let start = self.verse_start.max(1).min(verses.len());
        let end = self.verse_end.max(start).min(verses.len());
        verses[start - 1..end].to_vec()
    }

    fn group_verses(&self, verses: &[BibleVerse]) -> Vec<Vec<BibleVerse>> {
        match self.group_mode {
            BibleGroupMode::One => verses.chunks(1).map(<[BibleVerse]>::to_vec).collect(),
            BibleGroupMode::Two => verses.chunks(2).map(<[BibleVerse]>::to_vec).collect(),
            BibleGroupMode::Three => verses.chunks(3).map(<[BibleVerse]>::to_vec).collect(),
            BibleGroupMode::BestFit => smart_bible_groups(verses),
        }
    }

    fn generate(&self, app: &mut SlideApp) -> Result<usize, String> {
        let selected = self.selected_verses();
        if selected.is_empty() {
            return Err("Choose at least one verse.".into());
        }
        let book = self.loaded_book.as_ref().ok_or_else(|| "Bible book is not loaded.".to_string())?;
        let groups = self.group_verses(&selected);
        if groups.is_empty() {
            return Err("No Bible slides to generate.".into());
        }

        let first = selected.first().map_or(1, |v| v.number);
        let last = selected.last().map_or(first, |v| v.number);
        let mut made = 0usize;

        if self.title_slide {
            app.run("slide.new", json!({"layout": "blank"}))?;
            let title = if first == last {
                format!("{} {}:{}", book.name, self.chapter, first)
            } else {
                format!("{} {}:{}–{}", book.name, self.chapter, first, last)
            };
            app.run("insert.textBox", json!({"rect": [80.0, 135.0, 800.0, 250.0], "text": title}))?;
            self.apply_text_style(app, 40.0, true)?;
            made += 1;
        }

        for group in groups {
            app.run("slide.new", json!({"layout": "blank"}))?;
            let body = group
                .iter()
                .map(|v| {
                    if self.include_verse_numbers { format!("{}  {}", v.number, v.text) } else { v.text.clone() }
                })
                .collect::<Vec<_>>()
                .join("\n\n");

            let body_height = if self.include_reference { 385.0 } else { 435.0 };
            app.run("insert.textBox", json!({"rect": [60.0, 45.0, 840.0, body_height], "text": body}))?;
            let fitted = estimate_bible_font(&group, self.max_font_size, self.min_font_size);
            self.apply_text_style(app, fitted, true)?;
            app.run("format.autofit", json!({"mode": "shrink"}))?;

            if self.include_reference {
                let gfirst = group.first().map_or(first, |v| v.number);
                let glast = group.last().map_or(gfirst, |v| v.number);
                let reference = if gfirst == glast {
                    format!("{} {}:{}", book.name, self.chapter, gfirst)
                } else {
                    format!("{} {}:{}–{}", book.name, self.chapter, gfirst, glast)
                };
                app.run("insert.textBox", json!({"rect": [60.0, 455.0, 840.0, 45.0], "text": reference}))?;
                self.apply_text_style(app, 17.0, false)?;
                app.run("format.autofit", json!({"mode": "shrink"}))?;
            }
            made += 1;
        }
        Ok(made)
    }

    fn apply_text_style(&self, app: &mut SlideApp, size: f32, middle: bool) -> Result<(), String> {
        if !self.font_family.trim().is_empty() {
            app.run("format.font", json!({"family": self.font_family.trim()}))?;
        }
        app.run("format.size", json!({"size": size}))?;
        app.run("format.alignCenter", json!({}))?;
        if middle {
            app.run("format.anchor", json!({"anchor": "middle"}))?;
        }
        Ok(())
    }
}

fn smart_bible_groups(verses: &[BibleVerse]) -> Vec<Vec<BibleVerse>> {
    let mut out = Vec::new();
    let mut current: Vec<BibleVerse> = Vec::new();
    let mut chars = 0usize;
    for verse in verses {
        let n = verse.text.chars().count() + 8;
        let limit = if current.is_empty() { 310 } else { 260 };
        if !current.is_empty() && (current.len() >= 3 || chars + n > limit) {
            out.push(std::mem::take(&mut current));
            chars = 0;
        }
        current.push(verse.clone());
        chars += n;
        if n > 300 {
            out.push(std::mem::take(&mut current));
            chars = 0;
        }
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

fn estimate_bible_font(group: &[BibleVerse], max_size: f32, min_size: f32) -> f32 {
    let chars: usize = group.iter().map(|v| v.text.chars().count() + 8).sum();
    let paragraphs = group.len().max(1) as f32;
    let mut size = max_size;
    // Conservative estimate for Khmer glyph widths in a centered 840×385 pt box.
    loop {
        let chars_per_line = (840.0 / (size * 0.58)).max(8.0);
        let lines = (chars as f32 / chars_per_line).ceil() + (paragraphs - 1.0) * 0.75;
        let needed = lines * size * 1.28;
        if needed <= 360.0 || size <= min_size {
            return size.max(min_size).min(max_size);
        }
        size -= 1.0;
    }
}

async fn fetch_bible_book_text(id: &str) -> Result<String, String> {
    let window = web_sys::window().ok_or_else(|| "Browser window unavailable.".to_string())?;
    let url = format!("../../data/books/{id}.json");
    let response = wasm_bindgen_futures::JsFuture::from(window.fetch_with_str(&url))
        .await
        .map_err(|e| format!("Bible download failed: {e:?}"))?;
    let response: web_sys::Response = response
        .dyn_into()
        .map_err(|_| "Bible response was invalid.".to_string())?;
    if !response.ok() {
        return Err(format!("Bible data {id} returned HTTP {}.", response.status()));
    }
    let text = response
        .text()
        .map_err(|e| format!("Bible response error: {e:?}"))?;
    let text = wasm_bindgen_futures::JsFuture::from(text)
        .await
        .map_err(|e| format!("Bible text read failed: {e:?}"))?;
    text.as_string().ok_or_else(|| "Bible response was not text.".to_string())
}

fn parse_bible_book(id: &str, raw: &str) -> Result<BibleBook, String> {
    let value: serde_json::Value = serde_json::from_str(raw).map_err(|e| format!("Bible data error: {e}"))?;
    let name = value.get("nameKm").and_then(serde_json::Value::as_str).unwrap_or(id).to_string();
    let chapter_count = value
        .get("chapterCount")
        .and_then(serde_json::Value::as_u64)
        .map(|n| n as usize)
        .unwrap_or(0);
    let chapters_obj = value.get("chapters").and_then(serde_json::Value::as_object).ok_or_else(|| "Bible book has no chapters.".to_string())?;
    let mut chapters = Vec::with_capacity(chapter_count.max(chapters_obj.len()));
    let count = chapter_count.max(chapters_obj.len());
    for chapter_no in 1..=count {
        let chapter = chapters_obj.get(&chapter_no.to_string());
        let verses_obj = chapter.and_then(|c| c.get("verses")).and_then(serde_json::Value::as_object);
        let mut verses = Vec::new();
        if let Some(map) = verses_obj {
            let mut numbered: Vec<(usize, String)> = map
                .iter()
                .filter_map(|(k, v)| Some((k.parse::<usize>().ok()?, v.as_str()?.to_string())))
                .collect();
            numbered.sort_by_key(|(n, _)| *n);
            verses.extend(numbered.into_iter().map(|(number, text)| BibleVerse { number, text }));
        }
        chapters.push(verses);
    }
    Ok(BibleBook { id: id.to_string(), name, chapters })
}

/// Web services: no file paths, so `pick_open`/`pick_save`/`read` stay `None` and the UI falls
/// back to `open_async` (browser picker → inbox) and `download`.
fn services(inbox: Inbox, ctx: egui::Context) -> Services {
    let open_inbox = inbox.clone();
    Services {
        open_async: Some(Box::new(move |purpose: &str, request: u64| {
            let inbox = open_inbox.clone();
            let ctx = ctx.clone();
            let dialog = match purpose {
                "picture" => rfd::AsyncFileDialog::new().add_filter("Pictures", PICTURE_EXTS),
                "audio" => rfd::AsyncFileDialog::new().add_filter("Audio", AUDIO_EXTS),
                "video" => rfd::AsyncFileDialog::new().add_filter("Video", VIDEO_EXTS),
                _ => rfd::AsyncFileDialog::new().add_filter("Presentations", PRESENTATION_EXTS),
            };
            wasm_bindgen_futures::spawn_local(async move {
                let Some(file) = dialog.pick_file().await else {
                    push_inbox(&inbox, InboxEvent::Cancelled { id: request });
                    ctx.request_repaint();
                    return;
                };
                let bytes = file.read().await;
                push_inbox(&inbox, InboxEvent::File(InboxFile { id: request, name: file.file_name(), bytes }));
                ctx.request_repaint();
            });
        })),
        write: Some(Box::new(|name: &str, bytes: &[u8]| download(name, bytes))),
        download: Some(Box::new(|name: &str, bytes: &[u8]| {
            if let Err(e) = download(name, bytes) {
                log::error!("download of {name} failed: {e}");
            }
        })),
        inbox: Some(inbox),
        ..Default::default()
    }
}

fn push_inbox(inbox: &Inbox, event: InboxEvent) {
    inbox.lock().unwrap_or_else(|e| e.into_inner()).push(event);
}

/// Trigger a browser download of `bytes` named after the last component of `path`.
fn download(path: &str, bytes: &[u8]) -> Result<(), String> {
    let js = |e: wasm_bindgen::JsValue| format!("{e:?}");
    let name = std::path::Path::new(path).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "deckcraft".into());
    let window = web_sys::window().ok_or("no window")?;
    let document = window.document().ok_or("no document")?;
    let parts = js_sys::Array::of1(&js_sys::Uint8Array::from(bytes));
    let opts = web_sys::BlobPropertyBag::new();
    opts.set_type(mime_for(&name));
    let blob = web_sys::Blob::new_with_u8_array_sequence_and_options(&parts, &opts).map_err(js)?;
    let url = web_sys::Url::create_object_url_with_blob(&blob).map_err(js)?;
    let a: web_sys::HtmlAnchorElement = document.create_element("a").map_err(js)?.dyn_into().map_err(|_| "not an anchor")?;
    a.set_href(&url);
    a.set_download(&name);
    a.style().set_property("display", "none").map_err(js)?;
    let body = document.body().ok_or("no body")?;
    body.append_child(&a).map_err(js)?;
    a.click();
    a.remove();
    // Revoke after the click has been dispatched; the download keeps its own reference.
    let revoke = wasm_bindgen::closure::Closure::once_into_js(move || {
        web_sys::Url::revoke_object_url(&url).ok();
    });
    window.set_timeout_with_callback_and_timeout_and_arguments_0(revoke.unchecked_ref(), 10_000).map_err(js)?;
    Ok(())
}

fn mime_for(name: &str) -> &'static str {
    match name.rsplit('.').next().map(str::to_ascii_lowercase).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("pdf") => "application/pdf",
        Some("gif") => "image/gif",
        Some("txt") => "text/plain",
        Some("pptx") => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        Some("deckcraft") => "application/zip",
        _ => "application/octet-stream",
    }
}
