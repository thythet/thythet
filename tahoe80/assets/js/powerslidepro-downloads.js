/* Tahoe80: thechat-style Get Software library, verified GitHub release links only. */
(()=>{
'use strict';
const RELEASE='powerslidepro-desktop-v0.1.10';
const ENDPOINT='https://api.github.com/repos/thythet/thythet/releases/tags/'+RELEASE;
const btn=document.createElement('button');
btn.id='pspro-desktop-get';btn.type='button';btn.setAttribute('aria-haspopup','dialog');
btn.setAttribute('aria-label','Get Software');
btn.innerHTML='<span class="software-platform-icons" aria-hidden="true"><i class="ri-apple-fill"></i><i class="ri-windows-fill"></i></span><span>Get Software</span>';
const style=document.createElement('style');
style.textContent="#pspro-desktop-get,#pspro-download-backdrop{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}\n#pspro-desktop-get{position:fixed;z-index:9;bottom:max(22px,env(safe-area-inset-bottom));right:18px;display:flex;align-items:center;gap:9px;padding:9px 14px;min-height:37px;border:1.5px solid #abcfff;border-radius:11px;background:#e5f0ff;color:#076be2;font-size:12px;font-weight:680;box-shadow:0 3px 12px #1f6ac916;cursor:pointer;transition:background .16s,border-color .16s,box-shadow .16s,transform .16s}\n#pspro-desktop-get:hover{background:#d7e9ff;border-color:#87b8fc;box-shadow:0 4px 16px #126ee32a;transform:translateY(-1px)}\n#pspro-desktop-get:active{background:#c5dfff;transform:translateY(0)}\n#pspro-desktop-get:focus-visible,#pspro-download-box button:focus-visible,#pspro-download-box a:focus-visible{outline:3px solid #80b6ff;outline-offset:2px}\n#pspro-desktop-get .software-platform-icons{display:inline-flex;align-items:center;gap:5px;font-size:16px;line-height:1}\n#pspro-download-backdrop{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:14px;background:rgba(26,32,44,.34);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}\n#pspro-download-box{position:relative;box-sizing:border-box;width:min(472px,100%);max-height:min(590px,calc(100dvh - 28px));overflow-y:auto;padding:22px;border:1px solid rgba(255,255,255,.94);border-radius:20px;background:rgba(249,251,254,.98);color:#242a35;box-shadow:0 26px 80px rgba(16,29,51,.25),0 3px 14px rgba(14,39,77,.09);font-size:12px;line-height:1.5}\n#pspro-download-box *{box-sizing:border-box}\n#pspro-download-box .sw-head{display:flex;align-items:center;gap:10px;padding-right:27px;margin-bottom:15px}\n#pspro-download-box .sw-head-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;border:1px solid #d4e2fb;background:#e8f2ff;color:#0873eb;font-size:17px}\n#pspro-download-box h2{font-size:16px;line-height:1.2;font-weight:750;letter-spacing:-.3px;margin:0}\n#pspro-download-box .sw-overline{color:#7a869a;font-size:10px;letter-spacing:.3px}\n#pspro-download-box #pspro-dl-close{position:absolute;right:15px;top:15px;display:grid;place-items:center;border:0;width:27px;height:27px;border-radius:9px;background:#ebeff5;color:#697688;font-size:18px;cursor:pointer}\n#pspro-download-box #pspro-dl-close:hover{background:#dde7f2;color:#1e293b}\n#pspro-download-box .sw-app{display:flex;align-items:center;gap:11px;margin:0 0 7px;padding:10px;border:1px solid #e3e9f1;border-radius:13px;background:#fff}\n#pspro-download-box .sw-logo{width:45px;height:45px;object-fit:contain;flex:none}\n#pspro-download-box .sw-app-title{font-size:13px;font-weight:750;letter-spacing:-.1px}\n#pspro-download-box .sw-app-sub{font-size:10.5px;color:#778297}\n#pspro-download-box .sw-beta{margin-left:auto;align-self:flex-start;white-space:nowrap;border:1px solid #e0e9f6;background:#f0f6ff;color:#5486c6;border-radius:7px;padding:2px 6px;font-size:9px;font-weight:680}\n#pspro-download-box .sw-platform-heading{padding:9px 1px 4px;color:#7b889b;text-transform:uppercase;letter-spacing:.7px;font-size:10px;font-weight:700}\n#pspro-download-box .sw-platform{display:flex;align-items:center;gap:10px;padding:9px 1px;min-height:53px;border-bottom:1px solid #e8ebef}\n#pspro-download-box .sw-platform-icon{display:grid;place-items:center;flex:none;width:31px;height:31px;border-radius:9px;background:#f1f4f8;color:#343d4c;font-size:17px}\n#pspro-download-box .sw-platform-label{min-width:0;flex:1}\n#pspro-download-box .sw-platform-label strong{display:block;font-size:11.8px;font-weight:690;color:#202b39}\n#pspro-download-box .sw-platform-label small{display:block;margin-top:1px;color:#8a95a4;font-size:10px}\n#pspro-download-box .sw-download{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:7px 11px;border:1.5px solid #add0ff;border-radius:9px;background:#e5f0ff;color:#0a71eb;text-decoration:none;font-size:11px;font-weight:700;transition:background .16s,border-color .16s,transform .16s}\n#pspro-download-box .sw-download:hover{background:#d5e7ff;border-color:#8fbdff;transform:translateY(-1px)}\n#pspro-download-box .sw-status{color:#98a1ad;font-size:10.5px;white-space:nowrap}\n#pspro-download-box .sw-footer{margin-top:12px;padding-top:10px;border-top:1px solid #e6ebf1}\n#pspro-download-box .sw-footer p{margin:0 0 7px;color:#7b8798;font-size:10.5px}\n#pspro-download-box .sw-footer a{color:#3679d6;text-decoration:none;font-size:10.5px;font-weight:600}\n#pspro-download-box .sw-footer a:hover{text-decoration:underline}\n#pspro-download-box .sw-links{display:flex;align-items:center;gap:15px;flex-wrap:wrap}\n@media(max-width:760px){#pspro-desktop-get{right:12px;bottom:max(100px,env(safe-area-inset-bottom))}#pspro-download-box{padding:17px;border-radius:16px}}\n@media(prefers-reduced-motion:reduce){#pspro-desktop-get,#pspro-download-box *{transition:none!important}}";
document.head.appendChild(style);document.body.appendChild(btn);
let overlay=null,lastFocus=null;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function close(){if(!overlay)return;overlay.remove();overlay=null;lastFocus?.focus();lastFocus=null;}
const rows=[];
function row(icon,title,detail,regex){
 const r=el('div','sw-platform'),i=el('span','sw-platform-icon');
 i.innerHTML='<i class="'+icon+'" aria-hidden="true"></i>';
 const l=el('span','sw-platform-label');
 l.append(el('strong',null,title),el('small',null,detail));
 const status=el('span','sw-status','Checking…');
 r.append(i,l,status);rows.push({status,regex});return r;
}
async function loadReleases(){
 try{
   const r=await fetch(ENDPOINT,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
   if(!r.ok)throw Error('No release yet');
   const j=await r.json(),files=Array.isArray(j.assets)?j.assets:[];
   for(const x of rows){
     const asset=files.find(a=>x.regex.test(a.name||'')&&typeof a.browser_download_url==='string'
       &&a.browser_download_url.startsWith('https://github.com/thythet/thythet/releases/download/'));
     x.status.replaceChildren();
     if(!asset){x.status.textContent='Coming soon';continue;}
     const a=el('a','sw-download');a.href=asset.browser_download_url;
     a.rel='noopener noreferrer';a.target='_blank';
     a.innerHTML='<i class="ri-download-2-line" aria-hidden="true"></i><span>Download</span>';
     a.setAttribute('aria-label','Download '+asset.name);x.status.append(a);
   }
   const sha=files.find(a=>a.name==='SHA256SUMS.txt');
   const link=document.getElementById('pspro-download-checksums');
   if(link&&sha?.browser_download_url?.startsWith('https://github.com/thythet/thythet/releases/download/')){
     link.href=sha.browser_download_url;link.hidden=false;
   }
 }catch(_){rows.forEach(x=>x.status.textContent='Not available');}
}
btn.addEventListener('click',()=>{
 if(overlay)return;
 rows.length=0;lastFocus=document.activeElement;overlay=el('div');overlay.id='pspro-download-backdrop';
 const d=el('section');d.id='pspro-download-box';d.setAttribute('role','dialog');
 d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','pspro-software-title');
 const x=el('button',null,'×');x.id='pspro-dl-close';x.type='button';
 x.setAttribute('aria-label','Close Software Library');x.onclick=close;
 const h=el('header','sw-head'),hicon=el('span','sw-head-icon');
 hicon.innerHTML='<i class="ri-apps-2-line" aria-hidden="true"></i>';
 const htext=el('div'),title=el('h2',null,'Software Library');title.id='pspro-software-title';
 htext.append(title,el('div','sw-overline','Download & install on your computer'));h.append(hicon,htext);
 const app=el('section','sw-app'),logo=el('img','sw-logo');
 logo.src='assets/powerslidepro-logo.png';logo.alt='PowerSlidePro';
 const info=el('div');info.append(el('div','sw-app-title','PowerSlidePro Desktop'),
   el('div','sw-app-sub','Offline presentations · Khmer Bible · 66 books'));
 app.append(logo,info,el('span','sw-beta','BETA'));
 const heading=el('div','sw-platform-heading','Available for');
 const win=row('ri-windows-fill','Windows 10 / 11','64-bit · EXE',/PowerSlidePro-0\.1\.10-win-x64\.exe$/i);
 const arm=row('ri-apple-fill','macOS · Apple Silicon','M-series Mac · DMG',/PowerSlidePro-0\.1\.10-mac-arm64\.dmg$/i);
 const intel=row('ri-apple-fill','macOS · Intel','Intel Mac · DMG',/PowerSlidePro-0\.1\.10-mac-x64\.dmg$/i);
 const footer=el('footer','sw-footer');
 footer.append(el('p',null,'Built and Prepared by Thet · Local presentations work offline.'),
   el('p',null,'Unsigned beta: Windows SmartScreen or macOS Gatekeeper may show a warning.'));
 const links=el('div','sw-links');
 const releases=el('a',null,'GitHub Releases');releases.href='https://github.com/thythet/thythet/releases';
 releases.target='_blank';releases.rel='noopener noreferrer';
 const checksum=el('a',null,'Verify SHA-256');checksum.id='pspro-download-checksums';checksum.hidden=true;
 checksum.target='_blank';checksum.rel='noopener noreferrer';
 links.append(releases,checksum);footer.append(links);
 d.append(x,h,app,heading,win,arm,intel,footer);
 overlay.append(d);document.body.append(overlay);
 overlay.onclick=e=>{if(e.target===overlay)close();};
 x.focus();loadReleases();
});
document.addEventListener('keydown',e=>{if(overlay&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
})();
