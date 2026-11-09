/**
 * SundayKidPro public Firebase Web SDK settings, shared by main, dashboard and chat.
 * Existing values preserve the owner's current live site. For client delivery,
 * REPLACE BOTH backend projects and site URLs. Read CLIENT-HANDOFF.md.
 * NEVER put service-account keys, Cloudinary secrets or passwords in this file.
 */
export const firebaseConfig=Object.freeze({
  apiKey:"AIzaSyD4SGK5Gvo1xtrljap1zay1bwDxlrlGmoY",
  authDomain:"sunday-school-system-7f1f8.firebaseapp.com",
  databaseURL:"https://sunday-school-system-7f1f8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"sunday-school-system-7f1f8",
  storageBucket:"sunday-school-system-7f1f8.firebasestorage.app",
  messagingSenderId:"855692058999",
  appId:"1:855692058999:web:b3c41eae77488670b50172"
});
export const chatFirebaseConfig=Object.freeze({
  apiKey:"AIzaSyBof66mcb0L-GHFvn1wNVAhSFeHaIzep4M",
  authDomain:"thechat-a79b9.firebaseapp.com",
  databaseURL:"https://thechat-a79b9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"thechat-a79b9",
  storageBucket:"thechat-a79b9.firebasestorage.app",
  messagingSenderId:"352306422331",
  appId:"1:352306422331:web:9b15b0283104f48d99321e",
  measurementId:"G-L3KHEB15ZG"
});
export const clientDeployment=Object.freeze({
  siteUrls:["https://thythet.com/sundaykidpro/","https://www.thythet.com/sundaykidpro/"],
  chatEnabled:true,
  chatBootstrapAdminEmail:"thythetopen@gmail.com"
});
// Deployment safety guard; Firebase RTDB/Storage security rules are STILL required.
export function enforceClientDeployment(service="attendance"){
  const deployedBase=new URL(".",import.meta.url).href;
  const expected=Array.isArray(clientDeployment.siteUrls)&&clientDeployment.siteUrls.some(s=>{
    try{return new URL(s).href===deployedBase}catch{return false}
  });
  const isChat=service==="chat",cfg=isChat?chatFirebaseConfig:firebaseConfig;
  const valid=["apiKey","authDomain","databaseURL","projectId","appId"].every(k=>
    typeof cfg[k]==="string"&&cfg[k].trim()&&!/YOUR_|REPLACE_|CHANGE_ME/.test(cfg[k]));
  const originalSite=["https://thythet.com/sundaykidpro/","https://www.thythet.com/sundaykidpro/"].includes(deployedBase);
  const originalProject=isChat?"thechat-a79b9":"sunday-school-system-7f1f8";
  const blocked=!expected||!valid||(isChat&&!clientDeployment.chatEnabled)||
    (!originalSite&&(cfg.projectId===originalProject||
     (isChat&&clientDeployment.chatBootstrapAdminEmail==="thythetopen@gmail.com")));
  if(!blocked)return;
  const box=document.createElement("main");
  box.style.cssText="max-width:570px;margin:10vh auto;padding:28px;border:1px solid #cbd5e1;border-radius:18px;font:16px/1.6 system-ui,sans-serif;background:#fff;color:#15243a";
  const title=document.createElement("h1"),body=document.createElement("p");
  title.textContent="SundayKidPro — Setup required";
  body.textContent="This installation needs its client's own Firebase configuration and authorized site URL. Set up client-config.js before going live. This page has not connected to the owner's database.";
  box.append(title,body);
  document.body.replaceChildren(box);
  throw new Error("SundayKidPro client deployment validation failed: "+service+" "+deployedBase);
}
