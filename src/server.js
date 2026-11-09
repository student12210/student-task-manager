import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = path.join(root, 'public');
const priorities = ['low', 'normal', 'high'];

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Очікується об’єкт завдання.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 160) throw new Error('Назва має містити від 1 до 160 символів.');
  if (typeof input.subject !== 'string' || input.subject.trim().length > 80) throw new Error('Предмет має містити до 80 символів.');
  if (typeof input.notes !== 'string' || input.notes.length > 2000) throw new Error('Опис має містити до 2000 символів.');
  if (typeof input.due !== 'string' || (input.due && (!/^\d{4}-\d{2}-\d{2}$/.test(input.due) || !Number.isFinite(Date.parse(input.due)) || new Date(input.due).toISOString().slice(0, 10) !== input.due))) throw new Error('Некоректна дата.');
  if (!priorities.includes(input.priority)) throw new Error('Некоректний пріоритет.');
  if (typeof input.done !== 'boolean') throw new Error('Некоректний статус.');
  return { title: input.title.trim(), subject: input.subject.trim(), notes: input.notes.trim(), due: input.due, priority: input.priority, done: input.done };
}

export function createApp({ dataDir = path.join(root, 'data') } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dataFile = path.join(dataDir, 'tasks.json');
  // A damaged file must be reported, never silently replaced by empty data.
  let tasks = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];
  if (!Array.isArray(tasks)) throw new Error('Файл даних повинен містити масив.');
  for (const task of tasks) {
    validate(task);
    if (typeof task.id !== 'string') throw new Error('Пошкоджений запис завдання.');
  }
  function save(next) {
    fs.writeFileSync(dataFile + '.tmp', JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(dataFile + '.tmp', dataFile);
    tasks = next;
  }
  function json(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  }
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const isApi = url.pathname === '/api/tasks' || url.pathname.startsWith('/api/tasks/');
      if (isApi) {
        // Browser mutation requests must come from this local application's origin.
        if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Чуже джерело запиту.' });
        if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, tasks);
        const id = url.pathname.startsWith('/api/tasks/') ? url.pathname.slice('/api/tasks/'.length) : null;
        if (id && !tasks.some(t => t.id === id)) return json(res, 404, { error: 'Завдання не знайдено.' });
        if (id && req.method === 'DELETE') {
          save(tasks.filter(t => t.id !== id));
          return json(res, 200, { ok: true });
        }
        if ((!id && req.method === 'POST') || (id && req.method === 'PUT')) {
          if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Потрібний формат application/json.' });
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 16384) return json(res, 413, { error: 'Запит надто великий.' });
          }
          let value;
          try { value = validate(JSON.parse(body)); } catch (error) { return json(res, 400, { error: error instanceof SyntaxError ? 'Некоректний JSON.' : error.message }); }
          const now = new Date().toISOString();
          const previous = id ? tasks.find(t => t.id === id) : null;
          const task = { ...value, id: id || randomUUID(), createdAt: previous?.createdAt || now, updatedAt: now };
          save(id ? tasks.map(t => t.id === id ? task : t) : [...tasks, task]);
          return json(res, id ? 200 : 201, task);
        }
        return json(res, 405, { error: 'Метод не підтримується.' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Метод не підтримується.' });
      const routes = { '/': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css' };
      const name = routes[url.pathname];
      if (!name) return json(res, 404, { error: 'Сторінку не знайдено.' });
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(name)];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(publicDir, name)));
    } catch (error) {
      console.error('Request failed:', error.message);
      if (!res.headersSent) json(res, 500, { error: 'Не вдалося зберегти або прочитати дані.' });
      else res.end();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Некоректний PORT.');
  const app = createApp();
  app.on('error', error => { console.error(error.message); process.exitCode = 1; });
  app.listen(port, '127.0.0.1', () => console.log(`Навчальні завдання: http://127.0.0.1:${port}\nДля зупинки натисніть Ctrl+C.`));
}
