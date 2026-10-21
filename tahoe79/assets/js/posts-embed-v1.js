/* Tahoe79-only Posts feed adapter. Does not modify the original /posts/ files or data. */
(()=>{
  "use strict";
  const frame=document.getElementById("postsFrame");
  if(!frame)return;
  const STYLE_ID="tahoe79-posts-embed";
  const styles=[
    /* Show the Tahoe wallpaper behind the iframe instead of the Posts page backdrop. */
    "html,html:root,body,body.dark-mode{background:transparent!important;background-color:transparent!important;background-image:none!important;}",
    "html,body{min-height:100%!important;}",
    "body{margin:0!important;overflow-x:hidden!important;}",
    "body::before,body::after{background:transparent!important;background-image:none!important;box-shadow:none!important;}",
    /* The normal Posts layout is a 390px feed plus 10px padding per side (410px).
       Preserve the feed's look instead of stretching photos or individual cards. */
    ".app{width:min(100%,calc(var(--card-width) + 20px))!important;margin:0 auto!important;background:transparent!important;background-image:none!important;}",
    "@media (min-width:720px){.app{padding-top:12px!important;}}"
  ].join("\n");
  function apply(){
    try{
      const doc=frame.contentDocument;
      if(!doc?.head||!doc.body||doc.location.origin!==location.origin)return;
      let style=doc.getElementById(STYLE_ID);
      if(!style){style=doc.createElement("style");style.id=STYLE_ID;doc.head.appendChild(style);}
      style.textContent=styles;
      /* The iframe, its document canvas and Tahoe window all have transparent backgrounds. */
      doc.documentElement.style.setProperty("background-color","transparent","important");
      doc.body.style.setProperty("background-color","transparent","important");
      frame.style.setProperty("background-color","transparent","important");
    }catch(e){console.warn("[Tahoe79 Posts] Embedded styling unavailable",e);}
  }
  frame.addEventListener("load",apply);
  if(frame.contentDocument?.readyState==="complete")apply();
})();
