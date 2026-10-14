require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const load = path => require(process.cwd() + '/dist/' + path);
const { AppModule } = load('app.module');
const { configureApplication } = load('config/configure-application');
const { DatabaseService } = load('database/database.service');
const { PasswordService } = load('modules/auth/password.service');

test('media storage and published assignment access are enforced with deduplicated student results', async () => {
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false }); configureApplication(app); await app.listen(0,'127.0.0.1');
  const base=await app.getUrl(),pool=app.get(DatabaseService).pool,passwords=app.get(PasswordService),prefix='media_'+randomBytes(8).toString('hex'),password=randomBytes(24).toString('base64url');
  let adminId,studentId,teacherId,examId,classId,mediaId;
  async function request(method,path,token,body){const headers={...(token?{Authorization:`Bearer ${token}`}:{})};let options={method,headers};if(body instanceof FormData){options.body=body;}else if(body!==undefined){headers['Content-Type']='application/json';options.body=JSON.stringify(body);}const response=await fetch(base+path,options);const type=response.headers.get('content-type')||'';return{status:response.status,json:type.includes('json')?await response.json():undefined,bytes:type.includes('json')?undefined:Buffer.from(await response.arrayBuffer()),headers:response.headers};}
  async function login(username,secret){const r=await request('POST','/auth/login',null,{username,password:secret});assert.equal(r.status,200);return r.json.data.accessToken;}
  try{
    adminId=(await pool.query('INSERT INTO academy.users(username,password_hash) VALUES($1,$2) RETURNING id',[prefix,await passwords.hash(password)])).rows[0].id;
    await pool.query(`INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code='ADMIN'`,[adminId]);const admin=await login(prefix,password);
    const student=await request('POST','/students',admin,{username:prefix+'_student',displayName:'Media Assignment Student'});assert.equal(student.status,201);studentId=student.json.data.id;const studentToken=await login(prefix+'_student',student.json.data.temporaryPassword);
    const teacher=await request('POST','/teachers',admin,{username:prefix+'_teacher',displayName:'Media Assignment Teacher'});assert.equal(teacher.status,201);teacherId=teacher.json.data.id;const teacherToken=await login(prefix+'_teacher',teacher.json.data.temporaryPassword);
    const exam=await request('POST','/exams',admin,{title:'Media assignment exam'});assert.equal(exam.status,201);examId=exam.json.data.id;
    const section=await request('POST',`/exams/${examId}/sections`,admin,{type:'LISTENING'});assert.equal(section.status,201);const sectionId=section.json.data.id;
    const invalid=new FormData();invalid.append('file',new Blob([Buffer.from([137,80,78,71,13,10,26,10])],{type:'text/plain'}),'bad.txt');assert.equal((await request('POST','/media/upload',admin,invalid)).status,415);
    const large=new FormData();large.append('file',new Blob([new Uint8Array(20*1024*1024+1)],{type:'image/png'}),'large.png');const tooLarge=await request('POST','/media/upload',admin,large);assert.equal(tooLarge.status,413);assert.equal(tooLarge.json.error.code,'PAYLOAD_TOO_LARGE');
    const form=new FormData();form.append('file',new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'sound.png');form.append('sectionId',sectionId);
    const uploaded=await request('POST','/media/upload',admin,form);assert.equal(uploaded.status,201,JSON.stringify(uploaded.json));mediaId=uploaded.json.data.id;assert.equal(uploaded.json.data.type,'IMAGE');
    const published=await request('PATCH',`/exams/${examId}`,admin,{status:'PUBLISHED'});assert.equal(published.status,200);assert.equal(published.json.data.publishedVersion.sections[0].media[0].id,mediaId);
    assert.equal((await request('GET',`/media/${mediaId}/content`,studentToken)).status,404);
    const created=await request('POST',`/exams/${examId}/assignments`,admin,{studentId});assert.equal(created.status,201);
    assert.equal((await request('POST',`/exams/${examId}/assignments`,admin,{studentId})).status,409);
    classId=(await pool.query(`INSERT INTO academy.classes(class_code,class_name,created_by) VALUES($1,'Media Test Class',$2) RETURNING id`,[prefix,adminId])).rows[0].id;
    await pool.query('INSERT INTO academy.class_memberships(class_id,student_id,created_by) VALUES($1,$2,$3)',[classId,studentId,adminId]);
    await pool.query('INSERT INTO academy.teacher_class_assignments(class_id,teacher_id,assigned_by) VALUES($1,$2,$3)',[classId,teacherId,adminId]);
    const classAssign=await request('POST',`/exams/${examId}/assignments`,admin,{classId});assert.equal(classAssign.status,201);
    const list=await request('GET','/students/me/assignments?page=1&limit=10',studentToken);assert.equal(list.status,200);assert.equal(list.json.data.length,1);assert.deepEqual(list.json.data[0].sources,['CLASS','DIRECT']);assert.equal(list.json.meta.pagination.total,1);
    const teacherList=await request('GET',`/students/${studentId}/assignments`,teacherToken);assert.equal(teacherList.status,200);assert.deepEqual(teacherList.json.data[0].sources,['CLASS']);
    assert.equal((await request('GET',`/students/${adminId}/assignments`,studentToken)).status,403);
    const blob=await request('GET',`/media/${mediaId}/content`,studentToken);assert.equal(blob.status,200);assert.equal(blob.headers.get('content-type'),'image/png');assert.deepEqual(blob.bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
    assert.equal((await request('DELETE',`/media/${mediaId}`,admin)).status,409);
  }finally{
    if(examId){await pool.query('DELETE FROM academy.exam_assignments WHERE exam_id=$1',[examId]);await pool.query('UPDATE academy.exams SET published_version_id=NULL,status=\'DRAFT\' WHERE id=$1',[examId]);await pool.query('DELETE FROM academy.exam_sections WHERE exam_version_id IN (SELECT id FROM academy.exam_versions WHERE exam_id=$1)',[examId]);await pool.query('DELETE FROM academy.exam_versions WHERE exam_id=$1',[examId]);await pool.query('DELETE FROM academy.exams WHERE id=$1',[examId]);}
    if(mediaId){const del=await fetch(base+`/media/${mediaId}`,{method:'DELETE',headers:{Authorization:`Bearer ${await login(prefix,password)}`}});void del;}
    if(classId){await pool.query('DELETE FROM academy.teacher_class_assignments WHERE class_id=$1',[classId]);await pool.query('DELETE FROM academy.class_memberships WHERE class_id=$1',[classId]);await pool.query('DELETE FROM academy.classes WHERE id=$1',[classId]);}
    if(studentId){await pool.query('DELETE FROM academy.student_profiles WHERE user_id=$1',[studentId]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=$1',[studentId]);await pool.query('DELETE FROM academy.users WHERE id=$1',[studentId]);}
    if(teacherId){await pool.query('DELETE FROM academy.teacher_profiles WHERE user_id=$1',[teacherId]);await pool.query('DELETE FROM academy.user_roles WHERE user_id=$1',[teacherId]);await pool.query('DELETE FROM academy.users WHERE id=$1',[teacherId]);}
    if(adminId){await pool.query('DELETE FROM academy.user_roles WHERE user_id=$1',[adminId]);await pool.query('DELETE FROM academy.users WHERE id=$1',[adminId]);}
    await app.close();
  }
});
