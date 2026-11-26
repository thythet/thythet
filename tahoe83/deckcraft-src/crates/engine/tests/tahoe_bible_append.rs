use deckcraft_engine::Session;
use serde_json::json;

#[test]
fn append_at_end_keeps_all_original_slides_including_hidden_input() {
    let mut s = Session::with_new();
    s.execute("slide.rename", &json!({"index":0,"name":"Smart Generate Input"})).unwrap();
    s.execute("slide.notes", &json!({"index":0,"text":"Luke 6:31"})).unwrap();
    s.execute("slide.hide", &json!({"index":0,"hidden":true})).unwrap();
    s.execute("slide.new", &json!({"layout":"blank"})).unwrap();
    s.execute("insert.textBox", &json!({"rect":[20,20,800,300],"text":"Existing customized Bible verse"})).unwrap();
    s.execute("format.size", &json!({"size":31.0})).unwrap();
    let original = s.active().unwrap().doc.clone();
    let count = original.slides.len();
    let group = s.begin_undo_group().unwrap();
    for i in 0..2 {
        s.execute("slide.new", &json!({"layout":"blank","at":count+i})).unwrap();
        s.execute("slide.rename", &json!({"name":format!("Bible {}",i)})).unwrap();
        s.execute("insert.textBox", &json!({"rect":[12,18,936,86],"text":"New Bible reference"})).unwrap();
        s.execute("format.size", &json!({"size":44.0})).unwrap();
    }
    s.end_undo_group(group,"Add Bible",true);
    let updated = &s.active().unwrap().doc;
    assert_eq!(updated.slides.len(), count+2);
    assert_eq!(&updated.slides[..count], &original.slides[..]);
    s.execute("edit.undo", &json!({})).unwrap();
    assert_eq!(*s.active().unwrap().doc,*original);
}
