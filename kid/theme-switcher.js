(function(){
  const storageKey = "ss_color_theme";
  const localBgStorageKey = "ss_theme_backgrounds_local";
  const localBgSelectedKey = "ss_theme_backgrounds_selected";
  const localThemeOptionsKey = "ss_theme_options_local";
  const builtInBackgrounds = {
    "apple-liquid": { images:["./assets/img/apple-liquid-bg.png"], videos:[], selected:"" },
    "glassy": { images:["./assets/img/apple-liquid-bg.png"], videos:[], selected:"" }
  };
  const themes = [
    ["glassy","Glassy",["#081426","#5da7ff","#7a79ff","#22c55e"]],
    ["standard","Standard",["#f7f9fc","#2563eb","#4f46e5","#16a34a"]],
    ["classic","Classic",["#f4efe5","#416f8f","#7d5d3b","#517a43"]],
    ["light","Light",["#fafdff","#0ea5e9","#6366f1","#22c55e"]],
    ["apple-liquid","Apple Liquid",["#f5f8ff","#007aff","#5856d6","#34c759"]],
    ["warm","Warm",["#fff7ed","#0f766e","#9a6a22","#4d7c0f"]],
    ["colorful","Colorful",["#fff7fb","#0284c7","#db2777","#16a34a"]],
    ["contrast","Contrast",["#050505","#38bdf8","#facc15","#4ade80"]],
    ["dark-pro","Dark Pro",["#0d1117","#58a6ff","#bc8cff","#3fb950"]],
    ["bento","Bento",["#f6f7fb","#3b82f6","#8b5cf6","#10b981"]],
    ["soft-pastel","Pastel",["#fff1f7","#60a5fa","#c084fc","#86c98a"]],
    ["minimal-white","Minimal",["#ffffff","#1d4ed8","#4338ca","#15803d"]],
    ["ocean","Ocean",["#e8fbff","#0284c7","#0f766e","#059669"]],
    ["forest","Forest",["#edf7ed","#347f8f","#64712d","#2f7d32"]],
    ["royal","Royal",["#111827","#60a5fa","#d4af37","#22c55e"]],
    ["dopamine","Dopamine",["#fff0f8","#06b6d4","#ec4899","#22c55e"]],
    ["paper","Paper",["#fbf7ee","#557c93","#8a6f45","#64824c"]],
    ["midnight","Midnight",["#050816","#22d3ee","#a78bfa","#34d399"]],
    ["cyber","Cyber",["#080914","#00e5ff","#ff00c8","#39ff88"]],
    ["neon","Neon",["#090011","#22d3ee","#f472b6","#a3e635"]],
    ["sunset","Sunset",["#fff1e6","#0ea5e9","#f97316","#65a30d"]],
    ["lavender","Lavender",["#f7f1ff","#6366f1","#a855f7","#16a34a"]],
    ["mint","Mint",["#effff8","#0891b2","#0d9488","#10b981"]],
    ["rose","Rose",["#fff1f2","#7c3aed","#e11d48","#16a34a"]],
    ["slate","Slate",["#f8fafc","#2563eb","#475569","#16a34a"]],
    ["coffee","Coffee",["#f6eee6","#5b7186","#8b5e34","#687a45"]],
    ["candy","Candy",["#fff5fb","#38bdf8","#f472b6","#4ade80"]],
    ["terminal","Terminal",["#00130b","#34d399","#bef264","#22c55e"]],
    ["sepia","Sepia",["#f4ecd8","#5c7484","#8a6b35","#687d46"]],
    ["sky","Sky",["#eff9ff","#0284c7","#2563eb","#059669"]],
    ["desert","Desert",["#fff7e6","#287c8e","#b45309","#728238"]],
    ["mono","Mono",["#f7f7f7","#262626","#525252","#404040"]],
    ["aqua","Aqua",["#ecfeff","#0891b2","#14b8a6","#10b981"]],
    ["berry","Berry",["#fff1f8","#7c3aed","#c026d3","#16a34a"]],
    ["spring","Spring",["#f7fee7","#0e7490","#65a30d","#22c55e"]],
    ["autumn","Autumn",["#fff7ed","#64748b","#ea580c","#65a30d"]],
    ["christmas","Christmas",["#f0fdf4","#0f766e","#b91c1c","#15803d"]],
    ["school-notebook","Notebook",["#fffdf5","#2563eb","#dc2626","#16a34a"]]
  ];

  function currentTheme(){
    const saved = localStorage.getItem(storageKey);
    return themes.some(([key]) => key === saved) ? saved : "glassy";
  }

  function labelFor(theme){
    return themes.find(([key]) => key === theme)?.[1] || "Glassy";
  }

  function cssUrl(url){
    return `url("${String(url).replace(/["\\]/g,"\\$&")}")`;
  }

  function unique(values){
    return [...new Set((values || []).map(v => String(v || "").trim()).filter(Boolean))];
  }

  function isVideoUrl(url){
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(String(url || ""));
  }

  function ensureVideoBackground(){
    let video = document.getElementById("themeVideoBackground");
    if(!video){
      video = document.createElement("video");
      video.id = "themeVideoBackground";
      video.className = "theme-video-background";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute("muted","");
      video.setAttribute("playsinline","");
      video.setAttribute("aria-hidden","true");
      document.body.prepend(video);
    }
    return video;
  }

  function stopVideoBackground(){
    const video = document.getElementById("themeVideoBackground");
    if(!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }

  function normalizeEntry(entry){
    if(!entry) return {images:[], videos:[], selected:""};
    const split = values => {
      const media = unique(values);
      return {images:media.filter(url => !isVideoUrl(url)), videos:media.filter(isVideoUrl)};
    };
    if(typeof entry === "string"){
      const parts = split(entry.trim() ? [entry.trim()] : []);
      return {...parts, selected:""};
    }
    if(Array.isArray(entry)){
      const parts = split(entry);
      return {...parts, selected:""};
    }
    const media = split([...(entry.images || entry.urls || []), ...(entry.videos || [])]);
    const selected = String(entry.selected || "").trim();
    return {...media, selected:[...media.images, ...media.videos].includes(selected) ? selected : ""};
  }

  function normalizeBackgrounds(backgrounds){
    return Object.fromEntries(Object.entries(backgrounds || {}).map(([key,value]) => [key, normalizeEntry(value)]));
  }

  function normalizeThemeOption(option){
    const fontSizes = new Set(["default","small","medium","large"]);
    const data = option && typeof option === "object" ? option : {};
    const textColor = String(data.textColor || "").trim();
    const fontSize = fontSizes.has(data.fontSize) ? data.fontSize : "default";
    return {
      textColor,
      fontSize,
      bgBlur: data.bgBlur === true
    };
  }

  function normalizeThemeOptions(options){
    return Object.fromEntries(Object.entries(options || {}).map(([key,value]) => [key, normalizeThemeOption(value)]));
  }

  function localThemeOptions(){
    try{ return normalizeThemeOptions(JSON.parse(localStorage.getItem(localThemeOptionsKey)||"{}") || {}); }
    catch{ return {}; }
  }

  function themeOptions(){
    return normalizeThemeOptions(window.SS_THEME_OPTIONS || {});
  }

  function mergedThemeOptions(){
    return normalizeThemeOptions({...themeOptions(), ...localThemeOptions()});
  }

  function currentThemeOptions(theme){
    return mergedThemeOptions()[theme] || normalizeThemeOption();
  }

  function applyThemeOptions(theme){
    const options = currentThemeOptions(theme);
    if(options.textColor){
      document.body.dataset.themeTextCustom = "1";
      document.body.style.setProperty("--theme-custom-text", options.textColor);
    }else{
      delete document.body.dataset.themeTextCustom;
      document.body.style.removeProperty("--theme-custom-text");
    }
    document.body.dataset.themeFontSize = options.fontSize || "default";
    document.body.dataset.themeBgBlur = options.bgBlur ? "1" : "0";
  }

  function setLocalThemeOptions(options){
    localStorage.setItem(localThemeOptionsKey, JSON.stringify(normalizeThemeOptions(options || {})));
    applyThemeOptions(currentTheme());
    document.dispatchEvent(new CustomEvent("ss-theme-options-change"));
  }

  function applyThemeBackground(theme){
    const url = selectedThemeBackground(theme);
    if(url){
      document.body.dataset.themeBgUrl = "1";
      if(isVideoUrl(url)){
        document.body.dataset.themeBgVideo = "1";
        document.body.style.removeProperty("--custom-theme-bg");
        const video = ensureVideoBackground();
        if(video.getAttribute("src") !== url){
          video.src = url;
          video.load();
        }
        video.play?.().catch(() => {});
      }else{
        delete document.body.dataset.themeBgVideo;
        stopVideoBackground();
        document.body.style.setProperty("--custom-theme-bg", cssUrl(url));
      }
    }else{
      delete document.body.dataset.themeBgUrl;
      delete document.body.dataset.themeBgVideo;
      document.body.style.removeProperty("--custom-theme-bg");
      stopVideoBackground();
    }
  }

  function localThemeBackgrounds(){
    try{ return normalizeBackgrounds(JSON.parse(localStorage.getItem(localBgStorageKey)||"{}") || {}); }
    catch{ return {}; }
  }

  function setLocalThemeBackgrounds(backgrounds){
    localStorage.setItem(localBgStorageKey, JSON.stringify(normalizeBackgrounds(backgrounds || {})));
    applyThemeBackground(currentTheme());
    document.dispatchEvent(new CustomEvent("ss-theme-backgrounds-change"));
  }

  function localThemeSelections(){
    try{ return JSON.parse(localStorage.getItem(localBgSelectedKey)||"{}") || {}; }
    catch{ return {}; }
  }

  function themeBackgrounds(){
    return normalizeBackgrounds({...builtInBackgrounds, ...(window.SS_THEME_BACKGROUNDS || {})});
  }

  function themeImages(theme){
    const globalEntry = themeBackgrounds()[theme] || {images:[],videos:[],selected:""};
    const localEntry = localThemeBackgrounds()[theme] || {images:[],videos:[],selected:""};
    return unique([...globalEntry.images, ...globalEntry.videos, ...localEntry.images, ...localEntry.videos]);
  }

  function selectedThemeBackground(theme){
    const images = themeImages(theme);
    const selected = String(localThemeSelections()[theme] || "").trim();
    if(images.includes(selected)) return selected;
    return "";
  }

  function selectThemeBackground(theme,url){
    const selected = localThemeSelections();
    if(url) selected[theme] = url;
    else delete selected[theme];
    localStorage.setItem(localBgSelectedKey, JSON.stringify(selected));
    applyThemeBackground(currentTheme());
    document.dispatchEvent(new CustomEvent("ss-theme-backgrounds-change"));
  }

  function updateButtons(theme){
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.innerHTML = `<i class="ri-palette-line"></i>${labelFor(theme)}`;
      button.setAttribute("aria-label", `Theme: ${labelFor(theme)}`);
      button.title = `Theme: ${labelFor(theme)}`;
    });
  }

  function renderGallery(theme){
    document.querySelectorAll("[data-theme-gallery]").forEach(gallery => {
      gallery.innerHTML = themes.map(([key,label,colors]) => `
        <button class="theme-card ${key === theme ? "active" : ""}" type="button" data-theme-choice="${key}" style="--preview-bg:${colors[0]};--preview-bg2:${colors[0]};--preview-a:${colors[1]};--preview-b:${colors[2]};--preview-c:${colors[3]}">
          <span class="theme-preview" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          <span class="theme-name">${label}</span>
        </button>
      `).join("");
      gallery.querySelectorAll("[data-theme-choice]").forEach(card => {
        card.addEventListener("click", () => applyTheme(card.dataset.themeChoice));
      });
    });
  }

  function applyTheme(theme){
    document.body.dataset.colorTheme = theme;
    localStorage.setItem(storageKey, theme);
    applyThemeBackground(theme);
    applyThemeOptions(theme);
    updateButtons(theme);
    renderGallery(theme);
    document.dispatchEvent(new CustomEvent("ss-theme-change",{detail:{theme}}));
  }

  function nextTheme(){
    const active = currentTheme();
    const index = themes.findIndex(([key]) => key === active);
    return themes[(index + 1) % themes.length][0];
  }

  function initThemeSwitcher(){
    applyTheme(currentTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.addEventListener("click", () => applyTheme(nextTheme()));
    });
  }

  window.SSTheme = { themes, currentTheme, applyTheme, labelFor, localThemeBackgrounds, setLocalThemeBackgrounds, normalizeBackgrounds, themeImages, themeMedia:themeImages, selectedThemeBackground, selectThemeBackground, isVideoUrl, localThemeOptions, setLocalThemeOptions, normalizeThemeOptions, currentThemeOptions };
  window.SSApplyThemeBackgrounds = backgrounds => {
    window.SS_THEME_BACKGROUNDS = normalizeBackgrounds(backgrounds || {});
    applyThemeBackground(currentTheme());
    document.dispatchEvent(new CustomEvent("ss-theme-backgrounds-change"));
  };
  window.SSApplyThemeOptions = options => {
    window.SS_THEME_OPTIONS = normalizeThemeOptions(options || {});
    applyThemeOptions(currentTheme());
    document.dispatchEvent(new CustomEvent("ss-theme-options-change"));
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initThemeSwitcher);
  }else{
    initThemeSwitcher();
  }
})();
