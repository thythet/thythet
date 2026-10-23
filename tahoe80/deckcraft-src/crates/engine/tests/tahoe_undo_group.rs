use deckcraft_engine::Session;
use serde_json::json;

#[test]
fn generating_multiple_slides_is_one_undo_and_one_redo() {
    let mut session=Session::with_new();
    let old_count=session.active().unwrap().doc.slides.len();
    let old_history=session.active().unwrap().history.undo.len();
    let group=session.begin_undo_group().unwrap();
    session.execute("slide.new",&json!({"layout":"blank"})).unwrap();
    session.execute("slide.new",&json!({"layout":"blank"})).unwrap();
    session.end_undo_group(group,"Generate Songs",true);
    assert_eq!(session.active().unwrap().doc.slides.len(),old_count+2);
    assert_eq!(session.active().unwrap().history.undo.len(),old_history+1);
    session.execute("edit.undo",&json!({})).unwrap();
    assert_eq!(session.active().unwrap().doc.slides.len(),old_count);
    session.execute("edit.redo",&json!({})).unwrap();
    assert_eq!(session.active().unwrap().doc.slides.len(),old_count+2);
}
#[test]
fn failed_group_preserves_presentation_and_history() {
    let mut session=Session::with_new();
    let old=session.active().unwrap().doc.clone();
    let old_undo=session.active().unwrap().history.undo.len();
    let group=session.begin_undo_group().unwrap();
    session.execute("slide.new",&json!({"layout":"blank"})).unwrap();
    session.end_undo_group(group,"Generate Songs",false);
    assert_eq!(*session.active().unwrap().doc,*old);
    assert_eq!(session.active().unwrap().history.undo.len(),old_undo);
}
