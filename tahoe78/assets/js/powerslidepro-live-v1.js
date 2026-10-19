(()=>{
"use strict";
const origin=location.origin,$=s=>document.querySelector(s),presenter=()=>$("#deckCraftFrame")?.contentWindow;
let shell=null,frame=null,ready=false,loaded=false,pendingSnapshot=false,closing=false;
const send=(win,msg)=>{if(win)win.postMessage(msg,origin)};
const label=text=>{const e=$("#pspro-live-status");if(e)e.textContent=text};
function mount(){
 if(shell)return;
 const style=document.createElement("style");
 style.id="pspro-live-styles";
 style.textContent=[
 "#pspro-live-window{position:fixed;left:8vw;top:9vh;width:min(1140px,84vw);height:min(740px,81vh);min-width:680px;min-height:420px;z-index:2147481000;display:none;flex-direction:column;overflow:hidden;border-radius:13px;border:1px solid #64748b66;background:#1a1b1e;box-shadow:0 30px 100px #0008}",
 "#pspro-live-window.pspro-open{display:flex}",
 "#pspro-live-head{height:42px;min-height:42px;display:flex;align-items:center;gap:9px;background:#22252a;color:#edf1f5;padding:0 12px;box-sizing:border-box;cursor:grab;touch-action:none;user-select:none;font:12px system-ui,sans-serif}",
 "#pspro-live-head:active{cursor:grabbing}#pspro-live-head strong{font-size:13px;font-weight:650}",
 "#pspro-live-status{font-size:11px;color:#a9b4c4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}",
 "#pspro-live-head button{height:28px;min-width:28px;padding:0 10px;border:1px solid #4b5563;border-radius:7px;color:#e5e7eb;background:#343943;cursor:pointer;font:12px system-ui}",
 "#pspro-live-head button:hover{background:#46505e}#pspro-live-head button.pspro-save{background:#d65a27;border-color:#d65a27;color:white}",
 "#pspro-live-window iframe{flex:1;width:100%;min-height:0;border:0;background:#262626}",
 ".pspro-live-size{position:absolute;bottom:0;right:0;width:23px;height:23px;cursor:nwse-resize;touch-action:none;z-index:2}",
 ".pspro-live-size:after{content:'';position:absolute;right:5px;bottom:5px;width:10px;height:10px;border-right:2px solid #adb5bd;border-bottom:2px solid #adb5bd}",
 "@media(max-width:760px){#pspro-live-window{left:1vw!important;top:1vh!important;width:98vw!important;height:96vh!important;min-width:0;min-height:0}}"
 ].join("");
 document.head.appendChild(style);
 shell=document.createElement("section");shell.id="pspro-live-window";shell.setAttribute("role","dialog");shell.setAttribute("aria-label","PowerSlidePro Live Editor");
 shell.innerHTML='<header id="pspro-live-head"><strong>✎ Live Slide Editor</strong><span id="pspro-live-status">Connecting…</span><button type="button" id="pspro-live-save" class="pspro-save" title="Open PowerSlidePro Save options">Save</button><button type="button" id="pspro-live-close" title="Close live editor">✕</button></header><iframe id="pspro-live-frame" title="PowerSlidePro editable presentation" allow="clipboard-read; clipboard-write"></iframe><div class="pspro-live-size" title="Resize editor"></div>';
 document.body.appendChild(shell);frame=$("#pspro-live-frame");
 $("#pspro-live-save").onclick=()=>{if(!loaded)return label("Waiting for presentation…");label("Saving live edits…");send(frame.contentWindow,{type:"tahoe-deckcraft-live-editor",action:"flushsave"});};
 $("#pspro-live-close").onclick=close;
 drag($("#pspro-live-head"),false);drag($(".pspro-live-size"),true);
}
function drag(handle,resize){
 let hold=null;
 handle.addEventListener("pointerdown",e=>{
  if(e.button!==0||e.target.closest("button")||innerWidth<=760)return;
  const rect=shell.getBoundingClientRect();hold={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,width:rect.width,height:rect.height,pid:e.pointerId};
  frame.style.pointerEvents="none";handle.setPointerCapture(e.pointerId);e.preventDefault();
 });
 handle.addEventListener("pointermove",e=>{
  if(!hold||hold.pid!==e.pointerId)return;
  const dx=e.clientX-hold.x,dy=e.clientY-hold.y;
  if(resize){shell.style.width=Math.max(680,Math.min(innerWidth-hold.left-8,hold.width+dx))+"px";shell.style.height=Math.max(420,Math.min(innerHeight-hold.top-8,hold.height+dy))+"px";}
  else{shell.style.left=Math.max(0,Math.min(innerWidth-hold.width,hold.left+dx))+"px";shell.style.top=Math.max(0,Math.min(innerHeight-hold.height,hold.top+dy))+"px";}
 });
 const stop=e=>{if(!hold||hold.pid!==e.pointerId)return;hold=null;frame.style.pointerEvents="";};
 handle.addEventListener("pointerup",stop);handle.addEventListener("pointercancel",stop);
}
function open(){
 if(!presenter())return;
 mount();shell.classList.add("pspro-open");closing=false;
 if(loaded){label("Editing live · changes update Presenter View");return;}
 if(ready){request();return;}
 const url=new URL($("#deckCraftFrame")?.dataset.src||"apps/deckcraft-web/index.html?blank",location.href);
 url.searchParams.set("liveeditor","1");url.searchParams.delete("audience");
 frame.src=url.href;label("Loading editable PowerSlidePro window…");
}
function request(){
 if(!ready||pendingSnapshot||!presenter())return;
 pendingSnapshot=true;label("Copying current presentation…");
 send(presenter(),{type:"tahoe-deckcraft-live-editor",action:"snapshot"});
}
function close(){
 if(!shell)return;
 if(loaded&&!closing){
  closing=true;send(frame.contentWindow,{type:"tahoe-deckcraft-live-editor",action:"flush"});
  setTimeout(()=>{shell.classList.remove("pspro-open");closing=false;},850);
 }else shell.classList.remove("pspro-open");
}
window.TahoePowerSlideLive={open,close};
window.addEventListener("message",e=>{
 if(e.origin!==origin)return;
 const d=e.data||{};if(d.type!=="tahoe-deckcraft-live-editor")return;
 if(e.source===frame?.contentWindow){
  if(d.action==="ready"){ready=true;request();}
  else if(d.action==="loaded"){loaded=true;pendingSnapshot=false;label("Editing live · changes update Presenter View");}
  else if(d.action==="change"||d.action==="save"){
   if(!d.data||!presenter())return;
   label(d.action==="save"?"Syncing edits before Save…":"Syncing slide edits…");
   send(presenter(),{type:"tahoe-deckcraft-live-editor",action:"update",name:d.name,data:d.data,index:d.index});
   if(d.action==="save")send(presenter(),{type:"tahoe-deckcraft-live-editor",action:"save"});
  }else if(d.action==="error")label(d.data||"Live editor error");
 }else if(e.source===presenter()){
  if(d.action==="snapshot"){
   if(!pendingSnapshot||!d.data)return;
   pendingSnapshot=false;
   send(frame?.contentWindow,{type:"tahoe-deckcraft-live-editor",action:"load",name:d.name,index:d.index,data:d.data});
  }else if(d.action==="applied"){label("Synced · audience and presenter updated");}
  else if(d.action==="error"){pendingSnapshot=false;label(d.data||"Presentation sync error");}
 }
});
})();