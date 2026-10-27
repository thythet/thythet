'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'generator-paste.js'),'utf8');
function harness({desktop=false,clipboard='១. ព្រះនាម A'}={}){
 const listeners={};let stopped=0,posted=[];
 const field={id:'tahoe-song-khmer-input',tagName:'TEXTAREA',value:'Hello',
   selectionStart:5,selectionEnd:5,
   focus(){document.activeElement=this;},
   setRangeText(v,start,end){this.value=this.value.slice(0,start)+v+this.value.slice(end);this.selectionStart=start+v.length;this.selectionEnd=this.selectionStart;},
   dispatchEvent(){}};
 const document={activeElement:field,
   getElementById:id=>id===field.id?field:null,
   createElement:()=>({style:{},setAttribute(){}}),
   body:{appendChild(){}}
 };
 const parent=desktop?{postMessage:(...args)=>posted.push(args)}:null;
 const window={addEventListener:(type,cb)=>((listeners[type]??=[]).push(cb)),parent:null};
 window.parent=parent||window;
 const ctx={window,document,location:{origin:'http://localhost',search:desktop?'?desktop=1':''},
   navigator:{clipboard:{readText:async()=>clipboard}},
   Event:class{},setTimeout:()=>0,clearTimeout:()=>{}};
 vm.runInNewContext(source,ctx);
 return {window,field,listeners,posted,getStopped:()=>stopped};
}
test('web Paste button inserts Khmer into generator textarea and preserves existing text',async()=>{
 const h=harness();await h.window.tahoeGeneratorPaste(h.field.id);
 assert.equal(h.field.value,'Hello១. ព្រះនាម A');
});
test('native keydown and paste events are not passed to global WASM shortcuts',()=>{
 const h=harness();let stop=0;
 for(const type of ['keydown','paste','compositionstart']){
   for(const cb of h.listeners[type])cb({stopImmediatePropagation:()=>stop++});
 }
 assert.equal(stop,3);
});
test('desktop Paste button requests OS clipboard through native shell',async()=>{
 const h=harness({desktop:true});
 await h.window.tahoeGeneratorPaste(h.field.id);
 assert.equal(h.posted.length,1);
 assert.equal(h.posted[0][0].type,'tahoe-generator-paste-request');
 for(const cb of h.listeners.message)cb({origin:'http://localhost',source:h.window.parent,
   data:{type:'tahoe-generator-paste-result',id:h.field.id,request:1,text:'។ Khmer'}});
 assert.equal(h.field.value,'Hello។ Khmer');
});
test('clipboard paste rejects unknown input element',async()=>{
 const h=harness();await h.window.tahoeGeneratorPaste('unknown-input');assert.equal(h.field.value,'Hello');
});
