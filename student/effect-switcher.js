(function(){
  const storageKey = "ss_effect_mode";
  const effects = [
    ["none","None"],
    ["soft","Soft"],
    ["pop","Pop"],
    ["smooth","Smooth"],
    ["kids","Kids"],
    ["focus","Focus"],
    ["fast","Fast"],
    ["calm","Calm"],
    ["apple","Apple"],
    ["apple-smooth","Apple Smooth"]
  ];
  const revealSelector = ".page.active:not(#page-attendance):not(#page-students) .panel,.page.active:not(#page-attendance):not(#page-students) .card,.page.active:not(#page-attendance):not(#page-students) .stat,.page.active:not(#page-attendance):not(#page-students) .theme-card,.page.active:not(#page-attendance):not(#page-students) .effect-card,.page.active:not(#page-attendance):not(#page-students) .student-card,.page.active:not(#page-attendance):not(#page-students) .report-row";
  let revealObserver;

  function setupAppleReveal(){
    document.querySelectorAll("#page-attendance .apple-reveal").forEach(el => {
      el.classList.remove("apple-reveal","is-visible");
      delete el.dataset.appleRevealReady;
      el.style.removeProperty("--apple-delay");
    });
    document.querySelectorAll("#page-students .apple-reveal").forEach(el => {
      el.classList.remove("apple-reveal","is-visible");
      delete el.dataset.appleRevealReady;
      el.style.removeProperty("--apple-delay");
    });
    if(!["apple","apple-smooth"].includes(document.body.dataset.effectMode) || !("IntersectionObserver" in window)){
      document.querySelectorAll(".apple-reveal").forEach(el => {
        el.classList.remove("apple-reveal","is-visible");
        delete el.dataset.appleRevealReady;
        el.style.removeProperty("--apple-delay");
      });
      if(revealObserver) revealObserver.disconnect();
      return;
    }
    if(!revealObserver){
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },{threshold:.16,rootMargin:"0px 0px -8% 0px"});
    }
    document.querySelectorAll(revealSelector).forEach((el,index) => {
      if(el.dataset.appleRevealReady) return;
      el.dataset.appleRevealReady = "1";
      el.classList.add("apple-reveal");
      el.style.setProperty("--apple-delay", `${Math.min(index * 28, 220)}ms`);
      revealObserver.observe(el);
    });
  }

  function setupAttendanceSoftReveal(){
    const pages = [document.getElementById("page-attendance"), document.getElementById("page-students")].filter(Boolean);
    pages.forEach(page => page.classList.remove("att-soft-ready"));
    if(!["apple","apple-smooth"].includes(document.body.dataset.effectMode)) return;
    requestAnimationFrame(()=>pages.forEach(page => page.classList.add("att-soft-ready")));
  }

  function currentEffect(){
    const saved = localStorage.getItem(storageKey);
    return effects.some(([key]) => key === saved) ? saved : "soft";
  }

  function labelFor(effect){
    return effects.find(([key]) => key === effect)?.[1] || "Soft";
  }

  function renderGallery(effect){
    document.querySelectorAll("[data-effect-gallery]").forEach(gallery => {
      gallery.innerHTML = effects.map(([key,label]) => `
        <button class="effect-card ${key === effect ? "active" : ""}" type="button" data-effect-choice="${key}">
          <span class="effect-preview" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="effect-name">${label}</span>
        </button>
      `).join("");
      gallery.querySelectorAll("[data-effect-choice]").forEach(card => {
        card.addEventListener("click", () => applyEffect(card.dataset.effectChoice));
      });
    });
  }

  function applyEffect(effect){
    document.body.dataset.effectMode = effect;
    localStorage.setItem(storageKey, effect);
    renderGallery(effect);
    requestAnimationFrame(setupAppleReveal);
    requestAnimationFrame(setupAttendanceSoftReveal);
  }

  function initEffectSwitcher(){
    applyEffect(currentEffect());
    document.addEventListener("click", event => {
      if(event.target.closest("[data-page]")) requestAnimationFrame(() => requestAnimationFrame(setupAppleReveal));
      if(event.target.closest("[data-page]")) requestAnimationFrame(() => requestAnimationFrame(setupAttendanceSoftReveal));
    });
    new MutationObserver(() => {
      if(["apple","apple-smooth"].includes(document.body.dataset.effectMode)) requestAnimationFrame(setupAppleReveal);
    }).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initEffectSwitcher);
  }else{
    initEffectSwitcher();
  }
})();
