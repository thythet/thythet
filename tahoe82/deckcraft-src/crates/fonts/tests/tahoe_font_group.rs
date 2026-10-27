use deckcraft_fonts::FontDb;

#[test]
fn installed_loaded_font_stays_in_pc_section_after_rescan() {
    let db = FontDb::with_font_dirs(vec![]);
    // The default fallback is a real preloaded font; it must not disappear
    // from Installed PC Fonts if the OS also advertises it.
    assert!(db.has_family("Ubuntu"));
    for _ in 0..2 {
        db.set_desktop_families(vec!["Ubuntu".into(), "Arial".into()]);
        let (_, _, pc) = db.grouped_families();
        assert!(pc.iter().any(|f| f == "Ubuntu"));
        assert!(pc.iter().any(|f| f == "Arial"));
    }
}

#[test]
fn packaged_font_wins_over_duplicate_installed_font() {
    let db = FontDb::with_font_dirs(vec![]);
    db.set_packaged_families(vec![
        "Khmer OS Battambang".into(),
        "Khmer OS Siemreap".into(),
        "khmer os battambang".into(),
    ]);
    db.set_desktop_families(vec!["Khmer OS Battambang".into(), "Arial".into()]);
    let (bundled, _, pc) = db.grouped_families();
    assert_eq!(bundled.iter().filter(|f| f.eq_ignore_ascii_case("Khmer OS Battambang")).count(), 1);
    assert!(bundled.iter().any(|f| f.eq_ignore_ascii_case("Khmer OS Siemreap")));
    assert!(!pc.iter().any(|f| f.eq_ignore_ascii_case("Khmer OS Battambang")));
    assert!(pc.iter().any(|f| f == "Arial"));
}
