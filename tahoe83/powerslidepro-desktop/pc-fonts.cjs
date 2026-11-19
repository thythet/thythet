'use strict';
// Windows-installed font catalog. No arbitrary renderer file paths are accepted.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const allowed=/\.(ttf|otf|ttc|otc)$/i;
const KEY='SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts';
function fontDirectories(env=process.env) {
  return [
    path.resolve(env.WINDIR||'C:\\Windows','Fonts'),
    path.resolve(env.LOCALAPPDATA||path.join(env.USERPROFILE||'C:\\Users\\Public','AppData','Local'),'Microsoft','Windows','Fonts')
  ];
}
function parseRegistry(content,dirs) {
  const catalog=new Map();
  for(const line of content.split(/\r?\n/)){
    const m=line.match(/^\s+(.+?)\s+REG_(?:SZ|EXPAND_SZ)\s+(.+?)\s*$/i);
    if(!m)continue;
    const label=m[1].replace(/\s*\((?:TrueType|OpenType|All res)\)\s*$/i,'').trim();
    let filepath=m[2].replace(/%windir%/ig,path.dirname(dirs[0])).replace(/%localappdata%/ig,path.resolve(dirs[1],'..','..','..'));
    if(!allowed.test(filepath)||!label||label.length>160)continue;
    filepath=path.isAbsolute(filepath)?path.resolve(filepath):path.resolve(dirs[0],filepath);
    // Use the first valid registered face; fonts listed as "Segoe UI (TrueType)"
    // may have several registry entries with different weights/styles.
    const key=label.toLocaleLowerCase('en');
    if(!catalog.has(key)&&fs.existsSync(filepath))catalog.set(key,{name:label,path:filepath});
  }
  return catalog;
}
function createInstalledFontCatalog({platform=process.platform,env=process.env,execute=cp.execFileSync}={}){
  let cache=new Map();
  const dirs=fontDirectories(env);
  function scan(){
    if(platform!=='win32'){cache=new Map();return [];}
    const collected=new Map();
    for(const hive of ['HKLM','HKCU']){
      try{
        const result=execute('reg.exe',['query',hive+'\\'+KEY],{encoding:'utf8',timeout:10000,windowsHide:true,maxBuffer:8*1024*1024});
        for(const [id,value] of parseRegistry(result,dirs)){
          if(!collected.has(id))collected.set(id,value);
        }
      }catch(_) { /* offline/system policies must not prevent editing */ }
    }
    cache=collected;
    return Array.from(cache.values(),v=>v.name).sort((a,b)=>a.localeCompare(b));
  }
  async function read(family){
    if(typeof family!=='string'||family.length>160)return null;
    const entry=cache.get(family.toLocaleLowerCase('en'));
    if(!entry)return null;
    try{
      const real=await fs.promises.realpath(entry.path);
      if(!allowed.test(real))return null;
      const stat=await fs.promises.stat(real);
      if(!stat.isFile()||stat.size<100||stat.size>45*1024*1024)return null;
      // The read is constrained to a path installed in the OS font registry.
      return {name:entry.name,bytes:(await fs.promises.readFile(real)).toString('base64')};
    }catch(_){return null;}
  }
  return {scan,read};
}
module.exports={createInstalledFontCatalog,parseRegistry,fontDirectories};
