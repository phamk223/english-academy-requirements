require('reflect-metadata');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {NestFactory}=require('@nestjs/core');
const load=p=>require(process.cwd()+'/dist/'+p);
const {AppModule}=load('app.module');
const {configureApplication}=load('config/configure-application');
const {DatabaseService}=load('database/database.service');
const {PasswordService}=load('modules/auth/password.service');

test('attempt lifecycle pins version, isolates students, grades persisted answers and rejects score tampering',async()=>{
 const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false});configureApplication(app);await app.listen(0,'127.0.0.1');
 const base=await app.getUrl(),pool=app.get(DatabaseService).pool,passwords=app.get(PasswordService),prefix='attempt_'+randomUUID(),password=randomUUID();const users=[];let examId;
 async function req(method,path,token,body){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};}
 async function account(role,suffix){const username=prefix+suffix;const id=(await pool.query('INSERT INTO academy.users(username,password_hash) VALUES($1,$2) RETURNING id',[username,await passwords.hash(password)])).rows[0].id;users.push({id,role});await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[id,role]);if(role==='STUDENT')await pool.query("INSERT INTO academy.student_profiles(user_id,display_name) VALUES($1,'Attempt Student')",[id]);const login=await req('POST','/auth/login',null,{username,password});assert.equal(login.status,200);return{id,token:login.body.data.accessToken};}
 try{
  const admin=await account('ADMIN','a'),student=await account('STUDENT','s'),other=await account('STUDENT','o'),teacher=await account('TEACHER','t');
  const exam=await req('POST','/exams',admin.token,{title:'Attempt snapshot'});assert.equal(exam.status,201);examId=exam.body.data.id;
  const section=(await req('POST',`/exams/${examId}/sections`,admin.token,{type:'READING'})).body.data;
  const writing=(await req('POST',`/exams/${examId}/sections`,admin.token,{type:'WRITING'})).body.data;
  async function question(sectionId,body){const r=await req('POST',`/sections/${sectionId}/questions`,admin.token,body);assert.equal(r.status,201);return r.body.data;}
  const multiple=await question(section.id,{type:'MULTIPLE_CHOICE',prompt:'Select both',options:[{content:'A'},{content:'B'},{content:'C'}],answerKey:{correctOptionIndexes:[0,2]}});
  const choose=await question(section.id,{type:'CHOOSE_CORRECT',prompt:'Select one',options:[{content:'A'},{content:'B'}],answerKey:{correctOptionIndexes:[1]}});
  const bool=await question(section.id,{type:'TRUE_FALSE',prompt:'True?',answerKey:{value:false}});
  const short=await question(section.id,{type:'SHORT_ANSWER',prompt:'Greeting',answerKey:{acceptedAnswers:['Hello World']}});
  const match=await question(section.id,{type:'MATCHING',prompt:'Match',answerKey:{pairs:[{left:'A',right:'1'},{left:'B',right:'2'}]}});
  const manual=await question(writing.id,{type:'SHORT_ANSWER',prompt:'Write',answerKey:{acceptedAnswers:['Essay']}});
  await req('PATCH',`/exams/${examId}`,admin.token,{status:'PUBLISHED'});
  assert.equal((await req('POST',`/exams/${examId}/attempts`,other.token,{})).status,404);
  await req('POST',`/exams/${examId}/assignments`,admin.token,{studentId:student.id});
  const starts=await Promise.all([req('POST',`/exams/${examId}/attempts`,student.token,{}),req('POST',`/exams/${examId}/attempts`,student.token,{})]);assert.equal(starts[0].status,201,JSON.stringify(starts[0]));assert.equal(starts[0].body.data.id,starts[1].body.data.id);
  const attempt=starts[0].body.data,id=attempt.id,version=attempt.examVersionId;
  assert.equal(attempt.status,'IN_PROGRESS');assert.equal(JSON.stringify(attempt).includes('answerKey'),false);
  assert.equal((await req('GET',`/attempts/${id}`,other.token)).status,404);assert.equal((await req('GET',`/attempts/${id}`,null)).status,401);assert.equal((await req('GET',`/attempts/${id}`,teacher.token)).status,404);assert.equal((await req('GET',`/attempts/${id}`,admin.token)).status,200);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,other.token,{answers:[{questionId:short.id,answer:{text:'Hello World'}}]})).status,404);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,admin.token,{answers:[{questionId:short.id,answer:{text:'Hello World'}}]})).status,403);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,student.token,{score:99,answers:[{questionId:short.id,answer:{text:'Hello World'}}]})).status,400);
  assert.equal((await req('POST',`/attempts/${id}/submit`,student.token,{score:99})).status,400);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,student.token,{answers:[{questionId:short.id,answer:{text:'Hello World',score:99}}]})).status,400);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,student.token,{answers:[{questionId:randomUUID(),answer:{text:'Hello World'}}]})).status,400);
  const answers=[{questionId:multiple.id,answer:{selectedOptionIds:[multiple.options[2].id,multiple.options[0].id]}},{questionId:choose.id,answer:{selectedOptionIds:[choose.options[1].id]}},{questionId:bool.id,answer:{value:false}},{questionId:short.id,answer:{text:' HELLO   world '}},{questionId:match.id,answer:{pairs:[{left:'B',right:'2'},{left:'A',right:'1'}]}},{questionId:manual.id,answer:{text:'Essay'}}];
  const saved=await req('PATCH',`/attempts/${id}/answers`,student.token,{answers});assert.equal(saved.status,200);assert.equal(saved.body.data.score,0);
  // Publish changed key after attempt starts: it must still grade with its original key.
  await req('PATCH',`/questions/${bool.id}`,admin.token,{answerKey:{value:true}});await req('DELETE',`/sections/${writing.id}`,admin.token);await req('PATCH',`/exams/${examId}`,admin.token,{status:'PUBLISHED'});
  const submissions=await Promise.all([req('POST',`/attempts/${id}/submit`,student.token,{}),req('POST',`/attempts/${id}/submit`,student.token,{})]);const result=submissions[0].body.data;assert.equal(submissions[0].status,200);assert.equal(result.examVersionId,version);assert.equal(result.score,5);assert.equal(result.maxScore,6);assert.equal(result.status,'SUBMITTED');assert.equal(result.gradingStatus,'NEEDS_MANUAL_GRADING');assert.equal(result.answers.find(a=>a.questionId===manual.id).gradingStatus,'NEEDS_MANUAL_GRADING');assert.equal(submissions[1].body.data.score,5);
  assert.equal((await req('PATCH',`/attempts/${id}/answers`,student.token,{answers})).status,409);
  const next=(await req('POST',`/exams/${examId}/attempts`,student.token,{})).body.data;assert.notEqual(next.examVersionId,version);
  // Objective-only version: unanswered questions receive zero, no manual grading needed.
  const final=await req('POST',`/attempts/${next.id}/submit`,student.token,{});assert.equal(final.body.data.status,'GRADED');assert.equal(final.body.data.score,0);assert.equal(final.body.data.maxScore,5);assert.ok(final.body.data.gradedAt);
 }finally{
  if(examId){await pool.query('DELETE FROM academy.exam_attempts WHERE exam_id=$1',[examId]);await pool.query('DELETE FROM academy.exam_assignments WHERE exam_id=$1',[examId]);await pool.query("UPDATE academy.exams SET published_version_id=NULL,status='DRAFT' WHERE id=$1",[examId]);await pool.query('DELETE FROM academy.exam_sections WHERE exam_version_id IN(SELECT id FROM academy.exam_versions WHERE exam_id=$1)',[examId]);await pool.query('DELETE FROM academy.exam_versions WHERE exam_id=$1',[examId]);await pool.query('DELETE FROM academy.exams WHERE id=$1',[examId]);}
  for(const u of users){if(u.role==='STUDENT')await pool.query('DELETE FROM academy.student_profiles WHERE user_id=$1',[u.id]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=$1',[u.id]);await pool.query('DELETE FROM academy.users WHERE id=$1',[u.id]);}await app.close();
 }
});
