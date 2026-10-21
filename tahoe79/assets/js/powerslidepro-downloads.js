/* Tahoe79 only: verified GitHub Release downloads for the offline PowerSlidePro app. */
(()=>{
'use strict';
const btn=document.createElement('button');
btn.id='pspro-desktop-get';
btn.type='button';
btn.setAttribute('aria-haspopup','dialog');
btn.innerHTML='<span aria-hidden="true">↓</span> Get PowerSlidePro';
const style=document.createElement('style');
style.textContent=[
 '#pspro-desktop-get{position:fixed;bottom:max(22px,env(safe-area-inset-bottom));right:18px;z-index:9;',
 'display:flex;align-items:center;gap:8px;border:1px solid #ffffff70;border-radius:12px;',
 'background:#2568d8;color:#fff;font:650 13px system-ui;padding:11px 15px;cursor:pointer;',
 'box-shadow:0 7px 24px #0003;backdrop-filter:blur(14px)}',
 '#pspro-desktop-get:hover{background:#195ac5}',
 '#pspro-desktop-get span{font-size:18px;line-height:1}',
 '#pspro-download-backdrop{position:fixed;inset:0;background:#060e2099;backdrop-filter:blur(7px);',
 'z-index:2147483600;display:grid;place-items:center;padding:16px}',
 '#pspro-download-box{position:relative;width:min(480px,100%);box-sizing:border-box;padding:26px;',
 'border-radius:19px;background:#fafbfe;color:#1c2636;font:14px/1.5 system-ui;',
 'box-shadow:0 26px 85px #0005}',
 '#pspro-download-box h2{font:750 22px/1.25 system-ui;margin:0 0 6px}',
 '#pspro-download-box p{margin:6px 0 15px;color:#5c6676}',
 '#pspro-download-box .platform{display:flex;align-items:center;justify-content:space-between;',
 'gap:10px;padding:13px 0;border-top:1px solid #e7eaf0}',
 '#pspro-download-box .platform strong{display:block;font-size:14px}',
 '#pspro-download-box .platform small{display:block;color:#758092;font-size:11px}',
 '#pspro-download-box .platform a{display:inline-flex;background:#1e67d4;color:white;',
 'text-decoration:none;align-items:center;padding:9px 14px;border-radius:9px;font-weight:650}',
 '#pspro-download-box .platform a:hover{background:#1453b2}',
 '#pspro-download-box .pending{color:#7b8491;font-size:12px}',
 '#pspro-download-box #pspro-dl-close{position:absolute;right:13px;top:13px;',
 'border:0;background:#e9edf4;width:29px;height:29px;border-radius:9px;cursor:pointer;font-size:19px}',
 '#pspro-download-box .note{font-size:12px;color:#697386;margin:10px 0 0}',
 '@media(max-width:760px){#pspro-desktop-get{right:12px;bottom:max(100px,env(safe-area-inset-bottom))}}'
].join('');
document.head.appendChild(style);document.body.appendChild(btn);
let overlay,loaded=false;
const RELEASE='powerslidepro-desktop-v0.1.0';
const ENDPOINT='https://api.github.com/repos/thythet/thythet/releases/tags/'+RELEASE;
function clear(){overlay?.remove();overlay=null;btn.focus();}
function row(label,sub){
 const el=document.createElement('div');el.className='platform';
 const title=document.createElement('span');
 const strong=document.createElement('strong');strong.textContent=label;
 const small=document.createElement('small');small.textContent=sub;
 title.append(strong,small);el.append(title);
 const target=document.createElement('span');target.className='pending';target.textContent='Checking…';
 el.append(target);return {el,target};
}
const WINDOWS=row('Windows 10 / 11','64-bit installer (.exe)');
const MAC_INTEL=row('macOS Intel','Intel Mac (.dmg)');
const MAC_ARM=row('macOS Apple Silicon','M1 / M2 / M3 / M4 (.dmg)');
function install(target,assets,match){
 target.replaceChildren();
 const asset=assets.find(x=>match.test(x.name)&&
   typeof x.browser_download_url==='string'&&
   x.browser_download_url.startsWith('https://github.com/thythet/thythet/releases/download/'));
 if(!asset){target.textContent='Coming soon';return;}
 const a=document.createElement('a');a.href=asset.browser_download_url;
 a.rel='noopener noreferrer';a.target='_blank';a.textContent='Download';
 a.setAttribute('download',asset.name);target.appendChild(a);
}
async function fetchAssets(){
 if(loaded)return;loaded=true;
 const entries=[WINDOWS,MAC_INTEL,MAC_ARM];
 try{
   const response=await fetch(ENDPOINT,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
   if(!response.ok)throw new Error('Release is not available');
   const obj=await response.json();
   const files=Array.isArray(obj.assets)?obj.assets:[];
   install(WINDOWS.target,files,/\.exe$/i);
   install(MAC_INTEL.target,files,/mac-x64\.dmg$/i);
   install(MAC_ARM.target,files,/mac-arm64\.dmg$/i);
 }catch(_){
   loaded=false;
   entries.forEach(x=>{x.target.textContent='Not available yet';});
 }
}
btn.addEventListener('click',()=>{
 if(overlay)return;
 overlay=document.createElement('div');overlay.id='pspro-download-backdrop';
 const dialog=document.createElement('section');
 dialog.id='pspro-download-box';dialog.setAttribute('role','dialog');
 dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Get PowerSlidePro Desktop');
 const close=document.createElement('button');close.type='button';close.id='pspro-dl-close';
 close.setAttribute('aria-label','Close');close.textContent='×';close.onclick=clear;
 const h=document.createElement('h2');h.textContent='PowerSlidePro Desktop';
 const p=document.createElement('p');p.textContent='Install once. Create and present offline with Khmer fonts and all 66 Bible books.';
 const note=document.createElement('p');note.className='note';
 note.textContent='Beta: installers are unsigned. Cloud synchronization needs internet.';
 const last=document.createElement('p');last.className='note';
 const releases=document.createElement('a');releases.textContent='View GitHub releases';
 releases.href='https://github.com/thythet/thythet/releases';releases.target='_blank';releases.rel='noopener noreferrer';
 last.append(releases);
 dialog.append(close,h,p,WINDOWS.el,MAC_INTEL.el,MAC_ARM.el,note,last);
 overlay.append(dialog);document.body.append(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)clear();});
 close.focus();fetchAssets();
});
document.addEventListener('keydown',e=>{if(overlay&&e.key==='Escape'){e.stopPropagation();clear();}});
})();
