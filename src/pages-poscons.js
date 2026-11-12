/* ===== Exames pós-consulta: o profissional anexa na ficha, o paciente abre de onde estiver ===== */
const PC_COMMON = ['Resultado de exame', 'Laudo de ultrassonografia', 'Laudo de mamografia', 'Resultado de preventivo', 'Exames laboratoriais', 'Imagens do exame', 'Orientações pós-consulta', 'Plano alimentar', 'Radiografia', 'Tomografia'];
const pcFileOk = f => /^image\//.test(f.type) || f.type === 'application/pdf';

async function pcOpen(r) {
  if (r.file_data) await fileViewer(r.title, r.file_data, { type: r.file_type, name: r.file_name || r.title });
  else await fileViewer(r.title, await Remote.download('post-consult', r.file_path), { type: r.file_type, name: r.file_name || r.title });
  if (S.mode === 'patient' && !r.viewed_at) {
    if (isDemo()) await db.update('post_consult_exams', r.id, { viewed_at: new Date().toISOString() });
    else await db.rpc('post_consult_seen', { p_id: r.id }).catch(() => null);
  }
}

act('pcView', async el => { const r = await db.get('post_consult_exams', el.dataset.id); if (!r) return toast('Arquivo não encontrado.', 'bad'); await pcOpen(r); });

/* ---------- paciente ---------- */
proute('/pos-consulta', async () => {
  const list = await db.list('post_consult_exams', { eq: { patient_id: S.patient.id }, order: 'created_at.desc' }).catch(() => []);
  return html`<div class="pagehead"><h1>Exames pós-consulta</h1></div>
  <div class="card" style="border-left:4px solid var(--brand)"><p style="margin:0">Aqui ficam os arquivos que a equipe anexou para você depois da consulta: resultados, laudos, imagens e orientações. Dá para abrir no celular ou no computador, de onde você estiver.</p>
    <p class="small muted" style="margin:8px 0 0">Ficou com alguma dúvida sobre o resultado? Fale com a clínica ou marque um retorno.</p></div>
  ${list.length ? html`<div class="list" style="margin-top:14px">${list.map(r => html`<div class="li"><span>${icon(r.file_type === 'application/pdf' ? 'file' : 'clip')}</span><span class="grow"><b class="small">${r.title}</b><div class="tiny muted">${r.exam_date ? 'Exame de ' + fDate(r.exam_date) + ' · ' : ''}anexado em ${fDate(r.created_at)}</div>${r.note ? html`<div class="tiny">${r.note}</div>` : ''}</span>
    ${r.viewed_at ? '' : html`<span class="pill accent">novo</span>`}<button class="btn sm primary" data-act="pcView" data-id="${r.id}">${icon('file')} Abrir</button></div>`)}</div>`
    : html`<div class="card empty" style="margin-top:14px">${icon('file')}<div>Ainda não há exames pós-consulta para você.</div><div class="tiny muted" style="margin-top:6px">Quando a equipe anexar algum arquivo, ele aparece aqui e você recebe um aviso por e-mail.</div></div>`}`;
}, 'poscons');

/* ---------- equipe clínica (aba do prontuário) ---------- */
async function staffPostConsultTab(p) {
  const list = await db.list('post_consult_exams', { eq: { patient_id: p.id }, order: 'created_at.desc' }).catch(() => []);
  return html`<div class="card"><div class="row between"><h2>${icon('send')} Exames pós-consulta</h2><button class="btn primary" data-act="pcAdd" data-id="${p.id}">${icon('clip')} Anexar arquivos</button></div>
    <p class="tiny muted" style="margin:4px 0 10px">O que você anexar aqui aparece na área do paciente, em "Exames pós-consulta", e ele recebe um aviso por e-mail${p.email ? ` (${p.email})` : ''}.</p>
    ${p.user_id ? '' : html`<div class="pill warn" style="white-space:normal;margin-bottom:10px">Este paciente ainda não tem acesso online. Os arquivos ficam guardados, mas ele só consegue abrir depois de receber o acesso. <button class="btn sm" data-act="patientAccess" data-id="${p.id}">${icon('globe')} Liberar acesso</button></div>`}
    ${list.length ? html`<div class="list">${list.map(r => html`<div class="li"><span>${icon(r.file_type === 'application/pdf' ? 'file' : 'clip')}</span><span class="grow"><b class="small">${r.title}</b><div class="tiny muted">${r.exam_date ? 'Exame de ' + fDate(r.exam_date) + ' · ' : ''}anexado em ${fDT(r.created_at)}${r.file_name ? ' · ' + r.file_name : ''}</div>${r.note ? html`<div class="tiny">${r.note}</div>` : ''}</span>
      <span class="pill ${r.viewed_at ? 'ok' : 'gray'}">${r.viewed_at ? 'paciente abriu em ' + fDate(r.viewed_at) : 'ainda não aberto'}</span><button class="btn sm" data-act="pcView" data-id="${r.id}">${icon('file')} Abrir</button><button class="btn sm ghost danger" data-act="pcDel" data-id="${r.id}" title="Excluir">${icon('trash')}</button></div>`)}</div>`
      : html`<p class="muted small">Nenhum arquivo anexado ainda.</p>`}</div>`;
}

act('pcAdd', el => modal('Anexar exames pós-consulta', html`<form data-form="pcAdd" class="stack"><input type="hidden" name="patient_id" value="${el.dataset.id}">
  <label class="f"><span>Título <i>*</i></span><input class="in" name="title" list="pclist" required minlength="2" maxlength="120" placeholder="Ex.: Resultado do ultrassom transvaginal"><datalist id="pclist">${PC_COMMON.map(e => html`<option>${e}</option>`)}</datalist></label>
  <label class="f"><span>Data do exame</span><input class="in" type="date" name="exam_date"></label>
  <label class="f"><span>Recado para o paciente</span><textarea class="in" name="note" rows="3" maxlength="1500" placeholder="Ex.: resultado dentro do esperado; trazer na próxima consulta"></textarea></label>
  <label class="f"><span>Arquivos (PDF ou imagens) <i>*</i></span><input class="in" type="file" name="files" accept="application/pdf,image/*" multiple required></label>
  <p class="tiny muted" style="margin:0">Até 10 arquivos por vez, de no máximo 20 MB cada. O paciente vê assim que você enviar.</p>
  <button class="btn primary" type="submit">${icon('send')} Anexar e liberar para o paciente</button></form>`));

onForm('pcAdd', async (d, f) => {
  const files = [...(f.querySelector('[name=files]').files || [])];
  if (!files.length) throw new Error('Escolha o PDF ou as imagens.');
  if (files.length > 10) throw new Error('Anexe no máximo 10 arquivos por vez.');
  if (files.some(x => !pcFileOk(x))) throw new Error('Só dá para anexar PDF ou imagens (JPG, PNG).');
  const title = (d.title || '').trim(); if (title.length < 2) throw new Error('Dê um título ao arquivo.');
  const pid = d.patient_id, btn = f.querySelector('[type=submit]'); let done = 0;
  for (const file of files) {
    let blob = file, type = file.type;
    if (/^image\//.test(type) && !['image/jpeg', 'image/png', 'image/webp'].includes(type)) { blob = await shrinkPhoto(file); type = 'image/jpeg'; }
    if (blob.size > 20 * 1024 * 1024) throw new Error(`O arquivo ${file.name} passa de 20 MB.`);
    const id = uid(), ext = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp' }[type] || 'jpg';
    const row = { id, patient_id: pid, title: files.length > 1 ? `${title} (${done + 1}/${files.length})` : title, exam_date: nz(d.exam_date), note: nz((d.note || '').trim()), file_type: type, file_name: (file.name || '').slice(0, 200), file_path: `${S.clinic.id}/${pid}/${id}.${ext}` };
    if (isDemo()) row.file_data = await blobToData(blob);
    else await Remote.upload('post-consult', row.file_path, blob, false);
    await db.insert('post_consult_exams', row);
    done++; if (btn) btn.textContent = `Enviando… ${done}/${files.length}`;
  }
  closeModal(); toast(files.length > 1 ? `${files.length} arquivos anexados. O paciente já pode abrir.` : 'Arquivo anexado. O paciente já pode abrir.', 'ok'); router();
});

act('pcDel', async el => {
  if (!await confirmBox('Excluir este arquivo? Ele some também da área do paciente.', 'Excluir')) return;
  const r = await db.get('post_consult_exams', el.dataset.id);
  if (r && !isDemo()) await Remote.storageFetch(`object/post-consult/${r.file_path}`, { method: 'DELETE' }).catch(() => null);
  await db.remove('post_consult_exams', el.dataset.id); toast('Arquivo excluído.', 'ok'); router();
});
