/* ===== Prescrições e laudos ===== */
/* Posologias de referência usuais em odontologia — sempre revisar conforme o caso clínico. */
const MEDS_ODO = [
  ['Amoxicilina 500 mg', 'uso oral', '21 cápsulas', 'Tomar 1 cápsula de 8 em 8 horas, por 7 dias.'],
  ['Amoxicilina 500 mg (profilaxia antibiótica)', 'uso oral', '4 cápsulas', 'Tomar 4 cápsulas (2 g) em dose única, 30 a 60 minutos antes do procedimento.'],
  ['Amoxicilina + clavulanato de potássio 875/125 mg', 'uso oral', '14 comprimidos', 'Tomar 1 comprimido de 12 em 12 horas, por 7 dias.'],
  ['Azitromicina 500 mg', 'uso oral', '3 comprimidos', 'Tomar 1 comprimido ao dia, por 3 dias.'],
  ['Clindamicina 300 mg', 'uso oral', '21 cápsulas', 'Tomar 1 cápsula de 8 em 8 horas, por 7 dias.'],
  ['Metronidazol 400 mg', 'uso oral', '21 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, por 7 dias. Não ingerir bebida alcoólica durante o uso e até 48 horas após.'],
  ['Dipirona sódica 500 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias.'],
  ['Dipirona sódica 1 g', 'uso oral', '8 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 2 dias.'],
  ['Paracetamol 750 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias. Não ultrapassar 4 comprimidos por dia.'],
  ['Ibuprofeno 600 mg', 'uso oral', '9 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 3 dias.'],
  ['Nimesulida 100 mg', 'uso oral', '6 comprimidos', 'Tomar 1 comprimido de 12 em 12 horas, após as refeições, por 3 dias.'],
  ['Cetorolaco de trometamol 10 mg', 'uso sublingual', '9 comprimidos', 'Dissolver 1 comprimido sob a língua de 8 em 8 horas, por até 3 dias.'],
  ['Dexametasona 4 mg', 'uso oral', '2 comprimidos', 'Tomar 2 comprimidos (8 mg) em dose única, 1 hora antes do procedimento.'],
  ['Digluconato de clorexidina 0,12% (solução)', 'uso tópico', '1 frasco', 'Bochechar 15 mL por 1 minuto, de 12 em 12 horas, por 7 dias. Não engolir. Iniciar 30 minutos após a escovação.'],
  ['Nistatina suspensão oral 100.000 UI/mL', 'uso tópico/oral', '1 frasco', 'Bochechar 5 mL, mantendo na boca o maior tempo possível antes de engolir, 4 vezes ao dia, por 14 dias.'],
  ['Aciclovir creme 5%', 'uso tópico', '1 bisnaga', 'Aplicar sobre a lesão 5 vezes ao dia, por 5 a 7 dias.'],
  ['Fluoreto de sódio 0,05% (solução para bochecho)', 'uso tópico', '1 frasco', 'Bochechar 10 mL por 1 minuto, 1 vez ao dia, à noite, após a escovação. Não engolir.'],
];
/* Referências usuais para adultos em clínica médica — revisar dose, intervalo e duração para cada paciente. */
const MEDS_MED = [
  ['Dipirona sódica 1 g', 'uso oral', '10 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se dor ou febre.'],
  ['Paracetamol 750 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se dor ou febre. Não ultrapassar 4 comprimidos por dia.'],
  ['Ibuprofeno 600 mg', 'uso oral', '9 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 3 dias.'],
  ['Amoxicilina 500 mg', 'uso oral', '21 cápsulas', 'Tomar 1 cápsula de 8 em 8 horas, por 7 dias.'],
  ['Azitromicina 500 mg', 'uso oral', '3 comprimidos', 'Tomar 1 comprimido ao dia, por 3 dias.'],
  ['Cefalexina 500 mg', 'uso oral', '28 cápsulas', 'Tomar 1 cápsula de 6 em 6 horas, por 7 dias.'],
  ['Omeprazol 20 mg', 'uso oral', '30 cápsulas', 'Tomar 1 cápsula em jejum, 30 minutos antes do café da manhã, por 30 dias.'],
  ['Loratadina 10 mg', 'uso oral', '5 comprimidos', 'Tomar 1 comprimido ao dia, por 5 dias.'],
  ['Ondansetrona 4 mg (orodispersível)', 'uso oral', '10 comprimidos', 'Dissolver 1 comprimido na boca de 8 em 8 horas, se náusea ou vômito.'],
  ['Butilbrometo de escopolamina 10 mg', 'uso oral', '10 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, se cólica.'],
  ['Prednisona 20 mg', 'uso oral', '5 comprimidos', 'Tomar 1 comprimido pela manhã, após o café, por 5 dias.'],
  ['Sais para reidratação oral', 'uso oral', '4 envelopes', 'Diluir 1 envelope em 1 litro de água filtrada e tomar aos poucos ao longo do dia, principalmente após cada evacuação líquida.'],
];
const curMeds = () => S.me?.profession === 'medicina' ? MEDS_MED : MEDS_ODO;
const RXTYPES = { simples: 'Simples (uma via)', controle_especial: 'Controle especial (duas vias)' };

route('/prescrever', async (_, q) => {
  const pid = q.get('p'); const rep = q.get('repetir'); const tipo = q.get('tipo') || 'receituario';
  const p = pid ? await db.get('patients', pid) : null; const repDoc = rep ? await db.get('documents', rep) : null;
  const type = repDoc?.doc_type || tipo;
  const tpls = await db.list('document_templates', { order: 'title' });
  const hist = p ? await db.list('documents', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 5 }) : [];
  window.__tpls = tpls; await loadAllergy(p);
  after(() => { const ed = document.getElementById('rxed'); if (ed) ed.innerHTML = repDoc ? sanitize(repDoc.content) : ''; });
  return html`<div class="pagehead"><div class="row">${p ? html`<a class="btn sm back" href="#/paciente/${p.id}?tab=documentos">${icon('back')}</a>` : ''}<h1>Prescrições e laudos</h1></div></div>
  <form id="rxform" onsubmit="return false" class="stack">
    <div class="card"><h2 style="color:var(--brand);margin-bottom:12px">Informe os dados do paciente</h2>
      <label class="f"><span>Nome completo <i>*</i></span>${patientPicker(p)}</label><div id="rxallergy">${allergyBanner()}</div>
      <div class="grid g2 collapse" style="margin-top:12px"><label class="f"><span>E-mail</span><input class="in" name="email" type="email" value="${p?.email || ''}"></label><label class="f"><span>Telefone celular</span><input class="in" name="phone" inputmode="tel" value="${fPhone(p?.phone)}"></label></div></div>
    <div class="card stack">
      <label class="f"><span>Profissional</span><select class="in" name="professional_id">${S.members.map(m => html`<option value="${m.user_id}" ${m.user_id === Auth.userId() ? 'selected' : ''}>${m.full_name} ${councilOf(m) ? '· ' + councilOf(m) : ''}</option>`)}</select></label>
      <div><span class="small" style="font-weight:600;color:var(--ink-2)">Escolha um tipo</span><input type="hidden" name="doc_type" value="${type}">
      <div class="doctype" style="margin-top:8px">${Object.entries(DOCT).map(([k, [l, ic]]) => html`<button type="button" class="${k === type ? 'on' : ''}" data-act="rxType" data-t="${k}">${icon(ic)}${l}</button>`)}</div></div>
      <div class="grid g2 collapse" style="align-items:end"><label class="f"><span>Modelo personalizado</span><select class="in" id="rxtpl" data-change="rxTpl"><option value="">Selecione…</option>${tpls.filter(t => t.doc_type === type).map(t => html`<option value="${t.id}">${t.title}</option>`)}</select></label>
        <div class="row"><button type="button" class="btn sm" data-act="manageTpl">${icon('edit')} Editar lista de modelos</button></div></div>
      ${examBox(type)}
      <div id="medbox" class="${type === 'receituario' ? '' : 'hidden'}"><div class="grid g2 collapse" style="align-items:end"><label class="f"><span>Adicionar medicamento</span><select class="in" id="rxmed" data-change="rxMed"><option value="">Selecione…</option>${curMeds().map((m, i) => html`<option value="${i}">${m[0]}</option>`)}</select></label>
        <label class="f"><span>Quantidade</span><input class="in" id="rxqty"></label></div>
        <label class="f" style="margin-top:10px"><span>Posologia</span><input class="in" id="rxpos"></label>
        <div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="rxClearMed">${icon('x')} Remover</button><button type="button" class="btn ok" data-act="rxAddMed">${icon('plus')} Adicionar</button></div>
        <p class="tiny muted" style="margin:8px 0 0">Posologias de referência. Confira dose, intervalo e duração para cada paciente (idade, peso, alergias, função renal/hepática).</p></div>
      <div><span class="small" style="font-weight:600;color:var(--ink-2)">Escreva o documento <i style="color:var(--bad);font-style:normal">*</i></span>
        <div class="editor-bar" style="margin-top:6px">${[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['undo', '↶'], ['redo', '↷'], ['insertOrderedList', '1.'], ['insertUnorderedList', '•']].map(([c, l]) => html`<button type="button" data-act="rxCmd" data-c="${c}" title="${c}">${l}</button>`)}</div>
        <div class="editor" id="rxed" contenteditable="true"></div></div>
      <div class="grid g2 collapse"><label class="f ${type === 'receituario' ? '' : 'hidden'}" id="rxtypebox"><span>Tipo de receituário</span><select class="in" name="rx_type">${Object.entries(RXTYPES).map(([k, v]) => html`<option value="${k}" ${repDoc?.rx_type === k ? 'selected' : ''}>${v}</option>`)}</select></label>
        <div class="stack"><label class="check"><input type="checkbox" name="save_tpl"> Salvar como modelo para uso futuro</label><label class="check"><input type="checkbox" name="no_date"> Emitir sem data</label></div></div>
      <div class="tip">${icon('bulb')}<span>Cabeçalho, endereço e assinatura saem dos dados da clínica e do seu cadastro. <a href="#/configuracoes">Ajustar agora</a>. O envio por WhatsApp manda uma cópia em texto; para receita digital com validade em farmácia é preciso assinar com certificado ICP-Brasil.</span></div>
      <div class="grid g2"><button type="button" class="btn ok" data-act="rxSave" data-mode="print">${icon('print')} Salvar e imprimir</button><button type="button" class="btn primary" data-act="rxSave" data-mode="send">${icon('send')} Salvar e enviar</button></div>
    </div>
  </form>
  ${hist.length ? html`<div class="card" style="margin-top:14px"><h3>Últimos documentos de ${p.name.split(' ')[0]}</h3><div class="list" style="margin-top:8px">${hist.map(d => html`<div class="li">${icon(DOCT[d.doc_type]?.[1])}<span class="grow small">${DOCT[d.doc_type]?.[0]} · ${fDT(d.created_at)}</span><a class="btn sm" href="#/prescrever?p=${p.id}&repetir=${d.id}">${icon('repeat')} Repetir</a></div>`)}</div></div>` : ''}`;
}, 'prescrever');

/* checagem de alergia antes de prescrever */
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function loadAllergy(p) {
  window.__allergy = '';
  if (!p) return;
  const a = (await db.list('anamneses', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 1 }))[0]?.data || {};
  window.__allergy = [p.alerts, a.alergias].filter(Boolean).join(' · ');
}
const allergyBanner = () => window.__allergy ? html`<div class="pill bad" style="margin-top:10px;white-space:normal">⚠ Alertas/alergias do paciente: ${window.__allergy}</div>` : '';
const CLASSES = [[/amoxicilina|ampicilina|penicilina|clavulan/, /penicil|amoxi|ampici|betalact|beta-lact/], [/ibuprofeno|nimesulida|cetorolaco|diclofenaco|naproxeno/, /aine|anti-?inflamat|ibupro|nimesul|cetorol|diclofen|aspirina|\baas\b|acido acetilsalicilico/], [/dipirona|metamizol/, /dipirona|metamizol/], [/azitromicina|eritromicina|claritromicina/, /macrolid|azitro|eritro|claritro/], [/clorexidina/, /clorexidina/]];
function allergyHit(medName) {
  const al = norm(window.__allergy); if (!al) return false; const m = norm(medName);
  if (CLASSES.some(([med, alg]) => med.test(m) && alg.test(al))) return true;
  return m.split(/[^a-z]+/).filter(w => w.length >= 6).some(w => al.includes(w));
}
act('rxType', el => {
  const f = document.getElementById('rxform'); f.doc_type.value = el.dataset.t;
  f.querySelectorAll('.doctype button').forEach(b => b.classList.toggle('on', b === el));
  document.getElementById('medbox').classList.toggle('hidden', el.dataset.t !== 'receituario');
  document.getElementById('exambox')?.classList.toggle('hidden', el.dataset.t !== 'exames');
  document.getElementById('rxtypebox').classList.toggle('hidden', el.dataset.t !== 'receituario');
  document.getElementById('rxtpl').innerHTML = fv(html`<option value="">Selecione…</option>${(window.__tpls || []).filter(t => t.doc_type === el.dataset.t).map(t => html`<option value="${t.id}">${t.title}</option>`)}`);
});
onInput('rxTpl', el => {
  const t = (window.__tpls || []).find(x => x.id === el.value); if (!t) return;
  const name = document.querySelector('#rxform [name=patient_name]').value || '______________';
  const ed = document.getElementById('rxed'); ed.innerHTML = (ed.innerHTML.trim() ? ed.innerHTML : '') + sanitize(t.content).replace(/\{paciente\}/g, esc(name));
});
onInput('rxMed', el => { const m = curMeds()[el.value]; document.getElementById('rxqty').value = m ? m[2] : ''; document.getElementById('rxpos').value = m ? m[3] : ''; });
act('rxClearMed', () => { document.getElementById('rxmed').value = ''; document.getElementById('rxqty').value = ''; document.getElementById('rxpos').value = ''; });
act('rxAddMed', async () => {
  const m = curMeds()[document.getElementById('rxmed').value]; if (!m) return toast('Escolha um medicamento.', 'bad');
  if (allergyHit(m[0]) && !(await confirmBox(`Atenção: o paciente tem registro de "${window.__allergy}". ${m[0]} pode estar relacionado. Incluir mesmo assim?`, 'Incluir mesmo assim'))) return;
  const ed = document.getElementById('rxed'); const n = (ed.querySelectorAll('[data-med]').length || ed.innerHTML.match(/<p>\d+\./g)?.length || 0) + 1;
  const via = m[1]; const hasVia = ed.textContent.toLowerCase().includes(via);
  ed.insertAdjacentHTML('beforeend', `${hasVia ? '' : `<p><b>${esc(via[0].toUpperCase() + via.slice(1))}</b></p>`}<p data-med="1">${n}. ${esc(m[0])} ———— ${esc(document.getElementById('rxqty').value)}<br>${esc(document.getElementById('rxpos').value)}</p>`);
  ACT.rxClearMed();
});
act('rxCmd', el => { document.getElementById('rxed').focus(); document.execCommand(el.dataset.c, false, null); });
act('rxSave', async el => {
  const f = document.getElementById('rxform'); const d = formData(f); const content = sanitize(document.getElementById('rxed').innerHTML);
  if (!htmlToText(content)) throw new Error('Escreva o conteúdo do documento.');
  if (d.doc_type === 'receituario' && window.__allergy) { const hit = curMeds().find(m => norm(htmlToText(content)).includes(norm(m[0].split(' ')[0])) && allergyHit(m[0])); if (hit && !(await confirmBox(`O texto inclui ${hit[0].split(' ')[0]} e o paciente tem registro de "${window.__allergy}". Salvar mesmo assim?`, 'Salvar mesmo assim'))) return; }
  el.disabled = true;
  try {
    const pid = await resolvePatient(d, { phone: onlyDigits(d.phone), email: d.email });
    const p = await db.get('patients', pid);
    if (d.phone && onlyDigits(d.phone) !== (p.phone || '')) { await db.update('patients', pid, { phone: onlyDigits(d.phone) }); p.phone = onlyDigits(d.phone); }
    const prof = S.members.find(m => m.user_id === d.professional_id) || S.me;
    const doc = await db.insert('documents', { content_hash: await sha256(content), patient_id: pid, professional_id: prof.user_id, professional_name: prof.full_name, doc_type: d.doc_type, rx_type: d.doc_type === 'receituario' ? d.rx_type : null, content, no_date: !!d.no_date, sent_to: el.dataset.mode === 'send' ? nz(p.phone) : null });
    if (d.save_tpl) { const title = prompt('Nome do modelo:', DOCT[d.doc_type][0] + ' – ' + fDate(new Date())); if (title) await db.insert('document_templates', { doc_type: d.doc_type, title, content }); }
    if (el.dataset.mode === 'print') printDocument(doc, p, prof); else sendDocument(doc, p, prof);
    toast('Documento salvo com sucesso!', 'ok'); go(`#/paciente/${pid}?tab=documentos`);
  } finally { el.disabled = false; }
});

function printDocument(doc, p, prof) {
  const title = DOCT[doc.doc_type]?.[0] || 'Documento'; const city = S.clinic.city || '';
  const dateLine = doc.no_date ? `<p style="text-align:right;margin-top:26px">${esc(city)}, ____/____/________</p>` : `<p style="text-align:right;margin-top:26px">${esc(city)}${city ? ', ' : ''}${esc(new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))}</p>`;
  const body = (via) => `<div class="page">${docHeader()}<h1>${doc.rx_type === 'controle_especial' ? 'Receituário de controle especial' : esc(title)}</h1>${via ? `<p style="text-align:right;font-size:12px"><b>${via}</b></p>` : ''}
    <p><b>Paciente:</b> ${esc(p.name)}${doc.rx_type === 'controle_especial' ? `<br><b>Endereço:</b> ${esc([p.address, p.city, p.state].filter(Boolean).join(', ') || '________________________________')}` : ''}</p>
    <div style="min-height:260px">${sanitize(doc.content).replace(/\{paciente\}/g, esc(p.name))}</div>${dateLine}${signature(prof.full_name, councilOf(prof))}
    ${doc.rx_type === 'controle_especial' ? `<div style="display:flex;gap:12px;margin-top:20px"><div class="box" style="flex:1"><b>Identificação do comprador</b><br>Nome:<br>RG:<br>Endereço:<br>Telefone:</div><div class="box" style="flex:1"><b>Identificação do fornecedor</b><br><br><br>Assinatura do farmacêutico &nbsp; Data: __/__/__</div></div>` : ''}
    <div class="ft">${esc(S.clinic.name)} · ${esc(fPhone(S.clinic.phone))}${doc.verify_code ? ` · Código de verificação <b>${esc(doc.verify_code)}</b> — confira em ${esc(verifyUrl(doc.verify_code))}` : ''}</div></div>`;
  printDoc(title + ' – ' + p.name, doc.rx_type === 'controle_especial' ? body('1ª via – Farmácia') + body('2ª via – Paciente') : body(''));
}
function sendDocument(doc, p, prof) {
  if (!p.phone) { toast('Paciente sem telefone. Documento salvo; imprima ou cadastre o celular.', 'bad'); return; }
  const txt = `Olá, ${p.name.split(' ')[0]}! Segue seu documento (${DOCT[doc.doc_type][0].toLowerCase()}) do ${S.clinic.name}:\n\n${htmlToText(doc.content).replace(/\{paciente\}/g, p.name)}\n\n${prof.full_name}${councilOf(prof) ? ' – ' + councilOf(prof) : ''}${doc.no_date ? '' : '\n' + fDate(doc.created_at)}`;
  window.open(waLink(p.phone, txt), '_blank', 'noopener');
}
act('printDocId', async el => { const d = await db.get('documents', el.dataset.id); const p = await db.get('patients', d.patient_id); printDocument(d, p, S.members.find(m => m.user_id === d.professional_id) || { full_name: d.professional_name }); });
act('sendDocId', async el => { const d = await db.get('documents', el.dataset.id); const p = await db.get('patients', d.patient_id); sendDocument(d, p, S.members.find(m => m.user_id === d.professional_id) || { full_name: d.professional_name }); await db.update('documents', d.id, { sent_to: p.phone }); });
act('delDoc', async el => { if (await confirmBox('Excluir este documento do prontuário?', 'Excluir')) { await db.remove('documents', el.dataset.id); router(); } });

/* modelos personalizados */
act('manageTpl', async () => {
  const tpls = await db.list('document_templates', { order: 'doc_type,title' }); window.__tpls = tpls;
  modal('Modelos personalizados', html`<div class="list">${tpls.length ? tpls.map(t => html`<div class="li"><span class="grow"><span class="t">${t.title}</span><span class="tiny muted">${DOCT[t.doc_type]?.[0]}</span></span><button class="btn sm" data-act="editTpl" data-id="${t.id}">${icon('edit')}</button><button class="btn sm danger" data-act="delTpl" data-id="${t.id}">${icon('trash')}</button></div>`) : html`<div class="empty small">Nenhum modelo.</div>`}</div>
    <button class="btn primary" style="margin-top:12px" data-act="editTpl" data-id="">${icon('plus')} Novo modelo</button><p class="tiny muted">Use {paciente} no texto para inserir o nome do paciente automaticamente.</p>`, { wide: true });
});
act('editTpl', async el => {
  const t = el.dataset.id ? await db.get('document_templates', el.dataset.id) : { doc_type: document.querySelector('#rxform [name=doc_type]')?.value || 'receituario' };
  modal(t.id ? 'Editar modelo' : 'Novo modelo', html`<form data-form="saveTpl" class="stack"><input type="hidden" name="id" value="${t.id || ''}">
    <div class="grid g2"><label class="f"><span>Título <i>*</i></span><input class="in" name="title" required value="${t.title || ''}"></label><label class="f"><span>Tipo</span><select class="in" name="doc_type">${Object.entries(DOCT).map(([k, [l]]) => html`<option value="${k}" ${t.doc_type === k ? 'selected' : ''}>${l}</option>`)}</select></label></div>
    <div class="editor-bar">${[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['insertOrderedList', '1.'], ['insertUnorderedList', '•']].map(([c, l]) => html`<button type="button" data-act="tplCmd" data-c="${c}">${l}</button>`)}</div><div class="editor" id="tpled" contenteditable="true">${raw(sanitize(t.content || ''))}</div>
    <button class="btn primary" type="submit">Salvar modelo</button></form>`, { wide: true });
});
act('tplCmd', el => { document.getElementById('tpled').focus(); document.execCommand(el.dataset.c, false, null); });
onForm('saveTpl', async d => {
  const content = sanitize(document.getElementById('tpled').innerHTML); if (!htmlToText(content)) throw new Error('O modelo está vazio.');
  const row = { title: d.title, doc_type: d.doc_type, content }; if (d.id) await db.update('document_templates', d.id, row); else await db.insert('document_templates', row);
  closeModal(); toast('Modelo salvo.', 'ok'); router();
});
act('delTpl', async el => { if (await confirmBox('Excluir este modelo?', 'Excluir')) { await db.remove('document_templates', el.dataset.id); closeModal(); router(); } });
