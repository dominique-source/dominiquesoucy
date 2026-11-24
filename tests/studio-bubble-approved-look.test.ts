import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
test("Bubble editor uses editable visual overlays with the approved glossy journalist and quote styles",()=>{
 const jsx=readFileSync("components/analysis/bubble-workshop-simple.tsx","utf8");
 const css=readFileSync("app/[lang]/studio-analyse/analysis.css","utf8");
 assert.ok(jsx.includes("studio-bubble-click-to-edit"));
 assert.ok(jsx.includes("onClick={editBubble}"));
 assert.ok(jsx.includes("ref={editorRef}"));
 assert.ok(jsx.includes("journalistName"));
 assert.ok(jsx.includes("journalistOutlet"));
 assert.ok(jsx.includes("journalistPhotoUrl"));
 assert.ok(jsx.includes('accept="image/png"'));
 assert.ok(css.includes(".ds-bubble-journalist-portrait"));
 assert.ok(css.includes(".ds-bubble-glass::before"));
 assert.ok(css.includes("rgba(204,255,0,.44)"));
});
test("Original video background unchanged and unverified journalist questions remain labeled as reconstruction",()=>{
 const jsx=readFileSync("components/analysis/bubble-workshop-simple.tsx","utf8");
 assert.ok(jsx.includes('background:"original"'));
 assert.ok(jsx.includes("enabled:false"));
 assert.ok(jsx.includes("RECONSTITUTION ÉDITORIALE"));
 assert.ok(jsx.includes("questionAttribution"));
});
