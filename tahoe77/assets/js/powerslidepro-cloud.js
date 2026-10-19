(()=>{
"use strict";
// Personal Cloudinary uploads (public unsigned raw assets), indexed per Firebase user.
const prefix="tahoe.powerslidepro.cloud.v1.";
const $=s=>document.querySelector(s);
const escapeText=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>{const u=window.TahoeFirebase?.currentUser?.();return u&&!u.isAnonymous?u.uid:""};
const makeId=()=> "pscloud_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9);
const niceName=s=>String(s||"Presentation").replace(/[\\/:*?"<>|]/g,"-").trim().slice(0,100)||"Presentation";
const date=n=>new Date(n||Date.now()).toLocaleString();
const mb=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.ceil(n/1024)+" KB";
let state={storages:[],active:"",files:[]},owner="",pending=null,remote=false,busy=false,ticket=0;
function alertStatus(s){const e=$("#pdc-status");if(e){e.textContent=s;e.hidden=!s;}}
function validateData(d){
return {storages:Array.isArray(d?.storages)?d.storages.slice(0,50).filter(x=>x?.id&&x.cloudName&&x.uploadPreset):[],
 active:String(d?.active||""),files:Array.isArray(d?.files)?d.files.slice(-800).filter(f=>f?.id&&f.url&&f.name):[]};
}
function persist(){if(owner)localStorage.setItem(prefix+owner,JSON.stringify(state));window.TahoePowerSlideCloud?.emitList?.();}
async function save(){
if(!uid()||owner!==uid())throw Error("Sign in with Google and reopen Cloudinary.");
persist();
try{
 if(!window.TahoeFirebase?.writeOwnDeckCloud)throw Error("Firebase not connected");
 await window.TahoeFirebase.writeOwnDeckCloud(state);
 remote=true;alertStatus("File list synced with Firebase. Cloudinary files use public URLs.");
}catch(e){remote=false;alertStatus("Saved locally only. Firebase sync unavailable: "+(e?.message||"permission denied"));}
}
async function load(){
let id=uid();if(!id)throw Error("Sign in with Google to use personal Cloudinary storage.");
owner=id;try{state=validateData(JSON.parse(localStorage.getItem(prefix+id)||"{}"))}catch{state=validateData({})}
render();
const task=++ticket;
try{
 if(!window.TahoeFirebase?.readOwnDeckCloud)throw Error("Firebase is connecting");
 let result=await window.TahoeFirebase.readOwnDeckCloud();
 if(task!==ticket||owner!==uid())return;
 if(result){state=validateData(result);persist()}
 remote=true;alertStatus("Cloud library synced with Firebase. Uploaded files are public unless restricted in Cloudinary.");
}catch(e){remote=false;alertStatus("Local library only. Firebase: "+(e?.message||"Unavailable"));}
render();window.TahoePowerSlideCloud?.emitList?.();
}
function validURL(f){try{const u=new URL(f.url);return u.protocol==="https:"&&u.hostname==="res.cloudinary.com"&&u.pathname.startsWith("/"+f.cloudName+"/raw/upload/")}catch{return false}}
function ensureUI(){
if($("#pdc-wrap"))return;
const style=document.createElement("style");
style.textContent=[
"#pdc-wrap{position:fixed;inset:0;z-index:2147483600;background:#07111b77;display:none;align-items:center;justify-content:center;padding:14px;box-sizing:border-box}",
"#pdc-wrap.show{display:flex}",
"#pdc-dialog{width:min(530px,100%);max-height:88vh;overflow:auto;background:#fff;border:1px solid #e0e2e5;border-radius:14px;box-shadow:0 25px 90px #0003;color:#272c34;font:13px/1.5 Arial,sans-serif}",
"#pdc-dialog *{box-sizing:border-box}",
"#pdc-dialog button,#pdc-dialog input,#pdc-dialog select{font:inherit}",
"#pdc-dialog button{cursor:pointer}",
".pdc-head{display:flex;align-items:center;gap:8px;padding:13px 16px;border-bottom:1px solid #e8eaee}",
".pdc-head strong{font-size:15px}.pdc-head button{margin-left:auto;border:0;background:transparent;font-size:23px;color:#82858b}",
".pdc-section{padding:13px 16px;border-bottom:1px solid #eceef1}",
".pdc-section h3{font-size:11px;letter-spacing:.04em;color:#767e88;margin:0 0 10px;text-transform:uppercase}",
".pdc-row{display:flex;gap:8px;align-items:center}.pdc-row .grow{flex:1;min-width:0}",
".pdc-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}",
"#pdc-dialog label{font-size:11px;color:#67717a;font-weight:600}",
"#pdc-dialog input,#pdc-dialog select{width:100%;border:1px solid #d7dade;padding:8px;border-radius:7px;background:#fafbfc;color:#242932}",
"#pdc-dialog label input{display:block;margin-top:4px}",
".pdc-btn{border:1px solid #d7dade;border-radius:7px;padding:7px 10px;background:#f9fafb;color:#333b45;white-space:nowrap}",
".pdc-btn.primary{border-color:#ed7641;background:#ed7641;color:white;font-weight:700}",
".pdc-btn:disabled{opacity:.48;cursor:default}",
".pdc-muted{font-size:11px;color:#7c848d;margin-top:7px}",
".pdc-file{padding:10px 0;border-top:1px solid #edf0f2;display:flex;gap:8px;align-items:center}",
".pdc-file-info{flex:1;min-width:0}.pdc-file-info b{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
".pdc-actions{display:flex;gap:4px;flex-wrap:wrap}",
".pdc-actions button{background:white;border:1px solid #dee0e4;border-radius:6px;padding:5px;font-size:11px}",
"#pdc-status{font-size:11px;padding:9px 16px;color:#616b7b;background:#f5f7f9}",
"#pdc-status[hidden]{display:none}",
"#pdc-progress{width:100%;height:8px;display:none;margin-top:8px}",
"@media(max-width:550px){.pdc-fields{grid-template-columns:1fr}.pdc-file{display:block}.pdc-actions{margin-top:6px}}"
].join("\n");document.head.append(style);
const host=document.createElement("div");host.id="pdc-wrap";
host.innerHTML=[
'<section id="pdc-dialog" role="dialog" aria-modal="true" aria-label="PowerSlidePro Cloudinary">',
'<div class="pdc-head"><i class="ri-cloud-line"></i><strong>PowerSlidePro · Cloudinary</strong><button id="pdc-x" title="Close">×</button></div>',
'<div class="pdc-section"><h3>My Cloudinary Storages</h3>',
'<div class="pdc-row"><select id="pdc-select" class="grow" aria-label="Select storage"></select><button class="pdc-btn" id="pdc-remove-storage">Remove</button></div>',
'<div class="pdc-fields"><label>Cloud Name<input id="pdc-cloud" placeholder="your-cloud-name" maxlength="120" spellcheck="false"></label>',
'<label>Unsigned Upload Preset<input id="pdc-preset" placeholder="powerslide_uploads" maxlength="150" spellcheck="false"></label></div>',
'<div class="pdc-row" style="justify-content:flex-end;margin-top:10px"><button class="pdc-btn" id="pdc-new">+ New</button><button class="pdc-btn primary" id="pdc-save-profile">Save storage</button></div>',
'<div class="pdc-muted">Only these two setup fields. Preset must allow unsigned raw-file uploads.</div></div>',
'<div class="pdc-section" id="pdc-save-area" hidden><h3>Save presentation</h3>',
'<div class="pdc-row"><input id="pdc-name" class="grow" aria-label="File name" maxlength="140"><button class="pdc-btn primary" id="pdc-upload">Upload</button></div>',
'<div class="pdc-muted" id="pdc-details"></div><progress id="pdc-progress" max="100" value="0"></progress></div>',
'<div class="pdc-section"><div class="pdc-row" style="justify-content:space-between"><h3 style="margin:0">My Cloud Files</h3><button class="pdc-btn" id="pdc-refresh">Refresh</button></div>',
'<div class="pdc-muted">Rename and Remove update your library only, not the Cloudinary asset.</div><div id="pdc-files" style="margin-top:8px"></div></div>',
'<div id="pdc-status" role="status" aria-live="polite" hidden></div></section>'
].join("");document.body.append(host);
$("#pdc-x").onclick=close;
host.addEventListener("click",e=>{if(e.target===host&&!busy)close()});
$("#pdc-new").onclick=()=>{$("#pdc-select").value="";$("#pdc-cloud").value="";$("#pdc-preset").value="";$("#pdc-cloud").focus()};
$("#pdc-select").onchange=async()=>{state.active=$("#pdc-select").value;selected();await save();render()};
$("#pdc-save-profile").onclick=()=>run(storeProfile);
$("#pdc-remove-storage").onclick=()=>run(removeProfile);
$("#pdc-upload").onclick=()=>run(upload);
$("#pdc-refresh").onclick=()=>run(load);
$("#pdc-files").onclick=e=>{const b=e.target.closest("[data-cloud-op]");if(b)run(()=>fileOp(b.dataset.cloudOp,b.dataset.cloudId))};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&host.classList.contains("show")&&!busy)close()});
}
function selected(){const p=state.storages.find(x=>x.id===state.active);$("#pdc-cloud").value=p?.cloudName||"";$("#pdc-preset").value=p?.uploadPreset||""}
function render(){
if(!$("#pdc-dialog"))return;
if(!state.storages.some(x=>x.id===state.active))state.active=state.storages[0]?.id||"";
$("#pdc-select").innerHTML=state.storages.length?state.storages.map((s,i)=>'<option value="'+escapeText(s.id)+'">'+escapeText("Storage "+(i+1)+" · "+s.cloudName)+'</option>').join(""):'<option value="">No storages yet</option>';
$("#pdc-select").value=state.active;selected();
$("#pdc-save-area").hidden=!pending;
if(pending){$("#pdc-name").value=pending.name;$("#pdc-details").textContent=pending.format.toUpperCase()+" · "+mb(pending.blob.size)}
$("#pdc-remove-storage").disabled=!state.active||busy;
$("#pdc-upload").disabled=busy||!state.active;
const files=state.files.slice().sort((a,b)=>b.createdAt-a.createdAt);
$("#pdc-files").innerHTML=files.length?files.map(f=>'<div class="pdc-file"><div class="pdc-file-info"><b>'+escapeText(f.name)+'</b><span class="pdc-muted">'+escapeText(f.cloudName)+" · "+escapeText(f.format.toUpperCase())+" · "+mb(f.size)+" · "+escapeText(date(f.createdAt))+'</span></div><div class="pdc-actions">'+["Open","Download","Rename","Remove"].map(a=>'<button data-cloud-op="'+a.toLowerCase()+'" data-cloud-id="'+escapeText(f.id)+'">'+a+'</button>').join("")+'</div></div>').join(""):'<div class="pdc-muted" style="padding:12px 0">No cloud presentations yet.</div>';
}
function close(){if(busy)return;$("#pdc-wrap")?.classList.remove("show");pending=null}
function run(fn){if(busy)return;busy=true;Promise.resolve().then(fn).catch(e=>alertStatus(e.message||String(e))).finally(()=>{busy=false;render()})}
async function openPanel(){
  ensureUI();
  if(!uid()){
    owner="";state={storages:[],active:"",files:[]};pending=null;
    render();$("#pdc-wrap").classList.add("show");
    alertStatus("Sign in with Google before using personal Cloudinary storage.");
    return;
  }
  $("#pdc-wrap").classList.add("show");
  await load();
}
async function storeProfile(){
if(!uid())throw Error("Sign in with Google first.");
const cloudName=$("#pdc-cloud").value.trim(),uploadPreset=$("#pdc-preset").value.trim();
if(!/^[a-zA-Z0-9_-]{2,120}$/.test(cloudName))throw Error("Invalid Cloud Name.");
if(!/^[a-zA-Z0-9_-]{1,150}$/.test(uploadPreset))throw Error("Invalid Unsigned Upload Preset.");
const current=state.storages.find(x=>x.id===$("#pdc-select").value);
if(current){current.cloudName=cloudName;current.uploadPreset=uploadPreset;state.active=current.id}
else{const s={id:makeId(),cloudName,uploadPreset};state.storages.push(s);state.active=s.id}
await save();alertStatus(remote?"Storage saved to Firebase.":"Storage saved locally only.");
}
async function removeProfile(){
if(!state.active)return;
if(!confirm("Remove this storage profile? Existing files stay in the cloud library."))return;
state.storages=state.storages.filter(x=>x.id!==state.active);state.active=state.storages[0]?.id||"";await save();
}
function decoded(text,type){const binary=atob(text),array=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)array[i]=binary.charCodeAt(i);return new Blob([array],{type})}
async function upload(){
if(!uid())throw Error("Sign in with Google first.");
const cfg=state.storages.find(x=>x.id===state.active);
if(!cfg)throw Error("Save a Cloudinary storage first.");
if(!pending)throw Error("Select File → Save As → Save to Cloudinary first.");
if(pending.blob.size>35*1024*1024)throw Error("Presentation exceeds the 35 MB upload limit. Use Download instead.");
const name=niceName($("#pdc-name").value).replace(/\.(pptx|deckcraft)$/i,"")+"."+pending.format;
const file=new File([pending.blob],name,{type:pending.blob.type});
const bar=$("#pdc-progress");bar.style.display="block";bar.value=0;alertStatus("Uploading "+name+"…");
const result=await new Promise((resolve,reject)=>{
const xhr=new XMLHttpRequest();xhr.open("POST","https://api.cloudinary.com/v1_1/"+encodeURIComponent(cfg.cloudName)+"/raw/upload");
xhr.upload.onprogress=e=>{if(e.lengthComputable)bar.value=Math.round(100*e.loaded/e.total)};
xhr.onerror=()=>reject(Error("Cloudinary network error"));
xhr.onload=()=>{let d;try{d=JSON.parse(xhr.responseText)}catch{return reject(Error("Invalid Cloudinary response"))}
if(xhr.status>=200&&xhr.status<300&&d.secure_url&&d.resource_type==="raw")resolve(d);
else reject(Error(d?.error?.message||"Upload failed. Check that your unsigned preset allows raw uploads."))};
const fd=new FormData();fd.append("upload_preset",cfg.uploadPreset);fd.append("file",file);xhr.send(fd);
});
const record={id:makeId(),name,format:pending.format,url:result.secure_url,cloudName:cfg.cloudName,storageId:cfg.id,publicId:result.public_id||"",size:result.bytes||file.size,createdAt:Date.now(),updatedAt:Date.now()};
if(!validURL(record))throw Error("Cloudinary returned an unexpected URL.");
state.files.push(record);pending=null;bar.style.display="none";await save();
alertStatus(remote?"Uploaded successfully; file index synced.":"Uploaded to Cloudinary; file index saved on this device only.");
}
async function fileOp(action,id){
if(!uid())throw Error("Please sign in.");
const file=state.files.find(x=>x.id===id);if(!file)return;
if(!validURL(file))throw Error("Invalid Cloudinary file URL.");
if(action==="rename"){
const answer=prompt("Rename in your library (does not rename remote Cloudinary file)",file.name);
if(answer===null)return;
file.name=niceName(answer).replace(/\.(pptx|deckcraft)$/i,"")+"."+file.format;file.updatedAt=Date.now();await save();return;
}
if(action==="remove"){
if(!confirm("Remove from your library? Cloudinary asset remains online."))return;
state.files=state.files.filter(x=>x.id!==id);await save();return;
}
if(action==="download"){
  // A real Blob download keeps the custom library filename; direct cross-origin
  // anchor downloads can ignore HTML's download attribute.
  try{
    const response=await fetch(file.url,{mode:"cors"});
    if(!response.ok)throw Error("HTTP "+response.status);
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=file.name;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    alertStatus("Downloading "+file.name);
  }catch{
    const a=document.createElement("a");a.href=file.url;a.target="_blank";a.rel="noopener noreferrer";
    document.body.append(a);a.click();a.remove();
    alertStatus("Cloudinary opened in a new tab. Use Save As if your browser cannot download it directly.");
  }
  return;
}
if(action==="open"){
alertStatus("Downloading "+file.name+"…");
const response=await fetch(file.url,{mode:"cors",cache:"no-store"});
if(!response.ok)throw Error("Cloudinary fetch failed: HTTP "+response.status);
const buffer=await response.arrayBuffer();
if(buffer.byteLength>36*1024*1024)throw Error("File exceeds 36 MB in-app open limit. Download it instead.");
const bytes=new Uint8Array(buffer);let raw="";for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
const win=$("#deckCraftFrame")?.contentWindow;if(!win)throw Error("Open PowerSlidePro first.");
win.postMessage({type:"tahoe-deckcraft-cloud-open",name:file.name,id:file.id,data:btoa(raw)},location.origin);
alertStatus("Opening "+file.name+" in PowerSlidePro…");
}
}
window.TahoeAdmin?.on?.("profile",()=>{
  if(owner&&owner!==uid()){
    owner="";pending=null;state={storages:[],active:"",files:[]};
    $("#pdc-wrap")?.classList.remove("show");
  }
});
window.TahoePowerSlideCloud={
  ensure:async()=>{if(!uid())throw Error("Sign in with Google.");if(owner!==uid())await load();},
  files:()=>state.files,
  storages:()=>state.storages,
  active:()=>state.active,
  persist:async()=>{await save();},
  openPanel,
  fileAction:fileOp,
  status:alertStatus,
  emitList:null
};
window.addEventListener("message",event=>{
if(event.origin!==location.origin||event.source!==$("#deckCraftFrame")?.contentWindow)return;
const msg=event.data;if(msg?.type!=="tahoe-deckcraft-cloud"||!["save","library"].includes(msg.action))return;
pending=null;
if(msg.action==="save"){
if(!["deckcraft","pptx"].includes(msg.format)||typeof msg.data!=="string")return;
if(msg.data.length>50*1024*1024){alert("Presentation too large for browser cloud upload.");return}
try{const type=msg.format==="pptx"?"application/vnd.openxmlformats-officedocument.presentationml.presentation":"application/zip";
pending={blob:decoded(msg.data,type),format:msg.format,name:niceName(msg.name)+"."+msg.format}}
catch(e){alertStatus("Cannot prepare file: "+e.message);return}
}
openPanel().catch(e=>alertStatus(e.message));
});
})();
