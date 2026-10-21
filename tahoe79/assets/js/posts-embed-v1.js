/* Tahoe79-only visual adapter for existing same-origin /posts/ app.
   No changes to /posts/ Firebase, Cloudinary, HTML or standalone appearance. */
(()=>{
 "use strict";
 const frame=document.getElementById("postsFrame");
 if(!frame)return;
 const STYLE_ID="tahoe79-posts-embed";
 const css=[
  "html,body,body.dark-mode{background:transparent!important;background-image:none!important;}",
  "html,body{min-height:100%!important;}",
  "body{margin:0!important;overflow-x:hidden!important;}",
  "body::before,body::after{background:none!important;box-shadow:none!important;}",
  ".app{margin-left:auto!important;margin-right:auto!important;}",
  "@media (min-width:720px){.app{padding-top:12px!important;}}"
 ].join("\n");
 function apply(){
  try{
    const doc=frame.contentDocument;
    if(!doc?.head||!doc.body||doc.location.origin!==location.origin)return;
    if(doc.getElementById(STYLE_ID))return;
    const style=doc.createElement("style");style.id=STYLE_ID;
    style.textContent=css;doc.head.append(style);
  }catch(e){console.warn("[Tahoe79 Posts] Could not style embedded page",e);}
 }
 frame.addEventListener("load",apply);
 if(frame.contentDocument?.readyState==="complete")apply();
})();
