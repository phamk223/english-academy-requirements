import { inflateRawSync } from 'node:zlib';
function crc32(b:Buffer){let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
// Bounded, read-only ZIP reader: never extracts names to filesystem; no ZIP64/encryption/symlinks.
export function readZip(b:Buffer):Map<string,Buffer>{
 const fail=()=>{throw new Error('INVALID_OR_UNSAFE_ZIP');};let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(b.readUInt32LE(i)===0x06054b50&&i+22+b.readUInt16LE(i+20)===b.length){eocd=i;break;}
 if(eocd<0)return fail();if(b.readUInt16LE(eocd+4)||b.readUInt16LE(eocd+6))return fail();
 const count=b.readUInt16LE(eocd+10),size=b.readUInt32LE(eocd+12),offset=b.readUInt32LE(eocd+16);if(!count||count>100||offset+size>eocd||b.readUInt16LE(eocd+8)!==count)return fail();
 const files=new Map<string,Buffer>();let p=offset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>b.length||b.readUInt32LE(p)!==0x02014b50)return fail();const flags=b.readUInt16LE(p+8),method=b.readUInt16LE(p+10),crc=b.readUInt32LE(p+16),compressed=b.readUInt32LE(p+20),expanded=b.readUInt32LE(p+24),nameLen=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30),comment=b.readUInt16LE(p+32),local=b.readUInt32LE(p+42),mode=b.readUInt32LE(p+38)>>>16;
  if(p+46+nameLen+extra+comment>offset+size||flags&1||![0,8].includes(method)||expanded>33554432||expanded>Math.max(1024,compressed*100)||(mode&0xf000)===0xa000)return fail();
  const name=b.subarray(p+46,p+46+nameLen).toString('utf8');if(!name||name.length>512||name.includes('\\')||name.includes('\0')||name.startsWith('/')||name.includes(':')||name.split('/').some(x=>x==='..'||x==='.')||files.has(name))return fail();
  total+=expanded;if(total>67108864||local+30>offset||b.readUInt32LE(local)!==0x04034b50||b.readUInt16LE(local+8)!==method)return fail();
  const localName=b.readUInt16LE(local+26),localExtra=b.readUInt16LE(local+28),start=local+30+localName+localExtra;if(start+compressed>offset||b.subarray(local+30,local+30+localName).toString('utf8')!==name)return fail();
  const data=method===0?b.subarray(start,start+compressed):inflateRawSync(b.subarray(start,start+compressed),{maxOutputLength:Math.max(1,expanded)});if(data.length!==expanded||crc32(data)!==crc)return fail();
  if(!name.endsWith('/'))files.set(name,data);p+=46+nameLen+extra+comment;
 }if(p!==offset+size)return fail();return files;
}
