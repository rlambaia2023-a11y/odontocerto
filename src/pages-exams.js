/* ===== Exames: o paciente anexa no portal (PDF ou fotos), o profissional vê no prontuário ===== */
const EX_ST = { novo: ['warn', 'enviado'], visto: ['ok', 'visto pelo profissional'] };
const EX_COMMON = ['Hemograma completo', 'Glicemia de jejum', 'Hemoglobina glicada', 'Colesterol e triglicerídeos', 'TSH e T4 livre', 'Beta-HCG', 'Ultrassonografia transvaginal', 'Ultrassonografia obstétrica', 'Ultrassonografia de mamas', 'Mamografia', 'Preventivo (Papanicolau)', 'Urina tipo 1 (EAS)', 'Urocultura', 'Vitamina D', 'Ferritina', 'Radiografia panorâmica', 'Tomografia', 'Eletrocardiograma'];
const exFileOk = f => /^image\//.test(f.type) || f.type === 'application/pdf';

async function exOpen(r) {
  if (r.file_data) return fileViewer(r.exam_name, r.file_data, { type: r.file_type, name: r.file_name || r.exam_name });
  const blob = await Remote.download('patient-exams', r.file_path);
  await fileViewer(r.exam_name, blob, { type: r.file_type, name: r.file_name || r.exam_name });
}

/* ---------- paciente ---------- */
proute('/exames', async (_, q) => {
  if (q && q.get && q.get('anexar')) after(() => ACT.pExam());
  const list = await db.list('patient_exams', { eq: { patient_id: S.patient.id }, order: 'created_at.desc' }).catch(() => []);
  return html`<div class="pagehead"><h1>Meus exames</h1><button class="btn primary" data-act="pExam">${icon('clip')} Anexar exames</button></div>
  <div class="card" style="border-left:4px solid var(--brand)"><p style="margin:0">Fez algum exame? Mande por aqui antes da consulta. Pode ser o <b>PDF</b> do laboratório ou <b>fotos</b> do resultado, uma ou várias páginas.</p>
    <p class="small muted" style="margin:8px 0 0">Só os profissionais de saúde que te atendem veem seus exames.</p></div>
  ${list.length ? html`<div class="list" style="margin-top:14px">${list.map(r => html`<div class="li"><span>${icon(r.file_type === 'application/pdf' ? 'file' : 'clip')}</span><span class="grow"><b class="small">${r.exam_name}</b><div class="tiny muted">${r.exam_date ? 'Feito em ' + fDate(r.exam_date) + ' · ' : ''}enviado em ${fDate(r.created_at)}${r.file_name ? ' · ' + r.file_name : ''}</div>${r.description ? html`<div class="tiny muted">${r.description}</div>` : ''}</span>
    <span class="pill ${(EX_ST[r.status] || EX_ST.novo)[0]}">${(EX_ST[r.status] || EX_ST.novo)[1]}</span><button class="btn sm" data-act="exView" data-id="${r.id}">${icon('file')} Ver</button>${r.status === 'novo' ? html`<button class="btn sm ghost" data-act="pExamDel" data-id="${r.id}" title="Apagar envio">${icon('trash')}</button>` : ''}</div>`)}</div>`
    : html`<div class="card empty" style="margin-top:14px">${icon('clip')}<div>Você ainda não enviou nenhum exame.</div><button class="btn primary sm" style="margin-top:10px" data-act="pExam">Anexar exames</button></div>`}`;
}, 'exames');

act('pExam', () => modal('Anexar exames', html`<form data-form="pExam" class="stack">
  <label class="f"><span>Qual é o exame? <i>*</i></span><input class="in" name="exam_name" list="exlist" required minlength="2" maxlength="120" placeholder="Ex.: Hemograma completo, ultrassom transvaginal"><datalist id="exlist">${EX_COMMON.map(e => html`<option>${e}</option>`)}</datalist></label>
  <label class="f"><span>Data em que fez o exame</span><input class="in" type="date" name="exam_date" max="${ymd(new Date())}"></label>
  <label class="f"><span>Descreva o exame</span><textarea class="in" name="description" rows="3" maxlength="1000" placeholder="Ex.: pedido da Dra. na última consulta; laboratório; alguma observação"></textarea></label>
  <label class="f"><span>Arquivos (PDF ou fotos) <i>*</i></span><input class="in" type="file" name="files" accept="application/pdf,image/*" multiple required></label>
  <p class="tiny muted" style="margin:0">Pode escolher várias fotos de uma vez (uma para cada página). Até 10 arquivos, de no máximo 15 MB cada.</p>
  <button class="btn primary" type="submit">${icon('send')} Enviar exames</button></form>`));

onForm('pExam', async (d, f) => {
  const files = [...(f.querySelector('[name=files]').files || [])];
  if (!files.length) throw new Error('Escolha o PDF ou as fotos do exame.');
  if (files.length > 10) throw new Error('Mande no máximo 10 arquivos por vez.');
  if (files.some(x => !exFileOk(x))) throw new Error('Só dá para enviar PDF ou fotos (JPG, PNG).');
  const name = (d.exam_name || '').trim(); if (name.length < 2) throw new Error('Diga qual é o exame.');
  const p = S.patient, btn = f.querySelector('[type=submit]'); let done = 0;
  for (const file of files) {
    let blob = file, type = file.type;
    if (/^image\//.test(type)) { blob = await shrinkPhoto(file); type = 'image/jpeg'; }
    if (blob.size > 15 * 1024 * 1024) throw new Error(`O arquivo ${file.name} passa de 15 MB.`);
    const id = uid(), ext = type === 'application/pdf' ? 'pdf' : 'jpg';
    const row = { id, status: 'novo', patient_id: p.id, exam_name: files.length > 1 ? `${name} (${done + 1}/${files.length})` : name, exam_date: nz(d.exam_date), description: nz((d.description || '').trim()), file_type: type, file_name: (file.name || '').slice(0, 200), file_path: `${S.clinic.id}/${p.id}/${id}.${ext}` };
    if (isDemo()) row.file_data = await blobToData(blob);
    else await Remote.upload('patient-exams', row.file_path, blob, false);
    await db.insert('patient_exams', row);
    done++; if (btn) btn.textContent = `Enviando… ${done}/${files.length}`;
  }
  closeModal(); toast(files.length > 1 ? `${files.length} arquivos enviados! A clínica já pode ver.` : 'Exame enviado! A clínica já pode ver.', 'ok'); go('#/exames');
});

act('pExamDel', async el => {
  if (!await confirmBox('Apagar este envio? Use só se mandou o arquivo errado.', 'Apagar')) return;
  const r = await db.get('patient_exams', el.dataset.id);
  if (r && !isDemo()) await Remote.storageFetch(`object/patient-exams/${r.file_path}`, { method: 'DELETE' }).catch(() => null);
  await db.remove('patient_exams', el.dataset.id); toast('Envio apagado.', 'ok'); router();
});

act('exView', async el => {
  const r = await db.get('patient_exams', el.dataset.id); if (!r) return toast('Exame não encontrado.', 'bad');
  await exOpen(r);
  if (S.mode !== 'patient' && isClinical() && r.status === 'novo') { await db.update('patient_exams', r.id, { status: 'visto', seen_at: new Date().toISOString(), seen_by: isDemo() ? null : Auth.userId() }); const row = el.closest('.li'); row?.querySelector('.pill')?.replaceWith(Object.assign(document.createElement('span'), { className: 'pill ok', textContent: 'visto' })); }
});

/* ---------- equipe clínica (aba do prontuário) ---------- */
async function staffExamsTab(p) {
  const list = await db.list('patient_exams', { eq: { patient_id: p.id }, order: 'created_at.desc' }).catch(() => []);
  return html`<div class="card"><div class="row between"><h2>${icon('clip')} Exames enviados pelo paciente</h2></div>
    <p class="tiny muted" style="margin:4px 0 10px">O paciente anexa pelo portal, em "Meus exames". Ao abrir, o exame fica marcado como visto para ele.</p>
    ${list.length ? html`<div class="list">${list.map(r => html`<div class="li"><span>${icon(r.file_type === 'application/pdf' ? 'file' : 'clip')}</span><span class="grow"><b class="small">${r.exam_name}</b><div class="tiny muted">${r.exam_date ? 'Feito em ' + fDate(r.exam_date) + ' · ' : ''}enviado em ${fDT(r.created_at)}</div>${r.description ? html`<div class="tiny">${r.description}</div>` : ''}</span>
      <span class="pill ${r.status === 'novo' ? 'warn' : 'ok'}">${r.status === 'novo' ? 'novo' : 'visto'}</span><button class="btn sm" data-act="exView" data-id="${r.id}">${icon('file')} Abrir</button></div>`)}</div>`
      : html`<p class="muted small">Nenhum exame enviado ainda.${p.user_id ? '' : ' O paciente precisa ter acesso online para anexar.'}</p>`}</div>`;
}
