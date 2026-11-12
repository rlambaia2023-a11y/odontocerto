/* ===== Financeiro, Precificador, Convênios, Relatórios, Estoque, Marketing, CRM, Ideias, Configurações ===== */
const METHODS = { pix: 'Pix', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito', boleto: 'Boleto', transferencia: 'Transferência', convenio: 'Convênio' };
const payMethodSelect = (v = 'pix') => html`<select class="in" name="method">${Object.entries(METHODS).map(([k, l]) => html`<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`)}</select>`;
const parseMoney = s => { s = String(s ?? '').trim(); if (!s) return NaN; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return parseFloat(s); };
const CATS = { receita: ['Procedimentos', 'Consultas', 'Convênios', 'Outras receitas'], despesa: ['Aluguel', 'Materiais', 'Laboratório', 'Salários', 'Impostos', 'Contas', 'Marketing', 'Equipamentos', 'Outras despesas'] };

function financeTable(rows, pm = {}) {
  const T = ymd(new Date());
  if (!rows.length) return html`<div class="card empty">${icon('money')}<div>Nenhum lançamento.</div></div>`;
  return html`<div class="tblwrap"><table class="tbl"><tr><th>Venc.</th><th>Descrição</th><th class="hide-m">Categoria</th><th class="num">Valor</th><th>Situação</th><th></th></tr>
  ${rows.map(f => html`<tr><td class="small">${fDate(f.due_date)}</td><td>${f.description}${f.patient_id && pm[f.patient_id] ? html`<div class="tiny"><a href="#/paciente/${f.patient_id}?tab=financeiro">${pm[f.patient_id].name}</a></div>` : ''}</td><td class="hide-m small muted">${f.category || ''}</td>
  <td class="num" style="color:${f.kind === 'receita' ? 'var(--ok)' : 'var(--bad)'};font-weight:700">${f.kind === 'despesa' ? '− ' : ''}${BRL(f.amount)}</td>
  <td>${f.paid_at ? html`<span class="pill ok">${f.kind === 'receita' ? 'Recebido' : 'Pago'} ${fDate(f.paid_at).slice(0, 5)}</span>` : f.due_date < T ? html`<span class="pill bad">Vencido</span>` : html`<span class="pill gray">Em aberto</span>`}</td>
  <td class="num">${!f.paid_at ? html`<button class="btn sm ok" data-act="payEntry" data-id="${f.id}" title="Baixar">${icon('check')}</button>` : html`<button class="btn sm" data-act="unpayEntry" data-id="${f.id}" title="Estornar baixa">${icon('repeat')}</button>`} <button class="btn sm" data-act="editEntry" data-id="${f.id}">${icon('edit')}</button></td></tr>`)}</table></div>`;
}

/* ---------- FINANCEIRO ---------- */
route('/financeiro', async (_, q) => {
  const now = new Date(); const m = q.get('m') || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; const [y, mo] = m.split('-').map(Number);
  const from = ymd(new Date(y, mo - 1, 1)), to = ymd(new Date(y, mo, 0)); const kind = q.get('k') || 'todos', st = q.get('s') || 'todos'; const T = ymd(now);
  let rows = await db.list('finance_entries', { gte: { due_date: from }, lte: { due_date: to }, order: 'due_date,created_at' });
  const pm = await patientMap(rows.map(r => r.patient_id));
  const rec = rows.filter(r => r.kind === 'receita'), des = rows.filter(r => r.kind === 'despesa');
  const kp = { prev: sum(rec, r => r.amount), recebido: sum(rec.filter(r => r.paid_at), r => r.amount), despesas: sum(des, r => r.amount), pagas: sum(des.filter(r => r.paid_at), r => r.amount) };
  const cats = Object.entries(groupBy(des, r => r.category || 'Outras despesas')).map(([k, v]) => [k, sum(v, r => r.amount)]).sort((a, b) => b[1] - a[1]); const maxc = Math.max(1, ...cats.map(c => c[1]));
  rows = rows.filter(r => (kind === 'todos' || r.kind === kind) && (st === 'todos' || (st === 'pagos' ? !!r.paid_at : st === 'abertos' ? !r.paid_at : (!r.paid_at && r.due_date < T))));
  const mlink = (dm, k = kind, s = st) => { const d = new Date(y, mo - 1 + dm, 1); return `#/financeiro?m=${d.getFullYear()}-${pad(d.getMonth() + 1)}&k=${k}&s=${s}`; };
  if (q.get('novo')) after(async () => ACT.newEntry({ dataset: { kind: q.get('novo'), p: q.get('p') || '' } }));
  return html`<div class="pagehead"><h1>Financeiro</h1><div class="row"><button class="btn" data-act="sReceipt">${icon('clip')} Anexar comprovante</button><button class="btn" data-act="newEntry" data-kind="despesa">${icon('receipt')} Lançar despesa</button><button class="btn primary" data-act="newEntry" data-kind="receita">${icon('money')} Receber pagamento</button></div></div>
  <div class="row" style="margin-bottom:12px"><a class="btn sm" href="${mlink(-1)}">${icon('chevl')}</a><b style="min-width:150px;text-align:center;text-transform:capitalize">${new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b><a class="btn sm" href="${mlink(1)}">${icon('chev')}</a></div>
  ${await staffReceiptsBlock()}
  <div class="grid g4"><div class="card kpi"><div class="l">Receitas previstas</div><div class="v">${BRL(kp.prev)}</div></div><div class="card kpi"><div class="l">Recebido</div><div class="v" style="color:var(--ok)">${BRL(kp.recebido)}</div></div><div class="card kpi"><div class="l">Despesas</div><div class="v" style="color:var(--bad)">${BRL(kp.despesas)}</div><div class="tiny muted">pagas ${BRL(kp.pagas)}</div></div><div class="card kpi"><div class="l">Resultado (caixa)</div><div class="v">${BRL(kp.recebido - kp.pagas)}</div></div></div>
  <div class="grid g3 collapse" style="margin-top:14px;align-items:start"><div style="grid-column:span 2" class="stack">
    <div class="row between"><div class="seg">${[['todos', 'Tudo'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([k, l]) => html`<a class="${kind === k ? 'on' : ''}" href="${mlink(0, k, st)}">${l}</a>`)}</div><div class="seg">${[['todos', 'Todos'], ['abertos', 'Abertos'], ['vencidos', 'Vencidos'], ['pagos', 'Pagos']].map(([k, l]) => html`<a class="${st === k ? 'on' : ''}" href="${mlink(0, kind, k)}">${l}</a>`)}</div></div>
    ${financeTable(rows, pm)}</div>
    <div class="card"><h3>Despesas por categoria</h3>${cats.length ? cats.map(([c, v]) => html`<div style="margin-top:10px"><div class="row between small"><span>${c}</span><b>${BRL(v)}</b></div><div class="bar"><i style="width:${v / maxc * 100}%;background:var(--accent)"></i></div></div>`) : html`<p class="muted small">Sem despesas no mês.</p>`}</div></div>`;
}, 'financeiro');

async function entryForm(f) {
  const p = f.patient_id ? await db.get('patients', f.patient_id) : null;
  return html`<form data-form="saveEntry" class="stack"><input type="hidden" name="id" value="${f.id || ''}"><input type="hidden" name="kind" value="${f.kind}">
    <label class="f"><span>Descrição <i>*</i></span><input class="in" name="description" required value="${f.description || ''}"></label>
    ${f.kind === 'receita' ? html`<label class="f"><span>Paciente</span>${patientPicker(p, { allowNew: false, required: false })}</label>` : ''}
    <div class="grid g2"><label class="f"><span>Valor (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required value="${f.amount ? String(f.amount).replace('.', ',') : ''}"></label><label class="f"><span>Vencimento</span><input class="in" type="date" name="due_date" required value="${f.due_date || ymd(new Date())}"></label></div>
    <div class="grid g2"><label class="f"><span>Categoria</span><input class="in" name="category" list="cats" value="${f.category || (f.kind === 'receita' ? 'Procedimentos' : '')}" placeholder="Escolha ou digite"><datalist id="cats">${CATS[f.kind].map(c => html`<option>${c}</option>`)}</datalist></label><label class="f"><span>Forma de pagamento</span>${payMethodSelect(f.method || 'pix')}</label></div>
    <label class="check"><input type="checkbox" name="paid" ${f.paid_at || !f.id ? 'checked' : ''}> Já foi ${f.kind === 'receita' ? 'recebido' : 'pago'}</label>
    ${!f.id ? html`<label class="f"><span>Repetir mensalmente (lançamentos fixos)</span><select class="in" name="repeat">${[1, 2, 3, 6, 12].map(n => html`<option value="${n}">${n === 1 ? 'Não repetir' : n + ' meses'}</option>`)}</select></label>` : ''}
    <div class="row between">${f.id ? html`<button type="button" class="btn danger" data-act="delEntry" data-id="${f.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`;
}
act('newEntry', async el => modal(el.dataset.kind === 'receita' ? 'Receber pagamento' : 'Lançar despesa', await entryForm({ kind: el.dataset.kind || 'receita', patient_id: el.dataset.p || null })));
act('editEntry', async el => { const f = await db.get('finance_entries', el.dataset.id); modal('Editar lançamento', await entryForm(f)); });
act('delEntry', async el => { if (await confirmBox('Excluir este lançamento?', 'Excluir')) { await db.remove('finance_entries', el.dataset.id); closeModal(); router(); } });
act('payEntry', async el => { await db.update('finance_entries', el.dataset.id, { paid_at: ymd(new Date()) }); toast('Baixa registrada.', 'ok'); router(); });
act('unpayEntry', async el => { await db.update('finance_entries', el.dataset.id, { paid_at: null }); router(); });
onForm('saveEntry', async d => {
  const amount = parseMoney(d.amount); if (!(amount > 0)) throw new Error('Informe um valor maior que zero.');
  const row = { kind: d.kind, description: d.description, amount, due_date: d.due_date, category: nz(d.category), method: d.method, patient_id: nz(d.patient_id), paid_at: d.paid ? d.due_date <= ymd(new Date()) ? d.due_date : ymd(new Date()) : null };
  if (d.id) await db.update('finance_entries', d.id, row);
  else { const n = +d.repeat || 1; const rows = []; for (let i = 0; i < n; i++) { const due = parseYmd(d.due_date); due.setMonth(due.getMonth() + i); rows.push({ ...row, due_date: ymd(due), paid_at: i === 0 ? row.paid_at : null, description: n > 1 ? `${d.description} (${i + 1}/${n})` : d.description }); } await db.insert('finance_entries', rows); }
  closeModal(); toast('Lançamento salvo.', 'ok'); if (location.hash.includes('novo=')) go('#/financeiro'); else router();
});

/* ---------- PRECIFICADOR ---------- */
const calcProc = p => { const cost = (+p.material_cost || 0) + (+p.hour_cost || 0) * (+p.duration_min || 0) / 60; const k = 1 - ((+p.tax_pct || 0) + (+p.margin_pct || 0)) / 100; const sug = k > 0 ? cost / k : NaN; const price = +p.price || 0; const real = price ? (price - cost - price * (+p.tax_pct || 0) / 100) / price * 100 : 0; return { cost, sug, real }; };
route('/precificador', async () => {
  await refreshRefs(); const procs = S.procedures;
  return html`<div class="pagehead"><h1>Precificador</h1><button class="btn primary" data-act="editProc" data-id="">${icon('plus')} Novo procedimento</button></div>
  <div class="card"><h2>Custo da hora clínica</h2><p class="small muted">Some os custos fixos do mês e divida pelas horas que você realmente atende. Esse valor entra no custo de cada procedimento.</p>
    <form data-form="hourCost" class="grid g4" style="align-items:end"><label class="f"><span>Custos fixos mensais (R$)</span><input class="in" name="fixed" inputmode="decimal" placeholder="Ex.: 9000" data-input="hcCalc"></label><label class="f"><span>Horas clínicas por mês</span><input class="in" name="hours" inputmode="decimal" placeholder="Ex.: 120" data-input="hcCalc"></label>
    <div><div class="small muted">Custo por hora</div><div class="kpi"><div class="v" id="hcout">—</div></div></div><button class="btn" type="submit">Aplicar a todos</button></form></div>
  <div class="tblwrap" style="margin-top:14px"><table class="tbl"><tr><th>Procedimento</th><th class="hide-m">Tempo</th><th class="num">Custo</th><th class="num">Sugerido</th><th class="num">Preço</th><th class="num">Margem real</th><th></th></tr>
  ${procs.map(p => { const c = calcProc(p); return html`<tr style="${p.active ? '' : 'opacity:.5'}"><td><b>${p.name}</b><div class="tiny muted">${p.category || ''}</div></td><td class="hide-m small">${p.duration_min} min</td><td class="num">${BRL(c.cost)}</td><td class="num">${isFinite(c.sug) ? BRL(c.sug) : '—'}</td><td class="num"><b>${BRL(p.price)}</b></td><td class="num"><span class="pill ${c.real < 0 ? 'bad' : c.real < 15 ? 'warn' : 'ok'}">${c.real.toFixed(0)}%</span></td><td class="num"><div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-act="editProc" data-id="${p.id}" title="Editar">${icon('edit')}</button><button class="btn sm danger" data-act="delProc" data-id="${p.id}" title="Excluir">${icon('trash')}</button></div></td></tr>`; })}</table></div>
  ${procs.length ? '' : html`<div class="card empty" style="margin-top:10px">Nenhum procedimento cadastrado.</div>`}`;
}, 'precificador');
onInput('hcCalc', el => { const f = el.form; const v = parseMoney(f.fixed.value) / parseMoney(f.hours.value); document.getElementById('hcout').textContent = isFinite(v) && v > 0 ? BRL(v) : '—'; });
onForm('hourCost', async d => { const v = Math.round(parseMoney(d.fixed) / parseMoney(d.hours) * 100) / 100; if (!(v > 0)) throw new Error('Preencha os dois campos.'); if (!(await confirmBox(`Aplicar custo de ${BRL(v)}/hora a todos os procedimentos?`, 'Aplicar'))) return; for (const p of S.procedures) await db.update('procedures', p.id, { hour_cost: v }); toast('Custo da hora atualizado.', 'ok'); router(); });
act('editProc', el => {
  const p = S.procedures.find(x => x.id === el.dataset.id) || { duration_min: 30, material_cost: 0, hour_cost: S.procedures[0]?.hour_cost || 120, tax_pct: 6, margin_pct: 30, price: '', active: true };
  modal(p.id ? 'Editar procedimento' : 'Novo procedimento', html`<form data-form="saveProc" class="stack" id="procf"><input type="hidden" name="id" value="${p.id || ''}">
  <div class="grid g2"><label class="f"><span>Nome <i>*</i></span><input class="in" name="name" required value="${p.name || ''}"></label><label class="f"><span>Especialidade</span><input class="in" name="category" list="pcats" value="${p.category || ''}"><datalist id="pcats">${['Clínica geral', 'Dentística', 'Periodontia', 'Endodontia', 'Cirurgia', 'Prótese', 'Implantodontia', 'Ortodontia', 'Odontopediatria', 'Estética', 'Prevenção'].map(c => html`<option>${c}</option>`)}</datalist></label></div>
  <div class="grid g3">${[['duration_min', 'Tempo (min)'], ['material_cost', 'Material (R$)'], ['hour_cost', 'Custo hora (R$)'], ['tax_pct', 'Impostos/taxas (%)'], ['margin_pct', 'Margem desejada (%)'], ['price', 'Preço de venda (R$)']].map(([k, l]) => html`<label class="f"><span>${l}</span><input class="in" name="${k}" inputmode="decimal" value="${p[k] ?? ''}" data-input="procCalc"></label>`)}</div>
  <div class="tip" id="proccalc"></div><label class="f"><span>Código (TUSS/interno)</span><input class="in" name="code" value="${p.code || ''}"></label>
  <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Ativo</label><div class="row between"><div class="row" style="gap:8px">${p.id ? html`<button type="button" class="btn danger" data-act="delProc" data-id="${p.id}">${icon('trash')} Excluir</button>` : ''}<button type="button" class="btn" data-act="useSug">Usar preço sugerido</button></div><button class="btn primary" type="submit">Salvar</button></div></form>`);
  INPUTS.procCalc(document.querySelector('#procf [name=price]'));
});
onInput('procCalc', el => { const f = formData(el.form); const n = {}; Object.keys(f).forEach(k => (n[k] = parseMoney(f[k]))); const c = calcProc(n); el.form.dataset.sug = isFinite(c.sug) ? c.sug.toFixed(2) : ''; document.getElementById('proccalc').innerHTML = fv(html`<span>Custo ${BRL(c.cost)} · Sugerido <b>${isFinite(c.sug) ? BRL(c.sug) : 'margem + impostos ≥ 100%'}</b> · Margem real com o preço atual <b>${c.real.toFixed(1)}%</b></span>`); });
act('useSug', el => { const f = el.closest('form'); if (f.dataset.sug) { f.price.value = f.dataset.sug.replace('.', ','); INPUTS.procCalc(f.price); } });
onForm('saveProc', async d => {
  const row = { name: d.name, category: nz(d.category), code: nz(d.code), active: !!d.active }; for (const k of ['duration_min', 'material_cost', 'hour_cost', 'tax_pct', 'margin_pct', 'price']) { const v = parseMoney(d[k]); if (!(v >= 0)) throw new Error('Confira os valores numéricos.'); row[k] = k === 'duration_min' ? Math.max(1, Math.round(v)) : v; }
  if (d.id) await db.update('procedures', d.id, row); else await db.insert('procedures', row); await refreshRefs(); closeModal(); toast('Procedimento salvo.', 'ok'); router();
});

act('delProc', async el => {
  const p = S.procedures.find(x => x.id === el.dataset.id); if (!p) return;
  if (!(await confirmBox(`Excluir "${p.name}" do precificador?`, 'Excluir'))) return;
  try { await db.remove('procedures', p.id); toast('Procedimento excluído.', 'ok'); }
  catch (err) {
    /* já usado em plano de tratamento: o banco não deixa apagar, então sai da lista de ativos */
    if (!/foreign|referenc|viola|23503|constraint/i.test(err.message)) throw err;
    await db.update('procedures', p.id, { active: false });
    toast('Esse procedimento já está em planos de pacientes, então não dá para apagar. Ele foi desativado e não aparece mais para novos planos.');
  }
  await refreshRefs(); closeModal(); router();
});

/* ---------- CONVÊNIOS ---------- */
route('/convenios', async () => {
  await refreshRefs(); const pats = await db.list('patients', { select: 'id,insurance_id' }); const cnt = groupBy(pats, p => p.insurance_id || 'none');
  return html`<div class="pagehead"><h1>Convênios</h1><button class="btn primary" data-act="editIns" data-id="">${icon('plus')} Novo convênio</button></div>
  <div class="list">${S.insurances.map(i => html`<div class="li">${icon('building')}<span class="grow"><span class="t">${i.name} ${!i.active ? html`<span class="pill gray">inativo</span>` : ''}</span><span class="tiny muted">${i.ans_code ? 'ANS ' + i.ans_code + ' · ' : ''}${+i.discount_pct ? 'desconto de tabela ' + i.discount_pct + '% · ' : ''}${(cnt[i.id] || []).length + (i.name === 'Particular' ? (cnt.none || []).length : 0)} paciente(s)</span></span><button class="btn sm" data-act="editIns" data-id="${i.id}">${icon('edit')}</button></div>`)}</div>`;
}, 'convenios');
act('editIns', el => { const i = S.insurances.find(x => x.id === el.dataset.id) || { active: true };
  modal(i.id ? 'Editar convênio' : 'Novo convênio', html`<form data-form="saveIns" class="stack"><input type="hidden" name="id" value="${i.id || ''}"><label class="f"><span>Nome <i>*</i></span><input class="in" name="name" required value="${i.name || ''}"></label>
  <div class="grid g3"><label class="f"><span>Registro ANS</span><input class="in" name="ans_code" value="${i.ans_code || ''}"></label><label class="f"><span>Telefone</span><input class="in" name="phone" value="${i.phone || ''}"></label><label class="f"><span>Desconto de tabela (%)</span><input class="in" name="discount_pct" inputmode="decimal" value="${i.discount_pct || 0}"></label></div>
  <label class="f"><span>Observações (prazos, glosas, contato)</span><textarea class="in" name="notes">${i.notes || ''}</textarea></label><label class="check"><input type="checkbox" name="active" ${i.active ? 'checked' : ''}> Ativo</label>
  <div class="row between">${i.id && i.name !== 'Particular' ? html`<button type="button" class="btn danger" data-act="delIns" data-id="${i.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`); });
onForm('saveIns', async d => { const row = { name: d.name, ans_code: nz(d.ans_code), phone: nz(d.phone), discount_pct: parseMoney(d.discount_pct) || 0, notes: nz(d.notes), active: !!d.active }; if (d.id) await db.update('insurances', d.id, row); else await db.insert('insurances', row); closeModal(); router(); });
act('delIns', async el => { if (await confirmBox('Excluir o convênio? Os pacientes vinculados passam a "Particular".', 'Excluir')) { await db.remove('insurances', el.dataset.id); closeModal(); router(); } });

/* ---------- RELATÓRIOS ---------- */
route('/relatorios', async (_, q) => {
  const now = new Date(); const from = q.get('de') || ymd(new Date(now.getFullYear(), now.getMonth(), 1)); const to = q.get('ate') || ymd(now);
  const tsFrom = parseYmd(from).toISOString(), tsTo = addDays(parseYmd(to), 1).toISOString();
  const [ap, fin, items, pats, evs] = await Promise.all([db.list('appointments', { gte: { starts_at: tsFrom }, lt: { starts_at: tsTo } }), db.list('finance_entries', { gte: { due_date: from }, lte: { due_date: to } }), db.list('treatment_items', { eq: { status: 'realizado' }, gte: { done_at: tsFrom }, lt: { done_at: tsTo } }), db.list('patients', { gte: { created_at: tsFrom }, lt: { created_at: tsTo } }), db.list('evolutions', { gte: { created_at: tsFrom }, lt: { created_at: tsTo }, select: 'id,professional_name' })]);
  const byStatus = groupBy(ap, a => a.status); const fechados = ap.filter(a => ['atendido', 'faltou'].includes(a.status)).length; const faltas = (byStatus.faltou || []).length;
  const rec = fin.filter(f => f.kind === 'receita' && f.paid_at), des = fin.filter(f => f.kind === 'despesa' && f.paid_at);
  const byMethod = Object.entries(groupBy(rec, f => f.method || 'outro')).map(([k, v]) => [METHODS[k] || k, sum(v, f => f.amount)]);
  const byCat = Object.entries(groupBy(des, f => f.category || 'Outras')).map(([k, v]) => [k, sum(v, f => f.amount)]);
  const byProc = Object.entries(groupBy(items, i => i.description)).map(([k, v]) => [k, v.length, sum(v, i => i.price)]).sort((a, b) => b[2] - a[2]);
  const byOrigin = Object.entries(groupBy(pats, p => p.origin || 'Não informado')).map(([k, v]) => [k, v.length]);
  const byPro = Object.entries(groupBy(evs, e => e.professional_name || '—')).map(([k, v]) => [k, v.length]);
  const tbl = (head, rows) => rows.length ? html`<table class="tbl" style="margin-top:8px"><tr>${head.map((h, i) => html`<th class="${i ? 'num' : ''}">${h}</th>`)}</tr>${rows.map(r => html`<tr>${r.map((c, i) => html`<td class="${i ? 'num' : ''}">${c}</td>`)}</tr>`)}</table>` : html`<p class="muted small">Sem dados no período.</p>`;
  return html`<div class="pagehead"><h1>Relatórios</h1><div class="row"><button class="btn" data-act="exportFin" data-de="${from}" data-ate="${to}">${icon('down')} Financeiro (CSV)</button><button class="btn" onclick="window.print()">${icon('print')} Imprimir</button></div></div>
  <form data-form="repPeriod" class="card row" style="align-items:end"><label class="f"><span>De</span><input class="in" type="date" name="de" value="${from}"></label><label class="f"><span>Até</span><input class="in" type="date" name="ate" value="${to}"></label><button class="btn primary" type="submit">Atualizar</button></form>
  <div class="grid g4" style="margin-top:14px"><div class="card kpi"><div class="l">Agendamentos</div><div class="v">${ap.length}</div></div><div class="card kpi"><div class="l">Taxa de faltas</div><div class="v">${fechados ? Math.round(faltas / fechados * 100) : 0}%</div><div class="tiny muted">${faltas} falta(s)</div></div><div class="card kpi"><div class="l">Recebido</div><div class="v" style="color:var(--ok)">${BRL(sum(rec, f => f.amount))}</div></div><div class="card kpi"><div class="l">Resultado</div><div class="v">${BRL(sum(rec, f => f.amount) - sum(des, f => f.amount))}</div></div></div>
  <div class="grid g2 collapse" style="margin-top:14px">
    <div class="card"><h3>Agendamentos por situação</h3>${tbl(['Situação', 'Qtd.'], Object.entries(byStatus).map(([k, v]) => [STATUS[k]?.[0] || k, v.length]))}</div>
    <div class="card"><h3>Recebimentos por forma</h3>${tbl(['Forma', 'Valor'], byMethod.map(([k, v]) => [k, BRL(v)]))}</div>
    <div class="card"><h3>Procedimentos realizados</h3>${tbl(['Procedimento', 'Qtd.', 'Produção'], byProc.map(([k, n, v]) => [k, n, BRL(v)]))}</div>
    <div class="card"><h3>Despesas pagas por categoria</h3>${tbl(['Categoria', 'Valor'], byCat.map(([k, v]) => [k, BRL(v)]))}</div>
    <div class="card"><h3>Novos pacientes por origem</h3>${tbl(['Origem', 'Pacientes'], byOrigin)}</div>
    <div class="card"><h3>Atendimentos registrados por profissional</h3>${tbl(['Profissional', 'Evoluções'], byPro)}</div></div>`;
}, 'relatorios');
onForm('repPeriod', d => go(`#/relatorios?de=${d.de}&ate=${d.ate}`));
act('exportFin', async el => {
  const rows = await db.list('finance_entries', { gte: { due_date: el.dataset.de }, lte: { due_date: el.dataset.ate }, order: 'due_date' });
  const csv = ['Tipo;Descrição;Categoria;Valor;Vencimento;Pago em;Forma', ...rows.map(r => [r.kind, `"${(r.description || '').replace(/"/g, '""')}"`, r.category || '', String(r.amount).replace('.', ','), r.due_date, r.paid_at || '', METHODS[r.method] || ''].join(';'))].join('\n');
  await saveOut(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `financeiro-${el.dataset.de}-a-${el.dataset.ate}.csv`, { kind: 'relatorios' });
});

/* ---------- ESTOQUE ---------- */
route('/estoque', async (_, q) => {
  const items = await db.list('stock_items', { order: 'name' }); const low = items.filter(i => +i.quantity <= +i.min_quantity); const f = q.get('f') || 'todos'; const T = ymd(new Date()); const soon = ymd(addDays(new Date(), 60));
  const list = f === 'baixo' ? low : f === 'validade' ? items.filter(i => i.expires_at && i.expires_at <= soon) : items;
  return html`<div class="pagehead"><h1>Estoque</h1><button class="btn primary" data-act="editStock" data-id="">${icon('plus')} Novo item</button></div>
  <div class="grid g3"><div class="card kpi"><div class="l">Itens</div><div class="v">${items.length}</div></div><div class="card kpi"><div class="l">Abaixo do mínimo</div><div class="v" style="color:${low.length ? 'var(--bad)' : 'inherit'}">${low.length}</div></div><div class="card kpi"><div class="l">Valor em estoque</div><div class="v">${BRL(sum(items, i => Math.max(0, i.quantity) * i.unit_cost))}</div></div></div>
  <div class="seg" style="margin:14px 0">${[['todos', 'Todos'], ['baixo', 'Estoque baixo'], ['validade', 'Vencendo em 60 dias']].map(([k, l]) => html`<a class="${f === k ? 'on' : ''}" href="#/estoque?f=${k}">${l}</a>`)}</div>
  ${list.length ? html`<div class="tblwrap"><table class="tbl"><tr><th>Item</th><th class="num">Qtd.</th><th class="num hide-m">Mínimo</th><th class="hide-m">Validade</th><th></th></tr>${list.map(i => html`<tr><td><b>${i.name}</b><div class="tiny muted">${i.category || ''}${i.supplier ? ' · ' + i.supplier : ''}</div></td><td class="num"><span class="pill ${+i.quantity <= +i.min_quantity ? 'bad' : 'ok'}">${(+i.quantity).toLocaleString('pt-BR')} ${i.unit}</span></td><td class="num hide-m">${(+i.min_quantity).toLocaleString('pt-BR')}</td><td class="hide-m small ${i.expires_at && i.expires_at < T ? 'muted' : ''}">${i.expires_at ? fDate(i.expires_at) : '—'}</td>
    <td class="num"><button class="btn sm ok" data-act="moveStock" data-id="${i.id}" data-k="entrada" title="Entrada">${icon('up')}</button> <button class="btn sm" data-act="moveStock" data-id="${i.id}" data-k="saida" title="Saída">${icon('down')}</button> <button class="btn sm" data-act="editStock" data-id="${i.id}">${icon('edit')}</button></td></tr>`)}</table></div>` : html`<div class="card empty">${icon('box')}<div>Nada por aqui.</div></div>`}`;
}, 'estoque');
act('editStock', async el => { const i = el.dataset.id ? await db.get('stock_items', el.dataset.id) : { unit: 'un', quantity: 0, min_quantity: 0, unit_cost: 0 };
  const movs = i.id ? await db.list('stock_movements', { eq: { item_id: i.id }, order: 'created_at.desc', limit: 10 }) : [];
  modal(i.id ? 'Editar item' : 'Novo item', html`<form data-form="saveStock" class="stack"><input type="hidden" name="id" value="${i.id || ''}"><div class="grid g2"><label class="f"><span>Nome <i>*</i></span><input class="in" name="name" required value="${i.name || ''}"></label><label class="f"><span>Categoria</span><input class="in" name="category" value="${i.category || ''}"></label></div>
  <div class="grid g3"><label class="f"><span>Unidade</span><input class="in" name="unit" value="${i.unit}"></label>${!i.id ? html`<label class="f"><span>Qtd. inicial</span><input class="in" name="quantity" inputmode="decimal" value="0"></label>` : ''}<label class="f"><span>Qtd. mínima</span><input class="in" name="min_quantity" inputmode="decimal" value="${i.min_quantity}"></label><label class="f"><span>Custo unitário (R$)</span><input class="in" name="unit_cost" inputmode="decimal" value="${String(i.unit_cost).replace('.', ',')}"></label></div>
  <div class="grid g2"><label class="f"><span>Fornecedor</span><input class="in" name="supplier" value="${i.supplier || ''}"></label><label class="f"><span>Validade</span><input class="in" type="date" name="expires_at" value="${i.expires_at || ''}"></label></div>
  ${movs.length ? html`<div><b class="small">Últimas movimentações</b><div class="list" style="margin-top:6px">${movs.map(m => html`<div class="li small"><span class="pill ${m.kind === 'entrada' ? 'ok' : m.kind === 'saida' ? 'bad' : 'gray'}">${m.kind}</span><span class="grow">${(+m.quantity).toLocaleString('pt-BR')} ${i.unit}${m.note ? ' · ' + m.note : ''}</span><span class="tiny muted">${fDT(m.created_at)}</span></div>`)}</div></div>` : ''}
  <div class="row between">${i.id ? html`<button type="button" class="btn danger" data-act="delStock" data-id="${i.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`, { wide: true }); });
onForm('saveStock', async d => { const row = { name: d.name, category: nz(d.category), unit: d.unit || 'un', min_quantity: parseMoney(d.min_quantity) || 0, unit_cost: parseMoney(d.unit_cost) || 0, supplier: nz(d.supplier), expires_at: nz(d.expires_at) };
  if (d.id) await db.update('stock_items', d.id, row); else await db.insert('stock_items', { ...row, quantity: parseMoney(d.quantity) || 0 }); closeModal(); updateNotif(); router(); });
act('delStock', async el => { if (await confirmBox('Excluir este item do estoque?', 'Excluir')) { await db.remove('stock_items', el.dataset.id); closeModal(); router(); } });
act('moveStock', el => modal(el.dataset.k === 'entrada' ? 'Entrada no estoque' : 'Saída do estoque', html`<form data-form="saveMove" class="stack"><input type="hidden" name="item_id" value="${el.dataset.id}"><input type="hidden" name="kind" value="${el.dataset.k}"><label class="f"><span>Quantidade <i>*</i></span><input class="in" name="quantity" inputmode="decimal" required></label><label class="f"><span>Observação</span><input class="in" name="note" placeholder="${el.dataset.k === 'entrada' ? 'Nota fiscal, fornecedor…' : 'Uso em atendimento, perda…'}"></label><button class="btn primary" type="submit">Registrar</button></form>`));
onForm('saveMove', async d => { const qn = parseMoney(d.quantity); if (!(qn > 0)) throw new Error('Quantidade inválida.'); await db.insert('stock_movements', { item_id: d.item_id, kind: d.kind, quantity: qn, note: nz(d.note), created_by: isDemo() ? null : Auth.userId() }); closeModal(); toast('Movimentação registrada.', 'ok'); updateNotif(); router(); });

/* ---------- MARKETING ---------- */
route('/marketing', async (_, q) => {
  const tab = q.get('tab') || 'aniversarios'; const now = new Date(); const mm = pad(now.getMonth() + 1);
  const pats = (await db.list('patients', { eq: { active: true }, order: 'name' }));
  let body;
  if (tab === 'aniversarios') {
    const list = pats.filter(p => p.birth_date && p.birth_date.slice(5, 7) === mm).sort((a, b) => a.birth_date.slice(8) - b.birth_date.slice(8)); const td = ymd(now).slice(5);
    body = html`<p class="small muted">Aniversariantes de ${now.toLocaleDateString('pt-BR', { month: 'long' })}. Cada botão abre o WhatsApp com a mensagem pronta.</p>${list.length ? html`<div class="list">${list.map(p => html`<div class="li">${icon('cake')}<span class="grow"><span class="t">${p.name}</span><span class="tiny muted">${fDate(p.birth_date).slice(0, 5)} · faz ${age(p.birth_date) + (p.birth_date.slice(5) > td ? 1 : 0)} anos</span></span>${p.birth_date.slice(5) === td ? html`<span class="pill accent">hoje</span>` : ''}${p.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, `Feliz aniversário, ${p.name.split(' ')[0]}! 🎉 Toda a equipe do ${S.clinic.name} deseja um ano cheio de saúde e muitos sorrisos.`)}">${icon('wa')} Parabenizar</a>` : ''}</div>`)}</div>` : html`<div class="card empty">Nenhum aniversariante este mês.</div>`}`;
  } else if (tab === 'recall') {
    const dias = [30, 60, 90, 180, 365].includes(+q.get('dias')) ? +q.get('dias') : 90;
    const since = addDays(now, -dias).toISOString(); const recent = new Set((await db.list('appointments', { gte: { starts_at: since }, select: 'patient_id' })).map(a => a.patient_id));
    const list = pats.filter(p => !recent.has(p.id) && (p.phone || p.email)); window.__mala = list;
    body = html`<div class="card"><h3 style="margin:0">Mala direta para pacientes ausentes</h3>
      <p class="small muted" style="margin:6px 0 12px">Marque quem vai receber (ou selecione todos de uma vez). Cada paciente recebe a mensagem com o próprio nome no lugar de {nome}.</p>
      <div class="grid g2 collapse" style="align-items:end"><label class="f"><span>Sem consulta há mais de</span><select class="in" data-change="malaDias">${[30, 60, 90, 180, 365].map(d => html`<option value="${d}" ${d === dias ? 'selected' : ''}>${d === 365 ? '1 ano' : d + ' dias'}</option>`)}</select></label>
        <label class="f"><span>Enviar por</span><select class="in" id="malach"><option value="wa">WhatsApp (e-mail se não tiver celular)</option><option value="email">E-mail (WhatsApp se não tiver e-mail)</option></select></label></div>
      <label class="f" style="margin-top:10px"><span>Mensagem</span><textarea class="in" id="malamsg" rows="6">${malaMsg()}</textarea></label>
      <div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm" data-act="malaReset">Voltar ao texto padrão</button><span class="tiny muted">{nome} vira o primeiro nome de cada paciente.</span></div></div>
    ${list.length ? html`<div class="card" style="margin-top:14px"><div class="row between" style="gap:10px;flex-wrap:wrap"><label class="check"><input type="checkbox" id="malaall" data-change="malaAll"> <b>Selecionar todos (${list.length})</b></label><button type="button" class="btn primary" data-act="malaStart">${icon('wa')} Enviar para selecionados (<span id="malan">0</span>)</button></div>
      <div class="list" style="margin-top:10px">${list.map(p => html`<label class="li" style="cursor:pointer"><input type="checkbox" class="malacb" value="${p.id}" data-change="malaOne"><span class="avatar">${initials(p.name)}</span><span class="grow"><span class="t">${p.name}</span><span class="tiny muted">${[p.phone ? fPhone(p.phone) : '', p.email || ''].filter(Boolean).join(' · ')}</span></span></label>`)}</div></div>`
      : html`<div class="card empty" style="margin-top:14px">Nenhum paciente ativo ausente nesse período. 👏</div>`}`;
  } else {
    const camps = await db.list('campaigns', { order: 'created_at.desc' }); const cid = q.get('c'); const c = camps.find(x => x.id === cid);
    const tags = [...new Set(pats.flatMap(p => p.tags || []))];
    let aud = [];
    if (c) { aud = c.audience === 'todos' ? pats : c.audience.startsWith('tag:') ? pats.filter(p => (p.tags || []).includes(c.audience.slice(4))) : c.audience.startsWith('convenio:') ? pats.filter(p => (p.insurance_id || '') === c.audience.slice(9)) : pats; aud = aud.filter(p => p.phone); }
    body = html`<div class="grid g2 collapse" style="align-items:start"><div class="card"><h3>Nova campanha</h3><form data-form="saveCamp" class="stack" style="margin-top:10px"><label class="f"><span>Título <i>*</i></span><input class="in" name="title" required></label>
      <label class="f"><span>Público</span><select class="in" name="audience"><option value="todos">Todos os pacientes ativos</option>${tags.map(t => html`<option value="tag:${t}">Etiqueta: ${t}</option>`)}${S.insurances.map(i => html`<option value="convenio:${i.name === 'Particular' ? '' : i.id}">Convênio: ${i.name}</option>`)}</select></label>
      <label class="f"><span>Mensagem <i>*</i></span><textarea class="in" name="message" required rows="4" placeholder="Use {nome} para o primeiro nome do paciente"></textarea></label><button class="btn primary" type="submit">Criar campanha</button></form>
      ${camps.length ? html`<div class="list" style="margin-top:14px">${camps.map(x => html`<a class="li" href="#/marketing?tab=campanhas&c=${x.id}"><span class="grow"><span class="t">${x.title}</span><span class="tiny muted">${fDate(x.created_at)}</span></span>${icon('chev')}</a>`)}</div>` : ''}</div>
      <div class="card">${c ? html`<div class="row between"><h3>${c.title}</h3><button class="btn sm danger" data-act="delCamp" data-id="${c.id}">${icon('trash')}</button></div><p class="small prose muted">${c.message}</p><p class="small"><b>${aud.length}</b> paciente(s) com celular. Envie um por um — o WhatsApp bloqueia números que disparam mensagens em massa.</p>
        <div class="list">${aud.map(p => html`<div class="li"><span class="grow small">${p.name}</span><a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, c.message.replace(/\{nome\}/g, p.name.split(' ')[0]))}" data-act="markSent">${icon('wa')} Enviar</a></div>`)}</div>` : html`<div class="empty">${icon('mega')}<div>Crie ou selecione uma campanha para ver a lista de envio.</div></div>`}</div></div>`;
  }
  return html`<div class="pagehead"><h1>Marketing</h1></div><nav class="tabs">${[['aniversarios', 'Aniversariantes'], ['recall', 'Pacientes ausentes · mala direta'], ['campanhas', 'Campanhas']].map(([k, l]) => html`<a class="${tab === k ? 'on' : ''}" href="#/marketing?tab=${k}">${l}</a>`)}</nav>${body}`;
}, 'marketing');
/* mala direta: texto padrão com o contato da clínica */
const MALA_KEY = 'pepmh_mala_msg';
function malaDefault() {
  const tel = fPhone(S.clinic.phone || ''); const mail = S.clinic.email || 'mh.cuidarsaude@gmail.com'; const nome = (S.clinic.name || 'MH.Cuidar').split(' / ')[0];
  return `Olá, {nome}! Tudo bem? Aqui é da ${nome}.\n\nSentimos sua falta por aqui e queremos saber como você está. Que tal retomar seu acompanhamento? A gente encontra o melhor horário para você.\n\n${tel ? `📱 WhatsApp: ${tel}\n` : ''}✉️ E-mail: ${mail}\n\nUm abraço da equipe ${nome}!`;
}
const malaMsg = () => LS.get(MALA_KEY) || malaDefault();
onInput('malaDias', el => go('#/marketing?tab=recall&dias=' + el.value));
act('malaReset', () => { LS.del(MALA_KEY); document.getElementById('malamsg').value = malaDefault(); });
const malaCount = () => { const cbs = [...document.querySelectorAll('.malacb')]; const n = cbs.filter(c => c.checked).length; document.getElementById('malan').textContent = n; const all = document.getElementById('malaall'); if (all) { all.checked = n === cbs.length && n > 0; all.indeterminate = n > 0 && n < cbs.length; } };
onInput('malaAll', el => { document.querySelectorAll('.malacb').forEach(c => (c.checked = el.checked)); malaCount(); });
onInput('malaOne', malaCount);
const malaLink = (p, msg, ch) => {
  const text = msg.replace(/\{nome\}/g, (p.name || '').trim().split(/\s+/)[0]);
  const mail = () => `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(`${S.clinic.name || 'MH.Cuidar'} – sentimos sua falta`)}&body=${encodeURIComponent(text)}`;
  if (ch === 'email') return p.email ? { href: mail(), via: 'e-mail' } : { href: waLink(p.phone, text), via: 'WhatsApp' };
  return p.phone ? { href: waLink(p.phone, text), via: 'WhatsApp' } : { href: mail(), via: 'e-mail' };
};
act('malaStart', () => {
  const msg = document.getElementById('malamsg').value.trim(); if (!msg) throw new Error('Escreva a mensagem.');
  if (!msg.includes('{nome}') && !confirm('A mensagem não tem {nome}. Enviar sem o nome do paciente?')) return;
  const ids = new Set([...document.querySelectorAll('.malacb:checked')].map(c => c.value)); const queue = (window.__mala || []).filter(p => ids.has(p.id));
  if (!queue.length) throw new Error('Selecione pelo menos um paciente.');
  if (msg !== malaDefault()) LS.set(MALA_KEY, msg);
  window.__malaQ = { queue, msg, ch: document.getElementById('malach').value, i: 0 }; malaStep();
});
function malaStep() {
  const Q = window.__malaQ; if (!Q) return;
  if (Q.i >= Q.queue.length) { modal('Mala direta concluída', html`<p>Mensagens abertas para os ${Q.queue.length} paciente(s) selecionados. ✅</p><button class="btn primary" data-act="malaClose">Fechar</button>`); return; }
  const p = Q.queue[Q.i]; const l = malaLink(p, Q.msg, Q.ch);
  modal(`Mala direta · ${Q.i + 1} de ${Q.queue.length}`, html`<div class="stack"><div class="li" style="padding:0"><span class="avatar">${initials(p.name)}</span><span class="grow"><span class="t">${p.name}</span><span class="tiny muted">por ${l.via}</span></span></div>
    <div class="prose small" style="white-space:pre-wrap;background:var(--bg,#f4f6f9);border-radius:10px;padding:10px">${Q.msg.replace(/\{nome\}/g, p.name.trim().split(/\s+/)[0])}</div>
    <a class="btn primary" href="${l.href}" target="_blank" rel="noopener" data-act="malaSend">${icon(l.via === 'WhatsApp' ? 'wa' : 'send')} Enviar para ${p.name.split(' ')[0]} e ir para o próximo</a>
    <div class="row between"><button type="button" class="btn sm" data-act="malaSkip">Pular este</button><button type="button" class="btn sm" data-act="malaClose">Parar</button></div>
    <p class="tiny muted" style="margin:0">O WhatsApp e o e-mail abrem com a mensagem pronta e o nome já preenchido; é só tocar em enviar. O WhatsApp bloqueia números que disparam mensagens automáticas em massa, por isso cada envio passa por você.</p></div>`);
}
act('malaSend', el => { window.open(el.href, '_blank', 'noopener'); window.__malaQ.i++; malaStep(); });
act('malaSkip', () => { window.__malaQ.i++; malaStep(); });
act('malaClose', () => { window.__malaQ = null; closeModal(); });
act('markSent', el => { window.open(el.href, '_blank', 'noopener'); el.classList.add('ok'); el.innerHTML = fv(html`${icon('check')} Aberto`); });
onForm('saveCamp', async d => { const c = await db.insert('campaigns', d); go(`#/marketing?tab=campanhas&c=${c.id}`); });
act('delCamp', async el => { await db.remove('campaigns', el.dataset.id); go('#/marketing?tab=campanhas'); });

/* ---------- CRM ---------- */
const STAGES = [['novo', 'Novo contato'], ['contato', 'Em conversa'], ['avaliacao', 'Avaliação agendada'], ['orcamento', 'Orçamento enviado'], ['fechado', 'Fechado'], ['perdido', 'Perdido']];
route('/crm', async () => {
  const leads = await db.list('crm_leads', { order: 'created_at.desc' }); const by = groupBy(leads, l => l.stage);
  const conv = leads.length ? Math.round((by.fechado || []).length / leads.length * 100) : 0;
  return html`<div class="pagehead"><h1>CRM</h1><button class="btn primary" data-act="editLead" data-id="">${icon('plus')} Novo lead</button></div>
  <div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><div class="l">Leads</div><div class="v">${leads.length}</div></div><div class="card kpi"><div class="l">Em negociação</div><div class="v">${BRL(sum(leads.filter(l => !['fechado', 'perdido'].includes(l.stage)), l => l.value))}</div></div><div class="card kpi"><div class="l">Conversão</div><div class="v">${conv}%</div></div></div>
  <div class="kanban">${STAGES.map(([k, l]) => html`<div class="col"><h4><span>${l}</span><span class="muted">${(by[k] || []).length}</span></h4>${(by[k] || []).map(x => html`<div class="kcard" data-act="editLead" data-id="${x.id}"><b class="small">${x.name}</b><div class="tiny muted">${x.interest || ''}${x.source ? ' · ' + x.source : ''}</div>${+x.value ? html`<div class="small" style="margin-top:4px">${BRL(x.value)}</div>` : ''}</div>`)}</div>`)}</div>`;
}, 'crm');
act('editLead', async el => { const l = el.dataset.id ? await db.get('crm_leads', el.dataset.id) : { stage: 'novo' };
  modal(l.id ? 'Lead' : 'Novo lead', html`<form data-form="saveLead" class="stack"><input type="hidden" name="id" value="${l.id || ''}"><label class="f"><span>Nome <i>*</i></span><input class="in" name="name" required value="${l.name || ''}"></label>
  <div class="grid g2"><label class="f"><span>Telefone</span><input class="in" name="phone" value="${fPhone(l.phone)}"></label><label class="f"><span>E-mail</span><input class="in" name="email" type="email" value="${l.email || ''}"></label></div>
  <div class="grid g3"><label class="f"><span>Origem</span><input class="in" name="source" list="srcs" value="${l.source || ''}"><datalist id="srcs"><option>Instagram</option><option>Google</option><option>Indicação</option><option>WhatsApp</option><option>Site</option></datalist></label><label class="f"><span>Interesse</span><input class="in" name="interest" value="${l.interest || ''}"></label><label class="f"><span>Valor estimado (R$)</span><input class="in" name="value" inputmode="decimal" value="${l.value || ''}"></label></div>
  <label class="f"><span>Etapa</span><select class="in" name="stage">${STAGES.map(([k, v]) => html`<option value="${k}" ${l.stage === k ? 'selected' : ''}>${v}</option>`)}</select></label><label class="f"><span>Anotações</span><textarea class="in" name="notes">${l.notes || ''}</textarea></label>
  <div class="row between"><div class="row">${l.id ? html`<button type="button" class="btn danger" data-act="delLead" data-id="${l.id}">${icon('trash')}</button>${l.phone ? html`<a class="btn" target="_blank" rel="noopener" href="${waLink(l.phone, `Olá, ${l.name.split(' ')[0]}! Aqui é do ${S.clinic.name}.`)}">${icon('wa')}</a>` : ''}${!l.patient_id ? html`<button type="button" class="btn" data-act="convertLead" data-id="${l.id}">${icon('user')} Virar paciente</button>` : html`<a class="btn" href="#/paciente/${l.patient_id}" data-act="closeModalNav">Ver paciente</a>`}` : ''}</div><button class="btn primary" type="submit">Salvar</button></div></form>`); });
onForm('saveLead', async d => { const row = { name: d.name, phone: nz(onlyDigits(d.phone)), email: nz(d.email), source: nz(d.source), interest: nz(d.interest), value: parseMoney(d.value) || 0, stage: d.stage, notes: nz(d.notes) }; if (d.id) await db.update('crm_leads', d.id, row); else await db.insert('crm_leads', row); closeModal(); router(); });
act('delLead', async el => { if (await confirmBox('Excluir este lead?', 'Excluir')) { await db.remove('crm_leads', el.dataset.id); closeModal(); router(); } });
act('convertLead', async el => { const l = await db.get('crm_leads', el.dataset.id); const p = await db.insert('patients', { name: l.name, phone: l.phone, email: l.email, origin: l.source }); await db.update('crm_leads', l.id, { patient_id: p.id, stage: 'fechado' }); closeModal(); toast('Paciente criado a partir do lead.', 'ok'); go(`#/paciente/${p.id}`); });

/* ---------- CENTRAL DE IDEIAS ---------- */
route('/ideias', async () => {
  const ideas = await db.list('ideas', { order: 'votes.desc,created_at.desc' }); const voted = LS.get('pepmh_votes', []);
  return html`<div class="pagehead"><h1>Central de ideias</h1></div><div class="card"><form data-form="saveIdea" class="row" style="flex-wrap:nowrap"><input class="in" name="text" required placeholder="O que deixaria o consultório (ou o sistema) melhor?"><button class="btn primary" type="submit">Enviar</button></form></div>
  <div class="list" style="margin-top:14px">${ideas.map(i => html`<div class="li"><button class="btn sm ${voted.includes(i.id) ? 'primary' : ''}" data-act="voteIdea" data-id="${i.id}" data-v="${i.votes}">${icon('up')} ${i.votes}</button><span class="grow"><span style="display:block">${i.text}</span><span class="tiny muted">${i.author_name || ''} · ${fDate(i.created_at)}</span></span><select class="in" style="height:32px;width:auto" data-change="ideaStatus" data-id="${i.id}">${['nova', 'em análise', 'feita', 'descartada'].map(s => html`<option ${i.status === s ? 'selected' : ''}>${s}</option>`)}</select></div>`)}${!ideas.length ? html`<div class="empty">Nenhuma ideia ainda.</div>` : ''}</div>`;
}, 'ideias');
onForm('saveIdea', async d => { await db.insert('ideas', { text: d.text, author_name: S.me.full_name }); router(); });
act('voteIdea', async el => { const v = LS.get('pepmh_votes', []); if (v.includes(el.dataset.id)) return; await db.update('ideas', el.dataset.id, { votes: +el.dataset.v + 1 }); LS.set('pepmh_votes', [...v, el.dataset.id]); router(); });
onInput('ideaStatus', async el => { await db.update('ideas', el.dataset.id, { status: el.value }); toast('Status atualizado.'); });

/* ---------- CONFIGURAÇÕES ---------- */
route('/configuracoes', async (_, q) => {
  if (q.get('sec')) after(() => document.getElementById('sec-' + q.get('sec'))?.scrollIntoView({ behavior: 'smooth' }));
  const c = S.clinic, m = S.me, owner = m.role === 'owner';
  return html`<div class="pagehead"><h1>Configurações</h1></div><div class="grid g2 collapse" style="align-items:start">
  <div class="card"><h2>Consultório</h2><p class="small muted">Aparece no cabeçalho de receitas, atestados e orçamentos.</p><form data-form="saveClinic" class="stack" style="margin-top:10px"><fieldset ${owner ? '' : 'disabled'} style="border:0;padding:0;margin:0" class="stack">
    <label class="f"><span>Nome do consultório <i>*</i></span><input class="in" name="name" required value="${c.name || ''}"></label><div class="grid g2"><label class="f"><span>CNPJ</span><input class="in" name="cnpj" value="${c.cnpj || ''}"></label><label class="f"><span>Telefone</span><input class="in" name="phone" value="${fPhone(c.phone)}"></label></div>
    <label class="f"><span>E-mail</span><input class="in" name="email" type="email" value="${c.email || ''}"></label>
    <div class="grid g2"><label class="f"><span>CEP</span><input class="in" name="zip" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${fCEP(c.zip || '')}"></label><label class="f"><span>Endereço</span><input class="in" name="address" value="${c.address || ''}"></label></div>
    <div class="grid g2"><label class="f"><span>Cidade</span><input class="in" name="city" value="${c.city || ''}"></label><label class="f"><span>UF</span><input class="in" name="state" maxlength="2" value="${c.state || ''}"></label></div>
    <button class="btn primary" type="submit">Salvar consultório</button></fieldset></form>
    <div style="margin-top:16px"><span class="small" style="font-weight:600;color:var(--ink-2)">Logo (aparece em receitas, atestados, orçamentos e na página de agendamento)</span>
    <div class="row" style="margin-top:8px">${safeLogo(c.logo_url) ? html`<img src="${c.logo_url}" alt="Logo" style="height:56px;max-width:260px;border:1px solid var(--line);border-radius:8px;padding:4px;background:#fff">` : html`<span class="small muted">Sem logo.</span>`}
    ${owner ? html`<label class="btn sm">${icon('up')} Enviar logo<input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" data-change="logoFile" style="display:none"></label>${c.logo_url ? html`<button class="btn sm danger" data-act="logoDel">${icon('trash')} Remover</button>` : ''}` : ''}</div>
    <p class="tiny muted">SVG, PNG, JPG ou WEBP de até 250 KB. De preferência com fundo transparente e formato horizontal. A logo também aparece no topo do sistema, no menu e na área do paciente.</p></div>
    ${owner ? html`<form data-form="saveTheme" style="margin-top:14px"><span class="small" style="font-weight:600;color:var(--ink-2)">Cores do sistema</span>
      <div class="row" style="margin-top:8px;align-items:end"><label class="f"><span>Cor principal</span><input type="color" class="in" style="width:72px;padding:4px" name="theme_primary" value="${hexOk(c.theme_primary) ? c.theme_primary : '#0b57b3'}"></label>
      <label class="f"><span>Cor de destaque</span><input type="color" class="in" style="width:72px;padding:4px" name="theme_accent" value="${hexOk(c.theme_accent) ? c.theme_accent : '#e8603c'}"></label>
      <button class="btn primary" type="submit">Aplicar cores</button><button class="btn" type="button" data-act="themeReset">Cores padrão</button></div>
      <p class="tiny muted">Dica: use as cores da logo. Menu, botões e destaques passam a seguir essas cores para toda a equipe e para os pacientes.</p></form>` : ''}</div>
  <div class="stack"><div class="card"><h2>Meus dados profissionais</h2><form data-form="saveMe" class="stack" style="margin-top:10px"><label class="f"><span>Nome como aparece na assinatura <i>*</i></span><input class="in" name="full_name" required value="${m.full_name || ''}"></label>
    ${S.me.role !== 'secretaria' ? html`<label class="f"><span>Área</span><select class="in" name="profession">${Object.entries(PROF).map(([k, v]) => html`<option value="${k}" ${m.profession === k ? 'selected' : ''}>${v}</option>`)}</select></label>` : ''}
    <div class="grid g3"><label class="f"><span>Conselho</span><select class="in" name="council">${['CRO', 'CRM', 'CRF', 'CRN', 'CREFITO', 'CRP'].map(x => html`<option ${m.council === x ? 'selected' : ''}>${x}</option>`)}</select></label><label class="f"><span>Número</span><input class="in" name="council_number" value="${m.council_number || ''}"></label><label class="f"><span>UF</span><input class="in" name="council_uf" maxlength="2" value="${m.council_uf || ''}"></label></div>
    <div class="grid g2"><label class="f"><span>Especialidade</span><input class="in" name="specialty" value="${m.specialty || ''}"></label><label class="f"><span>CPF</span><input class="in" name="cpf" value="${fCPF(m.cpf)}"></label></div><button class="btn primary" type="submit">Salvar meus dados</button></form></div>
  ${!isDemo() ? html`<div class="card" id="senha"><h2>Senha</h2><form data-form="savePass" class="row" style="margin-top:10px;align-items:end"><label class="f" style="flex:1"><span>Nova senha</span><input class="in" type="password" name="password" minlength="6" required autocomplete="new-password" ${q.get('senha') ? 'autofocus' : ''}></label><button class="btn" type="submit">Alterar</button></form></div>` : html`<div class="card"><h2>Modo demonstração</h2><p class="small muted">Tudo o que você fizer aqui fica só neste navegador. Para usar com pacientes reais, saia e crie uma conta.</p><button class="btn" data-act="resetDemo">${icon('repeat')} Reiniciar dados de exemplo</button></div>`}
</div></div>
  <div class="grid g2 collapse" style="align-items:start;margin-top:14px">${await configExtra()}${isOwner() ? await googleCard() : ''}${await pastasCard()}</div>`;
}, 'config');
onForm('saveClinic', async d => { const row = { ...d, zip: nz(onlyDigits(d.zip)), phone: nz(onlyDigits(d.phone)), state: nz((d.state || '').toUpperCase()) }; S.clinic = { ...S.clinic, ...(await B().updateWhere('clinics', { id: S.clinic.id }, row)) }; toast('Dados do consultório salvos.', 'ok'); });
onForm('saveMe', async d => { const row = { ...d, cpf: nz(onlyDigits(d.cpf)), council_uf: nz((d.council_uf || '').toUpperCase()) }; await B().updateWhere('clinic_members', { clinic_id: S.clinic.id, user_id: S.me.user_id }, row); Object.assign(S.me, row); S.members = await db.list('clinic_members', { eq: { clinic_id: S.clinic.id } }); toast('Seus dados foram salvos.', 'ok'); });
onForm('savePass', async (d, f) => { await Remote.req('/auth/v1/user', { method: 'PUT', body: { password: d.password } }); f.reset(); toast('Senha alterada.', 'ok'); });

onInput('logoFile', async el => {
  const f = el.files[0]; if (!f) return;
  if (!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)) return toast('Use SVG, PNG, JPG ou WEBP.', 'bad');
  if (f.size > 250 * 1024) return toast('A imagem passa de 250 KB. Reduza e tente de novo.', 'bad');
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  const r = await B().updateWhere('clinics', { id: S.clinic.id }, { logo_url: url }); Object.assign(S.clinic, r || { logo_url: url }); toast('Logo atualizada.', 'ok'); rebuildShell();
});
act('logoDel', async () => { if (!(await confirmBox('Remover a logo da clínica?', 'Remover'))) return; await B().updateWhere('clinics', { id: S.clinic.id }, { logo_url: null }); S.clinic.logo_url = null; rebuildShell(); });
function rebuildShell() { document.getElementById('app').innerHTML = ''; applyTheme(S.clinic); router(); }
onForm('saveTheme', async d => { if (!hexOk(d.theme_primary) || !hexOk(d.theme_accent)) throw new Error('Cor inválida.'); const r = await B().updateWhere('clinics', { id: S.clinic.id }, { theme_primary: d.theme_primary, theme_accent: d.theme_accent }); Object.assign(S.clinic, r || d); toast('Cores aplicadas.', 'ok'); rebuildShell(); });
act('themeReset', async () => { const r = await B().updateWhere('clinics', { id: S.clinic.id }, { theme_primary: null, theme_accent: null }); Object.assign(S.clinic, r || { theme_primary: null, theme_accent: null }); rebuildShell(); });
