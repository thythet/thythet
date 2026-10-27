/* Tahoe80 native thechat shell. This file affects only the embedded chat22 iframe.
   Original chat22 files, accounts and data remain untouched. */
(() => {
  "use strict";
  const host = document.getElementById("theChatWindow");
  const frame = document.getElementById("theChatFrame");
  if (!host || !frame) return;
  let drag = null;

  const moveWindow = (clientX, clientY) => {
    if (!drag) return;
    const x = Math.max(0, Math.min(window.innerWidth - drag.width, clientX - drag.dx));
    const y = Math.max(0, Math.min(window.innerHeight - drag.height, clientY - drag.dy));
    host.style.left = x + "px";
    host.style.top = y + "px";
  };
  const finishDrag = () => {
    if (!drag) return;
    drag = null;
    host.classList.remove("dragging");
    frame.style.pointerEvents = "";
    if (typeof saveDesktopAppState === "function") saveDesktopAppState("thechat");
  };
  // Keep pointer movement alive if the cursor crosses out of the iframe.
  window.addEventListener("pointermove", e => {
    if (drag) moveWindow(e.clientX, e.clientY);
  }, true);
  window.addEventListener("pointerup", finishDrag, true);
  window.addEventListener("pointercancel", finishDrag, true);
  window.addEventListener("blur", finishDrag);

  const setup = () => {
    let doc;
    try {
      doc = frame.contentDocument;
      if (!doc?.getElementById("window")) return;
    } catch (error) {
      console.warn("thechat: could not access its same-origin shell", error);
      return;
    }
    if (doc.getElementById("tahoe80-thechat-native-shell")) return;
    const style = doc.createElement("style");
    style.id = "tahoe80-thechat-native-shell";
    style.textContent = [
      "html,body{height:100%!important;width:100%!important;overflow:hidden!important}",
      "body{background:transparent!important;background-image:none!important}",
      "body::before,body::after,#wallpaperLayer{display:none!important}",
      "#window,#window[data-size]{position:fixed!important;left:0!important;top:0!important;transform:none!important;",
      "width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;",
      "min-width:0!important;min-height:0!important;border-radius:var(--window-radius,16px)!important;box-shadow:none!important}",
      "#window.minimized{visibility:visible!important;opacity:1!important;scale:1!important;pointer-events:auto!important}",
      "#minimizedLauncher{display:none!important}",
      ".resize-handle{display:none!important}",
      "@media(max-width:760px){#window,#window[data-size]{border-radius:0!important}}"
    ].join("");
    doc.head.appendChild(style);

    const controls = {
      hideWindowBtn: "close",
      minimizeBtn: "minimize",
      zoomWindowBtn: "zoom"
    };
    // Take over only the native traffic-light buttons. Their appearance,
    // markup and all remaining thechat behavior come from chat22 itself.
    doc.addEventListener("click", event => {
      const button = event.target.closest?.("#hideWindowBtn,#minimizeBtn,#zoomWindowBtn");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const action = controls[button.id];
      if (action === "zoom") zoomDesktopApp("thechat");
      else closeDesktopApp("thechat");
    }, true);

    const isInteractive = node => !!node.closest(
      "button,input,textarea,select,a,[data-no-drag],[contenteditable],.splitter,.tc-overlay,.resize-handle"
    );
    const start = event => {
      if (window.innerWidth <= 760 || event.button !== 0 || isInteractive(event.target)) return;
      if (!host.classList.contains("open") || host.classList.contains("app-fullscreen-fallback")) return;
      const r = host.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      const x = event.clientX + f.left, y = event.clientY + f.top;
      // Pixelize the Tahoe window; never resize thechat's own document.
      Object.assign(host.style, {
        left: r.left + "px", top: r.top + "px",
        width: r.width + "px", height: r.height + "px", transform: "none"
      });
      drag = {dx:x-r.left,dy:y-r.top,width:r.width,height:r.height,pointer:event.pointerId};
      host.classList.add("dragging");
      if (typeof focusTahoeWindow === "function") focusTahoeWindow(host);
      event.preventDefault();
      event.stopImmediatePropagation(); // prevent chat22's standalone drag handler
    };
    const during = event => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const f = frame.getBoundingClientRect();
      moveWindow(event.clientX + f.left, event.clientY + f.top);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const end = event => {
      if (!drag || event.pointerId !== drag.pointer) return;
      event.stopImmediatePropagation();
      finishDrag();
    };
    // Capture pointer events before chat22's own window-drag listeners.
    doc.addEventListener("pointerdown", event => {
      if (event.target.closest?.("[data-window-drag],[data-window-drag-edge]")) start(event);
    }, true);
    doc.addEventListener("pointermove", during, true);
    doc.addEventListener("pointerup", end, true);
    doc.addEventListener("pointercancel", end, true);
    doc.addEventListener("dragstart", event => {
      if (drag) event.preventDefault();
    }, true);
  };
  frame.addEventListener("load", setup);
  if (frame.contentDocument?.readyState === "complete" && frame.contentDocument.getElementById("window")) setup();
})();