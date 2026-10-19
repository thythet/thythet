(()=>{
"use strict";
const $=s=>document.querySelector(s), api=()=>window.TahoePowerSlideCloud;
const uid=()=>{const u=window.TahoeFirebase?.currentUser?.();return u&&!u.isAnonymous?String(u.uid):""};
const editor=()=>$("#deckCraftFrame")?.contentWindow;
const send=m=>{const w=editor();if(w)w.postMessage(m,location.origin)};
const clean=v=>String(v||"Presentation").replace(/[\\/:*?"<>|]/g,"-").trim().slice(0,100)||"Presentation";
const stem=v=>clean(String(v||"Presentation").replace(/\.(deckcraft|pptx)$/i,""));
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const links=new Map();
let draft=null, waiting=null, processing=false, requestNumber=0;
let currentAccount=uid();
function list(){
 const rows=uid()?(api()?.files()||[]):[],sts=uid()?(api()?.storages()||[]):[];
 send({type:"tahoe-deckcraft-cloud-list",
   data:JSON.stringify({files:rows.map(x=>({id:x.id,name:x.name,format:x.format,cloudName:x.cloudName,storageId:x.storageId,
     size:x.size,updatedAt:x.updatedAt||x.createdAt,modified:new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString()})),
     storages:sts.map(x=>({id:x.id,cloudName:x.cloudName}))})});
}
async function ensure(){if(!uid())throw Error("Sign in with Google to use Cloudinary.");await api()?.ensure();}
if(api())api().emitList=list;
function nextName(){
 const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const prefix="ព្រះបន្ទូល"+day+"-";
 const key="tahoe.powerslidepro.filename."+String(uid()||"local")+"."+day;
 const used=new Set((api()?.files()||[]).map(f=>stem(f.name)));
 let index=Number(localStorage.getItem(key)||0);
 if(!Number.isFinite(index)||index<0)index=0;
 do{index+=1}while(used.has(prefix+String(index).padStart(2,"0")));
 localStorage.setItem(key,String(index));
 return prefix+String(index).padStart(2,"0");
}

function enablePanelDrag(panel,handle){
 let drag=null,offsetX=0,offsetY=0;
 handle.style.cursor="grab";
 handle.style.touchAction="none";
 handle.style.userSelect="none";
 handle.addEventListener("pointerdown",event=>{
   if(event.target.closest("button,input,select")||(event.pointerType==="mouse"&&event.button!==0))return;
   const box=panel.getBoundingClientRect();
   drag={x:event.clientX,y:event.clientY,left:box.left,right:box.right,top:box.top,bottom:box.bottom,
     offsetX,offsetY,pointerId:event.pointerId};
   handle.setPointerCapture(event.pointerId);
   handle.style.cursor="grabbing";
 });
 handle.addEventListener("pointermove",event=>{
   if(!drag||event.pointerId!==drag.pointerId)return;
   const cap=(n,min,max)=>Math.min(Math.max(n,Math.min(min,max)),Math.max(min,max));
   const deltaX=cap(event.clientX-drag.x,8-drag.left,innerWidth-8-drag.right);
   const deltaY=cap(event.clientY-drag.y,8-drag.top,innerHeight-8-drag.bottom);
   offsetX=drag.offsetX+deltaX;offsetY=drag.offsetY+deltaY;
   panel.style.transform="translate("+offsetX+"px,"+offsetY+"px)";
 });
 const finish=()=>{drag=null;handle.style.cursor="grab";};
 handle.addEventListener("pointerup",finish);
 handle.addEventListener("pointercancel",finish);
}

function init(){
 if($("#tahoe-save93"))return;
 const st=document.createElement("style");
 st.textContent=[
 "#tahoe-save93{position:fixed;inset:0;z-index:2147483640;display:none;align-items:center;justify-content:center;background:#08132370;padding:14px}",
 "#tahoe-save93.show{display:flex}",
 "#tahoe-save93 .panel{background:white;color:#2b3038;max-height:90vh;overflow:auto;width:min(398px,100%);border:1px solid #dee1e6;border-radius:13px;box-shadow:0 20px 65px #0003;font:13px/1.4 Arial,sans-serif}",
 "#tahoe-save93 *{box-sizing:border-box}",
 "#tahoe-save93 h2{font-size:14px;text-align:center;margin:0;padding:10px 16px;border-bottom:1px solid #dde1e6;background:#eceef0;cursor:grab;touch-action:none;user-select:none}",
 "#tahoe-save93 label{display:block;font-size:11px;font-weight:650;color:#777e88;margin:12px 16px}",
 "#tahoe-save93 input,#tahoe-save93 select{width:100%;border:1px solid #d7dbe0;border-radius:7px;padding:9px;background:#fbfcfd;color:#242a34;margin-top:4px;font:13px Arial,sans-serif}",
 "#tahoe-save93 .dest{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:5px 16px}",
 "#tahoe-save93 button{cursor:pointer;font:13px Arial,sans-serif}",
 "#tahoe-save93 .dest button{border:1px solid #d8dce1;background:#f9fafb;border-radius:9px;padding:11px;display:grid;justify-items:center;gap:6px}",
 "#tahoe-save93 .dest i{font-size:21px}",
 "#tahoe-save93 .dest button.selected{background:#fff0e8;border-color:#ed7741;color:#ae552e}",
 "#tahoe-save93 .row{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:15px 16px}",
 "#tahoe-save93 .row button{border:1px solid #d8dce1;border-radius:7px;padding:8px 14px;background:white;color:#333}",
 "#tahoe-save93 .row button.primary{background:#ed7741;border-color:#ed7741;color:white;font-weight:bold}",
 "#tahoe-save93 .row button:disabled{opacity:.5;cursor:default}",
 "#tahoe-save93 p{font-size:11px;margin:8px 16px;color:#7d8791}",
 "#tahoe-save93 progress{height:8px;width:calc(100% - 32px);margin:5px 16px;display:none}"
 ].join("\n");document.head.append(st);
 const root=document.createElement("div");root.id="tahoe-save93";
 root.innerHTML=[
 '<section class="panel" role="dialog" aria-modal="true" aria-label="Save Presentation">',
 '<h2 id="s93-title">Save Presentation</h2>',
 '<label>File name<input id="s93-name" maxlength="100" autocomplete="off"></label>',
 '<label style="margin-bottom:3px">Save to</label>',
 '<div class="dest"><button data-s93-dest="cloud"><i class="ri-cloud-line"></i>Cloudinary</button>',
 '<button data-s93-dest="pc"><i class="ri-computer-line"></i>My Computer</button></div>',
 '<label id="s93-storage-label">Cloudinary storage<select id="s93-storage"></select></label>',
 '<label>File type<select id="s93-format"><option value="deckcraft">PowerSlidePro Project (.deckcraft)</option><option value="pptx">PowerPoint Presentation (.pptx)</option></select></label>',
 '<p id="s93-hint"></p><p id="s93-status" role="status" aria-live="polite"></p>',
 '<progress id="s93-progress" max="100" value="0"></progress>',
 '<div class="row"><button id="s93-cancel">Cancel</button><button id="s93-apply" class="primary">Save</button></div>',
 '</section>'
 ].join("");document.body.append(root);
 enablePanelDrag(root.querySelector(".panel"),$("#s93-title"));
 root.querySelectorAll("[data-s93-dest]").forEach(b=>b.onclick=()=>{if(!processing&&draft){draft.dest=b.dataset.s93Dest;render()}});
 $("#s93-cancel").onclick=()=>{if(!processing){root.classList.remove("show");draft=null;waiting=null}};
 $("#s93-apply").onclick=()=>prepare().catch(e=>error(e.message));
 root.onclick=e=>{if(e.target===root&&!processing){root.classList.remove("show");draft=null;waiting=null}};
}
function render(){
 if(!draft)return;init();
 $("#s93-title").textContent=draft.asCopy?"Save As":"Save Presentation";
 $("#s93-storage-label").hidden=draft.dest!=="cloud";
 $("#tahoe-save93").querySelectorAll("[data-s93-dest]").forEach(b=>b.classList.toggle("selected",b.dataset.s93Dest===draft.dest));
 $("#s93-apply").disabled=processing;
 $("#s93-cancel").disabled=processing;
 $("#s93-hint").textContent=draft.dest==="cloud"
  ?"Save replaces the existing library entry; Save As makes a new copy. Earlier physical assets remain on Cloudinary."
  :"The browser downloads this file. It cannot silently overwrite files on your computer.";
}
function openDialog(obj){
 init();draft=obj;processing=false;
 $("#s93-name").value=stem(obj.name);
 $("#s93-format").value=obj.format;
 const sts=api()?.storages()||[];
 $("#s93-storage").innerHTML=sts.length?sts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.cloudName)+'</option>').join(""):'<option value="">Set up Cloudinary first</option>';
 $("#s93-storage").value=obj.storageId||api()?.active()||"";
 $("#s93-status").textContent="";
 $("#s93-progress").style.display="none";
 $("#tahoe-save93").classList.add("show");render();
}
function error(message){processing=false;init();$("#s93-status").textContent=message;render();}
async function intent(msg){
 const id=String(msg.uid||"");if(!id)return;
 if(uid())await ensure();
 const isCopy=msg.action==="saveAsIntent";
 const target=!isCopy?(api()?.files()||[]).find(x=>x.id===links.get(id)):null;
 const doc={uid:id,name:stem(msg.name),format:target?.format||"deckcraft",
   dest:target?"cloud":(uid()&&(api()?.storages()||[]).length?"cloud":"pc"),
   storageId:target?.storageId||api()?.active()||"",replaceId:target?.id||"",asCopy:isCopy};
 openDialog(doc);
 if(target&&(api()?.storages()||[]).some(x=>x.id===doc.storageId)){
  // Save on a previously opened cloud document updates that logical file directly.
  await prepare();
 }
}
async function prepare(){
 if(!draft||processing)return;
 const name=stem($("#s93-name").value),format=$("#s93-format").value;
 if(!["pptx","deckcraft"].includes(format))throw Error("Invalid file format.");
 const storageId=$("#s93-storage").value;
 if(draft.dest==="cloud"){
  if(!uid())throw Error("Google sign-in is required to save to Cloudinary.");
  if(!(api()?.storages()||[]).some(x=>x.id===storageId))throw Error("Configure Cloudinary's two fields before saving.");
 }
 processing=true;render();
 $("#s93-status").textContent="Preparing presentation…";
 waiting={...draft,name,format,storageId,ownerUid:uid(),nonce:++requestNumber};
 send({type:"tahoe-deckcraft-cloud-export",uid:draft.uid,name,format});
}
function from64(data,type){
 const raw=atob(data),array=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)array[i]=raw.charCodeAt(i);
 return new Blob([array],{type});
}
function download(blob,filename){
 const href=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=href;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),30000);
}
async function sendUpload(blob,filename,storage){
 const bar=$("#s93-progress");bar.style.display="block";bar.value=0;
 return await new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();
  xhr.open("POST","https://api.cloudinary.com/v1_1/"+encodeURIComponent(storage.cloudName)+"/raw/upload");
  xhr.upload.onprogress=e=>{if(e.lengthComputable)bar.value=Math.round(100*e.loaded/e.total)};
  xhr.onerror=()=>reject(Error("Cloudinary network error"));
  xhr.onload=()=>{let result;try{result=JSON.parse(xhr.responseText)}catch{return reject(Error("Invalid Cloudinary response"))}
   if(xhr.status>=200&&xhr.status<300&&result.secure_url&&result.resource_type==="raw")resolve(result);
   else reject(Error(result?.error?.message||"Unsigned preset rejected this raw upload"))};
  const fd=new FormData();fd.append("upload_preset",storage.uploadPreset);
  fd.append("file",new File([blob],filename,{type:blob.type}));xhr.send(fd);
 });
}
async function complete(msg){
 const task=waiting;
 if(!task||String(msg.uid)!==task.uid||task.format!==msg.format||typeof msg.data!=="string")return;
 waiting=null;
 try{
  if(msg.data.length>50*1024*1024)throw Error("Presentation exceeds the web save size limit.");
  const type=task.format==="pptx"?"application/vnd.openxmlformats-officedocument.presentationml.presentation":"application/zip";
  const blob=from64(msg.data,type),filename=task.name+"."+task.format;
  if(task.dest==="pc"){
   download(blob,filename);
  }else{
   if(!task.ownerUid||uid()!==task.ownerUid)throw Error("The signed-in account changed. Please save again.");
   await ensure();
   if(uid()!==task.ownerUid)throw Error("The signed-in account changed while preparing the upload.");
   if(blob.size>35*1024*1024)throw Error("Cloudinary uploads are limited to 35 MB here.");
   const storage=(api()?.storages()||[]).find(x=>x.id===task.storageId);
   if(!storage)throw Error("Storage profile was removed.");
   $("#s93-status").textContent="Uploading "+filename+"…";
   const resp=await sendUpload(blob,filename,storage);
   if(uid()!==task.ownerUid)throw Error("Account changed during upload. File is not attached to a different user's library.");
   const files=api().files();
   const existing=!task.asCopy?files.find(x=>x.id===task.replaceId):null;
   const record={id:existing?.id||"pscloud_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8),
    name:filename,format:task.format,cloudName:storage.cloudName,storageId:storage.id,
    url:resp.secure_url,publicId:resp.public_id||"",size:resp.bytes||blob.size,
    createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
   // Do not change the indexed file until Cloudinary confirms a successful upload.
   const returned=new URL(resp.secure_url);
   if(returned.protocol!=="https:"||returned.hostname!=="res.cloudinary.com"
       ||!returned.pathname.startsWith("/"+storage.cloudName+"/raw/upload/")){
      throw Error("Cloudinary returned an unexpected file location.");
   }
   if(existing)Object.assign(existing,record);else files.push(record);
   links.set(task.uid,record.id);
   await api().persist();list();
  }
  send({type:"tahoe-deckcraft-cloud-name",uid:task.uid,name:task.name,force:"1"});
  $("#s93-status").textContent=task.dest==="pc"?"Downloaded "+filename:"Saved "+filename;
  processing=false;draft=null;
  setTimeout(()=>{if(!processing)$("#tahoe-save93")?.classList.remove("show")},750);
 }catch(e){error(e.message||String(e))}
}
window.addEventListener("message",e=>{
 if(e.origin!==location.origin||e.source!==editor())return;
 const m=e.data;if(m?.type!=="tahoe-deckcraft-cloud")return;
 switch(m.action){
 case "list":
  (uid()?ensure():Promise.resolve()).then(list).catch(list);break;
 case "nameRequest":
  (uid()?ensure():Promise.resolve()).catch(()=>{}).then(()=>send({type:"tahoe-deckcraft-cloud-name",uid:m.uid,name:nextName()}));break;
 case "opened":if(m.uid&&m.name)links.set(String(m.uid),String(m.name));break;
 case "saveIntent":case "saveAsIntent":intent(m).catch(e=>{init();error(e.message)});break;
 case "saveData":complete(m);break;
 case "saveError":if(waiting&&String(m.uid)===waiting.uid){waiting=null;error(m.name||"Export failed")};break;
 case "open":case "rename":case "remove":case "download":
  if(uid())ensure().then(()=>api().fileAction(m.action,m.name)).then(()=>{
   if(m.action==="rename"){
    const renamed=(api()?.files()||[]).find(x=>x.id===m.name);
    if(renamed)for(const [documentId,fileId] of links)if(fileId===renamed.id){
     send({type:"tahoe-deckcraft-cloud-name",uid:documentId,name:stem(renamed.name),force:"1"});
    }
   }
   if(m.action==="remove")for(const [documentId,fileId] of links)if(fileId===m.name)links.delete(documentId);
   list();
  }).catch(e=>api()?.status(e.message));
  break;
 case "library":api()?.openPanel().then(list).catch(e=>api()?.status(e.message));break;
 }
});
window.TahoeAdmin?.on?.("profile",()=>{
 const now=uid();
 if(now!==currentAccount){
   currentAccount=now;
   links.clear();draft=null;waiting=null;processing=false;
   $("#tahoe-save93")?.classList.remove("show");
   list();
 }
});
})();
