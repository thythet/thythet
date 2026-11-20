// Offline static and pure-function checks for the Firebase account-system foundation.
// These do not substitute for live Firebase, emulator, browser OAuth or desktop tests.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {runInNewContext} from "node:vm";
const web=new URL("../web/",import.meta.url),firebase=new URL("../firebase/",import.meta.url);
const read=(path)=>readFileSync(new URL(path,web),"utf8");
const html=read("index.html"),app=read("app.js"),auth=read("cloud-auth.js");
const config=read("firebase-config.js"),sw=read("sw.js");
const locFile=read("i18n.js");
// Security rules are private and MUST NOT be packaged in the public repository.
assert(!existsSync(new URL("database.rules.example.json",firebase)),"Firebase rules must not be committed to the public repository");
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
assert(app.includes('cloudUser?.photoURL')&&app.includes('cloudUser?.displayName'),"Google account photo and name must come from authenticated Firebase user");
assert(app.includes('photo.dataset.failedUrl')&&app.includes('if(!signedIn){'),"Missing avatar fallback or signed-out identity reset");
assert(app.includes('setAccountAvatarMode(photo,"photo")')&&app.includes('setAccountAvatarMode(photo,"initials")'),"Profile photo and initials must have exclusive display modes");
assert(auth.includes('await auth.authStateReady()'),"Cloud client must restore saved sessions before reporting ready");
assert(auth.includes('indexedDBLocalPersistence')&&!auth.includes('inMemoryPersistence'),"Never silently use temporary memory-only sign-in");
assert(app.includes('cloudLoading&&!signedIn?tr("firebaseLoading")'),"Account screen must show loading while restoring login");
assert(app.includes('updateViaCache:"none"'),"Service worker update checks must not reuse stale cache");
assert(auth.includes('getIdTokenResult()')&&auth.includes('bibleappOwner'),"Owner claim must come from authenticated ID token");
assert(auth.includes('import(FIREBASE_SDK+"firebase-database.js")'),"Cloud database module missing");
assert(auth.includes('desktop-google-oauth-required'),"Desktop OAuth must not be falsely advertised");
assert(app.includes('confirm(tr("confirmUploadCloud"))')&&app.includes('confirm(tr("confirmRestoreCloud"))'),"Cloud write/restore require confirmation");
assert(app.includes('bibleapp.study.v1')&&app.includes('bibleapp.prefs.v1'),"Local study storage keys must remain");
assert(sw.includes("bibleapp-web-v0.3.2")&&sw.includes("./firebase-config.js")&&sw.includes("./cloud-auth.js"),"Offline shell must include the cloud modules");
// Require a complete Firebase client config when enabled; a blank template remains valid for offline-only use.
const testConfigContext={window:{}};
runInNewContext(config,testConfigContext);
const publicConfig=testConfigContext.window.BIBLEAPP_FIREBASE_CONFIG;
const keys=['apiKey','authDomain','databaseURL','projectId','appId'];
assert(publicConfig&&keys.every(k=>typeof publicConfig[k]==='string'),'Missing required Firebase config fields');
const filled=keys.filter(k=>publicConfig[k].trim());
assert(filled.length===0||filled.length===keys.length,'Firebase config must be complete or blank');
if(filled.length){
  assert(publicConfig.databaseURL.startsWith('https://'),'Firebase database URL must be HTTPS');
  assert(publicConfig.authDomain.endsWith('.firebaseapp.com'),'Unexpected Firebase auth domain');
}
assert(!/private_key|BEGIN PRIVATE KEY|serviceAccountKey/.test([app,auth,config].join("\n")),"Private service-account credentials must never appear in client assets");
// Static client checks intentionally cannot prove private server-side RTDB rules.
// Validate the deployed rules separately via Firebase Console and Emulator Suite.
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
console.log("Bible App Firebase client checks passed: config, claims, pending/blocked access, cloud backups and offline preservation. Private RTDB rules require separate Firebase Emulator tests.");
