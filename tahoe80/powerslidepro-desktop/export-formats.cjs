'use strict';
const FORMATS = Object.freeze(['deckcraft','pptx','pdf','png','jpg']);
const exportFilters = Object.freeze([
  { name:'PowerSlidePro Project (.deckcraft)', extensions:['deckcraft'] },
  { name:'PowerPoint Presentation (.pptx)', extensions:['pptx'] },
  { name:'PDF Document (.pdf)', extensions:['pdf'] },
  { name:'PNG Image (.png)', extensions:['png'] },
  { name:'JPEG Image (.jpg)', extensions:['jpg','jpeg'] }
]);
function normalizedFormat(format) {
  const f=String(format||'').toLowerCase();
  return f==='jpeg'?'jpg':f;
}
function formatFromPath(path) {
  const ext=String(path||'').split('.').pop()?.toLowerCase();
  const f=normalizedFormat(ext);
  return FORMATS.includes(f)?f:null;
}
function suggestedExportName(input, preferred='') {
  const leaf=String(input||'Presentation').split(/[\\/]/).pop()
    .replace(/[<>:"|?*\u0000-\u001f]/g,'_').trim()
    .replace(/\.(deckcraft|pptx|pdf|png|jpe?g)$/i,'').slice(0,88)||'Presentation';
  const fmt=normalizedFormat(preferred.replace(/-all$/,''));
  return leaf+'.'+(FORMATS.includes(fmt)?fmt:'deckcraft');
}
function isImageFormat(format){return /^(png|jpg)(-all)?$/.test(String(format));}
function isAllSlidesFormat(format){return /^(png|jpg)-all$/.test(String(format));}
module.exports={exportFilters,formatFromPath,suggestedExportName,isImageFormat,isAllSlidesFormat};
