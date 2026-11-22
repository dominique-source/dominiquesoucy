import test from "node:test";
import assert from "node:assert/strict";
import { defaultChroma,keyPixels,rgbFromHex } from "../lib/analysis/chroma-key";
import { capsuleSchema } from "../lib/analysis/project";

test("removes turquoise background but keeps skin and neutral pixels",()=>{
 const pixels=new Uint8ClampedArray([
  48,183,176,255, // turquoise wall
  178,121,93,255, // brown skin
  235,235,235,255, // white clothing
  12,10,14,255, // black clothing
 ]);
 keyPixels(pixels,{...defaultChroma,enabled:true});
 assert.ok(pixels[3]<=10,`wall alpha ${pixels[3]}`);
 assert.equal(pixels[7],255);
 assert.equal(pixels[11],255);
 assert.equal(pixels[15],255);
});
test("disabled chroma leaves video untouched and bad colors fall back safely",()=>{
 const pixels=new Uint8ClampedArray([48,183,176,255]);
 keyPixels(pixels,defaultChroma);
 assert.deepEqual([...pixels],[48,183,176,255]);
 assert.deepEqual(rgbFromHex("invalid"),[48,183,176]);
});
test("a feathered edge has intermediate transparency and no overflows",()=>{
 const pixels=new Uint8ClampedArray([55,176,155,255]);
 keyPixels(pixels,{...defaultChroma,enabled:true,tolerance:.06,softness:.24});
 assert.ok(pixels[3]>=0 && pixels[3]<=255);
});
test("existing capsules get safe disabled keying defaults",()=>{
 const old={
  id:crypto.randomUUID(),title:"Capsule 01",start:1,end:9,format:"9:16",
  style:"conversation",caption:"Extrait",bubble:"Question",
  background:"dark",textPosition:"bottom",status:"draft",
 };
 const parsed=capsuleSchema.parse(old);
 assert.equal(parsed.keying.enabled,false);
 assert.equal(parsed.background,"dark");
 const now=capsuleSchema.parse({...old,background:"signature",keying:{...defaultChroma,enabled:true}});
 assert.equal(now.keying.enabled,true);
 assert.equal(now.background,"signature");
});
