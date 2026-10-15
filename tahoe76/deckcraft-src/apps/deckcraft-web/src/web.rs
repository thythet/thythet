//! The browser shell: web `Services`, drag-and-drop, and the eframe web runner.

use deckcraft_engine::Session;
use deckcraft_ui_egui::{Inbox, InboxEvent, InboxFile, Services, SlideApp};
use wasm_bindgen::JsCast as _;

#[path = "bible_data.rs"]
mod bible_data;

use serde_json::json;
use std::{cell::RefCell, collections::HashMap, rc::Rc};

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
        // Load real OpenType/TrueType Khmer faces before the editor initializes.
        // Both the slide renderer and egui's widget glyph fallback need them.
        let khmer_face = load_tahoe_fonts().await;
        // Tahoe shares one font manifest with the editor. Register every Khmer face
        // in egui as well as FontDb, so UI text and generated slides use the same fonts.
        let db = deckcraft_fonts::FontDb::global();
        let khmer_ui_faces: Vec<_> = db.families().into_iter()
            .flat_map(|family| db.styles(&family).into_iter().map(move |style| (family.clone(), style)))
            .map(|(family, style)| db.face(&family, &style))
            .filter(|face| face.covers('ក') && !face.is_color() && face.data().len() < (20 << 20))
            .collect();
        let default_khmer_family = khmer_face.as_ref().map(|f| f.family.clone())
            .unwrap_or_else(|| "SONYHEAD5".to_owned());

        // Tahoe web build uses eframe's native Glow/WebGL2 renderer.
        // This avoids the wgpu/WebGPU initialization path, which can stall inside embedded app windows.
        let mut options = eframe::WebOptions::default();
        options.renderer = eframe::Renderer::Glow;
        options.webgl_context_option = eframe::WebGlContextOption::WebGl2;
        let result = eframe::WebRunner::new()
            .start(
                canvas,
                options,
                Box::new(move |cc| {
                    log::info!("deckcraft-web {}: Glow/WebGL2 renderer", env!("CARGO_PKG_VERSION"));
                    let inbox: Inbox = Inbox::default();
                    let mut app = SlideApp::new(Session::new(), services(inbox.clone(), cc.egui_ctx.clone()));
                    // egui/epaint has a separate font atlas from DeckCraft's document font database.
                    // Install the Khmer face in both, or dialogs/edit boxes still show tofu squares.
                    app.ui_fonts.faces.extend(khmer_ui_faces.iter().cloned());
                    let q = query();
                    if !q.contains("blank") {
                        if let Err(e) = deckcraft_engine::sample::open_sample(&mut app.session) {
                            log::error!("sample deck: {e}");
                        }
                    } else if let Err(e) = app.run("file.new", serde_json::json!({})) {
                        log::error!("new presentation: {e}");
                    } else {
                        // Reserve the actual first slide as hidden, editable Smart Generate input.
                        // Human numbering begins with 0 for this slide; generated slides start at 1.
                        if let Err(e) = app.run("slide.rename", json!({"index":0,"name":"✦ Smart Generate Input"})) {
                            log::warn!("Source slide rename: {e}");
                        }
                        if let Err(e) = app.run("slide.hide", json!({"index":0,"hidden":true})) {
                            log::warn!("Source slide hide: {e}");
                        }
                    }
                    if q.contains("show") {
                        app.start_show(0, false);
                    }
                    let mut smart = SmartGenerator::default();
                    smart.font_family = if db.has_family(BIBLE_DEFAULT_FONT) { BIBLE_DEFAULT_FONT.to_owned() } else { default_khmer_family.clone() };
                    let mut bible = BibleGenerator::default();
                    bible.font_family = if db.has_family(BIBLE_DEFAULT_FONT) { BIBLE_DEFAULT_FONT.to_owned() } else { default_khmer_family.clone() };
                    Ok(Box::new(WebShell { app, inbox, smart, bible, typography: TypographyPanel::default(), presenting: false }))
                }),
            )
            .await;
        // Load the optional Khmer OS pack only after the editor has mounted.
        // The first paint must never wait for 40 font network requests.
        if result.is_ok() {
            wasm_bindgen_futures::spawn_local(async { load_remaining_tahoe_fonts().await; });
        }
        if let Some(el) = document.get_element_by_id(LOADING_ID) {
            match result {
                Ok(()) => el.remove(),
                Err(e) => el.set_inner_html(&format!("<p>PowerSlidePro failed to start: {e:?}</p><p>A browser with WebGPU or WebGL2 is required.</p>")),
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
    smart: SmartGenerator,
    bible: BibleGenerator,
    typography: TypographyPanel,
    presenting: bool,
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
        self.sync_present_mode();
        if self.app.show.is_none() {
            let take = |key: egui::Id| ui.ctx().data_mut(|d| {
                let clicked = d.get_temp::<bool>(key).unwrap_or(false);
                if clicked { d.insert_temp(key, false); }
                clicked
            });
            for (action, command) in [("close", "close"), ("minimize", "minimize"), ("zoom", "zoom")] {
                if take(egui::Id::new(("tahoe-deckcraft-window", action))) {
                    post_parent_window(command);
                }
            }
            if take(egui::Id::new("tahoe-smart-quick")) {
                // Source is always slide zero; no source slides are added in front of it.
                if self.app.session.active().is_some_and(|d| d.doc.slides.first().is_some_and(|s| s.name == "✦ Smart Generate Input")) {
                    let _ = self.app.run("slide.go", json!({"index": 0}));
                }
                self.smart.open = true;
            }
            if take(egui::Id::new("tahoe-bible-quick")) {
                self.bible.open = true;
            }
            self.smart.ui(ui.ctx(), &mut self.app);
            self.bible.ui(ui.ctx(), &mut self.app);
            self.typography.ui(ui.ctx(), &mut self.app);
        }
    }
}

impl WebShell {
    fn sync_present_mode(&mut self) {
        let active = self.app.show.is_some();
        if active == self.presenting {
            return;
        }
        self.presenting = active;
        post_parent_present(active);
    }
}




#[derive(Clone, Copy, PartialEq, Eq)]
enum ApplyScope {
    All, Box, Selection, Headings, Verses, Content, CurrentSlide, SelectedSlides, VerseNumbers,
}
impl ApplyScope {
    fn label(self) -> &'static str {
        match self {
            Self::All => "All presentation text",
            Self::Box => "Only this text box",
            Self::Selection => "Only selected characters",
            Self::Headings => "All Bible chapter/book headings",
            Self::Verses => "All Bible verse content",
            Self::Content => "All non-Bible content",
            Self::CurrentSlide => "Current slide",
            Self::SelectedSlides => "Selected slides",
            Self::VerseNumbers => "Bible verse numbers only",
        }
    }
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum VerseBaseline { Normal, Super, Sub }
impl VerseBaseline {
    fn label(self) -> &'static str {
        match self { Self::Normal => "Normal", Self::Super => "Superscript", Self::Sub => "Subscript" }
    }
}
struct TypographyPanel {
    open: bool,
    scope: ApplyScope,
    font: String,
    font_size: f32,
    line_spacing: f32,
    set_font: bool,
    set_size: bool,
    set_spacing: bool,
    set_bold: bool, bold: bool,
    set_italic: bool, italic: bool,
    set_underline: bool, underline: bool,
    set_color: bool, color: String,
    set_align: bool, align: String,
    set_anchor: bool, anchor: String,
    set_baseline: bool,
    convert_numbers: bool, number_style: VerseNumberStyle,
    baseline: VerseBaseline,
    status: String,
}
impl Default for TypographyPanel {
    fn default() -> Self {
        Self {
            open: false, scope: ApplyScope::Box,
            font: BIBLE_DEFAULT_FONT.to_owned(), font_size: 40.0, line_spacing: 1.5,
            set_font: true, set_size: true, set_spacing: false,
            set_bold: false, bold: false, set_italic: false, italic: false,
            set_underline: false, underline: false, set_color: false, color: "#000000".into(),
            set_align: false, align: "center".into(),
            set_anchor: false, anchor: "top".into(), set_baseline: false,
            convert_numbers: false, number_style: VerseNumberStyle::Khmer,
            baseline: VerseBaseline::Normal, status: String::new(),
        }
    }
}
impl TypographyPanel {
    fn ui(&mut self, ctx: &egui::Context, app: &mut SlideApp) {
        egui::Area::new(egui::Id::new("tahoe-format-apply-shortcut"))
            .anchor(egui::Align2::RIGHT_TOP, egui::vec2(-12.0, 85.0))
            .show(ctx, |ui| {
                if ui.small_button("Aa · Apply To").clicked() { self.open = !self.open; }
            });
        if !self.open { return; }
        let mut open = self.open;
        let mut apply_now = false;
        egui::Window::new("Typography · Apply To")
            .id(egui::Id::new("tahoe-typography-apply"))
            .open(&mut open)
            .default_width(340.0)
            .resizable(true)
            .show(ctx, |ui| {
                ui.label("Apply font and paragraph formatting by text role.");
                ui.separator();
                ui.label("Apply to");
                egui::ComboBox::from_id_salt("tahoe-format-scope")
                    .selected_text(self.scope.label())
                    .width(275.0)
                    .show_ui(ui, |ui| {
                        for scope in [ApplyScope::All, ApplyScope::Box, ApplyScope::Selection,
                            ApplyScope::Headings, ApplyScope::Verses, ApplyScope::Content,
                            ApplyScope::CurrentSlide, ApplyScope::SelectedSlides, ApplyScope::VerseNumbers] {
                            ui.selectable_value(&mut self.scope, scope, scope.label());
                        }
                    });
                ui.separator();
                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.set_font, "Font");
                    if self.set_font {
                        egui::ComboBox::from_id_salt("tahoe-apply-font")
                            .selected_text(&self.font).width(190.0).show_ui(ui, |ui| {
                                for family in deckcraft_fonts::FontDb::global().families() {
                                    ui.selectable_value(&mut self.font, family.clone(), family);
                                }
                            });
                    }
                });
                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.set_size, "Size");
                    if self.set_size { ui.add(egui::DragValue::new(&mut self.font_size).range(1.0..=200.0).speed(0.5).suffix(" pt")); }
                });
                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.set_spacing, "Line spacing");
                    if self.set_spacing { ui.add(egui::DragValue::new(&mut self.line_spacing).range(0.5..=4.0).speed(0.05)); }
                });
                ui.horizontal(|ui| { ui.checkbox(&mut self.set_bold,"Bold"); if self.set_bold { ui.checkbox(&mut self.bold,"On"); } });
                ui.horizontal(|ui| { ui.checkbox(&mut self.set_italic,"Italic"); if self.set_italic { ui.checkbox(&mut self.italic,"On"); } });
                ui.horizontal(|ui| { ui.checkbox(&mut self.set_underline,"Underline"); if self.set_underline { ui.checkbox(&mut self.underline,"On"); } });
                ui.horizontal(|ui| { ui.checkbox(&mut self.set_color,"Color"); if self.set_color { ui.text_edit_singleline(&mut self.color); } });
                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.set_align,"Horizontal align");
                    if self.set_align {
                        egui::ComboBox::from_id_salt("tahoe-apply-align").selected_text(&self.align).show_ui(ui,|ui|{
                            for a in ["left","center","right","justify"] { ui.selectable_value(&mut self.align,a.to_owned(),a); }
                        });
                    }
                });
                ui.horizontal(|ui| {
                    ui.checkbox(&mut self.set_anchor,"Vertical align");
                    if self.set_anchor {
                        egui::ComboBox::from_id_salt("tahoe-apply-anchor").selected_text(&self.anchor).show_ui(ui,|ui|{
                            for a in ["top","middle","bottom"] { ui.selectable_value(&mut self.anchor,a.to_owned(),a); }
                        });
                    }
                });
                if self.scope == ApplyScope::VerseNumbers {
                    ui.checkbox(&mut self.convert_numbers,"Convert verse number digits");
                    if self.convert_numbers {
                        egui::ComboBox::from_id_salt("tahoe-verse-digits")
                            .selected_text(self.number_style.label()).show_ui(ui,|ui|{
                                for style in [VerseNumberStyle::Khmer,VerseNumberStyle::English,VerseNumberStyle::Source] {
                                    ui.selectable_value(&mut self.number_style,style,style.label());
                                }
                            });
                    }
                    ui.label("Verse number position");
                    egui::ComboBox::from_id_salt("tahoe-verse-baseline")
                        .selected_text(self.baseline.label()).show_ui(ui, |ui| {
                            for option in [VerseBaseline::Normal, VerseBaseline::Super, VerseBaseline::Sub] {
                                ui.selectable_value(&mut self.baseline, option, option.label());
                            }
                        });
                    ui.small("Changes only numeric verse prefixes, not the verse text.");
                } else {
                    ui.checkbox(&mut self.set_baseline,"Superscript / subscript");
                    if self.set_baseline {
                        egui::ComboBox::from_id_salt("tahoe-apply-baseline").selected_text(self.baseline.label()).show_ui(ui,|ui|{
                            for v in [VerseBaseline::Normal,VerseBaseline::Super,VerseBaseline::Sub]{
                                ui.selectable_value(&mut self.baseline,v,v.label());
                            }
                        });
                    }
                }
                ui.separator();
                if ui.button("Apply formatting").clicked() { apply_now = true; }
                if !self.status.is_empty() { ui.small(&self.status); }
            });
        self.open = open;
        if apply_now {
            self.status = match self.apply(app) {
                Ok(n) => format!("Applied formatting to {n} text item(s)."),
                Err(e) => e,
            };
        }
    }
    fn apply_to_selected(&self, app: &mut SlideApp) -> Result<(), String> {
        if self.set_font && !self.font.trim().is_empty() {
            app.run("format.font", json!({"family":self.font.trim()}))?;
        }
        if self.set_size {
            app.run("format.size", json!({"size":self.font_size.clamp(1.0,200.0)}))?;
        }
        if self.set_spacing {
            app.run("format.lineSpacing", json!({"lines":self.line_spacing.clamp(0.5,4.0)}))?;
        }
        if self.set_bold { app.run("format.bold",json!({"on":self.bold}))?; }
        if self.set_italic { app.run("format.italic",json!({"on":self.italic}))?; }
        if self.set_underline { app.run("format.underline",json!({"on":self.underline}))?; }
        if self.set_color { app.run("format.color",json!({"color":self.color.trim()}))?; }
        if self.set_align { app.run("format.align",json!({"align":self.align}))?; }
        if self.set_anchor { app.run("format.anchor",json!({"anchor":self.anchor}))?; }
        if self.set_baseline && self.scope != ApplyScope::VerseNumbers {
            match self.baseline {
                VerseBaseline::Normal => {
                    app.run("format.superscript",json!({"on":false}))?;
                    app.run("format.subscript",json!({"on":false}))?;
                }
                VerseBaseline::Super => { app.run("format.superscript",json!({"on":true}))?; }
                VerseBaseline::Sub => { app.run("format.subscript",json!({"on":true}))?; }
            }
        }
        Ok(())
    }
    fn apply(&self, app: &mut SlideApp) -> Result<usize, String> {
        let Some(state) = app.session.active() else { return Err("No active presentation.".into()) };
        let current = state.selection.slide;
        if self.set_color && (self.color.len()!=7 || !self.color.starts_with('#') || !self.color[1..].chars().all(|c|c.is_ascii_hexdigit())) {
            return Err("Color must be a hexadecimal value like #112233.".into());
        }
        if self.scope == ApplyScope::Selection {
            if !state.selection.text.as_ref().is_some_and(|t| t.is_range()) {
                return Err("Highlight characters inside a text box first.".into());
            }
            self.apply_to_selected(app)?;
            return Ok(1);
        }
        let prior_shapes = state.selection.shapes.clone();
        let prior_text_shape = state.selection.text.as_ref().map(|t| t.shape);
        let selected_slides = state.selection.slides.clone();
        let slides = &state.doc.slides;
        let mut targets: Vec<(usize, Vec<deckcraft_engine::model::ShapeId>)> = Vec::new();
        for (index,slide) in slides.iter().enumerate() {
            if slide.name == "✦ Smart Generate Input" { continue; }
            if self.scope == ApplyScope::CurrentSlide && index != current { continue; }
            if self.scope == ApplyScope::SelectedSlides && !selected_slides.contains(&slide.id) { continue; }
            let is_bible = slide.name.starts_with("Bible · ");
            let has_heading = is_bible && slide.shapes.len() > 1;
            let ids: Vec<_> = slide.shapes.iter().enumerate().filter_map(|(n,shape)| {
                if shape.text.is_none() { return None; }
                let is_current = index == current &&
                    (prior_shapes.contains(&shape.id) || prior_text_shape == Some(shape.id));
                let is_heading = has_heading && n == 0;
                let included = match self.scope {
                    ApplyScope::All | ApplyScope::CurrentSlide | ApplyScope::SelectedSlides => true,
                    ApplyScope::Box => is_current,
                    ApplyScope::Selection => false,
                    ApplyScope::Headings => is_heading,
                    ApplyScope::Verses | ApplyScope::VerseNumbers => is_bible && !is_heading,
                    ApplyScope::Content => !is_bible,
                };
                included.then_some(shape.id)
            }).collect();
            if !ids.is_empty() { targets.push((index,ids)); }
        }
        if targets.is_empty() {
            return Err("No matching text boxes. Select a box or choose a different Apply To scope.".into());
        }
        let mut count = 0;
        for (index,ids) in targets {
            app.run("slide.go", json!({"index":index}))?;
            for id in ids {
                if self.scope == ApplyScope::VerseNumbers {
                    let paragraphs: Vec<_> = app.session.active()
                        .and_then(|st| st.doc.slides.get(index))
                        .and_then(|sl| sl.shape(id))
                        .and_then(|sh| sh.text.as_ref())
                        .map(|body| body.paragraphs.iter().enumerate().filter_map(|(i,p)| {
                            let plain = p.runs.iter().map(|r| r.text.as_str()).collect::<String>();
                            let n = plain.chars().take_while(|c| c.is_ascii_digit() || ('០'..='៩').contains(c)).count();
                            (n > 0).then_some((i,n,plain.chars().take(n).collect::<String>()))
                        }).collect()).unwrap_or_default();
                    for (para,n,prefix) in paragraphs {
                        app.run("text.edit", json!({"id":id,"at":[para,0]}))?;
                        app.run("text.select", json!({"anchor":[para,0],"caret":[para,n]}))?;
                        let mut new_len = n;
                        if self.convert_numbers && self.number_style != VerseNumberStyle::Source {
                            if let Ok(number) = normalize_digits(&prefix).parse::<usize>() {
                                let converted = format_bible_number(number,self.number_style);
                                new_len = converted.chars().count();
                                app.run("text.insert",json!({"text":converted}))?;
                                app.run("text.select",json!({"anchor":[para,0],"caret":[para,new_len]}))?;
                            }
                        }
                        self.apply_to_selected(app)?;
                        match self.baseline {
                            VerseBaseline::Normal => {
                                app.run("format.superscript", json!({"on":false}))?;
                                app.run("format.subscript", json!({"on":false}))?;
                            }
                            VerseBaseline::Super => { app.run("format.superscript", json!({"on":true}))?; }
                            VerseBaseline::Sub => { app.run("format.subscript", json!({"on":true}))?; }
                        }
                        count += 1;
                    }
                    app.run("text.exit", json!({}))?;
                } else {
                    app.run("selection.select", json!({"ids":[id]}))?;
                    self.apply_to_selected(app)?;
                    count += 1;
                }
            }
        }
        app.run("slide.go", json!({"index":current}))?;
        if !prior_shapes.is_empty() {
            let _ = app.run("selection.select", json!({"ids":prior_shapes}));
        } else if let Some(id) = prior_text_shape {
            let _ = app.run("selection.select", json!({"ids":[id]}));
        }
        Ok(count)
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
enum VerseNumberStyle { Khmer, English, Source }
impl VerseNumberStyle {
    fn label(self) -> &'static str { match self { Self::Khmer => "Khmer (១២៣)", Self::English => "English (123)", Self::Source => "Bible source" } }
}
fn format_bible_number(n: usize, style: VerseNumberStyle) -> String {
    let digits = n.to_string();
    if style == VerseNumberStyle::Khmer { digits.chars().map(|c| char::from_u32(c as u32 - '0' as u32 + '០' as u32).unwrap_or(c)).collect() } else { digits }
}
fn bible_reference(name: &str, chapter: usize, first: usize, last: usize, style: VerseNumberStyle) -> String {
    let c = format_bible_number(chapter, style);
    let a = format_bible_number(first, style);
    if first == last { format!("{name} {c}:{a}") } else { format!("{name} {c}:{a}–{}",format_bible_number(last,style)) }
}
const BIBLE_DEFAULT_FONT: &str = "Khmer OS battambang";
const BIBLE_BOLD_FONT: &str = "Khmer OS Battambang";

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
    number_style: VerseNumberStyle,
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
            max_font_size: 40.0,
            min_font_size: 20.0,
            include_reference: true,
            include_verse_numbers: true,
            title_slide: false,
            font_family: BIBLE_DEFAULT_FONT.into(),
            number_style: VerseNumberStyle::Khmer,
            status: String::new(),
        }
    }
}

impl BibleGenerator {
    fn ui(&mut self, ctx: &egui::Context, app: &mut SlideApp) {
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
                    egui::ComboBox::from_id_salt("bible_number_style").selected_text(self.number_style.label()).show_ui(ui,|ui| {for mode in [VerseNumberStyle::Khmer, VerseNumberStyle::English, VerseNumberStyle::Source] {ui.selectable_value(&mut self.number_style,mode,mode.label());}});
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
                    let families = deckcraft_fonts::FontDb::global().families();
                    egui::ComboBox::from_id_salt("bible_font_family")
                        .selected_text(if self.font_family.trim().is_empty() { "Theme font" } else { self.font_family.as_str() })
                        .width(220.0)
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut self.font_family, String::new(), "Theme font");
                            for family in families {
                                ui.selectable_value(&mut self.font_family, family.clone(), family);
                            }
                        });
                });
                ui.small("Tahoe Khmer fonts are loaded into DeckCraft's real font engine. Autofit Shrink keeps long Khmer verses inside the text box.");

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

        let passage_reference = bible_reference(&book.name, self.chapter, first, last, self.number_style);
        for (group_index, group) in groups.into_iter().enumerate() {
            app.run("slide.new", json!({"layout": "blank"}))?;
            let has_heading = group_index == 0 && self.include_reference;
            app.run("slide.rename", json!({"name": format!("Bible · {passage_reference}")}))?;
            let body = group.iter().map(|v| {
                if self.include_verse_numbers {
                    format!("{}  {}", format_bible_number(v.number,self.number_style), v.text)
                } else { v.text.clone() }
            }).collect::<Vec<_>>().join("\n\n");
            if has_heading {
                app.run("insert.textBox", json!({"rect": [12.0, 18.0, 936.0, 86.4], "text": passage_reference}))?;
                self.apply_text_style(app, 44.0, false)?;
                if deckcraft_fonts::FontDb::global().has_family(BIBLE_BOLD_FONT) {app.run("format.font", json!({"family": BIBLE_BOLD_FONT}))?;}
                app.run("format.bold", json!({"on": true}))?;
                app.run("insert.textBox", json!({"rect": [22.8, 114.0, 914.4, 410.0], "text": body}))?;
                self.apply_text_style(app, 38.0, false)?;
            } else {
                app.run("insert.textBox", json!({"rect": [22.8, 12.0, 914.4, 489.6], "text": body}))?;
                self.apply_text_style(app, 40.0, false)?;
            }
            app.run("format.autofit", json!({"mode": "shrink"}))?;
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
        app.run("format.lineSpacing", json!({"lines": 1.5}))?;
        app.run("format.anchor", json!({"anchor": if middle { "middle" } else { "top" }}))?;
        Ok(())
    }
}


#[derive(Clone)]
struct SmartBibleRef {
    book_id: String,
    book_name: String,
    chapter: usize,
    verse_start: usize,
    verse_end: usize,
}

enum SmartToken {
    Heading(String),
    Title(String),
    Bible(SmartBibleRef),
    Text(String),
}

enum SmartSlide {
    Title(String),
    Bible { book_name: String, chapter: usize, verse_start: usize, verse_end: usize, first_group: bool, verses: Vec<BibleVerse> },
    Text(String),
}

struct SmartGenerator {
    open: bool,
    input: String,
    status: String,
    running: bool,
    font_family: String,
    number_style: VerseNumberStyle,
    pending: Rc<RefCell<Option<Result<(bool, Vec<SmartSlide>), String>>>>,
}

impl Default for SmartGenerator {
    fn default() -> Self {
        Self {
            open: false,
            input: String::new(),
            status: String::new(),
            running: false,
            font_family: BIBLE_DEFAULT_FONT.into(),
            number_style: VerseNumberStyle::Khmer,
            pending: Rc::new(RefCell::new(None)),
        }
    }
}

impl SmartGenerator {
    fn ui(&mut self, ctx: &egui::Context, app: &mut SlideApp) {
        self.poll(app);
        let first_slide = app.session.active().is_some_and(|d| d.selection.slide == 0);
        if first_slide {
            self.restore_from_first_slide(app);
        }
        if !self.open {
            remove_native_smart_input();
            return;
        }

        let mut open = self.open;
        egui::Window::new("✦ Smart Generate")
            .id(egui::Id::new("deckcraft_smart_generator"))
            .open(&mut open)
            .default_width(560.0)
            .min_width(440.0)
            .resizable(true)
            .collapsible(false)
            .show(ctx, |ui| {
                ui.strong("Slide 0 · Bible program input");
                ui.small("Paste the whole program here. Slide 0 is the permanent hidden Smart Generate source; generated slides start at 1.");
                ui.add_space(6.0);
                // Native browser textarea: Chrome/Safari shape Khmer combining marks,
                // line wrapping and cursor clusters correctly; egui's glyph-by-glyph
                // TextEdit does not. Sync the text into the existing Smart Generate source.
                let (input_rect, _) = ui.allocate_exact_size(
                    egui::vec2(ui.available_width().max(260.0), 380.0),
                    egui::Sense::hover(),
                );
                sync_native_smart_input(ctx, input_rect, &mut self.input);
                ui.add_space(6.0);
                ui.horizontal(|ui| {
                    ui.label("Khmer font");
                    let families = deckcraft_fonts::FontDb::global().families();
                    egui::ComboBox::from_id_salt("smart_font_family")
                        .selected_text(if self.font_family.is_empty() { "Theme font" } else { self.font_family.as_str() })
                        .width(220.0)
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut self.font_family, String::new(), "Theme font");
                            for family in families {
                                ui.selectable_value(&mut self.font_family, family.clone(), family);
                            }
                        });
                });
                ui.horizontal(|ui| {
                    ui.label("Verse numbers");
                    egui::ComboBox::from_id_salt("smart-verse-digits").selected_text(self.number_style.label()).show_ui(ui,|ui|{
                        for style in [VerseNumberStyle::Khmer,VerseNumberStyle::English,VerseNumberStyle::Source] {
                            ui.selectable_value(&mut self.number_style,style,style.label());
                        }
                    });
                });
                if !self.status.is_empty() {
                    ui.separator();
                    ui.label(&self.status);
                }
                ui.separator();
                ui.horizontal(|ui| {
                    if ui.button("Sample").clicked() {
                        self.input = smart_sample().to_string();
                    }
                    if ui.button("Repair Refs").clicked() {
                        self.input = repair_smart_refs(&self.input);
                        self.status = "Normalized Khmer digits, colons and verse-range punctuation.".into();
                    }
                    ui.add_enabled_ui(!self.running, |ui| {
                        if ui.button("Append").clicked() {
                            self.request(ctx, false);
                        }
                        if ui.button("Generate & Replace").clicked() {
                            self.request(ctx, true);
                        }
                    });
                });
                if self.running {
                    ui.small("Reading Tahoe Bible1954 data and preparing slides…");
                }
            });
        self.open = open;
        if !self.open { remove_native_smart_input(); }
    }

    fn restore_from_first_slide(&mut self, app: &SlideApp) {
        if !self.input.trim().is_empty() {
            return;
        }
        let Some(st) = app.session.active() else { return };
        let Some(slide) = st.doc.slides.first() else { return };
        if slide.name != "✦ Smart Generate Input" {
            return;
        }
        let saved = text_body_plain(&slide.notes);
        if !saved.trim().is_empty() {
            self.input = saved;
        }
    }

    fn request(&mut self, ctx: &egui::Context, replace: bool) {
        if self.input.trim().is_empty() {
            self.status = "Paste Bible references or text first.".into();
            return;
        }
        let text = self.input.clone();
        let pending = self.pending.clone();
        let ctx = ctx.clone();
        self.running = true;
        self.status = "Preparing slides…".into();
        wasm_bindgen_futures::spawn_local(async move {
            let result = build_smart_slides(&text).await.map(|slides| (replace, slides));
            *pending.borrow_mut() = Some(result);
            ctx.request_repaint();
        });
    }

    fn poll(&mut self, app: &mut SlideApp) {
        let pending = self.pending.borrow_mut().take();
        let Some(result) = pending else { return };
        self.running = false;
        match result {
            Ok((replace, slides)) => match apply_smart_slides(app, &slides, replace, &self.input, &self.font_family, self.number_style) {
                Ok(n) => {
                    self.status = format!("Generated {n} slide{}. Slide 0 remains the hidden Smart Generate input.", if n == 1 { "" } else { "s" });
                    app.notify(self.status.clone());
                }
                Err(e) => {
                    self.status = e.clone();
                    app.notify(e);
                }
            },
            Err(e) => {
                self.status = e.clone();
                app.notify(e);
            }
        }
    }
}

/// Native DOM editing is essential for accurate Khmer shaping and line breaks.
fn remove_native_smart_input() {
    let Some(document) = web_sys::window().and_then(|w| w.document()) else { return };
    if let Some(node) = document.get_element_by_id("tahoe-smart-khmer-input") { node.remove(); }
}
fn sync_native_smart_input(ctx: &egui::Context, rect: egui::Rect, text: &mut String) {
    let Some(window) = web_sys::window() else { return };
    let Some(document) = window.document() else { return };
    if document.get_element_by_id("tahoe-smart-khmer-font").is_none() {
        if let Ok(style) = document.create_element("style") {
            style.set_id("tahoe-smart-khmer-font");
            style.set_text_content(Some("@font-face{font-family:'Tahoe Smart Battambang';src:url('../../assets/fonts/khmer-os/KhmerOSbattambang.ttf') format('truetype');font-weight:400;font-display:swap;}"));
            if let Some(head) = document.head() { let _ = head.append_child(&style); }
        }
    }
    let canvas = document.get_element_by_id(CANVAS_ID);
    let Some(canvas) = canvas else { return };
    let screen = ctx.content_rect();
    let bounds = canvas.get_bounding_client_rect();
    let sx = bounds.width() / f64::from(screen.width().max(1.0));
    let sy = bounds.height() / f64::from(screen.height().max(1.0));
    let left = bounds.left() + f64::from(rect.left()) * sx;
    let top = bounds.top() + f64::from(rect.top()) * sy;
    let width = f64::from(rect.width()) * sx;
    let height = f64::from(rect.height()) * sy;

    let el = if let Some(el) = document.get_element_by_id("tahoe-smart-khmer-input") {
        el
    } else {
        let Ok(el) = document.create_element("textarea") else { return };
        el.set_id("tahoe-smart-khmer-input");
        let _ = el.set_attribute("spellcheck","false");
        let _ = el.set_attribute("aria-label","Smart Generate Bible program text");
        if let Ok(area) = el.clone().dyn_into::<web_sys::HtmlTextAreaElement>() {
            area.set_value(text);
        }
        if let Some(body) = document.body() { let _ = body.append_child(&el); }
        el
    };
    let css = format!(
        "position:fixed;z-index:2147482000;left:{left:.1}px;top:{top:.1}px;width:{width:.1}px;height:{height:.1}px;box-sizing:border-box;resize:none;padding:9px 12px;border:1px solid #b9bec5;border-radius:6px;background:white;color:#202020;font-family:'Tahoe Smart Battambang','Khmer OS Battambang',sans-serif;font-size:19px;line-height:1.75;direction:ltr;text-align:left;unicode-bidi:plaintext;white-space:pre-wrap;overflow-wrap:break-word;overflow-y:auto;outline-offset:-2px;"
    );
    let _ = el.set_attribute("style",&css);
    if let Ok(area) = el.dyn_into::<web_sys::HtmlTextAreaElement>() {
        let current = area.value();
        if *text != current { *text = current; }
    }
}

fn smart_sample() -> &'static str {
    "ព្រះបន្ទូលម៉ោង5:30\nរ៉ូម2:1-16\n1កូរិនថូស13:4\n1ពេត្រុស4:8\nលូកា6:31\n\nព្រះបន្ទូលម៉ោង9:30\nចំណងជើង: ការថ្វាយដែលមានតម្លៃ\nម៉ាកុស14:1-9\nម៉ាកុស12:41-44\n2សាំយ៉ូអែល24:18-25\n\nការសំរេចចិត្តអនុវត្តន៏តាមព្រះបន្ទូល\nតើមាន (ដបប្រេងក្រអូប) អ្វីខ្លះនៅក្នុងជីវិតរបស់អ្នក\nដូចជា (ចិត្តគំនិត ពេលវេលា ទំនាក់ទំនង ឬទ្រព្យ សម្បត្តិ) ដែលព្រះអម្ចាស់ចង់ឱ្យអ្នកបំបែក ដើម្បីថ្វាយ និងលើកតម្កើងទ្រង់?"
}

fn khmer_digit(c: char) -> char {
    match c {
        '០' => '0', '១' => '1', '២' => '2', '៣' => '3', '៤' => '4',
        '៥' => '5', '៦' => '6', '៧' => '7', '៨' => '8', '៩' => '9',
        _ => c,
    }
}

fn normalize_digits(s: &str) -> String {
    s.chars().map(khmer_digit).collect()
}

fn repair_smart_refs(s: &str) -> String {
    normalize_digits(s).replace('៖', ":").replace('–', "-").replace('—', "-")
}

fn normalize_book_key(s: &str) -> String {
    normalize_digits(s)
        .chars()
        .filter(|c| !matches!(*c, ' ' | '\t' | '\u{200b}' | '\u{200c}' | '\u{200d}' | '-' | '_' | '.' | '៖' | ':'))
        .collect::<String>()
        .replace("ទី", "")
        .replace("យ៉ូ", "យូ")
        .to_lowercase()
}

fn resolve_smart_book(raw: &str) -> Option<(&'static str, &'static str)> {
    let needle = normalize_book_key(raw);
    for (id, name, _) in bible_data::BOOKS {
        let canon = normalize_book_key(name);
        if needle.eq_ignore_ascii_case(id) || needle == canon {
            return Some((*id, *name));
        }
        if let Some(last) = canon.chars().last().filter(|c| matches!(c, '1' | '2' | '3')) {
            let base = canon.trim_end_matches(last);
            if needle == format!("{last}{base}") || needle == format!("{base}{last}") {
                return Some((*id, *name));
            }
        }
    }
    None
}

fn parse_smart_bible_ref(line: &str) -> Option<SmartBibleRef> {
    let cleaned = repair_smart_refs(line.trim());
    let colon = cleaned.rfind(':')?;
    let left = cleaned[..colon].trim();
    let right = cleaned[colon + 1..].trim();
    if left.is_empty() || right.is_empty() {
        return None;
    }
    let mut chapter_at = left.len();
    let mut saw_digit = false;
    for (idx, ch) in left.char_indices().rev() {
        if ch.is_ascii_digit() {
            saw_digit = true;
            chapter_at = idx;
        } else if saw_digit {
            break;
        } else if !ch.is_whitespace() {
            return None;
        }
    }
    if !saw_digit {
        return None;
    }
    let chapter: usize = left[chapter_at..].trim().parse().ok()?;
    let book_raw = left[..chapter_at].trim();
    let (book_id, book_name) = resolve_smart_book(book_raw)?;
    let mut parts = right.splitn(2, '-');
    let verse_start: usize = parts.next()?.trim().parse().ok()?;
    let verse_end: usize = parts.next().and_then(|x| x.trim().parse().ok()).unwrap_or(verse_start);
    Some(SmartBibleRef {
        book_id: book_id.to_string(),
        book_name: book_name.to_string(),
        chapter,
        verse_start,
        verse_end: verse_end.max(verse_start),
    })
}

fn parse_smart_tokens(input: &str) -> Result<Vec<SmartToken>, String> {
    let mut out = Vec::new();
    let mut text = Vec::<String>::new();
    let flush = |out: &mut Vec<SmartToken>, text: &mut Vec<String>| {
        if !text.is_empty() {
            let joined = text.join("\n").trim().to_string();
            if !joined.is_empty() {
                out.push(SmartToken::Text(joined));
            }
            text.clear();
        }
    };
    for raw in input.lines() {
        let line = raw.trim();
        if line.is_empty() {
            flush(&mut out, &mut text);
            continue;
        }
        if line.starts_with("ព្រះបន្ទូលម៉ោង") {
            flush(&mut out, &mut text);
            out.push(SmartToken::Heading(line.to_string()));
            continue;
        }
        if let Some(rest) = line.strip_prefix("ចំណងជើង") {
            flush(&mut out, &mut text);
            let title = rest.trim_start_matches(|c: char| matches!(c, ':' | '៖' | ' ' | '-')).trim();
            if !title.is_empty() {
                out.push(SmartToken::Title(title.to_string()));
            }
            continue;
        }
        if let Some(reference) = parse_smart_bible_ref(line) {
            flush(&mut out, &mut text);
            out.push(SmartToken::Bible(reference));
            continue;
        }
        text.push(line.to_string());
    }
    flush(&mut out, &mut text);
    if out.is_empty() {
        return Err("No Bible references or text were recognized.".into());
    }
    Ok(out)
}

async fn build_smart_slides(input: &str) -> Result<Vec<SmartSlide>, String> {
    let tokens = parse_smart_tokens(input)?;
    let mut books: HashMap<String, BibleBook> = HashMap::new();
    let mut slides = Vec::new();
    for token in tokens {
        match token {
            SmartToken::Heading(t) | SmartToken::Title(t) => slides.push(SmartSlide::Title(t)),
            SmartToken::Text(t) => {
                for part in split_text_for_slides(&t, 340) {
                    slides.push(SmartSlide::Text(part));
                }
            }
            SmartToken::Bible(r) => {
                if !books.contains_key(&r.book_id) {
                    let raw = fetch_bible_book_text(&r.book_id).await?;
                    let book = parse_bible_book(&r.book_id, &raw)?;
                    books.insert(r.book_id.clone(), book);
                }
                let book = books.get(&r.book_id).ok_or_else(|| format!("Could not load {}.", r.book_name))?;
                let verses = book
                    .chapters
                    .get(r.chapter.saturating_sub(1))
                    .ok_or_else(|| format!("{} has no chapter {}.", r.book_name, r.chapter))?;
                if verses.is_empty() {
                    return Err(format!("{} {} has no verses.", r.book_name, r.chapter));
                }
                let start = r.verse_start.max(1).min(verses.len());
                let end = r.verse_end.max(start).min(verses.len());
                for (i,group) in smart_bible_groups(&verses[start - 1..end]).into_iter().enumerate() {
                    slides.push(SmartSlide::Bible { book_name: r.book_name.clone(), chapter: r.chapter, verse_start: start, verse_end: end, first_group: i == 0, verses: group });
                }
            }
        }
    }
    if slides.is_empty() {
        return Err("Nothing was generated from the pasted text.".into());
    }
    Ok(slides)
}

fn split_text_for_slides(text: &str, limit: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    for paragraph in text.lines().map(str::trim).filter(|p| !p.is_empty()) {
        if paragraph.chars().count() > limit {
            if !current.is_empty() {
                out.push(std::mem::take(&mut current));
            }
            let chars: Vec<char> = paragraph.chars().collect();
            for chunk in chars.chunks(limit) {
                out.push(chunk.iter().collect::<String>());
            }
            continue;
        }
        let extra = paragraph.chars().count() + if current.is_empty() { 0 } else { 2 };
        if current.chars().count() + extra > limit && !current.is_empty() {
            out.push(std::mem::take(&mut current));
        }
        if !current.is_empty() {
            current.push_str("\n\n");
        }
        current.push_str(paragraph);
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

fn apply_smart_slides(app: &mut SlideApp, slides: &[SmartSlide], replace: bool, source: &str, font: &str, number_style: VerseNumberStyle) -> Result<usize, String> {
    let len = app.session.active().map(|d| d.doc.slides.len()).unwrap_or(0);
    if len == 0 {
        app.run("file.new", json!({}))?;
    }
    if replace {
        let current_len = app.session.active().map(|d| d.doc.slides.len()).unwrap_or(1);
        for i in (1..current_len).rev() {
            app.run("slide.delete", json!({"index": i}))?;
        }
    }
    app.run("slide.go", json!({"index": if replace { 0 } else { app.session.active().map(|d| d.doc.slides.len().saturating_sub(1)).unwrap_or(0) }}))?;
    app.run("slide.rename", json!({"index": 0, "name": "✦ Smart Generate Input"}))?;
    app.run("slide.notes", json!({"index": 0, "text": source}))?;
    app.run("slide.hide", json!({"index": 0, "hidden": true}))?;

    let mut made = 0usize;
    for slide in slides {
        match slide {
            SmartSlide::Title(text) => {
                app.run("slide.new", json!({"layout": "blank"}))?;
                app.run("slide.rename", json!({"name": format!("Smart · {}", text.chars().take(42).collect::<String>())}))?;
                app.run("insert.textBox", json!({"rect": [80.0, 120.0, 800.0, 300.0], "text": text}))?;
                apply_generated_style(app, font, 38.0, true)?;
                app.run("format.autofit", json!({"mode": "shrink"}))?;
            }
            SmartSlide::Text(text) => {
                app.run("slide.new", json!({"layout": "blank"}))?;
                app.run("slide.rename", json!({"name": "Smart · Application"}))?;
                app.run("insert.textBox", json!({"rect": [70.0, 55.0, 820.0, 445.0], "text": text}))?;
                apply_generated_style(app, font, 38.0, false)?;
                app.run("format.autofit", json!({"mode": "shrink"}))?;
            }
            SmartSlide::Bible { book_name, chapter, verse_start, verse_end, first_group, verses } => {
                app.run("slide.new", json!({"layout": "blank"}))?;
                let reference = bible_reference(book_name, *chapter, *verse_start, *verse_end, number_style);
                app.run("slide.rename", json!({"name": format!("Bible · {reference}")}))?;
                let body = verses.iter().map(|v| format!("{}  {}", format_bible_number(v.number, number_style), v.text)).collect::<Vec<_>>().join("\n\n");
                if *first_group {
                    app.run("insert.textBox", json!({"rect": [12.0, 18.0, 936.0, 86.4], "text": reference}))?;
                    apply_generated_style(app, font, 44.0, false)?;
                    if deckcraft_fonts::FontDb::global().has_family(BIBLE_BOLD_FONT) {app.run("format.font", json!({"family": BIBLE_BOLD_FONT}))?;}
                    app.run("format.bold", json!({"on": true}))?;
                    app.run("insert.textBox", json!({"rect": [22.8, 114.0, 914.4, 410.0], "text": body}))?;
                    apply_generated_style(app, font, 38.0, false)?;
                } else {
                    app.run("insert.textBox", json!({"rect": [22.8, 12.0, 914.4, 489.6], "text": body}))?;
                    apply_generated_style(app, font, 40.0, false)?;
                }
                app.run("format.autofit", json!({"mode": "shrink"}))?;
            }
        }
        made += 1;
    }
    Ok(made)
}

fn apply_generated_style(app: &mut SlideApp, font: &str, size: f32, middle: bool) -> Result<(), String> {
    if !font.trim().is_empty() && deckcraft_fonts::FontDb::global().has_family(font.trim()) {
        app.run("format.font", json!({"family": font.trim()}))?;
    }
    app.run("format.size", json!({"size": size}))?;
    app.run("format.alignCenter", json!({}))?;
    app.run("format.lineSpacing", json!({"lines": 1.5}))?;
    app.run("format.anchor", json!({"anchor": if middle { "middle" } else { "top" }}))?;
    Ok(())
}

fn text_body_plain(body: &deckcraft_engine::model::text::TextBody) -> String {
    body.paragraphs
        .iter()
        .map(|p| p.runs.iter().map(|r| r.text.as_str()).collect::<String>())
        .collect::<Vec<_>>()
        .join("\n")
}

fn post_parent_window(command: &str) {
    let Some(window) = web_sys::window() else { return };
    let Ok(Some(parent)) = window.parent() else { return };
    let payload = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&payload, &wasm_bindgen::JsValue::from_str("type"), &wasm_bindgen::JsValue::from_str("tahoe-app-command"));
    let _ = js_sys::Reflect::set(&payload, &wasm_bindgen::JsValue::from_str("app"), &wasm_bindgen::JsValue::from_str("deckcraft"));
    let _ = js_sys::Reflect::set(&payload, &wasm_bindgen::JsValue::from_str("command"), &wasm_bindgen::JsValue::from_str(command));
    let _ = parent.post_message(&payload.into(), "*");
}

fn post_parent_present(active: bool) {
    let Some(window) = web_sys::window() else { return };
    let Ok(Some(parent)) = window.parent() else { return };
    let payload = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&payload, &wasm_bindgen::JsValue::from_str("type"), &wasm_bindgen::JsValue::from_str("tahoe-deckcraft-present"));
    let _ = js_sys::Reflect::set(&payload, &wasm_bindgen::JsValue::from_str("active"), &wasm_bindgen::JsValue::from_bool(active));
    let _ = parent.post_message(&payload.into(), "*");
}

async fn fetch_url_bytes(url: &str) -> Result<Vec<u8>, String> {
    let window = web_sys::window().ok_or_else(|| "Browser window unavailable.".to_string())?;
    let response = wasm_bindgen_futures::JsFuture::from(window.fetch_with_str(url))
        .await
        .map_err(|e| format!("Font download failed: {e:?}"))?;
    let response: web_sys::Response = response.dyn_into().map_err(|_| "Font response was invalid.".to_string())?;
    if !response.ok() {
        return Err(format!("HTTP {}", response.status()));
    }
    let buffer = response.array_buffer().map_err(|e| format!("Font buffer error: {e:?}"))?;
    let buffer = wasm_bindgen_futures::JsFuture::from(buffer).await.map_err(|e| format!("Font read failed: {e:?}"))?;
    let bytes = js_sys::Uint8Array::new(&buffer);
    let mut out = vec![0u8; bytes.length() as usize];
    bytes.copy_to(&mut out);
    Ok(out)
}

async fn fetch_url_text(url: &str) -> Result<String, String> {
    let window = web_sys::window().ok_or_else(|| "Browser window unavailable.".to_string())?;
    let response = wasm_bindgen_futures::JsFuture::from(window.fetch_with_str(url))
        .await
        .map_err(|e| format!("Download failed: {e:?}"))?;
    let response: web_sys::Response = response.dyn_into().map_err(|_| "Response was invalid.".to_string())?;
    if !response.ok() {
        return Err(format!("HTTP {}", response.status()));
    }
    let text = response.text().map_err(|e| format!("Text response error: {e:?}"))?;
    let text = wasm_bindgen_futures::JsFuture::from(text).await.map_err(|e| format!("Text read failed: {e:?}"))?;
    text.as_string().ok_or_else(|| "Response was not text.".to_string())
}

async fn load_tahoe_fonts() -> Option<std::sync::Arc<deckcraft_fonts::FontFace>> {
    let manifest = match fetch_url_text("../../assets/fonts/fonts.json").await {
        Ok(s) => s,
        Err(e) => { log::warn!("Khmer font manifest unavailable: {e}"); return None; }
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&manifest) else {
        log::warn!("Invalid Tahoe fonts.json"); return None;
    };
    let Some(fonts) = value.get("fonts").and_then(serde_json::Value::as_array) else {
        return None;
    };
    let db = deckcraft_fonts::FontDb::global();
    // Optional user-provided pack is only considered when actually installed.
    // Without this probe, 40 missing requests can stall WASM startup.
    // No pack-wide availability probe: each essential font is requested directly.
    let mut added = 0usize;
    for font in fonts {
        let Some(file) = font.get("file").and_then(serde_json::Value::as_str) else { continue };
        // Only preload font binaries shipped with this WASM build. Missing Khmer OS
        // files and remote sources previously caused dozens of serial network requests
        // and kept the editor behind its 20-second startup timeout.
        let essential = matches!(file,
            "khmer-os/KhmerOSbattambang.ttf"
            | "khmer-os/KhmerOSBattambang-Bold.ttf"
            | "SFHelloKOKH-Regular.woff");
        if !essential { continue; }
        let mut urls = Vec::new();
        // GitHub Actions generates TrueType siblings for original WOFF fonts.
        // WOFF containers are not accepted by DeckCraft's native font/shaping engine.
        if let Some(stem) = file.strip_suffix(".woff").or_else(|| file.strip_suffix(".woff2")) {
            urls.push(format!("fonts/{stem}.ttf"));
        } else if file.ends_with(".ttf") || file.ends_with(".otf") {
            if file.starts_with("khmer-os/") {
                urls.push(format!("../../assets/fonts/{file}"));
            } else {
                urls.push(format!("fonts/{file}"));
            }
        }
        // Fonts are loaded from compiled local TTF siblings only, never external URLs.
        let mut ok = false;
        for url in urls {
            // Only pass native sfnt files to FontDb. Fetch returns error for missing routes.
            if !url.to_ascii_lowercase().ends_with(".ttf") &&
               !url.to_ascii_lowercase().ends_with(".otf") &&
               !url.to_ascii_lowercase().ends_with(".ttc") {
                continue;
            }
            let Ok(bytes) = fetch_url_bytes(&url).await else { continue };
            let n = db.add_font(bytes);
            if n > 0 {
                added += n;
                log::info!("DeckCraft Khmer font loaded: {file} ({url}), {n} face(s)");
                ok = true;
                break;
            }
            // An earlier manifest entry may already have registered this font.
            if db.has_family(font.get("family").and_then(serde_json::Value::as_str).unwrap_or("")) {
                ok = true;
                break;
            }
        }
        if !ok { log::warn!("No native TTF/OTF face was found for {file}"); }
    }
    let selected = db.fallback_for_filtered('ក', u32::MAX, |f| {
        f.covers('ខ') && !f.is_color() && f.data().len() < (20 << 20)
    });
    if let Some(ref face) = selected {
        log::info!("DeckCraft Khmer glyph fallback active: {} {} ({} new faces)", face.family, face.style, added);
    } else {
        log::warn!("No installed DeckCraft face covers Khmer characters! Check converted font assets.");
    }
    selected
}


async fn load_remaining_tahoe_fonts() {
    let Ok(manifest) = fetch_url_text("../../assets/fonts/fonts.json").await else { return };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&manifest) else { return };
    let Some(fonts) = value.get("fonts").and_then(serde_json::Value::as_array) else { return };
    let db = deckcraft_fonts::FontDb::global();
    let mut added = 0;
    for font in fonts {
        let Some(file) = font.get("file").and_then(serde_json::Value::as_str) else { continue };
        if !file.starts_with("khmer-os/") { continue; }
        if matches!(file,"khmer-os/KhmerOSbattambang.ttf" | "khmer-os/KhmerOSBattambang-Bold.ttf") { continue; }
        if !(file.ends_with(".ttf") || file.ends_with(".otf")) { continue; }
        let url = format!("../../assets/fonts/{file}");
        if let Ok(bytes) = fetch_url_bytes(&url).await {
            added += db.add_font(bytes);
        }
    }
    log::info!("PowerSlidePro: {} optional Khmer font faces loaded after startup", added);
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
