/* PowerSlidePro v1 dual-screen bridge — isolated to Tahoe77. No Firebase changes. */
(()=>{
"use strict";
const $=s=>document.querySelector(s), origin=location.origin;
let showing=false, audience=null, latest=null;
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
  "#pspro-audience-launch:focus-visible{outline:3px solid #0c92ff}"
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
 return btn;
}
function refreshButton(){
 const btn=launcher();
 btn.style.display=showing?"block":"none";
 btn.textContent=visible()?"▣ Audience Screen Open":"▣ Open Audience Screen";
}
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
 const url=new URL("assets/powerslidepro-audience.html?v=77dualmonitor",location.href);
 audience=window.open(url.href,"powerslidepro-audience",
    "popup=yes,width=1280,height=720,resizable=yes,scrollbars=no");
 if(!audience){
   launcher().title="Your browser blocked the popup. Allow popups for thythet.com and retry.";
   return;
 }
 refreshButton();
 audience.focus();
 // Position after opening, only with optional browser permission.
 placeOnExternalScreen(audience);
}
window.addEventListener("powerslidepro-present",event=>{
 showing=!!event.detail?.active;
 if(!showing&&visible()){
  audience.postMessage({type:"pspro-audience-end"},origin);
  audience=null;
 }
 if(!showing)latest=null;
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
 // Events only from the popup that this window opened, on the same origin.
 if(!visible()||e.source!==audience)return;
 if(d.type==="pspro-audience-ready"){
  // Serialize the current open document only when the popup's WASM editor
  // has finished initializing; the viewer is a separate renderer.
  deliver({type:"tahoe-deckcraft-audience-export"});
 }else if(d.type==="pspro-audience-control"){
  if(!showing)return;
  deliver({type:"tahoe-deckcraft-presenter-control",
    index:String(d.index||0),blank:d.end?"end":(d.blank||"")});
 }else if(d.type==="pspro-audience-loaded"){
  // The renderer is ready; replay the latest operator slide after any slow
  // WASM/font startup so slides changed during loading are not lost.
  sendState();
 }else if(d.type==="pspro-audience-closed"){
  audience=null;refreshButton();
 }
});
})();
