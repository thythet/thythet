// Offline static and pure-function checks for the Firebase account-system foundation.
// These do not substitute for live Firebase, emulator, browser OAuth or desktop tests.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const web=new URL("../web/",import.meta.url),firebase=new URL("../firebase/",import.meta.url);
const read=(path)=>readFileSync(new URL(path,web),"utf8");
const html=read("index.html"),app=read("app.js"),auth=read("cloud-auth.js");
const config=read("firebase-config.js"),sw=read("sw.js");
const locFile=read("i18n.js");
const rules=JSON.parse(readFileSync(new URL("database.rules.example.json",firebase),"utf8"));
assert(!html.includes('Google authentication is not active in this first release'),"Placeholder sign-in text must be removed");
for(const id of ["googleLogin","authProfile","authUserName","authUserEmail","authUserUid","authRole","authLogout","adminLaunch","cloudUpload","cloudDownload","cloudRestore","usersPage","usersList","usersSearch","usersRefresh","usersSummary"]){
  assert(html.includes('id="'+id+'"'),"Missing Firebase UI element "+id);
}
assert(html.includes('src="./firebase-config.js"'),"Public config should load before app");
assert(!app.includes('googleLogin").onclick=()=>toast(tr("googlePlanned"))'),"Google login must no longer be inert");
assert(app.includes('void initCloud()')&&app.includes('cloudClient.signIn()'),"Sign-in must initialize Firebase and call Google auth");
assert(app.includes('isCloudAdmin()')&&app.includes('cloudClient.updateAccess('),"Client needs admin-only controls");
assert(auth.includes('signInWithPopup')&&auth.includes('firebase-auth.js'),"Google popup should use Firebase Authentication");
assert(auth.includes('onAuthStateChanged')&&auth.includes('bibleapp/access/'),"Access must follow authenticated UID");
assert(auth.includes('getIdTokenResult()')&&auth.includes('bibleappOwner'),"Owner claim must come from authenticated ID token");
assert(auth.includes('import(FIREBASE_SDK+"firebase-database.js")'),"Cloud database module missing");
assert(auth.includes('desktop-google-oauth-required'),"Desktop OAuth must not be falsely advertised");
assert(app.includes('confirm(tr("confirmUploadCloud"))')&&app.includes('confirm(tr("confirmRestoreCloud"))'),"Cloud write/restore require confirmation");
assert(app.includes('bibleapp.study.v1')&&app.includes('bibleapp.prefs.v1'),"Local study storage keys must remain");
assert(sw.includes("bibleapp-web-v0.2.0")&&sw.includes("./firebase-config.js")&&sw.includes("./cloud-auth.js"),"Offline shell must include the cloud modules");
for(const p of ["apiKey","authDomain","databaseURL","projectId","appId"])assert(config.includes(p+':""'),"Firebase config template should not ship with real credentials: "+p);
assert(!/private_key|BEGIN PRIVATE KEY|serviceAccountKey/.test([app,auth,config].join("\n")),"Private service-account credentials must never appear in client assets");
const roleRules=rules.rules.bibleapp.access;
assert(roleRules[".read"].includes("bibleappOwner"),"Owner must be server-verified in admin read rule");
assert(roleRules.$uid[".write"].includes("bibleappOwner"),"Only owner/authorized admin may alter user access");
assert(!roleRules.$uid[".write"].includes("auth.uid === $uid"),"Self-granted roles are forbidden");
assert(roleRules.$uid[".write"].includes("newData.child('role').val() !== 'admin'"),"Other admins cannot issue admin roles");
assert(roleRules.$uid[".write"].includes("data.child('role').val() !== 'admin'"),"Admins cannot moderate each other");
assert(!roleRules.$uid[".validate"].includes("=== 'owner'"),"Owner records cannot be written from a client");
const study=rules.rules.bibleapp.study.$uid;
assert(study[".read"].includes("auth.uid === $uid")&&study[".read"].includes("=== 'active'"),"Cloud studies must be private to active users");
assert(study[".write"].includes("auth.uid === $uid")&&study[".write"].includes("=== 'active'"),"Cloud study writes require owner UID and approval");
assert(rules.rules[".read"]===false&&rules.rules[".write"]===false,"RTDB root permissions must be deny-by-default");
const fn=(name)=>auth.match(new RegExp("export function "+name+"\\([\\s\\S]*?\\n\\}"))?.[0].replace("export ","");
const validFn=fn("validFirebaseConfig"),accessFn=fn("effectiveAccess");
assert(validFn&&accessFn,"Pure config/access check functions should be extractable");
const result=runInNewContext([
  validFn,accessFn,
  'const good={apiKey:"real",authDomain:"a.firebaseapp.com",databaseURL:"https://a.firebasedatabase.app",projectId:"a",appId:"1:demo"};',
  '({valid:validFirebaseConfig(good),missing:validFirebaseConfig({...good,apiKey:""}),noHttps:validFirebaseConfig({...good,databaseURL:"http://a"}),',
  'pending:effectiveAccess(null,false),member:effectiveAccess({role:"user",status:"active"},false),',
  'blocked:effectiveAccess({role:"admin",status:"blocked"},false),owner:effectiveAccess(null,true)})'
].join("\n"));
assert.equal(result.valid,true);assert.equal(result.missing,false);assert.equal(result.noHttps,false);
assert.equal(result.pending.status,"pending");assert.equal(result.member.status,"active");assert.equal(result.blocked.status,"blocked");
assert.equal(result.owner.role,"owner");assert.equal(result.owner.status,"active");
assert(locFile.includes("firebaseNotConfigured")&&locFile.includes("manageUsers"),"Bilingual account labels missing");
console.log("Bible App Firebase checks passed: config validation, owner-only bootstrap, secure RTDB roles, pending/blocked access, cloud backups and offline preservation.");
