'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
const bridge=fs.readFileSync(path.join(root,'assets/js/powerslidepro-present-v1.js'),'utf8');
function mockBridge(){
 const origin='https://example.test',nodes=new Map(),handlers={},opened=[],editor=[];
 class Element {
  constructor(){this.style={};this.children=[];}
  set id(value){this._id=value;nodes.set('#'+value,this);}
  get id(){return this._id;}
  append(...items){this.children.push(...items);}
  appendChild(item){this.append(item);return item;}
  replaceChildren(...items){this.children=items;}
  addEventListener(type,fn){this[type]=fn;}
  setAttribute(){}
 }
 const frame={postMessage(m){editor.push(m);}};
 nodes.set('#deckCraftFrame',{contentWindow:frame});
 const document={querySelector:s=>nodes.get(s)||null,createElement:()=>new Element(),createTextNode:s=>s,head:new Element(),body:new Element()};
 const window={PowerSlideDesktop:{displayOptions(){return null;}},addEventListener:(n,fn)=>handlers[n]=fn,focus(){},open(url,name){
  const popup={url,name,closed:false,messages:[],focus(){},postMessage(m){this.messages.push(m);}};
  opened.push(popup);return popup;
 }};
 const context={window,document,location:{origin,href:origin+'/tahoe83/'},URL,localStorage:{getItem:()=>null},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,Option:function(){},navigator:{}};
 vm.runInNewContext(bridge,context);
 const message=(source,data,eventOrigin=origin)=>handlers.message({source,data,origin:eventOrigin});
 const present=(active,detachedSupported)=>handlers['powerslidepro-present']({detail:{active,detachedSupported}});
 return {message,present,opened,editor,frame};
}
test('old compiled renderer retains direct audience mode without unsupported detach',()=>{
 const b=mockBridge();b.present(true,false);
 assert.equal(b.opened.length,1);assert.equal(b.opened[0].name,'powerslidepro-audience');
 b.message(b.opened[0],{type:'pspro-audience-control',end:true});
 assert.equal(b.editor.at(-1).blank,'end');
});
test('presenter handoff, live snapshot and Smart Add route to one authoritative editor',()=>{
 const b=mockBridge();b.present(true,true);
 assert.equal(b.opened.length,2);
 const [p,a]=b.opened;
 assert.equal(p.name,'powerslidepro-presenter');assert.equal(a.name,'powerslidepro-audience');
 b.message(b.frame,{type:'tahoe-deckcraft-audience',action:'state',index:'3',blank:''});
 b.message(p,{type:'pspro-presenter-ready'});
 assert.equal(b.editor.at(-1).type,'tahoe-deckcraft-audience-export');
 b.message(b.frame,{type:'tahoe-deckcraft-audience',action:'data',name:'test.deckcraft',data:'test',index:'3'});
 assert.equal(p.messages.at(-1).data,'test');assert.equal(a.messages.at(-1).data,'test');
 b.message(p,{type:'pspro-presenter-loaded'});
 assert.equal(b.editor.at(-1).action,'detach');
 b.message(b.frame,{type:'tahoe-deckcraft-audience',action:'detached'});
 b.message(p,{type:'pspro-presenter-control',index:'4',blank:'white'});
 assert.equal(a.messages.at(-1).index,'4');assert.equal(a.messages.at(-1).blank,'white');
 b.message(p,{type:'pspro-presenter-smart-add',data:'{"input":"Luke 6:31"}'});
 assert.equal(b.editor.at(-1).type,'tahoe-deckcraft-smart-request');
 b.message(b.frame,{type:'tahoe-deckcraft-live-editor',action:'smart-result',data:'Added 1 Bible slide'});
 assert.equal(p.messages.at(-1).type,'pspro-presenter-smart-result');
 b.message(b.frame,{type:'tahoe-deckcraft-audience',action:'data',name:'test.deckcraft',data:'updated',index:'0'});
 assert.equal(p.messages.at(-1).index,'4');assert.equal(a.messages.at(-1).data,'updated');
 const count=b.editor.length;b.message({}, {type:'pspro-presenter-smart-add',data:'evil'},'https://evil.test');
 assert.equal(b.editor.length,count);
 b.message(p,{type:'pspro-presenter-control',end:true});
 assert.equal(b.editor.at(-1).action,'end');
 b.present(false,true);
 assert.equal(p.messages.at(-1).type,'pspro-audience-end');
 assert.equal(a.messages.at(-1).type,'pspro-audience-end');
});
test('native placement selects extended, remembered display, and primary after disconnect',()=>{
 const main=fs.readFileSync(path.join(root,'powerslidepro-desktop/main.cjs'),'utf8');
 const start=main.indexOf('function placeAudience('),end=main.indexOf('const savedPaths',start);
 assert.ok(start>=0&&end>start);
 const p={id:1,workArea:{x:0,y:0,width:1920,height:1080}},s={id:2,workArea:{x:-1600,y:0,width:1600,height:900}},t={id:3,workArea:{x:1920,y:0,width:1440,height:900}};
 let displays=[p,s,t],pref='auto',bounds,full=false,exitHandler;
 const win={isDestroyed:()=>false,isFullScreen:()=>full,isMaximized:()=>false,setBounds:b=>bounds=b,once:(_,fn)=>exitHandler=fn,setFullScreen:v=>{full=v;exitHandler?.();}};
 const screen={getPrimaryDisplay:()=>p,getAllDisplays:()=>displays};
 const place=new Function('screen','audienceWindow','getDisplayPreference','let audienceDisplayId;'+main.slice(start,end)+';return placeAudience;')(screen,win,()=>pref);
 place();assert.ok(bounds.x<0);
 pref='3';place();assert.ok(bounds.x>=1920);
 displays=[p,s];place(true);assert.ok(bounds.x>=0&&bounds.x<1920);
 full=true;pref='2';place();assert.equal(full,false);assert.ok(bounds.x<0);
});
test('audience page has no startup confirmation, retains display controls',()=>{
 const html=fs.readFileSync(path.join(root,'assets/powerslidepro-audience.html'),'utf8');
 assert.doesNotMatch(html,/Continue Windowed|id="launch"/);
 for(const id of ['fs-again','move-screen','retry-inline','exit'])assert.ok(html.includes('id="'+id+'"'));
});
