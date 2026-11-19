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
  "verses","quickReference","quickChapter","quickVerse",
  "verseContextMenu","versePalette","paletteBack","touchVerseActions","touchSelectionCount",
  "accountPage","googleLogin","helpPage","toolsPage","generatorPage","searchPage","settingsPage",
  "appearancePage","appearanceGallery","glassGallery","languageActiveLabel","settingTheme"
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
assert(/function goToQuickReference\(\)/.test(js),"Chapter/verse Enter navigation function missing");
assert(!html.includes('id="quickGo"')&&!js.includes('$("quickGo")'),"Go button must be removed");
assert(/\$\(id\)\.addEventListener\("keydown",e=>\{if\(e\.key==="Enter"\)/.test(js),"Both inputs must navigate on Enter");
assert(html.includes('class="toolbar-book-nav"'),"Chapter and verse inputs must sit beside book name");
assert(!html.includes('id="chapterMeta"')&&!js.includes('$("chapterMeta")'),"Chapter count subtitle must be removed");
assert(!html.includes('class="zoom-labels"'),"Small and Large labels must be removed");
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
assert(sw.includes("bibleapp-web-v0.1.5")&&sw.includes("./i18n.js"),"Web offline cache revision missing");
assert(/#readerPage \.verses \.verse\.selected/.test(css)&&css.includes("background:#dcf3dc!important")&&css.includes("border:2px solid #4caf50!important"),"Selected verses must have a pale-green background and 2px green border");
assert(/#readerPage \.verses \.verse\[data-highlight\]:not\(\[data-highlight=""\]\)\.selected/.test(css),"Selected green border should override any stored highlight temporarily");
assert(/root\.addEventListener\("pointerdown",beginVerseDrag\)/.test(js),"Mouse drag must start on verse rows");
assert(/window\.addEventListener\("pointermove",moveVerseDrag/.test(js),"Mouse drag must track pointer movements");
assert(/window\.addEventListener\("pointerup",finishVerseDrag\)/.test(js),"Mouse drag must complete on release");
assert(/e\.pointerType==="touch"/.test(js),"Touch long-press and scroll must remain independent");
assert(/suppressVerseClick=true/.test(js),"Drag release must prevent an unwanted single-verse click");
assert(/function groupVerseNumbers\(numbers\)/.test(js)&&/function formatVerseSelection\(items\)/.test(js),"Compact grouped reference formatter missing");
assert(/function selectedText\(\)\{return formatVerseSelection\(selectedData\(true\)\)\}/.test(js),"Copy must use compact reference formatter");
assert(/const content=formatVerseSelection\(items\)/.test(js),"Share must also use grouped reference formatting");

assert(html.includes('data-open="appearance"')&&html.includes('id="appearancePage"'),"Account must open a dedicated Appearance gallery");
assert(/appearance:"Appearance"/.test(js)&&/setPage\("appearance"\)/.test(js),"Appearance must be a navigable app page");
assert(html.includes('id="settingTheme"')&&/\$\("settingTheme"\)\.onclick=\(\)=>setPage\("appearance"\)/.test(js),"Settings Appearance must open theme gallery");
assert(html.includes('data-appearance="classic"'),"Default HTML appearance must be Classic");
for(const value of ["classic","auto","light","dark","gray","navy"]){
  assert(html.includes('data-theme-choice="'+value+'"'),"Appearance gallery missing "+value);
  assert(js.includes('"'+value+'"'),"Theme selection missing value "+value);
}
assert.equal((html.match(/data-theme-choice=/g)||[]).length,6,"Exactly six appearance choices required");
assert.equal((html.match(/data-glass-choice=/g)||[]).length,2,"Clear and Tinted glass required");
for(const value of ["clear","tinted"])assert(html.includes('data-glass-choice="'+value+'"'),"Missing glass mode "+value);
assert(css.includes('body[data-appearance="tahoe-gray"]')&&css.includes('body[data-appearance="tahoe-navy"]'),"Tahoe83 Gray/Navy colors missing");
assert(css.includes('body[data-appearance="tahoe-light"]')&&css.includes('body[data-appearance="tahoe-dark"]'),"Tahoe83 Light/Dark colors missing");
assert(css.includes('body[data-appearance="tahoe-auto"].dark'),"Auto theme must have a dark variant");
assert(css.includes('[data-glass="tinted"]')&&css.includes('--glass-panel-opacity:.91'),"Tinted glass requires its own opacity");
assert(/backdrop-filter:blur\(var\(--glass-blur\)\)/.test(css),"Tahoe translucent panels require locally bundled CSS blur");
assert(/appearance:"classic",glass:"clear"/.test(js)&&/PREFS="bibleapp.prefs.v1"/.test(js),"Classic must be default and retain prior local preferences");
assert(/state\.prefs\.appearance==="classic"\?/.test(js),"Classic appearance mode must be preserved");
assert(/const prefersSystemDark=\(\)=>/.test(js)&&/prefers-color-scheme: dark/.test(js),"Auto must follow the system theme offline");
assert(/addEventListener\("change",changed\)/.test(js),"Auto must respond to system light/dark changes");
assert(/document\.body\.dataset\.appearance=/.test(js)&&/document\.body\.dataset\.glass=/.test(js),"Themes must update the actual document");
assert(/syncAppearanceGallery\(\)/.test(js)&&/aria-pressed/.test(js),"Theme choices must visibly reflect selection");
assert(/for\(const el of \$\("glassGallery"\)\.querySelectorAll\("button"\)\)el\.disabled=classic/.test(js),"Glass choices should be inactive for Classic");
assert(html.includes('id="languageActiveLabel"')&&/state\.prefs\.lang\.toUpperCase\(\)/.test(js),"Switch must show only the current EN or KH label");
assert(!html.includes('language-tag-en')&&!html.includes('language-tag-kh'),"Remove the redundant simultaneous EN/KH labels");
assert(/classList\.toggle\("is-kh",state\.prefs\.lang==="kh"\)/.test(js),"Switch thumb must reflect Khmer ON / English OFF");
assert(html.includes('role="switch"')&&html.includes('aria-checked="true"'),"Language toggle must remain accessible");
assert(!/https?:\/\//.test(css.slice(css.indexOf('/* Bible App v0.1.5'))),"Themes must work without CDN dependencies");

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
// Exercise the real pure copying and drag range helpers.
function extractFn(name,params){
  const pattern=new RegExp("function "+name+"\\("+params+"\\)\\{[\\s\\S]*?\\n\\}");
  const match=js.match(pattern);
  assert(match,"Could not extract "+name+" for behavioral tests");
  return match[0];
}
const groupFn=extractFn("groupVerseNumbers","numbers");
const formatFn=extractFn("formatVerseSelection","items");
const rangeFn=js.match(/function verseRangeBetween\(start,end,numbers\)\{[\s\S]*?\n\}/)?.[0];
const dragFn=js.match(/function dragApply\(end\)\{[\s\S]*?\n\}/)?.[0];
assert(rangeFn&&dragFn,"Drag logic functions must be testable");
const behaviorSource=[
  groupFn,formatFn,rangeFn,
  'const state={chapter:1,selection:new Set(),focusVerse:null,anchor:null};',
  'const bookMeta=()=>({nameKm:"ទំនុកដំកើង"});',
  'let verseDrag={start:4,base:new Set([1]),verses:[1,2,3,4,5]};',
  'let updates=0;',
  'function updateVerseSelectionDisplay(){updates++}',
  dragFn,
  'const contiguous=formatVerseSelection([{n:4,text:"Four"},{n:2,text:"Two"},{n:1,text:"One"},{n:3,text:"Three"}]);',
  'const gaps=formatVerseSelection([{n:4,text:"Four"},{n:1,text:"One"},{n:3,text:"Three"}]);',
  'const single=formatVerseSelection([{n:8,text:"Eight"}]);',
  'const reverse=verseRangeBetween(5,2,[1,2,3,4,5,6]);',
  'dragApply(2);',
  '({contiguous,gaps,single,reverse:reverse.join(","),drag:[...state.selection].sort((a,b)=>a-b).join(","),focus:state.focusVerse,anchor:state.anchor,updates})'
].join("\n");
const behavior=runInNewContext(behaviorSource,{},{timeout:1000});
assert.equal(behavior.contiguous,"ទំនុកដំកើង 1:1-4\n1 One\n2 Two\n3 Three\n4 Four","Contiguous copy should cite once and preserve each verse");
assert.equal(behavior.gaps,"ទំនុកដំកើង 1:1,3-4\n1 One\n3 Three\n4 Four","Disjoint selection should cite accurate verse groups");
assert.equal(behavior.single,"ទំនុកដំកើង 1:8\n8 Eight","Single verse should cite once");
assert.equal(behavior.reverse,"2,3,4,5","Reverse drag must select a continuous range");
assert.equal(behavior.drag,"1,2,3,4","Ctrl/Cmd-additive reverse drag must preserve existing selections");
assert.equal(behavior.anchor,4,"Drag should retain its starting anchor");
assert.equal(behavior.focus,2,"Drag should sync its final focused verse");
assert.equal(behavior.updates,1,"Drag should update the verse selection display");

const appearanceLogic=js.match(/function isDarkAppearance\(\)\{[\s\S]*?\n\}/)?.[0];
assert(appearanceLogic,"Theme logic must be testable");
const results=runInNewContext([
  'const state={prefs:{appearance:"classic",dark:false}};',
  'let systemDark=false;',
  'const prefersSystemDark=()=>systemDark;',
  appearanceLogic,
  'const classicLight=!isDarkAppearance();',
  'state.prefs.dark=true;const classicDark=isDarkAppearance();',
  'state.prefs.appearance="auto";systemDark=true;const autoDark=isDarkAppearance();',
  'systemDark=false;const autoLight=!isDarkAppearance();',
  'state.prefs.appearance="dark";const dark=isDarkAppearance();',
  'state.prefs.appearance="navy";const navy=isDarkAppearance();',
  'state.prefs.appearance="light";const light=!isDarkAppearance();',
  'state.prefs.appearance="gray";const gray=!isDarkAppearance();',
  '({classicLight,classicDark,autoDark,autoLight,dark,navy,light,gray})'
].join("\n"),{},{timeout:1000});
for(const [mode,passed]of Object.entries(results))assert.equal(passed,true,"Theme logic failed: "+mode);
console.log("Bible App checks passed: Classic + Tahoe83 themes, offline Auto, Clear/Tinted glass, single-label language switch, copy and reverse-drag behavior, "+translated.length+" translated labels, 66 books and preserved saved data.");
