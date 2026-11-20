/* Public Bible App desktop downloads.
   Installer files are published as public GitHub Release assets, with no
   Firebase login, cloud rules, or approval requirement. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const tr=(key,vars={})=>{
  const lang=document.documentElement.lang==="en"?"en":"kh";
  const val=window.BIBLE_LOCALES?.[lang]?.[key]||window.BIBLE_LOCALES?.en?.[key]||key;
  return val.replace(/\{([a-z]+)\}/gi,(_,k)=>String(vars[k]??""));
};
const RELEASE_TAG="bibleapp-v0.1.1";
const PREVIOUS_RELEASE_TAG="bibleapp-v0.1.0";
const REPO="thythet/thythet";
const RELEASE_API="https://api.github.com/repos/"+REPO+"/releases/tags/"+RELEASE_TAG;
const RELEASE_PAGE="https://github.com/"+REPO+"/releases";
const RELEASE_PATH="/"+REPO+"/releases/download/"+RELEASE_TAG+"/";
const PUBLIC_FILES=Object.freeze([
 {name:"BibleApp-0.1.1-win-x64.exe",platform:"Windows 64-bit",format:"EXE"},
 {name:"BibleApp-0.1.1-win-x64.msi",platform:"Windows 64-bit",format:"MSI"},
 {name:"BibleApp-0.1.1-mac-arm64.dmg",platform:"macOS Apple Silicon",format:"DMG"},
 {name:"BibleApp-0.1.1-mac-x64.dmg",platform:"macOS Intel",format:"DMG"}
]);
// Temporary fallback: Actions artifacts are not public direct downloads,
// may require a GitHub login, and expire. Do not mislabel them as releases.
const TEMP=Object.freeze([
 {name:"Windows · EXE + MSI",id:"14619451633"},
 {name:"macOS · Apple Silicon DMG",id:"14619327041"},
 {name:"macOS · Intel DMG",id:"14619427337"},
 {name:"All platforms · ZIP + checksums",id:"14619841267"}
]);
let focusReturn=null,sequence=0;
function sync(){
  const loggedIn=!!window.BIBLEAPP_ACCOUNT_STATE?.()?.user;
  $("softwareButton").hidden=!loggedIn;
  $("softwarePublicButton").hidden=loggedIn;
}
function makeLink(label,url,subtitle){
  const row=document.createElement("div");row.className="software-file-row";
  const title=document.createElement("span");title.textContent=label;
  const link=document.createElement("a");link.className="software-download-link";
  link.href=url;link.target="_blank";link.rel="noopener noreferrer";
  link.textContent=tr("download");
  if(subtitle)link.setAttribute("aria-label",subtitle);
  row.append(title,link);
  return row;
}
function renderFallback(){
  const list=$("softwareOptions");list.replaceChildren();
  const warning=document.createElement("p");warning.className="hint";
  warning.textContent=tr("softwareReleasePending");
  list.append(warning);
  for(const file of TEMP){
    const url="https://github.com/"+REPO+"/actions/runs/44714193559/artifacts/"+file.id;
    const row=makeLink(file.name,url,file.name+" — "+tr("softwareDownloadZip"));
    row.querySelector("a").textContent=tr("softwareDownloadZip");
    list.append(row);
  }
  list.hidden=false;
  $("softwareMessage").textContent=tr("softwarePublicFallback");
}
async function open(){
  focusReturn=document.activeElement;
  const id=++sequence;
  $("softwareDialog").hidden=false;
  $("softwareClose").focus();
  const list=$("softwareOptions");list.hidden=true;list.replaceChildren();
  $("softwareMessage").textContent=tr("softwareReleaseChecking");
  try{
    let activeTag=RELEASE_TAG;
    let response=await fetch(RELEASE_API,{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});
    if(!response.ok){
      // Keep the already released 0.1.0 installers working during the 0.1.1 build.
      response=await fetch("https://api.github.com/repos/"+REPO+"/releases/tags/"+PREVIOUS_RELEASE_TAG,{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});
      activeTag=PREVIOUS_RELEASE_TAG;
    }
    if(!response.ok)throw Error("release-pending");
    const release=await response.json();
    if($("softwareDialog").hidden||id!==sequence)return;
    const assets=Array.isArray(release.assets)?release.assets:[];
    const activePath=activeTag===RELEASE_TAG?RELEASE_PATH:"/"+REPO+"/releases/download/"+PREVIOUS_RELEASE_TAG+"/";
    const version=activeTag===RELEASE_TAG?"0.1.1":"0.1.0";
    const verified=PUBLIC_FILES.map(file=>{
      const filename=file.name.replace("0.1.1",version);
      const asset=assets.find(a=>a.name===filename&&a.size>0);
      if(!asset)return null;
      const link=new URL(asset.browser_download_url);
      if(link.protocol!=="https:"||link.hostname!=="github.com"||!link.pathname.startsWith(activePath))return null;
      return {file,url:link.href};
    }).filter(Boolean);
    if(!verified.length)throw Error("release-empty");
    list.replaceChildren();
    for(const {file,url} of verified){
      list.append(makeLink(file.platform+" · "+file.format+" · v"+version,url));
    }
    list.hidden=false;
    $("softwareMessage").textContent=tr(activeTag===RELEASE_TAG?"softwarePublicReady":"softwareOlderRelease");
  }catch{
    if(!$("softwareDialog").hidden&&id===sequence)renderFallback();
  }
}
function close(){
  if($("softwareDialog").hidden)return;
  $("softwareDialog").hidden=true;
  sequence++;
  const target=focusReturn?.isConnected?focusReturn:$("softwarePublicButton");
  focusReturn=null;
  if(target&&!target.hidden)target.focus();
}
$("softwareButton").onclick=()=>void open();
$("softwarePublicButton").onclick=()=>void open();
$("softwareClose").onclick=close;
$("softwareMacCopy").onclick=async()=>{
  const command=$("softwareMacCommand").textContent.trim();
  const status=$("softwareMacCopyStatus");
  try{
    await navigator.clipboard.writeText(command);
    status.textContent=tr("macHelpCopied");
  }catch{
    status.textContent=tr("macHelpCopyFailed");
  }
  status.hidden=false;
};
$("softwareDialog").addEventListener("click",e=>{if(e.target===$("softwareDialog"))close()});
document.addEventListener("keydown",e=>{
  if($("softwareDialog").hidden)return;
  if(e.key==="Escape"){e.preventDefault();close();return}
  if(e.key!=="Tab")return;
  const list=[...$("softwareDialog").querySelectorAll("button:not([hidden]),a[href]")];
  const first=list[0],last=list[list.length-1];
  if(first&&last&&((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last))){
    e.preventDefault();(e.shiftKey?last:first).focus();
  }
});
new MutationObserver(sync).observe($("authRole"),{childList:true,attributes:true});
new MutationObserver(sync).observe($("authProfile"),{attributes:true,attributeFilter:["hidden"]});
new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
sync();
})();