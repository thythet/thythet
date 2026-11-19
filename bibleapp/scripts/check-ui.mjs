// Validate Bible App UI requirements without network access or test dependencies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root=new URL("../web/",import.meta.url);
const file=name=>readFileSync(new URL(name,root),"utf8");
const html=file("index.html"),css=file("style.css"),js=file("app.js"),sw=file("sw.js"),i18n=file("i18n.js");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const allIds=new Set(ids);
assert.equal(allIds.size,ids.length,"Duplicate HTML IDs found");
for(const needed of [
  "app","sidebarResize","accountButton","oldTab","newTab","bookSearch","booksList",
  "languageToggle","themeButton","themeMoon","themeSun","fontButton",
  "zoomPopover","zoomSlider","zoomMinus","zoomPlus","zoomValue",
  "readerPage","chapterHeading","chapterSelect","chapterStrip","prevChapter","nextChapter",
  "verses","quickReference","quickChapter","quickVerse","quickGo",
  "verseContextMenu","versePalette","paletteBack","touchVerseActions","touchSelectionCount",
  "accountPage","googleLogin","helpPage","toolsPage","generatorPage","searchPage","settingsPage"
])assert(allIds.has(needed),"Missing UI control "+needed);
for(const match of js.matchAll(/\$\("([a-zA-Z0-9_-]+)"\)/g)){
  assert(allIds.has(match[1]),"JavaScript references nonexistent HTML ID "+match[1]);
}
const reader=html.slice(html.indexOf('id="readerPage"'),html.indexOf('id="accountPage"'));
assert(!reader.includes('class="hero"')&&!reader.includes("reader-instructions"),"Reading canvas must not show hero or instructions");
assert(reader.includes('id="chapterStrip"'),"Horizontal chapters must replace reader hint");
assert(/renderChapterStrip\(b\.chapterCount\)/.test(js),"Chapter strip must follow current book");
assert(/button\.onclick=\(\)=>goToChapter\(n\)/.test(js),"Chapter buttons must navigate");
assert(/select\.value=String\(state\.chapter\)/.test(js),"Chapter dropdown must follow active chapter");
assert(/goToChapter\(state\.chapter[+-]1\)/.test(js),"Previous/Next must use synchronized chapter navigation");
assert(/goToChapter\(Number\(\$\("chapterSelect"\)\.value\)\)/.test(js),"Dropdown must use synchronized chapter navigation");
assert(/scrollLeft/.test(js)&&/\.chapter-pill\.active/.test(css),"Chapter strip must scroll to active chapter");
assert(html.includes('id="helpPage"')&&html.includes('data-i18n="helpMultiDesc"'),"Verse selection instructions must be in Help");
assert(/for\(const testament of \["old","new"\]\)/.test(js),"Both Testaments must always be rendered together");
assert(/scrollToTestament\(testament\)/.test(js),"Testament buttons must jump to sections");
assert(/id="section-"/.test(js)&&/state\.bookId===b\.id/.test(js),"Book selection must remain highlighted");
assert(/book-item-alt/.test(js)&&/book-item\.book-item-alt/.test(css),"Finder style alternating gray book rows missing");
assert(!js.includes('item.querySelector("small").textContent=enFor(b)'),"Book list must be Khmer-only");
assert(!html.includes('id="accountSubtitle"'),"Guest / Offline-first subtitle must be removed");
assert(html.includes("ព្រះគម្ពីរបរិសុទ្ធ")&&html.includes("បកប្រែចាស់ ១៩៥៤"),"Sidebar Bible title/subtitle missing");
assert(!html.includes('class="brand-icon"'),"No Bible icon beside the sidebar title");
assert.equal((html.match(/class="google-logo"/g)||[]).length,3,"The exact Google G should appear in sidebar, account hero and login button");
assert(html.includes('viewBox="0 0 24 24"')&&html.includes('M22.56 12.25c0-.78-.07-1.53-.2-2.25'),"Exact supplied Google SVG was not used");
assert(/updatePageTitle\(\)/.test(js)&&/state\.page==="reader"&&state\.book\?bookMeta\(\)\?\.nameKm/.test(js),"Toolbar should show the current Khmer book name");
assert(html.includes('id="languageToggle"')&&/role="switch"/.test(html)&&/\.switch-thumb/.test(css),"Animated language switch missing");
assert(/setFontSize\(e\.target\.value\)/.test(js)&&/zoomSlider/.test(js),"Text slider must resize Scripture live");
assert(/setZoomOpen\(\$\("zoomPopover"\)\.hidden\)/.test(js),"Text popover toggle missing");
assert(/\.toolbar-actions \.toolbar-icon\{background:transparent;border:0/.test(css),"Toolbar search and theme icons should be borderless");
assert(!html.includes('id="sidebarTools"'),"Sidebar Tools shortcut must be removed; Account > Tools remains");
assert(html.includes('data-open="tools"'),"Account must retain Tools");
assert(/function goToQuickReference\(\)/.test(js)&&/\$\("quickGo"\)\.onclick=goToQuickReference/.test(js),"Chapter/verse Go must work");
assert(/\$\("quickChapter"\)\.value=String\(state\.chapter\)/.test(js)&&/\$\("quickVerse"\)\.value=String/.test(js),"Chapter/Verse inputs must follow selections");
assert(/state\.focusVerse=n/.test(js),"Clicking a verse should update quick-navigation verse");
assert(/focusVerse\(verse\)/.test(js),"Quick navigation must select and scroll to entered verse");
assert(/Object\.prototype\.hasOwnProperty\.call\(chapterData,String\(verse\)\)/.test(js),"Quick navigation must validate real verse numbers");
assert(html.includes('class="toolbar-icon text-size-trigger"')&&html.includes('data-i18n="textSize"'),"Text size trigger must use words, not an A+ icon");
assert(/\.zoom-popover\{width:216px/.test(css),"Text size popup must be compact");
assert(/\$\("zoomSlider"\)\.oninput=e=>setFontSize\(e\.target\.value\)/.test(js),"Size slider should update Scripture while dragging");
assert(html.includes('id="verseContextMenu"')&&html.includes('role="menu"'),"Verse right-click menu is required");
assert(/row\.oncontextmenu=e=>/.test(js),"Right-click handler must exist on individual verses");
assert(/installLongPress\(row,v\.n\)/.test(js),"Touchscreens must have long-press formatting");
assert(/state\.selection\.has\(n\)/.test(js)&&/function selectForContext/.test(js),"Right-clicking existing selection must preserve it");
assert(html.includes('data-action="present"')&&/startPresentation\(selectedData\(\)\.map/.test(js),"Context menu Present must use selected verses");
assert(html.includes('data-action="color"')&&html.includes('id="versePalette" class="verse-palette" hidden'),"Palette must start hidden");
assert(/if\(action==="color"\)\{showVersePalette\(\);return\}/.test(js),"Palette must open only after Color is clicked");
assert(/\.verse-context-menu\[data-menu=palette\] \.verse-menu-grid\{display:none\}/.test(css),"Palette should replace actions to stay compact");
assert(/data-color="remove"/.test(html)&&/data-color="red"/.test(html)&&/data-color="gray"/.test(html),"Palette must have solid color choices and clear");
for(const shade of ["blue","purple","pink","red","orange","yellow","green","gray"]){
  assert(css.includes('.verse[data-highlight='+shade+']'),"Missing solid "+shade+" verse highlight");
}
assert(!html.includes('id="verseActions"')&&/\.verse-context-menu\{position:fixed/.test(css),"Old formatting bar should be replaced by compact context menu");
assert(/bibleapp\.study\.v1/.test(js)&&/bibleapp\.prefs\.v1/.test(js),"Persisted bookmarks/highlights/notes must remain in existing storage");
assert(sw.includes("bibleapp-web-v0.1.3")&&sw.includes("./i18n.js"),"Web offline cache revision missing");
assert(sw.includes("SHELL_FILES"),"Online refresh should update the UI shell");
const context={window:{}};
runInNewContext(i18n,context,{timeout:1000});
const locales=context.window.BIBLE_LOCALES;
assert(locales?.en&&locales?.kh,"English and Khmer dictionaries required");
const translated=[...new Set([...html.matchAll(/data-i18n(?:-(?:placeholder|title|aria))?="([^"]+)"/g)].map(m=>m[1]))];
for(const label of translated)for(const lang of ["en","kh"])
  assert(typeof locales[lang][label]==="string"&&locales[lang][label].length>0,"Missing translation: "+lang+"/"+label);
for(const required of ["chapters","languageToggle","textSize","decreaseText","increaseText","helpChapters","helpMultiDesc","verse","go","quickReference","share","color","present","invalidChapter","invalidVerse"])
  assert(locales.en[required]&&locales.kh[required],"Missing dynamic translation: "+required);
const data=JSON.parse(file("data/manifest.json"));
assert.equal(data.books.length,66,"All 66 books must remain bundled");
assert.equal(data.books.filter(b=>b.testament==="OT").length,39,"Old Testament should have 39 books");
assert.equal(data.books.filter(b=>b.testament==="NT").length,27,"New Testament should have 27 books");
console.log("Bible App UI checks passed: fast chapter/verse, compact context menu, color palette gating, bilingual UI, "+translated.length+" labels, 66 books and preserved saved data.");
