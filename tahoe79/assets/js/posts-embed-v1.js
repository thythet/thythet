/* Tahoe79: isolate Posts embedded feed from its standalone page canvas.
   Original /posts/ files, Firebase, Cloudinary, authentication and post UI are unchanged. */
(()=>{
"use strict";
const frame=document.getElementById("postsFrame");
if(!frame)return;
const STYLE_ID="tahoe79-posts-embed";
const styles=[
 "html,html:root,body,body.dark-mode{background:none!important;background-color:transparent!important;background-image:none!important;}",
 "html,body{min-height:100%!important;}",
 "body{margin:0!important;overflow-x:hidden!important;}",
 "html::before,html::after,body::before,body::after{background:none!important;background-image:none!important;box-shadow:none!important;}",
 /* Exact original Posts width on mobile/embedded frames: 390px card + 20px padding. */
 ":root{--card-width:390px!important;}",
 "main.app{display:block!important;box-sizing:border-box!important;width:min(100%,410px)!important;max-width:100%!important;",
 "margin-left:auto!important;margin-right:auto!important;background:none!important;background-color:transparent!important;background-image:none!important;}",
 /* Preserve the original post backgrounds; do not alter .post, media, nav or overlay surfaces. */
 "@media(min-width:720px){main.app{padding-top:12px!important;}}"
].join("\n");
function clearCanvas(el){
 if(!el)return;
 const css=el.style;
 if(css.getPropertyValue("background-color")!=="transparent" || css.getPropertyPriority("background-color")!=="important")
   css.setProperty("background-color","transparent","important");
 if(css.getPropertyValue("background-image")!=="none" || css.getPropertyPriority("background-image")!=="important")
   css.setProperty("background-image","none","important");
}
let observer=null;
function apply(){
 try{
   const doc=frame.contentDocument;
   if(!doc?.head||!doc.body||doc.location.origin!==location.origin)return;
   if(observer){observer.disconnect();observer=null}
   let stylesheet=doc.getElementById(STYLE_ID);
   if(!stylesheet){stylesheet=doc.createElement("style");stylesheet.id=STYLE_ID;doc.head.appendChild(stylesheet);}
   if(stylesheet.textContent!==styles)stylesheet.textContent=styles;
   clearCanvas(doc.documentElement);
   clearCanvas(doc.body);
   clearCanvas(frame);
   // Posts can toggle theme classes and inline styles; keep only the canvas clear.
   // Avoid observing subtree or reacting to individual posts, images and scroll events.
   observer=new MutationObserver(()=>{
     clearCanvas(doc.documentElement);
     clearCanvas(doc.body);
   });
   observer.observe(doc.documentElement,{attributes:true,attributeFilter:["style","class"]});
   observer.observe(doc.body,{attributes:true,attributeFilter:["style","class"]});
 }catch(error){
   console.warn("[Tahoe79 Posts] Transparent iframe unavailable",error);
 }
}
frame.addEventListener("load",apply);
if(frame.contentDocument?.readyState==="complete")apply();
})();
