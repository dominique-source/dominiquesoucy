import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const names = ['marie-eve-gagnon','julie-martin','marc-tremblay','anne-richard','sofia-mendes','malik-laurent','naomi-diallo','alex-nguyen'].map(id=>id+'.png');
export function extractReporters(archivePath, outputDir) {
  const archive = readFileSync(archivePath);
  let eocd = archive.length-22;
  while(eocd>=Math.max(0,archive.length-65557) && archive.readUInt32LE(eocd)!==0x06054b50) eocd--;
  if(eocd<Math.max(0,archive.length-65557)) throw Error('Invalid reporter ZIP');
  const count=archive.readUInt16LE(eocd+10);
  let offset=archive.readUInt32LE(eocd+16);
  const found=new Map();
  for(let i=0;i<count;i++) {
    if(archive.readUInt32LE(offset)!==0x02014b50) throw Error('Invalid reporter ZIP directory');
    const method=archive.readUInt16LE(offset+10), compressed=archive.readUInt32LE(offset+20), size=archive.readUInt32LE(offset+24);
    const nameLength=archive.readUInt16LE(offset+28), extra=archive.readUInt16LE(offset+30), comment=archive.readUInt16LE(offset+32);
    const local=archive.readUInt32LE(offset+42), name=archive.toString('utf8',offset+46,offset+46+nameLength);
    offset+=46+nameLength+extra+comment;
    if(!names.includes(name)) continue;
    if(found.has(name)||size>8_000_000||size<8||archive.readUInt32LE(local)!==0x04034b50) throw Error('Invalid portrait: '+name);
    const start=local+30+archive.readUInt16LE(local+26)+archive.readUInt16LE(local+28);
    if(start+compressed>archive.length) throw Error('Truncated portrait: '+name);
    const data=archive.subarray(start,start+compressed);
    const png=method===0?data:method===8?inflateRawSync(data,{maxOutputLength:8_000_000}):null;
    if(!png||png.length!==size||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Invalid PNG: '+name);
    found.set(name,png);
  }
  if(found.size!==names.length) throw Error('Missing portraits: '+names.filter(n=>!found.has(n)).join(', '));
  mkdirSync(outputDir,{recursive:true});
  for(const [name,png] of found) writeFileSync(join(outputDir,name),png);
  console.log('Reporter library: '+found.size+' PNG portraits ready.');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)) {
  extractReporters(resolve(process.argv[2]||'DOM-SOUCY-MEDIA-journalistes-fictifs.zip'),resolve(process.argv[3]||'public/assets/studio/reporters'));
}
