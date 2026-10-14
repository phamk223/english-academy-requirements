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

test('versioned section/question engine validates types, hides answer keys and preserves attempt snapshots', async () => {
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const pool = app.get(DatabaseService).pool;
  const passwords = app.get(PasswordService);
  const prefix = 'content_' + randomBytes(8).toString('hex');
  const password = randomBytes(24).toString('base64url');
  let adminId, studentId, examId;
  async function request(method, path, token, body) {
    const response = await fetch(base + path, { method, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, json: await response.json() };
  }
  async function login(username, secret) {
    const response = await request('POST', '/auth/login', null, { username, password: secret });
    assert.equal(response.status, 200);
    return response.json.data.accessToken;
  }
  try {
    const inserted = await pool.query(`INSERT INTO academy.users(username,password_hash) VALUES($1,$2) RETURNING id`, [prefix, await passwords.hash(password)]);
    adminId = inserted.rows[0].id;
    await pool.query(`INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code='ADMIN'`, [adminId]);
    const admin = await login(prefix, password);

    const exam = await request('POST', '/exams', admin, { title: 'Versioning test' });
    assert.equal(exam.status, 201, JSON.stringify(exam.json)); examId = exam.json.data.id;
    const section = await request('POST', `/exams/${examId}/sections`, admin, { type: 'READING', config: { instructions: 'Read carefully' } });
    assert.equal(section.status, 201); const sectionId = section.json.data.id;
    const invalid = await request('POST', `/sections/${sectionId}/questions`, admin, { type: 'MULTIPLE_CHOICE', prompt: 'Pick', options: [{ content: 'Only one' }], answerKey: { correctOptionIndexes: [0] } });
    assert.equal(invalid.status, 400);
    const first = await request('POST', `/sections/${sectionId}/questions`, admin, { type: 'MULTIPLE_CHOICE', prompt: 'Pick one', options: [{ content: 'A' }, { content: 'B' }], answerKey: { correctOptionIndexes: [1] } });
    assert.equal(first.status, 201); const firstId = first.json.data.id;
    const second = await request('POST', `/sections/${sectionId}/questions`, admin, { type: 'TRUE_FALSE', prompt: 'The sky is blue?', answerKey: { value: true } });
    assert.equal(second.status, 201); const secondId = second.json.data.id;
    const reorder = await request('POST', '/questions/reorder', admin, { sectionId, questionIds: [secondId, firstId] });
    assert.equal(reorder.status, 201);
    const list = await request('GET', `/sections/${sectionId}/questions?page=1&limit=10`, admin);
    assert.equal(list.status, 200); assert.deepEqual(list.json.data.map(q => q.id), [secondId, firstId]);
    assert.deepEqual(list.json.data[1].answerKey, { correctOptionIndexes: [1] });
    assert.equal(list.json.meta.pagination.total, 2);
    const choose = await request('POST', `/sections/${sectionId}/questions`, admin, { type: 'CHOOSE_CORRECT', prompt: 'Choose one', options: [{ content: 'A' }, { content: 'B' }], answerKey: { correctOptionIndexes: [0] } });
    assert.equal(choose.status, 201);
    const matching = await request('POST', `/sections/${sectionId}/questions`, admin, { type: 'MATCHING', prompt: 'Match the pairs', answerKey: { pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] } });
    assert.equal(matching.status, 201);

    const student = await request('POST', '/students', admin, { username: prefix + '_student', displayName: 'Content Test Student' });
    assert.equal(student.status, 201); studentId = student.json.data.id;
    const studentToken = await login(prefix + '_student', student.json.data.temporaryPassword);
    assert.equal((await request('GET', `/exams/${examId}`, studentToken)).status, 404);
    assert.equal((await request('POST', `/sections/${sectionId}/questions`, studentToken, { type: 'TRUE_FALSE', prompt: 'No write', answerKey: { value: true } })).status, 403);
    await pool.query(`DELETE FROM academy.user_roles WHERE user_id=$1 AND role_id=(SELECT id FROM academy.roles WHERE code='ADMIN')`, [adminId]);
    await pool.query(`INSERT INTO academy.user_roles(user_id,role_id) SELECT $1,id FROM academy.roles WHERE code='TEACHER'`, [adminId]);
    const teacherQuestions = await request('GET', `/sections/${sectionId}/questions`, admin);
    assert.equal(teacherQuestions.status, 200); assert.deepEqual(teacherQuestions.json.data[0].answerKey, { value: true });

    const published = await request('PATCH', `/exams/${examId}`, admin, { status: 'PUBLISHED' });
    assert.equal(published.status, 200); const oldVersionId = published.json.data.publishedVersion.id;
    const studentQuestions = await request('GET', `/sections/${sectionId}/questions`, studentToken);
    assert.equal(studentQuestions.status, 200);
    assert.equal('answerKey' in studentQuestions.json.data[0], false);
    assert.equal((await request('GET', `/sections/${sectionId}/questions`, null)).status, 401);

    await pool.query(`INSERT INTO academy.exam_attempts(exam_id,exam_version_id,student_id) VALUES($1,$2,$3)`, [examId, oldVersionId, studentId]);
    const edited = await request('PATCH', `/questions/${firstId}`, admin, { prompt: 'Updated prompt' });
    assert.equal(edited.status, 200); assert.equal(edited.json.data.prompt, 'Updated prompt');
    assert.equal('answerKey' in edited.json.data, true);
    const stillOld = await request('GET', `/sections/${sectionId}/questions`, studentToken);
    assert.equal(stillOld.json.data.find(q => q.id === firstId).prompt, 'Pick one');
    const republished = await request('PATCH', `/exams/${examId}`, admin, { status: 'PUBLISHED' });
    assert.equal(republished.status, 200); assert.notEqual(republished.json.data.publishedVersion.id, oldVersionId);
    const pinned = await pool.query(`SELECT v.title,v.version_number FROM academy.exam_attempts a JOIN academy.exam_versions v ON v.id=a.exam_version_id WHERE a.exam_id=$1`, [examId]);
    assert.equal(pinned.rows[0].version_number, 1);

    const extra = await request('POST', `/exams/${examId}/sections`, admin, { type: 'LISTENING', order: 1 });
    assert.equal(extra.status, 201); const extraId = extra.json.data.id;
    const draft = await request('GET', `/exams/${examId}`, admin);
    assert.deepEqual(draft.json.data.draftVersion.sections.map(s=>s.id), [extraId, sectionId]);
    const extraQ = await request('POST', `/sections/${extraId}/questions`, admin, { type: 'SHORT_ANSWER', prompt: 'Translate', answerKey: { acceptedAnswers: ['hello'] } });
    assert.equal(extraQ.status, 201);
    assert.equal((await request('DELETE', `/sections/${extraId}`, admin)).status, 200);
    const latest = (await pool.query(`SELECT id FROM academy.exam_versions WHERE exam_id=$1 AND status='DRAFT'`, [examId])).rows[0].id;
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2`, [extraId, latest])).rows[0].n, 0);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM academy.exam_questions WHERE section_id=$1 AND exam_version_id=$2`, [extraId, oldVersionId])).rows[0].n, 0);
  } finally {
    if (examId) {
      await pool.query(`DELETE FROM academy.exam_attempts WHERE exam_id=$1`, [examId]);
      await pool.query(`UPDATE academy.exams SET published_version_id=NULL,status='DRAFT' WHERE id=$1`, [examId]);
      await pool.query(`DELETE FROM academy.exam_sections WHERE exam_version_id IN (SELECT id FROM academy.exam_versions WHERE exam_id=$1)`, [examId]);
      await pool.query(`DELETE FROM academy.exam_versions WHERE exam_id=$1`, [examId]);
      await pool.query(`DELETE FROM academy.exams WHERE id=$1`, [examId]);
    }
    if (studentId) {
      await pool.query(`DELETE FROM academy.student_profiles WHERE user_id=$1`, [studentId]);
      await pool.query(`DELETE FROM academy.user_roles WHERE user_id=$1`, [studentId]);
      await pool.query(`DELETE FROM academy.users WHERE id=$1`, [studentId]);
    }
    if (adminId) {
      await pool.query(`DELETE FROM academy.user_roles WHERE user_id=$1`, [adminId]);
      await pool.query(`DELETE FROM academy.users WHERE id=$1`, [adminId]);
    }
    await app.close();
  }
});
