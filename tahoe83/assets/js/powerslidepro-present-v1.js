/* Tahoe83: one authoritative editor, independent presenter and audience windows. */
(()=>{
"use strict";
const $=s=>document.querySelector(s), origin=location.origin;
let showing=false, detachable=false, audience=null, presenter=null, detached=false, detaching=false, latest=null, loadingTimeout=null, screenDetails=null, placedScreen=null;
const desktop=window.PowerSlideDesktop;
const prefKey='pspro-audience-display-v1';
const webPref=()=>{try{return localStorage.getItem(prefKey)||'auto'}catch{return 'auto'}};
const screenKey=s=>String(s.label||'Display')+'|'+(s.isPrimary?'primary':'extended')+'|'+s.left+','+s.top;
function saveWebPref(v){try{localStorage.setItem(prefKey,v)}catch{}}
const frame=()=>$("#deckCraftFrame")?.contentWindow;
const deliver=m=>frame()?.postMessage(m,origin);
const visible=()=>!!(audience&&!audience.closed);
const presenterVisible=()=>!!(presenter&&!presenter.closed);
const toPresenter=m=>{if(presenterVisible())presenter.postMessage(m,origin);};
const toAudience=m=>{if(visible())audience.postMessage(m,origin);};
const stateMessage=()=>({type:'pspro-audience-state',index:latest?.index||'0',blank:latest?.blank||''});
function launcher(){
 let btn=$("#pspro-audience-launch");
 if(btn)return btn;
 const style=document.createElement("style");
 style.textContent=[
  "#pspro-audience-launch{display:none;position:absolute;top:48px;right:14px;z-index:21474830;",
  "border:1px solid #e18c60;border-radius:9px;background:#ed7741;color:#fff;font:600 12px system-ui;",
  "padding:8px 12px;box-shadow:0 5px 20px #0003;cursor:pointer}",
  "#pspro-audience-launch:focus-visible{outline:3px solid #0c92ff}",
  "#pspro-audience-hint{display:none;position:absolute;z-index:21474831;top:88px;right:14px;",
  "background:#202226;border:1px solid #515862;color:#fff;padding:10px 12px;border-radius:9px;",
  "font:12px/1.5 system-ui;max-width:310px;box-shadow:0 5px 26px #0005}",
  "#pspro-audience-hint a{color:#ffb88f;text-decoration:underline}",
  "#pspro-display-settings{display:none;position:absolute;top:48px;right:195px;z-index:21474830;border:1px solid #515862;border-radius:8px;background:#343943;color:white;padding:8px 10px;font:600 12px system-ui;cursor:pointer}",
  "#pspro-audience-hint select{max-width:100%;margin:6px 0;background:#343943;color:white;padding:6px;border-radius:5px}",
  "#pspro-presenter-launch{display:none;position:absolute;top:48px;right:281px;z-index:21474830;border:1px solid #515862;border-radius:8px;background:#343943;color:white;padding:8px 10px;font:600 12px system-ui;cursor:pointer}"
 ].join("");
 document.head.append(style);
 btn=document.createElement("button");
 btn.id="pspro-audience-launch";
 btn.type="button";
 btn.textContent="▣ Open Audience Screen";
 btn.title="Open slide show on another monitor. Keep Presenter View in this window.";
 const mount=$("#deckCraftWindow");
 if(mount)mount.appendChild(btn);else document.body.appendChild(btn);
 btn.addEventListener("click",()=>openAudience(false));
 const hint=document.createElement("div");hint.id="pspro-audience-hint";
 const mountHint=$("#deckCraftWindow")||document.body;
 mountHint.append(hint);
 const settings=document.createElement('button');settings.id='pspro-display-settings';settings.type='button';settings.textContent='Display ⚙';settings.title='Presentation display preferences';settings.onclick=displaySettings;mountHint.append(settings);
 const p=document.createElement('button');p.id='pspro-presenter-launch';p.type='button';p.textContent='Presenter View';p.onclick=()=>openPresenter(false);mountHint.append(p);
 return btn;
}
function refreshButton(){
 const btn=launcher();
 btn.style.display=showing?"block":"none";
 const settings=$("#pspro-display-settings");if(settings)settings.style.display=showing?"block":"none";
 btn.textContent=visible()?"▣ Audience Screen Open":"▣ Open Audience Screen";
 const p=$("#pspro-presenter-launch");if(p){p.style.display=showing&&detachable?"block":"none";p.textContent=presenterVisible()?"Presenter Open":"Open Presenter";}
}
function explain(message,offerLink=false){
 launcher();
 const hint=$("#pspro-audience-hint");if(!hint)return;
 hint.innerHTML="";
 hint.append(document.createTextNode(message));
 if(offerLink){
  hint.append(document.createElement("br"));
  const anchor=document.createElement("a");
  anchor.href=new URL("assets/powerslidepro-audience.html?v=83fullscreen19",location.href).href;
  anchor.target="_blank";anchor.rel="opener";
  anchor.textContent="Open audience in a new tab";
  hint.append(anchor);
 }
 hint.style.display="block";
}
function clearHint(){const h=$("#pspro-audience-hint");if(h)h.style.display="none";}
function sendState(){if(latest)toAudience(stateMessage());}
function closeShow(){
 toAudience({type:'pspro-audience-end'});toPresenter({type:'pspro-audience-end'});
 audience=null;presenter=null;detached=false;detaching=false;latest=null;
 if(loadingTimeout)clearTimeout(loadingTimeout);clearHint();
}
function openPresenter(automatic=false){
 if(!showing||!detachable)return;
 if(presenterVisible()){if(!automatic)presenter.focus();return;}
 const url=new URL('assets/powerslidepro-presenter.html?v=83fullscreen19',location.href);
 try{presenter=window.open(url.href,'powerslidepro-presenter','popup,width=1240,height=820,resizable=yes,scrollbars=yes');}catch{presenter=null;}
 refreshButton();
 if(!presenter){explain('Presenter window was blocked. Use Open Presenter after allowing popups.');return;}
 if(!automatic)presenter.focus();
 if(!desktop?.displayOptions)void getWebScreens(false).then(info=>{if(!info||!presenterVisible())return;const p=info.screens.find(s=>s.isPrimary)||info.currentScreen;if(p){try{presenter.moveTo(p.availLeft??p.left,p.availTop??p.top);}catch{}}});
}
async function getWebScreens(request=false){
 if(typeof window.getScreenDetails!=='function')return null;
 if(screenDetails)return screenDetails;
 try{
  if(!request){const p=await navigator.permissions.query({name:'window-management'});if(p.state!=='granted')return null;}
  screenDetails=await window.getScreenDetails();
  screenDetails.addEventListener('screenschange',()=>{
   if(placedScreen&&!screenDetails.screens.some(s=>screenKey(s)===placedScreen))placeOnExternalScreen(audience,true);
  });
  return screenDetails;
 }catch{return null;}
}
async function placeOnExternalScreen(w,recover=false){
 if(desktop?.displayOptions||!w||w.closed)return;
 const info=await getWebScreens(false);if(!info||w.closed)return;
 const list=info.screens||[],primary=list.find(s=>s.isPrimary)||info.currentScreen;
 const chosen=recover?primary:list.find(s=>screenKey(s)===webPref())||list.find(s=>!s.isPrimary)||primary;
 if(!chosen)return;
 try{
  const width=chosen.availWidth??chosen.width,height=chosen.availHeight??chosen.height;
  w.moveTo((chosen.availLeft??chosen.left)+Math.round(((chosen.availWidth??chosen.width)-width)/2),(chosen.availTop??chosen.top)+Math.round(((chosen.availHeight??chosen.height)-height)/2));
  w.resizeTo(width,height);placedScreen=screenKey(chosen);
 }catch{}
}
async function displaySettings(){
 launcher();const hint=$("#pspro-audience-hint");hint.replaceChildren();hint.style.display='block';
 const title=document.createElement('strong');title.textContent='Presentation · Audience Display';hint.append(title,document.createElement('br'));
 let options,selected;
 if(desktop?.displayOptions){try{const prefs=await desktop.displayOptions();options=prefs?.displays;selected=prefs?.selected}catch{}}
 else{const info=await getWebScreens(true);options=info?.screens.map(s=>({id:screenKey(s),label:s.label||'Display',primary:s.isPrimary}));selected=webPref();}
 if(!options){hint.append('Automatic placement is unavailable. You can move the audience window manually.');return;}
 const select=document.createElement('select');select.setAttribute('aria-label','Audience display');
 select.add(new Option('Automatic — extended display','auto'));
 for(const d of options)select.add(new Option(d.label+(d.primary?' (Primary)':' (Extended)'),d.id));
 select.value=options.some(d=>d.id===selected)?selected:'auto';
 select.onchange=async()=>{if(desktop?.selectDisplay){if(!await desktop.selectDisplay(select.value))return;}else{saveWebPref(select.value);await placeOnExternalScreen(audience);}clearHint();};
 hint.append(select,document.createElement('br'));
 const close=document.createElement('button');close.type='button';close.textContent='Done';close.onclick=()=>{clearHint();if(!desktop?.displayOptions)void placeOnExternalScreen(audience);};hint.append(close);
}
function openAudience(automatic=false){
 if(visible()){if(!automatic)audience.focus();return}
 // Direct button click: do not delay window.open, or popup blockers will reject it.
 const url=new URL("assets/powerslidepro-audience.html?v=83fullscreen19",location.href);
 try{
  audience=window.open(url.href,"powerslidepro-audience",
   "popup,width=1280,height=720,resizable=yes,scrollbars=yes");
 }catch(error){
  audience=null;
 }
 if(!audience){
  explain("Your browser blocked the audience window. Allow popups for this site, or open it in a new tab.",true);
  return;
 }
 clearHint();refreshButton();if(!automatic)audience.focus();
 // Automatic placement uses existing permission; Display settings can grant it.
 const opened=audience;
 void placeOnExternalScreen(opened).then(()=>{if(!desktop?.displayOptions&&visible()&&audience===opened)toAudience({type:'pspro-audience-try-fullscreen'});});
 if(loadingTimeout)clearTimeout(loadingTimeout);
 loadingTimeout=setTimeout(()=>{
  if(showing&&visible())explain("Audience window is taking longer than expected to initialize. Check its loading message, then retry if necessary.");
 },22000);
}
window.addEventListener("powerslidepro-present",event=>{
 showing=!!event.detail?.active;detachable=!!event.detail?.detachedSupported;
 if(!showing)closeShow();
 refreshButton();
 if(showing){if(detachable&&!presenterVisible())openPresenter(true);if(!visible())openAudience(true);}
});
window.addEventListener("message",e=>{
 if(e.origin!==origin)return;
 const d=e.data||{};
 if(d.type==="tahoe-deckcraft-audience"){
  if(e.source!==frame())return;
  switch(d.action){
   case "state":
    if(!detached){latest={index:d.index||"0",blank:d.blank||""};sendState();if(!detaching)toPresenter(stateMessage());}break;
   case "detached":
    detached=true;detaching=false;if(latest)toPresenter(stateMessage());refreshButton();break;
   case "focus":
    if(presenterVisible())presenter.focus();break;
   case "data": {
    const message={type:"pspro-audience-data",name:d.name,data:d.data,index:latest?.index||d.index};
    toPresenter(message);toAudience(message);break;
   }
   case "error":
    if(visible())audience.postMessage({type:"pspro-audience-error",message:d.data},origin);
    break;
   case "end":
    showing=false;closeShow();refreshButton();break;
  }
  return;
 }
 if(d.type==="tahoe-deckcraft-live-editor"&&e.source===frame()&&d.action==="smart-result"){
  toPresenter({type:"pspro-presenter-smart-result",data:d.data});return;
 }
 if(presenter&&e.source===presenter){
  if(!showing)return;
  if(d.type==="pspro-presenter-ready")deliver({type:"tahoe-deckcraft-audience-export"});
  else if(d.type==="pspro-presenter-loaded"){
   if(!detached&&!detaching){detaching=true;deliver({type:"tahoe-deckcraft-detach",action:"detach"});}
   if(latest)toPresenter(stateMessage());
  }else if(d.type==="pspro-presenter-control"){
   if(d.end||d.blank==="end"){deliver({type:"tahoe-deckcraft-detach",action:"end"});return;}
   if(detached){latest={index:String(d.index||0),blank:d.blank||""};sendState();}
  }else if(d.type==="pspro-presenter-smart-add"){
   if(detached&&typeof d.data==="string"&&d.data.length<=500000)deliver({type:"tahoe-deckcraft-smart-request",data:d.data});
   else toPresenter({type:"pspro-presenter-smart-result",data:"Wait until the Presenter View connects to the main editor."});
  }else if(d.type==="pspro-presenter-service"){
   const reply=message=>toPresenter({type:"pspro-presenter-service-result",message});
   window.TahoePowerSlidePresenterServices?.(d.message,reply);
  }else if(d.type==="pspro-presenter-focus-editor"){window.focus();}
  else if(d.type==="pspro-presenter-display-settings"){window.focus();void displaySettings();}
  else if(d.type==="pspro-presenter-closed"){
   presenter=null;if(detached||detaching)deliver({type:"tahoe-deckcraft-detach",action:"end"});refreshButton();
  }
  return;
 }
 // A directly opened fallback tab can reconnect, but only from our exact
 // same-origin Tahoe77 audience host page.
 if(d.type==="pspro-audience-ready"&&e.source!==audience){
  try{
   const page=new URL(e.source.location.href);
   if(page.origin===origin&&page.pathname===new URL("assets/powerslidepro-audience.html",location.href).pathname){
    audience=e.source;refreshButton();clearHint();
   }
  }catch(_){}
 }
 if(!visible()||e.source!==audience)return;
 if(d.type==="pspro-audience-ready"){
  // Serialize the current open document only when the popup's WASM editor
  // has finished initializing; the viewer is a separate renderer.
  clearHint();
  deliver({type:"tahoe-deckcraft-audience-export"});
  if(!desktop?.displayOptions){const opened=audience;void placeOnExternalScreen(opened).then(()=>{if(visible()&&audience===opened)toAudience({type:"pspro-audience-try-fullscreen"});});}
 }else if(d.type==="pspro-audience-control"){
  if(!showing)return;
  if(d.end||d.blank==="end"){if(detachable)deliver({type:"tahoe-deckcraft-detach",action:"end"});else deliver({type:"tahoe-deckcraft-presenter-control",index:'0',blank:'end'});return;}
  if(detached){toPresenter({type:"pspro-audience-state",index:String(d.index||0),blank:d.blank||""});}
  else deliver({type:"tahoe-deckcraft-presenter-control",index:String(d.index||0),blank:d.blank||""});
 }else if(d.type==="pspro-audience-fullscreen"){
  if(desktop?.audienceFullscreen)void desktop.audienceFullscreen();
 }else if(d.type==="pspro-audience-move"){
  if(desktop?.selectDisplay)void desktop.selectDisplay("auto");
 }else if(d.type==="pspro-audience-loaded"){
  if(loadingTimeout)clearTimeout(loadingTimeout);
  clearHint();
  // Replay the latest slide if it changed while the audience renderer loaded.
  sendState();
 }else if(d.type==="pspro-audience-closed"){
  audience=null;
  if(loadingTimeout)clearTimeout(loadingTimeout);
  refreshButton();
 }
});
setInterval(()=>{
 if(presenter?.closed){presenter=null;if(detached||detaching)deliver({type:'tahoe-deckcraft-detach',action:'end'});refreshButton();}
 if(audience?.closed){audience=null;refreshButton();}
},600);
window.addEventListener("beforeunload",closeShow);
})();
