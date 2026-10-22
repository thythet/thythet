//! Tahoe79 PowerSlidePro: Smart Song Generate.
//! Source Allsong catalogs are copied unchanged beside the compiled web bundle.
use super::{apply_generated_style, fetch_url_text, BIBLE_DEFAULT_FONT, SlideApp};
use serde_json::{json, Value};
use std::{cell::RefCell, collections::HashSet, rc::Rc};
use wasm_bindgen::JsCast as _;

#[derive(Clone)]
struct Song {
    title: String,
    lyrics: String,
    keys: Vec<String>,
}
struct SongRow {
    requested: String,
    key: String,
    selected: Option<usize>,
    suggestions: Vec<usize>,
    search: String,
    skip: bool,
    exact: bool,
}
pub(super) struct SongGenerator {
    pub(super) open: bool,
    input: String,
    parsed_input: String,
    library: Vec<Song>,
    loading: bool,
    pending: Rc<RefCell<Option<Result<Vec<Song>, String>>>>,
    error: String,
    rows: Vec<SongRow>,
    status: String,
    font_family: String,
}
impl Default for SongGenerator {
    fn default() -> Self {
        Self {
            open: false, input: String::new(), parsed_input: String::new(),
            library: Vec::new(), loading: false,
            pending: Rc::new(RefCell::new(None)),
            error: String::new(), rows: Vec::new(), status: String::new(),
            font_family: BIBLE_DEFAULT_FONT.into(),
        }
    }
}
impl SongGenerator {
    pub(super) fn ui(&mut self, ctx: &egui::Context, app: &mut SlideApp) {
        if !self.open {
            remove_song_input();
            return;
        }
        if !self.loading && self.library.is_empty() && self.error.is_empty() {
            self.load(ctx);
        }
        if let Some(result) = self.pending.borrow_mut().take() {
            self.loading = false;
            match result {
                Ok(songs) => { self.library = songs; self.error.clear(); self.parsed_input.clear(); }
                Err(e) => self.error = e,
            }
        }
        self.rebuild();
        let mut open = self.open;
        egui::Window::new("Song · Smart Song Generate")
            .id(egui::Id::new("tahoe79_song_generator"))
            .open(&mut open)
            .default_width(510.0)
            .min_width(340.0)
            .movable(true)
            .resizable(true)
            .collapsible(false)
            .frame(egui::Frame::NONE
                .fill(egui::Color32::WHITE)
                .corner_radius(egui::CornerRadius::same(11))
                .inner_margin(egui::Margin::symmetric(12, 10))
                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(221, 225, 230))))
            .show(ctx, |ui| {
                ui.spacing_mut().item_spacing = egui::vec2(6.0, 5.0);
                ui.spacing_mut().interact_size.y = 27.0;
                ui.visuals_mut().override_text_color = Some(egui::Color32::from_rgb(42, 46, 54));
                ui.small("Paste a numbered worship list. Review all uncertain matches before generating.");
                let (rect, _) = ui.allocate_exact_size(
                    egui::vec2(ui.available_width().max(240.0), 136.0), egui::Sense::hover());
                native_song_input(ctx, rect, &mut self.input);
                self.rebuild();
                ui.horizontal(|ui| {
                    if self.loading { ui.spinner(); ui.label("Loading local Allsong library…"); }
                    else if !self.error.is_empty() {
                        ui.colored_label(egui::Color32::DARK_RED, &self.error);
                        if ui.button("Retry").clicked() {
                            self.error.clear();
                            self.load(ctx);
                        }
                    } else {
                        ui.small(format!("{} library songs · {} extracted", self.library.len(), self.rows.len()));
                    }
                });
                ui.separator();
                egui::ScrollArea::vertical().id_salt("song-match-preview")
                    .max_height(275.0).show(ui, |ui| {
                    let library = &self.library;
                    for (i, row) in self.rows.iter_mut().enumerate() {
                        ui.horizontal(|ui| {
                            ui.strong(format!("{}. {}", i + 1, row.requested));
                            if !row.key.is_empty() { ui.small(format!("Key: {}", row.key)); }
                            if row.exact { ui.small("✓ Exact"); }
                        });
                        ui.horizontal(|ui| {
                            ui.checkbox(&mut row.skip, "Skip");
                            if !row.skip {
                                let label = row.selected
                                    .and_then(|id| library.get(id))
                                    .map(|s| s.title.as_str())
                                    .unwrap_or("Choose a match…");
                                egui::ComboBox::from_id_salt(("song-choice", i))
                                    .selected_text(label).width(ui.available_width().max(100.0))
                                    .show_ui(ui, |ui| {
                                        if ui.selectable_label(row.selected.is_none(), "Unmatched / choose…").clicked() {
                                            row.selected = None;
                                        }
                                        let mut options = row.suggestions.clone();
                                        if !row.search.trim().is_empty() {
                                            let query = normalize(&row.search);
                                            for (id, song) in library.iter().enumerate() {
                                                if song.keys.iter().any(|s| s.contains(&query)) && !options.contains(&id) {
                                                    options.push(id);
                                                }
                                                if options.len() >= 60 { break; }
                                            }
                                        }
                                        for id in options.into_iter().take(60) {
                                            if ui.selectable_label(row.selected == Some(id), &library[id].title).clicked() {
                                                row.selected = Some(id);
                                            }
                                        }
                                    });
                            }
                        });
                        if row.selected.is_none() && !row.skip {
                            ui.colored_label(egui::Color32::from_rgb(166, 99, 20),
                                "Needs review · search the library or explicitly skip");
                            ui.add(egui::TextEdit::singleline(&mut row.search)
                                .hint_text("Search another title").desired_width(ui.available_width()));
                        }
                        ui.add_space(5.0);
                    }
                });
                if self.rows.is_empty() && !self.loading && self.error.is_empty() {
                    ui.small("Use 1. Song, 2/ Song, or Khmer digits. Multiple songs on one line are supported.");
                }
                ui.separator();
                ui.horizontal(|ui| {
                    ui.label("Font");
                    egui::ComboBox::from_id_salt("song_font")
                        .selected_text(&self.font_family).width(180.0)
                        .show_ui(ui, |ui| {
                            for family in deckcraft_fonts::FontDb::global().families() {
                                ui.selectable_value(&mut self.font_family, family.clone(), family);
                            }
                        });
                });
                let existing = app.session.active().is_some_and(|d|
                    d.doc.slides.iter().any(|s| s.name.starts_with("Song · ")));
                let ready = !self.rows.is_empty() && !self.library.is_empty()
                    && self.rows.iter().all(|r| r.skip || r.selected.is_some())
                    && self.rows.iter().any(|r| !r.skip);
                if existing { ui.small("Existing Song slides detected. Updating replaces only Song slides."); }
                if !self.status.is_empty() { ui.label(&self.status); }
                ui.horizontal(|ui| {
                    let text = if existing { "Update Song Slides" } else { "Generate Song Slides" };
                    if ui.add_enabled(ready, egui::Button::new(text)).clicked() {
                        match self.generate(app, existing) {
                            Ok(n) => {
                                self.status = format!("Generated {n} editable song slides.");
                                app.notify(self.status.clone());
                            }
                            Err(e) => { self.status = e.clone(); app.notify(e); }
                        }
                    }
                    if ui.button("Clear").clicked() {
                        self.input.clear();
                        self.parsed_input.clear();
                        self.rows.clear();
                        set_song_input("");
                        self.status.clear();
                    }
                });
            });
        self.open = open;
        if !self.open { remove_song_input(); }
    }

    fn load(&mut self, ctx: &egui::Context) {
        self.loading = true;
        let pending = self.pending.clone();
        let ctx = ctx.clone();
        wasm_bindgen_futures::spawn_local(async move {
            let mut songs = Vec::new();
            let mut seen = HashSet::new();
            let result = async {
                for file in ["songs.json", "allsong2.json", "allsong3.json"] {
                    let raw = fetch_url_text(&format!("song-library/{file}")).await
                        .map_err(|e| format!("Cannot open local {file}: {e}"))?;
                    let root: Value = serde_json::from_str(&raw)
                        .map_err(|e| format!("Invalid {file}: {e}"))?;
                    let entries = root.as_array().ok_or_else(|| format!("{file} is not a JSON array"))?;
                    for item in entries {
                        let title = item.get("title").and_then(Value::as_str).unwrap_or("").trim();
                        let lyrics = item.get("lyrics").and_then(Value::as_str).unwrap_or("").trim();
                        if title.is_empty() || lyrics.is_empty() { continue; }
                        let key = format!("{}\u{001f}{}", normalize(title), lyrics);
                        if !seen.insert(key) { continue; }
                        songs.push(Song {
                            title: title.to_owned(), lyrics: lyrics.to_owned(),
                            keys: song_keys(title),
                        });
                    }
                }
                if songs.is_empty() { Err("The song library is empty.".to_string()) }
                else { Ok(songs) }
            }.await;
            *pending.borrow_mut() = Some(result);
            ctx.request_repaint();
        });
    }

    fn rebuild(&mut self) {
        if self.input == self.parsed_input && !self.rows.is_empty() { return; }
        if self.input == self.parsed_input && self.input.trim().is_empty() { return; }
        self.parsed_input = self.input.clone();
        self.status.clear();
        self.rows = parse_song_list(&self.input).into_iter().map(|(requested, key)| {
            let mut rank: Vec<(usize, f32)> = self.library.iter().enumerate()
                .map(|(i, s)| (i, song_score(&requested, &s.keys)))
                .filter(|(_, score)| *score >= 0.39)
                .collect();
            rank.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
            let unique_exact = rank.first().is_some_and(|r| r.1 >= 0.999)
                && rank.get(1).is_none_or(|r| r.1 < 0.999);
            let selected = if unique_exact { Some(rank[0].0) } else { None };
            SongRow {
                requested, key, selected,
                suggestions: rank.into_iter().take(12).map(|x| x.0).collect(),
                search: String::new(), skip: false, exact: unique_exact,
            }
        }).collect();
    }

    fn generate(&self, app: &mut SlideApp, replace: bool) -> Result<usize, String> {
        if replace {
            let indexes: Vec<usize> = app.session.active()
                .map(|d| d.doc.slides.iter().enumerate().filter_map(|(i, s)|
                    (s.name.starts_with("Song · ")).then_some(i)).collect())
                .unwrap_or_default();
            for index in indexes.into_iter().rev() {
                app.run("slide.delete", json!({"index": index}))?;
            }
        }
        let last = app.session.active().map(|d| d.doc.slides.len().saturating_sub(1))
            .ok_or_else(|| "Open a presentation first.".to_string())?;
        app.run("slide.go", json!({"index": last}))?;
        let mut made = 0;
        for (i, row) in self.rows.iter().enumerate() {
            if row.skip { continue; }
            let song = self.library.get(row.selected.ok_or_else(|| format!("Choose song {}.", i+1))?)
                .ok_or_else(|| "Selected song is unavailable.".to_string())?;
            let display_title = strip_catalog_number(&song.title);
            let notes = if row.key.is_empty() { "Allsong catalog".to_owned() }
                else { format!("Allsong catalog · Key: {}", row.key) };
            let slide_name = format!("Song · {:02} · {}{}", i + 1,
                display_title.chars().take(52).collect::<String>(),
                if row.key.is_empty() { String::new() } else { format!(" [{}]", row.key) });
            app.run("slide.new", json!({"layout":"blank"}))?;
            app.run("slide.rename", json!({"name": slide_name}))?;
            app.run("insert.textBox", json!({"rect":[60.0, 114.0, 840.0, 305.0], "text":display_title}))?;
            apply_generated_style(app, &self.font_family, 43.0, true)?;
            app.run("format.autofit", json!({"mode":"shrink"}))?;
            let index = app.session.active().map(|d| d.selection.slide).unwrap_or(0);
            app.run("slide.notes", json!({"index":index,"text":notes}))?;
            made += 1;
            for (part, text) in lyric_slides(&song.lyrics).into_iter().enumerate() {
                app.run("slide.new", json!({"layout":"blank"}))?;
                app.run("slide.rename", json!({"name":format!("Song · {:02} · Lyrics {}", i+1, part+1)}))?;
                app.run("insert.textBox", json!({"rect":[34.0, 28.0, 892.0, 470.0], "text":text}))?;
                apply_generated_style(app, &self.font_family, 38.0, true)?;
                app.run("format.autofit", json!({"mode":"shrink"}))?;
                let index = app.session.active().map(|d| d.selection.slide).unwrap_or(0);
                app.run("slide.notes", json!({"index":index,"text":format!("{} · {}", row.requested, notes)}))?;
                made += 1;
            }
        }
        Ok(made)
    }
}

fn normalize(s: &str) -> String {
    s.to_lowercase().replace("ចំរៀង", "ចម្រៀង")
        .chars()
        .filter(|c| c.is_alphanumeric() || ('\u{1780}'..='\u{17ff}').contains(c))
        .collect()
}
fn strip_catalog_number(s: &str) -> &str {
    let first = s.trim_start().trim_start_matches(|c: char| c.is_ascii_digit() || ('០'..='៩').contains(&c));
    first.trim_start_matches(|c: char| c.is_whitespace() || matches!(c, '.' | '/' | ')' | '-' | '៖'))
}
fn song_keys(title: &str) -> Vec<String> {
    let cleaned = strip_catalog_number(title);
    let mut out = vec![normalize(cleaned)];
    if let Some((short, _)) = cleaned.split_once(" - ") { out.push(normalize(short)); }
    if let Some((short, _)) = cleaned.split_once(" – ") { out.push(normalize(short)); }
    let khmer: String = cleaned.chars()
        .filter(|c| ('\u{1780}'..='\u{17ff}').contains(c)).collect();
    if !khmer.is_empty() { out.push(normalize(&khmer)); }
    out.sort();
    out.dedup();
    out
}
fn edit_distance(a: &str, b: &str) -> usize {
    let b: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    for (i, ch) in a.chars().enumerate() {
        let mut next = vec![i + 1; b.len() + 1];
        for (j, other) in b.iter().enumerate() {
            next[j+1] = (prev[j+1]+1).min(next[j]+1)
                .min(prev[j] + usize::from(ch != *other));
        }
        prev = next;
    }
    prev[b.len()]
}
fn song_score(request: &str, keys: &[String]) -> f32 {
    let query = normalize(request);
    if query.is_empty() { return 0.0; }
    keys.iter().filter(|s| !s.is_empty()).map(|candidate| {
        if candidate == &query { return 1.0; }
        let len = query.chars().count().max(candidate.chars().count());
        let score = 1.0 - edit_distance(&query, candidate) as f32 / len as f32;
        if candidate.contains(&query) && query.chars().count() >= 4 {
            score.max(0.73 + 0.18 * query.chars().count() as f32 / len as f32)
        } else { score }
    }).fold(0.0, f32::max)
}

fn parse_song_list(input: &str) -> Vec<(String, String)> {
    let chars: Vec<(usize, char)> = input.char_indices().collect();
    let mut markers = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let prev = if i == 0 { None } else { Some(chars[i-1].1) };
        let boundary = prev.is_none_or(|c| c.is_whitespace() || matches!(c, '_' | '|' | ';' | '(' | '•'));
        let digit = |c: char| c.is_ascii_digit() || ('០'..='៩').contains(&c);
        if boundary && digit(chars[i].1) {
            let mut j = i;
            while j < chars.len() && j-i < 3 && digit(chars[j].1) { j += 1; }
            if j < chars.len() && matches!(chars[j].1, '.' | '/' | ')' | '៖')
                && chars.get(j+1).is_some_and(|(_, c)| !digit(*c)) {
                let end = chars.get(j+1).map_or(input.len(), |(at, _)| *at);
                markers.push((chars[i].0, end));
                i = j+1;
                continue;
            }
        }
        i += 1;
    }
    let mut result = Vec::new();
    for (n, &(_, begin)) in markers.iter().enumerate() {
        let end = markers.get(n+1).map_or(input.len(), |(at, _)| *at);
        let text = input[begin..end].lines().next().unwrap_or("")
            .trim_matches(|c: char| c.is_whitespace() || matches!(c, '_' | '*' | '•' | '-' | ':' | '។' | '៖'));
        if text.is_empty() { continue; }
        let mut title = text.to_owned();
        let mut key = String::new();
        if let Some(last) = title.split_whitespace().last() {
            if is_music_key(last) {
                key = last.to_owned();
                let length = title.len()-last.len();
                title.truncate(length);
                title = title.trim().to_owned();
            }
        }
        if !title.is_empty() { result.push((title, key)); }
    }
    result
}
fn is_music_key(s: &str) -> bool {
    let mut chars = s.chars();
    matches!(chars.next(), Some('A'..='G')) &&
        matches!(chars.as_str(), "" | "m" | "#" | "b" | "#m" | "bm" | "maj" | "min" | "7" | "m7")
}
fn lyric_slides(lyrics: &str) -> Vec<String> {
    // Preserve intentional verse/chorus breaks; split only at readable boundaries.
    let mut pieces = Vec::new();
    let mut current = String::new();
    let mut lines = 0;
    for line in lyrics.lines() {
        let line = line.trim();
        if line.is_empty() {
            if !current.is_empty() && !current.ends_with("\n\n") { current.push('\n'); }
            continue;
        }
        let mut part = String::new();
        for word in line.split_whitespace() {
            if !part.is_empty() && part.chars().count() + word.chars().count() + 1 > 125 {
                if !current.is_empty() && (current.chars().count() + part.chars().count() > 265 || lines >= 5) {
                    pieces.push(std::mem::take(&mut current).trim().to_owned());
                    lines = 0;
                }
                if !current.is_empty() { current.push('\n'); }
                current.push_str(&part);
                lines += 1;
                part.clear();
            }
            if !part.is_empty() { part.push(' '); }
            part.push_str(word);
        }
        if !part.is_empty() {
            if !current.is_empty() && (current.chars().count() + part.chars().count() > 265 || lines >= 5) {
                pieces.push(std::mem::take(&mut current).trim().to_owned());
                lines = 0;
            }
            if !current.is_empty() { current.push('\n'); }
            current.push_str(&part);
            lines += 1;
        }
    }
    if !current.trim().is_empty() { pieces.push(current.trim().to_owned()); }
    pieces
}

fn remove_song_input() {
    if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
        if let Some(el) = doc.get_element_by_id("tahoe-song-khmer-input") { el.remove(); }
    }
}
fn set_song_input(text: &str) {
    if let Some(area) = web_sys::window().and_then(|w| w.document())
        .and_then(|d| d.get_element_by_id("tahoe-song-khmer-input"))
        .and_then(|e| e.dyn_into::<web_sys::HtmlTextAreaElement>().ok()) {
        area.set_value(text);
    }
}
fn native_song_input(ctx: &egui::Context, rect: egui::Rect, text: &mut String) {
    let Some(window) = web_sys::window() else { return };
    let Some(doc) = window.document() else { return };
    if doc.get_element_by_id("tahoe-song-font").is_none() {
        if let Ok(style) = doc.create_element("style") {
            style.set_id("tahoe-song-font");
            style.set_text_content(Some(
                "@font-face{font-family:'Tahoe Song Battambang';src:url('../../assets/fonts/khmer-os/KhmerOSbattambang.ttf') format('truetype');font-display:swap;}"
            ));
            if let Some(head) = doc.head() { let _ = head.append_child(&style); }
        }
    }
    let Some(canvas) = doc.get_element_by_id(super::CANVAS_ID) else { return };
    let screen = ctx.content_rect();
    let bounds = canvas.get_bounding_client_rect();
    let sx = bounds.width() / f64::from(screen.width().max(1.0));
    let sy = bounds.height() / f64::from(screen.height().max(1.0));
    let el = if let Some(el) = doc.get_element_by_id("tahoe-song-khmer-input") { el } else {
        let Ok(el) = doc.create_element("textarea") else { return };
        el.set_id("tahoe-song-khmer-input");
        let _ = el.set_attribute("spellcheck", "false");
        let _ = el.set_attribute("aria-label", "Paste worship song list");
        if let Ok(area) = el.clone().dyn_into::<web_sys::HtmlTextAreaElement>() { area.set_value(text); }
        if let Some(body) = doc.body() { let _ = body.append_child(&el); }
        el
    };
    if let Ok(area) = el.dyn_into::<web_sys::HtmlTextAreaElement>() {
        let _ = area.set_attribute("style", &format!(
            "position:fixed;z-index:10000;left:{}px;top:{}px;width:{}px;height:{}px;box-sizing:border-box;\
            border:1px solid #d4d9df;border-radius:7px;padding:9px;resize:none;outline:none;\
            background:#fff;color:#262b32;font:16px 'Tahoe Song Battambang',sans-serif;line-height:1.65;",
            bounds.left()+f64::from(rect.left())*sx, bounds.top()+f64::from(rect.top())*sy,
            f64::from(rect.width())*sx, f64::from(rect.height())*sy));
        let value = area.value();
        if *text != value { *text = value; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn list_parses_keys_and_mixed_delimiters() {
        let rows = parse_song_list("ចម្រៀងថ្វាយបង្គំ 18.10.2026\n1. ទ្រង់គិតដល់ខ្ញុំ E 2/ គ្រប់ទាំងផ្កា A\n៣. ខ្ញុំជឿ F#m");
        assert_eq!(rows, vec![
            ("ទ្រង់គិតដល់ខ្ញុំ".into(),"E".into()),
            ("គ្រប់ទាំងផ្កា".into(),"A".into()),
            ("ខ្ញុំជឿ".into(),"F#m".into())]);
    }
    #[test]
    fn fuzzy_never_exact_for_typo() {
        let s = song_keys("ព្រះយេហូវ៉ាជាទីពឹងជ្រក");
        assert!(song_score("ព្រះយេហូវ៉ាជាទីពឹងជ្រក", &s) >= 0.999);
        assert!(song_score("ព្រះយេហូវ៉ាជាទីពឹងជក", &s) < 0.999);
    }
}
