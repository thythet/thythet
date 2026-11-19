#!/usr/bin/env node
/* Trusted owner CLI: disable, enable, or permanently delete a Firebase Auth user.
   Never run this inside the browser, Tauri app, or on an untrusted machine. */
import {applicationDefault,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";
const [action,uid,confirmation]=process.argv.slice(2);
if(!["disable","enable","delete"].includes(action)||!uid||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)){
  console.error("Usage: node manage-user.mjs <disable|enable|delete> <FIREBASE_UID> [--confirm-delete]");
  process.exit(1);
}
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS||!/^https:\/\//.test(process.env.FIREBASE_DATABASE_URL||"")){
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_DATABASE_URL privately before running.");
  process.exit(1);
}
if(action==="delete"&&confirmation!=="--confirm-delete"){
  console.error("Permanent deletion removes the Auth user, their profile, permissions, and cloud study data. Pass --confirm-delete to proceed.");
  process.exit(1);
}
const app=initializeApp({credential:applicationDefault(),databaseURL:process.env.FIREBASE_DATABASE_URL});
const auth=getAuth(app),db=getDatabase(app);
const person=await auth.getUser(uid);
const access=await db.ref("bibleapp/access/"+uid).get();
if(person.customClaims?.bibleappOwner===true||access.val()?.role==="owner"){
  console.error("Owner accounts are protected from this command.");
  process.exit(1);
}
if(action==="disable"){
  await auth.updateUser(uid,{disabled:true});
  await db.ref("bibleapp/access/"+uid).set({
    role:access.val()?.role==="admin"?"admin":access.val()?.role==="editor"?"editor":"user",
    status:"blocked",updatedAt:Date.now()
  });
  await auth.revokeRefreshTokens(uid);
}else if(action==="enable"){
  await auth.updateUser(uid,{disabled:false});
  await db.ref("bibleapp/access/"+uid).set({
    role:access.val()?.role==="admin"?"admin":access.val()?.role==="editor"?"editor":"user",
    status:"active",updatedAt:Date.now()
  });
}else{
  await auth.deleteUser(uid);
  await db.ref("bibleapp/profiles/"+uid).remove();
  await db.ref("bibleapp/access/"+uid).remove();
  await db.ref("bibleapp/study/"+uid).remove();
}
console.log(action+" completed for UID "+uid+".");
process.exit(0);
