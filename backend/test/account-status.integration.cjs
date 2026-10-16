require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{NestFactory}=require('@nestjs/core');
const load=p=>require(process.cwd()+'/dist/'+p);
const {AppModule}=load('app.module'),{configureApplication}=load('config/configure-application'),{DatabaseService}=load('database/database.service'),{PasswordService}=load('modules/auth/password.service');

test('only ADMIN can lock/unlock students and teachers; revoked tokens never revive',async()=>{
 const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false});configureApplication(app);await app.listen(0,'127.0.0.1');
 const base=await app.getUrl(),pool=app.get(DatabaseService).pool,passwords=app.get(PasswordService),prefix='status_'+randomUUID(),password=randomUUID(),ids=[];
 async function req(method,path,token,body){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};}
 const login=username=>req('POST','/auth/login',null,{username,password});
 async function account(role){
  const username=prefix+role,id=(await pool.query('INSERT INTO academy.users(username,password_hash) VALUES($1,$2) RETURNING id',[username,await passwords.hash(password)])).rows[0].id;ids.push(id);
  await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[id,role]);
  if(role!=='ADMIN')await pool.query(`INSERT INTO academy.${role==='STUDENT'?'student_profiles':'teacher_profiles'}(user_id,display_name) VALUES($1,'Status test')`,[id]);
  const signed=await login(username);assert.equal(signed.status,200);return{id,username,tokens:signed.body.data};
 }
 try{
  const admin=await account('ADMIN'),student=await account('STUDENT'),teacher=await account('TEACHER'),token=admin.tokens.accessToken;
  // Mixed-role administrator targets must be protected through both aliases.
  for(const role of ['STUDENT','TEACHER']){await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[admin.id,role]);await pool.query(`INSERT INTO academy.${role==='STUDENT'?'student_profiles':'teacher_profiles'}(user_id,display_name) VALUES($1,'Protected admin')`,[admin.id]);}
  for(const resource of ['students','teachers'])assert.equal((await req('PATCH',`/${resource}/${admin.id}/status`,token,{status:'LOCKED'})).status,409);
  for(const [resource,target] of [['students',student],['teachers',teacher]]){
   const path=`/${resource}/${target.id}/status`;
   assert.equal((await req('PATCH',path,null,{status:'LOCKED'})).status,401);
   for(const user of [teacher,student])assert.equal((await req('PATCH',path,user.tokens.accessToken,{status:'LOCKED'})).status,403);
   assert.equal((await req('PATCH',`/${resource}/${randomUUID()}/status`,token,{status:'LOCKED'})).status,404);
   assert.equal((await req('PATCH',`/${resource}/invalid/status`,token,{status:'LOCKED'})).status,400);
   const invalid=await req('PATCH',path,token,{status:'INVALID'});assert.equal(invalid.status,400);assert.equal(invalid.body.error.fields[0].field,'status');
   assert.equal((await req('PATCH',path,token,{status:'LOCKED',roles:['ADMIN']})).status,400);
   const first=(await login(target.username)).body.data,second=(await login(target.username)).body.data;
   const rotated=await req('POST','/auth/refresh',null,{refreshToken:first.refreshToken});assert.equal(rotated.status,200);
   const devices=[first,second,rotated.body.data];
   const locked=await req('PATCH',path,token,{status:'LOCKED'});assert.equal(locked.status,200);assert.equal(locked.body.data.status,'LOCKED');assert.equal(JSON.stringify(locked.body).includes('password'),false);
   for(const device of devices){assert.equal((await req('GET','/auth/me',device.accessToken)).status,401);assert.equal((await req('POST','/auth/refresh',null,{refreshToken:device.refreshToken})).status,401);}
   const blocked=await login(target.username),missing=await login(prefix+'_missing');assert.equal(blocked.status,401);assert.deepEqual(blocked.body.error,missing.body.error);
   assert.equal((await pool.query('SELECT count(*)::int AS n FROM academy.auth_sessions WHERE user_id=$1 AND revoked_at IS NULL',[target.id])).rows[0].n,0);
   assert.equal((await req('PATCH',path,token,{status:'LOCKED'})).status,200);
   assert.equal((await req('PATCH',path,token,{status:'ACTIVE'})).body.data.status,'ACTIVE');
   for(const device of devices){assert.equal((await req('GET','/auth/me',device.accessToken)).status,401);assert.equal((await req('POST','/auth/refresh',null,{refreshToken:device.refreshToken})).status,401);}
   assert.equal((await login(target.username)).status,200);
   // The original operator tokens are needed for the next iteration's permission checks.
   target.tokens=(await login(target.username)).body.data;
   assert.ok((await pool.query("SELECT 1 FROM academy.audit_log WHERE actor_id=$1 AND resource_id=$2 AND action='PATCH'",[admin.id,target.id])).rowCount);
  }
  assert.equal((await req('GET','/auth/me',token)).status,200);
  assert.equal((await req('PATCH',`/students/${teacher.id}/status`,token,{status:'LOCKED'})).status,404);
  assert.equal((await req('PATCH',`/teachers/${student.id}/status`,token,{status:'LOCKED'})).status,404);
  assert.equal((await req('DELETE',`/students/${student.id}`,token)).status,200);
  assert.equal((await req('PATCH',`/students/${student.id}/status`,token,{status:'ACTIVE'})).status,404);
 }finally{
  if(ids.length){await pool.query('DELETE FROM academy.student_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.teacher_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.users WHERE id=ANY($1::uuid[])',[ids]);}await app.close();
 }
});
