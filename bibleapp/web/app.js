/* Bible App v0.1 — offline Khmer Bible foundation. No online services required. */
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const BOOK_EN = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
const pageTitles = {reader:"Bible Reader",account:"Account",tools:"Tools",search:"Bible Search",generator:"បង្កើតស្លាយ",settings:"Settings",bookmarks:"Bookmarks",export:"Export Center",help:"Help",appearance:"Appearance"};
const tr=(k,vars={})=>{
  const table=window.BIBLE_LOCALES?.[state.prefs.lang==="en"?"en":"kh"]||{};
  const template=table[k]||window.BIBLE_LOCALES?.en?.[k]||k;
  return template.replace(/\{([a-z]+)\}/gi,(_,name)=>String(vars[name]??""));
};
const STORE="bibleapp.study.v1",PREFS="bibleapp.prefs.v1";
const getStored=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))||def}catch{return def}};
const state={manifest:null,books:[],book:null,bookId:"JHN",chapter:1,testament:"new",page:"reader",selection:new Set(),anchor:null,focusVerse:1,study:getStored(STORE,{bookmarks:{},highlights:{},notes:{}}),prefs:{dark:false,appearance:"classic",glass:"clear",fontSize:23,lang:"kh",sidebarWidth:266,...getStored(PREFS,{})},lastByTestament:{old:null,new:null},slides:[],slide:0,presentItems:[],presentIndex:0,searchWorker:null,searchReady:false};
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(state.study))}catch{toast(tr("storageFull"))}};
const persistPrefs=()=>{try{localStorage.setItem(PREFS,JSON.stringify(state.prefs))}catch{}};
const key=(n,book=state.bookId,ch=state.chapter)=>book+":"+ch+":"+n;
const kmNumber=(n)=>String(n).replace(/[0-9]/g,c=>"០១២៣៤៥៦៧៨៩"[Number(c)]);
const asciiNumber=(s)=>String(s).replace(/[០-៩]/g,c=>String("០១២៣៤៥៦៧៨៩".indexOf(c)));
const normalize=(s)=>asciiNumber(String(s||"").toLowerCase()).replace(/[\u200b\u200c\u200d]/g,"").trim();
const enFor=(b)=>BOOK_EN[b.order-1]||b.id;
const show=(id,val)=>{$(id).hidden=!val};
let toastTimer=null;
function toast(message){$("toast").textContent=message;show("toast",true);clearTimeout(toastTimer);toastTimer=setTimeout(()=>show("toast",false),3300)}
const APPEARANCE_CHOICES=["classic","auto","light","dark","gray","navy"];
const GLASS_CHOICES=["clear","tinted"];
const prefersSystemDark=()=>typeof window.matchMedia==="function"&&window.matchMedia("(prefers-color-scheme: dark)").matches;
function isDarkAppearance(){
  const theme=state.prefs.appearance;
  if(theme==="classic")return !!state.prefs.dark;
  if(theme==="auto")return prefersSystemDark();
  return theme==="dark"||theme==="navy";
}
function syncAppearanceGallery(){
  for(const el of document.querySelectorAll("[data-theme-choice]")){
    const active=el.dataset.themeChoice===state.prefs.appearance;
    el.classList.toggle("selected",active);
    el.setAttribute("aria-pressed",String(active));
  }
  for(const el of document.querySelectorAll("[data-glass-choice]")){
    const active=el.dataset.glassChoice===state.prefs.glass;
    el.classList.toggle("selected",active);
    el.setAttribute("aria-pressed",String(active));
  }
  const classic=state.prefs.appearance==="classic";
  $("glassGallery").classList.toggle("glass-inactive",classic);
  $("glassGallery").setAttribute("aria-disabled",String(classic));
  for(const el of $("glassGallery").querySelectorAll("button"))el.disabled=classic;
}
function updateTheme(){
  if(!APPEARANCE_CHOICES.includes(state.prefs.appearance))state.prefs.appearance="classic";
  if(!GLASS_CHOICES.includes(state.prefs.glass))state.prefs.glass="clear";
  const dark=isDarkAppearance();
  document.body.classList.toggle("dark",dark);
  document.body.dataset.appearance=state.prefs.appearance==="classic"?"classic":"tahoe-"+state.prefs.appearance;
  document.body.dataset.glass=state.prefs.glass;
  document.documentElement.style.colorScheme=dark?"dark":"light";
  document.documentElement.style.setProperty("--verse-size",state.prefs.fontSize+"px");
  show("themeMoon",!dark);show("themeSun",dark);
  $("settingFont").value=state.prefs.fontSize;
  $("zoomSlider").value=state.prefs.fontSize;
  $("zoomValue").textContent=state.prefs.fontSize+"px";
  $("zoomMinus").disabled=state.prefs.fontSize<=18;
  $("zoomPlus").disabled=state.prefs.fontSize>=36;
  syncAppearanceGallery();
}
function chooseAppearance(theme){
  if(!APPEARANCE_CHOICES.includes(theme))return;
  state.prefs.appearance=theme;persistPrefs();updateTheme();
}
function chooseGlass(mode){
  if(!GLASS_CHOICES.includes(mode)||state.prefs.appearance==="classic")return;
  state.prefs.glass=mode;persistPrefs();updateTheme();
}
function toggleDarkMode(){
  if(state.prefs.appearance==="classic")state.prefs.dark=!state.prefs.dark;
  else state.prefs.appearance=isDarkAppearance()?"light":"dark";
  persistPrefs();updateTheme();
}
function listenSystemAppearance(){
  if(typeof window.matchMedia!=="function")return;
  const mql=window.matchMedia("(prefers-color-scheme: dark)");
  const changed=()=>{if(state.prefs.appearance==="auto")updateTheme()};
  if(typeof mql.addEventListener==="function")mql.addEventListener("change",changed);
  else if(typeof mql.addListener==="function")mql.addListener(changed);
}
function setFontSize(value){
  const size=Math.max(18,Math.min(36,Number(value)||23));
  if(state.prefs.fontSize===size)return;
  state.prefs.fontSize=size;persistPrefs();updateTheme();
}
function setZoomOpen(open){
  show("zoomPopover",open);
  $("fontButton").setAttribute("aria-expanded",String(open));
  if(open)$("zoomSlider").focus({preventScroll:true});
}
function updatePageTitle(){
  const name=state.page==="reader"&&state.book?bookMeta()?.nameKm:null;
  $("pageTitle").textContent=name||tr(state.page);
}
function setLanguage(lang,save=true){
  state.prefs.lang=lang==="en"?"en":"kh";
  document.documentElement.lang=state.prefs.lang==="en"?"en":"km";
  for(const el of document.querySelectorAll("[data-i18n]"))el.textContent=tr(el.dataset.i18n);
  for(const el of document.querySelectorAll("[data-i18n-placeholder]"))el.placeholder=tr(el.dataset.i18nPlaceholder);
  for(const el of document.querySelectorAll("[data-i18n-title]"))el.title=tr(el.dataset.i18nTitle);
  for(const el of document.querySelectorAll("[data-i18n-aria]"))el.setAttribute("aria-label",tr(el.dataset.i18nAria));
  $("languageToggle").classList.toggle("is-kh",state.prefs.lang==="kh");
  $("languageToggle").setAttribute("aria-checked",String(state.prefs.lang==="kh"));
  $("languageActiveLabel").textContent=state.prefs.lang.toUpperCase();
  $("sidebarResize").setAttribute("aria-label",tr("resizeSidebar"));
  $("sidebarResize").title=tr("resizeSidebar");
  updatePageTitle();
  updateSelectionBar();
  if(state.books.length)setupSidebar();
  if(state.book&&state.page==="reader"){const top=$("verses").scrollTop;renderReader();$("verses").scrollTop=top;}
  if(state.page==="bookmarks")renderSaved();
  else if(state.page==="reader")refreshBookmarkIndicators();
  if(state.page==="generator"&&state.slides.length)renderSlides();
  if(!$("verseContextMenu").hidden)positionVerseMenu(menuPosition.x,menuPosition.y);
  if(state.page==="search"&&state.searchReady){if($("verseSearch").value.trim())doSearch();else $("searchStatus").textContent=tr("indexedAll");}
  if(save)persistPrefs();
}
function resizeLimits(){
  const width=$("app").getBoundingClientRect().width;
  const min=width<650?135:190,max=Math.max(min,Math.min(480,width-(width<650?165:410)));
  return {min,max};
}
function setSidebarWidth(value,save=false){
  const {min,max}=resizeLimits(),num=Number(value);
  const width=Math.round(Math.max(min,Math.min(max,Number.isFinite(num)?num:266)));
  $("app").style.setProperty("--sidebar-width",width+"px");
  const el=$("sidebarResize");
  el.setAttribute("aria-valuemin",String(min));
  el.setAttribute("aria-valuemax",String(max));
  el.setAttribute("aria-valuenow",String(width));
  if(save){state.prefs.sidebarWidth=width;persistPrefs()}
}
function initSidebarResizer(){
  const handle=$("sidebarResize");
  handle.addEventListener("pointerdown",e=>{
    if(e.button!==0)return;
    e.preventDefault();$("app").classList.add("resizing");handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove",e=>{
    if(!handle.hasPointerCapture(e.pointerId))return;
    setSidebarWidth(e.clientX-$("app").getBoundingClientRect().left);
  });
  const finish=e=>{
    if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
    $("app").classList.remove("resizing");
    const width=Number(handle.getAttribute("aria-valuenow"));
    if(Number.isFinite(width))setSidebarWidth(width,true);
  };
  handle.addEventListener("pointerup",finish);
  handle.addEventListener("pointercancel",finish);
  handle.addEventListener("keydown",e=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
    e.preventDefault();
    const {min,max}=resizeLimits(),current=Number(handle.getAttribute("aria-valuenow"));
    setSidebarWidth(e.key==="Home"?min:e.key==="End"?max:current+(e.key==="ArrowRight"?20:-20),true);
  });
  window.addEventListener("resize",()=>setSidebarWidth(state.prefs.sidebarWidth));
  setSidebarWidth(state.prefs.sidebarWidth);
}
function setPage(p){if(!(p in pageTitles))return;state.page=p;setZoomOpen(false);closeVerseMenu();$("quickReference").hidden=p!=="reader";Object.keys(pageTitles).forEach(k=>show(k+"Page",p===k));updatePageTitle();if(p==="bookmarks")renderSaved();if(p==="search"){initWorker();$("verseSearch").focus()}if(p==="generator"&&!$("generatorInput").value)$("generatorInput").value="យ៉ូហាន 3:16-18";if(p==="reader")renderReader()}
function updateTestamentButtons(testament){
  $("oldTab").classList.toggle("active",testament==="old");
  $("newTab").classList.toggle("active",testament==="new");
  $("oldTab").setAttribute("aria-pressed",String(testament==="old"));
  $("newTab").setAttribute("aria-pressed",String(testament==="new"));
}
function updateVisibleTestament(){
  const list=$("booksList"),newSection=list.querySelector("#section-new");
  if(!newSection){updateTestamentButtons("old");return}
  const threshold=list.getBoundingClientRect().top+Math.min(75,list.clientHeight*.28);
  updateTestamentButtons(newSection.getBoundingClientRect().top<=threshold?"new":"old");
}
function scrollToTestament(testament,behavior="smooth"){
  const list=$("booksList"),section=$("section-"+testament);
  if(!section)return;
  const top=section.getBoundingClientRect().top-list.getBoundingClientRect().top+list.scrollTop;
  list.scrollTo({top:Math.max(0,top-3),behavior});
  updateTestamentButtons(testament);
}
function revealBookSelection(){
  const list=$("booksList"),active=list.querySelector(".book-item.active");
  if(!active||$("bookSearch").value.trim())return;
  const top=active.getBoundingClientRect().top-list.getBoundingClientRect().top+list.scrollTop;
  list.scrollTop=Math.max(0,top-Math.round(list.clientHeight*.28));
  updateVisibleTestament();
}
function setupSidebar(revealSelected=false){
  const list=$("booksList"),previousTop=list.scrollTop,q=normalize($("bookSearch").value);
  list.replaceChildren();
  let found=0;
  for(const testament of ["old","new"]){
    const books=state.books.filter(b=>(testament==="old"?b.testament==="OT":b.testament==="NT")&&normalize(b.nameKm+" "+enFor(b)+" "+b.id).includes(q));
    if(!books.length)continue;
    const section=document.createElement("section");section.className="book-section";section.id="section-"+testament;
    const heading=document.createElement("div");heading.className="book-heading";
    heading.textContent=tr(testament==="old"?"oldTestament":"newTestament");
    section.append(heading);
    books.forEach((b,i)=>{
      const item=document.createElement("button");item.type="button";
      item.className="book-item"+(i%2?" book-item-alt":"")+(state.bookId===b.id?" active":"");
      item.setAttribute("aria-current",state.bookId===b.id?"true":"false");
      const title=document.createElement("span");title.className="book-name";title.textContent=b.nameKm;
      item.append(title);item.onclick=()=>openBook(b.id,1);section.append(item);
    });
    list.append(section);found+=books.length;
  }
  if(!found){const none=document.createElement("p");none.className="hint";none.textContent=tr("notFoundBooks");list.append(none)}
  if(revealSelected)revealBookSelection();
  else{list.scrollTop=previousTop;updateVisibleTestament()}
}

async function loadBook(id){const book=state.books.find(b=>b.id===id);if(!book)throw Error("Unknown Bible book: "+id);const response=await fetch("./data/books/"+encodeURIComponent(id)+".json");if(!response.ok)throw Error("Unable to read "+id+".json");const payload=await response.json();if(!payload.chapters||payload.id!==id)throw Error("Invalid Bible data for "+id);return payload}
let bookRequestId=0;
async function openBook(id,ch){
  const request=++bookRequestId;
  try{
    const b=await loadBook(id);
    if(request!==bookRequestId)return;
    const meta=state.books.find(x=>x.id===id);
    if(!meta)throw Error("Unknown Bible book");
    const query=normalize($("bookSearch").value);
    if(query&&!normalize(meta.nameKm+" "+enFor(meta)+" "+meta.id).includes(query))$("bookSearch").value="";
    closeVerseMenu();state.book=b;state.bookId=id;state.focusVerse=1;
    state.chapter=Math.min(Math.max(1,Number(ch)||1),Number(b.chapterCount)||1);
    state.testament=meta.testament==="OT"?"old":"new";
    state.lastByTestament[state.testament]={id,ch:state.chapter};
    state.selection.clear();state.anchor=null;
    setPage("reader");setupSidebar(true);saveReadingPlace();
  }catch(err){if(request===bookRequestId)toast(String(err.message||err))}
}
function changeTestament(testament){if(!state.books.length)return;if($("bookSearch").value){$("bookSearch").value="";setupSidebar()}scrollToTestament(testament)}
const saveReadingPlace=()=>{state.lastByTestament[state.testament]={id:state.bookId,ch:state.chapter};try{localStorage.setItem("bibleapp.lastplace",JSON.stringify({id:state.bookId,ch:state.chapter}))}catch{}};
const bookMeta=()=>state.books.find(b=>b.id===state.bookId);
function verseData(){const verses=state.book?.chapters?.[String(state.chapter)]?.verses||{};return Object.entries(verses).map(([n,text])=>({n:Number(n),text:String(text)})).sort((a,b)=>a.n-b.n)}
function renderChapterStrip(count){
  const root=$("chapterStrip");root.replaceChildren();
  root.setAttribute("aria-label",tr("chapters"));
  let active=null;const fragment=document.createDocumentFragment();
  for(let n=1;n<=count;n++){
    const button=document.createElement("button");button.type="button";
    button.className="chapter-pill"+(n===state.chapter?" active":"");
    button.textContent=state.prefs.lang==="kh"?kmNumber(n):String(n);
    button.setAttribute("aria-label",tr("chapter")+" "+n);
    button.setAttribute("aria-current",String(n===state.chapter));
    button.onclick=()=>goToChapter(n);
    if(n===state.chapter)active=button;
    fragment.append(button);
  }
  root.append(fragment);
  if(active){
    const offset=active.getBoundingClientRect().left-root.getBoundingClientRect().left+root.scrollLeft;
    root.scrollLeft=Math.max(0,offset-(root.clientWidth-active.clientWidth)/2);
  }
}
function goToChapter(n){
  const next=Number(n);
  if(!Number.isInteger(next)||next<1||next>Number(state.book?.chapterCount))return;
  if(next===state.chapter)return;
  closeVerseMenu();state.chapter=next;state.selection.clear();state.anchor=null;state.focusVerse=1;
  renderReader();saveReadingPlace();$("verses").scrollTop=0;
}

function syncQuickReference(){
  if(!state.book)return;
  $("quickReference").hidden=state.page!=="reader";
  $("quickChapter").max=String(state.book.chapterCount);
  $("quickChapter").value=String(state.chapter);
  const last=verseData().at(-1)?.n||1;
  $("quickVerse").max=String(last);
  $("quickVerse").value=String(Math.min(last,Math.max(1,state.focusVerse||1)));
}
function focusVerse(n,{scroll=true}={}){
  const item=verseData().find(v=>v.n===n);
  if(!item)return false;
  state.focusVerse=n;state.anchor=n;state.selection.clear();state.selection.add(n);
  renderReader();
  if(scroll){
    const row=[...$("verses").children].find(el=>Number(el.dataset.verse)===n);
    if(row){
      const parent=$("verses");
      const target=row.getBoundingClientRect().top-parent.getBoundingClientRect().top+parent.scrollTop-parent.clientHeight*.35;
      parent.scrollTo({top:Math.max(0,target),behavior:"auto"});
    }
  }
  return true;
}
function goToQuickReference(){
  if(!state.book)return;
  const chapter=Number(asciiNumber($("quickChapter").value));
  const verse=Number(asciiNumber($("quickVerse").value));
  if(!Number.isInteger(chapter)||chapter<1||chapter>state.book.chapterCount){
    toast(tr("invalidChapter",{max:state.book.chapterCount}));$("quickChapter").focus();return;
  }
  const chapterData=state.book.chapters[String(chapter)]?.verses||{};
  if(!Number.isInteger(verse)||verse<1||!Object.prototype.hasOwnProperty.call(chapterData,String(verse))){
    toast(tr("invalidVerse"));$("quickVerse").focus();return;
  }
  closeVerseMenu();
  state.chapter=chapter;
  focusVerse(verse);
  saveReadingPlace();
}
function renderReader(){
  if(!state.book)return;
  const b=bookMeta();if(!b)return;
  updatePageTitle();syncQuickReference();
  $("chapterHeading").textContent=b.nameKm+" "+kmNumber(state.chapter);
  const select=$("chapterSelect");select.replaceChildren();
  for(let n=1;n<=b.chapterCount;n++){
    const option=document.createElement("option");option.value=n;
    option.textContent=tr("chapter")+" "+(state.prefs.lang==="kh"?kmNumber(n):n);
    select.append(option);
  }
  select.value=String(state.chapter);
  renderChapterStrip(b.chapterCount);
  const root=$("verses");root.replaceChildren();
  for(const v of verseData()){
    const row=document.createElement("div");row.className="verse"+(state.selection.has(v.n)?" selected":"");
    row.tabIndex=0;row.dataset.verse=v.n;row.dataset.highlight=state.study.highlights[key(v.n)]||"";
    row.setAttribute("role","button");row.setAttribute("aria-pressed",String(state.selection.has(v.n)));
    const number=document.createElement("span");number.className="verse-number";number.textContent=kmNumber(v.n);
    const text=document.createElement("span");text.className="verse-text";text.textContent=v.text;
    const saved=document.createElement("button");
    saved.type="button";saved.className="verse-bookmark";saved.dataset.verse=v.n;
    saved.title=tr("removeBookmark");saved.setAttribute("aria-label",tr("removeBookmark"));
    saved.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6 3.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V22l-6-4-6 4V3.5Z"/></svg>';
    saved.hidden=!Boolean(state.study.bookmarks[key(v.n)]);
    saved.addEventListener("pointerdown",e=>e.stopPropagation());
    saved.addEventListener("click",e=>{e.stopPropagation();toggleVerseBookmark(v.n)});
    row.append(number,text,saved);
    row.onclick=e=>{
      if(suppressVerseClick){suppressVerseClick=false;return}
      // Plain text clicks keep native word/character selection.
      // Shift and Ctrl/Command clicks select full verses from anywhere in their text.
      if(shouldSelectVerseFromClick(e))selectVerse(v.n,e);
    };
    row.oncontextmenu=e=>{
      e.preventDefault();
      contextualTextSelection=readNativeTextSelection();
      selectForContext(v.n);
      openVerseMenu(e.clientX||row.getBoundingClientRect().left,e.clientY||row.getBoundingClientRect().bottom);
    };
    installLongPress(row,v.n);
    row.onkeydown=e=>{
      if(e.target!==row)return;
      if(e.key==="Enter"||e.key===" "){e.preventDefault();selectVerse(v.n,e)}
      else if(e.key==="ContextMenu"||(e.shiftKey&&e.key==="F10")){
        e.preventDefault();selectForContext(v.n);
        const rect=row.getBoundingClientRect();openVerseMenu(rect.left+24,rect.top+24);
      }
    };
    root.append(row);
  }
  updateSelectionBar();
  syncContextBookmarkLabel();
}

// Desktop pointer-drag from a BLUE VERSE NUMBER selects whole verse rows.
// Dragging within Scripture text uses the browser-native character/word selection.
// Touch retains long-press and scroll behavior; keyboard modifiers still work.
function verseRangeBetween(start,end,numbers){
  const from=numbers.indexOf(start),to=numbers.indexOf(end);
  if(from<0||to<0)return [];
  return numbers.slice(Math.min(from,to),Math.max(from,to)+1);
}
let verseDrag=null;
function rowAtPointer(x,y){
  const root=$("verses"),rect=root.getBoundingClientRect();
  const px=Math.max(rect.left+5,Math.min(rect.right-5,x));
  const py=Math.max(rect.top+5,Math.min(rect.bottom-5,y));
  const hit=document.elementFromPoint(px,py)?.closest(".verse");
  if(hit&&root.contains(hit))return Number(hit.dataset.verse);
  const rows=[...root.querySelectorAll(".verse")];
  if(!rows.length)return null;
  if(y<=rect.top)return Number(rows[0].dataset.verse);
  if(y>=rect.bottom)return Number(rows[rows.length-1].dataset.verse);
  return null;
}
function updateVerseSelectionDisplay(){
  for(const row of $("verses").children){
    const active=state.selection.has(Number(row.dataset.verse));
    row.classList.toggle("selected",active);
    row.setAttribute("aria-pressed",String(active));
  }
  updateSelectionBar();syncQuickReference();
}
function dragApply(end){
  const session=verseDrag;if(!session||end==null)return;
  const inRange=verseRangeBetween(session.start,end,session.verses);
  if(!inRange.length)return;
  state.selection=new Set([...session.base,...inRange]);
  state.focusVerse=end;state.anchor=session.start;
  updateVerseSelectionDisplay();
}
function dragAutoScroll(){
  const session=verseDrag;
  if(!session||!session.dragging)return;
  const scroller=$("verses"),bounds=scroller.getBoundingClientRect();
  const before=scroller.scrollTop;
  if(session.y<bounds.top+38)scroller.scrollTop-=17;
  else if(session.y>bounds.bottom-38)scroller.scrollTop+=17;
  const hit=rowAtPointer(session.x,session.y);
  if(hit!==null&&(hit!==session.end||before!==scroller.scrollTop)){
    session.end=hit;dragApply(hit);
  }
  session.frame=requestAnimationFrame(dragAutoScroll);
}
function beginVerseDrag(e){
  if(state.page!=="reader"||e.button!==0||e.pointerType==="touch"||e.isPrimary===false)return;
  if(!e.target.closest(".verse-number"))return;
  const row=e.target.closest(".verse");
  if(!row||!$("verses").contains(row))return;
  // Verse-number dragging is custom; ordinary text dragging remains native.
  if(window.getSelection()?.rangeCount)window.getSelection().removeAllRanges();
  const clicked=Number(row.dataset.verse);
  const base=e.ctrlKey||e.metaKey?new Set(state.selection):new Set();
  const start=e.shiftKey&&state.anchor!=null?state.anchor:clicked;
  verseDrag={id:e.pointerId,start,end:clicked,base,verses:verseData().map(v=>v.n),
    x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragging:false,frame:null};
}
function moveVerseDrag(e){
  const session=verseDrag;
  if(!session||e.pointerId!==session.id)return;
  session.x=e.clientX;session.y=e.clientY;
  const end=rowAtPointer(e.clientX,e.clientY);
  if(!session.dragging){
    if(end===session.end&&Math.hypot(e.clientX-session.startX,e.clientY-session.startY)<7)return;
    session.dragging=true;closeVerseMenu();
    session.frame=requestAnimationFrame(dragAutoScroll);
  }
  if(e.cancelable)e.preventDefault();
  if(end!==null&&end!==session.end){session.end=end;dragApply(end)}
  else if(!session.selectionApplied){session.selectionApplied=true;dragApply(end??session.end)}
}
function finishVerseDrag(e){
  const session=verseDrag;
  if(!session||(e.pointerId!==undefined&&e.pointerId!==session.id))return;
  verseDrag=null;
  if(session.frame!==null)cancelAnimationFrame(session.frame);
  if(session.dragging){
    suppressVerseClick=true;
    // Native click follows pointerup; consume it without affecting later clicks.
    setTimeout(()=>{suppressVerseClick=false},250);
    if(e.cancelable)e.preventDefault();
  }
}
function initDragSelection(){
  const root=$("verses");
  root.addEventListener("pointerdown",e=>{
    if(e.button!==0||e.pointerType==="touch")return;
    if(e.target.closest(".verse-text")){
      contextualTextSelection="";
      if(e.shiftKey||e.ctrlKey||e.metaKey){
        // Prevent browsers extending the native text selection on modifier-click.
        // The click handler below will update our whole-verse selection instead.
        e.preventDefault();
        return;
      }
      // Ordinary text dragging remains native and clears old whole-verse feedback.
      if(state.selection.size){
        state.selection.clear();updateVerseSelectionDisplay();
      }
    }
  });
  root.addEventListener("pointerdown",beginVerseDrag);
  root.addEventListener("click",e=>{
    if(suppressVerseClick){suppressVerseClick=false;e.preventDefault();e.stopImmediatePropagation()}
  },true);
  window.addEventListener("pointermove",moveVerseDrag,{passive:false});
  window.addEventListener("pointerup",finishVerseDrag);
  window.addEventListener("pointercancel",finishVerseDrag);
  window.addEventListener("blur",()=>finishVerseDrag({}));
}
function shouldSelectVerseFromClick(e){
  if(e.target.closest(".verse-bookmark"))return false;
  if(e.target.closest(".verse-number"))return true;
  return Boolean((e.shiftKey||e.ctrlKey||e.metaKey)&&e.target.closest(".verse"));
}
function applyVerseSelection(n,e){
  const verses=verseData().map(v=>v.n);
  const additive=Boolean(e.ctrlKey||e.metaKey);
  if(e.shiftKey&&state.anchor!=null){
    const range=verseRangeBetween(state.anchor,n,verses);
    if(!additive)state.selection.clear();
    for(const number of range)state.selection.add(number);
  }else if(additive){
    if(state.selection.has(n))state.selection.delete(n);
    else state.selection.add(n);
    state.anchor=n;
  }else{
    state.selection.clear();
    state.selection.add(n);
    state.anchor=n;
  }
  state.focusVerse=n;
}
function selectVerse(n,e){
  closeVerseMenu();
  window.getSelection()?.removeAllRanges();
  applyVerseSelection(n,e);
  updateVerseSelectionDisplay();
}
function updateSelectionBar(){
  const count=state.selection.size;
  const coarse=typeof matchMedia==="function"&&matchMedia("(pointer: coarse)").matches;
  show("touchVerseActions",count>0&&coarse);
  $("touchSelectionCount").textContent=count>0?"("+count+")":"";
}

const menuPosition={x:0,y:0};
let suppressVerseClick=false;
let contextualTextSelection="";
function readNativeTextSelection(){
  const selection=window.getSelection?.();
  if(!selection||selection.isCollapsed||!selection.toString().trim())return "";
  const insideVerseText=node=>{
    const el=node?.nodeType===1?node:node?.parentElement;
    const verseText=el?.closest?.(".verse-text");
    return Boolean(verseText&&$("verses").contains(verseText));
  };
  if(!insideVerseText(selection.anchorNode)||!insideVerseText(selection.focusNode))return "";
  return selection.toString();
}
function refreshBookmarkIndicators(){
  for(const row of $("verses").querySelectorAll(".verse")){
    const n=Number(row.dataset.verse);
    const bookmark=row.querySelector(".verse-bookmark");
    if(!bookmark)continue;
    const isSaved=Boolean(state.study.bookmarks[key(n)]);
    bookmark.hidden=!isSaved;
    bookmark.title=tr("removeBookmark");
    bookmark.setAttribute("aria-label",tr("removeBookmark"));
    row.classList.toggle("bookmarked",isSaved);
  }
  syncContextBookmarkLabel();
}
function selectedAreBookmarked(){
  const items=selectedData();
  return items.length>0&&items.every(v=>Boolean(state.study.bookmarks[key(v.n)]));
}
function syncContextBookmarkLabel(){
  const button=$("verseContextMenu").querySelector('[data-action="save"]');
  const unsave=selectedAreBookmarked();
  const label=tr(unsave?"unsave":"save");
  button.querySelector("span").textContent=label;
  button.title=label;
  button.setAttribute("aria-label",label);
}
function toggleVerseBookmark(n){
  const item=verseData().find(v=>v.n===n);
  if(!item)return;
  const id=key(n),wasSaved=Boolean(state.study.bookmarks[id]);
  if(wasSaved)delete state.study.bookmarks[id];
  else state.study.bookmarks[id]={book:state.bookId,ch:state.chapter,n,text:item.text};
  persist();refreshBookmarkIndicators();
  toast(tr(wasSaved?"verseUnsaved":"verseSaved"));
}
function closeVerseMenu(){
  $("verseContextMenu").hidden=true;
  $("verseContextMenu").dataset.menu="actions";
  $("versePalette").hidden=true;
  contextualTextSelection="";
}
function positionVerseMenu(x,y){
  const menu=$("verseContextMenu");
  if(menu.hidden)return;
  menuPosition.x=x;menuPosition.y=y;
  const box=menu.getBoundingClientRect();
  const w=window.innerWidth,h=window.innerHeight;
  menu.style.left=Math.max(8,Math.min(x,w-box.width-9))+"px";
  menu.style.top=Math.max(8,Math.min(y,h-box.height-9))+"px";
}
function openVerseMenu(x,y){
  if(!state.selection.size)return;
  setZoomOpen(false);
  $("versePalette").hidden=true;
  const menu=$("verseContextMenu");
  menu.dataset.menu="actions";menu.hidden=false;
  syncContextBookmarkLabel();
  positionVerseMenu(x,y);
}
function showVersePalette(){
  const menu=$("verseContextMenu");
  if(menu.hidden)return;
  menu.dataset.menu="palette";
  $("versePalette").hidden=false;
  positionVerseMenu(menuPosition.x,menuPosition.y);
  $("paletteBack").focus({preventScroll:true});
}
function selectForContext(n){
  if(!state.selection.has(n)){
    state.selection.clear();
    state.selection.add(n);
    state.anchor=n;
  }
  state.focusVerse=n;
  for(const el of $("verses").children){
    const active=state.selection.has(Number(el.dataset.verse));
    el.classList.toggle("selected",active);
    el.setAttribute("aria-pressed",String(active));
  }
  updateSelectionBar();syncQuickReference();syncContextBookmarkLabel();
}
function installLongPress(row,n){
  let timer=null,startX=0,startY=0;
  const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
  row.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="touch")return;
    cancel();startX=e.clientX;startY=e.clientY;
    timer=setTimeout(()=>{
      timer=null;
      suppressVerseClick=true;
      setTimeout(()=>{suppressVerseClick=false},800);
      selectForContext(n);openVerseMenu(startX,startY);
    },540);
  });
  row.addEventListener("pointermove",e=>{
    if(timer!==null&&Math.hypot(e.clientX-startX,e.clientY-startY)>12)cancel();
  });
  row.addEventListener("pointerup",cancel);
  row.addEventListener("pointercancel",cancel);
  row.addEventListener("pointerleave",cancel);
}
async function shareSelected(contentOverride){
  const items=selectedData();
  const content=contentOverride||selectedText();
  if(!content)return;
  if(typeof navigator.share==="function"){
    try{await navigator.share({title:bookMeta().nameKm,text:content});return}
    catch(err){if(err.name==="AbortError")return}
  }
  await copyText(content);
}
async function handleVerseAction(action){
  if(action==="color"){showVersePalette();return}
  // Snapshot the native text range before clicking the menu collapses it.
  const copied=selectedText();
  closeVerseMenu();
  if(action==="copy")await copyText(copied);
  else if(action==="share")await shareSelected(copied);
  else if(action==="save")bookmarkSelected();
  else if(action==="note")startNote();
  else if(action==="present")startPresentation(selectedData().map(v=>({ref:reference(v),text:v.text})));
}
function selectedData(fallbackAll=false){const list=verseData();return list.filter(v=>state.selection.has(v.n)||(fallbackAll&&!state.selection.size))}
function reference(v){return bookMeta().nameKm+" "+state.chapter+":"+v.n}
// Build a single citation for consecutive and nonconsecutive verses.
function groupVerseNumbers(numbers){
  const sorted=[...new Set(numbers.filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
  if(!sorted.length)return "";
  const groups=[];let start=sorted[0],end=start;
  const flush=()=>groups.push(start===end?String(start):start+"-"+end);
  for(let i=1;i<sorted.length;i++){
    if(sorted[i]===end+1)end=sorted[i];
    else{flush();start=sorted[i];end=start}
  }
  flush();return groups.join(",");
}
function formatVerseSelection(items){
  if(!items.length)return "";
  const verses=[...items].sort((a,b)=>a.n-b.n);
  const header=bookMeta().nameKm+" "+state.chapter+":"+groupVerseNumbers(verses.map(v=>v.n));
  return [header,...verses.map(v=>v.n+" "+v.text)].join("\n");
}
function selectedText(){
  return contextualTextSelection||readNativeTextSelection()||formatVerseSelection(selectedData(true));
}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast(tr("copySuccess"))}catch{const ta=document.createElement("textarea");ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand("copy");ta.remove();toast(tr(ok?"copySuccess":"copyFailed"))}}
function bookmarkSelected(){
  const items=selectedData();
  if(!items.length){toast(tr("noSelected"));return}
  const unsave=selectedAreBookmarked();
  for(const v of items){
    if(unsave)delete state.study.bookmarks[key(v.n)];
    else state.study.bookmarks[key(v.n)]={book:state.bookId,ch:state.chapter,n:v.n,text:v.text};
  }
  persist();refreshBookmarkIndicators();
  toast(unsave?tr("selectedUnsaved",{n:items.length}):tr("selectedSaved",{n:items.length}));
}
function highlightSelected(color){
  const top=$("verses").scrollTop;
  for(const v of selectedData()){
    const k=key(v.n);
    if(color==="remove")delete state.study.highlights[k];
    else state.study.highlights[k]=color;
  }
  persist();renderReader();$("verses").scrollTop=top;toast(tr("highlightSaved"));
}
function startNote(){const selected=selectedData();if(!selected.length){toast(tr("noSelected"));return}const v=selected[0];$("noteReference").textContent=reference(v);$("noteText").value=state.study.notes[key(v.n)]||"";$("noteDialog").dataset.noteKey=key(v.n);show("noteDialog",true);$("noteText").focus();if(selected.length>1)toast(tr("noteFirst"))}
function saveNote(){const k=$("noteDialog").dataset.noteKey,v=$("noteText").value.trim();if(v)state.study.notes[k]=v;else delete state.study.notes[k];persist();show("noteDialog",false);toast(tr("noteSaved"))}
function startPresentation(items){state.presentItems=items;state.presentIndex=0;if(!items.length){toast(tr("noSelected"));return}show("presentation",true);renderPresentation();$("presentation").focus();if($("presentation").requestFullscreen){$("presentation").requestFullscreen().catch(()=>{})}}
function renderPresentation(){const item=state.presentItems[state.presentIndex];if(!item)return;$("presentReference").textContent=item.ref;$("presentText").textContent=item.text;$("presentNumber").textContent=(state.presentIndex+1)+" / "+state.presentItems.length}
function movePresentation(offset){if(!state.presentItems.length)return;state.presentIndex=(state.presentIndex+offset+state.presentItems.length)%state.presentItems.length;renderPresentation()}
function endPresentation(){show("presentation",false);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
function saveFile(content,name,type){const blob=new Blob([content],{type:type||"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2500)}
function renderSaved(){const root=$("bookmarksList");root.replaceChildren();const entries=Object.entries(state.study.bookmarks);if(!entries.length){root.textContent=tr("noSaved");return}for(const [id,v] of entries){const button=document.createElement("button");button.type="button";const title=document.createElement("strong"),text=document.createElement("small");const meta=state.books.find(b=>b.id===v.book);title.textContent=(meta?.nameKm||v.book)+" "+v.ch+":"+v.n;text.textContent=v.text;button.append(title,text);button.onclick=async()=>{await openBook(v.book,v.ch);state.selection=new Set([v.n]);state.anchor=v.n;state.focusVerse=v.n;renderReader()};root.append(button)}}
function initWorker(){if(state.searchWorker)return;try{const worker=new Worker("./search-worker.js");state.searchWorker=worker;worker.onmessage=(e)=>{const d=e.data;if(d.type==="progress"){$("searchStatus").textContent=tr("indexed",{done:d.done});return}if(d.type==="ready"){state.searchReady=true;$("searchStatus").textContent=tr("indexedAll");if($("verseSearch").value.trim())doSearch();return}if(d.type==="results"){renderResults(d);return}if(d.type==="error")$("searchStatus").textContent=tr("searchError",{message:d.message})};worker.onerror=()=>{$("searchStatus").textContent=tr("searchWorkerUnavailable")};worker.postMessage({type:"init",books:state.books})}catch(err){$("searchStatus").textContent=String(err.message||err)}}
function doSearch(){const query=$("verseSearch").value.trim();if(!query){$("searchResults").replaceChildren();return}if(!state.searchReady){$("searchStatus").textContent=tr("indexing");return}state.searchWorker.postMessage({type:"search",query})}
function renderResults(d){$("searchStatus").textContent=tr("searchMatches",{n:d.total,detail:tr(d.total>80?"first80":"allDisplayed")});const root=$("searchResults");root.replaceChildren();for(const hit of d.items){const row=document.createElement("button");row.type="button";const title=document.createElement("strong"),excerpt=document.createElement("small");title.textContent=hit.name+" "+hit.chapter+":"+hit.verse;excerpt.textContent=hit.text;row.append(title,excerpt);row.onclick=async()=>{await openBook(hit.id,hit.chapter);state.selection=new Set([hit.verse]);state.anchor=hit.verse;state.focusVerse=hit.verse;renderReader()};root.append(row)}}
function resolveRef(input){const cleaned=normalize(input).replace(/[៖]/g,":").replace(/[–—]/g,"-").replace(/\s+/g," ");const m=cleaned.match(/^(.+?)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*$/);if(!m)throw Error(tr("invalidRef"));const name=m[1].trim();const matches=state.books.filter(b=>normalize(b.nameKm)===name||normalize(enFor(b))===name||b.id.toLowerCase()===name);if(matches.length!==1)throw Error(tr("unknownBook"));const chapter=Number(m[2]),start=Number(m[3]),end=m[4]?Number(m[4]):start;if(chapter<1||chapter>matches[0].chapterCount||start<1||end<start||end-start>150)throw Error(tr("invalidRange"));return {id:matches[0].id,chapter,start,end,name:matches[0].nameKm}}
async function generateSlides(){try{const ref=resolveRef($("generatorInput").value);const data=await loadBook(ref.id);const verses=data.chapters[String(ref.chapter)]?.verses||{};const slides=[];for(let n=ref.start;n<=ref.end;n++){if(typeof verses[String(n)]!=="string")throw Error(tr("verseMissing",{n}));slides.push({ref:ref.name+" "+ref.chapter+":"+n,text:verses[String(n)]})}state.slides=slides;state.slide=0;renderSlides();toast(tr("slideCount",{n:slides.length}))}catch(err){$("generatorOutput").textContent=String(err.message||err)}}
function renderSlides(){const root=$("generatorOutput");root.replaceChildren();if(!state.slides.length)return;const item=state.slides[state.slide],slide=document.createElement("div");slide.style.cssText="background:#152842;color:white;min-height:270px;padding:32px;border-radius:16px;margin:15px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center";const ref=document.createElement("strong");ref.style.cssText="font-size:18px;color:#c5dcfa";ref.textContent=item.ref;const text=document.createElement("div");text.style.cssText="font-family:'Khmer Battambang',sans-serif;font-size:28px;line-height:1.9";text.textContent=item.text;slide.append(ref,text);const nav=document.createElement("div");nav.className="inline";const prev=document.createElement("button");prev.textContent=tr("previous");const middle=document.createElement("span");middle.textContent=tr("slideProgress",{n:state.slide+1,total:state.slides.length});const next=document.createElement("button");next.textContent=tr("next");prev.onclick=()=>{state.slide=(state.slide+state.slides.length-1)%state.slides.length;renderSlides()};next.onclick=()=>{state.slide=(state.slide+1)%state.slides.length;renderSlides()};const present=document.createElement("button");present.textContent=tr("present");present.className="primary";present.onclick=()=>startPresentation(state.slides);nav.append(prev,middle,next,present);root.append(slide,nav)}
function initializeEvents(){
initDragSelection();
$("accountButton").onclick=()=>setPage("account");$("backButton").onclick=()=>setPage("reader");$("searchButton").onclick=()=>setPage("search");
$("bookSearch").oninput=()=>setupSidebar();$("oldTab").onclick=()=>changeTestament("old");$("newTab").onclick=()=>changeTestament("new");
$("booksList").addEventListener("scroll",updateVisibleTestament,{passive:true});
$("languageToggle").onclick=()=>setLanguage(state.prefs.lang==="kh"?"en":"kh");
$("prevChapter").onclick=()=>goToChapter(state.chapter-1);
$("nextChapter").onclick=()=>goToChapter(state.chapter+1);
$("chapterSelect").onchange=()=>goToChapter(Number($("chapterSelect").value));

for(const id of ["quickChapter","quickVerse"]){
  $(id).addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();goToQuickReference()}});
}
$("touchVerseActions").onclick=()=>{
  const bounds=$("touchVerseActions").getBoundingClientRect();
  openVerseMenu(bounds.left,bounds.top-280);
};
$("verseContextMenu").addEventListener("click",e=>{
  const action=e.target.closest("[data-action]");
  if(action){handleVerseAction(action.dataset.action);return}
  const color=e.target.closest("[data-color]");
  if(color){
    const shade=color.dataset.color;
    closeVerseMenu();highlightSelected(shade);
  }
});
$("paletteBack").onclick=()=>{
  $("versePalette").hidden=true;
  $("verseContextMenu").dataset.menu="actions";
  positionVerseMenu(menuPosition.x,menuPosition.y);
};
document.addEventListener("pointerdown",e=>{
  if(!$("verseContextMenu").hidden&&!e.target.closest("#verseContextMenu, #touchVerseActions"))closeVerseMenu();
});
window.addEventListener("resize",closeVerseMenu);
$("verses").addEventListener("scroll",closeVerseMenu,{passive:true});
$("presentPrev").onclick=()=>movePresentation(-1);$("presentNext").onclick=()=>movePresentation(1);$("presentExit").onclick=endPresentation;
$("noteCancel").onclick=()=>show("noteDialog",false);$("noteSave").onclick=saveNote;
$("themeButton").onclick=toggleDarkMode;
$("settingTheme").onclick=()=>setPage("appearance");
document.querySelectorAll("[data-theme-choice]").forEach(button=>button.onclick=()=>chooseAppearance(button.dataset.themeChoice));
document.querySelectorAll("[data-glass-choice]").forEach(button=>button.onclick=()=>chooseGlass(button.dataset.glassChoice));
$("fontButton").onclick=()=>setZoomOpen($("zoomPopover").hidden);
$("zoomSlider").oninput=e=>setFontSize(e.target.value);
$("zoomMinus").onclick=()=>setFontSize(state.prefs.fontSize-1);
$("zoomPlus").onclick=()=>setFontSize(state.prefs.fontSize+1);
document.addEventListener("pointerdown",e=>{if(!$("zoomPopover").hidden&&!e.target.closest(".zoom-anchor"))setZoomOpen(false)});
$("fontButton").addEventListener("keydown",e=>{if(e.key==="ArrowDown"){e.preventDefault();setZoomOpen(true)}});
$("settingFont").oninput=e=>setFontSize(e.target.value);
document.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>setPage(el.dataset.open));
$("googleLogin").onclick=()=>toast(tr("googlePlanned"));
$("openPowerSlide").onclick=()=>toast(tr("powerPlanned"));
$("verseSearch").oninput=doSearch;
$("generateSlides").onclick=generateSlides;
$("backupButton").onclick=()=>saveFile(JSON.stringify({version:1,createdAt:new Date().toISOString(),study:state.study,prefs:state.prefs},null,2),"bibleapp-backup.json","application/json");
$("exportTxt").onclick=()=>saveFile(verseData().map(v=>reference(v)+" — "+v.text).join("\n"),state.bookId+"-"+state.chapter+".txt");
$("exportJson").onclick=()=>saveFile(JSON.stringify({book:state.bookId,chapter:state.chapter,verses:verseData()},null,2),state.bookId+"-"+state.chapter+".json","application/json");
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("verseContextMenu").hidden){closeVerseMenu();e.preventDefault();return}
  if(e.key==="Escape"&&!$("zoomPopover").hidden){setZoomOpen(false);$("fontButton").focus();e.preventDefault();return}
  if(!$("presentation").hidden){
    if(e.key==="Escape"){endPresentation();e.preventDefault()}
    else if(e.key==="ArrowRight"||e.key==="ArrowDown"){movePresentation(1);e.preventDefault()}
    else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){movePresentation(-1);e.preventDefault()}
  }else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){e.preventDefault();setPage("search")}
})}
async function start(){updateTheme();listenSystemAppearance();initSidebarResizer();initializeEvents();setLanguage(state.prefs.lang,false);try{const res=await fetch("./data/manifest.json");if(!res.ok)throw Error("Bible manifest unavailable");const manifest=await res.json();if(!Array.isArray(manifest.books)||manifest.books.length!==66)throw Error("Expected 66 Bible books");state.manifest=manifest;state.books=manifest.books;const last=getStored("bibleapp.lastplace",{id:"JHN",ch:1});await openBook(state.books.some(b=>b.id===last.id)?last.id:"JHN",last.ch||1);setPage("reader");if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});}catch(err){$("verses").textContent=tr("dataLoadError",{message:String(err.message||err)});toast(tr("dataUnavailable"))}}
start();
})();