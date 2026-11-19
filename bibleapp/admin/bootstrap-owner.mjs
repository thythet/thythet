#!/usr/bin/env node
/* Provision the first owner securely with the Firebase Admin SDK.
   Must run on a trusted computer; never include service-account credentials in the app. */
import {applicationDefault,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";

const uid=process.argv[2];
if(!uid||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)){
  console.error("Usage: GOOGLE_APPLICATION_CREDENTIALS=/path/to/private-service-account.json FIREBASE_DATABASE_URL=https://<database-url> node bootstrap-owner.mjs <GOOGLE_SIGN_IN_UID>");
  process.exit(1);
}
const databaseURL=process.env.FIREBASE_DATABASE_URL;
if(!databaseURL||!/^https:\/\//.test(databaseURL)){
  console.error("FIREBASE_DATABASE_URL must be the exact HTTPS Realtime Database URL.");
  process.exit(1);
}
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS){
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to a PRIVATE local service-account JSON path. Never commit it.");
  process.exit(1);
}
const app=initializeApp({credential:applicationDefault(),databaseURL});
const auth=getAuth(app);
const user=await auth.getUser(uid);
console.log("About to provision owner:",user.email||"(no email)",user.uid);
if(!user.providerData.some(provider=>provider.providerId==="google.com")){
  console.error("This account must have authenticated using Google.");
  process.exit(1);
}
// Preserve other claims. Never grant Owner by client writes or a public email comparison.
await auth.setCustomUserClaims(uid,{...(user.customClaims||{}),bibleappOwner:true});
await getDatabase(app).ref("bibleapp/access/"+uid).set({role:"owner",status:"active",updatedAt:Date.now()});
console.log("Owner provisioned. Sign out/in or force-refresh the ID token in Bible App. Do not share the service-account JSON.");
process.exit(0);
