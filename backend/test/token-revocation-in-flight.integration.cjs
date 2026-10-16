require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{NestFactory}=require('@nestjs/core');
const load=p=>require(process.cwd()+'/dist/'+p);
const {AppModule}=load('app.module'),{configureApplication}=load('config/configure-application'),{DatabaseService}=load('database/database.service'),{PasswordService}=load('modules/auth/password.service');

test('ADMIN revokes tokens while a student/teacher API request is in flight', {timeout:30000}, async t=>{
 const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false});configureApplication(app);
 let gate;
 // Test-only barrier: hold a real HTTP request after authentication, without timing-based sleeps.
 app.useGlobalInterceptors({async intercept(context,next){
  const request=context.switchToHttp().getRequest();
  if(gate && request.method==='GET' && request.url==='/auth/me' && request.currentUser?.id===gate.userId){
   const current=gate;gate=undefined;current.entered.resolve();await current.release.promise;
  }
  return next.handle();
 }});
 await app.listen(0,'127.0.0.1');
 const base=await app.getUrl(),pool=app.get(DatabaseService).pool,passwords=app.get(PasswordService),prefix='inflight_'+randomUUID(),password=randomUUID(),ids=[];
 async function req(method,path,token,body){
  const response=await fetch(base+path,{method,signal:AbortSignal.timeout(10000),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return{status:response.status,body:await response.json()};
 }
 const login=username=>req('POST','/auth/login',null,{username,password});
 async function account(role){
  const username=prefix+role,id=(await pool.query('INSERT INTO academy.users(username,password_hash) VALUES($1,$2) RETURNING id',[username,await passwords.hash(password)])).rows[0].id;ids.push(id);
  await pool.query('INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code=$2',[id,role]);
  if(role!=='ADMIN')await pool.query(`INSERT INTO academy.${role==='STUDENT'?'student_profiles':'teacher_profiles'}(user_id,display_name) VALUES($1,'In-flight test')`,[id]);
  const signed=await login(username);assert.equal(signed.status,200);return{id,username,tokens:signed.body.data};
 }
 try{
  const admin=await account('ADMIN');
  for(const role of ['STUDENT','TEACHER'])await t.test(role,async()=>{
   const user=await account(role),resource=role==='STUDENT'?'students':'teachers',path=`/${resource}/${user.id}/status`;
   const second=(await login(user.username)).body.data;
   assert.equal((await req('GET','/auth/me',user.tokens.accessToken)).status,200);
   const current={userId:user.id,entered:Promise.withResolvers(),release:Promise.withResolvers()};gate=current;
   const inFlight=req('GET','/auth/me',user.tokens.accessToken);
   // Observe settlement immediately so a failed request cannot become an unhandled rejection.
   const settled=inFlight.then(value=>({value}),error=>({error}));
   try{
    await Promise.race([current.entered.promise,settled.then(()=>{throw new Error('Request never reached authenticated barrier');})]);
    const revoked=await req('PATCH',path,admin.tokens.accessToken,{status:'LOCKED'});
    assert.equal(revoked.status,200);assert.equal(revoked.body.data.status,'LOCKED');
    // New calls fail even while the earlier, already-authorized request is still pending.
    for(const device of [user.tokens,second]){
     const calls=await Promise.all(Array.from({length:3},()=>req('GET','/auth/me',device.accessToken)));
     assert.deepEqual(calls.map(call=>call.status),[401,401,401]);
     assert.equal((await req('POST','/auth/refresh',null,{refreshToken:device.refreshToken})).status,401);
    }
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM academy.auth_sessions WHERE user_id=$1 AND revoked_at IS NULL',[user.id])).rows[0].n,0);
    current.release.resolve();
    // Revocation does not cancel work that already passed authentication.
    const completed=await inFlight;assert.equal(completed.status,200);
    assert.equal((await req('GET','/auth/me',user.tokens.accessToken)).status,401);
    assert.equal((await login(user.username)).status,401);
    assert.equal((await req('PATCH',path,admin.tokens.accessToken,{status:'ACTIVE'})).status,200);
    assert.equal((await req('GET','/auth/me',user.tokens.accessToken)).status,401);
    assert.equal((await req('POST','/auth/refresh',null,{refreshToken:second.refreshToken})).status,401);
    const fresh=await login(user.username);assert.equal(fresh.status,200);
    assert.equal((await req('GET','/auth/me',fresh.body.data.accessToken)).status,200);
   }finally{gate=undefined;current.release.resolve();await settled;}
  });
 }finally{
  if(ids.length){await pool.query('DELETE FROM academy.student_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.teacher_profiles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM academy.users WHERE id=ANY($1::uuid[])',[ids]);}await app.close();
 }
});
