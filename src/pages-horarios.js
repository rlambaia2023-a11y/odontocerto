/* ===== Horários e bloqueios: semana padrão, calendário de bloqueios e prévia do que o paciente vê =====
   Bloqueio = work_events com kind 'bloqueio'. Some da página de agendamento na hora (public_slots)
   e vai para o Google Agenda da clínica pela fila do script (pushEvent → google_jobs). */
const HB = { pro: null, month: null, sel: new Set(), data: null, loading: false };
const HB_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const HB_MOD = { ambos: 'online e presencial', online: 'online', presencial: 'presencial' };
const hbCanPick = () => isAdmin(); // responsável e recepção escolhem o profissional; médico comum mexe só na própria agenda
const hbIsBlock = e => e.kind === 'bloqueio';
const hbDayStart = k => parseYmd(k), hbDayEnd = k => addDays(parseYmd(k), 1);
const hbOverlap = (s, e, k) => new Date(s) < hbDayEnd(k) && new Date(e) > hbDayStart(k);
const hbWholeDay = (e, k) => new Date(e.starts_at) <= hbDayStart(k) && new Date(e.ends_at) >= hbDayEnd(k);
const hbTime = s => String(s || '').slice(0, 5);
const hbRpc = async (fn, args) => { try { return (await db.rpc(fn, args)) || []; } catch (e) { return []; } };

function hbDefaultPro() {
  const list = pros(); const saved = LS.get('pepmh_hb_pro');
  if (!hbCanPick() || (isClinical() && !saved)) return Auth.userId();
  return list.find(m => m.user_id === saved)?.user_id || list[0]?.user_id || Auth.userId();
}

async function hbLoad() {
  const first = new Date(HB.month.getFullYear(), HB.month.getMonth(), 1), last = new Date(HB.month.getFullYear(), HB.month.getMonth() + 1, 1);
  const from = addDays(first, -7), to = addDays(last, 7); const T = startOfDay(new Date());
  const range = { lt: { starts_at: to.toISOString() }, gt: { ends_at: from.toISOString() } };
  const [av, evs, aps] = await Promise.all([
    db.list('availability', { eq: { professional_id: HB.pro }, order: 'weekday,start_time' }),
    db.list('work_events', { eq: { professional_id: HB.pro }, ...range, order: 'starts_at' }),
    db.list('appointments', { eq: { professional_id: HB.pro }, ...range, order: 'starts_at' }),
  ]);
  const live = aps.filter(a => !['cancelado', 'faltou'].includes(a.status) && a.approval !== 'recusado');
  // o que o paciente vê: próximos 14 dias da página de agendamento
  let slots = null;
  if (S.clinic.public_booking && S.clinic.slug) slots = await hbRpc('public_slots', { p_slug: S.clinic.slug, p_professional: HB.pro, p_from: ymd(T), p_days: 14 });
  // vagas livres no mês mostrado (só dias de hoje para frente; o banco limita a 31 dias por chamada)
  let monthSlots = [];
  if (S.clinic.public_booking && S.clinic.slug && last > T) {
    const f0 = first > T ? first : T; const days = Math.round((last - f0) / 864e5);
    if (days > 0) monthSlots = await hbRpc('public_slots', { p_slug: S.clinic.slug, p_professional: HB.pro, p_from: ymd(f0), p_days: Math.min(31, days) });
  }
  const pm = await patientMap(live.map(a => a.patient_id));
  HB.data = { av, evs, aps: live, slots, monthSlots, pm };
}

async function hbRefresh(keepSel = true) {
  if (!keepSel) HB.sel.clear();
  await hbLoad(); hbRender();
}

function hbRender() {
  const root = document.getElementById('hbroot'); if (!root) return;
  root.innerHTML = fv(hbBody());
}

/* ---------- página ---------- */
route('/horarios', async (_, q) => {
  if (!pros().length) return html`<div class="card empty">${icon('cal')}<h2>Nenhum profissional na clínica</h2></div>`;
  HB.pro = q.get('pro') && hbCanPick() ? q.get('pro') : (HB.pro && (hbCanPick() || HB.pro === Auth.userId()) ? HB.pro : hbDefaultPro());
  if (!pros().some(m => m.user_id === HB.pro)) HB.pro = pros()[0].user_id;
  HB.month = HB.month || new Date(new Date().getFullYear(), new Date().getMonth(), 1); HB.sel.clear();
  await hbLoad();
  return html`<div class="pagehead"><h1>Horários e bloqueios</h1><div class="row"><a class="btn" href="#/minha-agenda">${icon('calme')} Ver agenda</a></div></div>
    <div id="hbroot">${hbBody()}</div>`;
}, 'horarios');

function hbBody() {
  const D = HB.data; const pro = pros().find(m => m.user_id === HB.pro) || {};
  return html`
  ${hbCanPick() && pros().length > 1 ? html`<div class="card hb-pros"><span class="small muted">Agenda de</span><div class="seg" style="flex-wrap:wrap">${pros().map(m => html`<button class="${m.user_id === HB.pro ? 'on' : ''}" data-act="hbPro" data-id="${m.user_id}">${m.full_name}</button>`)}</div></div>` : ''}
  <div class="hb-steps small"><span><b>1</b> Monte a semana padrão</span><span><b>2</b> Toque nos dias para bloquear</span><span><b>3</b> Pronto: some para os pacientes e vai para o Google Agenda</span></div>
  <div class="hb-grid">
    <div class="stack" style="gap:14px">${hbCalendar(D)}${hbSelectionPanel(D)}</div>
    <div class="stack" style="gap:14px">${hbWeek(D, pro)}${hbPreview(D)}${hbGoogleBox()}</div>
  </div>`;
}

/* ---------- semana padrão ---------- */
function hbWeek(D, pro) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return html`<div class="card"><div class="row between"><h2 style="margin:0">${icon('repeat')} Semana padrão</h2><button class="btn sm primary" data-act="hbAddHours" data-days="">${icon('plus')} Horário</button></div>
    <p class="small muted" style="margin:6px 0 10px">Os horários que se repetem toda semana. Consulta de ${pro.slot_min || 30} min${pro.accepts_online !== false ? ' · atende online' : ''}${pro.accepts_presencial !== false ? ' · atende presencial' : ''}.</p>
    <div class="hb-week">${order.map(wd => { const list = D.av.filter(a => +a.weekday === wd); return html`<div class="hb-wd ${list.length ? '' : 'off'}">
      <div class="row between"><b>${WD[wd]}</b><button class="btn sm ghost" data-act="hbAddHours" data-days="${wd}" aria-label="Adicionar horário na ${WD[wd]}">${icon('plus')}</button></div>
      ${list.length ? list.map(a => html`<div class="hb-chip"><span>${hbTime(a.start_time)}–${hbTime(a.end_time)}</span><span class="tiny muted">${HB_MOD[a.modality]}</span><button class="iconbtn" data-act="hbDelHours" data-id="${a.id}" aria-label="Remover">${icon('x')}</button></div>`) : html`<span class="tiny muted">Fechado</span>`}</div>`; })}</div></div>`;
}

act('hbAddHours', el => {
  const pre = el.dataset.days === '' ? [] : el.dataset.days.split(',').map(Number);
  modal('Adicionar horário de atendimento', html`<form data-form="hbSaveHours" class="stack">
    <span class="small" style="font-weight:600">Em quais dias?</span>
    <div class="hb-daypick">${[1, 2, 3, 4, 5, 6, 0].map(w => html`<label><input type="checkbox" name="d${w}" ${pre.includes(w) ? 'checked' : ''}><span>${WDS[w]}</span></label>`)}</div>
    <div class="row" style="gap:6px"><button type="button" class="btn sm" data-act="hbPickDays" data-d="1,2,3,4,5">Seg a Sex</button><button type="button" class="btn sm" data-act="hbPickDays" data-d="0,1,2,3,4,5,6">Todos</button><button type="button" class="btn sm" data-act="hbPickDays" data-d="">Nenhum</button></div>
    <div class="grid g3"><label class="f"><span>Das</span><input class="in" type="time" name="start" value="14:00" required step="900"></label><label class="f"><span>Até</span><input class="in" type="time" name="end" value="20:00" required step="900"></label>
      <label class="f"><span>Tipo</span><select class="in" name="modality"><option value="ambos">Online e presencial</option><option value="online">Só online</option><option value="presencial">Só presencial</option></select></label></div>
    <div class="row" style="gap:6px"><span class="tiny muted">Atalhos:</span><button type="button" class="btn sm ghost" data-act="hbPreset" data-s="08:00" data-e="12:00">Manhã</button><button type="button" class="btn sm ghost" data-act="hbPreset" data-s="14:00" data-e="18:00">Tarde</button><button type="button" class="btn sm ghost" data-act="hbPreset" data-s="14:00" data-e="20:00">14h às 20h</button><button type="button" class="btn sm ghost" data-act="hbPreset" data-s="18:00" data-e="21:00">Noite</button></div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">${icon('check')} Salvar horário</button></div></form>`);
});
act('hbPickDays', el => { const f = el.closest('form'); const want = el.dataset.d ? el.dataset.d.split(',') : []; [0, 1, 2, 3, 4, 5, 6].forEach(w => { f['d' + w].checked = want.includes(String(w)); }); });
act('hbPreset', el => { const f = el.closest('form'); f.start.value = el.dataset.s; f.end.value = el.dataset.e; });
onForm('hbSaveHours', async d => {
  const days = [0, 1, 2, 3, 4, 5, 6].filter(w => d['d' + w]);
  if (!days.length) throw new Error('Escolha pelo menos um dia.');
  if (d.end <= d.start) throw new Error('O horário final precisa ser depois do inicial.');
  const clash = HB.data.av.filter(a => days.includes(+a.weekday) && hbTime(a.start_time) < d.end && hbTime(a.end_time) > d.start);
  if (clash.length) throw new Error(`Já existe horário nesse período na ${clash.map(a => WD[a.weekday]).join(', ')}. Remova o antigo antes ou escolha outra faixa.`);
  await db.insert('availability', days.map(w => ({ professional_id: HB.pro, weekday: w, start_time: d.start, end_time: d.end, modality: d.modality })));
  closeModal(); toast('Horário salvo. Já aparece para os pacientes.', 'ok'); await hbRefresh();
});
act('hbDelHours', async el => {
  const a = HB.data.av.find(x => x.id === el.dataset.id); if (!a) return;
  if (!(await confirmBox(`Tirar ${WD[a.weekday]} das ${hbTime(a.start_time)} às ${hbTime(a.end_time)} da semana padrão? As consultas já marcadas continuam.`, 'Tirar horário'))) return;
  await db.remove('availability', a.id); toast('Horário removido.'); await hbRefresh();
});

/* ---------- calendário do mês ---------- */
function hbDayInfo(D, k) {
  const day = parseYmd(k); const wd = day.getDay();
  const av = D.av.filter(a => +a.weekday === wd);
  const evs = D.evs.filter(e => hbOverlap(e.starts_at, e.ends_at, k));
  const blocks = evs.filter(hbIsBlock), others = evs.filter(e => !hbIsBlock(e));
  const whole = blocks.some(e => hbWholeDay(e, k)) || (av.length && av.every(a => blocks.some(b => new Date(b.starts_at) <= new Date(`${k}T${hbTime(a.start_time)}`) && new Date(b.ends_at) >= new Date(`${k}T${hbTime(a.end_time)}`))));
  const aps = D.aps.filter(a => ymd(a.starts_at) === k);
  const free = D.monthSlots.filter(s => ymd(s.starts_at) === k);
  const freeTimes = new Set(free.map(s => s.starts_at)).size;
  return { k, day, av, blocks, others, whole, partial: !whole && (blocks.length > 0 || others.length > 0), aps, freeTimes, past: day < startOfDay(new Date()) };
}
function hbCalendar(D) {
  const y = HB.month.getFullYear(), mo = HB.month.getMonth(); const first = new Date(y, mo, 1);
  const lead = (first.getDay() + 6) % 7; const n = new Date(y, mo + 1, 0).getDate(); const T = ymd(new Date());
  const cells = [...Array(lead)].map(() => null).concat([...Array(n)].map((_, i) => ymd(new Date(y, mo, i + 1))));
  return html`<div class="card hb-cal-card"><div class="row between"><h2 style="margin:0">${icon('cal')} ${HB_MONTHS[mo]} de ${y}</h2>
      <div class="row" style="gap:4px"><button class="btn sm" data-act="hbMonth" data-n="-1" aria-label="Mês anterior">${icon('chevl')}</button><button class="btn sm" data-act="hbMonth" data-n="0">Hoje</button><button class="btn sm" data-act="hbMonth" data-n="1" aria-label="Próximo mês">${icon('chev')}</button></div></div>
    <p class="small muted" style="margin:6px 0 10px">Toque em um ou vários dias. Depois escolha: bloquear o dia todo, bloquear só um horário ou liberar de novo.</p>
    <div class="hb-cal">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(w => html`<div class="hb-h">${w}</div>`)}
      ${cells.map(k => { if (!k) return html`<div></div>`; const i = hbDayInfo(D, k);
        const cls = ['hb-d', i.past ? 'past' : '', !i.av.length ? 'closed' : '', i.whole ? 'blocked' : '', i.partial ? 'partial' : '', HB.sel.has(k) ? 'sel' : '', k === T ? 'today' : ''].join(' ');
        const tag = i.whole ? html`<span class="hb-tag bad">${icon('lock')} bloqueado</span>` : !i.av.length ? html`<span class="hb-tag">fechado</span>` : i.past ? '' : i.partial ? html`<span class="hb-tag warn">parcial</span>` : (S.clinic.public_booking ? html`<span class="hb-tag ok">${i.freeTimes} vaga${i.freeTimes === 1 ? '' : 's'}</span>` : '');
        return html`<button class="${cls}" data-act="hbDay" data-k="${k}" ${i.past ? 'disabled' : ''} aria-pressed="${HB.sel.has(k)}"><span class="n">${+k.slice(8)}</span>${tag}${i.aps.length ? html`<span class="hb-dot" title="${i.aps.length} consulta(s)">${i.aps.length}</span>` : ''}</button>`; })}
    </div>
    <div class="legend small" style="margin-top:10px"><span><i class="hb-sw ok"></i>com vagas</span><span><i class="hb-sw warn"></i>bloqueio parcial</span><span><i class="hb-sw bad"></i>bloqueado</span><span><i class="hb-sw"></i>fechado</span><span><span class="hb-dot static">2</span> consultas marcadas</span></div>
    <div class="row" style="margin-top:10px;gap:6px"><button class="btn sm" data-act="hbRangeModal">${icon('lock')} Bloquear um período (férias, congresso…)</button></div></div>`;
}
act('hbMonth', async el => { const n = +el.dataset.n; HB.month = n === 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date(HB.month.getFullYear(), HB.month.getMonth() + n, 1); await hbRefresh(); });
act('hbDay', el => { const k = el.dataset.k; HB.sel.has(k) ? HB.sel.delete(k) : HB.sel.add(k); hbRender(); if (HB.sel.size === 1 && innerWidth < 900) document.getElementById('hbsel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
act('hbPro', async el => { HB.pro = el.dataset.id; LS.set('pepmh_hb_pro', HB.pro); await hbRefresh(false); });
act('hbClear', () => { HB.sel.clear(); hbRender(); });

/* ---------- painel dos dias selecionados ---------- */
function hbSelectionPanel(D) {
  const keys = [...HB.sel].sort();
  if (!keys.length) return html`<div class="card hb-sel empty small" id="hbsel">${icon('bulb')}<div>Nenhum dia selecionado. Toque nos dias do calendário para bloquear ou liberar.</div></div>`;
  const infos = keys.map(k => hbDayInfo(D, k)); const anyBlock = infos.some(i => i.blocks.length);
  const label = keys.length === 1 ? fLong(parseYmd(keys[0])) : `${keys.length} dias selecionados`;
  return html`<div class="card hb-sel" id="hbsel"><div class="row between"><h3 style="margin:0">${label}</h3><button class="btn sm ghost" data-act="hbClear">Limpar seleção</button></div>
    <div class="hb-actions"><button class="btn danger" data-act="hbBlockDay">${icon('lock')} Bloquear dia inteiro</button><button class="btn" data-act="hbBlockHours">${icon('alarm')} Bloquear só um horário</button>${anyBlock ? html`<button class="btn" data-act="hbUnblock">${icon('check')} Liberar (tirar bloqueios)</button>` : ''}</div>
    <div class="list" style="margin-top:10px">${infos.map(i => html`<div class="li small hb-li"><span class="grow"><b>${keys.length > 1 ? fLong(i.day) : 'Neste dia'}</b>
      <span class="tiny muted"> · ${i.av.length ? 'atende ' + i.av.map(a => `${hbTime(a.start_time)}–${hbTime(a.end_time)}`).join(', ') : 'fechado na semana padrão'}</span>
      ${i.blocks.map(b => html`<div class="hb-row"><span class="pill bad">${icon('lock')} ${hbWholeDay(b, i.k) ? 'dia inteiro' : `${fTime(b.starts_at)}–${fTime(b.ends_at)}`}</span><span class="tiny">${b.notes || ''}</span>${b.google_event_id ? html`<span class="pill ok" title="Já está no Google Agenda">no Google</span>` : html`<span class="pill gray" title="O script da clínica envia em até 5 minutos">indo pro Google…</span>`}<button class="btn sm ghost danger" data-act="hbDelBlock" data-id="${b.id}">${icon('x')} liberar</button></div>`)}
      ${i.others.map(e => html`<div class="hb-row"><span class="pill gray">${fTime(e.starts_at)}–${fTime(e.ends_at)}</span><span class="tiny">${e.title}${e.source === 'google' ? ' (Google Agenda)' : ''}</span></div>`)}
      ${i.aps.map(a => html`<div class="hb-row"><span class="pill">${fTime(a.starts_at)}</span><span class="tiny">${D.pm[a.patient_id]?.name || a.title || 'Paciente'} · ${apptLabel(a)[0]}</span></div>`)}
      </span></div>`)}</div></div>`;
}

/* ---------- criar bloqueios ---------- */
function hbBlockModal(title, withHours) {
  const keys = [...HB.sel].sort();
  modal(title, html`<form data-form="hbSaveBlock" class="stack"><input type="hidden" name="whole" value="${withHours ? '' : '1'}">
    <p class="small muted" style="margin:0">${keys.length === 1 ? fLong(parseYmd(keys[0])) : `${keys.length} dias: ${keys.map(k => fDate(k).slice(0, 5)).join(', ')}`}</p>
    ${withHours ? html`<div class="grid g2"><label class="f"><span>Das</span><input class="in" type="time" name="start" value="14:00" required step="900"></label><label class="f"><span>Até</span><input class="in" type="time" name="end" value="16:00" required step="900"></label></div>` : ''}
    <label class="f"><span>Motivo (só a equipe vê; vai também no Google Agenda)</span><input class="in" name="reason" maxlength="120" placeholder="Ex.: congresso, plantão, compromisso pessoal"></label>
    <div class="tip" style="margin:0">${icon('globe')}<span>Assim que salvar, esse período some da página de agendamento dos pacientes. No Google Agenda da clínica ele aparece em até 5 minutos.</span></div>
    <div class="row" style="justify-content:flex-end"><button class="btn danger" type="submit">${icon('lock')} Bloquear</button></div></form>`);
}
act('hbBlockDay', () => hbBlockModal('Bloquear dia inteiro', false));
act('hbBlockHours', () => hbBlockModal('Bloquear um horário', true));
act('hbRangeModal', () => {
  const t = ymd(new Date());
  modal('Bloquear um período', html`<form data-form="hbSaveRange" class="stack"><div class="grid g2"><label class="f"><span>De</span><input class="in" type="date" name="from" min="${t}" value="${t}" required></label><label class="f"><span>Até</span><input class="in" type="date" name="to" min="${t}" value="${ymd(addDays(new Date(), 6))}" required></label></div>
    <label class="check small"><input type="checkbox" name="only_work" checked> Só os dias em que há atendimento na semana padrão</label>
    <label class="f"><span>Motivo</span><input class="in" name="reason" maxlength="120" placeholder="Ex.: férias"></label>
    <div class="row" style="justify-content:flex-end"><button class="btn danger" type="submit">${icon('lock')} Bloquear período</button></div></form>`);
});
onForm('hbSaveRange', async d => {
  const a = parseYmd(d.from), b = parseYmd(d.to); if (b < a) throw new Error('A data final precisa ser depois da inicial.');
  if ((b - a) / 864e5 > 120) throw new Error('Período longo demais (máx. 120 dias).');
  const wds = new Set(HB.data.av.map(x => +x.weekday)); const keys = [];
  for (let x = a; x <= b; x = addDays(x, 1)) if (!d.only_work || wds.has(x.getDay())) keys.push(ymd(x));
  if (!keys.length) throw new Error('Nenhum dia de atendimento nesse período.');
  await hbCreateBlocks(keys.map(k => ({ k, s: hbDayStart(k), e: hbDayEnd(k) })), d.reason);
});
onForm('hbSaveBlock', async d => {
  const keys = [...HB.sel].sort(); if (!keys.length) throw new Error('Selecione os dias no calendário.');
  let items;
  if (d.whole) items = keys.map(k => ({ k, s: hbDayStart(k), e: hbDayEnd(k) }));
  else { if (d.end <= d.start) throw new Error('O horário final precisa ser depois do inicial.'); items = keys.map(k => ({ k, s: new Date(`${k}T${d.start}`), e: new Date(`${k}T${d.end}`) })); }
  await hbCreateBlocks(items, d.reason);
});
async function hbCreateBlocks(items, reason) {
  // pula o que já está bloqueado por inteiro
  const todo = items.filter(it => !HB.data.evs.some(b => hbIsBlock(b) && new Date(b.starts_at) <= it.s && new Date(b.ends_at) >= it.e));
  if (!todo.length) { closeModal(); toast('Esse período já estava bloqueado.'); return; }
  // consultas já marcadas dentro do bloqueio
  const minS = new Date(Math.min(...todo.map(i => +i.s))), maxE = new Date(Math.max(...todo.map(i => +i.e)));
  const aps = (await db.list('appointments', { eq: { professional_id: HB.pro }, lt: { starts_at: maxE.toISOString() }, gt: { ends_at: minS.toISOString() } }))
    .filter(a => !['cancelado', 'faltou'].includes(a.status) && a.approval !== 'recusado' && todo.some(i => new Date(a.starts_at) < i.e && new Date(a.ends_at) > i.s));
  if (aps.length) {
    const pm = await patientMap(aps.map(a => a.patient_id));
    const go = await new Promise(res => {
      modal('Já tem paciente marcado nesse período', html`<div class="tip" style="border-color:var(--warn);margin-top:0">${icon('alarm')}<span>O bloqueio <b>não cancela</b> as consultas abaixo. Depois de bloquear, abra cada uma na agenda para remarcar ou avisar o paciente.</span></div>
        <div class="list" style="margin-top:10px">${aps.map(a => html`<div class="li small"><span class="pill">${fDate(a.starts_at).slice(0, 5)} ${fTime(a.starts_at)}</span><span class="grow">${pm[a.patient_id]?.name || 'Paciente'} · ${apptLabel(a)[0]}</span>${pm[a.patient_id]?.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(pm[a.patient_id].phone, `Olá, ${(pm[a.patient_id].name || '').split(' ')[0]}! Precisamos remarcar sua consulta de ${fDate(a.starts_at)} às ${fTime(a.starts_at)}. Podemos ver um novo horário?`)}">${icon('wa')}</a>` : ''}</div>`)}</div>`,
        { footer: html`<button class="btn" data-act="hbNo">Voltar</button><button class="btn danger" data-act="hbYes">Bloquear mesmo assim</button>` });
      ACT.hbYes = () => res(true); ACT.hbNo = () => { closeModal(); res(false); };
    });
    if (!go) return;
  }
  const name = proName(HB.pro) || 'Profissional'; const series = todo.length > 1 ? uid() : null; const why = nz((reason || '').trim());
  const rows = todo.map(it => ({ professional_id: HB.pro, kind: 'bloqueio', title: `Agenda bloqueada · ${name}`, notes: why, starts_at: it.s.toISOString(), ends_at: it.e.toISOString(), series_id: series, source: 'pepmh' }));
  const saved = await db.insert('work_events', rows);
  (Array.isArray(saved) ? saved : [saved]).forEach(x => x?.id && gpush('pushEvent', { id: x.id }));
  closeModal(); HB.sel.clear();
  toast(todo.length > 1 ? `${todo.length} dias bloqueados. Já sumiram para os pacientes e vão para o Google Agenda.` : 'Bloqueado. Já sumiu para os pacientes e vai para o Google Agenda.', 'ok');
  await hbRefresh(false);
}

/* ---------- liberar ---------- */
async function hbRemoveBlocks(list) {
  for (const b of list) { await db.remove('work_events', b.id); if (b.google_event_id) gpush('deleteRemote', { google_event_id: b.google_event_id }); }
}
act('hbUnblock', async () => {
  const keys = [...HB.sel]; const list = HB.data.evs.filter(e => hbIsBlock(e) && keys.some(k => hbOverlap(e.starts_at, e.ends_at, k)));
  if (!list.length) return toast('Não há bloqueio nos dias selecionados.');
  if (!(await confirmBox(`Liberar ${list.length} bloqueio${list.length > 1 ? 's' : ''}? Os horários voltam a aparecer para os pacientes e saem do Google Agenda.`, 'Liberar'))) return;
  await hbRemoveBlocks(list); HB.sel.clear(); toast('Agenda liberada.', 'ok'); await hbRefresh(false);
});
act('hbDelBlock', async el => {
  const b = HB.data.evs.find(e => e.id === el.dataset.id); if (!b) return;
  await hbRemoveBlocks([b]); toast('Bloqueio retirado.', 'ok'); await hbRefresh();
});

/* ---------- prévia do paciente e Google ---------- */
function hbPreview(D) {
  if (D.slots === null) return html`<div class="card"><h2 style="margin:0">${icon('user')} O que o paciente vê</h2><p class="small muted">A página pública de agendamento está desligada (Configurações → Agendamento online). Os pacientes só marcam pela equipe.</p></div>`;
  const by = groupBy(D.slots, s => ymd(s.starts_at)); const allDays = Object.keys(by).sort(); const days = allDays.slice(0, 7);
  const url = `${location.origin}/#/agendar/${S.clinic.slug}`;
  return html`<div class="card"><div class="row between"><h2 style="margin:0">${icon('user')} O que o paciente vê</h2><a class="btn sm" href="${url}" target="_blank" rel="noopener">Abrir página</a></div>
    <p class="small muted" style="margin:6px 0 10px">Próximos dias com horário livre, do jeito que aparecem na página de agendamento e na área do paciente. Atualiza na hora.</p>
    ${days.length ? html`<div class="stack" style="gap:8px">${days.map(k => { const times = [...new Map(by[k].map(s => [s.starts_at, s])).values()]; return html`<div class="hb-prev"><b class="small">${fLong(parseYmd(k))}</b><div class="hb-times">${times.slice(0, 12).map(s => html`<span>${fTime(s.starts_at)}</span>`)}${times.length > 12 ? html`<span class="muted">+${times.length - 12}</span>` : ''}</div></div>`; })}${allDays.length > 7 ? html`<p class="tiny muted" style="margin:0">E mais ${allDays.length - 7} dia(s) com vaga nas duas semanas seguintes.</p>` : ''}</div>`
      : html`<div class="empty small">${icon('lock')}<div>Nenhum horário livre nos próximos 14 dias. Os pacientes não conseguem marcar com este profissional.</div></div>`}</div>`;
}
function hbGoogleBox() {
  return html`<div class="card small"><h3 style="margin:0 0 6px">${icon('globe')} Google Agenda</h3><p class="muted" style="margin:0">Cada bloqueio e cada consulta vai para o Google Agenda da clínica (${S.clinic.email || 'conta da clínica'}) em até 5 minutos. O que você marcar direto no Google com horário também bloqueia o PEPMH.</p>${isOwner() ? html`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="gsyncNow">${icon('repeat')} Ver última sincronização</button></div>` : ''}</div>`;
}
