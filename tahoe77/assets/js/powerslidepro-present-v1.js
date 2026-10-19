/* PowerSlidePro v1 dual-screen bridge — isolated to Tahoe77. No Firebase changes. */
(()=>{
"use strict";
const $=s=>document.querySelector(s), origin=location.origin;
let showing=false, audience=null, latest=null, loadingTimeout=null;
const frame=()=>$("#deckCraftFrame")?.contentWindow;
const deliver=m=>frame()?.postMessage(m,origin);
const visible=()=>!!(audience&&!audience.closed);
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
  "#pspro-audience-hint a{color:#ffb88f;text-decoration:underline}"
 ].join("");
 document.head.append(style);
 btn=document.createElement("button");
 btn.id="pspro-audience-launch";
 btn.type="button";
 btn.textContent="▣ Open Audience Screen";
 btn.title="Open slide show on another monitor. Keep Presenter View in this window.";
 const mount=$("#deckCraftWindow");
 if(mount)mount.appendChild(btn);else document.body.appendChild(btn);
 btn.addEventListener("click",openAudience);
 const hint=document.createElement("div");hint.id="pspro-audience-hint";
 const mountHint=$("#deckCraftWindow")||document.body;
 mountHint.append(hint);
 return btn;
}
function refreshButton(){
 const btn=launcher();
 btn.style.display=showing?"block":"none";
 btn.textContent=visible()?"▣ Audience Screen Open":"▣ Open Audience Screen";
}
function explain(message,offerLink=false){
 launcher();
 const hint=$("#pspro-audience-hint");if(!hint)return;
 hint.innerHTML="";
 hint.append(document.createTextNode(message));
 if(offerLink){
  hint.append(document.createElement("br"));
  const anchor=document.createElement("a");
  anchor.href=new URL("assets/powerslidepro-audience.html?v=77presenterfix",location.href).href;
  anchor.target="_blank";anchor.rel="opener";
  anchor.textContent="Open audience in a new tab";
  hint.append(anchor);
 }
 hint.style.display="block";
}
function clearHint(){const h=$("#pspro-audience-hint");if(h)h.style.display="none";}
function sendState(){
 if(visible()&&latest){
  audience.postMessage({type:"pspro-audience-state",index:latest.index,blank:latest.blank},origin);
 }
}
async function placeOnExternalScreen(w){
 // API is optional and permission-gated. No assumptions about user's monitor count.
 try{
  if(typeof window.getScreenDetails!=="function")return;
  const info=await window.getScreenDetails();
  const secondary=info.screens?.find(s=>!s.isPrimary)||info.currentScreen;
  if(secondary&&w&&!w.closed){
   w.moveTo(secondary.availLeft??secondary.left,secondary.availTop??secondary.top);
   w.resizeTo(secondary.availWidth??secondary.width,secondary.availHeight??secondary.height);
  }
 }catch(_){/* manual move is always supported */}
}
function openAudience(){
 if(visible()){audience.focus();return}
 // Direct button click: do not delay window.open, or popup blockers will reject it.
 const url=new URL("assets/powerslidepro-audience.html?v=77presenterfix",location.href);
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
 clearHint();refreshButton();audience.focus();
 // Do not request screen-management permission automatically. The audience
 // window exposes a user-initiated Move to Second Screen action instead.
 if(loadingTimeout)clearTimeout(loadingTimeout);
 loadingTimeout=setTimeout(()=>{
  if(showing&&visible())explain("Audience window is taking longer than expected to initialize. Check its loading message, then retry if necessary.");
 },22000);
}
window.addEventListener("powerslidepro-present",event=>{
 showing=!!event.detail?.active;
 if(!showing&&visible()){
  audience.postMessage({type:"pspro-audience-end"},origin);
  audience=null;
 }
 if(!showing){
  latest=null;clearHint();
  if(loadingTimeout)clearTimeout(loadingTimeout);
 }
 refreshButton();
});
window.addEventListener("message",e=>{
 if(e.origin!==origin)return;
 const d=e.data||{};
 if(d.type==="tahoe-deckcraft-audience"){
  if(e.source!==frame())return;
  switch(d.action){
   case "state":
    latest={index:d.index||"0",blank:d.blank||""};
    sendState();break;
   case "data":
    if(visible())audience.postMessage({type:"pspro-audience-data",name:d.name,
     data:d.data,index:d.index},origin);
    break;
   case "error":
    if(visible())audience.postMessage({type:"pspro-audience-error",message:d.data},origin);
    break;
   case "end":
    if(visible())audience.postMessage({type:"pspro-audience-end"},origin);
    audience=null;refreshButton();break;
  }
  return;
 }
 // A directly opened fallback tab can reconnect, but only from our exact
 // same-origin Tahoe77 audience host page.
 if(d.type==="pspro-audience-ready"&&e.source!==audience){
  try{
   const page=new URL(e.source.location.href);
   if(page.origin===origin&&page.pathname.endsWith("/tahoe77/assets/powerslidepro-audience.html")){
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
 }else if(d.type==="pspro-audience-control"){
  if(!showing)return;
  deliver({type:"tahoe-deckcraft-presenter-control",
    index:String(d.index||0),blank:d.end?"end":(d.blank||"")});
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
})();
