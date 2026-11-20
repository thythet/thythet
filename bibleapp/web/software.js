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

/* Temporary verified GitHub Actions ZIPs from a completed build.
   GitHub account sign-in may be required, and these links are NOT authorized
   by Firebase. Artifacts expire around December 20, 2026. Use the private
   backend instead once it is deployed. */
const temporaryPackages=Object.freeze([
 {platform:"Windows 64-bit",format:"EXE + MSI",artifact:"14619451633"},
 {platform:"macOS Apple Silicon",format:"DMG",artifact:"14619327041"},
 {platform:"macOS Intel",format:"DMG",artifact:"14619427337"},
 {platform:"Windows + macOS",format:"All files + checksums",artifact:"14619841267"}
]);
function showTemporaryDownloads(){
 const list=$("softwareOptions");list.replaceChildren();
 $("softwareMessage").textContent=tr("softwareGithubFallback");
 for(const file of temporaryPackages){
  const row=document.createElement("div");row.className="software-file-row";
  const label=document.createElement("span");
  label.textContent=file.platform+" · "+file.format;
  const link=document.createElement("a");
  link.className="software-download-link";
  link.href="https://github.com/thythet/thythet/actions/runs/44714193559/artifacts/"+file.artifact;
  link.target="_blank";link.rel="noopener noreferrer";
  link.textContent=tr("softwareDownloadZip");
  link.setAttribute("aria-label",label.textContent+" — "+tr("softwareDownloadZip"));
  row.append(label,link);list.append(row);
 }
 list.hidden=false;
}
let returnFocus=null;
function sync(){
 const signedIn=!!account().user;
 $("softwareButton").hidden=!signedIn;
 $("softwareButton").textContent=tr("getSoftware");
}
function close(){
 $("softwareDialog").hidden=true;
 (returnFocus?.isConnected?returnFocus:$("softwareButton")).focus();
 returnFocus=null;
}
async function open(){
 const s=account();
 if(!s.user)return;
 returnFocus=document.activeElement;$("softwareDialog").hidden=false;
 $("softwareClose").focus();$("softwareOptions").replaceChildren();
 $("softwareOptions").hidden=true;
 if(!endpoint()){showTemporaryDownloads();return}
 $("softwareMessage").textContent=tr("softwareLoading");
 try{
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
$("softwareButton").onclick=()=>void open();
$("softwareClose").onclick=close;
$("softwareDialog").onclick=e=>{if(e.target===$("softwareDialog"))close()};
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
new MutationObserver(sync).observe($("authProfile"),{attributes:true,attributeFilter:["hidden"]});
new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
sync();
})();