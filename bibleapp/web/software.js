/* Bible App protected installers: all access is verified by the backend.
   No public GitHub release links, rules, credentials or installer files. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const account=()=>window.BIBLEAPP_ACCOUNT_STATE?.()||{};
const tr=(key,vars={})=>{
 const lang=document.documentElement.lang==="en"?"en":"kh";
 const value=window.BIBLE_LOCALES?.[lang]?.[key]||window.BIBLE_LOCALES?.en?.[key]||key;
 return value.replace(/\{([a-z]+)\}/gi,(_,k)=>String(vars[k]??""));
};
const isAdmin=()=>{const s=account();return !!s.user&&s.access?.status==="active"&&["owner","admin"].includes(s.access.role)};
const endpoint=()=>String(window.BIBLEAPP_SOFTWARE_SERVICE_URL||"").trim();
async function api(action,payload){
 const s=account();
 if(!s.user||!s.client)throw Error(tr("softwareSignInNeeded"));
 if(!endpoint())throw Error(tr("softwareNotConfigured"));
 const url=new URL(endpoint());
 if(url.protocol!=="https:")throw Error(tr("softwareNotConfigured"));
 const token=await s.client.getIdToken();
 const headers={Authorization:"Bearer "+token};
 const options={method:payload?"POST":"GET",headers,cache:"no-store"};
 if(payload){headers["Content-Type"]="application/json";options.body=JSON.stringify({action,...payload})}
 else url.searchParams.set("action",action);
 const result=await fetch(url,options);
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(String(data.error||tr("softwareServiceError")));
 return data;
}
let returnFocus=null;
function sync(){
 const s=account(),eligible=!!s.user&&s.access?.status!=="blocked";
 $("softwareButton").hidden=!eligible;
 $("softwareButton").textContent=tr(s.access?.status==="active"?"getSoftware":"requestSoftware");
}
function close(){
 $("softwareDialog").hidden=true;
 (returnFocus?.isConnected?returnFocus:$("softwareButton")).focus();
 returnFocus=null;
}
async function open(){
 const s=account();
 if(!s.user||s.access?.status==="blocked")return;
 returnFocus=document.activeElement;$("softwareDialog").hidden=false;
 $("softwareClose").focus();$("softwareOptions").replaceChildren();
 $("softwareOptions").hidden=true;
 const pending=s.access?.status!=="active";
 $("softwareRequestButton").hidden=!pending;
 $("softwareRequestButton").disabled=!endpoint();
 $("softwareMessage").textContent=tr("softwareLoading");
 try{
  if(pending){
    const status=await api("myRequest");
    if(!$("softwareDialog").hidden)$("softwareMessage").textContent=tr(status.requested?"softwareAlreadyRequested":"softwareAwaitingRequest");
    return;
  }
  const result=await api("files");
  if($("softwareDialog").hidden)return;
  if(!result.ready||!result.files?.length){$("softwareMessage").textContent=tr("softwareNoFiles");return}
  $("softwareMessage").textContent=tr("softwareChoosePlatform");
  for(const file of result.files){
    const row=document.createElement("div");row.className="software-file-row";
    const label=document.createElement("span");label.textContent=[file.platform,file.format,file.version].filter(Boolean).join(" · ");
    const button=document.createElement("button");button.type="button";button.textContent=tr("download");
    button.onclick=async()=>{
      button.disabled=true;
      try{
        const link=await api("download",{fileId:String(file.id)}),target=new URL(link.url);
        if(target.protocol!=="https:")throw Error(tr("softwareServiceError"));
        window.location.assign(target.href);
      }catch(error){$("softwareMessage").textContent=String(error.message||error)}
      finally{button.disabled=false}
    };
    row.append(label,button);$("softwareOptions").append(row);
  }
  $("softwareOptions").hidden=false;
 }catch(error){if(!$("softwareDialog").hidden)$("softwareMessage").textContent=String(error.message||error)}
}
async function request(){
 if(account().access?.status!=="pending")return;
 const button=$("softwareRequestButton");button.disabled=true;
 try{
  await api("request",{});
  $("softwareMessage").textContent=tr("softwareRequestSubmitted");
  button.hidden=true;
 }catch(error){$("softwareMessage").textContent=String(error.message||error)}
 finally{button.disabled=false}
}
async function refreshRequests(){
 if(!isAdmin())return;
 const status=$("softwareRequestsMessage"),list=$("softwareRequestsList");
 list.replaceChildren();status.textContent=tr("softwareLoading");
 try{
  const response=await api("requests");
  if(!isAdmin())return;
  const rows=Array.isArray(response.requests)?response.requests:[];
  status.textContent=tr(rows.length?"softwareRequestsCount":"softwareNoRequests",{n:rows.length});
  for(const item of rows){
    const row=document.createElement("div");row.className="software-admin-row";
    const identity=document.createElement("span");identity.textContent=[item.displayName||item.uid,item.email,item.status].filter(Boolean).join(" · ");
    row.append(identity);
    if(item.status==="pending"){
      for(const [action,key] of [["approve","softwareApprove"],["reject","softwareReject"]]){
        const button=document.createElement("button");button.type="button";button.textContent=tr(key);
        button.onclick=async()=>{
          button.disabled=true;
          try{await api(action,{uid:String(item.uid)});await refreshRequests()}
          catch(error){status.textContent=String(error.message||error);button.disabled=false}
        };row.append(button);
      }
    }
    list.append(row);
  }
 }catch(error){status.textContent=String(error.message||error)}
}
$("softwareButton").onclick=()=>void open();
$("softwareClose").onclick=close;
$("softwareRequestButton").onclick=()=>void request();
$("softwareDialog").onclick=e=>{if(e.target===$("softwareDialog"))close()};
$("softwareRequestsRefresh").onclick=()=>void refreshRequests();
document.addEventListener("keydown",e=>{
 if($("softwareDialog").hidden)return;
 if(e.key==="Escape"){e.preventDefault();close();return}
 if(e.key!=="Tab")return;
 const focusable=[...$("softwareDialog").querySelectorAll("button:not([hidden]):not([disabled])")];
 const first=focusable[0],last=focusable[focusable.length-1];
 if(first&&last&&((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last))){
  e.preventDefault();(e.shiftKey?last:first).focus();
 }
});
new MutationObserver(sync).observe($("authRole"),{childList:true,attributes:true});
new MutationObserver(()=>{if(!$("usersPage").hidden)void refreshRequests()}).observe($("usersPage"),{attributes:true,attributeFilter:["hidden"]});
new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
sync();
})();