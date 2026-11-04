/* ===== Odontologia: odontograma, periograma, exame clínico, anestesia e ferramentas do dentista ===== */
/* Valores de referência usuais na literatura odontológica brasileira (Malamed; Andrade – Terapêutica
   Medicamentosa em Odontologia; AHA 2021). São apoio à decisão: o profissional confere cada caso. */
const showDental = () => hasDentists() || S.me?.profession === 'odontologia';
const DENTAL_MIG = 'supabase/migrations/20261104_dental_records.sql';
async function dentalList(pid, kind, limit) {
  try { return await db.list('dental_records', { eq: { patient_id: pid, kind }, order: 'created_at.desc', ...(limit ? { limit } : {}) }); }
  catch (e) { if (/dental_records|schema cache|does not exist|relation|404/i.test(e.message)) return null; throw e; }
}
const migMissing = () => html`<div class="card"><div class="tip">${icon('bulb')}<span>Esta função precisa da tabela <b>dental_records</b> no banco de dados. Aplique a migração <code>${DENTAL_MIG}</code> no Supabase (SQL Editor) e recarregue a página.</span></div></div>`;
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const f1 = (n, d = 1) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
const floor1 = n => Math.floor(n * 10 + 1e-9) / 10;
const pidFromHash = () => (location.hash.match(/paciente\/([^?/]+)/) || [])[1];
async function latestAnam(pid) { return (await db.list('anamneses', { eq: { patient_id: pid }, order: 'created_at.desc', limit: 1 }))[0]?.data || {}; }
async function latestVitals(pid) { try { return (await db.list('vitals', { eq: { patient_id: pid }, order: 'measured_at.desc', limit: 5 })); } catch { return []; } }

/* =================================================================== */
/* ODONTOGRAMA                                                          */
/* =================================================================== */
const ODO_FACE = ['Cárie', 'Restauração em resina', 'Restauração em amálgama', 'Restauração provisória', 'Restauração insatisfatória', 'Restauração', 'Selante', 'Fratura', 'Mancha branca', 'Lesão não cariosa (abfração/erosão)', 'Faceta / lente de contato'];
const ODO_WHOLE = {
  'Ausente': 'A', 'Extração indicada': 'X', 'Canal (endodontia)': 'E', 'Lesão periapical': 'LP', 'Fístula': 'F', 'Coroa': 'C', 'Núcleo / pino': 'N', 'Implante': 'I',
  'Prótese': 'P', 'Prótese fixa (pôntico)': 'PF', 'Prótese removível': 'PR', 'Raiz residual': 'R', 'Incluso / impactado': 'IN', 'Semi-incluso': 'SI',
  'Mobilidade': 'M', 'Giroversão': 'G', 'Aparelho ortodôntico': 'O', 'Decíduo retido': 'DR', 'Hígido (sem alterações)': '✓',
};
const ODO_COLOR = { a_realizar: '#f2a5a5', realizado: '#9cc2f0', existente: '#c8d0da' };
const ODO_INK = { a_realizar: '#c42b2b', realizado: '#0b57b3', existente: '#5f6b7a' };
const ODO_ST = { a_realizar: 'A realizar', realizado: 'Realizado', existente: 'Existente' };
const odoStatusPill = s => html`<span class="pill ${s === 'a_realizar' ? 'bad' : s === 'realizado' ? '' : 'gray'}">${ODO_ST[s] || s}</span>`;
const ODO_ARCH = {
  UP: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], LP: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  UD: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], LD: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};
const ODO_MODES = { perm: ['Permanente', ['UP', 'LP']], mista: ['Mista', ['UP', 'UD', 'LD', 'LP']], dec: ['Decídua', ['UD', 'LD']] };
const VALID_TEETH = new Set(Object.values(ODO_ARCH).flat());
const isUpperT = t => [1, 2, 5, 6].includes(Math.floor(t / 10));
const isRightT = t => [1, 4, 5, 8].includes(Math.floor(t / 10));
function faceMap(t) { const up = isUpperT(t), right = isRightT(t); return { top: up ? 'V' : 'L', bottom: up ? 'L' : 'V', left: right ? 'D' : 'M', right: right ? 'M' : 'D', center: 'O' }; }
const facesOf = t => [['V', 'Vestibular'], ['L', isUpperT(t) ? 'Palatina' : 'Lingual'], ['M', 'Mesial'], ['D', 'Distal'], ['O', t % 10 <= 3 ? 'Incisal' : 'Oclusal']];
const FACE_PTS = { top: '0,0 40,0 28,12 12,12', bottom: '0,40 40,40 28,28 12,28', left: '0,0 12,12 12,28 0,40', right: '40,0 28,12 28,28 40,40' };

/* SVG do dente com cores inline (vale na tela e na impressão) */
function toothSvgStr(t, entries, size = 36) {
  const fm = faceMap(t), fill = {}, wholes = [];
  entries.forEach(e => { if (ODO_WHOLE[e.condition]) wholes.push(e); else (e.faces || []).forEach(f => (fill[f] = ODO_COLOR[e.status] || '#fff')); });
  const st = 'stroke="#8795a6" stroke-width="1"';
  const poly = pos => `<polygon ${st} fill="${fill[fm[pos]] || '#fff'}" points="${FACE_PTS[pos]}"/>`;
  const absent = wholes.find(w => w.condition === 'Ausente');
  let over = '';
  if (absent) over = `<rect x="1" y="1" width="38" height="38" fill="rgba(255,255,255,.85)"/><path d="M7 7 33 33M33 7 7 33" stroke="${ODO_INK[absent.status]}" stroke-width="3.5" stroke-linecap="round"/>`;
  else if (wholes.length) {
    const w = wholes.filter(x => x.condition !== 'Hígido (sem alterações)').slice(-2); const show = w.length ? w : wholes.slice(-1);
    const txt = show.map(x => ODO_WHOLE[x.condition]).join(' '); const fs = txt.length <= 1 ? 20 : txt.length <= 2 ? 15 : txt.length <= 4 ? 11 : 9;
    over = `<rect x="1" y="1" width="38" height="38" fill="rgba(255,255,255,.78)"/><text x="20" y="${(20 + fs * 0.36).toFixed(1)}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="800" fill="${ODO_INK[show[show.length - 1].status]}">${esc(txt)}</text>`;
  }
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">${poly('top')}${poly('bottom')}${poly('left')}${poly('right')}<rect ${st} fill="${fill.O || '#fff'}" x="12" y="12" width="16" height="16"/>${over}</svg>`;
}
const toothSvg = (t, entries) => html`<div class="tooth ${entries.some(e => e.status === 'a_realizar') ? 'pend' : ''}" data-act="odoTooth" data-t="${t}" title="Dente ${t}"><span class="n">${t}</span>${raw(toothSvgStr(t, entries))}</div>`;
const defaultDentition = p => { const a = age(p.birth_date); return a == null ? 'perm' : a < 6 ? 'dec' : a < 13 ? 'mista' : 'perm'; };

/* Índice CPO-D (permanentes) e ceo-d (decíduos) a partir do odontograma */
function cpoIndex(rows, deciduous) {
  const by = groupBy(rows.filter(r => deciduous ? r.tooth >= 51 : r.tooth < 51), r => r.tooth); let c = 0, p = 0, o = 0;
  Object.values(by).forEach(es => {
    const has = f => es.some(f);
    const lost = has(e => e.condition === 'Ausente'), ext = has(e => e.condition === 'Extração indicada' && e.status === 'a_realizar');
    const car = has(e => ['Cárie', 'Raiz residual'].includes(e.condition) && e.status === 'a_realizar');
    const fill = has(e => (/^Restauração/.test(e.condition) || e.condition === 'Coroa' || e.condition === 'Cárie') && e.status !== 'a_realizar');
    if (deciduous) { if (ext) p++; else if (car) c++; else if (fill) o++; }
    else { if (lost || ext) p++; else if (car) c++; else if (fill) o++; }
  });
  return { c, p, o, total: c + p + o };
}

TABRENDER.odontograma = async (p, q) => {
  const rows = await db.list('odontogram', { eq: { patient_id: p.id }, order: 'created_at' });
  const mode = ODO_MODES[q.get('dent')] ? q.get('dent') : q.get('dec') === '1' ? 'dec' : defaultDentition(p);
  const filt = q.get('ver') || 'tudo';
  const vis = filt === 'pend' ? rows.filter(r => r.status === 'a_realizar') : filt === 'feito' ? rows.filter(r => r.status !== 'a_realizar') : rows;
  const by = groupBy(vis, r => r.tooth);
  const arch = list => html`<div class="arch">${list.map((t, i) => html`${i === list.length / 2 ? raw('<span class="gap"></span>') : ''}${toothSvg(t, by[t] || [])}`)}</div>`;
  const [ua, ...rest] = ODO_MODES[mode][1];
  const cpo = cpoIndex(rows, false), ceo = cpoIndex(rows, true);
  const pend = rows.filter(r => r.status === 'a_realizar');
  const base = `#/paciente/${p.id}?tab=odontograma&dent=${mode}`;
  return html`<div class="card"><div class="row between"><h2>Odontograma</h2>
      <div class="row"><div class="seg">${Object.entries(ODO_MODES).map(([k, [l]]) => html`<a class="${mode === k ? 'on' : ''}" href="#/paciente/${p.id}?tab=odontograma&dent=${k}&ver=${filt}">${l}</a>`)}</div>
      <div class="seg">${[['tudo', 'Tudo'], ['pend', 'A realizar'], ['feito', 'Realizado/existente']].map(([k, l]) => html`<a class="${filt === k ? 'on' : ''}" href="${base}&ver=${k}">${l}</a>`)}</div></div></div>
    <p class="small muted">Toque em um dente para registrar achados e procedimentos — você pode clicar direto nas faces. Para marcar vários dentes de uma vez, use “Vários dentes”.</p>
    <div class="odo">${arch(ODO_ARCH[ua])}${rest.map((k, i) => html`<div style="height:${ODO_MODES[mode][1].length === 4 && i === 1 ? 18 : 8}px"></div>${arch(ODO_ARCH[k])}`)}</div>
    <div class="legend" style="margin-top:12px"><span><i style="background:${ODO_COLOR.a_realizar}"></i>A realizar</span><span><i style="background:${ODO_COLOR.realizado}"></i>Realizado</span><span><i style="background:${ODO_COLOR.existente}"></i>Existente</span></div>
    <div class="tiny muted" style="margin-top:6px">${Object.entries(ODO_WHOLE).map(([k, v]) => `${v} = ${k.toLowerCase()}`).join(' · ')}</div>
    <div class="row" style="margin-top:12px"><button class="btn sm" data-act="odoMulti" data-id="${p.id}">${icon('plus')} Vários dentes</button><button class="btn sm" data-act="odoPrint" data-id="${p.id}" data-mode="${mode}">${icon('print')} Imprimir odontograma</button>${pend.length ? html`<button class="btn sm" data-act="odoToPlan" data-id="${p.id}">${icon('clip')} Levar ${pend.length} pendência(s) ao plano</button>` : ''}</div></div>
  <div class="grid g3" style="margin-bottom:14px">
    <div class="card kpi"><div class="l">CPO-D (permanentes)</div><div class="v">${cpo.total}</div><div class="tiny muted">C ${cpo.c} · P ${cpo.p} · O ${cpo.o}</div></div>
    <div class="card kpi"><div class="l">ceo-d (decíduos)</div><div class="v">${ceo.total}</div><div class="tiny muted">c ${ceo.c} · e ${ceo.p} · o ${ceo.o}</div></div>
    <div class="card kpi"><div class="l">Achados a tratar</div><div class="v" style="color:${pend.length ? 'var(--bad)' : 'var(--ok)'}">${pend.length}</div><div class="tiny muted">${new Set(pend.map(r => r.tooth)).size} dente(s)</div></div></div>
  <div class="card"><h3>Registros</h3>${rows.length ? html`<div class="tblwrap" style="margin-top:10px"><table class="tbl"><tr><th>Dente</th><th>Faces</th><th>Condição</th><th>Situação</th><th>Data</th><th></th></tr>${[...rows].reverse().map(r => html`<tr><td><b>${r.tooth}</b></td><td>${(r.faces || []).join(', ') || '—'}</td><td>${r.condition}${r.notes ? html`<div class="tiny muted">${r.notes}</div>` : ''}</td><td>${odoStatusPill(r.status)}</td><td class="small">${fDate(r.created_at)}</td><td class="num"><button class="btn sm" data-act="odoCycle" data-id="${r.id}" title="Alterar situação">${icon('repeat')}</button> <button class="btn sm danger" data-act="odoDel" data-id="${r.id}">${icon('trash')}</button></td></tr>`)}</table></div>` : html`<p class="muted small">Nenhum registro ainda.</p>`}
    <p class="tiny muted" style="margin:10px 0 0">CPO-D/ceo-d calculados a partir dos registros (cariados, perdidos/extração indicada, obturados). Ausências por agenesia, ortodontia ou trauma devem ser desconsideradas na interpretação.</p></div>`;
};

const condOptions = sel => html`<optgroup label="Por face">${ODO_FACE.map(c => html`<option ${c === sel ? 'selected' : ''}>${c}</option>`)}</optgroup><optgroup label="Dente inteiro">${Object.keys(ODO_WHOLE).map(c => html`<option ${c === sel ? 'selected' : ''}>${c}</option>`)}</optgroup>`;
const procOptions = () => html`<option value="">Não incluir</option>${S.procedures.filter(x => x.active).map(x => html`<option value="${x.id}">${x.name} — ${BRL(x.price)}</option>`)}`;

act('odoTooth', async el => {
  const t = +el.dataset.t, fm = faceMap(t), pid = pidFromHash();
  const hist = await db.list('odontogram', { eq: { patient_id: pid, tooth: t }, order: 'created_at.desc' });
  const big = `<svg viewBox="0 0 40 40" width="130" height="130" class="facepick">${['top', 'bottom', 'left', 'right'].map(pos => `<polygon data-act="odoFace" data-f="${fm[pos]}" points="${FACE_PTS[pos]}"/>`).join('')}<rect data-act="odoFace" data-f="O" x="12" y="12" width="16" height="16"/>${['top', 'bottom', 'left', 'right', 'center'].map(pos => { const c = { top: [20, 7], bottom: [20, 36], left: [6, 22], right: [34, 22], center: [20, 22] }[pos]; return `<text x="${c[0]}" y="${c[1]}" text-anchor="middle" font-size="5" font-weight="700" fill="#33415c" pointer-events="none">${fm[pos]}</text>`; }).join('')}</svg>`;
  modal(`Dente ${t}`, html`<form data-form="saveOdo" class="stack" data-input="odoForm"><input type="hidden" name="patient_id" value="${pid}"><input type="hidden" name="tooth" value="${t}">
    <label class="f"><span>Condição / procedimento</span><select class="in" name="condition" required>${condOptions('Cárie')}</select></label>
    <div class="row" style="align-items:center;gap:16px;flex-wrap:wrap" id="odofaces"><div>${raw(big)}<div class="tiny muted" style="text-align:center">Clique nas faces</div></div>
      <div class="stack" style="gap:6px">${facesOf(t).map(([k, l]) => html`<label class="check"><input type="checkbox" name="faces" value="${k}" data-multi="1"> ${l} (${k})</label>`)}</div></div>
    <div class="grid g2"><label class="f"><span>Situação</span><select class="in" name="status"><option value="a_realizar">A realizar</option><option value="realizado">Realizado</option><option value="existente">Existente (pré-existente)</option></select></label>
      <label class="f"><span>Incluir no plano de tratamento</span><select class="in" name="procedure_id">${procOptions()}</select></label></div>
    <label class="f"><span>Observação</span><input class="in" name="notes" placeholder="Ex.: material, cor, profundidade"></label>
    <label class="check"><input type="checkbox" name="evo"> Registrar também na evolução (quando realizado hoje)</label>
    <button class="btn primary" type="submit">Registrar</button></form>
    ${hist.length ? html`<h3 style="margin-top:16px">Histórico do dente ${t}</h3><div class="list" style="margin-top:6px">${hist.map(r => html`<div class="li"><span class="grow small"><b>${r.condition}</b>${(r.faces || []).length ? ' · ' + r.faces.join('') : ''}${r.notes ? html`<span class="tiny muted"> · ${r.notes}</span>` : ''}<br><span class="tiny muted">${fDate(r.created_at)}</span></span>${odoStatusPill(r.status)}<button class="btn sm" data-act="odoCycle" data-id="${r.id}" title="Alterar situação">${icon('repeat')}</button><button class="btn sm ghost danger" data-act="odoDel" data-id="${r.id}">${icon('x')}</button></div>`)}</div>` : ''}`, { wide: true });
});
act('odoFace', el => {
  const f = document.querySelector(`#modal input[name=faces][value="${el.dataset.f}"]`); if (!f || f.disabled) return;
  f.checked = !f.checked; syncFacePick();
});
function syncFacePick() {
  const m = document.getElementById('modal'); if (!m) return;
  const whole = !!ODO_WHOLE[m.querySelector('[name=condition]')?.value];
  m.querySelectorAll('input[name=faces]').forEach(c => { c.disabled = whole; if (whole) c.checked = false; m.querySelectorAll(`.facepick [data-f="${c.value}"]`).forEach(p => p.classList.toggle('sel', c.checked)); });
  m.querySelector('#odofaces')?.classList.toggle('dim', whole);
}
onInput('odoForm', () => syncFacePick());
onForm('saveOdo', async d => {
  const t = +d.tooth; const whole = !!ODO_WHOLE[d.condition];
  if (!whole && !(d.faces || []).length) throw new Error('Marque pelo menos uma face (ou escolha uma condição de dente inteiro).');
  await db.insert('odontogram', { patient_id: d.patient_id, tooth: t, faces: whole ? [] : d.faces, condition: d.condition, status: d.status, notes: nz(d.notes) });
  if (d.procedure_id) await addToPlan(d.patient_id, d.procedure_id, t, whole ? [] : d.faces);
  if (d.evo) await db.insert('evolutions', { patient_id: d.patient_id, content: `${d.condition} – dente ${t}${!whole && d.faces.length ? ' (faces ' + d.faces.join('') + ')' : ''}: ${ODO_ST[d.status].toLowerCase()}.${d.notes ? ' ' + d.notes : ''}`, professional_id: Auth.userId(), professional_name: S.me.full_name });
  closeModal(); toast(d.procedure_id ? 'Registrado e incluído no plano.' : 'Registrado.', 'ok'); router();
});
async function addToPlan(pid, procId, tooth, faces) {
  let plan = (await db.list('treatment_plans', { eq: { patient_id: pid }, in: { status: ['orcamento', 'aprovado', 'em_andamento'] }, order: 'created_at.desc', limit: 1 }))[0];
  if (!plan) plan = await db.insert('treatment_plans', { patient_id: pid, title: 'Plano de tratamento' });
  const pr = S.procedures.find(x => x.id === procId);
  await db.insert('treatment_items', { plan_id: plan.id, procedure_id: pr.id, description: pr.name, tooth, faces: faces || [], price: pr.price });
}
act('odoCycle', async el => { const r = await db.get('odontogram', el.dataset.id); const nx = { a_realizar: 'realizado', realizado: 'existente', existente: 'a_realizar' }[r.status]; await db.update('odontogram', r.id, { status: nx }); closeModal(); router(); });
act('odoDel', async el => { if (await confirmBox('Excluir este registro do odontograma?', 'Excluir')) { await db.remove('odontogram', el.dataset.id); router(); } });

/* vários dentes de uma vez: "11, 12, 21-24" */
function parseTeeth(s) {
  const out = new Set();
  String(s || '').split(/[,;\s]+/).filter(Boolean).forEach(part => {
    const m = part.match(/^(\d{2})-(\d{2})$/);
    if (m) { const a = +m[1], b = +m[2]; if (Math.floor(a / 10) !== Math.floor(b / 10)) throw new Error(`Intervalo ${part}: use dentes do mesmo quadrante.`); for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i); }
    else if (/^\d{2}$/.test(part)) out.add(+part); else throw new Error(`Não entendi "${part}". Use a notação FDI, ex.: 11, 21-23.`);
  });
  const bad = [...out].filter(t => !VALID_TEETH.has(t)); if (bad.length) throw new Error('Dente(s) inválido(s): ' + bad.join(', '));
  return [...out];
}
act('odoMulti', el => modal('Registrar em vários dentes', html`<form data-form="saveOdoMulti" class="stack"><input type="hidden" name="patient_id" value="${el.dataset.id}">
  <label class="f"><span>Dentes (notação FDI) <i>*</i></span><input class="in" name="teeth" required placeholder="Ex.: 18, 28, 38, 48  ou  31-33"></label>
  <div class="row" style="gap:6px"><button type="button" class="btn sm" data-act="odoPreset" data-v="18, 28, 38, 48">Terceiros molares</button><button type="button" class="btn sm" data-act="odoPreset" data-v="13-11, 21-23">Anteriores sup.</button><button type="button" class="btn sm" data-act="odoPreset" data-v="43-41, 31-33">Anteriores inf.</button></div>
  <label class="f"><span>Condição (dente inteiro)</span><select class="in" name="condition">${Object.keys(ODO_WHOLE).map(c => html`<option>${c}</option>`)}</select></label>
  <label class="f"><span>Situação</span><select class="in" name="status"><option value="existente">Existente</option><option value="a_realizar">A realizar</option><option value="realizado">Realizado</option></select></label>
  <label class="f"><span>Incluir cada dente no plano</span><select class="in" name="procedure_id">${procOptions()}</select></label>
  <label class="f"><span>Observação</span><input class="in" name="notes"></label>
  <button class="btn primary" type="submit">Registrar</button></form>`));
act('odoPreset', el => { document.querySelector('#modal [name=teeth]').value = el.dataset.v; });
onForm('saveOdoMulti', async d => {
  const teeth = parseTeeth(d.teeth); if (!teeth.length) throw new Error('Informe os dentes.');
  await db.insert('odontogram', teeth.map(t => ({ patient_id: d.patient_id, tooth: t, faces: [], condition: d.condition, status: d.status, notes: nz(d.notes) })));
  if (d.procedure_id) for (const t of teeth) await addToPlan(d.patient_id, d.procedure_id, t, []);
  closeModal(); toast(`${teeth.length} dente(s) registrados.`, 'ok'); router();
});

/* pendências do odontograma → plano de tratamento */
act('odoToPlan', async el => {
  const pid = el.dataset.id; const rows = (await db.list('odontogram', { eq: { patient_id: pid, status: 'a_realizar' }, order: 'tooth' }));
  modal('Levar pendências ao plano', html`<form data-form="odoToPlan" class="stack"><input type="hidden" name="patient_id" value="${pid}">
    <p class="small muted" style="margin:0">Escolha o procedimento de cada achado. Os itens entram no plano em aberto mais recente (ou em um novo).</p>
    ${rows.map(r => html`<div class="grid g2" style="align-items:end"><div class="small"><b>${r.tooth}</b> · ${r.condition}${(r.faces || []).length ? ' · ' + r.faces.join('') : ''}</div><select class="in" name="p_${r.id}">${procOptions()}</select></div>`)}
    <button class="btn primary" type="submit">Incluir no plano</button></form>`, { wide: true });
});
onForm('odoToPlan', async d => {
  const rows = await db.list('odontogram', { eq: { patient_id: d.patient_id, status: 'a_realizar' } }); let n = 0;
  for (const r of rows) if (d['p_' + r.id]) { await addToPlan(d.patient_id, d['p_' + r.id], r.tooth, r.faces || []); n++; }
  if (!n) throw new Error('Escolha o procedimento de pelo menos um achado.');
  closeModal(); toast(`${n} item(ns) incluído(s) no plano.`, 'ok'); go(`#/paciente/${d.patient_id}?tab=plano`);
});

/* impressão gráfica */
function odoGraphicHtml(rows, mode) {
  const by = groupBy(rows, r => r.tooth);
  const arch = list => `<div style="display:flex;justify-content:center;gap:2px;margin:4px 0">${list.map((t, i) => `${i === list.length / 2 ? '<span style="width:10px"></span>' : ''}<div style="text-align:center;font:10px Arial,sans-serif;color:#444">${t}<br>${toothSvgStr(t, by[t] || [], 30)}</div>`).join('')}</div>`;
  return `<div style="margin:8px 0 6px">${ODO_MODES[mode || 'perm'][1].map(k => arch(ODO_ARCH[k])).join('')}</div><p style="font:11px Arial,sans-serif;color:#444;text-align:center">Vermelho: a realizar · Azul: realizado · Cinza: existente. ${Object.entries(ODO_WHOLE).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ')}</p>`;
}
act('odoPrint', async el => {
  const p = await db.get('patients', el.dataset.id); const rows = await db.list('odontogram', { eq: { patient_id: p.id }, order: 'tooth' });
  const cpo = cpoIndex(rows, false), ceo = cpoIndex(rows, true);
  printDoc('Odontograma – ' + p.name, `${docHeader()}<h1>Odontograma</h1><p><b>Paciente:</b> ${esc(p.name)} · <b>Nascimento:</b> ${esc(fDate(p.birth_date))} · <b>Data:</b> ${esc(fDate(new Date()))}</p>${odoGraphicHtml(rows, el.dataset.mode)}
  <p><b>CPO-D:</b> ${cpo.total} (C ${cpo.c} · P ${cpo.p} · O ${cpo.o}) &nbsp; <b>ceo-d:</b> ${ceo.total} (c ${ceo.c} · e ${ceo.p} · o ${ceo.o})</p>
  <table><tr><th>Dente</th><th>Faces</th><th>Condição</th><th>Situação</th><th>Data</th></tr>${rows.map(o => `<tr><td>${o.tooth}</td><td>${esc((o.faces || []).join(', '))}</td><td>${esc(o.condition)}${o.notes ? ' – ' + esc(o.notes) : ''}</td><td>${esc(ODO_ST[o.status])}</td><td>${esc(fDate(o.created_at))}</td></tr>`).join('') || '<tr><td colspan=5>—</td></tr>'}</table>${signature(S.me.full_name, councilOf(S.me))}`);
});

/* =================================================================== */
/* PERIOGRAMA                                                           */
/* =================================================================== */
/* sítios: 0 DV, 1 V, 2 MV, 3 DL/DP, 4 L/P, 5 ML/MP */
const PERIO_TEETH = [...ODO_ARCH.UP, ...ODO_ARCH.LP];
const isMolar = t => t % 10 >= 6;
const siteOrder = (t, face) => { const b = face === 'V' ? [0, 1, 2] : [3, 4, 5]; return isRightT(t) ? b : [...b].reverse(); };
function perioFromForm(d) {
  const teeth = {};
  PERIO_TEETH.forEach(t => {
    const g = k => [0, 1, 2, 3, 4, 5].map(i => d[`${k}_${t}_${i}`]);
    const x = { aus: !!d['aus_' + t], mob: d['mob_' + t] || '', fur: d['fur_' + t] || '', pd: g('pd').map(num), rec: g('rec').map(num), bop: g('bop').map(Boolean), pl: g('pl').map(Boolean) };
    if (x.aus || x.mob || x.fur || x.pd.some(v => v != null) || x.rec.some(v => v != null) || x.bop.some(Boolean) || x.pl.some(Boolean)) teeth[t] = x;
  });
  return { teeth, notes: d.notes || '' };
}
function perioStats(data, missingFromOdo = []) {
  const T = data.teeth || {}; const present = PERIO_TEETH.filter(t => !(T[t]?.aus) && !(T[t] == null && missingFromOdo.includes(t)));
  let bop = 0, pl = 0, pdS = 0, pdN = 0, s4 = 0, s6 = 0, maxCal = 0, mob = 0, fur = 0, recN = 0, pocketTeeth = 0; const calTeeth = []; const deep = [];
  present.forEach(t => {
    const x = T[t]; if (!x) return;
    bop += x.bop.filter(Boolean).length; pl += x.pl.filter(Boolean).length; if (x.mob && x.mob !== '0') mob++; if (x.fur) fur++;
    let toothCal = 0;
    x.pd.forEach((v, i) => {
      if (v == null) return; pdS += v; pdN++; if (v >= 6) { s6++; deep.push(t); } else if (v >= 4) s4++;
      if (x.rec[i] == null) return; recN++; // NIC só onde a margem/recessão foi medida (sem ela, PS ≠ NIC)
      const cal = v + x.rec[i]; if ([0, 2, 3, 5].includes(i)) { toothCal = Math.max(toothCal, cal); maxCal = Math.max(maxCal, cal); }
    });
    if (toothCal >= 2) calTeeth.push(t);
    if (x.pd.some(v => v != null && v >= 4)) pocketTeeth++;
  });
  const sites = present.length * 6;
  const r = { present: present.length, missing: 32 - present.length, sites, bopPct: sites ? Math.round(bop / sites * 100) : 0, plPct: sites ? Math.round(pl / sites * 100) : 0, pdMean: pdN ? pdS / pdN : 0, pdN, s4, s6, maxCal, mob, fur, calTeeth: calTeeth.length, deep: [...new Set(deep)] };
  if (!pdN) r.dx = 'Sem medidas de sondagem registradas.';
  else if (calTeeth.length >= 2) {
    const stage = maxCal <= 2 ? 'I' : maxCal <= 4 ? 'II' : 'III';
    r.dx = `Compatível com periodontite estágio ${stage}${stage === 'III' ? ' (ou IV, se houver fatores de complexidade/perda dentária ≥ 5 dentes)' : ''}, ${calTeeth.length / Math.max(1, present.length) >= 0.3 ? 'generalizada' : 'localizada'} — NIC interproximal máx. ${maxCal} mm.`;
  } else if (pocketTeeth) r.dx = `Bolsas com PS ≥ 4 mm em ${pocketTeeth} dente(s): investigar periodontite ou pseudobolsa.${recN ? '' : ' Registre a recessão (margem gengival) para calcular o NIC e estadiar.'}${r.bopPct >= 10 ? ` Sangramento em ${r.bopPct}% dos sítios.` : ''}`;
  else if (r.bopPct >= 10) r.dx = `Compatível com gengivite ${r.bopPct > 30 ? 'generalizada' : 'localizada'} (sangramento em ${r.bopPct}% dos sítios).`;
  else r.dx = 'Compatível com saúde periodontal (sangramento < 10%).';
  return r;
}
const perioCls = v => v == null ? '' : v >= 6 ? 'b' : v >= 4 ? 'w' : '';

TABRENDER.periograma = async (p, q) => {
  const list = await dentalList(p.id, 'periograma'); if (list === null) return migMissing();
  const odo = await db.list('odontogram', { eq: { patient_id: p.id } }); const missing = [...new Set(odo.filter(o => o.condition === 'Ausente').map(o => o.tooth))];
  const novo = q.get('novo') === '1'; const ver = q.get('ver'); const cur = ver ? list.find(x => x.id === ver) : list[0];
  if (ver && cur) return perioView(p, cur, list, missing);
  const base = novo || !cur ? { teeth: Object.fromEntries(missing.filter(t => PERIO_TEETH.includes(t)).map(t => [t, { aus: true, mob: '', fur: '', pd: [], rec: [], bop: [], pl: [] }])) } : cur.data;
  const T = base.teeth || {};
  const cell = (t, k, i) => { const v = T[t]?.[k]?.[i]; return k === 'bop' || k === 'pl' ? html`<input type="checkbox" class="pchk ${k}" name="${k}_${t}_${i}" ${v ? 'checked' : ''} title="${k === 'bop' ? 'Sangramento' : 'Placa'}">` : html`<input class="pin ${k === 'pd' ? perioCls(v) : ''}" name="${k}_${t}_${i}" value="${v ?? ''}" inputmode="${k === 'rec' ? 'text' : 'numeric'}" maxlength="3" data-k="${k}">`; };
  const archTable = (teeth, upper) => {
    const faces = upper ? [['V', 'Vestibular'], ['L', 'Palatina']] : [['L', 'Lingual'], ['V', 'Vestibular']];
    const row = (label, fn, cls = '') => html`<tr class="${cls}"><th>${label}</th>${teeth.map(t => html`<td class="${T[t]?.aus ? 'aus' : ''}" data-t="${t}">${fn(t)}</td>`)}</tr>`;
    return html`<div class="tblwrap"><table class="perio"><tr><th></th>${teeth.map(t => html`<th class="tn">${t}</th>`)}</tr>
      ${row('Ausente', t => html`<input type="checkbox" name="aus_${t}" ${T[t]?.aus ? 'checked' : ''} data-k="aus">`)}
      ${row('Mobilidade', t => html`<select name="mob_${t}" class="psel">${['', '0', '1', '2', '3'].map(v => html`<option ${T[t]?.mob === v ? 'selected' : ''}>${v}</option>`)}</select>`)}
      ${row('Furca', t => isMolar(t) || (upper && t % 10 === 4) ? html`<select name="fur_${t}" class="psel">${['', 'I', 'II', 'III'].map(v => html`<option ${T[t]?.fur === v ? 'selected' : ''}>${v}</option>`)}</select>` : '')}
      ${faces.map(([f, fl]) => html`<tr class="fh"><th colspan="${teeth.length + 1}">${fl}</th></tr>
        ${row('PS (mm)', t => html`<div class="trio">${siteOrder(t, f).map(i => cell(t, 'pd', i))}</div>`)}
        ${row('Recessão', t => html`<div class="trio">${siteOrder(t, f).map(i => cell(t, 'rec', i))}</div>`)}
        ${row('Sangramento', t => html`<div class="trio">${siteOrder(t, f).map(i => cell(t, 'bop', i))}</div>`)}
        ${row('Placa', t => html`<div class="trio">${siteOrder(t, f).map(i => cell(t, 'pl', i))}</div>`)}`)}
      </table></div>`;
  };
  const st = cur ? perioStats(cur.data, missing) : null;
  return html`<div class="card"><div class="row between"><div><h2>Periograma</h2><div class="tiny muted">${novo || !cur ? 'Novo exame' : `Editando a partir do exame de ${fDT(cur.created_at)} — ao salvar, cria uma nova versão.`}</div></div>
      <div class="row">${cur ? html`<a class="btn sm" href="#/paciente/${p.id}?tab=periograma&novo=1">${icon('plus')} Novo em branco</a>` : ''}</div></div>
    <p class="small muted">PS = profundidade de sondagem. Recessão: positiva quando a margem está apical à junção cemento-esmalte, negativa quando coronal (hiperplasia). NIC = PS + recessão. Use Tab para avançar entre os campos.</p>
    <form data-form="savePerio" data-input="perioIn" class="stack"><input type="hidden" name="patient_id" value="${p.id}">
      <h3>Arcada superior</h3>${archTable(ODO_ARCH.UP, true)}
      <h3>Arcada inferior</h3>${archTable(ODO_ARCH.LP, false)}
      <label class="f"><span>Observações</span><textarea class="in" name="notes" rows="2">${base.notes || ''}</textarea></label>
      <div class="row between"><span class="tiny muted">Sítios em amarelo: PS 4–5 mm · em vermelho: PS ≥ 6 mm.</span><button class="btn primary" type="submit">Salvar periograma</button></div></form></div>
  ${list.length ? html`<div class="card"><h3>Histórico</h3><div class="list" style="margin-top:8px">${list.map((r, i) => { const s = perioStats(r.data, missing); const prev = list[i + 1] ? perioStats(list[i + 1].data, missing) : null; const dl = (a, b, suf) => prev ? html` <span class="tiny ${a - b > 0 ? 'bad-t' : a - b < 0 ? 'ok-t' : 'muted'}">(${a - b > 0 ? '+' : ''}${f1(a - b)}${suf})</span>` : '';
      return html`<div class="li"><span class="grow small"><b>${fDT(r.created_at)}</b> · ${r.professional_name || ''}<br>Sangramento ${s.bopPct}%${dl(s.bopPct, prev?.bopPct, ' p.p.')} · Placa ${s.plPct}%${dl(s.plPct, prev?.plPct, ' p.p.')} · PS média ${f1(s.pdMean)} mm${dl(s.pdMean, prev?.pdMean, ' mm')} · PS ≥ 4: ${s.s4 + s.s6} sítio(s)<br><span class="tiny muted">${s.dx}</span></span>
        <a class="btn sm" href="#/paciente/${p.id}?tab=periograma&ver=${r.id}">${icon('file')} Ver</a><button class="btn sm" data-act="perioPrint" data-id="${r.id}">${icon('print')}</button><button class="btn sm ghost danger" data-act="dentalDel" data-id="${r.id}">${icon('x')}</button></div>`; })}</div></div>` : ''}
  ${st ? perioSummaryCard(st) : ''}`;
};
const perioSummaryCard = s => html`<div class="card"><h3>Resumo do último exame</h3><div class="grid g4" style="margin-top:10px">
  <div class="kpi"><div class="l">Sangramento à sondagem</div><div class="v" style="color:${s.bopPct >= 30 ? 'var(--bad)' : s.bopPct >= 10 ? 'var(--warn)' : 'var(--ok)'}">${s.bopPct}%</div></div>
  <div class="kpi"><div class="l">Índice de placa</div><div class="v">${s.plPct}%</div></div>
  <div class="kpi"><div class="l">PS média</div><div class="v">${f1(s.pdMean)} mm</div></div>
  <div class="kpi"><div class="l">Sítios PS 4–5 / ≥ 6</div><div class="v">${s.s4} / ${s.s6}</div></div></div>
  <p class="small" style="margin:12px 0 0"><b>Sugestão diagnóstica:</b> ${s.dx}</p>
  <p class="tiny muted" style="margin:4px 0 0">${s.present} dente(s) presentes · ${s.mob} com mobilidade · ${s.fur} com envolvimento de furca${s.deep.length ? ' · bolsas ≥ 6 mm: ' + s.deep.join(', ') : ''}. Classificação AAP/EFP 2018 aproximada; confirmar com radiografias, histórico de perda dentária e fatores de complexidade e risco (grau).</p></div>`;
async function perioView(p, r, list, missing) {
  const s = perioStats(r.data, missing); const T = r.data.teeth || {};
  const line = (teeth, f) => teeth.map(t => T[t]?.aus ? '<td class="aus">—</td>' : `<td>${siteOrder(t, f).map(i => { const v = T[t]?.pd?.[i]; return `<span class="${perioCls(v)}${T[t]?.bop?.[i] ? ' bl' : ''}">${v ?? '·'}</span>`; }).join('')}</td>`).join('');
  return html`<div class="card"><div class="row between"><h2>Periograma de ${fDT(r.created_at)}</h2><div class="row"><a class="btn sm" href="#/paciente/${p.id}?tab=periograma">${icon('back')} Voltar</a><button class="btn sm" data-act="perioPrint" data-id="${r.id}">${icon('print')} Imprimir</button></div></div>
    <div class="tblwrap" style="margin-top:10px"><table class="perio view"><tr><th></th>${ODO_ARCH.UP.map(t => html`<th class="tn">${t}</th>`)}</tr><tr><th>V</th>${raw(line(ODO_ARCH.UP, 'V'))}</tr><tr><th>P</th>${raw(line(ODO_ARCH.UP, 'L'))}</tr>
    <tr><th></th>${ODO_ARCH.LP.map(t => html`<th class="tn">${t}</th>`)}</tr><tr><th>L</th>${raw(line(ODO_ARCH.LP, 'L'))}</tr><tr><th>V</th>${raw(line(ODO_ARCH.LP, 'V'))}</tr></table></div>
    <p class="tiny muted">Valores = PS (mm). Sublinhado vermelho = sangramento.</p>${r.data.notes ? html`<p class="small"><b>Observações:</b> ${r.data.notes}</p>` : ''}</div>${perioSummaryCard(s)}`;
}
onInput('perioIn', (form, e) => {
  const el = e.target; if (el.dataset.k === 'pd') { const v = num(el.value); el.classList.toggle('w', v != null && v >= 4 && v < 6); el.classList.toggle('b', v != null && v >= 6); }
  if (el.dataset.k === 'aus') form.querySelectorAll(`td[data-t="${el.name.slice(4)}"]`).forEach(td => td.classList.toggle('aus', el.checked));
  if (el.classList.contains('pin') && /^\d$/.test(el.value) && el.dataset.k === 'pd' && el.value !== '1') { const all = [...form.querySelectorAll('input.pin[data-k="pd"]')]; const nx = all[all.indexOf(el) + 1]; nx && nx.focus(); }
});
onForm('savePerio', async d => {
  const data = perioFromForm(d); if (!Object.keys(data.teeth).length) throw new Error('Preencha pelo menos um dente.');
  const bad = Object.values(data.teeth).flatMap(x => x.pd).filter(v => v != null && (v < 0 || v > 15)); if (bad.length) throw new Error('Profundidade de sondagem deve estar entre 0 e 15 mm.');
  await db.insert('dental_records', { patient_id: d.patient_id, kind: 'periograma', data, created_by: Auth.userId(), professional_name: S.me.full_name });
  const s = perioStats(data); await db.insert('evolutions', { patient_id: d.patient_id, content: `Periograma realizado. Sangramento à sondagem ${s.bopPct}%, índice de placa ${s.plPct}%, PS média ${f1(s.pdMean)} mm, ${s.s4 + s.s6} sítio(s) com PS ≥ 4 mm. ${s.dx}`, professional_id: Auth.userId(), professional_name: S.me.full_name });
  toast('Periograma salvo e registrado na evolução.', 'ok'); go(`#/paciente/${d.patient_id}?tab=periograma`);
});
act('dentalDel', async el => { if (await confirmBox('Excluir este registro?', 'Excluir')) { await db.remove('dental_records', el.dataset.id); router(); } });
act('perioPrint', async el => {
  const r = await db.get('dental_records', el.dataset.id); const p = await db.get('patients', r.patient_id); const T = r.data.teeth || {}; const s = perioStats(r.data);
  const tbl = (teeth, faces) => `<table style="font:10px Arial,sans-serif;text-align:center"><tr><th></th>${teeth.map(t => `<th>${t}</th>`).join('')}</tr>${faces.map(([f, l]) => ['pd', 'rec', 'bop'].map(k => `<tr><th style="text-align:left">${l} ${{ pd: 'PS', rec: 'Rec', bop: 'SS' }[k]}</th>${teeth.map(t => T[t]?.aus ? '<td>—</td>' : `<td>${siteOrder(t, f).map(i => { const v = T[t]?.[k]?.[i]; return k === 'bop' ? (v ? '●' : '·') : (v ?? '·'); }).join(' ')}</td>`).join('')}</tr>`).join('')).join('')}<tr><th style="text-align:left">Mob/Furca</th>${teeth.map(t => `<td>${esc(T[t]?.mob || '')}${T[t]?.fur ? '/' + esc(T[t].fur) : ''}</td>`).join('')}</tr></table>`;
  printDoc('Periograma – ' + p.name, `${docHeader()}<h1>Periograma</h1><p><b>Paciente:</b> ${esc(p.name)} · <b>Exame:</b> ${esc(fDT(r.created_at))} · <b>Profissional:</b> ${esc(r.professional_name || '')}</p>${tbl(ODO_ARCH.UP, [['V', 'V'], ['L', 'P']])}<br>${tbl(ODO_ARCH.LP, [['L', 'L'], ['V', 'V']])}
  <p><b>Sangramento:</b> ${s.bopPct}% · <b>Placa:</b> ${s.plPct}% · <b>PS média:</b> ${f1(s.pdMean)} mm · <b>PS 4–5:</b> ${s.s4} · <b>PS ≥ 6:</b> ${s.s6} · <b>NIC interproximal máx.:</b> ${s.maxCal} mm</p><p><b>Sugestão diagnóstica:</b> ${esc(s.dx)}</p>${r.data.notes ? `<p><b>Observações:</b> ${esc(r.data.notes)}</p>` : ''}${signature(r.professional_name || S.me.full_name, councilOf(S.me))}`, 'td,th{padding:2px 3px;border-bottom:1px solid #eee}');
});

/* =================================================================== */
/* EXAME CLÍNICO (extra e intraoral, ATM, oclusão, risco)               */
/* =================================================================== */
const EXAM_SECTIONS = [
  ['Exame extraoral', [['face', 'Face e simetria'], ['pele', 'Pele e lábios'], ['linfonodos', 'Linfonodos (submandibulares e cervicais)'], ['musculos', 'Músculos mastigatórios (palpação)'], ['atm', 'ATM']]],
  ['Exame intraoral', [['mucosa_labial', 'Mucosa labial'], ['mucosa_jugal', 'Mucosa jugal'], ['lingua', 'Língua (dorso, bordas, ventre)'], ['assoalho', 'Assoalho bucal'], ['palato', 'Palato duro e mole'], ['orofaringe', 'Orofaringe e tonsilas'], ['gengiva', 'Gengiva'], ['rebordo', 'Rebordo alveolar'], ['freios', 'Freios labial e lingual'], ['saliva', 'Saliva (fluxo e aspecto)']]],
];
const MORDIDA = ['Aberta anterior', 'Aberta posterior', 'Cruzada anterior', 'Cruzada posterior unilateral', 'Cruzada posterior bilateral', 'Profunda', 'Topo a topo'];
const HABITOS = ['Bruxismo / apertamento', 'Onicofagia', 'Sucção digital / chupeta', 'Respiração bucal', 'Interposição lingual', 'Morder objetos / lábios'];
const ANGLE = ['', 'Classe I', 'Classe II divisão 1', 'Classe II divisão 2', 'Classe III', 'Não se aplica (ausência de molar)'];
function asaSuggest(a) {
  const ii = ['hipertensao', 'diabetes', 'respiratoria', 'fumante', 'etilista', 'gestante', 'anticoagulante', 'epilepsia', 'infecciosa'].filter(k => a[k]);
  if (a.cardiopatia || a.sangramento || ii.length >= 3) return ['III', 'doença sistêmica grave ou várias condições associadas'];
  if (ii.length) return ['II', 'doença sistêmica leve/controlada'];
  return ['I', 'sem condições sistêmicas marcadas na anamnese'];
}
TABRENDER.exame = async (p, q) => {
  const list = await dentalList(p.id, 'exame_clinico'); if (list === null) return migMissing();
  const a = await latestAnam(p.id); const [asa, asaWhy] = asaSuggest(a);
  const ver = q.get('ver'); const cur = ver ? list.find(x => x.id === ver) : list[0]; const novo = q.get('novo') === '1';
  const e = (!novo && cur?.data) || {};
  const sel = (n, opts) => html`<select class="in" name="${n}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o || '—']; return html`<option value="${v}" ${String(e[n] ?? '') === v ? 'selected' : ''}>${l}</option>`; })}</select>`;
  const alt = list[0] ? EXAM_SECTIONS.flatMap(s => s[1]).filter(([k]) => list[0].data[k] === 'alterado') : [];
  return html`${list[0] && !novo ? html`<div class="card"><div class="row between"><h3>Último exame (${fDT(list[0].created_at)})</h3><div class="row"><button class="btn sm" data-act="examPrint" data-id="${list[0].id}">${icon('print')} Imprimir</button><a class="btn sm" href="#/paciente/${p.id}?tab=exame&novo=1">${icon('plus')} Novo em branco</a></div></div>
      <p class="small" style="margin:8px 0 0">${alt.length ? html`<b style="color:var(--bad)">Alterações:</b> ${alt.map(([k, l]) => `${l}${list[0].data[k + '_obs'] ? ' (' + list[0].data[k + '_obs'] + ')' : ''}`).join('; ')}` : 'Sem alterações de tecidos moles registradas.'}${list[0].data.asa ? html` · <b>ASA ${list[0].data.asa}</b>` : ''}${list[0].data.risco_carie ? html` · risco de cárie <b>${list[0].data.risco_carie}</b>` : ''}</p></div>` : ''}
  <form data-form="saveExam" class="stack"><input type="hidden" name="patient_id" value="${p.id}">
    ${EXAM_SECTIONS.map(([title, items]) => html`<div class="card"><h2>${title}</h2><div class="stack" style="margin-top:10px">${items.map(([k, l]) => html`<div class="grid g3 collapse exrow" style="align-items:center"><span class="small" style="font-weight:600">${l}</span>${sel(k, [['normal', 'Normal'], ['alterado', 'Alterado'], ['nao_avaliado', 'Não avaliado']])}<input class="in" name="${k}_obs" placeholder="Descrição (local, tamanho, cor, consistência)" value="${e[k + '_obs'] || ''}"></div>`)}</div>
      ${title === 'Exame extraoral' ? html`<div class="grid g4" style="margin-top:12px"><label class="f"><span>Abertura máxima (mm)</span><input class="in" name="abertura" inputmode="numeric" value="${e.abertura || ''}"></label><label class="f"><span>Ruído na ATM</span>${sel('atm_ruido', [['', '—'], ['ausente', 'Ausente'], ['estalido', 'Estalido'], ['crepitacao', 'Crepitação']])}</label><label class="f"><span>Trajetória de abertura</span>${sel('atm_desvio', [['', '—'], ['retilinea', 'Retilínea'], ['desvio', 'Desvio (volta à linha média)'], ['deflexao', 'Deflexão (não volta)']])}</label><label class="check" style="align-self:end"><input type="checkbox" name="atm_dor" ${e.atm_dor ? 'checked' : ''}> Dor na ATM / musculatura</label></div>` : ''}</div>`)}
    <div class="card"><h2>Oclusão</h2><div class="grid g4" style="margin-top:10px">
      <label class="f"><span>Molar direito (Angle)</span>${sel('angle_d', ANGLE)}</label><label class="f"><span>Molar esquerdo (Angle)</span>${sel('angle_e', ANGLE)}</label>
      <label class="f"><span>Sobressaliência / overjet (mm)</span><input class="in" name="overjet" value="${e.overjet || ''}"></label><label class="f"><span>Sobremordida / overbite (mm)</span><input class="in" name="overbite" value="${e.overbite || ''}"></label></div>
      <label class="f" style="margin-top:10px"><span>Linha média</span>${sel('linha_media', [['', '—'], ['coincidente', 'Coincidente'], ['desviada_d', 'Inferior desviada à direita'], ['desviada_e', 'Inferior desviada à esquerda']])}</label>
      <div class="row" style="margin-top:10px">${MORDIDA.map(m => html`<label class="check"><input type="checkbox" name="mordida" value="${m}" data-multi="1" ${(e.mordida || []).includes(m) ? 'checked' : ''}> ${m}</label>`)}</div></div>
    <div class="card"><h2>Hábitos, higiene e risco</h2>
      <div class="row" style="margin-top:10px">${HABITOS.map(m => html`<label class="check"><input type="checkbox" name="habitos" value="${m}" data-multi="1" ${(e.habitos || []).includes(m) ? 'checked' : ''}> ${m}</label>`)}</div>
      <div class="grid g3 collapse" style="margin-top:12px"><label class="f"><span>Higiene bucal</span>${sel('higiene', [['', '—'], ['boa', 'Boa'], ['regular', 'Regular'], ['deficiente', 'Deficiente']])}</label>
        <label class="f"><span>Risco de cárie</span>${sel('risco_carie', [['', '—'], ['baixo', 'Baixo'], ['moderado', 'Moderado'], ['alto', 'Alto']])}</label>
        <label class="f"><span>Classificação ASA <span class="tiny muted">(sugestão: ASA ${asa} – ${asaWhy})</span></span>${sel('asa', [['', '—'], ['I', 'ASA I – saudável'], ['II', 'ASA II – doença sistêmica leve'], ['III', 'ASA III – doença sistêmica grave'], ['IV', 'ASA IV – ameaça constante à vida']])}</label></div></div>
    <div class="card"><h2>Conclusão</h2><div class="stack" style="margin-top:10px">
      <label class="f"><span>Lesões encontradas</span><textarea class="in" name="lesoes" rows="2" placeholder="Localização, tamanho, forma, cor, consistência, tempo de evolução">${e.lesoes || ''}</textarea></label>
      <label class="check"><input type="checkbox" name="biopsia" ${e.biopsia ? 'checked' : ''}> Indicada biópsia / encaminhamento a estomatologia</label>
      <label class="f"><span>Hipóteses diagnósticas</span><textarea class="in" name="hipoteses" rows="2">${e.hipoteses || ''}</textarea></label>
      <label class="f"><span>Conduta / exames complementares</span><textarea class="in" name="conduta" rows="2" placeholder="Ex.: radiografia panorâmica, periapicais, tomografia">${e.conduta || ''}</textarea></label>
      <div class="row between"><span class="tiny muted">Cada salvamento gera uma nova versão (${list.length} no histórico).</span><button class="btn primary" type="submit">Salvar exame clínico</button></div></div></div></form>
  ${list.length > 1 ? html`<div class="card"><h3>Histórico</h3><div class="list" style="margin-top:8px">${list.map(r => html`<div class="li"><span class="grow small">${fDT(r.created_at)} · ${r.professional_name || ''}</span><a class="btn sm" href="#/paciente/${p.id}?tab=exame&ver=${r.id}">Abrir</a><button class="btn sm" data-act="examPrint" data-id="${r.id}">${icon('print')}</button><button class="btn sm ghost danger" data-act="dentalDel" data-id="${r.id}">${icon('x')}</button></div>`)}</div></div>` : ''}`;
};
onForm('saveExam', async d => {
  const pid = d.patient_id; delete d.patient_id;
  await db.insert('dental_records', { patient_id: pid, kind: 'exame_clinico', data: d, created_by: Auth.userId(), professional_name: S.me.full_name });
  const alt = EXAM_SECTIONS.flatMap(s => s[1]).filter(([k]) => d[k] === 'alterado').map(([k, l]) => l + (d[k + '_obs'] ? ` (${d[k + '_obs']})` : ''));
  await db.insert('evolutions', { patient_id: pid, content: `Exame clínico extra e intraoral: ${alt.length ? 'alterações em ' + alt.join('; ') : 'sem alterações em tecidos moles'}.${d.asa ? ' ASA ' + d.asa + '.' : ''}${d.hipoteses ? ' Hipóteses: ' + d.hipoteses + '.' : ''}${d.conduta ? ' Conduta: ' + d.conduta + '.' : ''}`, professional_id: Auth.userId(), professional_name: S.me.full_name });
  toast('Exame clínico salvo.', 'ok'); go(`#/paciente/${pid}?tab=exame`);
});
act('examPrint', async el => {
  const r = await db.get('dental_records', el.dataset.id); const p = await db.get('patients', r.patient_id); const e = r.data;
  const lab = { normal: 'Normal', alterado: 'Alterado', nao_avaliado: 'Não avaliado' };
  printDoc('Exame clínico – ' + p.name, `${docHeader()}<h1>Exame clínico odontológico</h1><p><b>Paciente:</b> ${esc(p.name)} · <b>Data:</b> ${esc(fDT(r.created_at))}</p>
  ${EXAM_SECTIONS.map(([t, items]) => `<h3>${t}</h3><table>${items.map(([k, l]) => `<tr><td>${esc(l)}</td><td><b>${esc(lab[e[k]] || '—')}</b>${e[k + '_obs'] ? ' – ' + esc(e[k + '_obs']) : ''}</td></tr>`).join('')}</table>`).join('')}
  <p><b>ATM:</b> abertura ${esc(e.abertura || '—')} mm · ruído ${esc(e.atm_ruido || '—')} · trajetória ${esc(e.atm_desvio || '—')}${e.atm_dor ? ' · com dor' : ''}</p>
  <p><b>Oclusão:</b> molar D ${esc(e.angle_d || '—')} · molar E ${esc(e.angle_e || '—')} · overjet ${esc(e.overjet || '—')} mm · overbite ${esc(e.overbite || '—')} mm${(e.mordida || []).length ? ' · ' + esc(e.mordida.join(', ')) : ''}</p>
  <p><b>Hábitos:</b> ${esc((e.habitos || []).join(', ') || '—')} · <b>Higiene:</b> ${esc(e.higiene || '—')} · <b>Risco de cárie:</b> ${esc(e.risco_carie || '—')} · <b>ASA:</b> ${esc(e.asa || '—')}</p>
  ${e.lesoes ? `<p><b>Lesões:</b> ${esc(e.lesoes)}${e.biopsia ? ' – <b>biópsia/encaminhamento indicado</b>' : ''}</p>` : ''}${e.hipoteses ? `<p><b>Hipóteses diagnósticas:</b> ${esc(e.hipoteses)}</p>` : ''}${e.conduta ? `<p><b>Conduta:</b> ${esc(e.conduta)}</p>` : ''}${signature(r.professional_name || S.me.full_name, councilOf(S.me))}`);
});

/* =================================================================== */
/* CALCULADORA ANESTÉSICA                                               */
/* =================================================================== */
/* mgml = mg de sal anestésico por mL; mgkg/max = dose máxima (Malamed / Andrade); vconc = mg/mL (epinefrina) ou UI/mL (felipressina) */
const ANES = [
  { id: 'lido_e100', n: 'Lidocaína 2% c/ epinefrina 1:100.000', mgml: 20, mgkg: 4.4, max: 300, vaso: 'epi', vconc: 0.01 },
  { id: 'lido_e200', n: 'Lidocaína 2% c/ epinefrina 1:200.000', mgml: 20, mgkg: 4.4, max: 300, vaso: 'epi', vconc: 0.005 },
  { id: 'lido_sv', n: 'Lidocaína 2% sem vasoconstritor', mgml: 20, mgkg: 4.4, max: 300 },
  { id: 'mepi_sv', n: 'Mepivacaína 3% sem vasoconstritor', mgml: 30, mgkg: 4.4, max: 300 },
  { id: 'mepi_e100', n: 'Mepivacaína 2% c/ epinefrina 1:100.000', mgml: 20, mgkg: 4.4, max: 300, vaso: 'epi', vconc: 0.01 },
  { id: 'arti_e100', n: 'Articaína 4% c/ epinefrina 1:100.000', mgml: 40, mgkg: 7, max: 500, vaso: 'epi', vconc: 0.01 },
  { id: 'arti_e200', n: 'Articaína 4% c/ epinefrina 1:200.000', mgml: 40, mgkg: 7, max: 500, vaso: 'epi', vconc: 0.005 },
  { id: 'prilo_feli', n: 'Prilocaína 3% c/ felipressina 0,03 UI/mL', mgml: 30, mgkg: 6, max: 400, vaso: 'feli', vconc: 0.03 },
  { id: 'bupi_e200', n: 'Bupivacaína 0,5% c/ epinefrina 1:200.000', mgml: 5, mgkg: 1.3, max: 90, vaso: 'epi', vconc: 0.005 },
];
const ANES_PROFILE = { saudavel: 'Saudável / ASA I–II', cardio: 'Cardiopata, hipertenso controlado ou ASA III', gestante: 'Gestante' };
function anesCalc(f) {
  const a = ANES.find(x => x.id === f.agent); const w = num(f.weight); const vol = num(f.vol) || 1.8;
  if (!a || !(w > 0)) return null;
  const mgTub = a.mgml * vol, byWeight = w * a.mgkg, maxMg = Math.min(byWeight, a.max), byAnes = maxMg / mgTub;
  let byVaso = Infinity, vasoTxt = '';
  if (a.vaso === 'epi') { const lim = f.profile === 'cardio' ? 0.04 : 0.2, per = a.vconc * vol; byVaso = lim / per; vasoTxt = `Epinefrina: ${f1(per, 3)} mg por tubete; limite de ${f1(lim, 2)} mg por sessão${f.profile === 'cardio' ? ' (paciente cardiovascular)' : ''} → ${f1(floor1(byVaso))} tubetes.`; }
  if (a.vaso === 'feli' && f.profile === 'cardio') { const per = a.vconc * vol; byVaso = 0.27 / per; vasoTxt = `Felipressina: ${f1(per, 3)} UI por tubete; limite usual de 0,27 UI em cardiopatas → ${f1(floor1(byVaso))} tubetes.`; }
  const maxT = floor1(Math.min(byAnes, byVaso)); const used = num(f.used) || 0;
  return { a, w, vol, mgTub, byWeight, maxMg, byAnes: floor1(byAnes), byVaso, vasoTxt, maxT, limitedBy: byVaso < byAnes ? 'vasoconstritor' : maxMg < byWeight ? 'dose máxima absoluta' : 'peso', used, remain: Math.max(0, floor1(Math.min(byAnes, byVaso) - used)) };
}
function anesAlerts(f, ctx = {}) {
  const out = []; const a = ctx.anam || {}; const ag = ctx.age;
  const w = num(f.weight);
  if (ctx.pa && (ctx.pa.sis >= 180 || ctx.pa.dia >= 110)) out.push(['bad', `PA ${ctx.pa.sis}/${ctx.pa.dia} mmHg (≥ 180/110): adiar procedimento eletivo e encaminhar ao médico.`]);
  else if (ctx.pa && (ctx.pa.sis >= 160 || ctx.pa.dia >= 100)) out.push(['warn', `PA ${ctx.pa.sis}/${ctx.pa.dia} mmHg: reavaliar antes; limitar vasoconstritor e preferir procedimentos curtos.`]);
  if (f.profile === 'cardio') out.push(['warn', 'Cardiovascular: limitar epinefrina a 0,04 mg (≈ 2 tubetes 1:100.000 ou 4 de 1:200.000), aspirar antes de injetar, injeção lenta, evitar norepinefrina e fio retrator com epinefrina.']);
  if (f.profile === 'gestante') out.push(['warn', 'Gestante: preferir lidocaína 2% c/ epinefrina 1:100.000 (prática usual: até 2 tubetes por sessão). Evitar prilocaína c/ felipressina (efeito ocitócico) e bupivacaína. 2º trimestre é o período mais seguro para procedimentos eletivos.']);
  if (f.agent?.startsWith('arti') && ag != null && ag < 4) out.push(['bad', 'Articaína não é recomendada para menores de 4 anos.']);
  if (f.agent?.startsWith('bupi') && ag != null && ag < 12) out.push(['bad', 'Bupivacaína: evitar em crianças e pacientes com deficiência (anestesia prolongada aumenta o risco de automutilação).']);
  if (f.agent?.startsWith('prilo') || f.agent?.startsWith('arti')) out.push(['', 'Prilocaína e articaína (doses altas) podem causar metemoglobinemia: evitar em pacientes com metemoglobinemia congênita, anemia falciforme ou em uso de paracetamol/sulfonamidas em doses altas.']);
  if (w && w < 30) out.push(['', 'Criança / baixo peso: a dose deve SEMPRE ser calculada pelo peso. Use o menor volume eficaz e anote o total aplicado.']);
  if (a.anticoagulante || a.sangramento) out.push(['warn', 'Anticoagulante / distúrbio de coagulação: preferir técnicas infiltrativas ou intraligamentares; bloqueios (alveolar inferior, alveolar superior posterior) aumentam o risco de hematoma.']);
  if (a.anestesia_reacao) out.push(['bad', 'Anamnese registra reação prévia à anestesia odontológica: investigar o episódio antes (alergia verdadeira é rara; considerar avaliação com alergista).']);
  if (/sulfit|bissulfit/i.test(norm(a.alergias || ''))) out.push(['bad', 'Alergia a sulfitos: evitar anestésicos com vasoconstritor adrenérgico (contêm bissulfito de sódio). Opções: mepivacaína 3% sem vaso ou prilocaína c/ felipressina.']);
  if (a.hipertensao && f.profile !== 'cardio') out.push(['warn', 'Anamnese indica hipertensão: considere o perfil “cardiopata / hipertenso controlado” e afira a PA antes.']);
  if (a.diabetes) out.push(['', 'Diabetes: confirmar glicemia controlada e alimentação antes; epinefrina tem efeito hiperglicemiante discreto.']);
  return out;
}
function anesForm(pre = {}) {
  return html`<form class="stack" data-input="anesCalc" id="anesform" onsubmit="return false">
    <div class="grid g4 collapse">
      <label class="f"><span>Peso (kg) <i>*</i></span><input class="in" name="weight" inputmode="decimal" value="${pre.weight || ''}" placeholder="Ex.: 70"></label>
      <label class="f" style="grid-column:span 2"><span>Anestésico</span><select class="in" name="agent">${ANES.map(x => html`<option value="${x.id}" ${pre.agent === x.id ? 'selected' : ''}>${x.n}</option>`)}</select></label>
      <label class="f"><span>Volume do tubete (mL)</span><input class="in" name="vol" inputmode="decimal" value="${pre.vol || '1,8'}"></label></div>
    <div class="grid g3 collapse"><label class="f"><span>Perfil do paciente</span><select class="in" name="profile">${Object.entries(ANES_PROFILE).map(([k, l]) => html`<option value="${k}" ${pre.profile === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="f"><span>Idade (anos)</span><input class="in" name="age" inputmode="numeric" value="${pre.age ?? ''}"></label>
      <label class="f"><span>Tubetes já aplicados nesta sessão</span><input class="in" name="used" inputmode="decimal" value="${pre.used || ''}" placeholder="0"></label></div>
    <div id="anesout"></div></form>`;
}
function renderAnes(form) {
  const out = form.querySelector('#anesout'); if (!out) return;
  const f = Object.fromEntries([...form.querySelectorAll('[name]')].map(e => [e.name, e.value]));
  const ctx = window.__anesCtx || {}; const ag = num(f.age); const r = anesCalc(f);
  const alerts = anesAlerts(f, { ...ctx, age: ag ?? ctx.age });
  out.innerHTML = fv(html`${r ? html`<div class="anesres"><div><div class="tiny muted">Máximo nesta sessão</div><div class="big">${f1(r.maxT)} <small>tubetes</small></div><div class="small">${f1(r.maxT * r.vol)} mL · ${f1(r.maxT * r.mgTub, 0)} mg de anestésico</div>${r.used ? html`<div class="small" style="margin-top:4px"><b>Restam ${f1(r.remain)} tubete(s)</b> (já aplicados ${f1(r.used)})</div>` : ''}</div>
      <div class="small stack" style="gap:4px"><div>Dose máxima: ${f1(r.a.mgkg)} mg/kg × ${f1(r.w)} kg = ${f1(r.byWeight, 0)} mg ${r.byWeight > r.a.max ? html`→ limitada a <b>${r.a.max} mg</b> (máximo absoluto)` : ''}</div>
      <div>Cada tubete de ${f1(r.vol)} mL contém ${f1(r.mgTub, 1)} mg → ${f1(r.byAnes)} tubetes pelo anestésico.</div>${r.vasoTxt ? html`<div>${r.vasoTxt}</div>` : ''}<div class="tiny muted">Fator limitante: ${r.limitedBy}.</div></div></div>`
    : html`<div class="tip">${icon('bulb')}<span>Informe o peso para calcular.</span></div>`}
    ${alerts.map(([k, t]) => html`<div class="alertline ${k}">${k === 'bad' ? '⛔' : k === 'warn' ? '⚠' : 'ℹ'} ${t}</div>`)}
    ${r ? html`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Comparar todos os anestésicos para ${f1(r.w)} kg</summary><div class="tblwrap"><table class="tbl" style="margin-top:6px"><tr><th>Anestésico</th><th class="num">mg/kg</th><th class="num">Máx. (mg)</th><th class="num">Tubetes</th></tr>${ANES.map(x => { const c = anesCalc({ ...f, agent: x.id }); return html`<tr><td class="small">${x.n}</td><td class="num">${f1(x.mgkg)}</td><td class="num">${f1(c.maxMg, 0)}</td><td class="num"><b>${f1(c.maxT)}</b></td></tr>`; })}</table></div></details>` : ''}
    <p class="tiny muted" style="margin:8px 0 0">Doses máximas de referência (Malamed; Andrade). Não ultrapasse a menor das doses e reduza em idosos, debilitados, hepatopatas e com doença cardiovascular. Ferramenta de apoio: a decisão é do cirurgião-dentista.</p>`);
}
onInput('anesCalc', form => renderAnes(form));
async function anesContext(pid) {
  const [p, a, v] = await Promise.all([db.get('patients', pid), latestAnam(pid), latestVitals(pid)]);
  const peso = v.find(x => x.peso)?.peso, pa = v.find(x => x.pa_sis); const ag = age(p.birth_date);
  const profile = a.gestante && p.sex !== 'M' ? 'gestante' : (a.cardiopatia || a.hipertensao) ? 'cardio' : 'saudavel';
  return { p, anam: a, age: ag, pa: pa ? { sis: pa.pa_sis, dia: pa.pa_dia } : null, pre: { weight: peso ? String(peso).replace('.', ',') : '', profile, age: ag, agent: 'lido_e100' } };
}
act('anesPatient', async el => {
  const ctx = await anesContext(el.dataset.id); window.__anesCtx = ctx;
  const m = modal(`Anestesia – ${ctx.p.name}`, html`${ctx.pa ? html`<div class="tiny muted" style="margin-bottom:8px">Última PA registrada: ${ctx.pa.sis}/${ctx.pa.dia} mmHg</div>` : ''}${anesForm(ctx.pre)}
    <form data-form="saveAnes" class="stack" style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px"><input type="hidden" name="patient_id" value="${ctx.p.id}"><h3>Registrar aplicação na evolução</h3>
      <div class="grid g3 collapse"><label class="f"><span>Técnica</span><select class="in" name="tecnica">${['Infiltrativa (terminal)', 'Bloqueio do nervo alveolar inferior', 'Bloqueio do nervo bucal', 'Bloqueio do nervo lingual', 'Bloqueio do nervo alveolar superior posterior', 'Bloqueio do nervo infraorbitário', 'Bloqueio do nervo nasopalatino', 'Bloqueio do nervo palatino maior', 'Bloqueio do nervo mentual / incisivo', 'Intraligamentar', 'Intrapulpar', 'Tópica'].map(t => html`<option>${t}</option>`)}</select></label>
        <label class="f"><span>Região / dentes</span><input class="in" name="regiao" placeholder="Ex.: 36, 37"></label><label class="f"><span>Tubetes aplicados <i>*</i></span><input class="in" name="qtd" inputmode="decimal" required></label></div>
      <div class="grid g2 collapse"><label class="f"><span>Lote / validade (opcional)</span><input class="in" name="lote"></label><label class="f"><span>Intercorrências</span><input class="in" name="obs" placeholder="Sem intercorrências"></label></div>
      <button class="btn primary" type="submit">${icon('check')} Registrar na evolução</button></form>`, { wide: true });
  renderAnes(m.querySelector('#anesform'));
});
onForm('saveAnes', async d => {
  const f = Object.fromEntries([...document.querySelectorAll('#anesform [name]')].map(e => [e.name, e.value])); const r = anesCalc(f); const qtd = num(d.qtd);
  if (!(qtd > 0)) throw new Error('Informe quantos tubetes foram aplicados.');
  if (r && qtd > r.maxT + (r.used || 0) && !(await confirmBox(`A quantidade informada (${f1(qtd)}) passa do máximo calculado (${f1(r.maxT)}). Registrar mesmo assim?`, 'Registrar'))) return;
  const a = ANES.find(x => x.id === f.agent);
  await db.insert('evolutions', { patient_id: d.patient_id, content: `Anestesia local: ${d.tecnica}${d.regiao ? ' – região ' + d.regiao : ''}, com ${f1(qtd)} tubete(s) de ${a.n} (${f1(qtd * a.mgml * (num(f.vol) || 1.8), 0)} mg${f.weight ? '; máximo calculado para ' + f.weight + ' kg: ' + f1(r?.maxT || 0) + ' tubetes' : ''}). Aspiração prévia negativa.${d.lote ? ' Lote: ' + d.lote + '.' : ''} ${d.obs || 'Sem intercorrências.'}`, professional_id: Auth.userId(), professional_name: S.me.full_name });
  closeModal(); toast('Anestesia registrada na evolução.', 'ok'); go(`#/paciente/${d.patient_id}?tab=evolucao`);
});

/* =================================================================== */
/* PROFILAXIA ANTIBIÓTICA (AHA 2021) E DOSES PEDIÁTRICAS                */
/* =================================================================== */
function atbRegimens(w, child, allergy, oral) {
  const dose = (perKg, adult) => child && w ? Math.min(perKg * w, adult) : adult;
  const R = [];
  if (allergy === 'nao') {
    if (oral) R.push({ n: 'Amoxicilina', mg: dose(50, 2000), via: 'via oral', susp: 50, adult: '4 cápsulas de 500 mg' });
    else R.push({ n: 'Ampicilina', mg: dose(50, 2000), via: 'IM ou IV' }, { n: 'Cefazolina ou ceftriaxona', mg: dose(50, 1000), via: 'IM ou IV' });
  } else if (oral) {
    if (allergy === 'leve') R.push({ n: 'Cefalexina', mg: dose(50, 2000), via: 'via oral', susp: 50, adult: '4 cápsulas de 500 mg', note: 'Só se a alergia à penicilina NÃO foi anafilaxia, angioedema ou urticária.' });
    R.push({ n: 'Azitromicina', mg: dose(15, 500), via: 'via oral', susp: 40, adult: '1 comprimido de 500 mg' }, { n: 'Claritromicina', mg: dose(15, 500), via: 'via oral', susp: 50, adult: '1 comprimido de 500 mg' }, { n: 'Doxiciclina', mg: w && w < 45 ? Math.round(2.2 * w) : 100, via: 'via oral', adult: '1 comprimido de 100 mg' });
  } else R.push({ n: 'Cefazolina ou ceftriaxona', mg: dose(50, 1000), via: 'IM ou IV', note: allergy === 'grave' ? 'Evitar cefalosporinas se houve anafilaxia, angioedema ou urticária com penicilina.' : '' });
  return R;
}
const ATB_IND = ['Prótese valvar cardíaca (inclui TAVI) ou material protético usado no reparo valvar', 'Endocardite infecciosa prévia', 'Cardiopatia congênita cianótica não reparada ou reparada com defeito residual / material protético (até 6 meses ou com shunt residual)', 'Transplante cardíaco com valvulopatia'];
function pedRows(w) {
  const D = [
    { n: 'Paracetamol', min: 10, max: 15, int: 'de 6 em 6 horas', cap: 750, forms: [['gotas 200 mg/mL', 200], ['solução oral 32 mg/mL', 32]], obs: 'Máximo de 75 mg/kg/dia (5 doses).' },
    { n: 'Dipirona', min: 10, max: 25, int: 'de 6 em 6 horas', cap: 1000, forms: [['gotas 500 mg/mL', 500], ['solução oral 50 mg/mL', 50]], obs: 'Não usar em menores de 3 meses ou com menos de 5 kg.' },
    { n: 'Ibuprofeno', min: 5, max: 10, int: 'de 6/6 a 8/8 horas', cap: 400, forms: [['gotas 50 mg/mL', 50], ['gotas 100 mg/mL', 100]], obs: 'A partir de 6 meses. Máximo de 40 mg/kg/dia.' },
    { n: 'Amoxicilina (tratamento)', day: 50, div: 3, int: 'de 8 em 8 horas', cap: 500, forms: [['suspensão 250 mg/5 mL', 50], ['suspensão 500 mg/5 mL', 100]], obs: '50 mg/kg/dia ÷ 3 doses, por 7 dias; reavaliar em 48–72 h.' },
    { n: 'Azitromicina', day: 10, div: 1, int: '1 vez ao dia', cap: 500, forms: [['suspensão 200 mg/5 mL', 40]], obs: '10 mg/kg/dia por 3 dias.' },
    { n: 'Metronidazol', day: 30, div: 3, int: 'de 8 em 8 horas', cap: 400, forms: [['suspensão 40 mg/mL', 40]], obs: '30 mg/kg/dia ÷ 3 doses, por 7 dias.' },
  ];
  return D.map(d => { const lo = Math.min(d.day ? d.day / d.div * w : d.min * w, d.cap), hi = Math.min(d.day ? lo : d.max * w, d.cap); return { ...d, lo, hi }; });
}

/* =================================================================== */
/* TERMOS DE CONSENTIMENTO                                              */
/* =================================================================== */
const CONSENTS = {
  exodontia: ['Exodontia (extração dentária)', 'remoção do(s) dente(s) indicado(s), sob anestesia local, podendo incluir incisão, osteotomia, odontosecção e sutura', ['dor, inchaço e hematoma nos dias seguintes', 'sangramento e alveolite (inflamação do alvéolo)', 'parestesia (alteração temporária ou, raramente, permanente da sensibilidade de lábio, língua ou mento), especialmente em terceiros molares inferiores', 'comunicação buco-sinusal em dentes superiores posteriores', 'limitação temporária de abertura da boca', 'fratura de raiz, de tábua óssea ou, raramente, da mandíbula'], 'tratamento de canal, quando viável; acompanhamento clínico/radiográfico; não intervenção, com seus riscos de infecção e dor', 'Seguir as orientações pós-operatórias, não fazer bochechos vigorosos nem usar canudo nas primeiras 24 h, evitar fumo e esforço físico e tomar os medicamentos prescritos.'],
  endodontia: ['Tratamento endodôntico (canal)', 'remoção da polpa dentária, limpeza, modelagem e obturação dos canais radiculares, em uma ou mais sessões', ['dor ou sensibilidade pós-operatória', 'fratura de instrumento no interior do canal', 'perfuração radicular', 'necessidade de retratamento, cirurgia parendodôntica ou extração em caso de insucesso', 'fratura do dente se não for restaurado definitivamente (muitas vezes com coroa)'], 'extração do dente; não intervenção, com risco de infecção, abscesso e perda do dente', 'Fazer a restauração definitiva no prazo indicado e evitar mastigar alimentos duros no dente até a restauração.'],
  implante: ['Implante dentário', 'instalação cirúrgica de implante(s) de titânio no osso, podendo incluir enxerto ósseo, levantamento de seio maxilar e reabertura posterior', ['dor, edema e hematoma pós-operatórios', 'falha de osseointegração e perda do implante', 'parestesia por proximidade de nervos', 'comunicação com seio maxilar ou cavidade nasal', 'peri-implantite (inflamação ao redor do implante) ao longo dos anos', 'necessidade de procedimentos adicionais'], 'prótese removível; prótese fixa sobre dentes; não reposição do dente', 'Manter higiene rigorosa, comparecer às consultas de manutenção e evitar fumo, que aumenta o risco de falha.'],
  clareamento: ['Clareamento dental', 'aplicação de agente clareador (peróxido de hidrogênio ou de carbamida) em consultório e/ou com moldeira em casa', ['sensibilidade dentária durante e após o tratamento', 'irritação gengival', 'resultado variável conforme o tipo de pigmentação', 'restaurações, coroas e facetas existentes não clareiam e podem precisar ser trocadas', 'regressão parcial da cor com o tempo'], 'microabrasão, facetas ou lentes de contato; não realização', 'Evitar alimentos e bebidas com corantes durante o tratamento e seguir o tempo de uso indicado.'],
  ortodontia: ['Tratamento ortodôntico', 'instalação de aparelho fixo ou alinhadores para movimentação dos dentes, com consultas periódicas e contenção ao final', ['desconforto e feridas na mucosa', 'manchas brancas e cáries por higiene deficiente', 'reabsorção radicular', 'problemas de ATM', 'recidiva (retorno parcial) se a contenção não for usada', 'duração maior que a estimada por falta de colaboração ou faltas'], 'não realização do tratamento; tratamento cirúrgico-ortodôntico quando indicado', 'Comparecer às manutenções, manter a higiene e usar elásticos e contenção conforme orientado.'],
  periodontia: ['Tratamento periodontal / cirurgia periodontal', 'raspagem e alisamento radicular, podendo incluir cirurgia gengival (gengivectomia, retalho, enxerto)', ['sensibilidade dentária', 'retração gengival e aumento aparente do tamanho dos dentes', 'sangramento e desconforto', 'mobilidade transitória', 'necessidade de manutenção periódica por toda a vida'], 'apenas controle de placa; não tratamento, com progressão da doença e risco de perda dentária', 'Manter a higiene diária e comparecer às consultas de manutenção periodontal.'],
  protese: ['Prótese dentária', 'confecção de prótese fixa, removível, total ou sobre implantes, com preparos, moldagens e provas', ['sensibilidade em dentes preparados', 'necessidade de tratamento de canal em dente preparado', 'fratura ou descolamento da prótese', 'período de adaptação à fala e à mastigação', 'necessidade de reembasamento ou troca ao longo do tempo'], 'outras modalidades de prótese; implantes; não reposição', 'Seguir as orientações de higiene e uso, e retornar para ajustes e revisões.'],
  anestesia: ['Anestesia local odontológica', 'aplicação de anestésico local injetável na boca para permitir o procedimento sem dor', ['dor ou hematoma no local da injeção', 'dormência prolongada de lábio, língua ou bochecha (cuidado para não morder)', 'parestesia, rara e geralmente temporária', 'palpitação, tontura ou mal-estar passageiro', 'reação alérgica, rara'], 'procedimento sem anestesia, quando possível', 'Não mastigar enquanto a região estiver anestesiada e informar qualquer reação anterior a anestésicos.'],
};
function printConsent(key, p, extra = '') {
  const [t, desc, risks, alt, care] = CONSENTS[key]; const prof = S.me;
  printDoc('Termo de consentimento – ' + t, `${docHeader()}<h1>Termo de consentimento livre e esclarecido</h1><h3 style="text-align:center;margin-top:-10px">${esc(t)}</h3>
  <p>Eu, <b>${esc(p?.name || '_______________________________________________')}</b>${p?.cpf ? `, CPF ${esc(fCPF(p.cpf))}` : ''}${p?.guardian_name ? `, representado(a) por ${esc(p.guardian_name)}` : ''}, declaro que fui informado(a) pelo(a) cirurgião(ã)-dentista <b>${esc(prof.full_name)}</b> ${esc(councilOf(prof))} sobre o procedimento de <b>${esc(t.toLowerCase())}</b>${extra ? ` (${esc(extra)})` : ''}, que consiste em ${esc(desc)}.</p>
  <p>Fui esclarecido(a) de que, como todo procedimento de saúde, ele envolve riscos e possíveis complicações, entre elas:</p><ul>${risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
  <p>Também me foram apresentadas as alternativas: ${esc(alt)}. Entendi que o resultado depende também da minha colaboração. ${esc(care)}</p>
  <p>Tive a oportunidade de fazer perguntas, que foram respondidas de forma clara. Informei corretamente meu histórico de saúde e medicamentos. Sei que posso revogar este consentimento antes da realização do procedimento.</p>
  <p>Assim, autorizo a realização do procedimento descrito, bem como da anestesia local e das medidas necessárias diante de situações imprevistas durante o atendimento.</p>
  <p style="text-align:right;margin-top:18px">${esc(S.clinic.city || '')}, ${esc(fDate(new Date()))}</p><div style="display:flex;gap:30px">${signature(p?.guardian_name || p?.name || 'Paciente', 'Paciente / responsável legal')}${signature(prof.full_name, councilOf(prof))}</div>`);
}
act('consentPatient', async el => {
  const p = await db.get('patients', el.dataset.id);
  modal('Termo de consentimento', html`<form data-form="consentPrint" class="stack"><input type="hidden" name="patient_id" value="${p.id}">
    <label class="f"><span>Procedimento</span><select class="in" name="key">${Object.entries(CONSENTS).map(([k, v]) => html`<option value="${k}">${v[0]}</option>`)}</select></label>
    <label class="f"><span>Dentes / detalhes (opcional)</span><input class="in" name="extra" placeholder="Ex.: dentes 38 e 48"></label>
    <label class="check"><input type="checkbox" name="evo" checked> Registrar na evolução que o termo foi apresentado e assinado</label>
    <button class="btn primary" type="submit">${icon('print')} Imprimir termo</button></form>`);
});
onForm('consentPrint', async d => {
  const p = await db.get('patients', d.patient_id); printConsent(d.key, p, d.extra);
  if (d.evo) await db.insert('evolutions', { patient_id: p.id, content: `Termo de consentimento livre e esclarecido para ${CONSENTS[d.key][0].toLowerCase()}${d.extra ? ' (' + d.extra + ')' : ''} apresentado, explicado e assinado pelo paciente/responsável.`, professional_id: Auth.userId(), professional_name: S.me.full_name });
  closeModal();
});

/* =================================================================== */
/* PÁGINA "FERRAMENTAS DO DENTISTA"                                     */
/* =================================================================== */
const ERUP = [
  ['Incisivo central', '8–12 m', '6–10 m', '7–8 a', '6–7 a'], ['Incisivo lateral', '9–13 m', '10–16 m', '8–9 a', '7–8 a'], ['Canino', '16–22 m', '17–23 m', '11–12 a', '9–10 a'],
  ['1º molar decíduo / 1º pré-molar', '13–19 m', '14–18 m', '10–11 a', '10–12 a'], ['2º molar decíduo / 2º pré-molar', '25–33 m', '23–31 m', '10–12 a', '11–12 a'],
  ['1º molar permanente', '—', '—', '6–7 a', '6–7 a'], ['2º molar permanente', '—', '—', '12–13 a', '11–13 a'], ['3º molar', '—', '—', '17–21 a', '17–21 a'],
];
route('/odontologia', async (_, q) => {
  const tab = q.get('aba') || 'anestesia'; const pid = q.get('p'); const p = pid ? await db.get('patients', pid) : null;
  if (tab === 'anestesia') { window.__anesCtx = p ? await anesContext(p.id) : {}; after(() => { const f = document.getElementById('anesform'); f && renderAnes(f); }); }
  if (tab === 'atb' || tab === 'ped') after(() => { const f = document.getElementById('toolform'); f && INPUTS[f.dataset.input](f); });
  const T = [['anestesia', 'Calculadora anestésica'], ['atb', 'Profilaxia antibiótica'], ['ped', 'Doses pediátricas'], ['termos', 'Termos de consentimento'], ['erupcao', 'Cronologia de erupção']];
  const body = {
    anestesia: () => html`<div class="card"><h2>Calculadora de anestésico local</h2><p class="small muted">Calcula o número máximo de tubetes pelo peso, pela dose máxima absoluta e pelo limite do vasoconstritor. Abra pelo prontuário para trazer peso, PA e anamnese do paciente.</p>${anesForm(window.__anesCtx?.pre || {})}</div>`,
    atb: () => html`<div class="card"><h2>Profilaxia antibiótica para endocardite (AHA 2021)</h2>
      <form id="toolform" data-input="atbCalc" class="stack" onsubmit="return false" style="margin-top:10px"><div class="grid g4 collapse">
        <label class="f"><span>Peso (kg)</span><input class="in" name="w" inputmode="decimal" placeholder="Obrigatório p/ criança"></label>
        <label class="f"><span>Paciente</span><select class="in" name="child"><option value="0">Adulto</option><option value="1">Criança</option></select></label>
        <label class="f"><span>Alergia à penicilina</span><select class="in" name="allergy"><option value="nao">Não</option><option value="leve">Sim, sem anafilaxia/urticária</option><option value="grave">Sim, com anafilaxia/angioedema/urticária</option></select></label>
        <label class="f"><span>Via oral possível</span><select class="in" name="oral"><option value="1">Sim</option><option value="0">Não</option></select></label></div><div id="toolout"></div></form></div>
      <div class="card"><h3>Quando é indicada</h3><p class="small">Somente para pacientes de <b>alto risco</b> submetidos a procedimentos com manipulação de tecido gengival, da região periapical ou perfuração da mucosa:</p><ul class="small">${ATB_IND.map(i => html`<li>${i}</li>`)}</ul>
      <p class="small">Não é indicada para: anestesia em tecido não infectado, radiografias, instalação/ajuste de aparelhos ortodônticos e próteses removíveis, esfoliação de decíduos, trauma de lábio/mucosa. Para próteses articulares, em geral não é recomendada (ADA 2015) — discutir com o ortopedista em casos especiais.</p><p class="tiny muted">Dose única 30–60 min antes. Se esquecida, pode ser dada até 2 h após o procedimento. Clindamicina deixou de ser recomendada (AHA 2021).</p></div>`,
    ped: () => html`<div class="card"><h2>Doses pediátricas por peso</h2><form id="toolform" data-input="pedCalc" class="stack" onsubmit="return false" style="margin-top:10px"><label class="f" style="max-width:220px"><span>Peso da criança (kg)</span><input class="in" name="w" inputmode="decimal" value="${''}"></label><div id="toolout"></div></form></div>`,
    termos: () => html`<div class="card"><h2>Termos de consentimento odontológicos</h2><p class="small muted">Gera o termo com os dados da clínica e do profissional. Pelo prontuário do paciente (botão “Consentimento”) o nome e o CPF já vêm preenchidos.</p>
      <form data-form="consentFree" class="grid g3 collapse" style="align-items:end;margin-top:10px"><label class="f"><span>Procedimento</span><select class="in" name="key">${Object.entries(CONSENTS).map(([k, v]) => html`<option value="${k}">${v[0]}</option>`)}</select></label><label class="f"><span>Nome do paciente</span><input class="in" name="name" value="${p?.name || ''}"></label><button class="btn primary" type="submit">${icon('print')} Imprimir</button></form>
      <div class="list" style="margin-top:14px">${Object.values(CONSENTS).map(c => html`<div class="li">${icon('file')}<span class="grow small"><b>${c[0]}</b><br><span class="tiny muted">Riscos: ${c[2].slice(0, 3).join('; ')}…</span></span></div>`)}</div></div>`,
    erupcao: () => html`<div class="card"><h2>Cronologia de erupção</h2><div class="tblwrap" style="margin-top:10px"><table class="tbl"><tr><th>Dente</th><th>Decíduo sup.</th><th>Decíduo inf.</th><th>Permanente sup.</th><th>Permanente inf.</th></tr>${ERUP.map(r => html`<tr>${r.map((c, i) => i ? html`<td class="small">${c}</td>` : html`<td><b class="small">${c}</b></td>`)}</tr>`)}</table></div>
      <p class="tiny muted">m = meses · a = anos. Médias de referência; variações de até 6 meses (decíduos) ou 1 ano (permanentes) são comuns. Esfoliação dos decíduos: incisivos 6–8 a, caninos e molares 9–12 a.</p>
      <h3 style="margin-top:14px">Notação FDI</h3><p class="small">Permanentes: quadrantes 1 (sup. dir.), 2 (sup. esq.), 3 (inf. esq.), 4 (inf. dir.), dentes 1–8 a partir da linha média. Decíduos: quadrantes 5–8, dentes 1–5.</p></div>`,
  };
  return html`<div class="pagehead"><div class="row">${p ? html`<a class="btn sm back" href="#/paciente/${p.id}">${icon('back')}</a>` : ''}<h1>Ferramentas do dentista${p ? html` <span class="muted small">· ${p.name}</span>` : ''}</h1></div></div>
  <nav class="tabs">${T.map(([k, l]) => html`<a class="${tab === k ? 'on' : ''}" href="#/odontologia?aba=${k}${p ? '&p=' + p.id : ''}">${l}</a>`)}</nav>${body[tab] ? body[tab]() : body.anestesia()}`;
}, 'odonto');

onInput('atbCalc', form => {
  const d = formData(form); const w = num(d.w); const child = d.child === '1'; const out = form.querySelector('#toolout');
  if (child && !w) { out.innerHTML = fv(html`<div class="tip">${icon('bulb')}<span>Informe o peso da criança.</span></div>`); return; }
  const R = atbRegimens(w, child, d.allergy, d.oral === '1');
  out.innerHTML = fv(html`<div class="list" style="margin-top:10px">${R.map((r, i) => html`<div class="li"><span class="grow"><b>${r.n} ${f1(r.mg, 0)} mg</b> <span class="small muted">${r.via}, dose única 30–60 min antes</span>${child && r.susp ? html`<div class="small">≈ ${f1(r.mg / r.susp)} mL da suspensão de ${r.susp * 5} mg/5 mL</div>` : r.adult && !child ? html`<div class="small">${r.adult}</div>` : ''}${r.note ? html`<div class="tiny" style="color:var(--warn)">${r.note}</div>` : ''}</span>${r.via === 'via oral' ? html`<button class="btn sm primary" data-act="atbRx" data-i="${i}">${icon('pill')} Prescrever</button>` : ''}</div>`)}</div>`);
  const when = 'em dose única, 30 a 60 minutos antes do procedimento odontológico.';
  window.__atb = R.map(r => {
    if (child && r.susp) return `<p><b>Uso oral</b></p><p>${esc(r.n)} suspensão oral ${r.susp * 5} mg/5 mL ———— 1 frasco<br>Tomar ${f1(r.mg / r.susp)} mL (${f1(r.mg, 0)} mg), ${when}</p>`;
    const unit = r.n === 'Doxiciclina' ? '100 mg' : '500 mg'; const [qty, form] = (r.adult || '').split(' ');
    const take = child ? `${f1(r.mg, 0)} mg` : `${qty} ${form} (${f1(r.mg, 0)} mg)`;
    return `<p><b>Uso oral</b></p><p>${esc(r.n)} ${unit} ———— ${esc(qty || '1')} ${esc(form || 'unidade')}<br>Tomar ${esc(take)}, ${when}</p>`;
  });
});
act('atbRx', el => { window.__rxPrefill = window.__atb?.[+el.dataset.i]; const pid = currentQuery().get('p'); go(`#/prescrever${pid ? '?p=' + pid : ''}`); });
onInput('pedCalc', form => {
  const w = num(formData(form).w); const out = form.querySelector('#toolout');
  if (!(w > 0)) { out.innerHTML = fv(html`<div class="tip">${icon('bulb')}<span>Informe o peso para calcular.</span></div>`); return; }
  out.innerHTML = fv(html`<div class="tblwrap" style="margin-top:10px"><table class="tbl"><tr><th>Medicamento</th><th>Dose por tomada</th><th>Volume</th><th>Intervalo</th></tr>${pedRows(w).map(r => html`<tr><td><b class="small">${r.n}</b><div class="tiny muted">${r.obs}</div></td><td class="small">${r.lo === r.hi ? f1(r.lo, 0) : f1(r.lo, 0) + '–' + f1(r.hi, 0)} mg${r.hi >= r.cap ? html` <span class="tiny muted">(teto adulto)</span>` : ''}</td><td class="small">${r.forms.map(([l, c]) => html`<div>${r.lo === r.hi ? f1(r.lo / c) : f1(r.lo / c) + '–' + f1(r.hi / c)} mL <span class="tiny muted">${l}</span></div>`)}</td><td class="small">${r.int}</td></tr>`)}</table></div>
    <p class="tiny muted">Concentrações variam entre fabricantes: confira a bula do produto antes de converter mL em gotas. Doses de referência para crianças sem comorbidades; ajuste em insuficiência renal/hepática.</p>`);
});
onForm('consentFree', d => printConsent(d.key, { name: d.name }));
