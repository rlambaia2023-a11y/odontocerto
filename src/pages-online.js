/* ===== Pacientes online: sala de espera, atendimento por vídeo e cadastro de quem é atendido online ===== */
const ONLINE_SIT = { em_atendimento: ['Em atendimento', 'warn'], aguardando: ['Na sala de espera', 'accent'], agendado: ['Agendado online', 'ok'], atendido: ['Já atendido online', ''], inativo: ['Sem consulta ativa', 'gray'] };
const isLive = a => !['cancelado', 'faltou', 'atendido'].includes(a.status);

/* Mesma regra da view public.online_patients; no modo demonstração calcula localmente. */
function aggregateOnline(appts, pm) {
  const now = Date.now(), by = {};
  appts.filter(a => a.modality === 'online' && a.patient_id).forEach(a => (by[a.patient_id] = by[a.patient_id] || []).push(a));
  return Object.entries(by).map(([pid, list]) => {
    const p = pm[pid] || {}, open = list.filter(a => ['agendado', 'confirmado'].includes(a.status));
    const fut = open.filter(a => +new Date(a.ends_at) >= now), done = list.filter(a => a.status === 'atendido');
    const em = list.filter(a => a.status === 'em_atendimento').length, wait = open.filter(a => a.waiting_since);
    const situacao = em ? 'em_atendimento' : wait.length ? 'aguardando' : fut.length ? 'agendado' : done.length ? 'atendido' : 'inativo';
    const min = xs => xs.length ? xs.map(a => a.starts_at).sort()[0] : null, max = xs => xs.length ? xs.map(a => a.starts_at).sort().at(-1) : null;
    return { patient_id: pid, name: p.name || '', phone: p.phone || null, email: p.email || null, has_portal: !!p.user_id, situacao, em_atendimento: em, agendadas: fut.length, atendidas: done.length, faltas: list.filter(a => a.status === 'faltou').length, canceladas: list.filter(a => a.status === 'cancelado').length, proxima_em: min(fut), ultima_atendida_em: max(done), aguardando_desde: wait.map(a => a.waiting_since).sort().at(-1) || null, primeira_online_em: min(list) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
async function onlinePatients() {
  if (!isDemo()) return db.list('online_patients', { order: 'name' });
  const ap = await db.list('appointments', { eq: { modality: 'online' } });
  return aggregateOnline(ap, await patientMap(ap.map(a => a.patient_id)));
}

let ONLINE_TIMER = null;
route('/pacientes-online', async (_, q) => {
  const f = q.get('f') || 'todos', busca = (q.get('q') || '').trim().toLowerCase();
  const t0 = startOfDay(new Date()), t1 = addDays(t0, 1);
  const [rows, today] = await Promise.all([onlinePatients(), db.list('appointments', { eq: { modality: 'online' }, gte: { starts_at: t0.toISOString() }, lt: { starts_at: t1.toISOString() }, order: 'starts_at' })]);
  const pm = await patientMap(today.map(a => a.patient_id));
  const live = today.filter(a => a.status === 'em_atendimento'), waiting = today.filter(a => a.waiting_since && ['agendado', 'confirmado'].includes(a.status));
  const next = today.filter(a => isLive(a) && !live.includes(a) && !waiting.includes(a) && +new Date(a.ends_at) >= Date.now());
  const inF = (r, k) => k === 'todos' || (k === 'atendido' ? r.atendidas > 0 : r.situacao === k);
  const n = k => rows.filter(r => inF(r, k)).length;
  const shown = rows.filter(r => inF(r, f) &&(!busca || r.name.toLowerCase().includes(busca) || (r.phone || '').includes(busca)));
  const openBtn = a => a.meeting_url ? (isClinical() ? html`<button class="btn accent sm" data-act="startTele" data-id="${a.id}">${icon('video')} ${a.status === 'em_atendimento' ? 'Voltar à chamada' : 'Atender agora'}</button>` : html`<a class="btn accent sm" target="_blank" rel="noopener" href="${a.meeting_url}">${icon('video')} Abrir sala</a>`) : html`<button class="btn sm" data-act="editAppt" data-id="${a.id}">Colocar link do Meet</button>`;
  const row = (a, extra) => html`<div class="li"><b class="small" style="width:56px">${fTime(a.starts_at)}</b><span class="grow"><span class="t">${pm[a.patient_id]?.name || a.title || 'Paciente'}</span><span class="tiny muted">${proName(a.professional_id)}${extra ? ' · ' + extra : ''}${a.tele_consent_at ? ' · termo aceito' : ' · termo pendente'}</span></span>${apPill(a)}${openBtn(a)}</div>`;
  after(() => { clearInterval(ONLINE_TIMER); ONLINE_TIMER = setInterval(() => { if (location.hash.startsWith('#/pacientes-online') && !document.getElementById('modal')) router(); else if (!location.hash.startsWith('#/pacientes-online')) clearInterval(ONLINE_TIMER); }, 30000); });
  return html`<div class="pagehead"><h1>Pacientes online</h1><a class="btn primary" href="#/agenda?novo=1">${icon('plus')} Agendar teleconsulta</a></div>
  <div class="grid g4" style="margin-bottom:14px">
    <a class="card kpi" href="#/pacientes-online?f=em_atendimento"><div class="l">Em atendimento agora</div><div class="v" style="color:var(--warn)">${live.length}</div></a>
    <a class="card kpi" href="#/pacientes-online?f=aguardando"><div class="l">Na sala de espera</div><div class="v" style="color:var(--accent)">${waiting.length}</div></a>
    <a class="card kpi" href="#/pacientes-online?f=agendado"><div class="l">Com consulta online marcada</div><div class="v">${n('agendado') + n('aguardando') + n('em_atendimento')}</div></a>
    <a class="card kpi" href="#/pacientes-online?f=atendido"><div class="l">Já atendidos online</div><div class="v">${n('atendido')}</div></a>
  </div>
  <div class="card"><div class="row between"><h2>Hoje no consultório virtual</h2><span class="tiny muted">atualiza sozinho a cada 30 s</span></div>
    ${live.length ? html`<h3 class="small" style="margin:12px 0 4px">Em atendimento</h3><div class="list">${live.map(a => row(a, a.started_at ? 'desde ' + fTime(a.started_at) : ''))}</div>` : ''}
    ${waiting.length ? html`<h3 class="small" style="margin:12px 0 4px">Sala de espera</h3><div class="list">${waiting.map(a => row(a, 'aguardando desde ' + fTime(a.waiting_since)))}</div>` : ''}
    ${next.length ? html`<h3 class="small" style="margin:12px 0 4px">Próximos de hoje</h3><div class="list">${next.map(a => row(a, ''))}</div>` : ''}
    ${!live.length && !waiting.length && !next.length ? html`<div class="empty small">${icon('video')}<div>Nenhuma teleconsulta para hoje.</div></div>` : ''}
    <p class="tiny muted" style="margin-bottom:0">Quando o paciente entra na área dele e toca em “Estou na sala de espera”, ele aparece aqui. Ao atender, a consulta passa para “Em atendimento” e abre a evolução no prontuário.</p>
  </div>
  <div class="card"><div class="row between" style="flex-wrap:wrap;gap:8px"><h2>Cadastro de pacientes online (${rows.length})</h2>
    <form class="row" data-form="onlineSearch" style="gap:6px"><input class="in" name="q" placeholder="Buscar nome ou telefone" value="${q.get('q') || ''}" style="max-width:220px"><input type="hidden" name="f" value="${f}"><button class="btn sm">${icon('search')}</button></form></div>
    <div class="seg" style="margin:10px 0">${[['todos', `Todos (${rows.length})`], ['em_atendimento', `Em atendimento (${n('em_atendimento')})`], ['aguardando', `Sala de espera (${n('aguardando')})`], ['agendado', `Agendados (${n('agendado')})`], ['atendido', `Já atendidos (${n('atendido')})`], ['inativo', `Sem consulta ativa (${n('inativo')})`]].map(([k, l]) => html`<a class="${f === k ? 'on' : ''}" href="#/pacientes-online?f=${k}${busca ? '&q=' + encodeURIComponent(busca) : ''}">${l}</a>`)}</div>
    ${shown.length ? html`<div class="list">${shown.map(r => html`<a class="li" href="#/paciente/${r.patient_id}"><span class="grow"><span class="t">${r.name}</span><span class="tiny muted">${r.proxima_em ? 'próxima ' + fDT(r.proxima_em) + ' · ' : ''}${r.atendidas} atendida(s) online${r.ultima_atendida_em ? ' · última ' + fDate(r.ultima_atendida_em) : ''}${r.faltas ? ' · ' + r.faltas + ' falta(s)' : ''}${r.has_portal ? '' : ' · sem acesso à área do paciente'}</span></span><span class="pill ${ONLINE_SIT[r.situacao][1]}">${ONLINE_SIT[r.situacao][0]}</span></a>`)}</div>`
    : html`<div class="empty small">${icon('user')}<div>${rows.length ? 'Nenhum paciente nesse filtro.' : 'Ainda não há pacientes atendidos online. Ao agendar uma consulta com modalidade “Online”, o paciente entra neste cadastro automaticamente.'}</div></div>`}
  </div>`;
}, 'pacientesOnline');
onForm('onlineSearch', d => go(`#/pacientes-online?f=${encodeURIComponent(d.f || 'todos')}${d.q ? '&q=' + encodeURIComponent(d.q) : ''}`));

/* ---------- portal do paciente: sala de espera ---------- */
const waitOpen = a => a.modality === 'online' && a.tele_consent_at && a.approval !== 'pendente' && ['agendado', 'confirmado'].includes(a.status) && Date.now() >= +new Date(a.starts_at) - 30 * 60000 && Date.now() <= +new Date(a.ends_at);
const waitBtn = a => !waitOpen(a) ? '' : a.waiting_since ? html`<span class="pill accent">Na sala de espera desde ${fTime(a.waiting_since)}</span>` : html`<button class="btn sm" data-act="pEnterWaiting" data-id="${a.id}">${icon('check')} Estou na sala de espera</button>`;
act('pEnterWaiting', async el => { await db.rpc('online_enter_waiting', { p_id: el.dataset.id }); toast('Pronto! A equipe já sabe que você está aguardando. Entre na chamada pelo botão “Entrar na consulta”.', 'ok'); router(); });
DemoRPC.online_enter_waiting = async ({ p_id }) => { const a = (await Demo.list('appointments', { eq: { id: p_id } }))[0]; if (!a || !waitOpen(a)) throw new Error('A sala de espera abre 30 minutos antes da consulta online (com o termo aceito).'); const t = a.waiting_since || new Date().toISOString(); await Demo.updateWhere('appointments', { id: p_id }, { waiting_since: t }); return t; };
