/* ===== Emagrecimento: acompanhamento com tirzepatida (antigo TirzTracker) ===== */
const WDOSES = ['2,5 mg', '5 mg', '7,5 mg', '10 mg', '12,5 mg', '15 mg'];
const WSITES = ['Abdômen', 'Coxa direita', 'Coxa esquerda', 'Braço direito', 'Braço esquerdo'];
const PAYST = { pago: ['ok', 'Em dia'], pendente: ['warn', 'Pendente'], atrasado: ['bad', 'Atrasada'] };
const kg = v => v == null || v === '' ? '—' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg';
const num1 = v => (+v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const normDose = d => { d = String(d || '').trim(); if (!d) return ''; const v = d.toLowerCase().replace(/\s/g, '').replace('.', ',').replace(/mg$/, ''); return /^\d+(,\d+)?$/.test(v) ? v.replace(/,0$/, '') + ' mg' : d; };
const addMonths = (s, n) => { const d = parseYmd(s); const day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < day) d.setDate(0); return ymd(d); };

function payState(t) {
  const T = ymd(new Date());
  if (t.data_vencimento && t.data_vencimento < T) return 'atrasado';
  if (t.status_pagamento === 'atrasado') return 'atrasado';
  return t.status_pagamento === 'pago' ? 'pago' : 'pendente';
}
function appState(t) {
  if (!t.proxima_aplicacao) return null; const T = ymd(new Date());
  if (t.proxima_aplicacao < T) return ['bad', 'atrasada desde ' + fDate(t.proxima_aplicacao)];
  if (t.proxima_aplicacao === T) return ['accent', 'hoje'];
  if (t.proxima_aplicacao === ymd(addDays(new Date(), 1))) return ['warn', 'amanhã'];
  return ['gray', fDate(t.proxima_aplicacao)];
}
function weightStats(t, logs) {
  const ls = [...logs].sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : String(a.created_at) < String(b.created_at) ? -1 : 1);
  const ini = t?.peso_inicial != null ? +t.peso_inicial : ls.length ? +ls[0].peso : null;
  const cur = ls.length ? +ls[ls.length - 1].peso : ini;
  const lost = ini != null && cur != null ? ini - cur : null;
  const imc = t?.altura && cur ? cur / (t.altura * t.altura) : null;
  return { ini, cur, lost, pct: lost != null && ini ? lost / ini * 100 : null, imc, logs: ls };
}
const lostPill = s => s.lost == null || s.lost === 0 ? '' : html`<span class="pill ${s.lost > 0 ? 'ok' : 'warn'}">${s.lost > 0 ? '−' : '+'}${num1(Math.abs(s.lost))} kg</span>`;
const imcLabel = v => v < 18.5 ? 'abaixo do peso' : v < 25 ? 'peso adequado' : v < 30 ? 'sobrepeso' : v < 35 ? 'obesidade grau I' : v < 40 ? 'obesidade grau II' : 'obesidade grau III';

/* Gráfico de peso em SVG (sem bibliotecas) */
function weightChart(logs, meta) {
  const pts = logs.filter(l => l.peso != null).map(l => ({ x: +parseYmd(l.data), y: +l.peso, d: l.data }));
  if (pts.length < 2) return html`<div class="empty small muted" style="padding:22px 0">${pts.length ? 'Registre mais um peso para ver a curva.' : 'Nenhum peso registrado ainda.'}</div>`;
  const W = 900, H = 260, L = 44, R = 16, T = 14, Bm = 28;
  const ys = pts.map(p => p.y).concat(meta ? [+meta] : []); let y0 = Math.floor(Math.min(...ys) - 2), y1 = Math.ceil(Math.max(...ys) + 2);
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x === x0 ? x0 + 864e5 : pts[pts.length - 1].x;
  const sx = x => L + (x - x0) / (x1 - x0) * (W - L - R), sy = y => T + (y1 - y) / (y1 - y0) * (H - T - Bm);
  const step = Math.max(1, Math.ceil((y1 - y0) / 5)); const ticks = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks.push(v);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
  const area = path + ` L${sx(pts[pts.length - 1].x).toFixed(1)} ${H - Bm} L${sx(pts[0].x).toFixed(1)} ${H - Bm} Z`;
  const lbl = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]].filter((p, i, a) => a.indexOf(p) === i);
  return raw(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do peso" style="width:100%;height:auto;display:block">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`).join('')}
    ${meta ? `<line x1="${L}" x2="${W - R}" y1="${sy(+meta)}" y2="${sy(+meta)}" stroke="var(--ok)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - R}" y="${sy(+meta) - 5}" text-anchor="end" font-size="11" fill="var(--ok)">meta ${esc(num1(meta))} kg</text>` : ''}
    <path d="${area}" fill="var(--brand)" opacity=".08"/><path d="${path}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p => `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3.5" fill="var(--card,#fff)" stroke="var(--brand)" stroke-width="2"><title>${fDate(p.d)}: ${esc(num1(p.y))} kg</title></circle>`).join('')}
    ${lbl.map((p, i) => `<text x="${sx(p.x).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === lbl.length - 1 ? 'end' : 'middle'}" font-size="11" fill="var(--ink-3)">${fDate(p.d).slice(0, 5)}</text>`).join('')}
  </svg>`);
}

const reminderText = (p, t) => {
  const first = p.name.split(' ')[0]; const T = ymd(new Date());
  const when = !t.proxima_aplicacao ? 'em breve' : t.proxima_aplicacao === T ? 'hoje' : t.proxima_aplicacao < T ? `desde ${fDate(t.proxima_aplicacao)}` : `em ${fDate(t.proxima_aplicacao)}`;
  return `Olá, ${first}! Aqui é da ${S.clinic.name}. Passando para lembrar da sua aplicação de ${t.medication || 'tirzepatida'}${t.dose_atual ? ' (' + t.dose_atual + ')' : ''}, prevista ${when}. Qualquer dúvida, é só responder por aqui. 💚`;
};
const payText = (p, t) => `Olá, ${p.name.split(' ')[0]}! Aqui é da ${S.clinic.name}. A mensalidade do seu acompanhamento${t.valor_mensalidade ? ' (' + BRL(t.valor_mensalidade) + ')' : ''}${t.data_vencimento ? ' vence em ' + fDate(t.data_vencimento) : ' está em aberto'}. Se já pagou, desconsidere. Obrigada!`;

/* ---------- Página geral ---------- */
route('/emagrecimento', async (_, q) => {
  const f = q.get('f') || 'ativos';
  const [trs, pats, logs, stock] = await Promise.all([
    db.list('weight_treatments', { order: 'proxima_aplicacao' }),
    db.list('patients', { select: 'id,name,phone,active', order: 'name' }),
    db.list('weight_logs', { select: 'patient_id,data,peso,created_at', order: 'data' }),
    db.list('stock_items', { ilike: { name: 'tirzepatida*' }, order: 'name' }),
  ]);
  const P = Object.fromEntries(pats.map(p => [p.id, p])); const LG = groupBy(logs, l => l.patient_id);
  const rows = trs.filter(t => P[t.patient_id]).map(t => ({ t, p: P[t.patient_id], s: weightStats(t, LG[t.patient_id] || []), pay: payState(t), ap: appState(t) }));
  const T = ymd(new Date()); const act_ = rows.filter(r => r.t.ativo);
  const due = act_.filter(r => r.t.proxima_aplicacao && r.t.proxima_aplicacao <= T);
  const late = act_.filter(r => r.pay === 'atrasado');
  const lostTotal = sum(act_, r => r.s.lost > 0 ? r.s.lost : 0);
  const list = f === 'hoje' ? due : f === 'pagamento' ? late : f === 'inativos' ? rows.filter(r => !r.t.ativo) : f === 'todos' ? rows : act_;
  const days = Array.from({ length: 14 }, (_, i) => ymd(addDays(new Date(), i)));
  const byDay = groupBy(act_.filter(r => r.t.proxima_aplicacao >= T && r.t.proxima_aplicacao <= days[13]), r => r.t.proxima_aplicacao);
  const lowStock = stock.filter(i => +i.quantity <= +i.min_quantity);
  return html`<div class="pagehead"><div><h1>Emagrecimento</h1><div class="muted small">Acompanhamento com tirzepatida: doses, peso, aplicações e mensalidades.</div></div>
    <div class="row"><button class="btn" data-act="wReminders">${icon('wa')} Lembretes do dia</button><button class="btn primary" data-act="wNew">${icon('plus')} Novo acompanhamento</button></div></div>
  <div class="grid g4">
    <div class="card kpi"><div class="l">Em tratamento</div><div class="v">${act_.length}</div></div>
    <div class="card kpi"><div class="l">Aplicações hoje ou atrasadas</div><div class="v" style="color:${due.length ? 'var(--warn)' : 'inherit'}">${due.length}</div></div>
    <div class="card kpi"><div class="l">Mensalidades atrasadas</div><div class="v" style="color:${late.length ? 'var(--bad)' : 'inherit'}">${late.length}</div></div>
    <div class="card kpi"><div class="l">Peso perdido (total)</div><div class="v">${num1(lostTotal)} kg</div></div>
  </div>
  <div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">Próximas aplicações · 14 dias</h3><span class="tiny muted">${due.length ? due.length + ' para hoje ou em atraso' : 'nada em atraso'}</span></div>
    <div class="wcal">${days.map(d => { const it = byDay[d] || []; const dt = parseYmd(d); return html`<div class="wday ${d === T ? 'today' : ''} ${it.length ? 'has' : ''}" title="${it.map(r => r.p.name).join(', ')}"><span class="tiny">${WD[dt.getDay()].slice(0, 3)}</span><b>${dt.getDate()}</b><span class="tiny">${it.length ? it.length + ' apl.' : '—'}</span></div>`; })}</div></div>
  ${stock.length ? html`<div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">Estoque de tirzepatida</h3><a class="small" href="#/estoque">Abrir estoque</a></div>
    <div class="row" style="margin-top:10px;gap:8px">${stock.map(i => html`<span class="pill ${+i.quantity <= +i.min_quantity ? 'bad' : 'ok'}">${i.name.replace(/^Tirzepatida /i, '')}: ${(+i.quantity).toLocaleString('pt-BR')}</span>`)}</div>
    ${lowStock.length ? html`<p class="tiny" style="color:var(--bad);margin:8px 0 0">Abaixo do mínimo: ${lowStock.map(i => i.name.replace(/^Tirzepatida /i, '')).join(', ')}.</p>` : ''}</div>` : ''}
  <div class="row between" style="margin:16px 0 10px;gap:10px">
    <div class="seg">${[['ativos', 'Em tratamento'], ['hoje', 'Aplicar hoje'], ['pagamento', 'Mensalidade atrasada'], ['inativos', 'Encerrados'], ['todos', 'Todos']].map(([k, l]) => html`<a class="${f === k ? 'on' : ''}" href="#/emagrecimento?f=${k}">${l}</a>`)}</div>
    <input class="in" style="max-width:260px" placeholder="Buscar paciente…" data-input="wFilter" aria-label="Buscar paciente">
  </div>
  ${list.length ? html`<div class="tblwrap"><table class="tbl" id="wtbl"><tr><th>Paciente</th><th>Dose</th><th class="hide-m">Peso</th><th>Próxima aplicação</th><th class="hide-m">Mensalidade</th><th></th></tr>
    ${list.map(({ t, p, s, pay, ap }) => html`<tr data-n="${p.name.toLowerCase()}"><td><a href="#/paciente/${p.id}?tab=emagrecimento"><b>${p.name}</b></a>${(p.tags || []).includes('conferir CPF') ? html` <span class="pill warn">conferir CPF</span>` : ''}<div class="tiny muted">${t.data_inicio ? 'desde ' + fDate(t.data_inicio) : ''}${p.phone ? ' · ' + fPhone(p.phone) : ''}</div></td>
      <td><b>${t.dose_atual || '—'}</b><div class="tiny muted">a cada ${t.frequencia_dias || 7} dias</div></td>
      <td class="hide-m small">${kg(s.ini)} → <b>${kg(s.cur)}</b> ${lostPill(s)}</td>
      <td>${ap ? html`<span class="pill ${ap[0]}">${ap[1]}</span>` : html`<span class="tiny muted">—</span>`}</td>
      <td class="hide-m"><span class="pill ${PAYST[pay][0]}">${PAYST[pay][1]}</span><div class="tiny muted">${t.valor_mensalidade ? BRL(t.valor_mensalidade) : ''}${t.data_vencimento ? ' · vence ' + fDate(t.data_vencimento) : ''}</div></td>
      <td class="num" style="white-space:nowrap">${p.phone && t.lembrete_ativo ? html`<a class="btn sm" target="_blank" rel="noopener" title="Lembrete no WhatsApp" href="${waLink(p.phone, pay === 'atrasado' && !ap?.[0]?.match(/bad|accent/) ? payText(p, t) : reminderText(p, t))}">${icon('wa')}</a> ` : ''}<button class="btn sm ok" data-act="wDose" data-p="${p.id}" title="Registrar aplicação">${icon('check')}</button> <button class="btn sm" data-act="wWeight" data-p="${p.id}" title="Registrar peso">${icon('chart')}</button></td></tr>`)}</table></div>`
    : html`<div class="card empty">${icon('chart')}<div>${f === 'hoje' ? 'Nenhuma aplicação para hoje.' : f === 'pagamento' ? 'Nenhuma mensalidade atrasada.' : 'Nenhum paciente aqui.'}</div></div>`}`;
}, 'emagrecimento');
onInput('wFilter', el => { const v = el.value.trim().toLowerCase(); document.querySelectorAll('#wtbl tr[data-n]').forEach(tr => { tr.style.display = !v || tr.dataset.n.includes(v) ? '' : 'none'; }); });

act('wReminders', async () => {
  const T = ymd(new Date()), TM = ymd(addDays(new Date(), 1));
  const [trs, pats] = await Promise.all([db.list('weight_treatments', { eq: { ativo: true, lembrete_ativo: true }, lte: { proxima_aplicacao: TM }, order: 'proxima_aplicacao' }), db.list('patients', { select: 'id,name,phone' })]);
  const P = Object.fromEntries(pats.map(p => [p.id, p])); const it = trs.filter(t => P[t.patient_id]);
  modal('Lembretes de aplicação', it.length ? html`<p class="small muted" style="margin-top:0">Atrasadas, de hoje e de amanhã. Cada botão abre o WhatsApp com a mensagem pronta.</p><div class="list">${it.map(t => { const p = P[t.patient_id], ap = appState(t); return html`<div class="li"><span class="grow"><span class="t">${p.name}</span><span class="tiny muted">${t.dose_atual || ''}</span></span><span class="pill ${ap[0]}">${ap[1]}</span>${p.phone ? html`<a class="btn sm primary" target="_blank" rel="noopener" href="${waLink(p.phone, reminderText(p, t))}">${icon('wa')} Enviar</a>` : html`<span class="tiny muted">sem telefone</span>`}</div>`; })}</div>` : html`<div class="empty">Nenhuma aplicação atrasada, hoje ou amanhã.</div>`, { wide: true });
});

act('wNew', async () => {
  const [pats, trs] = await Promise.all([db.list('patients', { eq: { active: true }, select: 'id,name', order: 'name' }), db.list('weight_treatments', { select: 'patient_id' })]);
  const has = new Set(trs.map(t => t.patient_id)); const free = pats.filter(p => !has.has(p.id));
  modal('Novo acompanhamento', html`<form data-form="wStartPick" class="stack"><label class="f"><span>Paciente <i>*</i></span><select class="in" name="patient_id" required><option value="">Escolha…</option>${free.map(p => html`<option value="${p.id}">${p.name}</option>`)}</select></label><p class="tiny muted" style="margin:0">Paciente novo? Cadastre primeiro em Pacientes e volte aqui.</p><button class="btn primary" type="submit">Continuar</button></form>`);
});
onForm('wStartPick', async d => { if (!d.patient_id) throw new Error('Escolha o paciente.'); closeModal(); go(`#/paciente/${d.patient_id}?tab=emagrecimento&novo=1`); });

/* ---------- Aba do prontuário ---------- */
function wTreatForm(p, t) {
  t = t || { medication: 'Tirzepatida', frequencia_dias: 7, data_inicio: ymd(new Date()), status_pagamento: 'pendente', ativo: true, lembrete_ativo: true };
  const v = x => x == null ? '' : String(x).replace('.', ',');
  return html`<form data-form="wSaveTreat" class="stack"><input type="hidden" name="id" value="${t.id || ''}"><input type="hidden" name="patient_id" value="${p.id}">
    <div class="grid g3"><label class="f"><span>Medicação</span><input class="in" name="medication" value="${t.medication || 'Tirzepatida'}"></label>
      <label class="f"><span>Dose inicial</span><input class="in" name="dose_inicial" list="wdoses" value="${t.dose_inicial || ''}" placeholder="2,5 mg"></label>
      <label class="f"><span>Dose atual</span><input class="in" name="dose_atual" list="wdoses" value="${t.dose_atual || ''}" placeholder="2,5 mg"></label></div>
    <datalist id="wdoses">${WDOSES.map(x => html`<option>${x}</option>`)}</datalist>
    <div class="grid g3"><label class="f"><span>Início</span><input class="in" type="date" name="data_inicio" value="${t.data_inicio || ''}"></label>
      <label class="f"><span>Aplicar a cada (dias)</span><input class="in" name="frequencia_dias" inputmode="numeric" value="${t.frequencia_dias || 7}"></label>
      <label class="f"><span>Próxima aplicação</span><input class="in" type="date" name="proxima_aplicacao" value="${t.proxima_aplicacao || ''}"></label></div>
    <div class="grid g3"><label class="f"><span>Peso inicial (kg)</span><input class="in" name="peso_inicial" inputmode="decimal" value="${v(t.peso_inicial)}"></label>
      <label class="f"><span>Meta (kg)</span><input class="in" name="peso_meta" inputmode="decimal" value="${v(t.peso_meta)}"></label>
      <label class="f"><span>Altura (m)</span><input class="in" name="altura" inputmode="decimal" value="${v(t.altura)}" placeholder="1,65"></label></div>
    <div class="grid g3"><label class="f"><span>Mensalidade (R$)</span><input class="in" name="valor_mensalidade" inputmode="decimal" value="${v(t.valor_mensalidade)}"></label>
      <label class="f"><span>Vencimento</span><input class="in" type="date" name="data_vencimento" value="${t.data_vencimento || ''}"></label>
      <label class="f"><span>Situação</span><select class="in" name="status_pagamento">${[['pendente', 'Pendente'], ['pago', 'Pago'], ['atrasado', 'Atrasado']].map(([k, l]) => html`<option value="${k}" ${t.status_pagamento === k ? 'selected' : ''}>${l}</option>`)}</select></label></div>
    <label class="f"><span>Observações</span><textarea class="in" name="observacoes" rows="2">${t.observacoes || ''}</textarea></label>
    <div class="row"><label class="check"><input type="checkbox" name="ativo" ${t.ativo ? 'checked' : ''}> Em tratamento</label><label class="check"><input type="checkbox" name="lembrete_ativo" ${t.lembrete_ativo ? 'checked' : ''}> Enviar lembretes</label></div>
    <button class="btn primary" type="submit">Salvar</button></form>`;
}
onForm('wSaveTreat', async d => {
  const n = k => { if (d[k] === '') return null; const x = parseMoney(d[k]); if (!isFinite(x)) throw new Error('Confira os números.'); return x; };
  let alt = n('altura'); if (alt > 3) alt = alt / 100;
  const row = { patient_id: d.patient_id, medication: d.medication || 'Tirzepatida', dose_inicial: nz(normDose(d.dose_inicial)), dose_atual: nz(normDose(d.dose_atual || d.dose_inicial)), data_inicio: nz(d.data_inicio), frequencia_dias: Math.max(1, Math.round(n('frequencia_dias') || 7)), proxima_aplicacao: nz(d.proxima_aplicacao), peso_inicial: n('peso_inicial'), peso_meta: n('peso_meta'), altura: alt, valor_mensalidade: n('valor_mensalidade'), data_vencimento: nz(d.data_vencimento), status_pagamento: d.status_pagamento, observacoes: nz(d.observacoes), ativo: !!d.ativo, lembrete_ativo: !!d.lembrete_ativo };
  if (row.peso_inicial != null && (row.peso_inicial < 20 || row.peso_inicial > 400)) throw new Error('Peso inicial fora do esperado.');
  if (d.id) await db.update('weight_treatments', d.id, row);
  else {
    await db.insert('weight_treatments', row);
    if (row.peso_inicial != null) await db.insert('weight_logs', { patient_id: d.patient_id, data: row.data_inicio || ymd(new Date()), peso: row.peso_inicial, observacao: 'Peso inicial' });
    if (!(await db.get('patients', d.patient_id))?.tags?.includes('emagrecimento')) { const pt = await db.get('patients', d.patient_id); await db.update('patients', d.patient_id, { tags: [...(pt.tags || []), 'emagrecimento'] }); }
  }
  closeModal(); toast('Acompanhamento salvo.', 'ok'); go(`#/paciente/${d.patient_id}?tab=emagrecimento`);
});

TABRENDER.emagrecimento = async (p, q) => {
  const [tr] = await db.list('weight_treatments', { eq: { patient_id: p.id }, limit: 1 });
  if (!tr) return html`<div class="card"><h2>Emagrecimento</h2><p class="muted small">${p.name.split(' ')[0]} ainda não tem acompanhamento de emagrecimento. Preencha para começar.</p>${wTreatForm(p)}</div>`;
  const [logs, doses] = await Promise.all([db.list('weight_logs', { eq: { patient_id: p.id }, order: 'data.desc,created_at.desc' }), db.list('dose_logs', { eq: { patient_id: p.id }, order: 'data_aplicacao.desc,created_at.desc' })]);
  const s = weightStats(tr, logs); const pay = payState(tr); const ap = appState(tr);
  const toMeta = tr.peso_meta && s.cur ? s.cur - tr.peso_meta : null;
  return html`<div class="grid g4">
    <div class="card kpi"><div class="l">Peso atual</div><div class="v">${kg(s.cur)}</div><div class="tiny muted">início ${kg(s.ini)}</div></div>
    <div class="card kpi"><div class="l">Perdeu</div><div class="v" style="color:${s.lost > 0 ? 'var(--ok)' : 'inherit'}">${s.lost != null ? num1(s.lost) + ' kg' : '—'}</div><div class="tiny muted">${s.pct != null ? num1(s.pct) + '% do peso inicial' : ''}</div></div>
    <div class="card kpi"><div class="l">IMC</div><div class="v">${s.imc ? num1(s.imc) : '—'}</div><div class="tiny muted">${s.imc ? imcLabel(s.imc) : 'informe a altura'}</div></div>
    <div class="card kpi"><div class="l">Meta</div><div class="v">${kg(tr.peso_meta)}</div><div class="tiny muted">${toMeta != null ? toMeta > 0 ? 'faltam ' + num1(toMeta) + ' kg' : 'meta alcançada 🎉' : ''}</div></div></div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card"><div class="row between"><h2 style="margin:0">Tratamento</h2><button class="btn sm" data-act="wEditTreat" data-id="${tr.id}" data-p="${p.id}">${icon('edit')} Editar</button></div>
      <div class="list" style="margin-top:10px">
        <div class="li"><span class="grow">Medicação</span><b>${tr.medication || 'Tirzepatida'}</b></div>
        <div class="li"><span class="grow">Dose atual</span><b>${tr.dose_atual || '—'}</b>${tr.dose_inicial && tr.dose_inicial !== tr.dose_atual ? html`<span class="tiny muted">começou com ${tr.dose_inicial}</span>` : ''}</div>
        <div class="li"><span class="grow">Frequência</span><b>a cada ${tr.frequencia_dias || 7} dias</b></div>
        <div class="li"><span class="grow">Próxima aplicação</span>${ap ? html`<span class="pill ${ap[0]}">${ap[1]}</span>` : '—'}</div>
        <div class="li"><span class="grow">Início</span><span>${tr.data_inicio ? fDate(tr.data_inicio) : '—'}</span></div>
        <div class="li"><span class="grow">Situação</span><span class="pill ${tr.ativo ? 'ok' : 'gray'}">${tr.ativo ? 'em tratamento' : 'encerrado'}</span></div>
      </div>
      ${tr.observacoes ? html`<p class="small" style="white-space:pre-wrap;margin:10px 0 0">${tr.observacoes}</p>` : ''}
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="wDose" data-p="${p.id}">${icon('check')} Registrar aplicação</button>${p.phone ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(p.phone, reminderText(p, tr))}">${icon('wa')} Lembrete</a>` : ''}</div></div>
    <div class="card"><div class="row between"><h2 style="margin:0">Mensalidade</h2><span class="pill ${PAYST[pay][0]}">${PAYST[pay][1]}</span></div>
      <div class="list" style="margin-top:10px"><div class="li"><span class="grow">Valor</span><b>${tr.valor_mensalidade ? BRL(tr.valor_mensalidade) : '—'}</b></div><div class="li"><span class="grow">Vencimento</span><span>${tr.data_vencimento ? fDate(tr.data_vencimento) : '—'}</span></div></div>
      <div class="row" style="margin-top:12px"><button class="btn ok" data-act="wPay" data-id="${tr.id}" data-p="${p.id}">${icon('money')} Registrar pagamento</button>${p.phone && pay !== 'pago' ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(p.phone, payText(p, tr))}">${icon('wa')} Cobrar</a>` : ''}</div>
      <p class="tiny muted" style="margin-bottom:0">O pagamento entra no Financeiro e o próximo vencimento passa para o mês seguinte.</p></div></div>
  <div class="card" style="margin-top:14px"><div class="row between"><h2 style="margin:0">Evolução do peso</h2><button class="btn sm primary" data-act="wWeight" data-p="${p.id}">${icon('plus')} Registrar peso</button></div><div style="margin-top:10px">${weightChart(s.logs, tr.peso_meta)}</div></div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card"><h3 style="margin-top:0">Pesagens</h3>${logs.length ? html`<div class="list">${logs.map((l, i) => { const prev = logs[i + 1]; const dlt = prev ? l.peso - prev.peso : null; return html`<div class="li small"><span class="grow"><b>${kg(l.peso)}</b> ${dlt ? html`<span class="tiny" style="color:${dlt < 0 ? 'var(--ok)' : 'var(--warn)'}">${dlt < 0 ? '−' : '+'}${num1(Math.abs(dlt))}</span>` : ''}<span class="tiny muted"> ${[l.cintura_cm ? 'cintura ' + num1(l.cintura_cm) + ' cm' : '', l.observacao, l.registrado_pelo_paciente ? 'enviado pelo paciente' : ''].filter(Boolean).join(' · ')}</span></span><span class="tiny muted">${fDate(l.data)}</span><button class="btn sm ghost danger" data-act="wDelWeight" data-id="${l.id}" aria-label="Excluir">${icon('x')}</button></div>`; })}</div>` : html`<p class="small muted">Nenhuma pesagem.</p>`}</div>
    <div class="card"><h3 style="margin-top:0">Aplicações</h3>${doses.length ? html`<div class="list">${doses.map(x => html`<div class="li small"><span class="grow"><b>${x.dose}</b><span class="tiny muted"> ${[x.local_aplicacao, x.observacao].filter(Boolean).join(' · ')}</span></span><span class="tiny muted">${fDate(x.data_aplicacao)}</span><button class="btn sm ghost danger" data-act="wDelDose" data-id="${x.id}" aria-label="Excluir">${icon('x')}</button></div>`)}</div>` : html`<p class="small muted">Nenhuma aplicação registrada no PEPMH ainda.</p>`}</div></div>`;
};
act('wEditTreat', async el => { const [t, p] = await Promise.all([db.get('weight_treatments', el.dataset.id), db.get('patients', el.dataset.p)]); modal('Editar acompanhamento', wTreatForm(p, t), { wide: true }); });

act('wWeight', async el => {
  const [t] = await db.list('weight_treatments', { eq: { patient_id: el.dataset.p }, limit: 1 });
  modal('Registrar peso', html`<form data-form="wSaveWeight" class="stack"><input type="hidden" name="patient_id" value="${el.dataset.p}">
    <div class="grid g2"><label class="f"><span>Data</span><input class="in" type="date" name="data" value="${ymd(new Date())}" max="${ymd(new Date())}" required></label><label class="f"><span>Peso (kg) <i>*</i></span><input class="in" name="peso" inputmode="decimal" required placeholder="82,5"></label></div>
    <div class="grid g3"><label class="f"><span>Cintura (cm)</span><input class="in" name="cintura_cm" inputmode="decimal"></label><label class="f"><span>Quadril (cm)</span><input class="in" name="quadril_cm" inputmode="decimal"></label><label class="f"><span>Gordura (%)</span><input class="in" name="gordura_pct" inputmode="decimal"></label></div>
    <label class="f"><span>Observação</span><input class="in" name="observacao"></label>
    ${!t ? html`<p class="tiny muted" style="margin:0">Este paciente ainda não tem acompanhamento criado; o peso fica salvo mesmo assim.</p>` : ''}
    <button class="btn primary" type="submit">Salvar peso</button></form>`);
});
onForm('wSaveWeight', async d => {
  const n = k => { if (d[k] === '' || d[k] == null) return null; const x = parseMoney(d[k]); if (!isFinite(x)) throw new Error('Confira os números.'); return x; };
  const peso = n('peso'); if (!(peso >= 20 && peso <= 400)) throw new Error('Informe um peso entre 20 e 400 kg.');
  await db.insert('weight_logs', { patient_id: d.patient_id, data: d.data || ymd(new Date()), peso, cintura_cm: n('cintura_cm'), quadril_cm: n('quadril_cm'), gordura_pct: n('gordura_pct'), observacao: nz(d.observacao) });
  closeModal(); toast('Peso registrado.', 'ok'); router();
});
act('wDelWeight', async el => { if (await confirmBox('Excluir esta pesagem?', 'Excluir')) { await db.remove('weight_logs', el.dataset.id); router(); } });

act('wDose', async el => {
  const [[t], stock, p] = await Promise.all([db.list('weight_treatments', { eq: { patient_id: el.dataset.p }, limit: 1 }), db.list('stock_items', { ilike: { name: 'tirzepatida*' }, order: 'name' }), db.get('patients', el.dataset.p)]);
  if (!t) { modal('Novo acompanhamento', wTreatForm(p), { wide: true }); toast('Crie o acompanhamento antes de registrar a aplicação.'); return; }
  const dose = t.dose_atual || ''; const match = stock.find(i => i.name.toLowerCase() === ('tirzepatida ' + dose).toLowerCase());
  modal('Registrar aplicação · ' + p.name.split(' ')[0], html`<form data-form="wSaveDose" class="stack"><input type="hidden" name="patient_id" value="${p.id}"><input type="hidden" name="tid" value="${t.id}"><input type="hidden" name="freq" value="${t.frequencia_dias || 7}">
    <div class="grid g3"><label class="f"><span>Data <i>*</i></span><input class="in" type="date" name="data" value="${ymd(new Date())}" required></label><label class="f"><span>Dose <i>*</i></span><input class="in" name="dose" list="wdoses2" value="${dose}" required></label><label class="f"><span>Local</span><select class="in" name="local"><option value="">—</option>${WSITES.map(x => html`<option>${x}</option>`)}</select></label></div>
    <datalist id="wdoses2">${WDOSES.map(x => html`<option>${x}</option>`)}</datalist>
    <label class="f"><span>Observação</span><input class="in" name="obs" placeholder="Efeitos, tolerância, ajuste de dose…"></label>
    ${stock.length ? html`<label class="f"><span>Dar baixa no estoque</span><select class="in" name="item_id"><option value="">Não dar baixa</option>${stock.map(i => html`<option value="${i.id}" ${match && match.id === i.id ? 'selected' : ''}>${i.name} (${(+i.quantity).toLocaleString('pt-BR')} ${i.unit})</option>`)}</select></label>` : ''}
    <p class="tiny muted" style="margin:0">A próxima aplicação fica marcada para ${t.frequencia_dias || 7} dias depois desta data, e a dose atual é atualizada.</p>
    <button class="btn primary" type="submit">Registrar</button></form>`);
});
onForm('wSaveDose', async d => {
  const dose = normDose(d.dose); if (!dose) throw new Error('Informe a dose.');
  await db.insert('dose_logs', { patient_id: d.patient_id, data_aplicacao: d.data, dose, local_aplicacao: nz(d.local), observacao: nz(d.obs), aplicado_por: isDemo() ? null : Auth.userId() });
  const next = ymd(addDays(parseYmd(d.data), +d.freq || 7)); const t = await db.get('weight_treatments', d.tid);
  await db.update('weight_treatments', d.tid, { dose_atual: dose, proxima_aplicacao: !t.proxima_aplicacao || next > t.proxima_aplicacao || d.data >= ymd(new Date()) ? next : t.proxima_aplicacao, ativo: true });
  if (d.item_id) { const p = await db.get('patients', d.patient_id); await db.insert('stock_movements', { item_id: d.item_id, kind: 'saida', quantity: 1, note: `Aplicação · ${p?.name || ''}`, created_by: isDemo() ? null : Auth.userId() }); updateNotif(); }
  closeModal(); toast(`Aplicação registrada. Próxima: ${fDate(next)}.`, 'ok'); router();
});
act('wDelDose', async el => { if (await confirmBox('Excluir este registro de aplicação? O estoque não é devolvido automaticamente.', 'Excluir')) { await db.remove('dose_logs', el.dataset.id); router(); } });

act('wPay', async el => {
  const t = await db.get('weight_treatments', el.dataset.id);
  modal('Pagamento da mensalidade', html`<form data-form="wSavePay" class="stack"><input type="hidden" name="tid" value="${t.id}"><input type="hidden" name="patient_id" value="${el.dataset.p}">
    <div class="grid g3"><label class="f"><span>Valor (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required value="${t.valor_mensalidade ? String(t.valor_mensalidade).replace('.', ',') : ''}"></label><label class="f"><span>Pago em</span><input class="in" type="date" name="paid" value="${ymd(new Date())}" required></label><label class="f"><span>Forma</span>${payMethodSelect('pix')}</label></div>
    <label class="f"><span>Próximo vencimento</span><input class="in" type="date" name="next" value="${addMonths(t.data_vencimento || ymd(new Date()), 1)}"></label>
    <button class="btn primary" type="submit">Registrar pagamento</button></form>`);
});
onForm('wSavePay', async d => {
  const amount = parseMoney(d.amount); if (!(amount > 0)) throw new Error('Informe o valor.');
  const p = await db.get('patients', d.patient_id); const t = await db.get('weight_treatments', d.tid);
  await db.insert('finance_entries', { kind: 'receita', description: `Mensalidade emagrecimento · ${p.name}`, amount, due_date: t.data_vencimento || d.paid, paid_at: d.paid, method: d.method || 'pix', category: 'Emagrecimento', patient_id: p.id });
  await db.update('weight_treatments', d.tid, { status_pagamento: 'pago', data_vencimento: nz(d.next), valor_mensalidade: t.valor_mensalidade || amount });
  closeModal(); toast('Pagamento registrado no Financeiro.', 'ok'); router();
});

/* ---------- Portal do paciente: meu tratamento ---------- */
proute('/meu-tratamento', async () => {
  const p = S.patient;
  const [[tr], logs, doses] = await Promise.all([db.list('weight_treatments', { eq: { patient_id: p.id }, limit: 1 }), db.list('weight_logs', { eq: { patient_id: p.id }, order: 'data.desc,created_at.desc' }), db.list('dose_logs', { eq: { patient_id: p.id }, order: 'data_aplicacao.desc', limit: 6 })]);
  if (!tr) return html`<div class="pagehead"><h1>Meu tratamento</h1></div><div class="card empty">${icon('chart')}<div>Você ainda não tem acompanhamento de emagrecimento com a clínica.</div><a class="btn sm" style="margin-top:10px" href="#/agendar">Marcar uma consulta</a></div>`;
  const s = weightStats(tr, logs); const ap = appState(tr);
  return html`<div class="pagehead"><div><h1>Meu tratamento</h1><div class="muted small">${tr.medication || 'Tirzepatida'} · ${S.clinic.name}</div></div></div>
  <div class="grid g3">
    <div class="card kpi"><div class="l">Próxima aplicação</div><div class="v" style="font-size:1.3rem">${tr.proxima_aplicacao ? fDate(tr.proxima_aplicacao) : '—'}</div>${ap && ap[0] !== 'gray' ? html`<span class="pill ${ap[0]}">${ap[1]}</span>` : ''}</div>
    <div class="card kpi"><div class="l">Dose atual</div><div class="v" style="font-size:1.3rem">${tr.dose_atual || '—'}</div><div class="tiny muted">a cada ${tr.frequencia_dias || 7} dias</div></div>
    <div class="card kpi"><div class="l">Você já perdeu</div><div class="v" style="font-size:1.3rem;color:${s.lost > 0 ? 'var(--ok)' : 'inherit'}">${s.lost > 0 ? num1(s.lost) + ' kg' : '—'}</div><div class="tiny muted">${kg(s.ini)} → ${kg(s.cur)}</div></div></div>
  <div class="card" style="margin-top:14px"><h2 style="margin-top:0">Minha evolução</h2>${weightChart(s.logs, tr.peso_meta)}</div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card"><h3 style="margin-top:0">Registrar meu peso</h3><form data-form="wMyWeight" class="stack"><div class="grid g2"><label class="f"><span>Data</span><input class="in" type="date" name="data" value="${ymd(new Date())}" max="${ymd(new Date())}" required></label><label class="f"><span>Peso (kg)</span><input class="in" name="peso" inputmode="decimal" required placeholder="82,5"></label></div><label class="f"><span>Como está se sentindo? (opcional)</span><input class="in" name="observacao" placeholder="Enjoo, apetite, disposição…"></label><button class="btn primary" type="submit">Enviar para a clínica</button></form>
      <p class="tiny muted" style="margin-bottom:0">Pese-se de manhã, em jejum, sempre na mesma balança. Sintoma forte ou diferente do habitual? Fale com a clínica antes da próxima aplicação.</p></div>
    <div class="card"><h3 style="margin-top:0">Últimas aplicações</h3>${doses.length ? html`<div class="list">${doses.map(x => html`<div class="li small"><span class="grow"><b>${x.dose}</b> <span class="tiny muted">${x.local_aplicacao || ''}</span></span><span class="tiny muted">${fDate(x.data_aplicacao)}</span></div>`)}</div>` : html`<p class="small muted">As aplicações registradas pela clínica aparecem aqui.</p>`}
      ${S.clinic.phone ? html`<a class="btn sm" style="margin-top:10px" target="_blank" rel="noopener" href="${waLink(S.clinic.phone, 'Olá! Sou paciente do acompanhamento de emagrecimento e gostaria de tirar uma dúvida.')}">${icon('wa')} Falar com a clínica</a>` : ''}</div></div>`;
}, 'tratamento');
onForm('wMyWeight', async d => {
  const peso = parseMoney(d.peso); if (!(peso >= 20 && peso <= 400)) throw new Error('Informe um peso entre 20 e 400 kg.');
  await db.insert('weight_logs', { patient_id: S.patient.id, data: d.data || ymd(new Date()), peso, observacao: nz(d.observacao), registrado_pelo_paciente: true });
  toast('Peso enviado. Obrigada!', 'ok'); router();
});
