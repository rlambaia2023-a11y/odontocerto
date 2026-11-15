/* ===== PEPMH offline: cópia local (IndexedDB) + fila de envio que sincroniza sozinha =====
   Leituras: tenta o servidor e guarda o resultado; sem internet, responde com a cópia local.
   Gravações: sem internet, gravam na cópia local e entram na fila; ao voltar a conexão, a fila é
   enviada na ordem em que foi feita. Os ids (uuid) são gerados no aparelho, então registros ligados
   (ex.: paciente novo + consulta dele) continuam ligados depois de sincronizar. */
'use strict';
/* tabelas sem coluna id uuid: só leitura offline (cache por consulta), gravação exige internet */
const OFF_NOID = new Set(['acc_profiles', 'clinic_integrations', 'clinic_members', 'import_keys', 'notif_state', 'online_patient_registry', 'online_patients', 'wa_messages', 'wa_sessions', 'wa_settings']);
/* RPCs só de leitura: podem responder com o último resultado guardado */
const OFF_RPC_READ = new Set(['clinic_professionals', 'public_clinic', 'public_clinic_list', 'public_slots', 'verify_document', 'shared_document']);
const NET_MSG = 'Sem conexão com a internet.';
const isNetErr = e => !!e && (e.net || e.name === 'TypeError' || e.name === 'AbortError' || e.name === 'TimeoutError' || [502, 503, 504].includes(e.status));

const IDB = {
  _db: null, _name: '',
  open() {
    const name = 'pepmh_off_' + (Auth.userId() || 'anon');
    if (this._db && this._name === name) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('rows', { keyPath: 'k' }).createIndex('t', 't');
        d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        d.createObjectStore('failed', { keyPath: 'seq' });
        d.createObjectStore('kv', { keyPath: 'k' });
      };
      r.onsuccess = () => { this._db = r.result; this._name = name; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(stores, mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction(stores, mode); let out;
      Promise.resolve(fn(...[].concat(stores).map(s => t.objectStore(s)))).then(v => (out = v));
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  req: r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
};

/* consulta igual à do PostgREST, sobre linhas locais (mesmos filtros do modo demonstração) */
function offApply(rows, q = {}) {
  rows = rows.filter(r => Demo.match(r, q));
  if (q.order) {
    const parts = q.order.split(',');
    rows.sort((a, b) => { for (const p of parts) { const [c, dir] = p.split('.'); const x = a[c] ?? '', y = b[c] ?? ''; if (x < y) return dir === 'desc' ? 1 : -1; if (x > y) return dir === 'desc' ? -1 : 1; } return 0; });
  }
  if (q.limit) rows = rows.slice(0, q.limit);
  return JSON.parse(JSON.stringify(rows));
}
const offQKey = (t, q) => 'q|' + t + '|' + JSON.stringify(q || {});
const offKey = (t, id) => t + '|' + id;

const Cache = {
  async all(t) { return IDB.tx('rows', 'readonly', s => IDB.req(s.index('t').getAll(t))); },
  /* guarda as linhas vindas do servidor; remove do cache as que sumiram do servidor */
  async putRows(t, rows, q = {}) {
    if (!Array.isArray(rows)) return;
    if (OFF_NOID.has(t) || rows.some(r => !r || r.id == null)) return IDB.tx('kv', 'readwrite', s => { s.put({ k: offQKey(t, q), v: rows }); if (!q.limit) s.put({ k: 'last|' + t, v: rows, q }); }).catch(() => { });
    const ids = new Set(rows.map(r => String(r.id)));
    const reconcile = !q.limit && !Object.keys({ ...q.eq, ...q.neq, ...q.gte, ...q.lte, ...q.lt, ...q.gt, ...q.ilike, ...q.in, ...q.is }).some(k => k.includes('.'));
    return IDB.tx('rows', 'readwrite', async s => {
      const old = await IDB.req(s.index('t').getAll(t));
      const byId = new Map(old.map(o => [String(o.id), o]));
      rows.forEach(r => { const o = byId.get(String(r.id)); s.put({ k: offKey(t, r.id), t, id: String(r.id), row: { ...(o?.row || {}), ...r }, pending: !!o?.pending }); });
      if (reconcile) old.forEach(o => { if (!o.pending && !ids.has(o.id) && Demo.match(o.row, q)) s.delete(o.k); });
    }).catch(() => { });
  },
  async query(t, q = {}) {
    if (OFF_NOID.has(t) || !(await Cache.hasTable(t))) {
      const hit = await IDB.tx('kv', 'readonly', s => IDB.req(s.get(offQKey(t, q))));
      if (hit) return JSON.parse(JSON.stringify(hit.v));
      /* outra consulta da mesma tabela, sem filtros que cortem linhas: filtra aqui mesmo */
      const last = await IDB.tx('kv', 'readonly', s => IDB.req(s.get('last|' + t)));
      if (last && !Object.keys({ ...last.q.eq, ...last.q.neq, ...last.q.gte, ...last.q.lte, ...last.q.lt, ...last.q.gt, ...last.q.ilike, ...last.q.in, ...last.q.is }).length) return offApply(last.v, q);
      if (OFF_NOID.has(t)) { const e = new Error(NET_MSG + ' Estes dados ainda não foram abertos neste aparelho.'); e.net = true; throw e; }
    }
    return offApply((await Cache.all(t)).map(o => o.row), q);
  },
  async hasTable(t) { return IDB.tx('rows', 'readonly', s => IDB.req(s.index('t').count(t))).then(n => n > 0); },
};

const Sync = {
  busy: null, pending: 0, failed: 0, offline: !navigator.onLine, lastOk: LS.get('pepmh_last_sync'),
  lastFail: 0,
  setOffline(v = true) { if (v) this.lastFail = Date.now(); if (this.offline !== v) { this.offline = v; netPill(); } },
  async count() {
    [this.pending, this.failed] = await IDB.tx(['outbox', 'failed'], 'readonly', (a, b) => Promise.all([IDB.req(a.count()), IDB.req(b.count())])).catch(() => [0, 0]);
    netPill(); return this.pending;
  },
  async enqueue(item) { await IDB.tx('outbox', 'readwrite', s => s.add({ ...item, ts: new Date().toISOString() })); await this.count(); },
  /* pode usar a rede agora? (se houver fila, envia antes de ler, para o servidor já ter tudo) */
  async canNet() {
    if (!navigator.onLine) { this.setOffline(true); return false; }
    /* caiu há pouco: não espera a rede de novo a cada tela (o reenvio automático roda a cada 30 s) */
    if (this.offline && Date.now() - this.lastFail < 20000) return false;
    if (this.pending || this.busy) await this.flush();
    return !this.offline || !this.pending;
  },
  flush() {
    if (this.busy) return this.busy;
    if (isDemo() || !LS.get('pepmh_auth')) return Promise.resolve();
    this.busy = (async () => {
      let sent = 0;
      netPill('sync');
      try {
        for (;;) {
          const items = await IDB.tx('outbox', 'readonly', s => IDB.req(s.getAll(null, 1)));
          const it = items[0]; if (!it) break;
          try {
            const out = await Sync.send(it);
            await IDB.tx(['outbox', 'rows'], 'readwrite', (ob, rs) => { ob.delete(it.seq); Sync.applyServer(rs, it, out); });
            sent++;
          } catch (e) {
            if (isNetErr(e) || e.status >= 500 || e.status === 401) { this.setOffline(isNetErr(e)); break; }
            await IDB.tx(['outbox', 'failed'], 'readwrite', (ob, fl) => { ob.delete(it.seq); fl.put({ ...it, error: e.message, failed_at: new Date().toISOString() }); });
          }
        }
        if (sent && !(await IDB.tx('outbox', 'readonly', s => IDB.req(s.count())))) { this.setOffline(false); this.lastOk = new Date().toISOString(); LS.set('pepmh_last_sync', this.lastOk); }
      } finally {
        this.busy = null; await this.count();
        if (sent) { toast(`${sent} alteraç${sent > 1 ? 'ões feitas' : 'ão feita'} sem internet ${sent > 1 ? 'foram enviadas' : 'foi enviada'} ao servidor.`, 'ok'); }
        if (this.failed) netPill();
      }
    })();
    return this.busy;
  },
  async send(it) {
    if (it.op === 'insert') {
      try { return await Remote.insert(it.t, it.row); }
      catch (e) {
        /* já tinha chegado ao servidor (resposta perdida): trata como enviado */
        if (e.status === 409 && /duplicate|duplicad|23505|already exists/i.test(e.message)) return null;
        throw e;
      }
    }
    if (it.op === 'update') return Remote.req(`/rest/v1/${it.t}?${Remote.qs({ eq: it.eq })}`, { method: 'PATCH', body: it.patch, headers: { Prefer: 'return=representation' } });
    if (it.op === 'remove') return Remote.removeWhere(it.t, it.eq);
  },
  /* troca a versão local pela que o servidor devolveu (com nº de prontuário, datas etc.) */
  applyServer(rs, it, out) {
    const rows = out == null ? (it.op === 'insert' ? [].concat(it.row) : []) : [].concat(out);
    rows.forEach(r => { if (r && r.id != null && it.op !== 'remove') rs.put({ k: offKey(it.t, r.id), t: it.t, id: String(r.id), row: r, pending: false }); });
  },
};

/* backend usado no modo normal (não demonstração): servidor quando há internet, aparelho quando não */
const Offline = {
  async list(t, q = {}) {
    if (await Sync.canNet()) {
      try { const rows = await Remote.list(t, q); Sync.setOffline(false); Cache.putRows(t, rows, q); return rows; }
      catch (e) { if (!isNetErr(e)) throw e; Sync.setOffline(true); }
    }
    return Cache.query(t, q);
  },
  async insert(t, row) {
    const many = Array.isArray(row);
    const rows = (many ? row : [row]).map(r => (OFF_NOID.has(t) || r.id != null ? { ...r } : { id: uid(), ...r }));
    const body = many ? rows : rows[0];
    if (await Sync.canNet() && !Sync.pending) {
      try { const out = await Remote.insert(t, body); Cache.putRows(t, [].concat(out)); return out; }
      catch (e) { if (!isNetErr(e)) throw e; Sync.setOffline(true); }
    }
    Offline.needId(t);
    const now = new Date().toISOString();
    const local = rows.map(r => ({ created_at: now, ...offDefaults(t), ...r }));
    await IDB.tx('rows', 'readwrite', s => local.forEach(r => s.put({ k: offKey(t, r.id), t, id: String(r.id), row: r, pending: true })));
    await Sync.enqueue({ op: 'insert', t, row: body });
    offSavedToast();
    return JSON.parse(JSON.stringify(many ? local : local[0]));
  },
  async updateWhere(t, eq, patch) {
    if (await Sync.canNet() && !Sync.pending) {
      try { const r = await Remote.updateWhere(t, eq, patch); if (r) Cache.putRows(t, [r]); return r; }
      catch (e) { if (!isNetErr(e)) throw e; Sync.setOffline(true); }
    }
    Offline.needId(t);
    let last;
    await IDB.tx('rows', 'readwrite', async s => {
      (await IDB.req(s.index('t').getAll(t))).forEach(o => { if (Demo.match(o.row, { eq })) { o.row = { ...o.row, ...patch }; o.pending = true; s.put(o); last = o.row; } });
    });
    await Sync.enqueue({ op: 'update', t, eq, patch });
    offSavedToast();
    return last && JSON.parse(JSON.stringify(last));
  },
  async removeWhere(t, eq) {
    if (await Sync.canNet() && !Sync.pending) {
      try { const r = await Remote.removeWhere(t, eq); Offline.dropLocal(t, eq); return r; }
      catch (e) { if (!isNetErr(e)) throw e; Sync.setOffline(true); }
    }
    Offline.needId(t);
    await Offline.dropLocal(t, eq);
    await Sync.enqueue({ op: 'remove', t, eq });
    offSavedToast();
    return null;
  },
  dropLocal(t, eq) { return IDB.tx('rows', 'readwrite', async s => (await IDB.req(s.index('t').getAll(t))).forEach(o => { if (Demo.match(o.row, { eq })) s.delete(o.k); })).catch(() => { }); },
  needId(t) { if (OFF_NOID.has(t)) { const e = new Error(NET_MSG + ' Esta alteração precisa de internet.'); e.net = true; throw e; } },
  async rpc(fn, args = {}) {
    const k = 'rpc|' + fn + '|' + JSON.stringify(args);
    if (navigator.onLine) {
      try { const r = await Remote.rpc(fn, args); Sync.setOffline(false); if (OFF_RPC_READ.has(fn)) IDB.tx('kv', 'readwrite', s => s.put({ k, v: r })).catch(() => { }); return r; }
      catch (e) { if (!isNetErr(e)) throw e; Sync.setOffline(true); }
    } else Sync.setOffline(true);
    if (OFF_RPC_READ.has(fn)) { const hit = await IDB.tx('kv', 'readonly', s => IDB.req(s.get(k))).catch(() => null); if (hit) return hit.v; }
    const e = new Error(NET_MSG + ' Esta ação precisa de internet.'); e.net = true; throw e;
  },
};
/* valores padrão do banco, para o registro aparecer nas listas antes de sincronizar */
function offDefaults(t) { const d = { ...(DEMO_DEF()[t] || {}) }; if (t === 'documents') delete d.verify_code; if (t === 'patients') Object.assign(d, { active: true, tags: [] }); return JSON.parse(JSON.stringify(d)); }
let offToastT = 0;
function offSavedToast() { if (Date.now() - offToastT > 8000) { offToastT = Date.now(); toast('Sem internet: salvo neste aparelho. Envio automático quando a conexão voltar.', 'ok'); } }

/* ---------- indicador na barra do topo ---------- */
function netPill(state) {
  const el = document.getElementById('netpill'); if (!el || isDemo()) return;
  const n = Sync.pending, f = Sync.failed;
  let cls = '', txt = '', title = '';
  if (state === 'sync' || Sync.busy) { cls = 'sync'; txt = n ? `Enviando ${n}…` : 'Sincronizando…'; }
  else if (Sync.offline) { cls = 'off'; txt = n ? `Offline · ${n} na fila` : 'Offline'; title = 'Sem internet. Você pode continuar trabalhando: tudo fica salvo neste aparelho e é enviado sozinho quando a conexão voltar.'; }
  else if (n) { cls = 'sync'; txt = `${n} na fila`; }
  if (f) { cls = 'bad'; txt = `${f} com erro`; title = 'Algumas alterações feitas sem internet foram recusadas pelo servidor. Toque para ver.'; }
  el.className = 'netpill ' + cls; el.hidden = !txt; el.textContent = txt; el.title = title;
}
act('netInfo', async () => {
  const [q, fl] = await IDB.tx(['outbox', 'failed'], 'readonly', (a, b) => Promise.all([IDB.req(a.getAll()), IDB.req(b.getAll())]));
  const TB = { patients: 'Paciente', appointments: 'Consulta', evolutions: 'Evolução', anamneses: 'Anamnese', documents: 'Documento', finance_entries: 'Financeiro', treatment_plans: 'Plano de tratamento', treatment_items: 'Item do plano', odontogram: 'Odontograma', vitals: 'Sinais vitais', return_alerts: 'Retorno' };
  const OP = { insert: 'novo', update: 'alteração', remove: 'exclusão' };
  const line = (it, err) => html`<li><b>${TB[it.t] || it.t}</b> · ${OP[it.op]}${it.row?.name ? ' · ' + it.row.name : ''} <span class="tiny muted">${fDT(it.ts)}</span>${err ? html`<div class="tiny" style="color:var(--bad)">${err}</div>` : ''}</li>`;
  modal('Sincronização', html`
    <p class="muted small" style="margin-top:0">${Sync.offline ? 'Você está sem internet. Pode continuar usando o sistema: o que for salvo fica neste aparelho e é enviado sozinho quando a conexão voltar.' : 'Conectado.'}${Sync.lastOk ? html`<br>Última sincronização completa: ${fDT(Sync.lastOk)}` : ''}</p>
    ${q.length ? html`<h3 class="small">Aguardando envio (${q.length})</h3><ul class="small">${q.map(it => line(it))}</ul>` : html`<p class="small">Nada aguardando envio.</p>`}
    ${fl.length ? html`<h3 class="small" style="color:var(--bad)">Recusadas pelo servidor (${fl.length})</h3><ul class="small">${fl.map(it => line(it, it.error))}</ul>` : ''}`,
    { footer: html`${fl.length ? html`<button class="btn" data-act="netDiscard">Descartar recusadas</button><button class="btn" data-act="netRetry">Tentar de novo</button>` : ''}<button class="btn primary" data-act="netSyncNow">Sincronizar agora</button>` });
});
act('netSyncNow', async () => { closeModal(); if (!navigator.onLine) return toast(NET_MSG + ' A fila será enviada quando a conexão voltar.', 'bad'); Sync.lastFail = 0; await Sync.flush(); if (!Sync.pending && !Sync.failed) toast('Tudo sincronizado.', 'ok'); });
act('netRetry', async () => {
  await IDB.tx(['failed', 'outbox'], 'readwrite', async (fl, ob) => (await IDB.req(fl.getAll())).forEach(it => { fl.delete(it.seq); const { seq, error, failed_at, ...rest } = it; ob.add(rest); }));
  await Sync.count(); ACT.netSyncNow();
});
act('netDiscard', async () => {
  if (!(await confirmBox('Descartar as alterações recusadas pelo servidor? Elas não serão enviadas e não podem ser recuperadas.', 'Descartar'))) return;
  await IDB.tx('failed', 'readwrite', s => s.clear()); await Sync.count(); toast('Descartadas.');
});

window.addEventListener('online', async () => { if (Sync.pending) { Sync.lastFail = 0; Sync.flush(); } else Sync.setOffline(!(await offProbe())); });
window.addEventListener('offline', () => Sync.setOffline(true));
/* a cada 30 s: com fila, tenta enviar; sem fila mas offline, testa se a conexão voltou */
async function offProbe() { try { await Remote.req('/auth/v1/health'); return true; } catch (e) { return !isNetErr(e); } }
setInterval(async () => {
  if (document.hidden || !navigator.onLine || isDemo() || !LS.get('pepmh_auth')) return;
  if (Sync.pending) return Sync.flush();
  if (Sync.offline) Sync.setOffline(!(await offProbe()));
}, 30000);

/* app abre sem internet: service worker guarda a página e os ícones */
if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { }));
