'use strict';
// Tahoe80 desktop interface font only; independent of slide/document fonts.
const fs=require('node:fs');
const path=require('node:path');
function validUIFont(name){
  return typeof name==='string' && name.length<=160 &&
    name.trim().length>0 && !/[\\/\u0000]/.test(name);
}
function createUIFontPreferences(filePath){
  if(typeof filePath!=='function')throw new TypeError('Expected a path provider');
  return {
    get(){
      try{
        const choice=JSON.parse(fs.readFileSync(filePath(),'utf8')).interfaceFont;
        return validUIFont(choice)?choice:'Default';
      }catch(_){return 'Default';}
    },
    set(name){
      if(!validUIFont(name))return false;
      let temporary;
      try{
        const file=filePath();
        fs.mkdirSync(path.dirname(file),{recursive:true});
        temporary=file+'.tmp';
        fs.writeFileSync(temporary,JSON.stringify({interfaceFont:name}),'utf8');
        fs.renameSync(temporary,file);
        return true;
      }catch(_){
        if(temporary){try{fs.unlinkSync(temporary);}catch(_){}}
        return false;
      }
    }
  };
}
module.exports={validUIFont,createUIFontPreferences};
