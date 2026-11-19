import {readFileSync} from "node:fs";
const root=new URL("../web/data/",import.meta.url);
const manifest=JSON.parse(readFileSync(new URL("manifest.json",root),"utf8"));
if(manifest.books.length!==66)throw Error("Expected 66 Bible books");
let chapters=0,verses=0;
for(const b of manifest.books){
  const file=new URL("books/"+b.id+".json",root);
  const data=JSON.parse(readFileSync(file,"utf8"));
  if(data.id!==b.id||data.order!==b.order)throw Error("Book metadata mismatch: "+b.id);
  const actualChapters=Object.keys(data.chapters||{}).length;
  if(actualChapters!==b.chapterCount)throw Error("Chapter count mismatch: "+b.id+" "+actualChapters+" vs "+b.chapterCount);
  chapters+=actualChapters;
  for(const value of Object.values(data.chapters)){
    for(const text of Object.values(value.verses||{})){
      if(typeof text!=="string"||!text.trim())throw Error("Empty or invalid verse: "+b.id);
      verses++;
    }
  }
}
if(chapters!==manifest.version.chapterCount)throw Error("Chapter count inconsistent: "+chapters);
if(verses!==manifest.version.verseCount)throw Error("Verse count inconsistent: "+verses);
console.log("Validated "+manifest.books.length+" books, "+chapters+" chapters, "+verses+" verses.");
