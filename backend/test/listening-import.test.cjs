require('reflect-metadata');
const {test}=require('node:test');const assert=require('node:assert/strict');
const {listeningCredit}=require('../dist/modules/listening/listening.service');
const {readZip}=require('../dist/modules/imports/zip-reader');
const {normalizeExam}=require('../dist/modules/imports/normalized-exam');
const {reportWindow}=require('../dist/modules/reports/reports.service');
const {zip}=require('./zip-fixture.cjs');
test('listening credit bounds client claims, ignores pauses/seeks and caps heartbeat gaps',()=>{
 const t=new Date('2026-10-15T00:00:00Z'),s={playing:true,last_received_at:t,last_client_timestamp:t,last_position:10};const event={type:'HEARTBEAT',position:20,clientTimestamp:new Date(+t+10000).toISOString()};
 assert.equal(listeningCredit(s,event,new Date(+t+1000)),1000);assert.equal(listeningCredit(s,event,new Date(+t+20000)),10000);
 assert.equal(listeningCredit(s,{...event,position:100,clientTimestamp:new Date(+t+90000).toISOString()},new Date(+t+90000)),15000);
 assert.equal(listeningCredit(s,{...event,type:'SEEK'},new Date(+t+20000)),0);assert.equal(listeningCredit({...s,playing:false},event,new Date(+t+20000)),0);assert.equal(listeningCredit(s,{...event,position:2},new Date(+t+20000)),0);
});
test('ZIP reader bounds decompression and rejects traversal, corruption and malformed packages',()=>{
 assert.equal(readZip(zip({'exam.json':'{}'})).get('exam.json').toString(),'{}');
 assert.throws(()=>readZip(zip({'../evil':'x'})));assert.throws(()=>readZip(Buffer.from('bad')));assert.throws(()=>readZip(zip({'bomb.txt':'A'.repeat(200000)})));
 const corrupt=zip({'exam.json':'{}'});corrupt[40]^=255;assert.throws(()=>readZip(corrupt));
 assert.throws(()=>normalizeExam({title:'bad',sections:[{type:'READING',questions:[{type:'TRUE_FALSE',prompt:'Q',answerKey:{value:'true'}}]}]}));
 assert.throws(()=>normalizeExam({title:'bad',score:999,sections:[]}));
 const result=normalizeExam({title:'Exam',sections:[{type:'READING',questions:[{type:'TRUE_FALSE',prompt:'Q',answerKey:{value:true}}]}]});assert.equal(result.sections.length,1);
});
test('report windows use UTC calendar months and ISO weeks with real week validation',()=>{
 assert.equal(reportWindow({month:'2026-10'})[0].toISOString(),'2026-10-01T00:00:00.000Z');assert.equal(reportWindow({week:'2026-W42'})[0].toISOString(),'2026-10-12T00:00:00.000Z');assert.throws(()=>reportWindow({week:'2025-W53'}));assert.throws(()=>reportWindow({month:'2026-10',week:'2026-W42'}));
});
