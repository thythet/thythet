/* Tahoe79 audio embed compatibility; the root /index.html remains unchanged. */
(()=>{
 "use strict";
 const iframe=document.getElementById("listenWordFrame");
 if(!iframe)return;
 function onLoad(){
   try{
     const doc=iframe.contentDocument;
     if(!doc?.head || doc.location.origin!==location.origin)return;
     let style=doc.getElementById("tahoe79-listenword-style");
     if(!style){style=doc.createElement("style");style.id="tahoe79-listenword-style";doc.head.appendChild(style);}
     // The root site inserts this control in any iframe, assuming it is inside PrayInfo.
     // Tahoe has its own close/back controls, so hide this inaccurate control here.
     style.textContent="#prayInfoBackBtn{display:none!important}";
   }catch(err){console.warn("[Tahoe79 Audio] iframe adaptation unavailable",err);}
 }
 iframe.addEventListener("load",onLoad);
 if(iframe.contentDocument?.readyState==="complete")onLoad();
})();
