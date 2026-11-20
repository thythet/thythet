// Validate Bible App UI requirements without network access or test dependencies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root=new URL("../web/",import.meta.url);
const file=name=>readFileSync(new URL(name,root),"utf8");
const html=file("index.html"),css=file("style.css"),js=file("app.js"),sw=file("sw.js"),i18n=file("i18n.js");
assert(!html.includes('class="traffic"'),"Decorative macOS traffic-light dots must be removed from sidebar");
assert(html.includes('src="./firebase-config.js"'),"Firebase config must be loaded before app");
assert(html.includes('id="usersPage"'),"Owner/admin management page missing");
assert(!css.includes(".traffic{")&&!css.includes(".traffic i"),"Decorative traffic-light CSS should be removed");
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
  "appearancePage","appearanceGallery","glassGallery","languageActiveLabel","settingTheme",
  "usersPage","authProfile","authUserName","authUserEmail","authUserUid","authRole","authLogout","adminLaunch",
  "authHelp","cloudActions","cloudUpload","cloudDownload","cloudRestore","usersList","usersSearch","usersRefresh","usersSummary"
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
assert(html.includes('class="chapter-select-wrap"')&&html.includes('class="chapter-select-chevron"'),"Chapter dropdown must use an inset chevron");
assert(/id="prevChapter"[^>]*><svg/.test(html)&&/id="nextChapter"[^>]*><svg/.test(html),"Chapter arrows must use aligned SVG artwork");
assert(css.includes('#readerPage .chapter-controls #prevChapter')&&css.includes('display:grid;place-items:center;width:36px;height:36px'),"Chapter arrow buttons must be centered");
assert(css.includes('position:absolute;right:13px')&&css.includes('padding:5px 36px 5px 12px'),"Chapter dropdown arrow should be inset from its border");
assert(!html.includes('<div class="hero-icon">⌕</div>'),"Large Search header icon must be removed");
assert(html.includes('class="page-hero search-page-heading"'),"Search heading must remain centered");
assert(js.includes('setSearchStatus("");')&&!js.includes('tr("indexedAll")'),"Ready search notice must not be displayed");
assert(js.includes('setSearchStatus(tr("searchMatches"')&&js.includes('setSearchStatus(tr("searchWorkerUnavailable"))'),"Search result and error feedback must remain");

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
for(const id of ["sidebarAvatarPhoto","sidebarAvatarFallback","sidebarAccountName","accountHeroPhoto","accountHeroFallback","accountHeroName"])assert(allIds.has(id),"Account identity UI is missing: "+id);
assert(js.includes('renderAccountIdentity();')&&js.includes('cloudUser?.photoURL')&&js.includes('cloudUser?.displayName'),"Signed-in identity must come from Firebase auth");
assert(js.includes('photo.addEventListener("error"')&&js.includes('photo.addEventListener("load"'),"Profile images must handle loading and fallback");
assert(js.includes('setAccountAvatarMode(photo,"photo")')&&js.includes('setAccountAvatarMode(photo,"initials")')&&js.includes('setAccountAvatarMode(photo,"google")'),"Google photo, initials and signed-out icon must be mutually exclusive");
assert(css.includes('position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover'),"Google photo must fill its avatar without stacking");
assert(css.includes('[data-avatar-mode="photo"] .google-logo'),"Signed-in photo must hide default Google G");
assert(css.includes(".account-row .account-copy strong{display:block")&&css.includes(".account-google .account-avatar-photo"),"Account identity layout must accommodate profile images");
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
assert(css.includes('#booksList #section-new > .book-heading{')&&css.includes('background:#bf3039;')&&css.includes('color:#fff;'),"New Testament section heading should have readable red background");
assert(!css.includes('#booksList #section-old > .book-heading{'),"Old Testament heading should retain existing appearance");
assert(css.includes("gap:11px;padding:8px;border-radius:30px;text-align:left"),"Account and sidebar-tool controls must use 8px padding and 30px radius");
assert(css.includes(".account-row{padding:8px;gap:5px}"),"Mobile Account padding must match desktop");
assert(sw.includes("bibleapp-web-v0.2.6")&&sw.includes("./i18n.js"),"Web offline cache revision missing");
assert(/#readerPage \.verses \.verse\.selected/.test(css)&&css.includes("background:#dcf3dc!important")&&css.includes("border:2px solid #4caf50!important"),"Selected verses must have a pale-green background and 2px green border");
assert(css.includes('background:#dcf3dc!important')&&css.includes('border:2px solid #4caf50!important'),"Unhighlighted selections must retain pale green with 2px green border");
for(const shade of ["blue","purple","pink","red","orange","yellow","green","gray"]){
  assert(css.includes('#readerPage .verses .verse[data-highlight="'+shade+'"]:not([data-highlight=""]).selected'),
    "Selected "+shade+" highlight must show its chosen color immediately");
}
assert(css.includes('.selected .verse-number{color:inherit!important}'),
  "Selected highlighted verse numbers must remain readable");
assert(/root\.addEventListener\("pointerdown",beginVerseDrag\)/.test(js),"Mouse drag must start on verse rows");
assert(/window\.addEventListener\("pointermove",moveVerseDrag/.test(js),"Mouse drag must track pointer movements");
assert(/window\.addEventListener\("pointerup",finishVerseDrag\)/.test(js),"Mouse drag must complete on release");
assert(/e\.pointerType==="touch"/.test(js),"Touch long-press and scroll must remain independent");
assert(/suppressVerseClick=true/.test(js),"Drag release must prevent an unwanted single-verse click");
assert(/function groupVerseNumbers\(numbers\)/.test(js)&&/function formatVerseSelection\(items\)/.test(js),"Compact grouped reference formatter missing");
assert(/function selectedText\(\)/.test(js)&&/contextualTextSelection\|\|readNativeTextSelection\(\)\|\|formatVerseSelection\(selectedData\(true\)\)/.test(js),
  "Copy must prefer selected characters then fall back to full verses");
assert(/function readNativeTextSelection\(\)/.test(js)&&/\.closest\?\.\(".verse-text"\)/.test(js),
  "Partial native selection must be limited to Scripture text");
assert(/contextualTextSelection=readNativeTextSelection\(\)/.test(js),
  "Right-click must snapshot character selection before clicking menu");
assert(/const content=contentOverride\|\|selectedText\(\)/.test(js),"Share must preserve partial text selection too");
assert(/if\(!e\.target\.closest\(".verse-number"\)\)return/.test(js),
  "Whole-verse dragging must begin at the blue verse number only");
assert(/e\.target\.closest\(".verse-text"\)/.test(js),"Text dragging must use native selection");
assert(/function shouldSelectVerseFromClick\(e\)/.test(js)&&/if\(shouldSelectVerseFromClick\(e\)\)selectVerse\(v\.n,e\)/.test(js),
  "Whole-verse click should honor modifier keys anywhere on the row");
assert(/return Boolean\(\(e\.shiftKey\|\|e\.ctrlKey\|\|e\.metaKey\)\&\&e\.target\.closest\(".verse"\)\)/.test(js),
  "Shift, Ctrl and Command must work anywhere on a verse row");
assert(/if\(e\.shiftKey\|\|e\.ctrlKey\|\|e\.metaKey\)\{[\s\S]{0,180}e\.preventDefault\(\)/.test(js),
  "Modifier clicks in Scripture text must not extend native text selection");
assert(/function applyVerseSelection\(n,e\)/.test(js),
  "Whole-verse selection logic should be independent of native text drag");
assert(css.includes('.verse-text{user-select:text;-webkit-user-select:text;cursor:text'),
  "Verse text needs native user-select:text");
assert(css.includes('.verse-number{user-select:none;-webkit-user-select:none;cursor:crosshair'),
  "Verse number must remain the dedicated row-selection handle");
assert(/className="verse-bookmark"/.test(js)&&/saved\.hidden=!Boolean\(state\.study\.bookmarks\[key\(v\.n\)\]\)/.test(js),
  "Saved verses must display a visible bookmark icon");
assert(/function toggleVerseBookmark\(n\)/.test(js)&&/delete state\.study\.bookmarks\[id\]/.test(js),
  "Clicking the saved-verse bookmark must remove it");
assert(/function selectedAreBookmarked\(\)/.test(js)&&/function bookmarkSelected\(\)/.test(js),
  "Context menu must toggle Save and Unsave for verse selections");
assert(/button\.querySelector\("span"\)\.textContent=label/.test(js)&&/unsave\?"unsave":"save"/.test(js),
  "Right-click Save button must change to Unsave for saved verses");
assert(css.includes('.verse-bookmark[hidden]{display:none!important}'),
  "Unsaved verses must not show bookmark icons");

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
assert.equal(locales.kh.appearance,"ពណ៌ផ្ទៃកម្មវិធី","Appearance title should use the exact requested Khmer label");
assert(!Object.values(locales.kh).some(v=>typeof v==="string"&&v.includes("រូបរាង")),"Old Khmer Appearance wording must not remain");
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
// Verify existing bookmarks are reused and that Save toggles to Unsave.
const savedLogic=js.match(/function selectedAreBookmarked\(\)\{[\s\S]*?\n\}/)?.[0];
const toggleLogic=js.match(/function bookmarkSelected\(\)\{[\s\S]*?\n\}/)?.[0];
assert(savedLogic&&toggleLogic,"Bookmark behavior functions missing");
const bookBehavior=runInNewContext([
  'const state={study:{bookmarks:{}},bookId:"JHN",chapter:1};',
  'const key=n=>"JHN:1:"+n;',
  'const selectedData=()=>[{n:2,text:"Verse 2"},{n:3,text:"Verse 3"}];',
  'const tr=(k,vars)=>k;',
  'let refreshed=0;const persist=()=>{};const toast=()=>{};const refreshBookmarkIndicators=()=>{refreshed++};',
  savedLogic,toggleLogic,
  'bookmarkSelected();',
  'const first=Object.keys(state.study.bookmarks).sort().join(",");',
  'const stored=state.study.bookmarks["JHN:1:2"];',
  'const afterSave=selectedAreBookmarked();',
  'bookmarkSelected();',
  '({first,stored,afterSave,remaining:Object.keys(state.study.bookmarks).length,afterUnsave:selectedAreBookmarked(),refreshed})'
].join("\n"),{},{timeout:1000});
assert.equal(bookBehavior.first,"JHN:1:2,JHN:1:3","Selected verses should save to existing storage keys");
assert.equal(bookBehavior.stored.text,"Verse 2","Saved bookmarks must preserve verse text");
assert.equal(bookBehavior.afterSave,true,"Both verses should show saved state");
assert.equal(bookBehavior.remaining,0,"Second Save should unsave already saved verses");
assert.equal(bookBehavior.afterUnsave,false,"Unsave should clear saved state");
assert.equal(bookBehavior.refreshed,2,"Bookmark indicators must refresh for both actions");
// Exercise exact text selection and ensure it cannot steal unrelated UI text.
const nativeFn=js.match(/function readNativeTextSelection\(\)\{[\s\S]*?\n\}/)?.[0];
const copyFn=js.match(/function selectedText\(\)\{[\s\S]*?\n\}/)?.[0];
assert(nativeFn&&copyFn,"Character selection / copy functions must be testable");
const textBehavior=runInNewContext([
  'const verseTextElement={};',
  'const paragraph={closest:selector=>selector===".verse-text"?verseTextElement:null};',
  'let current={isCollapsed:false,anchorNode:{nodeType:3,parentElement:paragraph},focusNode:{nodeType:3,parentElement:paragraph},toString:()=>"ព្រះបន្ទូល"};',
  'const window={getSelection:()=>current};',
  'const $=()=>({contains:element=>element===verseTextElement});',
  'let contextualTextSelection="";',
  'const formatVerseSelection=()=>"FULL VERSE";',
  'const selectedData=()=>[{n:1}];',
  nativeFn,copyFn,
  'const exact=selectedText();',
  'current={...current,isCollapsed:true};const fallback=selectedText();',
  'contextualTextSelection="captured words";const captured=selectedText();',
  'contextualTextSelection="";current={...current,isCollapsed:false,anchorNode:{nodeType:3,parentElement:{closest:()=>null}}};const outside=selectedText();',
  '({exact,fallback,captured,outside})'
].join("\n"),{},{timeout:1000});
assert.equal(textBehavior.exact,"ព្រះបន្ទូល","Exact text selection should copy only the highlighted characters");
assert.equal(textBehavior.fallback,"FULL VERSE","No text selection should copy grouped whole verses");
assert.equal(textBehavior.captured,"captured words","Right-click menu must retain the original text selection");
assert.equal(textBehavior.outside,"FULL VERSE","Text selected outside Scripture should not override verse copying");
// Account developer footer: accurate bilingual attribution, readable and truly last.
const accountStart=html.indexOf('id="accountPage"'),accountEnd=html.indexOf('id="toolsPage"');
const accountMarkup=html.slice(accountStart,accountEnd);
const footerAt=accountMarkup.indexOf('class="account-developer-footer"');
assert(footerAt>0,"Account page must contain the developer information footer");
assert(footerAt>accountMarkup.indexOf('class="cards"'),"Developer footer should appear after Account cards");
assert.equal((html.match(/class="account-developer-footer"/g)||[]).length,1,"Developer footer should appear once");
for(const key of ["developerInformation","developerCredit","developerSummary","developerCopyright"]){
  assert(locales.en[key]&&locales.kh[key],"Developer footer must be translated: "+key);
}
assert.equal(locales.en.developerCredit,"Developed by: THY THET","English developer attribution must use THY THET");
assert.equal(locales.kh.developerCredit,"អភិវឌ្ឍកម្មវិធីដោយ៖ ធី ថេត","Khmer developer attribution must use ធី ថេត");
assert(locales.en.developerSummary.includes("November 20, 2026"),"English created date must be preserved");
assert(locales.kh.developerSummary.includes("២០ ខែវិច្ឆិកា ឆ្នាំ២០២៦"),"Khmer created date must be preserved");
assert(locales.en.developerCopyright.includes("© 2026")&&locales.kh.developerCopyright.includes("© ២០២៦"),"Both languages must contain copyright");
assert(css.includes("#accountPage:not([hidden]){display:flex;flex-direction:column"),"Account footer should be bottom-aligned without revealing hidden page");
assert(css.includes("#accountPage .account-developer-footer")&&css.includes("margin-top:auto"),"Developer footer should occupy the page bottom");
assert(accountMarkup.includes('class="developer-summary"')&&accountMarkup.includes('data-i18n="developerSummary"'),
  "Developer creation date and purpose must be one continuous line of content");
assert(!accountMarkup.includes('class="developer-created"')&&!accountMarkup.includes('class="developer-purpose"'),
  "Developer date and purpose must not render in separate paragraphs");
assert(accountMarkup.includes('data-i18n="developerCredit"')&&accountMarkup.includes('data-i18n="developerCopyright"'),
  "Developer name and copyright must remain separate");
const toolsMarkup=html.slice(html.indexOf('id="toolsPage"'),html.indexOf('id="helpPage"'));
const toolsCards=toolsMarkup.slice(toolsMarkup.indexOf('<div class="cards">'),toolsMarkup.indexOf('</div><div class="panel">'));
assert.equal((toolsCards.match(/data-open=/g)||[]).length,5,"All five Tools navigation cards must remain");
assert(!toolsCards.includes("<span>"),"Tools navigation cards must have no decorative icons");
assert(!toolsMarkup.includes('class="hero-icon"'),"Tools page heading must have no decorative icon");
assert(toolsMarkup.includes('id="openPowerSlide"'),"PowerSlidePro action must remain intact");
assert(css.includes('#toolsPage .cards button{gap:6px'),"Tools cards should have compact icon-free spacing");
const accountCards=accountMarkup.slice(accountMarkup.indexOf('<div class="cards">'),accountMarkup.indexOf('</div><footer'));
assert.equal((accountCards.match(/data-open=/g)||[]).length,5,"All five Account navigation cards must remain");
assert(!/<span>[^<]+<\/span>\s*<strong/.test(accountCards),"Account navigation cards must not show decorative icons");
assert(css.includes('padding:24px 5px 0')&&css.includes('#accountPage .developer-summary'),
  "Professional footer must be visible near the bottom of the Account page");
// Execute the real modifier-selection function against disjoint and range selections.
const modifierFn=js.match(/function applyVerseSelection\(n,e\)\{[\s\S]*?\n\}/)?.[0];
const clickFn=js.match(/function shouldSelectVerseFromClick\(e\)\{[\s\S]*?\n\}/)?.[0];
assert(modifierFn&&clickFn,"Modifier selection helpers must be testable");
const modifierResults=runInNewContext([
  'const state={selection:new Set(),anchor:null,focusVerse:null};',
  'const verseData=()=>[1,2,3,4,5,6,7,8].map(n=>({n}));',
  'function verseRangeBetween(a,b,verses){const i=verses.indexOf(a),j=verses.indexOf(b);return verses.slice(Math.min(i,j),Math.max(i,j)+1)}',
  modifierFn,clickFn,
  'const e=(attrs={})=>({shiftKey:false,ctrlKey:false,metaKey:false,...attrs});',
  'applyVerseSelection(2,e());',
  'applyVerseSelection(5,e({ctrlKey:true}));',
  'const additive=[...state.selection].sort((a,b)=>a-b).join(",");',
  'applyVerseSelection(7,e({shiftKey:true}));',
  'const ranged=[...state.selection].sort((a,b)=>a-b).join(",");',
  'applyVerseSelection(4,e({metaKey:true}));',
  'const command=[...state.selection].sort((a,b)=>a-b).join(",");',
  'applyVerseSelection(5,e({ctrlKey:true}));',
  'const toggle=[...state.selection].sort((a,b)=>a-b).join(",");',
  'const row={closest:selector=>selector===".verse"?{}:null};',
  'const number={closest:selector=>selector===".verse-number"||selector===".verse"?{}:null};',
  'const bookmark={closest:selector=>selector===".verse-bookmark"||selector===".verse"?{}:null};',
  'const plainText=shouldSelectVerseFromClick({target:row,...e()});',
  'const shiftText=shouldSelectVerseFromClick({target:row,...e({shiftKey:true})});',
  'const ctrlText=shouldSelectVerseFromClick({target:row,...e({ctrlKey:true})});',
  'const cmdText=shouldSelectVerseFromClick({target:row,...e({metaKey:true})});',
  'const numberClick=shouldSelectVerseFromClick({target:number,...e()});',
  'const bookmarkClick=shouldSelectVerseFromClick({target:bookmark,...e({ctrlKey:true})});',
  '({additive,ranged,command,toggle,plainText,shiftText,ctrlText,cmdText,numberClick,bookmarkClick})'
].join("\n"),{},{timeout:1000});
assert.equal(modifierResults.additive,"2,5","Ctrl-click should add nonconsecutive verses");
assert.equal(modifierResults.ranged,"5,6,7","Shift-click should select a range from the latest anchor");
assert.equal(modifierResults.command,"4,5,6,7","Command-click should add another verse");
assert.equal(modifierResults.toggle,"4,6,7","Ctrl-click on an existing verse should deselect it");
assert.equal(modifierResults.plainText,false,"Plain text clicks must allow native character selection");
for(const name of ["shiftText","ctrlText","cmdText","numberClick"])assert.equal(modifierResults[name],true,name+" must select whole verse rows");
assert.equal(modifierResults.bookmarkClick,false,"Saved-verse icon should not accidentally select a verse");
console.log("Bible App checks passed: Shift/Ctrl/Command row selection, icon-free Account cards, single-line developer text, bookmark + highlight behavior, bilingual offline UI.");

