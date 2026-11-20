/* Signed-in Bible App installer downloads — no Admin approval required.
   Never commit Firebase RTDB rules, service account keys or installer binaries. */
import {onRequest} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getStorage} from "firebase-admin/storage";

initializeApp();
const version="0.1.0";
const catalog=[
  {id:"windows-exe",platform:"Windows 64-bit",format:"EXE",name:"BibleApp-0.1.0-win-x64.exe"},
  {id:"windows-msi",platform:"Windows 64-bit",format:"MSI",name:"BibleApp-0.1.0-win-x64.msi"},
  {id:"mac-arm64",platform:"macOS Apple Silicon",format:"DMG",name:"BibleApp-0.1.0-mac-arm64.dmg"},
  {id:"mac-intel",platform:"macOS Intel",format:"DMG",name:"BibleApp-0.1.0-mac-x64.dmg"}
];
const send=(res,status,payload)=>res.status(status).json(payload);
const fail=(res,status,error)=>send(res,status,{error});
const objectPath=file=>"software/bibleapp/"+version+"/"+file.name;

export const softwareDownload=onRequest(
  {region:"asia-southeast1",cors:["https://thythet.com"],maxInstances:20,timeoutSeconds:30},
  async(req,res)=>{
    res.set("Cache-Control","no-store");
    try{
      if(req.method!=="GET"&&req.method!=="POST")return fail(res,405,"method-not-allowed");
      const bearer=String(req.get("authorization")||"");
      if(!bearer.startsWith("Bearer "))return fail(res,401,"sign-in-required");
      let identity;
      try{identity=await getAuth().verifyIdToken(bearer.slice(7),true)}
      catch{return fail(res,401,"invalid-session")}
      // Token verification above is the only access gate for installers.
      const action=String(req.method==="GET"?req.query.action||"":req.body?.action||"");
      if(action==="files"&&req.method==="GET"){
        if(!process.env.BIBLEAPP_PRIVATE_BUCKET)return send(res,200,{ready:false,files:[]});
        const bucket=getStorage().bucket(process.env.BIBLEAPP_PRIVATE_BUCKET);
        const files=(await Promise.all(catalog.map(async(file)=>{
          const [exists]=await bucket.file(objectPath(file)).exists();
          return exists?{id:file.id,platform:file.platform,format:file.format,version}:null;
        }))).filter(Boolean);
        return send(res,200,{ready:true,files});
      }
      if(action==="download"&&req.method==="POST"){
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
