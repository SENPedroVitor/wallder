export function validPixCode(value){
 if(typeof value!=='string'||value.length<40||value.length>2048||!value.startsWith('000201')||!/6304[\da-f]{4}$/i.test(value))return false;
 const bytes=Buffer.from(value.slice(0,-4),'utf8');let crc=0xffff;
 for(const byte of bytes){crc^=byte<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff}
 return crc.toString(16).padStart(4,'0').toUpperCase()===value.slice(-4).toUpperCase();
}
