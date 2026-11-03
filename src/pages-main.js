/* ===== Início, Agenda, Pacientes ===== */
const STATUS = { agendado: ['Agendado', 'gray'], confirmado: ['Confirmado', 'ok'], em_atendimento: ['Em atendimento', 'warn'], atendido: ['Atendido', ''], faltou: ['Faltou', 'bad'], cancelado: ['Cancelado', 'bad'] };
const KINDS = { consulta: 'Consulta', teleconsulta: 'Teleconsulta (online)', avaliacao: 'Avaliação', retorno: 'Retorno', procedimento: 'Procedimento', urgencia: 'Urgência', manutencao: 'Manutenção' };
const statusPill = s => html`<span class="pill ${STATUS[s]?.[1] || ''}">${STATUS[s]?.[0] || s}</span>`;
async function patientMap(ids) {
  const u = [...new Set(ids.filter(Boolean))]; if (!u.length) return {};
  const rows = await db.list('patients', { in: { id: u }, select: 'id,name,phone,birth_date,insurance_id' });
  return Object.fromEntries(rows.map(p => [p.id, p]));
}
const confirmMsg = (p, a) => `Olá, ${p.name.split(' ')[0]}! Aqui é do ${S.clinic.name}. Passando para confirmar sua consulta em ${fDate(a.starts_at)} às ${fTime(a.starts_at)}. Podemos confirmar?${a.modality === 'online' && a.meeting_url ? ` A consulta será online, pelo Google Meet: ${a.meeting_url}` : ''}`;

/* ---------- INÍCIO ---------- */
route('/', async () => {
  const now = new Date(), t0 = startOfDay(now), t1 = addDays(t0, 1), m0 = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const [today, fin, newPats, rets] = await Promise.all([
    db.list('appointments', { gte: { starts_at: t0.toISOString() }, lt: { starts_at: t1.toISOString() }, order: 'starts_at' }),
    db.list('finance_entries', { gte: { due_date: m0 }, lte: { due_date: ymd(addDays(now, 60)) } }),
    db.list('patients', { gte: { created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }, select: 'id' }),
    db.list('return_alerts', { eq: { done: false }, lte: { due_date: ymd(addDays(now, 7)) }, order: 'due_date', limit: 6 }),
  ]);
  const pm = await patientMap([...today.map(a => a.patient_id), ...rets.map(r => r.patient_id)]);
  const active = today.filter(a => !['cancelado', 'faltou', 'atendido'].includes(a.status));
  const next = active.find(a => a.status === 'em_atendimento') || active.find(a => new Date(a.ends_at) >= now);
  const T = ymd(now), monthFin = fin.filter(f => f.due_date <= ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const recebido = sum(monthFin.filter(f => f.kind === 'receita' && f.paid_at), f => f.amount);
  const aReceber = sum(fin.filter(f => f.kind === 'receita' && !f.paid_at), f => f.amount);
  const despesas = sum(monthFin.filter(f => f.kind === 'despesa'), f => f.amount);
  const np = next && pm[next.patient_id];
  const q = [['#/agenda?novo=1', 'cal', 'Agendar paciente'], isClinical() ? ['#/prescrever', 'pill', 'Prescrever'] : ['#/solicitacoes', 'globe', 'Agendamentos online'], ['#/pacientes', 'clip', 'Abrir prontuário'], ...(isAdmin() ? [['#/financeiro?novo=despesa', 'receipt', 'Lançar despesa'], ['#/financeiro?novo=receita', 'money', 'Receber pagamento']] : [['#/minha-agenda', 'calme', 'Minha agenda'], ['#/solicitacoes', 'globe', 'Agendamentos online']]), ['#/marketing', 'chat', 'Falar com paciente']];
  return html`
  <div class="pagehead"><div><h1>Olá, ${(S.me.full_name || '').split(' ').slice(0, 2).join(' ') || 'bem-vindo(a)'}</h1><div class="muted small">${fLong(now)} · ${S.clinic.name}</div></div></div>
  <div class="quick">${q.map(([h, i, l]) => html`<a href="${h}">${icon(i)}<span>${l}</span></a>`)}</div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card">
      <div class="row between"><h2>Próximo paciente</h2>${next ? statusPill(next.status) : ''}</div>
      ${np ? html`<div class="row" style="margin:14px 0"><span class="avatar lg">${initials(np.name)}</span><div><div style="font-weight:700;font-size:1.05rem">${np.name}</div><div class="muted small">${fTime(next.starts_at)} – ${fTime(next.ends_at)} · ${KINDS[next.kind] || 'Consulta'}${np.birth_date ? ' · ' + age(np.birth_date) + ' anos' : ''}</div></div></div>
        <div class="row">${next.modality === 'online' && next.meeting_url ? html`<a class="btn accent" target="_blank" rel="noopener" href="${next.meeting_url}">${icon('video')} Entrar na teleconsulta</a>` : ''}${next.status !== 'em_atendimento' ? html`<button class="btn primary" data-act="startAppt" data-id="${next.id}" data-p="${np.id}">${icon('check')} Iniciar atendimento</button>` : html`<a class="btn primary" href="#/paciente/${np.id}?tab=evolucao">${icon('clip')} Abrir prontuário</a>`}
        ${np.phone ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(np.phone, confirmMsg(np, next))}">${icon('wa')} WhatsApp</a>` : ''}</div>`
      : html`<div class="empty">${icon('user')}<div>Nenhum próximo paciente para hoje.</div><a class="btn sm" style="margin-top:10px" href="#/agenda?novo=1">Agendar</a></div>`}
    </div>
    <div class="grid g2">
      <div class="card kpi"><div class="l">Consultas hoje</div><div class="v">${active.length}</div><div class="tiny muted">${today.filter(a => a.status === 'confirmado').length} confirmadas</div></div>
      ${isAdmin() ? html`<div class="card kpi"><div class="l">Recebido no mês</div><div class="v" style="color:var(--ok)">${BRL(recebido)}</div></div>
      <div class="card kpi"><div class="l">A receber</div><div class="v">${BRL(aReceber)}</div></div>` : ''}
      <div class="card kpi"><div class="l">Novos pacientes</div><div class="v">${newPats.length}</div><div class="tiny muted">neste mês${isAdmin() ? ' · despesas ' + BRL(despesas) : ''}</div></div>
    </div>
  </div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card"><div class="row between" style="margin-bottom:10px"><h2>Agenda de hoje</h2><a class="small" href="#/agenda">Ver agenda</a></div>
      ${today.length ? html`<div class="list">${today.map(a => html`<a class="li" href="#/paciente/${a.patient_id}"><b style="width:46px" class="small">${fTime(a.starts_at)}</b><span class="grow"><span class="t">${pm[a.patient_id]?.name || a.title || '—'}</span><span class="tiny muted">${KINDS[a.kind] || ''}</span></span>${statusPill(a.status)}</a>`)}</div>` : html`<div class="empty small">Agenda livre hoje.</div>`}
    </div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><h2>Retornos próximos</h2></div>
      ${rets.length ? html`<div class="list">${rets.map(r => html`<a class="li" href="#/paciente/${r.patient_id}?tab=retornos">${icon('alarm')}<span class="grow"><span class="t">${pm[r.patient_id]?.name || ''}</span><span class="tiny muted">${r.reason || 'Retorno'}</span></span><span class="pill ${r.due_date <= T ? 'warn' : 'gray'}">${r.due_date <= T ? 'Hoje/vencido' : fDate(r.due_date)}</span></a>`)}</div>` : html`<div class="empty small">Nenhum retorno nos próximos 7 dias.</div>`}
    </div>
  </div>`;
}, 'inicio');
act('startAppt', async el => { await db.update('appointments', el.dataset.id, { status: 'em_atendimento' }); go(`#/paciente/${el.dataset.p}?tab=evolucao`); });

/* ---------- seletor de paciente reutilizável ---------- */
function patientPicker(sel = null, { allowNew = true, required = true } = {}) {
  return html`<div class="rel"><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="in" name="patient_name" placeholder="Digite o nome do paciente" autocomplete="off" data-input="ppick" value="${sel?.name || ''}" ${required ? 'required' : ''}>
  ${allowNew ? html`<span class="pill gray" id="ppnew" title="Será cadastrado como novo paciente" style="${sel ? 'display:none' : ''}">NOVO</span>` : ''}</div>
  <input type="hidden" name="patient_id" value="${sel?.id || ''}"><div class="dropdown hidden" id="ppdrop"></div></div>`;
}
let ppT;
onInput('ppick', el => {
  const form = el.closest('form'); form.querySelector('[name=patient_id]').value = ''; const nw = form.querySelector('#ppnew'); nw && (nw.style.display = '');
  clearTimeout(ppT); ppT = setTimeout(async () => {
    const dd = form.querySelector('#ppdrop'); const q = el.value.trim();
    if (q.length < 2) { dd.classList.add('hidden'); return; }
    const rows = await searchPatients(q, 8);
    dd.innerHTML = fv(rows.map(p => html`<button type="button" data-act="ppickSel" data-id="${p.id}" data-name="${p.name}">${p.name}${p.birth_date ? html` <span class="muted small">[${age(p.birth_date)}]</span>` : ''}</button>`));
    dd.classList.toggle('hidden', !rows.length);
  }, 200);
});
act('ppickSel', el => {
  const form = el.closest('form'); form.querySelector('[name=patient_id]').value = el.dataset.id; form.querySelector('[name=patient_name]').value = el.dataset.name;
  form.querySelector('#ppdrop').classList.add('hidden'); const nw = form.querySelector('#ppnew'); nw && (nw.style.display = 'none');
  if (form.id === 'rxform') db.get('patients', el.dataset.id).then(async p => { await loadAllergy(p); document.getElementById('rxallergy').innerHTML = fv(allergyBanner()); if (p.email && !form.email.value) form.email.value = p.email; if (p.phone && !form.phone.value) form.phone.value = fPhone(p.phone); });
});
async function resolvePatient(d, extra = {}) {
  if (d.patient_id) return d.patient_id;
  if (!d.patient_name || d.patient_name.length < 2) throw new Error('Informe o paciente.');
  const p = await db.insert('patients', { name: d.patient_name, phone: nz(extra.phone), email: nz(extra.email) });
  toast('Paciente novo cadastrado.', 'ok'); return p.id;
}

/* ---------- AGENDA ---------- */
function agendaPage(mine) {
  return async (_, q) => {
    const d = q.get('d') ? parseYmd(q.get('d')) : startOfDay(new Date()); const view = q.get('v') || (innerWidth > 900 ? 'semana' : 'dia');
    const pro = mine ? Auth.userId() : (q.get('pro') || '');
    const from = view === 'semana' ? addDays(d, -((d.getDay() + 6) % 7)) : d; const to = addDays(from, view === 'semana' ? 7 : 1);
    const qq = { gte: { starts_at: from.toISOString() }, lt: { starts_at: to.toISOString() }, order: 'starts_at' }; if (pro) qq.eq = { professional_id: pro };
    const appts = await db.list('appointments', qq); const pm = await patientMap(appts.map(a => a.patient_id));
    const base = mine ? '#/minha-agenda' : '#/agenda'; const link = (dd, v = view) => `${base}?d=${ymd(dd)}&v=${v}${pro && !mine ? '&pro=' + pro : ''}`;
    const step = view === 'semana' ? 7 : 1;
    const card = a => { const p = pm[a.patient_id]; return html`<div class="appt ${a.status}" data-act="editAppt" data-id="${a.id}"><div class="grow" style="min-width:0"><div class="t">${a.modality === 'online' ? icon('video', 'small') : ''}${fTime(a.starts_at)} ${p?.name || a.title || 'Compromisso'}</div><div class="tiny muted">${KINDS[a.kind] || ''} · ${STATUS[a.status]?.[0]}${S.members.length > 1 ? ' · ' + proName(a.professional_id) : ''}</div></div></div>`; };
    let body;
    if (view === 'semana') {
      body = html`<div class="week">${[...Array(7)].map((_, i) => { const day = addDays(from, i), k = ymd(day), list = appts.filter(a => ymd(a.starts_at) === k); return html`<div class="day ${k === ymd(new Date()) ? 'today' : ''}"><h4 class="row between"><a href="${link(day, 'dia')}">${WD[day.getDay()].slice(0, 3)} ${pad(day.getDate())}/${pad(day.getMonth() + 1)}</a><button class="btn sm ghost" data-act="newAppt" data-date="${k}" data-time="08:00" aria-label="Novo">${icon('plus')}</button></h4>${list.map(card)}${!list.length ? html`<div class="tiny muted">Livre</div>` : ''}</div>`; })}</div>`;
    } else {
      const slots = []; for (let h = 7; h < 21; h++) for (const m of [0, 30]) slots.push([h, m]);
      body = html`<div class="slots">${slots.map(([h, m]) => { const list = appts.filter(a => { const s = new Date(a.starts_at); return s.getHours() === h && (m === 0 ? s.getMinutes() < 30 : s.getMinutes() >= 30); }); return html`<div class="slot"><div class="h">${pad(h)}:${pad(m)}</div><div class="c">${list.map(card)}${!list.length ? html`<button class="add" data-act="newAppt" data-date="${ymd(d)}" data-time="${pad(h)}:${pad(m)}">+ agendar às ${pad(h)}:${pad(m)}</button>` : ''}</div></div>`; })}</div>`;
    }
    if (q.get('novo')) after(() => ACT.newAppt({ dataset: { date: ymd(d), time: '' } }));
    return html`<div class="pagehead"><h1>${mine ? 'Minha agenda' : 'Agenda'}</h1><button class="btn primary" data-act="newAppt" data-date="${ymd(d)}" data-time="">${icon('plus')} Agendar</button></div>
    <div class="card" style="padding:10px;margin-bottom:12px"><div class="row between"><div class="row"><a class="btn sm" href="${link(addDays(d, -step))}" aria-label="Anterior">${icon('chevl')}</a><a class="btn sm" href="${link(new Date())}">Hoje</a><a class="btn sm" href="${link(addDays(d, step))}" aria-label="Próximo">${icon('chev')}</a>
      <input type="date" class="in" style="height:32px;width:auto" value="${ymd(d)}" data-change="agDate" data-base="${base}" data-v="${view}"><b class="small">${view === 'semana' ? `${fDate(from)} – ${fDate(addDays(to, -1))}` : fLong(d)}</b></div>
      <div class="row">${!mine && S.members.length > 1 ? html`<select class="in" style="height:32px;width:auto" data-change="agPro" data-d="${ymd(d)}" data-v="${view}"><option value="">Todos os profissionais</option>${S.members.map(m => html`<option value="${m.user_id}" ${pro === m.user_id ? 'selected' : ''}>${m.full_name}</option>`)}</select>` : ''}
      <div class="seg"><a class="${view === 'dia' ? 'on' : ''}" href="${link(d, 'dia')}">Dia</a><a class="${view === 'semana' ? 'on' : ''}" href="${link(d, 'semana')}">Semana</a></div></div></div></div>
    ${body}
    <div class="legend" style="margin-top:10px">${Object.entries(STATUS).map(([k, v]) => html`<span>${statusPill(k)}</span>`)}</div>`;
  };
}
route('/agenda', agendaPage(false), 'agenda');
route('/minha-agenda', agendaPage(true), 'minha');
onInput('agDate', el => go(`${el.dataset.base}?d=${el.value}&v=${el.dataset.v}`));
onInput('agPro', el => go(`#/agenda?d=${el.dataset.d}&v=${el.dataset.v}${el.value ? '&pro=' + el.value : ''}`));

function apptForm(a = {}, p = null) {
  const s = a.starts_at ? new Date(a.starts_at) : null; const dur = a.starts_at ? Math.round((new Date(a.ends_at) - s) / 60000) : 45;
  return html`<form data-form="saveAppt" class="stack" id="apptform"><input type="hidden" name="id" value="${a.id || ''}"><input type="hidden" name="request_id" value="${a._request || ''}">
    <label class="f"><span>Paciente <i>*</i></span>${patientPicker(p)}</label>
    <div class="grid g3"><label class="f"><span>Data</span><input class="in" type="date" name="date" required value="${s ? ymd(s) : a._date || ymd(new Date())}"></label>
    <label class="f"><span>Início</span><input class="in" type="time" name="time" required step="300" value="${s ? fTime(s) : a._time || '08:00'}"></label>
    <label class="f"><span>Duração</span><select class="in" name="dur">${[15, 20, 30, 40, 45, 60, 90, 120, 180].map(m => html`<option value="${m}" ${m === dur ? 'selected' : ''}>${m} min</option>`)}</select></label></div>
    <div class="grid g3"><label class="f"><span>Tipo</span><select class="in" name="kind">${Object.entries(KINDS).map(([k, v]) => html`<option value="${k}" ${a.kind === k ? 'selected' : ''}>${v}</option>`)}</select></label>
    <label class="f"><span>Status</span><select class="in" name="status">${Object.entries(STATUS).map(([k, v]) => html`<option value="${k}" ${(a.status || 'agendado') === k ? 'selected' : ''}>${v[0]}</option>`)}</select></label>
    <label class="f"><span>Profissional</span><select class="in" name="professional_id" data-change="apptPro">${pros().map(m => html`<option value="${m.user_id}" ${(a.professional_id || Auth.userId()) === m.user_id ? 'selected' : ''}>${m.full_name}</option>`)}</select></label></div>
    <div class="grid g2"><label class="f"><span>Modalidade</span><select class="in" name="modality" data-change="apptMod"><option value="presencial">Presencial</option><option value="online" ${a.modality === 'online' ? 'selected' : ''}>Online (Google Meet)</option></select></label>
    <label class="f ${a.modality === 'online' ? '' : 'hidden'}" id="meetbox"><span>Link da chamada</span><input class="in" name="meeting_url" type="url" placeholder="https://meet.google.com/…" value="${a.meeting_url || (pros().find(m => m.user_id === (a.professional_id || Auth.userId())) || {}).meet_url || ''}"></label></div>
    ${a.id && a.modality === 'online' && a.meeting_url ? html`<div class="row"><a class="btn accent" target="_blank" rel="noopener" href="${a.meeting_url}">${icon('video')} Entrar na chamada</a>${p?.phone ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Segue o link da sua teleconsulta de ${fDate(a.starts_at)} às ${fTime(a.starts_at)}: ${a.meeting_url}`)}">${icon('wa')} Enviar link</a>` : ''}${a.tele_consent_at ? html`<span class="pill ok">termo aceito ${fDT(a.tele_consent_at)}</span>` : html`<span class="pill warn">sem termo registrado</span>`}</div>` : ''}
    ${a.reason ? html`<p class="small" style="margin:0"><b>Motivo informado pelo paciente:</b> ${a.reason}</p>` : ''}
    <label class="f"><span>Telefone (se for paciente novo)</span><input class="in" name="phone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <label class="f"><span>Observações</span><textarea class="in" name="notes" rows="2">${a.notes || ''}</textarea></label>
    <div class="row between"><div class="row">${a.id ? html`<button type="button" class="btn danger" data-act="delAppt" data-id="${a.id}">${icon('trash')} Excluir</button>` : ''}
    ${a.id && p?.phone ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(p.phone, confirmMsg(p, a))}">${icon('wa')} Confirmar no WhatsApp</a>` : ''}
    ${a.id && p ? html`<a class="btn" href="#/paciente/${p.id}" data-act="closeModalNav">${icon('clip')} Prontuário</a>` : ''}</div>
    <button class="btn primary" type="submit">Salvar</button></div></form>`;
}
act('newAppt', el => modal('Novo agendamento', apptForm({ _date: el.dataset.date, _time: el.dataset.time || '08:00' }, null)));
act('editAppt', async el => { const a = await db.get('appointments', el.dataset.id); const p = a.patient_id ? await db.get('patients', a.patient_id) : null; modal('Agendamento', apptForm(a, p)); });
act('delAppt', async el => { if (await confirmBox('Excluir este agendamento?', 'Excluir')) { await db.remove('appointments', el.dataset.id); closeModal(); toast('Agendamento excluído.'); router(); } });
onForm('saveAppt', async d => {
  const pid = await resolvePatient(d, { phone: d.phone });
  const s = new Date(`${d.date}T${d.time}`); const e = new Date(s.getTime() + (+d.dur) * 60000);
  const clash = (await db.list('appointments', { eq: { professional_id: d.professional_id }, lt: { starts_at: e.toISOString() }, gt: { ends_at: s.toISOString() } })).filter(x => x.id !== d.id && !['cancelado', 'faltou'].includes(x.status));
  if (clash.length && !(await confirmBox(`Já existe ${clash.length} agendamento nesse horário para esse profissional. Agendar mesmo assim?`, 'Agendar assim mesmo'))) return;
  if (d.modality === 'online' && d.meeting_url && !/^https:\/\//.test(d.meeting_url)) throw new Error('O link da chamada precisa começar com https://');
  const row = { patient_id: pid, starts_at: s.toISOString(), ends_at: e.toISOString(), kind: d.modality === 'online' && d.kind === 'consulta' ? 'teleconsulta' : d.kind, status: d.status, professional_id: d.professional_id, notes: nz(d.notes), modality: d.modality, meeting_url: d.modality === 'online' ? nz(d.meeting_url) : null };
  if (d.id) await db.update('appointments', d.id, row); else await db.insert('appointments', row);
  if (d.request_id) { await db.update('appointment_requests', d.request_id, { status: 'agendado', response: `Agendado para ${fDT(s)}` }); updateNotif(); }
  closeModal(); toast('Agendamento salvo.', 'ok'); router();
});

/* ---------- PACIENTES ---------- */
route('/pacientes', async (_, q) => {
  const term = q.get('q') || '', st = q.get('st') || 'ativos';
  let rows = term ? await searchPatients(term, 200) : await db.list('patients', { order: 'name', limit: 1000 });
  rows = rows.filter(p => st === 'todos' || (st === 'ativos' ? p.active !== false : p.active === false)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (q.get('novo')) after(() => ACT.newPatient());
  return html`<div class="pagehead"><h1>Pacientes <span class="muted small">(${rows.length})</span></h1><div class="row"><button class="btn" data-act="exportPatients">${icon('down')} Exportar</button><button class="btn primary" data-act="newPatient">${icon('plus')} Novo paciente</button></div></div>
  <div class="row" style="margin-bottom:12px"><form data-form="psearch" class="search" style="flex:1;min-width:220px">${icon('search')}<input class="in" name="q" value="${term}" placeholder="Buscar por nome, CPF ou telefone"></form>
  <div class="seg">${['ativos', 'inativos', 'todos'].map(s => html`<a class="${st === s ? 'on' : ''}" href="#/pacientes?st=${s}${term ? '&q=' + encodeURIComponent(term) : ''}">${s[0].toUpperCase() + s.slice(1)}</a>`)}</div></div>
  ${rows.length ? html`<div class="list">${rows.map(p => html`<div class="li"><a href="#/paciente/${p.id}" class="row grow" style="color:inherit;flex-wrap:nowrap;min-width:0"><span class="avatar">${initials(p.name)}</span><span class="grow" style="min-width:0"><span class="t" style="display:block">${p.name}</span><span class="tiny muted">${p.birth_date ? age(p.birth_date) + ' anos · ' : ''}${insName(p.insurance_id)}${p.phone ? ' · ' + fPhone(p.phone) : ''}</span></span></a>
    <span class="hide-m">${(p.tags || []).map(t => html`<span class="pill gray" style="margin-left:4px">${t}</span>`)}${p.alerts ? html`<span class="pill bad" title="${p.alerts}" style="margin-left:4px">alerta</span>` : ''}</span>
    <div><button class="iconbtn" style="color:var(--ink-2)" data-act="popmenu" data-menu="pm-${p.id}" aria-label="Opções">${icon('dots')}</button>
    <template id="pm-${p.id}">${p.phone ? html`<a target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Aqui é do ${S.clinic.name}.`)}">${icon('chat')} Contato com paciente</a>` : ''}<button data-act="editPatient" data-id="${p.id}">${icon('edit')} Editar paciente</button><a href="#/paciente/${p.id}">${icon('clip')} Prontuário do paciente</a><a href="#/agenda?novo=1">${icon('cal')} Agendar</a></template></div></div>`)}</div>`
    : html`<div class="card empty">${icon('users')}<div>${term ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}</div><button class="btn primary sm" style="margin-top:10px" data-act="newPatient">Cadastrar paciente</button></div>`}`;
}, 'pacientes');
onForm('psearch', d => go(`#/pacientes${d.q ? '?q=' + encodeURIComponent(d.q) : ''}`));
act('exportPatients', async () => {
  const rows = await db.list('patients', { order: 'name', limit: 5000 });
  const cols = ['record_number', 'name', 'cpf', 'birth_date', 'sex', 'phone', 'email', 'city', 'state', 'origin'];
  const csv = [['Nº', 'Nome', 'CPF', 'Nascimento', 'Sexo', 'Telefone', 'E-mail', 'Cidade', 'UF', 'Origem', 'Convênio'].join(';'), ...rows.map(r => [...cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`), `"${insName(r.insurance_id)}"`].join(';'))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'pacientes-pepmh.csv'; a.click();
});

function patientForm(p = {}) {
  return html`<form data-form="savePatient" class="stack"><input type="hidden" name="id" value="${p.id || ''}">
  <label class="f"><span>Nome completo <i>*</i></span><input class="in" name="name" required value="${p.name || ''}"></label>
  <div class="grid g3"><label class="f"><span>Nascimento</span><input class="in" type="date" name="birth_date" value="${p.birth_date || ''}"></label>
  <label class="f"><span>Sexo</span><select class="in" name="sex"><option value="">—</option>${[['F', 'Feminino'], ['M', 'Masculino'], ['O', 'Outro']].map(([k, v]) => html`<option value="${k}" ${p.sex === k ? 'selected' : ''}>${v}</option>`)}</select></label>
  <label class="f"><span>CPF</span><input class="in" name="cpf" inputmode="numeric" value="${fCPF(p.cpf)}"></label></div>
  <div class="grid g2"><label class="f"><span>Celular (WhatsApp)</span><input class="in" name="phone" inputmode="tel" value="${fPhone(p.phone)}"></label><label class="f"><span>E-mail</span><input class="in" type="email" name="email" value="${p.email || ''}"></label></div>
  <div class="grid g2"><label class="f"><span>Convênio</span><select class="in" name="insurance_id"><option value="">Particular</option>${S.insurances.filter(i => i.active && i.name !== 'Particular').map(i => html`<option value="${i.id}" ${p.insurance_id === i.id ? 'selected' : ''}>${i.name}</option>`)}</select></label><label class="f"><span>Nº da carteirinha</span><input class="in" name="insurance_card" value="${p.insurance_card || ''}"></label></div>
  <div class="grid g3"><label class="f"><span>CEP</span><input class="in" name="zip" inputmode="numeric" value="${p.zip || ''}"></label><label class="f"><span>Cidade</span><input class="in" name="city" value="${p.city || ''}"></label><label class="f"><span>UF</span><input class="in" name="state" maxlength="2" value="${p.state || ''}"></label></div>
  <label class="f"><span>Endereço</span><input class="in" name="address" value="${p.address || ''}"></label>
  <div class="grid g3"><label class="f"><span>RG</span><input class="in" name="rg" value="${p.rg || ''}"></label><label class="f"><span>Profissão</span><input class="in" name="occupation" value="${p.occupation || ''}"></label><label class="f"><span>Como conheceu</span><input class="in" name="origin" list="origins" value="${p.origin || ''}"><datalist id="origins"><option>Indicação</option><option>Instagram</option><option>Google</option><option>Convênio</option><option>Passou em frente</option></datalist></label></div>
  <label class="f"><span>Responsável (menor de idade)</span><input class="in" name="guardian_name" value="${p.guardian_name || ''}"></label>
  <label class="f"><span>Alertas clínicos (alergias, condições)</span><input class="in" name="alerts" value="${p.alerts || ''}" placeholder="Ex.: alergia a penicilina"></label>
  <label class="f"><span>Etiquetas (separe por vírgula)</span><input class="in" name="tags" value="${(p.tags || []).join(', ')}"></label>
  <label class="f"><span>Observações</span><textarea class="in" name="notes" rows="2">${p.notes || ''}</textarea></label>
  ${p.id ? html`<label class="check"><input type="checkbox" name="active" ${p.active !== false ? 'checked' : ''}> Paciente ativo</label>` : ''}
  <div class="row between">${p.id ? html`<button type="button" class="btn danger" data-act="delPatient" data-id="${p.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`;
}
act('newPatient', () => modal('Novo paciente', patientForm(), { wide: true }));
act('editPatient', async el => modal('Editar paciente', patientForm(await db.get('patients', el.dataset.id)), { wide: true }));
act('delPatient', async el => { if (await confirmBox('Excluir o paciente e TODO o prontuário dele (consultas, evolução, documentos)? Essa ação não pode ser desfeita. Se quiser só esconder, desmarque "Paciente ativo".', 'Excluir definitivamente')) { await db.remove('patients', el.dataset.id); closeModal(); toast('Paciente excluído.'); go('#/pacientes'); } });
onForm('savePatient', async d => {
  const row = { name: d.name, birth_date: nz(d.birth_date), sex: nz(d.sex), cpf: nz(onlyDigits(d.cpf)), phone: nz(onlyDigits(d.phone)), email: nz(d.email), insurance_id: nz(d.insurance_id), insurance_card: nz(d.insurance_card), zip: nz(d.zip), city: nz(d.city), state: nz((d.state || '').toUpperCase()), address: nz(d.address), rg: nz(d.rg), occupation: nz(d.occupation), origin: nz(d.origin), guardian_name: nz(d.guardian_name), alerts: nz(d.alerts), notes: nz(d.notes), tags: (d.tags || '').split(',').map(s => s.trim()).filter(Boolean) };
  if (row.cpf && row.cpf.length !== 11) throw new Error('CPF precisa ter 11 dígitos.');
  if (d.id) { row.active = !!d.active; await db.update('patients', d.id, row); closeModal(); toast('Paciente atualizado.', 'ok'); router(); }
  else { const p = await db.insert('patients', row); closeModal(); toast('Paciente cadastrado.', 'ok'); go(`#/paciente/${p.id}`); }
});

onInput('apptMod', el => { document.getElementById('meetbox').classList.toggle('hidden', el.value !== 'online'); });
onInput('apptPro', el => { const m = pros().find(x => x.user_id === el.value); const f = el.form.meeting_url; if (m?.meet_url && f) f.value = m.meet_url; });
