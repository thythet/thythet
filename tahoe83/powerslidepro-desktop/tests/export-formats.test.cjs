'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {exportFilters,formatFromPath,suggestedExportName,isImageFormat,isAllSlidesFormat}=require('../export-formats.cjs');
test('supported save formats and names',()=>{
 assert.deepEqual(exportFilters.map(x=>x.extensions[0]),['deckcraft','pptx','pdf','png','jpg']);
 for(const ext of ['deckcraft','pptx','pdf','png','jpg','jpeg'])assert.ok(formatFromPath('out.'+ext));
 assert.equal(formatFromPath('fake.pptx.exe'),null);
 assert.equal(suggestedExportName('My Slides.deckcraft','pptx'),'My Slides.pptx');
 assert.equal(suggestedExportName('folder/Slides.deckcraft','pdf'),'Slides.pdf');
 assert.equal(suggestedExportName('A.pptx','jpg-all'),'A.jpg');
 assert.equal(isImageFormat('jpg-all'),true);assert.equal(isAllSlidesFormat('png-all'),true);
 assert.equal(isAllSlidesFormat('jpg'),false);
});
