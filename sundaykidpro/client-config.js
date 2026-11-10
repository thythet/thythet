/**
 * SundayKidPro public Firebase Web SDK settings for the attendance app.
 * Existing values preserve the owner's current live site. For client delivery,
 * replace the Firebase project and site URL with the client's own settings.
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
export const clientDeployment=Object.freeze({
  siteUrls:["https://thythet.com/sundaykidpro/","https://www.thythet.com/sundaykidpro/"]
});
// Deployment safety guard; Firebase RTDB/Storage security rules are STILL required.
export function enforceClientDeployment(){
  const deployedBase=new URL(".",import.meta.url).href;
  const expected=Array.isArray(clientDeployment.siteUrls)&&clientDeployment.siteUrls.some(s=>{
    try{return new URL(s).href===deployedBase}catch{return false}
  });
  const cfg=firebaseConfig;
  const valid=["apiKey","authDomain","databaseURL","projectId","appId"].every(k=>
    typeof cfg[k]==="string"&&cfg[k].trim()&&!/YOUR_|REPLACE_|CHANGE_ME/.test(cfg[k]));
  const originalSite=["https://thythet.com/sundaykidpro/","https://www.thythet.com/sundaykidpro/"].includes(deployedBase);
  const blocked=!expected||!valid||(!originalSite&&cfg.projectId==="sunday-school-system-7f1f8");
  if(!blocked)return;
  const box=document.createElement("main");
  box.style.cssText="max-width:570px;margin:10vh auto;padding:28px;border:1px solid #cbd5e1;border-radius:18px;font:16px/1.6 system-ui,sans-serif;background:#fff;color:#15243a";
  const title=document.createElement("h1"),body=document.createElement("p");
  title.textContent="SundayKidPro — Setup required";
  body.textContent="This installation needs its client's own Firebase configuration and authorized site URL. Set up client-config.js before going live. This page has not connected to the owner's database.";
  box.append(title,body);
  document.body.replaceChildren(box);
  throw new Error("SundayKidPro client deployment validation failed: "+deployedBase);
}
