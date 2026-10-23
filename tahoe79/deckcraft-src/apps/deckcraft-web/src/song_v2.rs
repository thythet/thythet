//! Tahoe79 song slide tools. Internal song data is stored in slide tags,
//! separate from editable speaker notes. Legacy notes-only slides remain readable.
use super::{apply_generated_style, text_body_plain, SlideApp, BIBLE_DEFAULT_FONT};
use serde_json::{json, Value};

pub(super) const SOURCE_TAG: &str = "TAHOE79_SONG_SOURCE_V2\n";
pub(super) const PART_TAG: &str = "TAHOE79_SONG_PART_V2\n";

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
pub(super) fn read_song_note(app: &SlideApp, index: usize, tag: &str) -> Option<Value> {
    let st = app.session.active()?;
    let slide = st.doc.slides.get(index)?;
    let key = tag.trim_end();
    // New files: metadata is inside the editable slide's tags, never Notes.
    if let Some((_,value))=slide.tags.iter().find(|(name,_)|name==key) {
        if let Ok(json)=serde_json::from_str(value){return Some(json);}
    }
    // Backwards compatibility: older .deckcraft presentations embedded the
    // JSON directly in the speaker notes.
    note_data(&text_body_plain(&slide.notes), tag)
}
fn save_note(app: &mut SlideApp, index: usize, tag: &str, data: &Value) -> Result<(), String> {
    let key=tag.trim_end().to_string();
    let value=data.to_string();
    app.session.edit(|doc,_|{
        let Some(slide)=doc.slides.get_mut(index) else {
            return Err(deckcraft_engine::EngineError::Other("Song slide unavailable".into()));
        };
        let slide=std::sync::Arc::make_mut(slide);
        slide.tags.retain(|(name,_)|name!=&key);
        slide.tags.push((key,value));
        // Migrate legacy notes without destroying genuine user speaker notes.
        let visible=text_body_plain(&slide.notes);
        if visible.starts_with(SOURCE_TAG)||visible.starts_with(PART_TAG){
            slide.notes=Default::default();
        }
        Ok(())
    }).map_err(|e|e.to_string())?;
    Ok(())
}

// Merge only checked properties into a source or split slide's saved
// formatting. Saved notes survive cloud/export and allow future splitting.
pub(super) fn merge_song_format(app:&mut SlideApp,index:usize,key:&str,patch:&Value)->Result<(),String>{
    let tag=if read_song_note(app,index,SOURCE_TAG).is_some(){SOURCE_TAG}
        else if read_song_note(app,index,PART_TAG).is_some(){PART_TAG}
        else {return Ok(());};
    let Some(mut data)=read_song_note(app,index,tag) else {return Ok(());};
    let mut item=if let Some(section)=key.strip_prefix("section_formats.") {
        data["section_formats"][section].clone()
    }else{data[key].clone()};
    if !item.is_object(){item=json!({});}
    if let Some(properties)=patch.as_object(){
        for (name,value) in properties {item[name]=value.clone();}
    }
    if let Some(section)=key.strip_prefix("section_formats.") {
        if !data["section_formats"].is_object(){data["section_formats"]=json!({});}
        data["section_formats"][section]=item;
    }else{data[key]=item;}
    save_note(app,index,tag,&data)
}
fn apply_saved_style(app:&mut SlideApp,patch:&Value)->Result<(),String> {
    if let Some(font)=patch["font"].as_str() {
        if !font.trim().is_empty() && deckcraft_fonts::FontDb::global().has_family(font) {
            app.run("format.font",json!({"family":font}))?;
        }
    }
    if let Some(size)=patch["size"].as_f64(){app.run("format.size",json!({"size":size}))?;}
    if let Some(spacing)=patch["line_spacing"].as_f64(){app.run("format.lineSpacing",json!({"lines":spacing}))?;}
    for (field,command) in [("bold","format.bold"),("italic","format.italic"),("underline","format.underline")]{
        if let Some(on)=patch[field].as_bool(){app.run(command,json!({"on":on}))?;}
    }
    if let Some(color)=patch["color"].as_str(){app.run("format.color",json!({"color":color}))?;}
    if let Some(align)=patch["align"].as_str(){app.run("format.align",json!({"align":align}))?;}
    if let Some(anchor)=patch["anchor"].as_str(){app.run("format.anchor",json!({"anchor":anchor}))?;}
    if let Some(baseline)=patch["baseline"].as_str(){
        match baseline {
            "normal"=>{
                app.run("format.superscript",json!({"on":false}))?;
                app.run("format.subscript",json!({"on":false}))?;
            }
            "super"=>{app.run("format.superscript",json!({"on":true}))?;}
            "sub"=>{app.run("format.subscript",json!({"on":true}))?;}
            _=>{}
        }
    }
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
    let data=notes.strip_prefix(SOURCE_TAG).or_else(||notes.strip_prefix(PART_TAG))
        .and_then(|s|serde_json::from_str::<Value>(s).ok()).unwrap_or(Value::Null);
    app.run("insert.textBox",json!({"rect":[18.0,12.0,924.0,78.0],"text":title}))?;
    apply_generated_style(app, &s.font, s.title_size, true)?;
    apply_alignment(app,s)?;
    apply_saved_style(app,&data["title_format"])?;
    app.run("format.autofit",json!({"mode":"shrink"}))?;
    app.run("insert.textBox",json!({"rect":[28.0,96.0,904.0,421.0],"text":lyrics}))?;
    apply_generated_style(app,&s.font,s.lyrics_size,false)?;
    apply_alignment(app,s)?;
    apply_saved_style(app,&data["lyrics_format"])?;
    apply_saved_style(app,&data["section_format"])?;
    app.run("format.autofit",json!({"mode":"shrink"}))?;
    let index=app.session.active().map(|d|d.selection.slide).unwrap_or(at);
    let (tag,payload)=if let Some(data)=notes.strip_prefix(SOURCE_TAG) {(SOURCE_TAG,data)}
        else if let Some(data)=notes.strip_prefix(PART_TAG) {(PART_TAG,data)}
        else {return Err("Missing song metadata tag.".into());};
    let value:Value=serde_json::from_str(payload).map_err(|e|e.to_string())?;
    save_note(app,index,tag,&value)?;
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
    status: String,
}
impl Default for SongTools {
    fn default()->Self { Self {status:String::new()} }
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
            ctx.data_mut(|d|d.insert_temp(egui::Id::new("tahoe-format-song-open"),true));
        }
        if take("tahoe-song-split") {
            match app.grouped_undo("Split Song Sections", |app| self.split(app)) {
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
        let mut meta=read_song_note(app,index,SOURCE_TAG).ok_or_else(||"Song source metadata is missing.".to_string())?;
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
        let mut meta=read_song_note(app,index,SOURCE_TAG)
            .ok_or_else(||"Choose an original Song slide before splitting.".to_string())?;
        if meta["lyrics"].as_str()!=Some(lyrics.as_str()) {
            return Err("Lyrics have changed. Re-mark sections before splitting.".into());
        }
        let segments=section_chunks(&lyrics,&meta["sections"]);
        if segments.is_empty(){return Err("Mark Verse, Chorus or Bridge selections first.".into());}
        let id=source_id(app,index).ok_or_else(||"Song source unavailable.".to_string())?;
        let originals:Vec<usize>=app.session.active().map(|st|st.doc.slides.iter().enumerate()
            .filter_map(|(i,s)|{
                let v=read_song_note(app,i,PART_TAG)?;
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
                "style":style.json(),"part":n+1,
                "title_format":meta["title_format"],"lyrics_format":meta["lyrics_format"],
                "section_format":meta["section_formats"][section.as_str()]});
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
    fn song_metadata_tags_survive_serialization_without_filling_notes(){
        let mut slide=deckcraft_model::Slide::default();
        slide.tags.push((SOURCE_TAG.trim_end().into(),json!({"lyrics":"អរព្រះគុណ","sections":[]}).to_string()));
        let packed=serde_json::to_string(&slide).unwrap();
        let restored:deckcraft_model::Slide=serde_json::from_str(&packed).unwrap();
        assert_eq!(restored.tags[0].0,SOURCE_TAG.trim_end());
        assert_eq!(restored.notes.text(),"");
        assert_eq!(serde_json::from_str::<Value>(&restored.tags[0].1).unwrap()["lyrics"],"អរព្រះគុណ");
    }
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
