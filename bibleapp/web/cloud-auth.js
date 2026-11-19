/* Bible App Firebase account layer — load only when a project is configured.
   SDK version is pinned; public Firebase web config is never a service-account secret.
   Google popup is supported on ordinary HTTPS browsers, not embedded desktop webviews. */
const FIREBASE_SDK="https://www.gstatic.com/firebasejs/13.4.0/";
export function validFirebaseConfig(config){
  return !!config&&["apiKey","authDomain","databaseURL","projectId","appId"].every(
    key=>typeof config[key]==="string"&&config[key].trim()&&!/YOUR_|REPLACE_|PLACEHOLDER/i.test(config[key])
  )&&/^https:\/\//.test(config.databaseURL);
}
export function isDesktopWebview(){
  return !!window.__TAURI_INTERNALS__||location.protocol==="tauri:"||location.hostname==="tauri.localhost";
}
export function effectiveAccess(record,ownerClaim){
  if(ownerClaim)return {role:"owner",status:"active"};
  const role=["user","editor","admin"].includes(record?.role)?record.role:"user";
  const status=["pending","active","blocked"].includes(record?.status)?record.status:"pending";
  return {role,status};
}
export async function createCloudClient(config,callback){
  if(!validFirebaseConfig(config))throw Error("Firebase configuration is incomplete");
  const [appSdk,authSdk,dbSdk]=await Promise.all([
    import(FIREBASE_SDK+"firebase-app.js"),
    import(FIREBASE_SDK+"firebase-auth.js"),
    import(FIREBASE_SDK+"firebase-database.js")
  ]);
  const app=appSdk.initializeApp(config,"bibleapp");
  const auth=authSdk.getAuth(app);
  const db=dbSdk.getDatabase(app);
  const provider=new authSdk.GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  // The SDK may be loaded on platforms where durable storage is unavailable.
  try{await authSdk.setPersistence(auth,authSdk.browserLocalPersistence)}
  catch{await authSdk.setPersistence(auth,authSdk.inMemoryPersistence)}
  let user=null,access={role:"guest",status:"signed-out"},owner=false,unsubAccess=null,sequence=0;
  const notify=(error)=>callback({user,access,error:error?String(error.message||error):null});
  authSdk.onAuthStateChanged(auth,async incoming=>{
    const seq=++sequence;
    if(unsubAccess){unsubAccess();unsubAccess=null}
    user=incoming;
    owner=false;
    access=incoming?{role:"user",status:"pending"}:{role:"guest",status:"signed-out"};
    notify();
    if(!incoming)return;
    try{
      const idToken=await incoming.getIdTokenResult();
      if(seq!==sequence)return;
      owner=idToken.claims.bibleappOwner===true;
      access=effectiveAccess(null,owner);notify();
      // Users can register their own basic profile; access rights are admin-controlled.
      const path="bibleapp/profiles/"+incoming.uid;
      const prior=await dbSdk.get(dbSdk.ref(db,path));
      if(seq!==sequence)return;
      const prev=prior.val()||{};
      const profile={
        uid:incoming.uid,
        displayName:String(incoming.displayName||"User").slice(0,120),
        email:String(incoming.email||"").slice(0,254),
        photoURL:String(incoming.photoURL||"").slice(0,2048),
        provider:"google.com",
        createdAt:Number(prev.createdAt)||Date.now(),
        lastSeenAt:Date.now()
      };
      try{await dbSdk.set(dbSdk.ref(db,path),profile)}catch(error){if(!owner)notify(error)}
      if(seq!==sequence)return;
      const accessPath=dbSdk.ref(db,"bibleapp/access/"+incoming.uid);
      unsubAccess=dbSdk.onValue(accessPath,snapshot=>{
        if(seq!==sequence)return;
        access=effectiveAccess(snapshot.val(),owner);
        notify();
      },error=>notify(error));
    }catch(error){if(seq===sequence)notify(error)}
  });
  return {
    async signIn(){
      if(isDesktopWebview())throw Error("desktop-google-oauth-required");
      return authSdk.signInWithPopup(auth,provider);
    },
    async signOut(){return authSdk.signOut(auth)},
    getCurrent(){return {user,access}},
    async listUsers(){
      if(!user||!["owner","admin"].includes(access.role)||access.status!=="active")throw Error("admin-required");
      const [profiles,rights]=await Promise.all([
        dbSdk.get(dbSdk.ref(db,"bibleapp/profiles")),
        dbSdk.get(dbSdk.ref(db,"bibleapp/access"))
      ]);
      return Object.values(profiles.val()||{}).filter(x=>x&&typeof x==="object"&&x.uid).map(profile=>({
        ...profile,access:effectiveAccess((rights.val()||{})[profile.uid],false)
      })).sort((a,b)=>String(a.displayName||"").localeCompare(String(b.displayName||"")));
    },
    async updateAccess(uid,role,status){
      if(!user||!["owner","admin"].includes(access.role)||access.status!=="active")throw Error("admin-required");
      if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)||uid===user.uid)throw Error("invalid-target");
      if(!["user","editor","admin"].includes(role)||!["pending","active","blocked"].includes(status))throw Error("invalid-access");
      if(access.role!=="owner"&&role==="admin")throw Error("owner-only");
      return dbSdk.set(dbSdk.ref(db,"bibleapp/access/"+uid),{role,status,updatedAt:Date.now()});
    },
    async uploadStudy(study){
      if(!user||access.status!=="active")throw Error("account-not-active");
      const payload={bookmarks:study.bookmarks||{},highlights:study.highlights||{},notes:study.notes||{},updatedAt:Date.now()};
      if(JSON.stringify(payload).length>1_000_000)throw Error("cloud-backup-too-large");
      await dbSdk.set(dbSdk.ref(db,"bibleapp/study/"+user.uid),payload);
      return payload.updatedAt;
    },
    async downloadStudy(){
      if(!user||access.status!=="active")throw Error("account-not-active");
      const result=await dbSdk.get(dbSdk.ref(db,"bibleapp/study/"+user.uid));
      const data=result.val();
      return data?{bookmarks:data.bookmarks||{},highlights:data.highlights||{},notes:data.notes||{},updatedAt:data.updatedAt||0}:null;
    }
  };
}
