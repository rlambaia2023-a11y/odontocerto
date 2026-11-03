/* ===== Locais de atendimento, compromissos externos, conflitos e Google da clínica ===== */
const PLACE_KIND = { hospital: 'Hospital', maternidade: 'Maternidade', clinica: 'Clínica', consultorio: 'Consultório', outro: 'Outro' };
const EV_KIND = { atendimento: 'Atendimento', plantao: 'Plantão', cirurgia: 'Cirurgia', parto: 'Parto', reuniao: 'Reunião', pessoal: 'Pessoal', outro: 'Outro', google: 'Google Agenda' };
const PLACE_COLORS = ['#7c3aed', '#0891b2', '#c2410c', '#be185d', '#15803d', '#4b5563'];

/* ---------- chamada ao servidor que fala com o Google da clínica ---------- */
async function gcall(action, extra = {}, retry = true) {
  if (isDemo()) return { ok: false, configured: false, demo: true };
  try {
    const r = await fetch(CFG.url + '/functions/v1/google', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + (LS.get('pepmh_auth')?.access_token || ''), 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    if (r.status === 401 && retry && await Auth.refresh()) return gcall(action, extra, false);
    const j = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, message: j.message || 'Erro ' + r.status };
    return j;
  } catch (e) { return { ok: false, message: e.message }; }
}
/* Envia ao Google sem travar a tela; só avisa se o Google estiver ligado e der erro */
function gpush(action, extra) { gcall(action, extra).then(r => { if (!r.ok && r.configured !== false && !r.demo && r.message) toast('Google Agenda: ' + r.message, 'bad'); }); }
async function gsyncMaybe(force = false) {
  if (isDemo() || S.mode !== 'staff') return false;
  const last = LS.get('pepmh_gsync_' + S.clinic.id) || 0; if (!force && Date.now() - last < 10 * 60000) return false;
  LS.set('pepmh_gsync_' + S.clinic.id, Date.now());
  const r = await gcall('sync'); return r.ok && (r.imported || r.removed) ? r : false;
}

/* ---------- carregamento para a agenda ---------- */
async function loadPlaces(pro) { return db.list('work_places', { ...(pro ? { eq: { professional_id: pro } } : {}), order: 'name' }); }
async function loadEvents(from, to, pro) {
  const q = { gte: { starts_at: new Date(+from - 864e5).toISOString() }, lt: { starts_at: to.toISOString() }, order: 'starts_at' }; if (pro) q.eq = { professional_id: pro };
  const [evs, places] = await Promise.all([db.list('work_events', q), db.list('work_places', { order: 'name' })]);
  const P = Object.fromEntries(places.map(p => [p.id, p]));
  return evs.filter(e => new Date(e.ends_at) > from).map(e => ({ ...e, place: P[e.place_id] || null }));
}
const evWhere = e => e.place ? e.place.name : (e.location || (e.source === 'google' ? 'Google Agenda' : ''));
function evCard(e) {
  const c = e.place?.color || (e.source === 'google' ? '#64748b' : '#7c3aed');
  return html`<div class="appt evx" style="border-left-color:${c};background:${c}14" data-act="editEvent" data-id="${e.id}"><div class="grow" style="min-width:0"><div class="t">${icon(e.source === 'google' ? 'globe' : 'building', 'small')}${fTime(e.starts_at)}–${fTime(e.ends_at)} ${e.title}</div><div class="tiny muted">${EV_KIND[e.kind] || ''}${evWhere(e) ? ' · ' + evWhere(e) : ''}${S.members.length > 1 ? ' · ' + proName(e.professional_id) : ''}</div></div></div>`;
}

/* ---------- conflitos de horário e de local ---------- */
/* Retorna o que choca com [start,end) para o profissional: sobreposição ("horario") ou tempo de deslocamento insuficiente ("local") */
async function findConflicts({ pro, start, end, placeId = null, online = false, ignoreAppt = null, ignoreEvent = null }) {
  start = new Date(start); end = new Date(end);
  const wFrom = new Date(+start - 6 * 3600e3), wTo = new Date(+end + 6 * 3600e3);
  const [aps, evs, places] = await Promise.all([
    db.list('appointments', { eq: { professional_id: pro }, lt: { starts_at: wTo.toISOString() }, gt: { ends_at: wFrom.toISOString() } }),
    db.list('work_events', { eq: { professional_id: pro }, lt: { starts_at: wTo.toISOString() }, gt: { ends_at: wFrom.toISOString() } }),
    db.list('work_places', {}),
  ]);
  const P = Object.fromEntries(places.map(p => [p.id, p]));
  const pm = await patientMap(aps.map(a => a.patient_id));
  const me = { loc: online ? null : (placeId || 'clinica'), travel: placeId ? (P[placeId]?.travel_min ?? 30) : 30 };
  const items = [
    ...aps.filter(a => a.id !== ignoreAppt && !['cancelado', 'faltou'].includes(a.status) && a.approval !== 'recusado').map(a => ({ type: 'Consulta', label: pm[a.patient_id]?.name || a.title || 'Paciente', s: new Date(a.starts_at), e: new Date(a.ends_at), loc: a.modality === 'online' ? null : 'clinica', where: a.modality === 'online' ? 'online' : S.clinic.name, travel: 30 })),
    ...evs.filter(e => e.id !== ignoreEvent).map(e => ({ type: EV_KIND[e.kind] || 'Compromisso', label: e.title, s: new Date(e.starts_at), e: new Date(e.ends_at), loc: e.place_id || (e.location ? 'txt:' + e.location.trim().toLowerCase() : null), where: P[e.place_id]?.name || e.location || (e.source === 'google' ? 'Google Agenda' : ''), travel: P[e.place_id]?.travel_min ?? 30 })),
  ];
  const out = [];
  for (const it of items) {
    if (it.s < end && it.e > start) { out.push({ ...it, why: 'horario' }); continue; }
    if (!me.loc || !it.loc || me.loc === it.loc) continue;
    const gap = it.s >= end ? (it.s - end) / 60000 : (start - it.e) / 60000; const need = Math.max(me.travel, it.travel);
    if (gap < need) out.push({ ...it, why: 'local', gap: Math.round(gap), need });
  }
  return out.sort((a, b) => a.s - b.s);
}
/* Mostra o alerta. Choque de horário bloqueia; pouco tempo entre locais permite confirmar. Retorna true se pode seguir. */
async function conflictGate(list) {
  if (!list.length) return true;
  const hard = list.filter(c => c.why === 'horario');
  const row = c => html`<div class="li small"><span class="pill ${c.why === 'horario' ? 'bad' : 'warn'}">${c.why === 'horario' ? 'mesmo horário' : `${c.gap} min p/ deslocar`}</span><span class="grow"><b>${c.type}: ${c.label}</b><span class="tiny muted"> ${fDate(c.s)} ${fTime(c.s)}–${fTime(c.e)}${c.where ? ' · ' + c.where : ''}</span></span></div>`;
  if (hard.length) {
    modal('Já existe um agendamento nesse horário', html`<div class="tip" style="border-color:var(--bad);margin-top:0">${icon('alarm')}<span>Esse horário choca com ${hard.length === 1 ? 'outro compromisso' : hard.length + ' compromissos'}. <b>Marque em outra data ou horário.</b></span></div><div class="list" style="margin-top:10px">${list.map(row)}</div>`, { footer: html`<button class="btn primary" data-act="closeModal">Escolher outro horário</button>` });
    return false;
  }
  return new Promise(res => {
    modal('Atenção: locais diferentes muito próximos', html`<div class="tip" style="border-color:var(--warn);margin-top:0">${icon('alarm')}<span>Não há tempo suficiente para sair de um local e chegar ao outro. O ideal é marcar em outra ocasião.</span></div><div class="list" style="margin-top:10px">${list.map(row)}</div>`,
      { footer: html`<button class="btn" data-act="cgNo">Escolher outro horário</button><button class="btn accent" data-act="cgYes">Marcar mesmo assim</button>` });
    ACT.cgYes = () => { closeModal(); res(true); }; ACT.cgNo = () => { closeModal(); res(false); };
  });
}

/* ---------- locais de atendimento ---------- */
act('managePlaces', async () => {
  const places = await loadPlaces(Auth.userId());
  modal('Meus locais de atendimento', html`<p class="small muted" style="margin-top:0">Hospitais, maternidades e outras clínicas onde você atende. Eles aparecem na sua agenda e o sistema avisa quando não dá tempo de ir de um lugar ao outro.</p>
    ${places.length ? html`<div class="list">${places.map(p => html`<div class="li"><span class="dotc" style="background:${p.color || '#7c3aed'}"></span><span class="grow"><span class="t">${p.name}${p.active ? '' : ' (inativo)'}</span><span class="tiny muted">${PLACE_KIND[p.kind]} · ${[p.address, p.city].filter(Boolean).join(', ') || 'sem endereço'} · ${p.travel_min} min de deslocamento</span></span><button class="btn sm" data-act="editPlace" data-id="${p.id}">${icon('edit')}</button></div>`)}</div>` : html`<div class="empty small">Nenhum local cadastrado.</div>`}
    <div class="row" style="margin-top:12px"><button class="btn primary" data-act="editPlace" data-id="">${icon('plus')} Novo local</button></div>`, { wide: true });
});
act('editPlace', async el => {
  const p = el.dataset.id ? await db.get('work_places', el.dataset.id) : { kind: 'hospital', travel_min: 30, color: PLACE_COLORS[0], active: true };
  modal(p.id ? 'Editar local' : 'Novo local de atendimento', html`<form data-form="savePlace" class="stack"><input type="hidden" name="id" value="${p.id || ''}">
    <div class="grid g2"><label class="f"><span>Nome <i>*</i></span><input class="in" name="name" required value="${p.name || ''}" placeholder="Ex.: Hospital Municipal de Muritiba"></label>
      <label class="f"><span>Tipo</span><select class="in" name="kind">${Object.entries(PLACE_KIND).map(([k, v]) => html`<option value="${k}" ${p.kind === k ? 'selected' : ''}>${v}</option>`)}</select></label></div>
    <div class="grid g2"><label class="f"><span>Endereço</span><input class="in" name="address" value="${p.address || ''}" placeholder="Rua, número, bairro"></label><label class="f"><span>Cidade/UF</span><input class="in" name="city" value="${p.city || ''}" placeholder="Cruz das Almas/BA"></label></div>
    <div class="grid g3"><label class="f"><span>Telefone</span><input class="in" name="phone" inputmode="tel" value="${p.phone || ''}"></label>
      <label class="f"><span>Deslocamento (min)</span><input class="in" name="travel_min" inputmode="numeric" value="${p.travel_min}"></label>
      <label class="f"><span>Cor na agenda</span><select class="in" name="color">${PLACE_COLORS.map(c => html`<option value="${c}" ${p.color === c ? 'selected' : ''} style="color:${c}">■ ${c}</option>`)}</select></label></div>
    <p class="tiny muted" style="margin:0">Deslocamento = tempo para chegar ou sair deste local. Usado no alerta de conflito entre locais.</p>
    <label class="f"><span>Observações</span><input class="in" name="notes" value="${p.notes || ''}"></label>
    <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Ativo</label>
    <div class="row between">${p.id ? html`<button type="button" class="btn danger" data-act="delPlace" data-id="${p.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`);
});
onForm('savePlace', async d => {
  const row = { name: d.name, kind: d.kind, address: nz(d.address), city: nz(d.city), phone: nz(d.phone), travel_min: Math.min(240, Math.max(0, parseInt(d.travel_min) || 0)), color: d.color, notes: nz(d.notes), active: !!d.active };
  if (d.id) await db.update('work_places', d.id, row); else await db.insert('work_places', { ...row, professional_id: Auth.userId() });
  toast('Local salvo.', 'ok'); ACT.managePlaces();
});
act('delPlace', async el => { if (await confirmBox('Excluir este local? Os compromissos já marcados continuam, sem o local.', 'Excluir')) { await db.remove('work_places', el.dataset.id); ACT.managePlaces(); } });

/* ---------- compromissos fora da clínica ---------- */
async function eventForm(e) {
  const places = (await loadPlaces(e.professional_id || Auth.userId())).filter(p => p.active || p.id === e.place_id);
  const s = e.starts_at ? new Date(e.starts_at) : null, en = e.ends_at ? new Date(e.ends_at) : null; const g = e.source === 'google';
  return html`<form data-form="saveEvent" class="stack"><input type="hidden" name="id" value="${e.id || ''}">
    ${g ? html`<div class="tip" style="margin:0">${icon('globe')}<span>Este evento veio do Google Agenda da clínica. Para mudar, altere lá; aqui ele serve para o sistema saber que você está ocupada.</span></div>` : ''}
    <div class="grid g2"><label class="f"><span>Título <i>*</i></span><input class="in" name="title" required value="${e.title || ''}" placeholder="Ex.: Plantão obstetrícia" ${g ? 'disabled' : ''}></label>
      <label class="f"><span>Tipo</span><select class="in" name="kind" ${g ? 'disabled' : ''}>${Object.entries(EV_KIND).filter(([k]) => k !== 'google' || g).map(([k, v]) => html`<option value="${k}" ${e.kind === k ? 'selected' : ''}>${v}</option>`)}</select></label></div>
    <label class="f"><span>Local</span><select class="in" name="place_id" ${g ? 'disabled' : ''}><option value="">Outro endereço / sem local</option>${places.map(p => html`<option value="${p.id}" ${e.place_id === p.id ? 'selected' : ''}>${p.name}${p.city ? ' – ' + p.city : ''}</option>`)}</select></label>
    <label class="f"><span>Endereço (se não for um local cadastrado)</span><input class="in" name="location" value="${e.location || ''}" ${g ? 'disabled' : ''}></label>
    <div class="grid g3"><label class="f"><span>Data <i>*</i></span><input class="in" type="date" name="date" required value="${s ? ymd(s) : e._date || ymd(new Date())}" ${g ? 'disabled' : ''}></label>
      <label class="f"><span>Início <i>*</i></span><input class="in" type="time" name="start" required value="${s ? fTime(s) : '07:00'}" ${g ? 'disabled' : ''}></label>
      <label class="f"><span>Fim <i>*</i></span><input class="in" type="time" name="end" required value="${en ? fTime(en) : '19:00'}" ${g ? 'disabled' : ''}></label></div>
    ${!e.id ? html`<label class="f"><span>Repetir toda semana</span><select class="in" name="repeat">${[1, 2, 4, 8, 12, 26].map(n => html`<option value="${n}">${n === 1 ? 'Não repetir' : n + ' semanas'}</option>`)}</select></label>` : ''}
    <label class="f"><span>Observações</span><input class="in" name="notes" value="${e.notes || ''}" ${g ? 'disabled' : ''}></label>
    <p class="tiny muted" style="margin:0">Se o fim for antes do início (ex.: plantão 19:00–07:00), o sistema entende que termina no dia seguinte.</p>
    <div class="row between">${e.id && !g ? html`<button type="button" class="btn danger" data-act="delEvent" data-id="${e.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}${!g ? html`<button class="btn primary" type="submit">Salvar</button>` : ''}</div></form>`;
}
act('newEvent', async el => modal('Compromisso fora da clínica', await eventForm({ _date: el.dataset.date, kind: 'atendimento' }), { wide: true }));
act('editEvent', async el => { const e = await db.get('work_events', el.dataset.id); if (e) modal(e.source === 'google' ? 'Evento do Google Agenda' : 'Compromisso', await eventForm(e), { wide: true }); });
onForm('saveEvent', async d => {
  const s0 = new Date(`${d.date}T${d.start}`); let e0 = new Date(`${d.date}T${d.end}`); if (e0 <= s0) e0 = addDays(e0, 1);
  if ((e0 - s0) > 36 * 3600e3) throw new Error('Compromisso longo demais (máx. 36 h).');
  const old = d.id ? await db.get('work_events', d.id) : null; const pro = old?.professional_id || Auth.userId();
  const n = d.id ? 1 : Math.max(1, +d.repeat || 1); const series = n > 1 ? uid() : null; const rows = [];
  for (let i = 0; i < n; i++) {
    const s = addDays(s0, 7 * i), e = addDays(e0, 7 * i);
    const c = await findConflicts({ pro, start: s, end: e, placeId: nz(d.place_id), online: false, ignoreEvent: d.id || null });
    if (c.length) { if (n > 1) toast(`Conflito na semana ${i + 1} (${fDate(s)}).`, 'bad'); if (!(await conflictGate(c))) return; }
    rows.push({ title: d.title, kind: d.kind, place_id: nz(d.place_id), location: nz(d.location), notes: nz(d.notes), starts_at: s.toISOString(), ends_at: e.toISOString(), professional_id: pro, series_id: series });
  }
  let saved;
  if (d.id) { saved = [await db.update('work_events', d.id, rows[0]) || { id: d.id }]; } else saved = await db.insert('work_events', rows);
  closeModal(); toast(n > 1 ? `${n} compromissos salvos.` : 'Compromisso salvo.', 'ok');
  (Array.isArray(saved) ? saved : [saved]).forEach(x => x?.id && gpush('pushEvent', { id: x.id }));
  router();
});
act('delEvent', async el => {
  const e = await db.get('work_events', el.dataset.id); const sib = e.series_id ? (await db.list('work_events', { eq: { series_id: e.series_id }, gte: { starts_at: e.starts_at } })) : [e];
  const all = sib.length > 1 && await confirmBox(`Este compromisso se repete. Excluir também os próximos ${sib.length - 1}?`, 'Excluir todos'); const list = all ? sib : [e];
  if (!all && !(await confirmBox('Excluir este compromisso?', 'Excluir'))) return;
  for (const x of list) { await db.remove('work_events', x.id); if (x.google_event_id) gpush('deleteRemote', { google_event_id: x.google_event_id }); }
  closeModal(); toast('Compromisso excluído.'); router();
});
act('gsyncNow', async el => { el.disabled = true; const r = await gcall('sync'); el.disabled = false; if (r.ok) { toast(`Google Agenda atualizado (${r.imported} eventos).`, 'ok'); router(); } else toast(r.configured === false ? 'O Google da clínica ainda não está conectado (Configurações → Google da clínica).' : 'Google: ' + (r.message || 'falhou'), 'bad'); });

/* ---------- configurações: Google da clínica ---------- */
async function googleCard() {
  const [g] = isDemo() ? [null] : await db.list('clinic_integrations', { eq: { clinic_id: S.clinic.id } }).catch(() => []);
  return html`<div class="card" id="sec-google" style="grid-column:1/-1"><h2>${icon('globe')} Google da clínica (Agenda, Gmail e Drive)</h2>
    <p class="small muted">Liga o PEPMH à conta Google da clínica: as consultas e compromissos vão para o Google Agenda, os eventos que já estão no Google bloqueiam a agenda, os avisos de acompanhamento chegam por e-mail e as fotos dos pacientes ficam guardadas no Drive.</p>
    ${g?.gas_url ? html`<p class="small"><span class="pill ok">conectado</span> ${g.last_sync_at ? 'Última sincronização: ' + fDT(g.last_sync_at) : ''}</p>` : html`<p class="small"><span class="pill warn">não conectado</span></p>`}
    <ol class="small" style="padding-left:18px;line-height:1.7">
      <li>Entre em <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> com a conta <b>${S.clinic.email || 'da clínica'}</b> e crie um projeto novo.</li>
      <li>Apague o que vier escrito e cole o código abaixo (ele já leva o código secreto desta clínica).</li>
      <li>Clique em <b>Implantar → Nova implantação → App da Web</b>. Executar como: <b>Eu</b>. Quem pode acessar: <b>Qualquer pessoa</b>. Autorize.</li>
      <li>Copie o endereço que termina em <b>/exec</b> e cole aqui embaixo.</li></ol>
    <div class="row"><button class="btn" data-act="gasCode">${icon('clip')} ${g?.gas_secret ? 'Ver o código do script' : 'Gerar o código do script'}</button></div>
    <form data-form="saveGoogle" class="stack" style="margin-top:12px"><label class="f"><span>Endereço do script (termina em /exec)</span><input class="in" name="gas_url" value="${g?.gas_url || ''}" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <div class="grid g2"><label class="f"><span>E-mail que recebe os avisos</span><input class="in" type="email" name="notify_email" value="${g?.notify_email || S.clinic.email || ''}"></label>
      <label class="check" style="align-self:end"><input type="checkbox" name="calendar_sync" ${!g || g.calendar_sync ? 'checked' : ''}> Sincronizar com o Google Agenda</label></div>
      <div class="row"><button class="btn primary" type="submit">Salvar</button>${g?.gas_url ? html`<button type="button" class="btn" data-act="gasTest">Testar conexão</button><button type="button" class="btn" data-act="gsyncNow">Sincronizar agora</button>` : ''}</div></form>
    ${g?.last_error ? html`<p class="tiny" style="color:var(--bad)">${g.last_error}</p>` : ''}</div>`;
}
const randSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
act('gasCode', async () => {
  if (isDemo()) { toast('Disponível na clínica real.'); return; }
  let [g] = await db.list('clinic_integrations', { eq: { clinic_id: S.clinic.id } });
  if (!g?.gas_secret) { const sec = randSecret(); g = g ? await db.updateWhere('clinic_integrations', { clinic_id: S.clinic.id }, { gas_secret: sec }) : await B().insert('clinic_integrations', { clinic_id: S.clinic.id, gas_secret: sec, notify_email: S.clinic.email || null }); }
  const code = GAS_CODE.replace('__PEPMH_SECRET__', g.gas_secret);
  modal('Código do script do Google', html`<p class="small muted" style="margin-top:0">Cole tudo no editor do Google Apps Script (arquivo Código.gs). Não compartilhe: ele contém a chave desta clínica.</p><textarea class="in" rows="14" readonly style="font-family:monospace;font-size:12px">${code}</textarea><div class="row" style="margin-top:10px"><button class="btn primary" data-act="copyText" data-t="${code}">${icon('clip')} Copiar código</button><a class="btn" target="_blank" rel="noopener" href="https://script.google.com/home/projects/create">Abrir o Google Apps Script</a></div>`, { wide: true });
});
onForm('saveGoogle', async d => {
  if (d.gas_url && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(d.gas_url)) throw new Error('O endereço precisa ser do tipo https://script.google.com/macros/s/…/exec');
  const row = { gas_url: nz(d.gas_url), notify_email: nz(d.notify_email), calendar_sync: !!d.calendar_sync, updated_at: new Date().toISOString() };
  const [g] = await db.list('clinic_integrations', { eq: { clinic_id: S.clinic.id } });
  if (g) await db.updateWhere('clinic_integrations', { clinic_id: S.clinic.id }, row); else await B().insert('clinic_integrations', { clinic_id: S.clinic.id, gas_secret: randSecret(), ...row });
  toast('Salvo.', 'ok');
  if (row.gas_url) { const r = await gcall('status'); if (r.ok) toast(`Conectado à conta ${r.email}.`, 'ok'); else toast('Salvo, mas o teste falhou: ' + (r.message || ''), 'bad'); }
  router();
});
act('gasTest', async el => { el.disabled = true; const r = await gcall('status'); el.disabled = false; if (r.ok) toast(`Tudo certo: conta ${r.email}, agenda "${r.calendar}".`, 'ok'); else toast('Falhou: ' + (r.message || ''), 'bad'); });
