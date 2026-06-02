(function(){
  if(document.getElementById("ssAppInfoButton")) return;

  const style = document.createElement("style");
  style.textContent = `
    #ssAppInfoButton{
      position:fixed!important;
      right:max(16px,env(safe-area-inset-right))!important;
      bottom:max(16px,env(safe-area-inset-bottom))!important;
      z-index:2147483000!important;
      width:32px!important;
      height:32px!important;
      border-radius:999px!important;
      border:1px solid rgba(255,255,255,.3)!important;
      background:rgba(255,255,255,.15)!important;
      color:#eaf3ff!important;
      display:grid!important;
      place-items:center!important;
      padding:0!important;
      cursor:pointer!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 18px rgba(0,0,0,.28)!important;
      backdrop-filter:blur(14px)!important;
      -webkit-backdrop-filter:blur(14px)!important;
    }
    #ssAppInfoButton i{font-size:16px!important;line-height:1!important}
    #ssAppInfoButton:active{transform:scale(.94)}
    #ssAppInfoPopup{
      position:fixed!important;
      right:max(16px,env(safe-area-inset-right))!important;
      bottom:calc(max(16px,env(safe-area-inset-bottom)) + 40px)!important;
      z-index:2147483001!important;
      width:220px!important;
      height:126px!important;
      display:none!important;
      filter:drop-shadow(0 18px 42px rgba(0,0,0,.38));
    }
    #ssAppInfoPopup.open{display:block!important}
    #ssAppInfoPopup iframe{
      width:100%!important;
      height:100%!important;
      border:0!important;
      display:block!important;
      background:transparent!important;
    }
    @media(max-width:420px){
      #ssAppInfoPopup{right:12px!important;bottom:52px!important}
      #ssAppInfoButton{right:12px!important;bottom:12px!important}
    }
  `;

  const button = document.createElement("button");
  button.id = "ssAppInfoButton";
  button.type = "button";
  button.title = "Appinfo";
  button.setAttribute("aria-label","Open Appinfo");
  button.innerHTML = '<i class="ri-equalizer-3-line"></i>';

  const popup = document.createElement("div");
  popup.id = "ssAppInfoPopup";
  popup.innerHTML = '<iframe src="./app-info.html" title="Appinfo" allowtransparency="true"></iframe>';

  button.addEventListener("click", event => {
    event.stopPropagation();
    popup.classList.toggle("open");
  });
  popup.addEventListener("click", event => event.stopPropagation());
  document.addEventListener("click", () => popup.classList.remove("open"));
  document.addEventListener("keydown", event => {
    if(event.key === "Escape") popup.classList.remove("open");
  });

  document.head.appendChild(style);
  document.body.append(button,popup);
})();
