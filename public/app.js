const $ = id => document.getElementById(id);
let tasks = [], editing = null, busy = false;
const priorityLabels = { high: 'Високий', normal: 'Звичайний', low: 'Низький' };
function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
const late = task => !task.done && task.due && task.due < today();
async function request(url, method = 'GET', body) {
  const response = await fetch(url, { method, headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не вдалося виконати запит.');
  return data;
}
function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function reset() { editing = null; $('task-form').reset(); $('form-title').textContent = 'Нове завдання'; $('save').textContent = 'Додати завдання'; $('cancel').hidden = true; }
function render() {
  $('total').textContent = tasks.length;
  $('active').textContent = tasks.filter(t=>!t.done).length;
  $('completed').textContent = tasks.filter(t=>t.done).length;
  $('overdue').textContent = tasks.filter(late).length;
  const query = $('search').value.trim().toLocaleLowerCase('uk');
  const filter = $('filter').value;
  const list = tasks.filter(t=>(`${t.title} ${t.subject} ${t.notes}`).toLocaleLowerCase('uk').includes(query)).filter(t=>filter==='all'||filter==='active'&&!t.done||filter==='done'&&t.done||filter==='overdue'&&late(t));
  const rank = {high:0,normal:1,low:2};
  list.sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||'9999').localeCompare(b.due||'9999')||rank[a.priority]-rank[b.priority]);
  $('count').textContent = `Показано ${list.length} із ${tasks.length}`;
  $('tasks').replaceChildren();
  if (!list.length) $('tasks').append(node('div',tasks.length?'За цими умовами завдань немає.':'Поки що завдань немає.\nДодай перше завдання за допомогою форми.','empty'));
  for (const task of list) {
    const card=node('article',undefined,`task${task.done?' done':''}`), top=node('div',undefined,'task-top'), details=node('div');
    details.append(node('h3',task.title)); const meta=node('div',undefined,'meta');
    if(task.subject) meta.append(node('span',task.subject,'tag'));
    meta.append(node('span',priorityLabels[task.priority],`tag ${task.priority}`));
    if(task.due) meta.append(node('span',`${late(task)?'Прострочено · ':''}${task.due.split('-').reverse().join('.')}`,late(task)?'tag late':'tag'));
    details.append(meta);top.append(details);card.append(top);
    if(task.notes)card.append(node('p',task.notes));
    const actions=node('div',undefined,'actions');
    for(const [label, action, cls] of [[task.done?'Повернути в роботу':'✓ Виконано','toggle',''],['Редагувати','edit',''],['Видалити','delete','delete']]) {
      const button=node('button',label,cls);button.type='button';button.dataset.id=task.id;button.dataset.action=action;button.setAttribute('aria-label',`${label}: ${task.title}`);actions.append(button);
    }
    card.append(actions);$('tasks').append(card);
  }
}
async function operate(fn) {
  if(busy)return;busy=true;$('message').textContent='';$('save').disabled=true;
  try { await fn(); tasks=await request('/api/tasks');render(); }
  catch(error){$('message').textContent=error.message;}
  finally{busy=false;$('save').disabled=false;}
}
$('task-form').addEventListener('submit',event=>{
  event.preventDefault();
  const original=tasks.find(t=>t.id===editing);
  const value={title:$('title').value,subject:$('subject').value,due:$('due').value,priority:$('priority').value,notes:$('notes').value,done:original?.done||false};
  operate(async()=>{await request(editing?`/api/tasks/${editing}`:'/api/tasks',editing?'PUT':'POST',value);reset();});
});
$('tasks').addEventListener('click',event=>{
  const button=event.target.closest('button[data-id]');if(!button||busy)return;
  const task=tasks.find(t=>t.id===button.dataset.id);if(!task)return;
  if(button.dataset.action==='edit'){
    editing=task.id;for(const field of ['title','subject','due','priority','notes'])$(field).value=task[field];
    $('form-title').textContent='Редагування завдання';$('save').textContent='Зберегти зміни';$('cancel').hidden=false;$('title').focus();return;
  }
  if(button.dataset.action==='delete'&&!confirm(`Видалити завдання «${task.title}»?`))return;
  operate(async()=>{await request(`/api/tasks/${task.id}`,button.dataset.action==='delete'?'DELETE':'PUT',button.dataset.action==='delete'?undefined:{...task,done:!task.done});if(editing===task.id)reset();});
});
$('cancel').addEventListener('click',reset);$('search').addEventListener('input',render);$('filter').addEventListener('change',render);
operate(async()=>{});
