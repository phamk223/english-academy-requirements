import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeExam } from './normalized-exam';
import { readZip } from './zip-reader';
const run=promisify(execFile);
function extracted(text:string){const cleaned=text.trim().slice(0,200000);return{exam:normalizeExam({title:'Imported exam — review required',sections:[{type:'READING',config:{sourceText:cleaned},questions:[]}]}),warnings:[cleaned?'Text extracted; create and review questions before publishing':'No text extracted; scanned documents need OCR/manual authoring'],sourceMedia:false};}
export async function parseImport(path:string,mime:string){
 const b=await readFile(path);if(b.length>20971520)throw new Error('FILE_TOO_LARGE');
 if(mime==='application/zip'){
  const files=readZip(b);if(!files.has('exam.json'))throw new Error('PACKAGE_EXAM_JSON_REQUIRED');if(files.size!==1||files.get('exam.json')!.length>1048576)throw new Error('PACKAGE_ONLY_EXAM_JSON_SUPPORTED');
  let raw;try{raw=JSON.parse(files.get('exam.json')!.toString('utf8'));}catch{throw new Error('INVALID_EXAM_JSON');}
  return{exam:normalizeExam(raw),warnings:['Review imported questions and answer keys before publishing'],sourceMedia:false};
 }
 if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
  const xml=readZip(b).get('word/document.xml')?.toString('utf8');if(!xml)throw new Error('DOCX_DOCUMENT_XML_REQUIRED');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('UNSAFE_DOCX_XML');
  return extracted(xml.replace(/<\/w:p>/g,'\n').replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'));
 }
 if(mime==='application/pdf'){try{const result=await run('pdftotext',['-enc','UTF-8','-layout',path,'-'],{timeout:20000,maxBuffer:1048576});return extracted(result.stdout);}catch{throw new Error('PDF_EXTRACTION_FAILED');}}
 if(mime==='text/plain')return extracted(b.toString('utf8'));
 if(mime.startsWith('audio/')||mime.startsWith('image/'))return{exam:normalizeExam({title:'Imported media — review required',sections:[{type:mime.startsWith('audio/')?'LISTENING':'READING',config:{},questions:[]}]}),warnings:['Media attached; transcription/OCR and question generation are not included in MVP'],sourceMedia:true};
 throw new Error('UNSUPPORTED_IMPORT_MIME');
}
if(require.main===module){parseImport(process.argv[2],process.argv[3]).then(result=>process.stdout.write(JSON.stringify(result))).catch(e=>{const allowed=['INVALID_OR_UNSAFE_ZIP','INVALID_NORMALIZED_EXAM','INVALID_ANSWER_KEY','PACKAGE_EXAM_JSON_REQUIRED','PACKAGE_ONLY_EXAM_JSON_SUPPORTED','INVALID_EXAM_JSON','DOCX_DOCUMENT_XML_REQUIRED','UNSAFE_DOCX_XML','PDF_EXTRACTION_FAILED','FILE_TOO_LARGE','UNSUPPORTED_IMPORT_MIME'];process.stdout.write(JSON.stringify({error:allowed.includes(e?.message)?e.message:'IMPORT_PARSE_FAILED'}));});}
