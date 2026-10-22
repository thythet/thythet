//! Tahoe79 song slide tools. Song metadata is saved in slide notes, never in Allsong.
use super::{apply_generated_style, text_body_plain, SlideApp, BIBLE_DEFAULT_FONT};
use serde_json::{json, Value};

const SOURCE_TAG: &str = "TAHOE79_SONG_SOURCE_V2\n";
const PART_TAG: &str = "TAHOE79_SONG_PART_V2\n";

#[derive(Clone)]
struct SongStyle {
    title_size: f32,
    lyrics_size: f32,
    line_spacing: f32,
    align: String,
    font: String,
}
impl Default for SongStyle {
    fn default() -> Self {
        Self {
            title_size: 43.0, lyrics_size: 32.0, line_spacing: 1.3,
            align: "center".into(), font: BIBLE_DEFAULT_FONT.into(),
        }
    }
}
impl SongStyle {
    fn read(v: &Value) -> Self {
        let mut s = Self::default();
        if let Some(f) = v.get("font").and_then(Value::as_str) { s.font = f.into(); }
        if let Some(n) = v.get("title_size").and_then(Value::as_f64) { s.title_size = n as f32; }
        if let Some(n) = v.get("lyrics_size").and_then(Value::as_f64) { s.lyrics_size = n as f32; }
        if let Some(n) = v.get("line_spacing").and_then(Value::as_f64) { s.line_spacing = n as f32; }
        if let Some(a) = v.get("align").and_then(Value::as_str) { s.align = a.into(); }
        s
    }
    fn json(&self) -> Value {
        json!({"font":self.font, "title_size":self.title_size,"lyrics_size":self.lyrics_size,
            "line_spacing":self.line_spacing,"align":self.align})
    }
}

fn note_data(s: &str, tag: &str) -> Option<Value> {
    serde_json::from_str(s.strip_prefix(tag)?).ok()
}
fn get_note(app: &SlideApp, index: usize, tag: &str) -> Option<Value> {
    let st = app.session.active()?;
    let slide = st.doc.slides.get(index)?;
    note_data(&text_body_plain(&slide.notes), tag)
}
fn save_note(app: &mut SlideApp, index: usize, tag: &str, data: &Value) -> Result<(), String> {
    app.run("slide.notes", json!({"index":index,"text": format!("{tag}{data}")}))?;
    Ok(())
}
fn source_id(app: &SlideApp, i: usize) -> Option<String> {
    app.session.active()?.doc.slides.get(i).map(|slide| format!("{:?}",slide.id))
}
fn shapes_text(app: &SlideApp, index: usize) -> Option<(String,String)> {
    let slide = app.session.active()?.doc.slides.get(index)?;
    let title = slide.shapes.first()?.text.as_ref().map(text_body_plain)?;
    let lyrics = slide.shapes.get(1)?.text.as_ref().map(text_body_plain)?;
    Some((title,lyrics))
}
fn apply_alignment(app: &mut SlideApp, s: &SongStyle) -> Result<(),String> {
    let command = match s.align.as_str() {
        "left" => "format.alignLeft",
        "right" => "format.alignRight",
        _ => "format.alignCenter",
    };
    app.run(command,json!({}))?;
    app.run("format.lineSpacing",json!({"lines":s.line_spacing}))?;
    Ok(())
}
fn insert_styled(app: &mut SlideApp, at: usize, name: &str, title: &str,
    lyrics: &str, s: &SongStyle, notes: &str) -> Result<(), String> {
    app.run("slide.new", json!({"layout":"blank","at":at}))?;
    app.run("slide.rename", json!({"name":name}))?;
    app.run("insert.textBox",json!({"rect":[18.0,12.0,924.0,78.0],"text":title}))?;
    apply_generated_style(app, &s.font, s.title_size, true)?;
    apply_alignment(app,s)?;
    app.run("format.autofit",json!({"mode":"shrink"}))?;
    app.run("insert.textBox",json!({"rect":[28.0,96.0,904.0,421.0],"text":lyrics}))?;
    apply_generated_style(app,&s.font,s.lyrics_size,false)?;
    apply_alignment(app,s)?;
    app.run("format.autofit",json!({"mode":"shrink"}))?;
    let index=app.session.active().map(|d|d.selection.slide).unwrap_or(at);
    app.run("slide.notes",json!({"index":index,"text":notes}))?;
    Ok(())
}
/// One whole song = exactly one slide, independent of lyric length.
pub(super) fn insert_song(app: &mut SlideApp, number: usize, title: &str,
    lyrics: &str, key: &str, font: &str) -> Result<(),String> {
    let at = app.session.active().map(|d|d.selection.slide+1)
        .ok_or_else(||"Open a presentation first.".to_string())?;
    let mut style=SongStyle::default();
    if !font.trim().is_empty() {style.font=font.to_owned();}
    let name=format!("Song · {:02} · {}",number,title.chars().take(52).collect::<String>());
    let data=json!({"version":2, "title":title,"key":key,"lyrics":lyrics,
        "sections":[],"style":style.json()});
    insert_styled(app,at,&name,title,lyrics,&style,&format!("{SOURCE_TAG}{data}"))
}

pub(super) struct SongTools {
    pub(super) format_open: bool,
    style: SongStyle,
    target: usize,
    scope: usize,
    status: String,
}
impl Default for SongTools {
    fn default()->Self { Self {format_open:false,style:SongStyle::default(),target:1,scope:0,status:String::new()} }
}
impl SongTools {
    pub(super) fn poll_menu(&mut self,ctx:&egui::Context,app:&mut SlideApp) {
        let take=|key: &str|ctx.data_mut(|d|{
            let id=egui::Id::new(key);
            let clicked=d.get_temp::<bool>(id).unwrap_or(false);
            if clicked {d.insert_temp(id,false);}
            clicked
        });
        if take("tahoe-song-format") {
            let i=app.session.active().map(|d|d.selection.slide).unwrap_or(0);
            if let Some(v)=get_note(app,i,SOURCE_TAG).or_else(||get_note(app,i,PART_TAG)) {
                self.style=SongStyle::read(&v["style"]);
            }
            self.format_open=true;
        }
        if take("tahoe-song-split") {
            match self.split(app) {
                Ok(n)=>{self.status=format!("Split into {n} editable sections.");app.notify(self.status.clone());}
                Err(e)=>{self.status=e.clone();app.notify(e);}
            }
        }
        for (command, kind) in [
            ("tahoe-song-mark-verse","Verse"),("tahoe-song-mark-chorus","Chorus"),
            ("tahoe-song-mark-bridge","Bridge"),("tahoe-song-mark-prechorus","Pre-Chorus"),
            ("tahoe-song-mark-intro","Intro / Outro"),("tahoe-song-mark-instrumental","Instrumental"),
            ("tahoe-song-mark-clear","Remove")
        ] {
            if take(command) {
                match self.mark(app,kind) {
                    Ok(())=>{self.status=format!("Marked selection: {kind}.");app.notify(self.status.clone());}
                    Err(e)=>{self.status=e.clone();app.notify(e);}
                }
            }
        }
    }
    pub(super) fn ui(&mut self,ctx:&egui::Context,app:&mut SlideApp) {
        if !self.format_open {return;}
        let mut open=self.format_open;
        egui::Window::new("Song Formatting")
            .id(egui::Id::new("tahoe79_song_formatting"))
            .open(&mut open).default_width(330.0).min_width(285.0)
            .movable(true).resizable(false).collapsible(false)
            .frame(egui::Frame::NONE.fill(egui::Color32::WHITE)
                .corner_radius(egui::CornerRadius::same(11))
                .inner_margin(egui::Margin::symmetric(12,10))
                .stroke(egui::Stroke::new(1.0,egui::Color32::from_rgb(221,225,230))))
            .show(ctx,|ui|{
                ui.spacing_mut().item_spacing=egui::vec2(6.0,7.0);
                ui.visuals_mut().override_text_color=Some(egui::Color32::from_rgb(42,46,54));
                ui.horizontal(|ui|{
                    ui.selectable_value(&mut self.target,0,"Title");
                    ui.selectable_value(&mut self.target,1,"Lyrics");
                });
                ui.horizontal(|ui|{
                    ui.label("Font");
                    egui::ComboBox::from_id_salt("song-v2-format-font")
                        .selected_text(&self.style.font).width(180.0).show_ui(ui,|ui|{
                            for family in deckcraft_fonts::FontDb::global().families() {
                                ui.selectable_value(&mut self.style.font,family.clone(),family);
                            }
                        });
                });
                ui.horizontal(|ui|{
                    ui.label("Size");
                    let size=if self.target==0 {&mut self.style.title_size}else{&mut self.style.lyrics_size};
                    ui.add(egui::Slider::new(size,16.0..=72.0).step_by(1.0));
                });
                ui.horizontal(|ui|{
                    ui.label("Align");
                    egui::ComboBox::from_id_salt("song-v2-format-align")
                        .selected_text(&self.style.align)
                        .show_ui(ui,|ui|{
                            for (id,label) in [("left","Left"),("center","Center"),("right","Right")] {
                                ui.selectable_value(&mut self.style.align,id.into(),label);
                            }
                        });
                });
                ui.horizontal(|ui|{
                    ui.label("Line spacing");
                    ui.add(egui::Slider::new(&mut self.style.line_spacing,1.0..=2.0).step_by(0.1));
                });
                ui.separator();
                ui.horizontal(|ui|{
                    ui.selectable_value(&mut self.scope,0,"This song");
                    ui.selectable_value(&mut self.scope,1,"All songs");
                    ui.selectable_value(&mut self.scope,2,"Selection");
                });
                if ui.button("Apply Formatting").clicked() {
                    match self.apply(app) {
                        Ok(n)=>{self.status=format!("Applied formatting to {n} item(s).");app.notify(self.status.clone());}
                        Err(e)=>{self.status=e.clone();app.notify(e);}
                    }
                }
                if !self.status.is_empty(){ui.small(&self.status);}
            });
        self.format_open=open;
    }
    fn apply(&mut self,app:&mut SlideApp)->Result<usize,String> {
        let st=app.session.active().ok_or_else(||"Open a presentation first.".to_string())?;
        let current=st.selection.slide;
        let selected=st.selection.text.clone();
        let targets:Vec<_> = if self.scope==2 {
            let text=selected.ok_or_else(||"Select text in the song slide first.".to_string())?;
            if !text.is_range(){return Err("Select a text range first.".into());}
            if !st.doc.slides.get(current).is_some_and(|s|s.name.starts_with("Song · ")||s.name.starts_with("Song Part · ")) {
                return Err("Select text on a song slide.".into());
            }
            vec![(current,text.shape)]
        }else {
            let indexes:Vec<usize>=if self.scope==1 {(0..st.doc.slides.len()).collect()}else{vec![current]};
            indexes.into_iter().filter_map(|i|{
                let slide=st.doc.slides.get(i)?;
                if !slide.name.starts_with("Song · ") && !slide.name.starts_with("Song Part · ") {return None;}
                let shape=slide.shapes.get(self.target)?;
                Some((i,shape.id))
            }).collect()
        };
        if targets.is_empty(){return Err("No matching Song text found.".into());}
        let size=if self.target==0 {self.style.title_size}else{self.style.lyrics_size};
        for (index,shape) in &targets {
            if self.scope!=2 {
                app.run("slide.go",json!({"index":index}))?;
                app.run("selection.select",json!({"ids":[shape]}))?;
            }
            if !self.style.font.trim().is_empty() &&
                deckcraft_fonts::FontDb::global().has_family(self.style.font.trim()) {
                app.run("format.font",json!({"family":self.style.font}))?;
            }
            app.run("format.size",json!({"size":size}))?;
            apply_alignment(app,&self.style)?;
            if self.scope!=2 {app.run("format.autofit",json!({"mode":"shrink"}))?;}
            if self.scope!=2 {
                if let Some(mut meta)=get_note(app,*index,SOURCE_TAG){
                    meta["style"]=self.style.json();
                    save_note(app,*index,SOURCE_TAG,&meta)?;
                }else if let Some(mut meta)=get_note(app,*index,PART_TAG){
                    meta["style"]=self.style.json();
                    save_note(app,*index,PART_TAG,&meta)?;
                }
            }
        }
        if self.scope!=2 {app.run("slide.go",json!({"index":current}))?;}
        Ok(targets.len())
    }
    fn mark(&mut self,app:&mut SlideApp,kind:&str)->Result<(),String>{
        let st=app.session.active().ok_or_else(||"No presentation.".to_string())?;
        let index=st.selection.slide;
        let slide=st.doc.slides.get(index).ok_or_else(||"No slide.".to_string())?;
        if !slide.name.starts_with("Song · ") {return Err("Choose an original song slide.".into());}
        let selection=st.selection.text.as_ref().ok_or_else(||"Select lyrics first.".to_string())?;
        if !selection.is_range(){return Err("Select lyric text before marking a section.".into());}
        if slide.shapes.get(1).map(|x|x.id)!=Some(selection.shape) {
            return Err("Select the lyrics text box, not the song title.".into());
        }
        let body=slide.shapes.get(1).and_then(|s|s.text.as_ref())
            .ok_or_else(||"Lyrics are missing.".to_string())?;
        let (start,end)=selection.ordered();
        if start.0>=body.paragraphs.len()||end.0>=body.paragraphs.len(){return Err("Invalid selection.".into());}
        let offset=|point:(usize,usize)| -> usize {
            body.paragraphs.iter().take(point.0).map(|p|p.text().chars().count()+1).sum::<usize>()+point.1
        };
        let (a,b)=(offset(start),offset(end));
        let lyrics=text_body_plain(body);
        if a>=b || b>lyrics.chars().count(){return Err("Select a lyric passage first.".into());}
        let mut meta=get_note(app,index,SOURCE_TAG).ok_or_else(||"Song source metadata is missing.".to_string())?;
        if meta["lyrics"].as_str()!=Some(lyrics.as_str()) {
            // Edits may shift character offsets. Reject old markers instead of splitting wrong text.
            meta["lyrics"]=json!(lyrics);
            meta["sections"]=json!([]);
        }
        let mut sections=meta["sections"].as_array().cloned().unwrap_or_default();
        sections.retain(|v|v["end"].as_u64().unwrap_or(0)<=a as u64 ||
            v["start"].as_u64().unwrap_or(u64::MAX)>=b as u64);
        if kind!="Remove" {
            sections.push(json!({"start":a,"end":b,"type":kind}));
            sections.sort_by_key(|v|v["start"].as_u64().unwrap_or(0));
        }
        meta["sections"]=json!(sections);
        save_note(app,index,SOURCE_TAG,&meta)?;
        Ok(())
    }
    fn split(&mut self,app:&mut SlideApp)->Result<usize,String>{
        let index=app.session.active().map(|d|d.selection.slide)
            .ok_or_else(||"Open a song slide first.".to_string())?;
        let (title,lyrics)=shapes_text(app,index)
            .ok_or_else(||"This song needs title and lyrics boxes.".to_string())?;
        let mut meta=get_note(app,index,SOURCE_TAG)
            .ok_or_else(||"Choose an original Song slide before splitting.".to_string())?;
        if meta["lyrics"].as_str()!=Some(lyrics.as_str()) {
            return Err("Lyrics have changed. Re-mark sections before splitting.".into());
        }
        let segments=section_chunks(&lyrics,&meta["sections"]);
        if segments.is_empty(){return Err("Mark Verse, Chorus or Bridge selections first.".into());}
        let id=source_id(app,index).ok_or_else(||"Song source unavailable.".to_string())?;
        let originals:Vec<usize>=app.session.active().map(|st|st.doc.slides.iter().enumerate()
            .filter_map(|(i,s)|{
                let v=note_data(&text_body_plain(&s.notes),PART_TAG)?;
                (v["source_id"].as_str()==Some(id.as_str())).then_some(i)
            }).collect()).unwrap_or_default();
        for i in originals.into_iter().rev() {app.run("slide.delete",json!({"index":i}))?;}
        // All associated splits are normally after this source slide.
        let source_index=app.session.active().and_then(|d|d.doc.slides.iter().position(|s|format!("{:?}",s.id)==id))
            .ok_or_else(||"Source slide unavailable after cleanup.".to_string())?;
        let style=SongStyle::read(&meta["style"]);
        let mut at=source_index+1;
        for (n,(section,body)) in segments.iter().enumerate(){
            let data=json!({"version":2,"source_id":id,"section":section,
                "style":style.json(),"part":n+1});
            insert_styled(app,at,
                &format!("Song Part · {} · {}",title.chars().take(34).collect::<String>(),section),
                &title,body,&style,&format!("{PART_TAG}{data}"))?;
            at+=1;
        }
        meta["split_count"]=json!(segments.len());
        save_note(app,source_index,SOURCE_TAG,&meta)?;
        app.run("slide.hide",json!({"index":source_index,"hidden":true}))?;
        Ok(segments.len())
    }
}

fn section_chunks(lyrics:&str,marks:&Value)->Vec<(String,String)>{
    let length=lyrics.chars().count();
    let mut boundaries:Vec<(usize,String)>=marks.as_array().into_iter().flatten()
        .filter_map(|v|{
            let start=v["start"].as_u64()? as usize;
            let label=v["type"].as_str()?.to_string();
            (start<length).then_some((start,label))
        }).collect();
    boundaries.sort_by_key(|v|v.0);
    boundaries.dedup_by(|a,b|a.0==b.0);
    if boundaries.is_empty(){return Vec::new();}
    if boundaries[0].0>0{boundaries.insert(0,(0,"Intro".into()));}
    let chars:Vec<char>=lyrics.chars().collect();
    let mut result=Vec::new();
    for (i,(start,label)) in boundaries.iter().enumerate(){
        let end=boundaries.get(i+1).map_or(length,|v|v.0);
        let text=chars[*start..end].iter().collect::<String>();
        let text=text.trim();
        if !text.is_empty(){result.push((label.clone(),text.to_owned()));}
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sections_preserve_unmarked_intro_and_order(){
        let marks=json!([{"start":6,"end":10,"type":"Verse"},{"start":13,"end":18,"type":"Chorus"}]);
        let parts=section_chunks("Intro\nVerse one\nChorus here", &marks);
        assert_eq!(parts.len(),3);
        assert_eq!(parts[0].0,"Intro");
        assert_eq!(parts[1].0,"Verse");
        assert_eq!(parts[2].0,"Chorus");
    }
}
