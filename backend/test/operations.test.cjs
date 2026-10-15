require('reflect-metadata');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Module,Controller,Post}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
const {configureApplication}=require('../dist/config/configure-application');
test('upload rate limiting returns shared 429 contract with server correlation and no secrets',async()=>{
 class UploadFixture{upload(){return{ok:true};}}Controller('media')(UploadFixture);Post('upload')(UploadFixture.prototype,'upload',Object.getOwnPropertyDescriptor(UploadFixture.prototype,'upload'));
 class Fixture{}Module({controllers:[UploadFixture]})(Fixture);const app=await NestFactory.create(Fixture,{logger:false,bodyParser:false});configureApplication(app);await app.listen(0,'127.0.0.1');
 try{const base=await app.getUrl();for(let i=0;i<20;i++)assert.equal((await fetch(base+'/media/upload',{method:'POST'})).status,201);const denied=await fetch(base+'/media/upload',{method:'POST',headers:{'X-Request-Id':'untrusted'}});assert.equal(denied.status,429);assert.ok(denied.headers.get('retry-after'));const body=await denied.json();assert.equal(body.error.code,'TOO_MANY_REQUESTS');assert.equal(body.meta.requestId,denied.headers.get('x-request-id'));assert.notEqual(body.meta.requestId,'untrusted');assert.equal(JSON.stringify(body).includes('stack'),false);}finally{await app.close();}
});
