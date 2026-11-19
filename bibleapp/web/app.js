/* Bible App v0.1 — offline Khmer Bible foundation. No online services required. */
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const BOOK_EN = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
const pageTitles = {reader:"Bible Reader",account:"Account",tools:"Tools",search:"Bible Search",generator:"បង្កើតស្លាយ",settings:"Settings",bookmarks:"Bookmarks",export:"Export Center"};
const tr=(k,vars={})=>{
  const table=window.BIBLE_LOCALES?.[state.prefs.lang==="en"?"en":"kh"]||{};
  const template=table[k]||window.BIBLE_LOCALES?.en?.[k]||k;
  return template.replace(/\{([a-z]+)\}/gi,(_,name)=>String(vars[name]??""));
};
const STORE="bibleapp.study.v1",PREFS="bibleapp.prefs.v1";
const getStored=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))||def}catch{return def}};
const state={manifest:null,books:[],book:null,bookId:"JHN",chapter:1,testament:"new",page:"reader",selection:new Set(),anchor:null,study:getStored(STORE,{bookmarks:{},highlights:{},notes:{}}),prefs:{dark:false,fontSize:23,lang:"kh",sidebarWidth:266,...getStored(PREFS,{})},lastByTestament:{old:null,new:null},slides:[],slide:0,presentItems:[],presentIndex:0,searchWorker:null,searchReady:false};
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
function updateTheme(){document.body.classList.toggle("dark",!!state.prefs.dark);document.documentElement.style.setProperty("--verse-size",state.prefs.fontSize+"px");$("themeButton").textContent=state.prefs.dark?"☀":"☾";$("settingFont").value=state.prefs.fontSize}
function setLanguage(lang,save=true){
  state.prefs.lang=lang==="en"?"en":"kh";
  document.documentElement.lang=state.prefs.lang==="en"?"en":"km";
  for(const el of document.querySelectorAll("[data-i18n]"))el.textContent=tr(el.dataset.i18n);
  for(const el of document.querySelectorAll("[data-i18n-placeholder]"))el.placeholder=tr(el.dataset.i18nPlaceholder);
  for(const el of document.querySelectorAll("[data-i18n-title]"))el.title=tr(el.dataset.i18nTitle);
  for(const el of document.querySelectorAll("[data-i18n-aria]"))el.setAttribute("aria-label",tr(el.dataset.i18nAria));
  for(const code of ["en","kh"]){
    const selected=code===state.prefs.lang,button=$(code==="en"?"langEN":"langKH");
    button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected));
  }
  $("sidebarResize").setAttribute("aria-label",tr("resizeSidebar"));
  $("sidebarResize").title=tr("resizeSidebar");
  $("pageTitle").textContent=tr(state.page);
  updateSelectionBar();
  if(state.books.length)setupSidebar();
  if(state.book&&state.page==="reader")renderReader();
  if(state.page==="bookmarks")renderSaved();
  if(state.page==="generator"&&state.slides.length)renderSlides();
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
function setPage(p){if(!(p in pageTitles))return;state.page=p;Object.keys(pageTitles).forEach(k=>show(k+"Page",p===k));$("pageTitle").textContent=tr(p);if(p==="bookmarks")renderSaved();if(p==="search"){initWorker();$("verseSearch").focus()}if(p==="generator"&&!$("generatorInput").value)$("generatorInput").value="យ៉ូហាន 3:16-18";if(p==="reader")renderReader()}
function setupSidebar(){const q=normalize($("bookSearch").value);const isOld=state.testament==="old";$("oldTab").classList.toggle("active",isOld);$("newTab").classList.toggle("active",!isOld);
const books=state.books.filter(b=>(isOld?b.order<=39:b.order>39)&&(normalize(b.nameKm+" "+enFor(b)+" "+b.id).includes(q)));
const root=$("booksList");root.replaceChildren();
// Fixed Testament buttons serve as the section heading.
for(const b of books){const item=document.createElement("button");item.type="button";item.className="book-item"+(state.bookId===b.id?" active":"");item.innerHTML="<strong></strong>";item.querySelector("strong").textContent=b.nameKm;item.onclick=()=>openBook(b.id,1);root.append(item)}
if(!books.length){const none=document.createElement("p");none.className="hint";none.textContent=tr("notFoundBooks");root.append(none)}}
async function loadBook(id){const book=state.books.find(b=>b.id===id);if(!book)throw Error("Unknown Bible book: "+id);const response=await fetch("./data/books/"+encodeURIComponent(id)+".json");if(!response.ok)throw Error("Unable to read "+id+".json");const payload=await response.json();if(!payload.chapters||payload.id!==id)throw Error("Invalid Bible data for "+id);return payload}
let bookRequestId=0;
async function openBook(id,ch){
  const request=++bookRequestId;
  try{
    const b=await loadBook(id);
    if(request!==bookRequestId)return;
    const meta=state.books.find(x=>x.id===id);
    if(!meta)throw Error("Unknown Bible book");
    state.book=b;state.bookId=id;
    state.chapter=Math.min(Math.max(1,Number(ch)||1),Number(b.chapterCount)||1);
    state.testament=meta.testament==="OT"?"old":"new";
    state.lastByTestament[state.testament]={id,ch:state.chapter};
    state.selection.clear();state.anchor=null;
    setPage("reader");setupSidebar();saveReadingPlace();
  }catch(err){if(request===bookRequestId)toast(String(err.message||err))}
}
function changeTestament(testament){
  if(!state.books.length)return;
  const meta=bookMeta();
  if(meta&&(meta.testament==="OT"?"old":"new")===testament){setPage("reader");setupSidebar();return}
  const last=state.lastByTestament[testament];
  const first=state.books.find(b=>testament==="old"?b.testament==="OT":b.testament==="NT");
  if(first)openBook(last?.id||first.id,last?.ch||1);
}
const saveReadingPlace=()=>{state.lastByTestament[state.testament]={id:state.bookId,ch:state.chapter};try{localStorage.setItem("bibleapp.lastplace",JSON.stringify({id:state.bookId,ch:state.chapter}))}catch{}};
const bookMeta=()=>state.books.find(b=>b.id===state.bookId);
function verseData(){const verses=state.book?.chapters?.[String(state.chapter)]?.verses||{};return Object.entries(verses).map(([n,text])=>({n:Number(n),text:String(text)})).sort((a,b)=>a.n-b.n)}
function renderReader(){if(!state.book)return;const b=bookMeta();$("chapterHeading").textContent=b.nameKm+" "+kmNumber(state.chapter);$("chapterMeta").textContent=tr("chapterOf",{current:state.chapter,total:b.chapterCount});const select=$("chapterSelect");select.replaceChildren();for(let n=1;n<=b.chapterCount;n++){const option=document.createElement("option");option.value=n;option.textContent=tr("chapter")+" "+n;select.append(option)}select.value=state.chapter;
const root=$("verses");root.replaceChildren();for(const v of verseData()){const row=document.createElement("div");row.className="verse"+(state.selection.has(v.n)?" selected":"");row.tabIndex=0;row.dataset.verse=v.n;row.dataset.highlight=state.study.highlights[key(v.n)]||"";row.setAttribute("role","button");row.setAttribute("aria-pressed",String(state.selection.has(v.n)));const number=document.createElement("span");number.className="verse-number";number.textContent=kmNumber(v.n);const text=document.createElement("span");text.className="verse-text";text.textContent=v.text;row.append(number,text);row.onclick=(e)=>selectVerse(v.n,e);row.onkeydown=(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectVerse(v.n,e)}};root.append(row)}updateSelectionBar()}
function selectVerse(n,e){const list=verseData().map(v=>v.n);if(e.shiftKey&&state.anchor!=null){const a=list.indexOf(state.anchor),b=list.indexOf(n);if(a>=0&&b>=0){if(!(e.ctrlKey||e.metaKey))state.selection.clear();for(let i=Math.min(a,b);i<=Math.max(a,b);i++)state.selection.add(list[i])}}else if(e.ctrlKey||e.metaKey){if(state.selection.has(n))state.selection.delete(n);else state.selection.add(n);state.anchor=n}else{state.selection.clear();state.selection.add(n);state.anchor=n}for(const el of $("verses").children){const active=state.selection.has(Number(el.dataset.verse));el.classList.toggle("selected",active);el.setAttribute("aria-pressed",String(active))}updateSelectionBar()}
function updateSelectionBar(){const count=state.selection.size;show("verseActions",count>0);$("selectionCount").textContent=tr("selectedCount",{n:count})}
function selectedData(fallbackAll=false){const list=verseData();return list.filter(v=>state.selection.has(v.n)||(fallbackAll&&!state.selection.size))}
function reference(v){return bookMeta().nameKm+" "+state.chapter+":"+v.n}
function selectedText(){return selectedData(true).map(v=>reference(v)+" — "+v.text).join("\n")}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast(tr("copySuccess"))}catch{const ta=document.createElement("textarea");ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand("copy");ta.remove();toast(tr(ok?"copySuccess":"copyFailed"))}}
function bookmarkSelected(){for(const v of selectedData())state.study.bookmarks[key(v.n)]={book:state.bookId,ch:state.chapter,n:v.n,text:v.text};persist();toast(tr("selectedSaved",{n:state.selection.size}))}
function highlightSelected(color){for(const v of selectedData()){const k=key(v.n);if(color==="remove")delete state.study.highlights[k];else state.study.highlights[k]=color}persist();renderReader();toast(tr("highlightSaved"))}
function startNote(){const selected=selectedData();if(!selected.length){toast(tr("noSelected"));return}const v=selected[0];$("noteReference").textContent=reference(v);$("noteText").value=state.study.notes[key(v.n)]||"";$("noteDialog").dataset.noteKey=key(v.n);show("noteDialog",true);$("noteText").focus();if(selected.length>1)toast(tr("noteFirst"))}
function saveNote(){const k=$("noteDialog").dataset.noteKey,v=$("noteText").value.trim();if(v)state.study.notes[k]=v;else delete state.study.notes[k];persist();show("noteDialog",false);toast(tr("noteSaved"))}
function startPresentation(items){state.presentItems=items;state.presentIndex=0;if(!items.length){toast(tr("noSelected"));return}show("presentation",true);renderPresentation();$("presentation").focus();if($("presentation").requestFullscreen){$("presentation").requestFullscreen().catch(()=>{})}}
function renderPresentation(){const item=state.presentItems[state.presentIndex];if(!item)return;$("presentReference").textContent=item.ref;$("presentText").textContent=item.text;$("presentNumber").textContent=(state.presentIndex+1)+" / "+state.presentItems.length}
function movePresentation(offset){if(!state.presentItems.length)return;state.presentIndex=(state.presentIndex+offset+state.presentItems.length)%state.presentItems.length;renderPresentation()}
function endPresentation(){show("presentation",false);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
function saveFile(content,name,type){const blob=new Blob([content],{type:type||"text/plain;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2500)}
function renderSaved(){const root=$("bookmarksList");root.replaceChildren();const entries=Object.entries(state.study.bookmarks);if(!entries.length){root.textContent=tr("noSaved");return}for(const [id,v] of entries){const button=document.createElement("button");button.type="button";const title=document.createElement("strong"),text=document.createElement("small");const meta=state.books.find(b=>b.id===v.book);title.textContent=(meta?.nameKm||v.book)+" "+v.ch+":"+v.n;text.textContent=v.text;button.append(title,text);button.onclick=async()=>{await openBook(v.book,v.ch);state.selection=new Set([v.n]);state.anchor=v.n;renderReader()};root.append(button)}}
function initWorker(){if(state.searchWorker)return;try{const worker=new Worker("./search-worker.js");state.searchWorker=worker;worker.onmessage=(e)=>{const d=e.data;if(d.type==="progress"){$("searchStatus").textContent=tr("indexed",{done:d.done});return}if(d.type==="ready"){state.searchReady=true;$("searchStatus").textContent=tr("indexedAll");if($("verseSearch").value.trim())doSearch();return}if(d.type==="results"){renderResults(d);return}if(d.type==="error")$("searchStatus").textContent=tr("searchError",{message:d.message})};worker.onerror=()=>{$("searchStatus").textContent=tr("searchWorkerUnavailable")};worker.postMessage({type:"init",books:state.books})}catch(err){$("searchStatus").textContent=String(err.message||err)}}
function doSearch(){const query=$("verseSearch").value.trim();if(!query){$("searchResults").replaceChildren();return}if(!state.searchReady){$("searchStatus").textContent=tr("indexing");return}state.searchWorker.postMessage({type:"search",query})}
function renderResults(d){$("searchStatus").textContent=tr("searchMatches",{n:d.total,detail:tr(d.total>80?"first80":"allDisplayed")});const root=$("searchResults");root.replaceChildren();for(const hit of d.items){const row=document.createElement("button");row.type="button";const title=document.createElement("strong"),excerpt=document.createElement("small");title.textContent=hit.name+" "+hit.chapter+":"+hit.verse;excerpt.textContent=hit.text;row.append(title,excerpt);row.onclick=async()=>{await openBook(hit.id,hit.chapter);state.selection=new Set([hit.verse]);state.anchor=hit.verse;renderReader()};root.append(row)}}
function resolveRef(input){const cleaned=normalize(input).replace(/[៖]/g,":").replace(/[–—]/g,"-").replace(/\s+/g," ");const m=cleaned.match(/^(.+?)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*$/);if(!m)throw Error(tr("invalidRef"));const name=m[1].trim();const matches=state.books.filter(b=>normalize(b.nameKm)===name||normalize(enFor(b))===name||b.id.toLowerCase()===name);if(matches.length!==1)throw Error(tr("unknownBook"));const chapter=Number(m[2]),start=Number(m[3]),end=m[4]?Number(m[4]):start;if(chapter<1||chapter>matches[0].chapterCount||start<1||end<start||end-start>150)throw Error(tr("invalidRange"));return {id:matches[0].id,chapter,start,end,name:matches[0].nameKm}}
async function generateSlides(){try{const ref=resolveRef($("generatorInput").value);const data=await loadBook(ref.id);const verses=data.chapters[String(ref.chapter)]?.verses||{};const slides=[];for(let n=ref.start;n<=ref.end;n++){if(typeof verses[String(n)]!=="string")throw Error(tr("verseMissing",{n}));slides.push({ref:ref.name+" "+ref.chapter+":"+n,text:verses[String(n)]})}state.slides=slides;state.slide=0;renderSlides();toast(tr("slideCount",{n:slides.length}))}catch(err){$("generatorOutput").textContent=String(err.message||err)}}
function renderSlides(){const root=$("generatorOutput");root.replaceChildren();if(!state.slides.length)return;const item=state.slides[state.slide],slide=document.createElement("div");slide.style.cssText="background:#152842;color:white;min-height:270px;padding:32px;border-radius:16px;margin:15px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center";const ref=document.createElement("strong");ref.style.cssText="font-size:18px;color:#c5dcfa";ref.textContent=item.ref;const text=document.createElement("div");text.style.cssText="font-family:'Khmer Battambang',sans-serif;font-size:28px;line-height:1.9";text.textContent=item.text;slide.append(ref,text);const nav=document.createElement("div");nav.className="inline";const prev=document.createElement("button");prev.textContent=tr("previous");const middle=document.createElement("span");middle.textContent=tr("slideProgress",{n:state.slide+1,total:state.slides.length});const next=document.createElement("button");next.textContent=tr("next");prev.onclick=()=>{state.slide=(state.slide+state.slides.length-1)%state.slides.length;renderSlides()};next.onclick=()=>{state.slide=(state.slide+1)%state.slides.length;renderSlides()};const present=document.createElement("button");present.textContent=tr("present");present.className="primary";present.onclick=()=>startPresentation(state.slides);nav.append(prev,middle,next,present);root.append(slide,nav)}
function initializeEvents(){
$("accountButton").onclick=()=>setPage("account");$("sidebarTools").onclick=()=>setPage("tools");$("backButton").onclick=()=>setPage("reader");$("searchButton").onclick=()=>setPage("search");
$("bookSearch").oninput=setupSidebar;$("oldTab").onclick=()=>changeTestament("old");$("newTab").onclick=()=>changeTestament("new");
$("langEN").onclick=()=>setLanguage("en");$("langKH").onclick=()=>setLanguage("kh");
$("prevChapter").onclick=()=>changeChapter(-1);$("nextChapter").onclick=()=>changeChapter(1);$("chapterSelect").onchange=()=>changeChapter(0,Number($("chapterSelect").value));
function changeChapter(delta,absolute){const n=absolute||state.chapter+delta;if(n<1||n>Number(state.book?.chapterCount))return;state.chapter=n;state.selection.clear();state.anchor=null;renderReader();saveReadingPlace()}
$("copySelected").onclick=()=>copyText(selectedText());$("bookmarkSelected").onclick=bookmarkSelected;$("noteSelected").onclick=startNote;
document.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>highlightSelected(b.dataset.color));
$("presentSelected").onclick=()=>startPresentation(selectedData().map(v=>({ref:reference(v),text:v.text})));
$("presentPrev").onclick=()=>movePresentation(-1);$("presentNext").onclick=()=>movePresentation(1);$("presentExit").onclick=endPresentation;
$("noteCancel").onclick=()=>show("noteDialog",false);$("noteSave").onclick=saveNote;
$("themeButton").onclick=$("settingTheme").onclick=()=>{state.prefs.dark=!state.prefs.dark;persistPrefs();updateTheme()};
$("fontButton").onclick=()=>{state.prefs.fontSize=state.prefs.fontSize>=32?20:state.prefs.fontSize+2;persistPrefs();updateTheme()};
$("settingFont").oninput=(e)=>{state.prefs.fontSize=Number(e.target.value);persistPrefs();updateTheme()};
document.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>setPage(el.dataset.open));
$("googleLogin").onclick=()=>toast(tr("googlePlanned"));
$("openPowerSlide").onclick=()=>toast(tr("powerPlanned"));
$("verseSearch").oninput=doSearch;
$("generateSlides").onclick=generateSlides;
$("backupButton").onclick=()=>saveFile(JSON.stringify({version:1,createdAt:new Date().toISOString(),study:state.study,prefs:state.prefs},null,2),"bibleapp-backup.json","application/json");
$("exportTxt").onclick=()=>saveFile(verseData().map(v=>reference(v)+" — "+v.text).join("\n"),state.bookId+"-"+state.chapter+".txt");
$("exportJson").onclick=()=>saveFile(JSON.stringify({book:state.bookId,chapter:state.chapter,verses:verseData()},null,2),state.bookId+"-"+state.chapter+".json","application/json");
document.addEventListener("keydown",e=>{if(!$("presentation").hidden){if(e.key==="Escape"){endPresentation();e.preventDefault()}else if(e.key==="ArrowRight"||e.key==="ArrowDown"){movePresentation(1);e.preventDefault()}else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){movePresentation(-1);e.preventDefault()}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){e.preventDefault();setPage("search")}})}
async function start(){updateTheme();initSidebarResizer();initializeEvents();setLanguage(state.prefs.lang,false);try{const res=await fetch("./data/manifest.json");if(!res.ok)throw Error("Bible manifest unavailable");const manifest=await res.json();if(!Array.isArray(manifest.books)||manifest.books.length!==66)throw Error("Expected 66 Bible books");state.manifest=manifest;state.books=manifest.books;const last=getStored("bibleapp.lastplace",{id:"JHN",ch:1});await openBook(state.books.some(b=>b.id===last.id)?last.id:"JHN",last.ch||1);setPage("reader");if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{});}catch(err){$("verses").textContent=tr("dataLoadError",{message:String(err.message||err)});toast(tr("dataUnavailable"))}}
start();
})();