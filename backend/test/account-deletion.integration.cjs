require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{NestFactory}=require('@nestjs/core');
const load=p=>require(process.cwd()+'/dist/'+p);
const {AppModule}=load('app.module'),{configureApplication}=load('config/configure-application'),{DatabaseService}=load('database/database.service'),{PasswordService}=load('modules/auth/password.service');

test('deleting students/teachers revokes every session while all ADMIN accounts remain protected',async()=>{
 const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false});configureApplication(app);await app.listen(0,'127.0.0.1');
 const base=await app.getUrl(),pool=app.get(DatabaseService).pool,passwords=app.get(PasswordService),prefix='delete_'+randomUUID(),password=randomUUID(),ids=[];let examId;
 async function req(method,path,token,body){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};}
 async function login(username){return req('POST','/auth/login',null,{username,password});}
 async function account(role,suffix,status='ACTIVE'){
  const username=prefix+suffix,id=(await pool.query('INSERT INTO academy.users(username,password_hash,status) VALUES($1,$2,$3) RETURNING id',[username,await passwords.hash(password),status])).rows[0].id;ids.push(id);
  await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[id,role]);
  if(role!=='ADMIN')await pool.query(`INSERT INTO academy.${role==='STUDENT'?'student_profiles':'teacher_profiles'}(user_id,display_name) VALUES($1,'Deletion test')`,[id]);
  const signed=status==='ACTIVE'?await login(username):null;if(signed)assert.equal(signed.status,200);return{id,username,tokens:signed?.body.data};
 }
 try{
  const admin=await account('ADMIN','a'),student=await account('STUDENT','s'),teacher=await account('TEACHER','t'),targetAdmin=await account('ADMIN','b'),inactive=await account('STUDENT','i','INACTIVE'),token=admin.tokens.accessToken;
  // ADMIN remains protected even when the same user is also a student and teacher.
  for(const role of ['STUDENT','TEACHER']){await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[targetAdmin.id,role]);await pool.query(`INSERT INTO academy.${role==='STUDENT'?'student_profiles':'teacher_profiles'}(user_id,display_name) VALUES($1,'Protected administrator')`,[targetAdmin.id]);}
  assert.equal((await req('DELETE',`/users/${student.id}`,null)).status,401);
  assert.equal((await req('DELETE',`/users/${student.id}`,teacher.tokens.accessToken)).status,403);
  assert.equal((await req('DELETE',`/users/${teacher.id}`,student.tokens.accessToken)).status,403);
  assert.equal((await req('DELETE',`/users/${admin.id}`,token)).status,409);
  for(const resource of ['users','students','teachers'])assert.equal((await req('DELETE',`/${resource}/${targetAdmin.id}`,token)).status,409);
  assert.equal((await req('GET','/auth/me',targetAdmin.tokens.accessToken)).status,200);
  assert.equal((await req('DELETE',`/students/${student.id}`,teacher.tokens.accessToken)).status,403);
  assert.equal((await req('DELETE',`/teachers/${teacher.id}`,teacher.tokens.accessToken)).status,403);
  assert.equal((await req('DELETE',`/students/${teacher.id}`,token)).status,404);
  assert.equal((await req('DELETE',`/teachers/${student.id}`,token)).status,404);
  assert.equal((await req('DELETE',`/users/${randomUUID()}`,token)).status,404);
  assert.equal((await req('DELETE','/users/invalid',token)).status,400);
  const bad=await req('DELETE',`/users/${student.id}`,token,{status:'ACTIVE'});assert.equal(bad.status,400);assert.equal(bad.body.error.fields[0].field,'status');

  // A second device and a rotated refresh token must all lose access on deletion.
  const second=(await login(student.username)).body.data;
  const rotation=await req('POST','/auth/refresh',null,{refreshToken:student.tokens.refreshToken});assert.equal(rotation.status,200);const rotated=rotation.body.data;
  const exam=await req('POST','/exams',token,{title:'Deletion history',status:'PUBLISHED'});assert.equal(exam.status,201);examId=exam.body.data.id;
  await req('POST',`/exams/${examId}/assignments`,token,{studentId:student.id});
  const attempt=await req('POST',`/exams/${examId}/attempts`,second.accessToken,{});assert.equal(attempt.status,201);
  const deleted=await req('DELETE',`/students/${student.id}`,token);assert.equal(deleted.status,200);assert.equal(deleted.body.data.deleted,true);assert.equal(deleted.body.data.id,student.id);assert.ok(deleted.body.data.deletedAt);assert.equal(JSON.stringify(deleted.body).includes('password'),false);
  const repeat=await req('DELETE',`/users/${student.id}`,token);assert.equal(repeat.status,200);assert.equal(repeat.body.data.deletedAt,deleted.body.data.deletedAt);
  for(const device of [student.tokens,second,rotated]){assert.equal((await req('GET','/auth/me',device.accessToken)).status,401);assert.equal((await req('POST','/auth/refresh',null,{refreshToken:device.refreshToken})).status,401);}
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM academy.auth_sessions WHERE user_id=$1 AND revoked_at IS NULL',[student.id])).rows[0].n,0);
  const noLogin=await login(student.username),missing=await login(prefix+'_missing');assert.equal(noLogin.status,401);assert.deepEqual(noLogin.body.error,missing.body.error);
  assert.equal((await req('GET',`/students/${student.id}`,token)).status,404);
  const list=await req('GET',`/students?q=${encodeURIComponent(student.username)}&status=INACTIVE`,token);assert.equal(list.status,200);assert.equal(list.body.meta.pagination.total,0);
  assert.equal((await req('PATCH',`/students/${student.id}/status`,token,{status:'ACTIVE'})).status,404);
  assert.equal((await req('PATCH',`/students/${student.id}`,token,{displayName:'Restore'})).status,404);
  assert.equal((await req('POST',`/students/${student.id}/reset-password`,token,{})).status,404);
  await assert.rejects(pool.query("UPDATE academy.users SET deleted_at=NULL,deleted_by=NULL,status='ACTIVE' WHERE id=$1",[student.id]),e=>e.code==='23514');
  assert.equal((await req('GET',`/attempts/${attempt.body.data.id}`,token)).status,200);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM academy.exam_assignments WHERE student_id=$1',[student.id])).rows[0].n,1);

  const seeded=(await pool.query("INSERT INTO academy.auth_sessions(user_id,expires_at) VALUES($1,now()+interval '1 hour') RETURNING id",[inactive.id])).rows[0];
  assert.equal((await req('DELETE',`/users/${inactive.id}`,token)).status,200);assert.ok((await pool.query('SELECT revoked_at FROM academy.auth_sessions WHERE id=$1',[seeded.id])).rows[0].revoked_at);
  const teacherSecond=(await login(teacher.username)).body.data;
  const teacherRotated=(await req('POST','/auth/refresh',null,{refreshToken:teacher.tokens.refreshToken})).body.data;
  assert.equal((await req('DELETE',`/teachers/${teacher.id}`,token)).status,200);
  for(const device of [teacher.tokens,teacherSecond,teacherRotated]){assert.equal((await req('GET','/auth/me',device.accessToken)).status,401);assert.equal((await req('POST','/auth/refresh',null,{refreshToken:device.refreshToken})).status,401);}
  assert.equal((await login(teacher.username)).status,401);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM academy.auth_sessions WHERE user_id=$1 AND revoked_at IS NULL',[teacher.id])).rows[0].n,0);
  assert.equal((await req('GET',`/teachers/${teacher.id}`,token)).status,404);
  assert.equal((await req('PATCH',`/teachers/${teacher.id}/status`,token,{status:'ACTIVE'})).status,404);
  const audit=(await pool.query("SELECT 1 FROM academy.audit_log WHERE kind='REQUEST' AND actor_id=$1 AND resource_id=$2 AND action='DELETE'",[admin.id,student.id])).rowCount;assert.ok(audit);

  // Neither administrator can delete the other, including simultaneous requests.
  const cross=await account('ADMIN','c');const mutual=await Promise.all([req('DELETE',`/users/${cross.id}`,token),req('DELETE',`/users/${admin.id}`,cross.tokens.accessToken)]);
  assert.deepEqual(mutual.map(r=>r.status),[409,409]);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM academy.users WHERE id=ANY($1::uuid[]) AND status='ACTIVE' AND deleted_at IS NULL",[[admin.id,cross.id]])).rows[0].n,2);
  for(const administrator of [admin,targetAdmin,cross]){assert.equal((await req('GET','/auth/me',administrator.tokens.accessToken)).status,200);assert.equal((await pool.query('SELECT deleted_at FROM academy.users WHERE id=$1',[administrator.id])).rows[0].deleted_at,null);}
 }finally{
  if(examId){await pool.query('DELETE FROM academy.exam_attempts WHERE exam_id=$1',[examId]);await pool.query('DELETE FROM academy.exam_assignments WHERE exam_id=$1',[examId]);await pool.query("UPDATE academy.exams SET published_version_id=NULL,status='DRAFT' WHERE id=$1",[examId]);await pool.query('DELETE FROM academy.exam_versions WHERE exam_id=$1',[examId]);await pool.query('DELETE FROM academy.exams WHERE id=$1',[examId]);}
  if(ids.length){await pool.query('DELETE FROM academy.student_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.teacher_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.users WHERE id=ANY($1::uuid[])',[ids]);}await app.close();
 }
});
