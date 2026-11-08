/* Restored Love Kid 3 Pro – Chrome/Android/iOS Progressive Web App installation. */
(()=>{
  "use strict";
  const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||
    window.navigator.standalone===true;
  const isIOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const isAndroid=()=>/Android/i.test(navigator.userAgent);
  let deferredPrompt=null;
  let modal=null;
  const buttons=[];
  function installText(){return document.documentElement.lang==="km"?"ដំឡើង App":"Install App";}
  function addStyles(){
    if(document.getElementById("lk-pwa-install-styles"))return;
    const st=document.createElement("style");
    st.id="lk-pwa-install-styles";
    st.textContent=`
      .lk-install-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;
        border:1px solid rgba(147,197,253,.44);border-radius:14px;
        padding:9px 11px;background:linear-gradient(135deg,rgba(69,125,220,.27),rgba(93,167,255,.15));
        color:#e0edff;font:800 12px/1.2 inherit;white-space:nowrap;cursor:pointer;
        min-height:34px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
      .lk-install-action:hover{background:rgba(93,167,255,.27)}
      .lk-install-action:focus-visible,.lk-install-close:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
      .lk-install-action svg{width:18px;height:18px;flex:none;display:block;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
      /* Both icon-only buttons use the same 48 × 32px footprint as .lang-btn. */
      .lk-install-action.lk-main,.lk-install-action.lk-login{
        flex:0 0 48px;min-width:48px;width:48px;max-width:48px;height:32px;min-height:32px;
        padding:0;margin:0;gap:0;border-radius:13px;align-self:center;
      }
      .lk-install-action.lk-main .lk-install-label,
      .lk-install-action.lk-login .lk-install-label{display:none}
      .lk-install-action.lk-dashboard{min-height:39px}
      .lk-install-backdrop{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;
        padding:18px;background:rgba(5,14,33,.75);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
      .lk-install-dialog{width:min(100%,410px);border:1px solid rgba(167,198,243,.37);border-radius:22px;
        background:linear-gradient(155deg,#314763,#172640);padding:22px;color:#f8fafc;
        font:inherit;box-shadow:0 24px 70px rgba(0,0,0,.48)}
      .lk-install-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .lk-install-head b{font-size:20px}
      .lk-install-close{border:1px solid #7184a4;border-radius:10px;padding:7px 11px;color:#fff;background:#3a4b66;cursor:pointer}
      .lk-install-dialog p{font-size:14px;line-height:1.65;color:#dbe7fa;margin:14px 0 0}
      .lk-install-dialog strong{color:#fff}
      .lk-install-dialog .lk-install-steps{border:1px solid rgba(167,198,243,.23);border-radius:13px;
        padding:12px 14px;background:rgba(255,255,255,.07);line-height:1.8;margin-top:15px;font-size:14px}
      @media(max-width:620px){.lk-install-action.lk-dashboard{padding:7px 9px}}`;
    document.head.append(st);
  }
  const icon='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>';
  function addButton(parent,className,prepend=false){
    if(!parent)return;
    const b=document.createElement("button");
    b.type="button";
    b.className="lk-install-action "+className;
    b.title="Install Love Kid 3 Pro on this device";
    b.setAttribute("aria-label",b.title);
    b.innerHTML=icon+'<span class="lk-install-label"></span>';
    b.querySelector(".lk-install-label").textContent=installText();
    b.addEventListener("click",onInstallClick);
    prepend?parent.prepend(b):parent.append(b);
    buttons.push(b);
  }
  function update(){
    const hide=isInstalled();
    buttons.forEach(b=>{
      b.hidden=hide;
      b.style.display=hide?"none":"";
      const label=b.querySelector(".lk-install-label");
      if(label)label.textContent=installText();
    });
  }
  function closeModal(){
    if(!modal)return;
    modal.remove();
    modal=null;
    document.removeEventListener("keydown",onModalKey);
  }
  function onModalKey(e){if(e.key==="Escape")closeModal();}
  function help(){
    closeModal();
    modal=document.createElement("div");
    modal.className="lk-install-backdrop";
    modal.setAttribute("role","presentation");
    const body=isIOS()
      ?'<div class="lk-install-steps">1. Open this page in Safari or Chrome.<br>2. Tap <strong>Share</strong>.<br>3. Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</div>'
      :isAndroid()
        ?'<div class="lk-install-steps">1. Open this page in <strong>Google Chrome</strong>.<br>2. Tap the <strong>⋮</strong> menu.<br>3. Choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.<br>4. Tap <strong>Install</strong>.</div>'
        :'<div class="lk-install-steps">In Google Chrome, open <strong>⋮</strong> → <strong>Cast, save, and share</strong> → <strong>Install page as app</strong> (menu names may differ).</div>';
    const dialog=document.createElement("div");
    dialog.className="lk-install-dialog";
    dialog.setAttribute("role","dialog");
    dialog.setAttribute("aria-modal","true");
    dialog.setAttribute("aria-label","Install Love Kid 3 Pro");
    dialog.innerHTML='<div class="lk-install-head"><b>Install Love Kid 3 Pro</b><button class="lk-install-close" type="button">Close ✕</button></div>'+
      '<p>Install this website on your phone or computer to open it like an app. An internet connection is required to sign in and sync attendance.</p>'+body;
    modal.append(dialog);
    modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
    dialog.querySelector(".lk-install-close").addEventListener("click",closeModal);
    document.body.append(modal);
    document.addEventListener("keydown",onModalKey);
    dialog.querySelector(".lk-install-close").focus();
  }
  async function onInstallClick(){
    if(isInstalled())return;
    if(!deferredPrompt){help();return;}
    const p=deferredPrompt;
    deferredPrompt=null;
    try{
      await p.prompt();
      await p.userChoice;
    }catch(err){console.warn("Install prompt unavailable",err);help();}
  }
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    deferredPrompt=event;
    update();
  });
  window.addEventListener("appinstalled",()=>{
    deferredPrompt=null;
    closeModal();
    update();
  });
  function init(){
    addStyles();
    // Install entry points for the attendance app, its login, and dashboard.
    addButton(document.querySelector("#mainView .top .row.between > .row")||
      document.querySelector(".app .top .row.between > .row"),"lk-main",true);
    addButton(document.querySelector("#loginView .login-actions"),"lk-login");
    addButton(document.querySelector(".top-actions"),"lk-dashboard",true);
    update();
    new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
    if("serviceWorker" in navigator && location.protocol==="https:"){
      window.addEventListener("load",()=>{
        navigator.serviceWorker.register("./sw.js",{scope:"./"})
          .then(reg=>reg.update().catch(()=>{}))
          .catch(err=>console.warn("Love Kid 3 Pro service worker:",err));
      },{once:true});
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
