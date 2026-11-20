/* Approval-controlled Bible App installer downloads.
   Never commit Firebase RTDB rules, service account keys or installer binaries. */
import {onRequest} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";
import {getStorage} from "firebase-admin/storage";

initializeApp(process.env.FIREBASE_DATABASE_URL?{databaseURL:process.env.FIREBASE_DATABASE_URL}:{});
const version="0.1.0";
const catalog=[
  {id:"windows-exe",platform:"Windows 64-bit",format:"EXE",name:"BibleApp-0.1.0-win-x64.exe"},
  {id:"windows-msi",platform:"Windows 64-bit",format:"MSI",name:"BibleApp-0.1.0-win-x64.msi"},
  {id:"mac-arm64",platform:"macOS Apple Silicon",format:"DMG",name:"BibleApp-0.1.0-mac-arm64.dmg"},
  {id:"mac-intel",platform:"macOS Intel",format:"DMG",name:"BibleApp-0.1.0-mac-x64.dmg"}
];
const send=(res,status,payload)=>res.status(status).json(payload);
const fail=(res,status,error)=>send(res,status,{error});
const validUid=uid=>typeof uid==="string"&&/^[a-zA-Z0-9_-]{6,128}$/.test(uid);
const objectPath=file=>"software/bibleapp/"+version+"/"+file.name;

export const softwareDownload=onRequest(
  {region:"asia-southeast1",cors:["https://thythet.com"],maxInstances:20,timeoutSeconds:30},
  async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
      if(!process.env.FIREBASE_DATABASE_URL)return fail(res,503,"service-not-configured");
      if(req.method!=="GET"&&req.method!=="POST")return fail(res,405,"method-not-allowed");
      const bearer=String(req.get("authorization")||"");
      if(!bearer.startsWith("Bearer "))return fail(res,401,"sign-in-required");
      let identity;
      try{identity=await getAuth().verifyIdToken(bearer.slice(7),true)}
      catch{return fail(res,401,"invalid-session")}
      const db=getDatabase();
      const access=(await db.ref("bibleapp/access/"+identity.uid).get()).val()||{};
      const owner=identity.bibleappOwner===true;
      const active=owner||access.status==="active";
      const admin=owner||(active&&access.role==="admin");
      const action=String(req.method==="GET"?req.query.action||"":req.body?.action||"");
      const personalRequest=db.ref("bibleapp/softwareRequests/"+identity.uid);
      if(action==="myRequest"&&req.method==="GET"){
        const saved=(await personalRequest.get()).val();
        return send(res,200,{requested:!!saved,status:active?"active":access.status==="blocked"?"blocked":saved?.state||"pending"});
      }
      if(action==="request"&&req.method==="POST"){
        if(active)return send(res,200,{requested:true,status:"approved"});
        if(access.status==="blocked")return fail(res,403,"account-blocked");
        const previous=(await personalRequest.get()).val()||{};
        const now=Date.now();
        await personalRequest.set({
          uid:identity.uid,email:String(identity.email||"").slice(0,254),
          displayName:String(identity.name||"").slice(0,120),
          requestedAt:Number(previous.requestedAt)||now,lastRequestedAt:now,state:"pending"
        });
        return send(res,200,{requested:true,status:"pending"});
      }
      if(action==="requests"&&req.method==="GET"){
        if(!admin)return fail(res,403,"admin-required");
        const [requestsSnap,accessSnap]=await Promise.all([
          db.ref("bibleapp/softwareRequests").get(),db.ref("bibleapp/access").get()
        ]);
        const rights=accessSnap.val()||{};
        const requests=Object.values(requestsSnap.val()||{}).filter(x=>x&&validUid(x.uid)).map(x=>({
          uid:x.uid,email:x.email||"",displayName:x.displayName||"",requestedAt:x.requestedAt||0,
          status:rights[x.uid]?.status==="active"?"active":x.state==="rejected"?"rejected":"pending"
        })).sort((a,b)=>b.requestedAt-a.requestedAt).slice(0,100);
        return send(res,200,{requests});
      }
      if(["approve","reject"].includes(action)&&req.method==="POST"){
        if(!admin)return fail(res,403,"admin-required");
        const uid=req.body?.uid;
        if(!validUid(uid)||uid===identity.uid)return fail(res,400,"invalid-target");
        const requestRef=db.ref("bibleapp/softwareRequests/"+uid);
        if(!(await requestRef.get()).exists())return fail(res,404,"request-not-found");
        const rightRef=db.ref("bibleapp/access/"+uid);
        const target=(await rightRef.get()).val()||{};
        if(["owner","admin"].includes(target.role))return fail(res,403,"protected-account");
        if(action==="reject"){
          await requestRef.child("state").set("rejected");
          return send(res,200,{status:"rejected"});
        }
        await getAuth().getUser(uid);
        await rightRef.set({
          role:target.role==="editor"?"editor":"user",status:"active",updatedAt:Date.now()
        });
        await requestRef.child("state").set("approved");
        return send(res,200,{status:"approved"});
      }
      if(action==="files"&&req.method==="GET"){
        if(!active)return fail(res,403,"approval-required");
        if(!process.env.BIBLEAPP_PRIVATE_BUCKET)return send(res,200,{ready:false,files:[]});
        const bucket=getStorage().bucket(process.env.BIBLEAPP_PRIVATE_BUCKET);
        const files=(await Promise.all(catalog.map(async(file)=>{
          const [exists]=await bucket.file(objectPath(file)).exists();
          return exists?{id:file.id,platform:file.platform,format:file.format,version}:null;
        }))).filter(Boolean);
        return send(res,200,{ready:true,files});
      }
      if(action==="download"&&req.method==="POST"){
        if(!active)return fail(res,403,"approval-required");
        const file=catalog.find(x=>x.id===req.body?.fileId);
        if(!file)return fail(res,400,"invalid-file");
        if(!process.env.BIBLEAPP_PRIVATE_BUCKET)return fail(res,503,"downloads-not-configured");
        const object=getStorage().bucket(process.env.BIBLEAPP_PRIVATE_BUCKET).file(objectPath(file));
        const [exists]=await object.exists();
        if(!exists)return fail(res,404,"file-not-found");
        const [url]=await object.getSignedUrl({
          version:"v4",action:"read",expires:Date.now()+120000,
          responseDisposition:'attachment; filename="'+file.name+'"'
        });
        return send(res,200,{url,expiresInSeconds:120});
      }
      return fail(res,400,"invalid-action");
    }catch(error){
      console.error("Private software service failed",error?.code||error?.message||"unknown");
      return fail(res,500,"service-unavailable");
    }
  }
);
