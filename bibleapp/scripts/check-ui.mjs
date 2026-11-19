// Verify key Bible UI contracts without network access or test dependencies.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root=new URL("../web/",import.meta.url);
const file=name=>readFileSync(new URL(name,root),"utf8");
const html=file("index.html"),css=file("style.css"),js=file("app.js"),sw=file("sw.js"),i18n=file("i18n.js");
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const needed of ["app","sidebarResize","accountButton","oldTab","newTab","bookSearch",
    "booksList","langEN","langKH","themeButton","fontButton","readerPage","chapterHeading",
    "chapterSelect","verses","verseActions","copySelected","noteSelected","googleLogin",
    "presentSelected","generatorPage","searchPage","settingsPage"]){
  assert(ids.has(needed),"Missing UI element: "+needed);
}
for(const match of js.matchAll(/\$\("([a-zA-Z0-9_-]+)"\)/g)){
  assert(ids.has(match[1]),"JavaScript references missing UI element: "+match[1]);
}
assert(!html.includes('class="hero"'),"Decorative Bible hero must be removed");
assert(!html.includes('class="brand-icon"'),"Sidebar Bible title must be text only");
assert(html.includes("class=\"google-logo\""),"Missing multicolor Google icon");
assert(html.includes("ព្រះគម្ពីរបរិសុទ្ធ"),"Missing Khmer Bible title");
assert(html.includes("បកប្រែចាស់ ១៩៥៤"),"Missing Khmer Bible translation subtitle");
assert(html.includes('<script src="./i18n.js" defer></script>'),"Translations must load before app.js");
assert(/--sidebar-width/.test(css)&&/sidebar-resize/.test(css),"Missing resizable sidebar styles");
assert(/changeTestament\("old"\)/.test(js)&&/changeTestament\("new"\)/.test(js),"Both tabs must select the matching Testament");
assert(/meta\.testament==="OT"\?"old":"new"/.test(js),"Testament selection must derive from source metadata");
assert(!js.includes('item.querySelector("small").textContent=enFor(b)'),"Sidebar must not render English book names");
assert(/bibleapp\.study\.v1/.test(js)&&/bibleapp\.prefs\.v1/.test(js),"Existing saved study keys must not change");
assert(sw.includes("bibleapp-web-v0.1.1")&&sw.includes("./i18n.js"),"Offline cache must include the new translations");

const context={window:{}};
runInNewContext(i18n,context,{timeout:1000});
const languages=context.window.BIBLE_LOCALES;
assert(languages?.en&&languages?.kh,"Missing EN/KH translations");
const staticKeys=[...new Set([...html.matchAll(/data-i18n(?:-(?:placeholder|title|aria))?="([^"]+)"/g)].map(m=>m[1]))];
for(const k of staticKeys)for(const lang of ["en","kh"])assert(typeof languages[lang][k]==="string"&&languages[lang][k].length>0,lang+" missing UI string "+k);

const data=JSON.parse(file("data/manifest.json"));
assert.equal(data.books.length,66,"All Bible books must remain in the app");
assert.equal(data.books.find(b=>b.id==="HAG")?.testament,"OT","Haggai must be in Old Testament");
assert.equal(data.books.find(b=>b.id==="JHN")?.testament,"NT","John must be in New Testament");
console.log("UI contract OK: sidebar, Google logo, EN/KH ("+staticKeys.length+" labels), Testament sync, 66 books, offline cache and saved keys.");
