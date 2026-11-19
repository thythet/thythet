/* Tahoe79 PowerSlidePro: focused native Khmer generator text editing.
 * Loaded BEFORE egui/WASM to preserve the browser's normal paste and typing.
 */
(()=>{
  'use strict';
  const INPUTS=new Set(['tahoe-smart-khmer-input','tahoe-song-khmer-input']);
  const MAX=500000;
  const isEditor=el=>!!(el && INPUTS.has(el.id) && el.tagName==='TEXTAREA');
  let pasteId=0;
  function insertText(id,value) {
    if(!INPUTS.has(id) || typeof value!=='string')return false;
    const el=document.getElementById(id);
    if(!isEditor(el))return false;
    const text=value.slice(0,MAX);
    const start=el.selectionStart??el.value.length;
    const end=el.selectionEnd??start;
    el.focus({preventScroll:true});
    el.setRangeText(text,start,end,'end');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }
  function feedback(text) {
    let box=document.getElementById('pspro-generator-paste-status');
    if(!box){
      box=document.createElement('div');box.id='pspro-generator-paste-status';
      box.setAttribute('role','status');box.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483600;background:#303b48;color:#fff;border-radius:8px;padding:9px 12px;font:12px system-ui;max-width:85vw';
      document.body.appendChild(box);
    }
    box.textContent=text;
    clearTimeout(feedback.timer);
    feedback.timer=setTimeout(()=>box.remove(),3600);
  }
  // eframe registers window-level key handlers; prevent keyboard/clipboard
  // shortcuts from being swallowed when the native DOM textarea has focus.
  // Leave browser default processing enabled (especially Cmd+V and IME).
  for(const type of ['keydown','keyup','keypress','paste','beforeinput','input','compositionstart','compositionupdate','compositionend']){
    window.addEventListener(type,event=>{
      if(isEditor(document.activeElement))event.stopImmediatePropagation();
    },true);
  }
  window.tahoeGeneratorPaste = async function(id) {
    if(!INPUTS.has(id))return;
    const area=document.getElementById(id);if(!isEditor(area))return;
    const request=++pasteId;
    // Prefer OS clipboard in the Desktop host: browsers may deny
    // navigator.clipboard.readText() even after a user gesture.
    if(window.parent!==window && location.search.includes('desktop=1')){
      window.parent.postMessage({type:'tahoe-generator-paste-request',id,request},location.origin);
      return;
    }
    try {
      if(!navigator.clipboard?.readText)throw Error('unavailable');
      const text=await navigator.clipboard.readText();
      if(request!==pasteId)return;
      if(text)insertText(id,text);
      else feedback('Clipboard is empty.');
    }catch(_){
      area.focus({preventScroll:true});
      feedback('Clipboard access blocked. Press Ctrl+V or ⌘V in this text box.');
    }
  };
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent)return;
    const data=event.data||{};
    if(data.type==='tahoe-generator-paste-result' && data.request===pasteId && INPUTS.has(data.id)){
      if(typeof data.text==='string'&&data.text)insertText(data.id,data.text);
      else feedback('Clipboard is empty or unavailable.');
    }
  });
})();
