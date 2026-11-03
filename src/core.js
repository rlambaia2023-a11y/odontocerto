/* ===== PEPMH core: utilitários, dados, auth, roteador ===== */
'use strict';
const CFG = window.PEPMH_CONFIG || { url: '', key: '' };

/* ---------- HTML seguro ---------- */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Raw(String(s ?? ''));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fv = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fv).join('') : (v === null || v === undefined || v === false) ? '' : esc(v);
function html(strings, ...vals) { let o = ''; strings.forEach((s, i) => { o += s; if (i < vals.length) o += fv(vals[i]); }); return new Raw(o); }

/* Sanitiza HTML de documentos (receitas, modelos) — só formatação básica */
const SAFE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'DIV', 'SPAN', 'H3', 'H4']);
function sanitize(input) {
  const doc = new DOMParser().parseFromString('<div>' + String(input || '') + '</div>', 'text/html');
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 1) {
        if (!SAFE_TAGS.has(ch.tagName)) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(ch.tagName)) { ch.remove(); return; }
          walk(ch); ch.replaceWith(...ch.childNodes); return;
        }
        [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
        walk(ch);
      } else if (ch.nodeType !== 3) ch.remove();
    });
  };
  const root = doc.body.firstChild; walk(root); return root.innerHTML;
}
function htmlToText(h) {
  const d = document.createElement('div'); d.innerHTML = sanitize(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h3|h4)>/gi, '\n').replace(/<li>/gi, '• ');
  return d.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- ícones ---------- */
const IC = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', cal: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4', calme: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M9 15l2 2 4-4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  money: 'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01', tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7zM8.5 8.5l7 7', building: 'M5 21V3h14v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M3 21h18',
  file: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', mega: 'M3 11v3l12 5V6L3 11zM15 8a4 4 0 0 1 0 8M6 14l1 5h3',
  crm: 'M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6', box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  chat: 'M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12z', menu: 'M3 6h18M3 12h12M3 18h18', x: 'M18 6 6 18M6 6l12 12', plus: 'M12 5v14M5 12h14',
  back: 'M19 12H5M12 19l-7-7 7-7', chev: 'M9 18l6-6-6-6', chevl: 'M15 18l-6-6 6-6', dots: 'M12 5h.01M12 12h.01M12 19h.01', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', check: 'M20 6 9 17l-5-5', clip: 'M9 4h6v3H9zM8 5H5v16h14V5h-3M9 12h6M9 16h4', tooth: 'M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.4 1.5 5 .8 2 .9 8.5 3 8.5 1.6 0 1.6-5 4.5-5s2.9 5 4.5 5c2.1 0 2.2-6.5 3-8.5.7-1.6 1.5-3 1.5-5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  alarm: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M5 3 2 6M22 6l-3-3', cake: 'M4 21V11h16v10M2 21h20M4 15c2 0 2 1.5 4 1.5s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M12 11V7M12 4.5v.01',
  down: 'M12 3v12M7 10l5 5 5-5M5 21h14', repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', star: 'M12 2l3 7 7 .6-5.4 4.7 1.7 7L12 17.6 5.7 21.3l1.7-7L2 9.6 9 9z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3', up: 'M12 19V5M5 12l7-7 7 7', wa: 'M3 21l1.7-5A9 9 0 1 1 8 19.3zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z',
};
const icon = (n, cls = '') => raw(`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.file}"/></svg>`);

/* ---------- formatação ---------- */
const BRL = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pad = n => String(n).padStart(2, '0');
const toDate = v => v instanceof Date ? v : new Date(v);
const ymd = d => { d = toDate(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fDate = v => { if (!v) return ''; const d = String(v).length === 10 ? parseYmd(v) : toDate(v); return d.toLocaleDateString('pt-BR'); };
const fTime = v => { const d = toDate(v); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fDT = v => `${fDate(v)} ${fTime(v)}`;
const WD = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const fLong = d => `${WD[d.getDay()]}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const age = b => { if (!b) return null; const d = parseYmd(b), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };
const initials = n => String(n || '?').trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();
const onlyDigits = s => String(s || '').replace(/\D/g, '');
const waLink = (phone, text) => { let p = onlyDigits(phone); if (p && p.length <= 11) p = '55' + p; return `https://wa.me/${p}?text=${encodeURIComponent(text || '')}`; };
const fPhone = p => { const d = onlyDigits(p); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return p || ''; };
const fCPF = c => { const d = onlyDigits(c); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (c || ''); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});

/* ---------- armazenamento local seguro ---------- */
const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};

/* ---------- camada de dados ---------- */
/* Remoto: PostgREST do Supabase */
const Remote = {
  async req(path, opt = {}, retry = true) {
    const auth = LS.get('pepmh_auth');
    const headers = { apikey: CFG.key, 'Content-Type': 'application/json', ...(opt.headers || {}) };
    if (auth?.access_token) headers.Authorization = 'Bearer ' + auth.access_token;
    const res = await fetch(CFG.url + path, { method: opt.method || 'GET', headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (res.status === 401 && retry && auth?.refresh_token) { if (await Auth.refresh()) return Remote.req(path, opt, false); }
    const txt = await res.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) { const m = data?.msg || data?.message || data?.error_description || data?.error || ('Erro ' + res.status); throw new Error(traduzErro(m)); }
    return data;
  },
  qs(q = {}) {
    const p = new URLSearchParams(); p.set('select', q.select || '*');
    const add = (op, obj) => Object.entries(obj || {}).forEach(([k, v]) => p.append(k, `${op}.${v}`));
    add('eq', q.eq); add('neq', q.neq); add('gte', q.gte); add('lte', q.lte); add('lt', q.lt); add('gt', q.gt); add('ilike', q.ilike);
    Object.entries(q.in || {}).forEach(([k, v]) => p.append(k, `in.(${v.join(',')})`));
    Object.entries(q.is || {}).forEach(([k, v]) => p.append(k, `is.${v}`));
    if (q.order) p.set('order', q.order); if (q.limit) p.set('limit', q.limit);
    return p.toString().replace(/\+/g, '%20');
  },
  list(t, q) { return Remote.req(`/rest/v1/${t}?${Remote.qs(q)}`); },
  async insert(t, row) { const r = await Remote.req(`/rest/v1/${t}`, { method: 'POST', body: row, headers: { Prefer: 'return=representation' } }); return Array.isArray(row) ? r : r[0]; },
  async updateWhere(t, eq, patch) { const r = await Remote.req(`/rest/v1/${t}?${Remote.qs({ eq })}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } }); return r[0]; },
  removeWhere(t, eq) { return Remote.req(`/rest/v1/${t}?${Remote.qs({ eq })}`, { method: 'DELETE' }); },
};

/* Demonstração: mesmas operações sobre localStorage, com dados fictícios */
const Demo = {
  load() { let d = LS.get('pepmh_demo_db'); if (!d) { d = seedDemo(); LS.set('pepmh_demo_db', d); } return d; },
  save(d) { LS.set('pepmh_demo_db', d); },
  match(r, q = {}) {
    const ok = (o, f) => Object.entries(o || {}).every(([k, v]) => f(r[k], v));
    const cmp = (a, b) => (a ?? '') < b ? -1 : (a ?? '') > b ? 1 : 0;
    return ok(q.eq, (a, b) => String(a) === String(b)) && ok(q.neq, (a, b) => String(a) !== String(b)) && ok(q.gte, (a, b) => a != null && cmp(a, b) >= 0) && ok(q.lte, (a, b) => a != null && cmp(a, b) <= 0)
      && ok(q.lt, (a, b) => a != null && cmp(a, b) < 0) && ok(q.gt, (a, b) => a != null && cmp(a, b) > 0)
      && ok(q.ilike, (a, b) => new RegExp('^' + String(b).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/\*/g, '.*') + '$', 'i').test(String(a ?? '')))
      && ok(q.in, (a, b) => b.map(String).includes(String(a))) && ok(q.is, (a, b) => b === 'null' ? a == null : String(a) === b);
  },
  async list(t, q = {}) {
    let rows = (Demo.load()[t] || []).filter(r => Demo.match(r, q));
    if (q.order) { const parts = q.order.split(','); rows.sort((a, b) => { for (const p of parts) { const [c, dir] = p.split('.'); const x = a[c] ?? '', y = b[c] ?? ''; if (x < y) return dir === 'desc' ? 1 : -1; if (x > y) return dir === 'desc' ? -1 : 1; } return 0; }); }
    if (q.limit) rows = rows.slice(0, q.limit);
    return JSON.parse(JSON.stringify(rows));
  },
  async insert(t, row) {
    const d = Demo.load(); d[t] = d[t] || [];
    const DEF = { treatment_items: { status: 'pendente', faces: [], price: 0 }, treatment_plans: { status: 'orcamento', discount: 0, title: 'Plano de tratamento' }, appointments: { status: 'agendado', kind: 'consulta' }, odontogram: { faces: [], status: 'existente' }, documents: { no_date: false }, finance_entries: { due_date: ymd(new Date()) }, stock_items: { quantity: 0, min_quantity: 0, unit_cost: 0, unit: 'un' }, crm_leads: { stage: 'novo', value: 0 }, return_alerts: { done: false }, ideas: { votes: 0, status: 'nova' }, insurances: { active: true, discount_pct: 0 }, procedures: { active: true, duration_min: 30, material_cost: 0, hour_cost: 0, tax_pct: 0, margin_pct: 30, price: 0 }, campaigns: { audience: 'todos' } };
    const one = r => {
      const x = { id: uid(), created_at: new Date().toISOString(), ...(DEF[t] || {}), ...r };
      if (t === 'patients') { x.record_number = (Math.max(0, ...d.patients.map(p => p.record_number || 0)) + 1); x.tags = x.tags || []; x.active = x.active ?? true; }
      if (t === 'stock_movements') { const it = d.stock_items.find(i => i.id === x.item_id); if (it) it.quantity = x.kind === 'entrada' ? +it.quantity + +x.quantity : x.kind === 'saida' ? +it.quantity - +x.quantity : +x.quantity; }
      d[t].push(x); return x;
    };
    const out = Array.isArray(row) ? row.map(one) : one(row); Demo.save(d); return JSON.parse(JSON.stringify(out));
  },
  async updateWhere(t, eq, patch) { const d = Demo.load(); let last; (d[t] || []).forEach(r => { if (Demo.match(r, { eq })) { Object.assign(r, patch); last = r; } }); Demo.save(d); return last && { ...last }; },
  async removeWhere(t, eq) {
    const d = Demo.load(); const gone = (d[t] || []).filter(r => Demo.match(r, { eq })).map(r => r.id); d[t] = (d[t] || []).filter(r => !Demo.match(r, { eq }));
    const cascade = { patients: ['appointments', 'anamneses', 'evolutions', 'odontogram', 'treatment_plans', 'documents', 'return_alerts'], treatment_plans: ['treatment_items'], stock_items: ['stock_movements'] };
    (cascade[t] || []).forEach(ct => { const fk = t === 'patients' ? 'patient_id' : t === 'treatment_plans' ? 'plan_id' : 'item_id'; d[ct] = (d[ct] || []).filter(r => !gone.includes(r[fk])); });
    Demo.save(d); return null;
  },
};

const isDemo = () => LS.get('pepmh_mode') === 'demo';
const B = () => isDemo() ? Demo : Remote;
const db = {
  list: (t, q) => B().list(t, q),
  async get(t, id) { const r = await B().list(t, { eq: { id }, limit: 1 }); return r[0] || null; },
  insert: (t, row) => B().insert(t, Array.isArray(row) ? row.map(r => ({ clinic_id: S.clinic.id, ...r })) : { clinic_id: S.clinic.id, ...row }),
  update: (t, id, patch) => B().updateWhere(t, { id }, patch),
  updateWhere: (t, eq, patch) => B().updateWhere(t, eq, patch),
  remove: (t, id) => B().removeWhere(t, { id }),
};

function traduzErro(m) {
  const map = { 'Invalid login credentials': 'E-mail ou senha incorretos.', 'Email not confirmed': 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).', 'User already registered': 'Já existe uma conta com esse e-mail.', 'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.' };
  for (const k in map) if (String(m).includes(k)) return map[k];
  if (/rate limit/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  return m;
}

/* ---------- autenticação ---------- */
const Auth = {
  async call(path, body) {
    const res = await fetch(CFG.url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(traduzErro(data.msg || data.error_description || data.message || data.error || 'Falha na autenticação'));
    return data;
  },
  store(d) { LS.set('pepmh_auth', { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: d.user }); },
  async signIn(email, password) { const d = await Auth.call('token?grant_type=password', { email, password }); Auth.store(d); LS.set('pepmh_mode', 'remote'); },
  async signUp(email, password, meta) { const d = await Auth.call('signup', { email, password, data: meta }); if (d.access_token) { Auth.store(d); LS.set('pepmh_mode', 'remote'); return true; } return false; },
  async refresh() { try { const a = LS.get('pepmh_auth'); const d = await Auth.call('token?grant_type=refresh_token', { refresh_token: a.refresh_token }); Auth.store(d); return true; } catch { LS.del('pepmh_auth'); return false; } },
  async recover(email) { await Auth.call('recover', { email }); },
  signOut() { const a = LS.get('pepmh_auth'); if (a && !isDemo()) fetch(CFG.url + '/auth/v1/logout', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + a.access_token } }).catch(() => { }); LS.del('pepmh_auth'); LS.del('pepmh_mode'); location.hash = '#/'; location.reload(); },
  userId() { return isDemo() ? 'demo-user' : LS.get('pepmh_auth')?.user?.id; },
};

/* ---------- estado global ---------- */
const S = { clinic: null, me: null, members: [], insurances: [], procedures: [] };
async function loadContext() {
  const uidv = Auth.userId(); if (!uidv) return false;
  const mine = await db.list('clinic_members', { eq: { user_id: uidv }, limit: 1 });
  if (!mine.length) return false;
  S.me = mine[0];
  S.clinic = (await B().list('clinics', { eq: { id: S.me.clinic_id } }))[0];
  S.members = await db.list('clinic_members', { eq: { clinic_id: S.clinic.id } });
  await refreshRefs();
  return true;
}
async function refreshRefs() {
  [S.insurances, S.procedures] = await Promise.all([db.list('insurances', { order: 'name' }), db.list('procedures', { order: 'category,name' })]);
}
const proName = id => S.members.find(m => m.user_id === id)?.full_name || '';
const insName = id => S.insurances.find(i => i.id === id)?.name || 'Particular';
const councilOf = m => m?.council_number ? `${m.council || 'CRO'}-${m.council_uf || ''} ${m.council_number}` : '';

/* ---------- UI: ações delegadas, modal, toast ---------- */
const ACT = {}, FORMS = {}, INPUTS = {};
const act = (n, f) => (ACT[n] = f), onForm = (n, f) => (FORMS[n] = f), onInput = (n, f) => (INPUTS[n] = f);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { e.preventDefault(); Promise.resolve(ACT[el.dataset.act](el, e)).catch(err => toast(err.message, 'bad')); }
  if (!e.target.closest('.menu-pop') && !e.target.closest('[data-act="popmenu"]')) document.querySelectorAll('.menu-pop.float').forEach(m => m.remove());
});
document.addEventListener('submit', async e => {
  const f = e.target; if (!f.dataset.form) return; e.preventDefault();
  const fn = FORMS[f.dataset.form]; if (!fn) return;
  const btn = f.querySelector('[type=submit]'); btn && (btn.disabled = true);
  try { await fn(formData(f), f); } catch (err) { toast(err.message, 'bad'); } finally { btn && (btn.disabled = false); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && INPUTS[el.dataset.change]) INPUTS[el.dataset.change](el, e); });
function formData(f) {
  const o = {};
  f.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') { if (el.dataset.multi) { o[el.name] = o[el.name] || []; if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value.trim();
  });
  return o;
}
const nz = v => (v === '' || v === undefined ? null : v);

function toast(msg, kind = '') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = fv(html`${kind === 'ok' ? icon('check') : ''}<span>${msg}</span>`);
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function modal(title, body, { wide = false, footer = '' } = {}) {
  closeModal();
  const m = document.createElement('div'); m.className = 'modal-bg'; m.id = 'modal';
  m.innerHTML = fv(html`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><header><h2>${title}</h2><button class="iconbtn" style="color:var(--ink-2)" data-act="closeModal" aria-label="Fechar">${icon('x')}</button></header><div class="body">${body}</div>${footer ? html`<footer>${footer}</footer>` : ''}</div>`);
  m.addEventListener('mousedown', e => { if (e.target === m) closeModal(); });
  document.body.appendChild(m); const f = m.querySelector('input:not([type=hidden]),select,textarea'); f && setTimeout(() => f.focus(), 30);
  return m;
}
function closeModal() { document.getElementById('modal')?.remove(); }
act('closeModal', closeModal);
function confirmBox(msg, okLabel = 'Confirmar') {
  return new Promise(res => {
    const m = modal('Confirmação', html`<p style="margin:0">${msg}</p>`, { footer: html`<button class="btn" data-act="cfNo">Cancelar</button><button class="btn primary" data-act="cfYes">${okLabel}</button>` });
    ACT.cfYes = () => { closeModal(); res(true); }; ACT.cfNo = () => { closeModal(); res(false); };
  });
}
act('popmenu', (el) => {
  document.querySelectorAll('.menu-pop.float').forEach(m => m.remove());
  const tpl = document.getElementById(el.dataset.menu); if (!tpl) return;
  const p = document.createElement('div'); p.className = 'menu-pop float'; p.innerHTML = tpl.innerHTML;
  el.parentElement.classList.add('rel'); el.parentElement.appendChild(p);
});

/* ---------- impressão ---------- */
function printDoc(title, bodyHtml, extraCss = '') {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita pop-ups para imprimir.', 'bad'); return; }
  const c = S.clinic || {};
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:0;padding:28px 36px;font-size:14px;line-height:1.55}
  .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0b57b3;padding-bottom:10px;margin-bottom:22px}
  .hd b{font-size:18px;color:#0b57b3}.hd small{color:#555;display:block}
  h1{font-size:17px;text-align:center;letter-spacing:.12em;text-transform:uppercase;margin:6px 0 20px}
  .sig{margin-top:60px;text-align:center}.sig .ln{border-top:1px solid #111;width:300px;margin:0 auto 4px}
  .ft{position:fixed;bottom:16px;left:36px;right:36px;border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#555;text-align:center}
  table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}.r{text-align:right}
  .page{page-break-after:always;min-height:90vh;position:relative}.page:last-child{page-break-after:auto}
  .box{border:1px solid #111;padding:8px;font-size:12px;min-height:90px}
  @media print{body{padding:0 10mm}} ${extraCss}</style></head><body>${bodyHtml}<script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}
function docHeader() {
  const c = S.clinic || {};
  return `<div class="hd"><div><b>${esc(c.name || 'Consultório')}</b><small>${esc([c.address, c.city && (c.city + (c.state ? '/' + c.state : ''))].filter(Boolean).join(' · '))}</small></div><small style="text-align:right">${esc(fPhone(c.phone))}${c.email ? '<br>' + esc(c.email) : ''}${c.cnpj ? '<br>CNPJ ' + esc(c.cnpj) : ''}</small></div>`;
}
function signature(name, council) { return `<div class="sig"><div class="ln"></div>${esc(name || '')}<br><small>${esc(council || '')}</small></div>`; }

/* ---------- roteador ---------- */
const ROUTES = [];
const route = (pattern, fn, nav) => ROUTES.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, nav });
function currentQuery() { const h = location.hash.slice(1); const i = h.indexOf('?'); return new URLSearchParams(i >= 0 ? h.slice(i + 1) : ''); }
async function router() {
  const h = (location.hash.slice(1) || '/').split('?')[0];
  if (!S.clinic) return renderAuth();
  const r = ROUTES.find(r => r.re.test(h)) || ROUTES[0];
  const params = h.match(r.re)?.groups || {};
  document.body.classList.remove('menu-open'); closeModal();
  renderShell(r.nav);
  const view = document.getElementById('view'); view.innerHTML = '<div class="loading">Carregando…</div>';
  try { const out = await r.fn(params, currentQuery()); if (out !== undefined) view.innerHTML = fv(out); window.scrollTo(0, 0); r.after && r.after(); }
  catch (err) { console.error(err); view.innerHTML = fv(html`<div class="card"><h2>Não foi possível carregar</h2><p class="muted">${err.message}</p><button class="btn" onclick="location.reload()">Tentar de novo</button></div>`); }
  if (typeof AFTER === 'function') { const f = AFTER; AFTER = null; f(); }
}
let AFTER = null; const after = f => (AFTER = f);
const go = h => { if (location.hash === h) router(); else location.hash = h; };
window.addEventListener('hashchange', router);
