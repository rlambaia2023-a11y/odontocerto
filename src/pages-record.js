/* ===== Prontuário do paciente ===== */
const TABS = [['resumo', 'Resumo'], ['anamnese', 'Anamnese'], ['odontograma', 'Odontograma'], ['evolucao', 'Evolução'], ['plano', 'Plano de tratamento'], ['documentos', 'Prescrições e documentos'], ['financeiro', 'Financeiro'], ['retornos', 'Retornos'], ['consultas', 'Consultas']];
const DOCT = { receituario: ['Receituário', 'pill'], atestado: ['Atestado', 'edit'], declaracao: ['Declaração', 'file'], carta: ['Carta / encaminhamento', 'send'], exames: ['Solicitação de exames', 'clip'], cirurgia: ['Solicitação de cirurgia', 'building'], laudo: ['Laudo', 'file'] };
const ANAM = [
  ['queixa', 'Queixa principal', 'text'], ['tratamento_medico', 'Está em tratamento médico?', 'bool'], ['medicamentos', 'Medicamentos em uso', 'text'], ['alergias', 'Alergias (medicamentos, látex, alimentos)', 'text'],
  ['hipertensao', 'Hipertensão arterial', 'bool'], ['diabetes', 'Diabetes', 'bool'], ['cardiopatia', 'Cardiopatia / uso de marca-passo', 'bool'], ['sangramento', 'Problemas de coagulação ou sangramento prolongado', 'bool'],
  ['anticoagulante', 'Usa anticoagulante ou antiagregante', 'bool'], ['infecciosa', 'Hepatite, HIV ou outra doença infecciosa', 'bool'], ['respiratoria', 'Asma ou doença respiratória', 'bool'], ['epilepsia', 'Epilepsia / convulsões', 'bool'],
  ['bifosfonato', 'Uso de bifosfonatos ou radioterapia em cabeça e pescoço', 'bool'], ['gestante', 'Gestante ou lactante', 'bool'], ['fumante', 'Fumante', 'bool'], ['etilista', 'Consumo frequente de álcool', 'bool'],
  ['anestesia_reacao', 'Já teve reação à anestesia odontológica', 'bool'], ['cirurgias', 'Cirurgias ou internações anteriores', 'text'], ['bruxismo', 'Range ou aperta os dentes (bruxismo)', 'bool'],
  ['gengiva_sangra', 'Gengiva sangra ao escovar', 'bool'], ['sensibilidade', 'Sensibilidade dentária', 'bool'], ['ultima_visita', 'Última visita ao dentista', 'text'], ['observacoes', 'Observações', 'text'],
];

const tabsFor = () => isClinical() ? TABS.filter(([k]) => k !== 'odontograma' || hasDentists()).flatMap(t => t[0] === 'evolucao' ? [t, ['sinais', 'Sinais vitais']] : [t]) : TABS.filter(([k]) => ['plano', 'financeiro', 'retornos', 'consultas'].includes(k));
route('/paciente/:id', async ({ id }, q) => {
  const allowed = tabsFor().map(t => t[0]); let tab = q.get('tab') || allowed[0]; if (!allowed.includes(tab)) tab = allowed[0];
  const p = await db.get('patients', id); if (!p) return html`<div class="card empty">Paciente não encontrado. <a href="#/pacientes">Voltar</a></div>`;
  const content = await (TABRENDER[tab] || TABRENDER.resumo)(p, q);
  return html`
  <div class="pagehead"><div class="row"><a class="btn sm back" href="#/pacientes">${icon('back')}</a><h1>Prontuário do paciente</h1></div></div>
  <div class="card"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="avatar lg">${initials(p.name)}</span>
    <div class="grow" style="min-width:0"><div style="font-weight:800;font-size:1.1rem">${p.name} <span class="muted small">[${p.record_number || ''}]</span></div>
    <div class="small muted">${p.birth_date ? `${fDate(p.birth_date)} · ${age(p.birth_date)} anos` : 'Nascimento não informado'}${p.sex ? ' · ' + { F: 'Feminino', M: 'Masculino', O: 'Outro' }[p.sex] : ''} · <b>${insName(p.insurance_id).toUpperCase()}</b></div>
    <div class="row" style="gap:6px;margin-top:6px">${(p.tags || []).map(t => html`<span class="pill gray"># ${t}</span>`)}${p.active === false ? html`<span class="pill bad">inativo</span>` : ''}</div>
    ${p.alerts ? html`<div class="pill bad" style="margin-top:8px;white-space:normal">⚠ ${p.alerts}</div>` : ''}</div>
    <div class="row" style="gap:4px;flex-wrap:nowrap">${p.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Aqui é do ${S.clinic.name}.`)}" title="WhatsApp">${icon('wa')}</a>` : ''}<button class="btn sm" data-act="editPatient" data-id="${p.id}" title="Editar">${icon('edit')}</button></div></div>
    <div class="grid g4" style="margin-top:14px">
      ${isClinical() ? html`<button class="btn primary" data-act="newEvolution" data-id="${p.id}">${icon('edit')} Evoluir</button>
      <a class="btn accent" href="#/prescrever?p=${p.id}">${icon('pill')} Prescrever</a>` : html`<button class="btn primary" data-act="apptForPatient" data-id="${p.id}" data-name="${p.name}">${icon('cal')} Agendar</button>`}
      <button class="btn" data-act="newReturn" data-id="${p.id}">${icon('alarm')} Retorno</button>
      <button class="btn" data-act="patientAccess" data-id="${p.id}">${icon(p.user_id ? 'check' : 'globe')} ${p.user_id ? 'Tem acesso' : 'Acesso online'}</button>
      ${isClinical() ? html`<button class="btn" data-act="printRecord" data-id="${p.id}">${icon('print')} Imprimir</button>` : ''}
    </div></div>
  <nav class="tabs">${tabsFor().map(([k, l]) => html`<a class="${tab === k ? 'on' : ''}" href="#/paciente/${p.id}?tab=${k}">${l}</a>`)}</nav>
  ${content}`;
}, 'pacientes');

const TABRENDER = {
  /* ---- resumo automático ---- */
  async resumo(p) {
    const [an, ev, odo, plans, fin, appts, docs] = await Promise.all([
      db.list('anamneses', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 1 }), db.list('evolutions', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 3 }),
      db.list('odontogram', { eq: { patient_id: p.id } }), db.list('treatment_plans', { eq: { patient_id: p.id } }), db.list('finance_entries', { eq: { patient_id: p.id } }),
      db.list('appointments', { eq: { patient_id: p.id }, order: 'starts_at' }), db.list('documents', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 3 }),
    ]);
    const items = plans.length ? await db.list('treatment_items', { in: { plan_id: plans.map(x => x.id) } }) : [];
    const a = an[0]?.data || {}; const now = new Date();
    const flags = ANAM.filter(([k, , t]) => t === 'bool' && a[k]).map(([, l]) => l);
    const pend = items.filter(i => i.status === 'pendente'); const done = items.filter(i => i.status === 'realizado');
    const open = sum(fin.filter(f => f.kind === 'receita' && !f.paid_at), f => f.amount);
    const nextA = appts.find(x => new Date(x.starts_at) > now && !['cancelado', 'faltou'].includes(x.status));
    const lastA = [...appts].reverse().find(x => new Date(x.starts_at) <= now && x.status === 'atendido');
    const faltas = appts.filter(x => x.status === 'faltou').length;
    const lines = [
      `${p.name.split(' ')[0]} tem ${p.birth_date ? age(p.birth_date) + ' anos' : 'idade não informada'} e é atendido(a) por ${insName(p.insurance_id)}.`,
      p.alerts ? `Alerta clínico: ${p.alerts}.` : null,
      an[0] ? (flags.length ? `Na anamnese de ${fDate(an[0].created_at)} constam: ${flags.join('; ').toLowerCase()}.` : `Anamnese de ${fDate(an[0].created_at)} sem condições sistêmicas marcadas.`) : 'Ainda não há anamnese registrada.',
      a.medicamentos ? `Medicamentos em uso: ${a.medicamentos}.` : null, a.alergias ? `Alergias informadas: ${a.alergias}.` : null,
      a.queixa ? `Queixa principal: ${a.queixa}.` : null,
      odo.length ? `No odontograma há ${odo.filter(o => o.status === 'a_realizar').length} achado(s) a tratar e ${odo.filter(o => o.status === 'realizado').length} procedimento(s) já realizados.` : null,
      items.length ? `Plano de tratamento: ${done.length} de ${items.length} itens concluídos${pend.length ? `; faltam ${pend.slice(0, 4).map(i => i.description + (i.tooth ? ' (' + i.tooth + ')' : '')).join(', ')}${pend.length > 4 ? '…' : ''}` : ''}.` : null,
      lastA ? `Último atendimento em ${fDate(lastA.starts_at)}.` : null, nextA ? `Próxima consulta: ${fDT(nextA.starts_at)}.` : 'Sem consulta futura agendada.',
      faltas ? `Registro de ${faltas} falta(s).` : null, open ? `Valor em aberto: ${BRL(open)}.` : null,
    ].filter(Boolean);
    return html`<div class="grid g2 collapse">
      <div class="card"><div class="row between"><h2>${icon('sparkle')} Resumo do prontuário</h2></div><p class="tiny muted" style="margin:4px 0 10px">Montado automaticamente a partir dos registros do paciente.</p>${lines.map(l => html`<p style="margin:0 0 8px">${l}</p>`)}</div>
      <div class="stack"><div class="card"><h3>Últimas evoluções</h3>${ev.length ? html`<div class="tl" style="margin-top:10px">${ev.map(e => html`<div class="it"><div class="tiny muted">${fDT(e.created_at)} · ${e.professional_name || ''}</div><div class="small prose">${e.content.length > 220 ? e.content.slice(0, 220) + '…' : e.content}</div></div>`)}</div>` : html`<p class="muted small">Nenhuma evolução ainda.</p>`}</div>
      <div class="card"><h3>Documentos recentes</h3>${docs.length ? html`<div class="list" style="margin-top:8px">${docs.map(d => html`<div class="li">${icon(DOCT[d.doc_type]?.[1] || 'file')}<span class="grow small">${DOCT[d.doc_type]?.[0] || d.doc_type}</span><span class="tiny muted">${fDate(d.created_at)}</span></div>`)}</div>` : html`<p class="muted small">Nenhum documento.</p>`}</div></div></div>`;
  },

  /* ---- anamnese ---- */
  async anamnese(p) {
    const list = await db.list('anamneses', { eq: { patient_id: p.id }, order: 'created_at.desc' }); const a = list[0]?.data || {};
    return html`<div class="card"><div class="row between"><h2>Anamnese</h2><div class="row">${list[0] ? html`<span class="small muted">Última atualização ${fDT(list[0].created_at)}</span><button class="btn sm" data-act="printAnam" data-id="${p.id}">${icon('print')} Imprimir para assinatura</button>` : ''}</div></div>
    <form data-form="saveAnam" class="stack" style="margin-top:14px"><input type="hidden" name="patient_id" value="${p.id}">
    <div class="grid g2 collapse">${ANAM.filter(x => x[2] === 'bool').map(([k, l]) => html`<label class="check"><input type="checkbox" name="${k}" ${a[k] ? 'checked' : ''}> ${l}</label>`)}</div>
    <div class="grid g2 collapse">${ANAM.filter(x => x[2] === 'text').map(([k, l]) => html`<label class="f"><span>${l}</span><input class="in" name="${k}" value="${a[k] || ''}"></label>`)}</div>
    <div class="row between"><span class="tiny muted">Cada salvamento gera uma nova versão; as anteriores ficam no histórico (${list.length}).</span><button class="btn primary" type="submit">Salvar anamnese</button></div></form></div>`;
  },

  /* ---- odontograma ---- */
  async odontograma(p, q) {
    const rows = await db.list('odontogram', { eq: { patient_id: p.id }, order: 'created_at' }); const dec = q.get('dec') === '1';
    const by = groupBy(rows, r => r.tooth);
    const U = dec ? [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] : [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const L = dec ? [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] : [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    const arch = list => html`<div class="arch">${list.map((t, i) => html`${i === list.length / 2 ? raw('<span class="gap"></span>') : ''}${toothSvg(t, by[t] || [])}`)}</div>`;
    return html`<div class="card"><div class="row between"><h2>Odontograma</h2><div class="seg"><a class="${!dec ? 'on' : ''}" href="#/paciente/${p.id}?tab=odontograma">Permanente</a><a class="${dec ? 'on' : ''}" href="#/paciente/${p.id}?tab=odontograma&dec=1">Decídua</a></div></div>
      <p class="small muted">Toque em um dente para registrar achados, procedimentos ou incluir no plano de tratamento.</p>
      <div class="odo">${arch(U)}<div style="height:12px"></div>${arch(L)}</div>
      <div class="legend" style="margin-top:12px"><span><i style="background:#f2a5a5"></i>A realizar</span><span><i style="background:#9cc2f0"></i>Realizado</span><span><i style="background:#c8d0da"></i>Existente</span><span>A = ausente · X = extração · E = endodontia · C = coroa · I = implante · P = prótese · R = raiz residual</span></div></div>
    <div class="card"><h3>Registros</h3>${rows.length ? html`<div class="tblwrap" style="margin-top:10px"><table class="tbl"><tr><th>Dente</th><th>Faces</th><th>Condição</th><th>Situação</th><th>Data</th><th></th></tr>${rows.map(r => html`<tr><td><b>${r.tooth}</b></td><td>${(r.faces || []).join(', ') || '—'}</td><td>${r.condition}${r.notes ? html`<div class="tiny muted">${r.notes}</div>` : ''}</td><td>${odoStatusPill(r.status)}</td><td class="small">${fDate(r.created_at)}</td><td class="num"><button class="btn sm" data-act="odoCycle" data-id="${r.id}" title="Alterar situação">${icon('repeat')}</button> <button class="btn sm danger" data-act="odoDel" data-id="${r.id}">${icon('trash')}</button></td></tr>`)}</table></div>` : html`<p class="muted small">Nenhum registro ainda.</p>`}</div>`;
  },

  /* ---- evolução ---- */
  async evolucao(p) {
    const ev = await db.list('evolutions', { eq: { patient_id: p.id }, order: 'created_at.desc' });
    return html`<div class="card"><div class="row between" style="margin-bottom:12px"><h2>Evolução clínica</h2><button class="btn primary sm" data-act="newEvolution" data-id="${p.id}">${icon('plus')} Nova evolução</button></div>
    ${ev.length ? html`<div class="tl">${ev.map(e => html`<div class="it"><div class="row between"><b class="small">${fDT(e.created_at)}</b><button class="btn sm ghost danger" data-act="delEvo" data-id="${e.id}" title="Excluir">${icon('trash')}</button></div>
      <div class="card" style="padding:12px;margin-top:6px"><div class="tiny muted">${e.professional_name || ''}</div>${e.chief_complaint ? html`<div class="small"><b>Queixa / motivo:</b> ${e.chief_complaint}</div>` : ''}${e.cid ? html`<div class="small"><b>CID-10:</b> ${e.cid}</div>` : ''}<div class="prose small" style="margin-top:6px">${e.content}</div></div></div>`)}</div>` : html`<div class="empty">${icon('edit')}<div>Nenhuma evolução registrada.</div></div>`}</div>`;
  },

  /* ---- plano de tratamento ---- */
  async plano(p) {
    const plans = await db.list('treatment_plans', { eq: { patient_id: p.id }, order: 'created_at.desc' });
    const items = plans.length ? await db.list('treatment_items', { in: { plan_id: plans.map(x => x.id) }, order: 'created_at' }) : [];
    const PS = { orcamento: ['Orçamento', 'gray'], aprovado: ['Aprovado', 'ok'], em_andamento: ['Em andamento', 'warn'], concluido: ['Concluído', ''], recusado: ['Recusado', 'bad'] };
    return html`<div class="row between" style="margin-bottom:12px"><h2>Planos de tratamento</h2><button class="btn primary" data-act="newPlan" data-id="${p.id}">${icon('plus')} Novo plano</button></div>
    ${plans.length ? plans.map(pl => { const its = items.filter(i => i.plan_id === pl.id); const tot = sum(its, i => i.price); const fin = Math.max(0, tot - (+pl.discount || 0)); const pct = its.length ? Math.round(its.filter(i => i.status === 'realizado').length / its.length * 100) : 0;
      return html`<div class="card"><div class="row between"><div><h3>${pl.title}</h3><div class="tiny muted">Criado em ${fDate(pl.created_at)}${pl.payment_terms ? ' · ' + pl.payment_terms : ''}</div></div>
        <div class="row"><select class="in" style="height:32px;width:auto" data-change="planStatus" data-id="${pl.id}">${Object.entries(PS).map(([k, v]) => html`<option value="${k}" ${pl.status === k ? 'selected' : ''}>${v[0]}</option>`)}</select>
        <button class="btn sm" data-act="printPlan" data-id="${pl.id}">${icon('print')} Orçamento</button><button class="btn sm" data-act="billPlan" data-id="${pl.id}">${icon('money')} Gerar cobrança</button><button class="btn sm danger" data-act="delPlan" data-id="${pl.id}">${icon('trash')}</button></div></div>
        <div class="row" style="margin:10px 0"><div class="bar" style="flex:1"><i style="width:${pct}%"></i></div><span class="tiny muted">${pct}% concluído</span></div>
        ${its.length ? html`<div class="tblwrap"><table class="tbl"><tr><th></th><th>Procedimento</th><th>Dente</th><th class="num">Valor</th><th></th></tr>${its.map(i => html`<tr><td style="width:36px"><input type="checkbox" style="width:18px;height:18px;accent-color:var(--ok)" data-change="itemDone" data-id="${i.id}" ${i.status === 'realizado' ? 'checked' : ''} title="Marcar como realizado"></td><td>${i.description}${i.done_at ? html`<div class="tiny muted">Realizado em ${fDate(i.done_at)}</div>` : ''}</td><td>${i.tooth || '—'}${i.faces?.length ? ' ' + i.faces.join('') : ''}</td><td class="num">${BRL(i.price)}</td><td class="num"><button class="btn sm ghost danger" data-act="delItem" data-id="${i.id}">${icon('x')}</button></td></tr>`)}
          <tr><td></td><td colspan="2" class="num muted">Subtotal${+pl.discount ? html`<br>Desconto<br><b style="color:var(--ink)">Total</b>` : ''}</td><td class="num">${BRL(tot)}${+pl.discount ? html`<br>− ${BRL(pl.discount)}<br><b>${BRL(fin)}</b>` : ''}</td><td></td></tr></table></div>` : html`<p class="muted small">Nenhum procedimento neste plano.</p>`}
        <form data-form="addItem" class="grid g4" style="margin-top:12px;align-items:end"><input type="hidden" name="plan_id" value="${pl.id}"><input type="hidden" name="patient_id" value="${p.id}">
          <label class="f" style="grid-column:span 2"><span>Procedimento</span><select class="in" name="procedure_id" required data-change="procPrice"><option value="">Selecione…</option>${S.procedures.filter(x => x.active).map(x => html`<option value="${x.id}" data-price="${x.price}">${x.name}</option>`)}</select></label>
          <label class="f"><span>Dente</span><input class="in" name="tooth" inputmode="numeric" placeholder="Ex.: 36"></label>
          <label class="f"><span>Valor (R$)</span><input class="in" name="price" inputmode="decimal" required></label>
          <button class="btn" type="submit">${icon('plus')} Adicionar item</button>
          <label class="f"><span>Desconto do plano (R$)</span><input class="in" inputmode="decimal" value="${pl.discount || ''}" data-change="planDiscount" data-id="${pl.id}"></label></form></div>`; })
      : html`<div class="card empty">${icon('clip')}<div>Nenhum plano de tratamento.</div></div>`}`;
  },

  /* ---- documentos ---- */
  async documentos(p) {
    const docs = await db.list('documents', { eq: { patient_id: p.id }, order: 'created_at.desc' });
    return html`<div class="row between" style="margin-bottom:12px"><h2>Prescrições e documentos</h2><a class="btn primary" href="#/prescrever?p=${p.id}">${icon('plus')} Prescrever / laudar</a></div>
    ${docs.length ? html`<div class="stack">${docs.map(d => html`<details class="card"><summary class="row between" style="cursor:pointer;list-style:none"><span class="row">${icon(DOCT[d.doc_type]?.[1] || 'file')}<b>${DOCT[d.doc_type]?.[0] || d.doc_type}</b>${d.rx_type === 'controle_especial' ? html`<span class="pill warn">controle especial</span>` : ''}${d.sent_to ? html`<span class="pill ok">enviado</span>` : ''}${d.signed_file_path ? html`<span class="pill ok">assinado ICP-Brasil</span>` : ''}</span><span class="small muted">${fDT(d.created_at)}</span></summary>
      <div class="docprev" style="margin-top:12px">${raw(sanitize(d.content))}</div><div class="tiny muted" style="margin-top:6px">${d.professional_name || ''}</div>
      <div class="row" style="margin-top:10px"><a class="btn sm" href="#/prescrever?p=${p.id}&repetir=${d.id}">${icon('repeat')} Repetir</a><button class="btn sm" data-act="printDocId" data-id="${d.id}">${icon('print')} Imprimir</button>${d.signed_file_path ? html`<button class="btn sm ok" data-act="downloadSigned" data-id="${d.id}">${icon('down')} PDF assinado</button>` : html`<button class="btn sm" data-act="signDoc" data-id="${d.id}">${icon('check')} Assinar com certificado</button>`}${p.phone ? html`<button class="btn sm" data-act="sendDocId" data-id="${d.id}">${icon('wa')} Reenviar</button>` : ''}<button class="btn sm danger" data-act="delDoc" data-id="${d.id}">${icon('trash')}</button></div></details>`)}</div>`
      : html`<div class="card empty">${icon('pill')}<div>Nenhum documento emitido.</div></div>`}`;
  },

  /* ---- financeiro do paciente ---- */
  async financeiro(p) {
    const fin = await db.list('finance_entries', { eq: { patient_id: p.id }, order: 'due_date.desc' });
    const rec = fin.filter(f => f.kind === 'receita');
    return html`<div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><div class="l">Pago</div><div class="v" style="color:var(--ok)">${BRL(sum(rec.filter(f => f.paid_at), f => f.amount))}</div></div><div class="card kpi"><div class="l">Em aberto</div><div class="v">${BRL(sum(rec.filter(f => !f.paid_at), f => f.amount))}</div></div><div class="card kpi"><div class="l">Vencido</div><div class="v" style="color:var(--bad)">${BRL(sum(rec.filter(f => !f.paid_at && f.due_date < ymd(new Date())), f => f.amount))}</div></div></div>
    <div class="row between" style="margin-bottom:10px"><h2>Lançamentos</h2><a class="btn primary sm" href="#/financeiro?novo=receita&p=${p.id}">${icon('plus')} Receber pagamento</a></div>
    ${financeTable(fin, { [p.id]: p })}`;
  },

  /* ---- retornos ---- */
  async retornos(p) {
    const r = await db.list('return_alerts', { eq: { patient_id: p.id }, order: 'due_date.desc' }); const T = ymd(new Date());
    return html`<div class="row between" style="margin-bottom:12px"><h2>Alertas de retorno</h2><button class="btn primary" data-act="newReturn" data-id="${p.id}">${icon('plus')} Novo alerta</button></div>
    ${r.length ? html`<div class="list">${r.map(x => html`<div class="li">${icon('alarm')}<span class="grow"><span class="t">${x.reason || 'Retorno'}</span><span class="tiny muted">${fDate(x.due_date)}</span></span>${x.done ? html`<span class="pill ok">feito</span>` : html`<span class="pill ${x.due_date <= T ? 'warn' : 'gray'}">${x.due_date <= T ? 'pendente' : 'agendado'}</span><button class="btn sm" data-act="retDone" data-id="${x.id}">${icon('check')} Concluir</button>`}${p.phone && !x.done ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Está chegando a hora do seu retorno (${x.reason || 'revisão'}) no ${S.clinic.name}. Quer que a gente agende um horário?`)}">${icon('wa')}</a>` : ''}<button class="btn sm ghost danger" data-act="retDel" data-id="${x.id}">${icon('x')}</button></div>`)}</div>` : html`<div class="card empty">${icon('alarm')}<div>Nenhum alerta de retorno.</div></div>`}`;
  },

  async consultas(p) {
    const a = await db.list('appointments', { eq: { patient_id: p.id }, order: 'starts_at.desc' });
    return html`<div class="row between" style="margin-bottom:12px"><h2>Consultas</h2><button class="btn primary" data-act="apptForPatient" data-id="${p.id}" data-name="${p.name}">${icon('plus')} Agendar</button></div>
    ${a.length ? html`<div class="list">${a.map(x => html`<div class="li" data-act="editAppt" data-id="${x.id}" style="cursor:pointer"><b class="small" style="width:120px">${fDT(x.starts_at)}</b><span class="grow small">${KINDS[x.kind] || ''}${x.notes ? ' · ' + x.notes : ''}</span>${statusPill(x.status)}</div>`)}</div>` : html`<div class="card empty">Nenhuma consulta registrada.</div>`}`;
  },
};

/* ---- ações do prontuário ---- */
act('apptForPatient', el => modal('Novo agendamento', apptForm({ _date: ymd(new Date()), _time: '08:00' }, { id: el.dataset.id, name: el.dataset.name })));
onForm('saveAnam', async d => { const pid = d.patient_id; delete d.patient_id; await db.insert('anamneses', { patient_id: pid, data: d, created_by: Auth.userId() }); toast('Anamnese salva.', 'ok'); router(); });
act('printAnam', async el => {
  const p = await db.get('patients', el.dataset.id); const a = (await db.list('anamneses', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 1 }))[0]?.data || {};
  printDoc('Anamnese', `${docHeader()}<h1>Ficha de anamnese</h1><p><b>Paciente:</b> ${esc(p.name)} &nbsp; <b>Nascimento:</b> ${esc(fDate(p.birth_date))}</p><table>${ANAM.map(([k, l, t]) => `<tr><td>${esc(l)}</td><td><b>${t === 'bool' ? (a[k] ? 'Sim' : 'Não') : esc(a[k] || '—')}</b></td></tr>`).join('')}</table><p style="margin-top:22px;font-size:12px">Declaro que as informações acima são verdadeiras e que informarei qualquer alteração no meu estado de saúde.</p>${signature(p.guardian_name ? 'Responsável: ' + p.guardian_name : p.name, 'Assinatura do paciente / responsável')}<p style="text-align:right;margin-top:20px">${esc(S.clinic.city || '')}, ${esc(fDate(new Date()))}</p>`);
});

act('newEvolution', async el => {
  const tpls = ['Exame clínico realizado. ', 'Anestesia infiltrativa com lidocaína 2% c/ epinefrina 1:100.000. ', 'Isolamento absoluto. ', 'Restauração em resina composta, cor __, face __. ', 'Profilaxia com pasta e taça de borracha. ', 'Orientações de higiene oral fornecidas. ', 'Paciente sem queixas. '];
  modal('Nova evolução', html`<form data-form="saveEvo" class="stack"><input type="hidden" name="patient_id" value="${el.dataset.id}">
    <div class="grid g2"><label class="f"><span>Queixa / motivo do atendimento</span><input class="in" name="chief_complaint"></label><label class="f"><span>CID-10 (opcional)</span><input class="in" name="cid" placeholder="Ex.: K02.1" maxlength="12" style="text-transform:uppercase"></label></div>
    <label class="f"><span>Descrição do atendimento <i>*</i></span><textarea class="in" name="content" id="evotext" rows="7" required>${el.dataset.prefill || ''}</textarea></label>
    <div class="row" style="gap:6px">${S.me.profession === 'medicina' ? [['S: ', 'S (subjetivo)'], ['\nO: ', 'O (objetivo)'], ['\nA: ', 'A (avaliação)'], ['\nP: ', 'P (plano)']].map(([t, l]) => html`<button type="button" class="btn sm" data-act="evoIns" data-t="${t}">+ ${l}</button>`) : ''}${(S.me.profession === 'medicina' ? ['Exame físico sem alterações. ', 'Orientado(a) sobre sinais de alarme. ', 'Retorno em ___ dias. ', 'Paciente atendido(a) por teleconsulta, com termo de consentimento aceito. '] : tpls).map(t => html`<button type="button" class="btn sm" data-act="evoIns" data-t="${t}">+ ${t.split(' ').slice(0, 2).join(' ')}</button>`)}</div>
    <label class="check"><input type="checkbox" name="mark_done" checked> Marcar a consulta de hoje como atendida</label>
    <div class="row between"><span class="tiny muted">Registrado por ${S.me.full_name}</span><button class="btn primary" type="submit">Salvar evolução</button></div></form>`, { wide: true });
});
act('evoIns', el => { const t = document.getElementById('evotext'); t.value += el.dataset.t; t.focus(); });
onForm('saveEvo', async d => {
  await db.insert('evolutions', { patient_id: d.patient_id, cid: nz((d.cid || '').toUpperCase()), chief_complaint: nz(d.chief_complaint), content: d.content, professional_id: Auth.userId(), professional_name: S.me.full_name });
  if (d.mark_done) { const t0 = startOfDay(new Date()); const ap = await db.list('appointments', { eq: { patient_id: d.patient_id }, gte: { starts_at: t0.toISOString() }, lt: { starts_at: addDays(t0, 1).toISOString() } }); for (const a of ap) if (!['cancelado', 'faltou'].includes(a.status)) await db.update('appointments', a.id, { status: 'atendido' }); }
  closeModal(); toast('Evolução registrada.', 'ok'); go(`#/paciente/${d.patient_id}?tab=evolucao`);
});
act('delEvo', async el => { if (await confirmBox('Excluir esta evolução?', 'Excluir')) { await db.remove('evolutions', el.dataset.id); router(); } });

act('newReturn', el => modal('Alerta de retorno', html`<form data-form="saveReturn" class="stack"><input type="hidden" name="patient_id" value="${el.dataset.id}">
  <div class="row">${[[30, '1 mês'], [90, '3 meses'], [180, '6 meses'], [365, '1 ano']].map(([n, l]) => html`<button type="button" class="btn sm" data-act="retPreset" data-n="${n}">${l}</button>`)}</div>
  <label class="f"><span>Data do retorno <i>*</i></span><input class="in" type="date" name="due_date" id="retdate" required value="${ymd(addDays(new Date(), 180))}"></label>
  <label class="f"><span>Motivo</span><input class="in" name="reason" placeholder="Ex.: profilaxia semestral" value="Revisão periódica"></label>
  <button class="btn primary" type="submit">Criar alerta</button></form>`));
act('retPreset', el => (document.getElementById('retdate').value = ymd(addDays(new Date(), +el.dataset.n))));
onForm('saveReturn', async d => { await db.insert('return_alerts', { patient_id: d.patient_id, due_date: d.due_date, reason: nz(d.reason) }); closeModal(); toast('Alerta de retorno criado.', 'ok'); updateNotif(); go(`#/paciente/${d.patient_id}?tab=retornos`); });
act('retDone', async el => { await db.update('return_alerts', el.dataset.id, { done: true }); updateNotif(); router(); });
act('retDel', async el => { await db.remove('return_alerts', el.dataset.id); updateNotif(); router(); });

/* odontograma */
const ODO_FACE = ['Cárie', 'Restauração', 'Restauração insatisfatória', 'Selante', 'Fratura', 'Mancha branca', 'Lesão não cariosa'];
const ODO_WHOLE = { 'Ausente': 'A', 'Extração indicada': 'X', 'Canal (endodontia)': 'E', 'Coroa': 'C', 'Implante': 'I', 'Prótese': 'P', 'Raiz residual': 'R' };
const odoStatusPill = s => html`<span class="pill ${s === 'a_realizar' ? 'bad' : s === 'realizado' ? '' : 'gray'}">${{ a_realizar: 'A realizar', realizado: 'Realizado', existente: 'Existente' }[s]}</span>`;
function faceMap(t) { const q = Math.floor(t / 10), upper = [1, 2, 5, 6].includes(q), right = [1, 4, 5, 8].includes(q); return { top: upper ? 'V' : 'L', bottom: upper ? 'L' : 'V', left: right ? 'D' : 'M', right: right ? 'M' : 'D', center: 'O' }; }
function toothSvg(t, entries) {
  const fm = faceMap(t), cls = {}; let whole = null;
  entries.forEach(e => { if (ODO_WHOLE[e.condition]) whole = e; else (e.faces || []).forEach(f => (cls[f] = 'c-' + e.status)); });
  const poly = (pos, pts) => `<polygon class="f ${cls[fm[pos]] || ''}" points="${pts}"/>`;
  const col = whole ? (whole.status === 'a_realizar' ? '#c42b2b' : whole.status === 'realizado' ? '#0b57b3' : '#5f6b7a') : '';
  const svg = `<svg viewBox="0 0 40 40">${poly('top', '0,0 40,0 28,12 12,12')}${poly('bottom', '0,40 40,40 28,28 12,28')}${poly('left', '0,0 12,12 12,28 0,40')}${poly('right', '40,0 28,12 28,28 40,40')}<rect class="f ${cls.O || ''}" x="12" y="12" width="16" height="16"/>${whole ? `<rect x="1" y="1" width="38" height="38" fill="rgba(255,255,255,.75)"/><text x="20" y="27" text-anchor="middle" font-size="20" font-weight="800" fill="${col}">${ODO_WHOLE[whole.condition]}</text>` : ''}</svg>`;
  return html`<div class="tooth" data-act="odoTooth" data-t="${t}" title="Dente ${t}"><span class="n">${t}</span>${raw(svg)}</div>`;
}
act('odoTooth', el => {
  const t = +el.dataset.t, fm = faceMap(t), pid = location.hash.match(/paciente\/([^?]+)/)[1];
  const faces = [['V', 'Vestibular'], ['L', [1, 2, 5, 6].includes(Math.floor(t / 10)) ? 'Palatina' : 'Lingual'], ['M', 'Mesial'], ['D', 'Distal'], ['O', t % 10 <= 3 ? 'Incisal' : 'Oclusal']];
  modal(`Dente ${t}`, html`<form data-form="saveOdo" class="stack"><input type="hidden" name="patient_id" value="${pid}"><input type="hidden" name="tooth" value="${t}">
    <label class="f"><span>Condição / procedimento</span><select class="in" name="condition" required><optgroup label="Por face">${ODO_FACE.map(c => html`<option>${c}</option>`)}</optgroup><optgroup label="Dente inteiro">${Object.keys(ODO_WHOLE).map(c => html`<option>${c}</option>`)}</optgroup></select></label>
    <div><span class="small" style="font-weight:600;color:var(--ink-2)">Faces</span><div class="row" style="margin-top:6px">${faces.map(([k, l]) => html`<label class="check"><input type="checkbox" name="faces" value="${k}" data-multi="1"> ${l} (${k})</label>`)}</div></div>
    <label class="f"><span>Situação</span><select class="in" name="status"><option value="a_realizar">A realizar</option><option value="realizado">Realizado</option><option value="existente">Existente (pré-existente)</option></select></label>
    <label class="f"><span>Observação</span><input class="in" name="notes"></label>
    <label class="f"><span>Incluir no plano de tratamento (opcional)</span><select class="in" name="procedure_id"><option value="">Não incluir</option>${S.procedures.filter(x => x.active).map(x => html`<option value="${x.id}">${x.name} — ${BRL(x.price)}</option>`)}</select></label>
    <button class="btn primary" type="submit">Registrar</button></form>`);
});
onForm('saveOdo', async d => {
  const t = +d.tooth; const whole = !!ODO_WHOLE[d.condition];
  if (!whole && !(d.faces || []).length) throw new Error('Marque pelo menos uma face.');
  await db.insert('odontogram', { patient_id: d.patient_id, tooth: t, faces: whole ? [] : d.faces, condition: d.condition, status: d.status, notes: nz(d.notes) });
  if (d.procedure_id) {
    let plan = (await db.list('treatment_plans', { eq: { patient_id: d.patient_id }, in: { status: ['orcamento', 'aprovado', 'em_andamento'] }, order: 'created_at.desc', limit: 1 }))[0];
    if (!plan) plan = await db.insert('treatment_plans', { patient_id: d.patient_id, title: 'Plano de tratamento' });
    const pr = S.procedures.find(x => x.id === d.procedure_id);
    await db.insert('treatment_items', { plan_id: plan.id, procedure_id: pr.id, description: pr.name, tooth: t, faces: whole ? [] : d.faces, price: pr.price });
  }
  closeModal(); toast(d.procedure_id ? 'Registrado e incluído no plano.' : 'Registrado.', 'ok'); router();
});
act('odoCycle', async el => { const r = await db.get('odontogram', el.dataset.id); const nx = { a_realizar: 'realizado', realizado: 'existente', existente: 'a_realizar' }[r.status]; await db.update('odontogram', r.id, { status: nx }); router(); });
act('odoDel', async el => { if (await confirmBox('Excluir este registro do odontograma?', 'Excluir')) { await db.remove('odontogram', el.dataset.id); router(); } });

/* plano */
act('newPlan', async el => { await db.insert('treatment_plans', { patient_id: el.dataset.id, title: 'Plano de tratamento ' + fDate(new Date()) }); toast('Plano criado. Adicione os procedimentos.', 'ok'); router(); });
onInput('planStatus', async el => { await db.update('treatment_plans', el.dataset.id, { status: el.value }); toast('Status do plano atualizado.', 'ok'); });
onInput('planDiscount', async el => { const v = parseFloat(el.value.replace(/\./g, '').replace(',', '.')) || 0; await db.update('treatment_plans', el.dataset.id, { discount: v }); router(); });
onInput('procPrice', el => { const o = el.selectedOptions[0]; el.form.querySelector('[name=price]').value = o?.dataset.price || ''; });
onForm('addItem', async d => {
  const pr = S.procedures.find(x => x.id === d.procedure_id); const price = parseFloat(String(d.price).replace(/\./g, '').replace(',', '.'));
  if (!(price >= 0)) throw new Error('Valor inválido.');
  const tooth = d.tooth ? +d.tooth : null; if (tooth && !(tooth >= 11 && tooth <= 85)) throw new Error('Número de dente inválido (use a notação FDI, ex.: 36).');
  await db.insert('treatment_items', { plan_id: d.plan_id, procedure_id: pr.id, description: pr.name, tooth, price }); router();
});
onInput('itemDone', async el => {
  const it = await db.get('treatment_items', el.dataset.id); const done = el.checked;
  await db.update('treatment_items', it.id, { status: done ? 'realizado' : 'pendente', done_at: done ? new Date().toISOString() : null });
  if (done && it.tooth) { const pl0 = await db.get('treatment_plans', it.plan_id); const odo = await db.list('odontogram', { eq: { patient_id: pl0.patient_id, tooth: it.tooth, status: 'a_realizar' } }); for (const o of odo) if (!(it.faces || []).length || !(o.faces || []).length || o.faces.some(f => it.faces.includes(f))) await db.update('odontogram', o.id, { status: 'realizado' }); }
  if (done) { const pl = await db.get('treatment_plans', it.plan_id); await db.insert('evolutions', { patient_id: pl.patient_id, content: `Realizado: ${it.description}${it.tooth ? ' – dente ' + it.tooth : ''}.`, professional_id: Auth.userId(), professional_name: S.me.full_name }); if (pl.status === 'aprovado' || pl.status === 'orcamento') await db.update('treatment_plans', pl.id, { status: 'em_andamento' }); }
  toast(done ? 'Procedimento realizado e registrado na evolução.' : 'Item reaberto.', 'ok'); router();
});
act('delItem', async el => { await db.remove('treatment_items', el.dataset.id); router(); });
act('delPlan', async el => { if (await confirmBox('Excluir este plano e seus itens?', 'Excluir')) { await db.remove('treatment_plans', el.dataset.id); router(); } });
act('printPlan', async el => {
  const pl = await db.get('treatment_plans', el.dataset.id); const p = await db.get('patients', pl.patient_id); const its = await db.list('treatment_items', { eq: { plan_id: pl.id }, order: 'created_at' });
  const tot = sum(its, i => i.price);
  printDoc('Orçamento', `${docHeader()}<h1>Orçamento / plano de tratamento</h1><p><b>Paciente:</b> ${esc(p.name)}<br><b>Plano:</b> ${esc(pl.title)}</p><table><tr><th>Procedimento</th><th>Dente</th><th class="r">Valor</th></tr>${its.map(i => `<tr><td>${esc(i.description)}</td><td>${esc(i.tooth || '—')}</td><td class="r">${BRL(i.price)}</td></tr>`).join('')}<tr><td colspan="2" class="r">Subtotal</td><td class="r">${BRL(tot)}</td></tr>${+pl.discount ? `<tr><td colspan="2" class="r">Desconto</td><td class="r">− ${BRL(pl.discount)}</td></tr>` : ''}<tr><td colspan="2" class="r"><b>Total</b></td><td class="r"><b>${BRL(Math.max(0, tot - (+pl.discount || 0)))}</b></td></tr></table>${pl.payment_terms ? `<p><b>Condições:</b> ${esc(pl.payment_terms)}</p>` : ''}<p style="font-size:12px">Orçamento válido por 30 dias. Valores sujeitos a reavaliação caso o planejamento clínico mude durante o tratamento.</p><div style="display:flex;gap:30px">${signature(S.me.full_name, councilOf(S.me))}${signature(p.name, 'Paciente / responsável – de acordo')}</div><p style="text-align:right">${esc(S.clinic.city || '')}, ${esc(fDate(new Date()))}</p>`);
});
act('billPlan', async el => {
  const pl = await db.get('treatment_plans', el.dataset.id); const its = await db.list('treatment_items', { eq: { plan_id: pl.id } }); const tot = Math.max(0, sum(its, i => i.price) - (+pl.discount || 0));
  modal('Gerar cobrança do plano', html`<form data-form="billPlan" class="stack"><input type="hidden" name="plan_id" value="${pl.id}"><input type="hidden" name="patient_id" value="${pl.patient_id}"><input type="hidden" name="total" value="${tot}">
    <p style="margin:0">Total do plano: <b>${BRL(tot)}</b></p>
    <div class="grid g3"><label class="f"><span>Parcelas</span><select class="in" name="n">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => html`<option>${n}</option>`)}</select></label><label class="f"><span>1º vencimento</span><input class="in" type="date" name="first" value="${ymd(new Date())}"></label><label class="f"><span>Forma</span>${payMethodSelect()}</label></div>
    <label class="f"><span>Condições (aparece no orçamento)</span><input class="in" name="terms" value="${pl.payment_terms || ''}"></label>
    <button class="btn primary" type="submit">Lançar no financeiro</button></form>`);
});
onForm('billPlan', async d => {
  const n = +d.n, tot = +d.total; if (!tot) throw new Error('O plano está sem valor.');
  const parc = Math.floor(tot / n * 100) / 100; const rows = [];
  for (let i = 0; i < n; i++) { const due = parseYmd(d.first); due.setMonth(due.getMonth() + i); rows.push({ kind: 'receita', description: `Plano de tratamento – parcela ${i + 1}/${n}`, category: 'Procedimentos', amount: i === n - 1 ? Math.round((tot - parc * (n - 1)) * 100) / 100 : parc, due_date: ymd(due), method: d.method, patient_id: d.patient_id, plan_id: d.plan_id }); }
  await db.insert('finance_entries', rows); await db.update('treatment_plans', d.plan_id, { payment_terms: nz(d.terms) || `${n}x`, status: 'aprovado' });
  closeModal(); toast(`${n} lançamento(s) criados no financeiro.`, 'ok'); go(`#/paciente/${d.patient_id}?tab=financeiro`);
});

/* impressão do prontuário completo */
act('printRecord', async el => {
  const p = await db.get('patients', el.dataset.id);
  const [ev, docs, odo] = await Promise.all([db.list('evolutions', { eq: { patient_id: p.id }, order: 'created_at' }), db.list('documents', { eq: { patient_id: p.id }, order: 'created_at' }), db.list('odontogram', { eq: { patient_id: p.id }, order: 'tooth' })]);
  printDoc('Prontuário – ' + p.name, `${docHeader()}<h1>Prontuário odontológico</h1><p><b>Paciente:</b> ${esc(p.name)} · <b>Nº</b> ${esc(p.record_number || '')}<br><b>Nascimento:</b> ${esc(fDate(p.birth_date))} · <b>CPF:</b> ${esc(fCPF(p.cpf))} · <b>Convênio:</b> ${esc(insName(p.insurance_id))}<br><b>Telefone:</b> ${esc(fPhone(p.phone))} · <b>Endereço:</b> ${esc([p.address, p.city, p.state].filter(Boolean).join(', '))}${p.alerts ? `<br><b>Alertas:</b> ${esc(p.alerts)}` : ''}</p>
  <h3>Odontograma</h3><table><tr><th>Dente</th><th>Faces</th><th>Condição</th><th>Situação</th></tr>${odo.map(o => `<tr><td>${o.tooth}</td><td>${esc((o.faces || []).join(', '))}</td><td>${esc(o.condition)}</td><td>${esc({ a_realizar: 'A realizar', realizado: 'Realizado', existente: 'Existente' }[o.status])}</td></tr>`).join('') || '<tr><td colspan=4>—</td></tr>'}</table>
  <h3>Evolução</h3>${ev.map(e => `<p><b>${esc(fDT(e.created_at))}</b> – ${esc(e.professional_name || '')}<br>${e.chief_complaint ? 'Queixa: ' + esc(e.chief_complaint) + '<br>' : ''}${esc(e.content).replace(/\n/g, '<br>')}</p>`).join('') || '<p>—</p>'}
  <h3>Documentos emitidos</h3>${docs.map(d => `<p><b>${esc(fDT(d.created_at))}</b> – ${esc(DOCT[d.doc_type]?.[0] || d.doc_type)}</p>`).join('') || '<p>—</p>'}${signature(S.me.full_name, councilOf(S.me))}`);
});
