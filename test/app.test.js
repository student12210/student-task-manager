import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../src/server.js';

test('In-process request handler, persistence, validation and static routes', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'student-tasks-'));
  let app;
  function start(){app=createApp({dataDir:dir});}
  start();
  t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});});
  // Exercise the real request handler and filesystem without a TCP socket.
  // This makes the tests usable in environments that prohibit loopback networking.
  const raw=(endpoint,method='GET',body='',headers={})=>new Promise(resolve=>{
    const req=Readable.from(body?[Buffer.from(body)]:[]);
    Object.assign(req,{url:endpoint,method,headers:{host:'127.0.0.1:3000',...Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]))}});
    const res={status:200,headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);this.headersSent=true;},end(value){const text=Buffer.isBuffer(value)?value.toString('utf8'):String(value??'');resolve({status:this.status,headers:this.headers,json:async()=>JSON.parse(text),text:async()=>text});}};
    app.emit('request',req,res);
  });
  const valid={title:'Практична № 4',subject:'Інформатика',notes:'Перевірити Git',due:'2026-11-20',priority:'high',done:false};
  const send=(endpoint,method='GET',body,headers={})=>raw(endpoint,method,body?JSON.stringify(body):'',{...(body?{'Content-Type':'application/json'}:{}),...headers});
  let id;
  await t.test('initial empty list',async()=>{assert.deepEqual(await (await send('/api/tasks')).json(),[]);});
  await t.test('create Ukrainian task',async()=>{const r=await send('/api/tasks','POST',valid);assert.equal(r.status,201);const task=await r.json();assert.equal(task.title,valid.title);assert.ok(task.createdAt);id=task.id;});
  await t.test('update and complete',async()=>{const r=await send(`/api/tasks/${id}`,'PUT',{...valid,title:'Оновлене завдання',done:true});assert.equal(r.status,200);assert.equal((await r.json()).done,true);});
  await t.test('survives app recreation',async()=>{start();const list=await (await send('/api/tasks')).json();assert.equal(list.length,1);assert.equal(list[0].title,'Оновлене завдання');assert.equal(list[0].done,true);});
  await t.test('rejects empty titles, impossible dates and invalid values',async()=>{for(const patch of [{title:'  '},{due:'2026-02-30'},{priority:'urgent'},{done:'true'},{title:'x'.repeat(161)}])assert.equal((await send('/api/tasks','POST',{...valid,...patch})).status,400);});
  await t.test('rejects malformed JSON',async()=>{const r=await raw('/api/tasks','POST','{bad',{'Content-Type':'application/json'});assert.equal(r.status,400);});
  await t.test('rejects foreign origins',async()=>{assert.equal((await send('/api/tasks','POST',valid,{Origin:'https://example.com'})).status,403);});
  await t.test('serves UI and rejects unknown paths',async()=>{const r=await send('/');assert.equal(r.status,200);assert.match(await r.text(),/Мій навчальний план/);for(const file of ['/app.js','/styles.css'])assert.equal((await send(file)).status,200);assert.equal((await send('/src/server.js')).status,404);assert.equal((await send('/api/tasks/missing','DELETE')).status,404);});
  await t.test('delete',async()=>{assert.equal((await send(`/api/tasks/${id}`,'DELETE')).status,200);assert.deepEqual(await (await send('/api/tasks')).json(),[]);});
});
