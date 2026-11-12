/* ===== Comprovantes de pagamento: paciente anexa no portal, equipe confere no financeiro ===== */
const PIX = { key: '75991815612', name: 'Dra Mayara Miranda da Silva' };
const RC_ST = { enviado: ['warn', 'aguardando conferência'], confirmado: ['ok', 'pagamento confirmado'], recusado: ['bad', 'não confirmado'] };
const RC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const pixCard = () => html`<div class="card" style="border-left:4px solid var(--brand)">
  <div class="row between"><h3 style="margin:0">${icon('money')} Pagamento por PIX</h3><button class="btn primary" data-act="pReceipt">${icon('clip')} Anexar pagamento</button></div>
  <div class="tip" style="margin-top:12px">${icon('bulb')}<span><b>Observação:</b> PIX: <b>${PIX.key}</b> em nome de <b>${PIX.name}</b>.</span></div>
  <div class="row" style="margin-top:10px"><button class="btn sm" data-act="copyText" data-t="${PIX.key}">${icon('clip')} Copiar chave PIX</button></div>
  <p class="small muted" style="margin:10px 0 0">Depois de pagar, toque em <b>Anexar pagamento</b> e mande a foto ou o PDF do comprovante. A clínica confere e dá baixa por aqui.</p></div>`;

async function myReceiptsBlock() {
  const list = await db.list('payment_receipts', { eq: { patient_id: S.patient.id }, order: 'created_at.desc', limit: 20 }).catch(() => []);
  if (!list.length) return '';
  return html`<h3 style="margin-top:16px">Comprovantes enviados</h3><div class="list">${list.map(r => html`<div class="li small"><span class="grow">${r.appointment_id ? html`<b>Consulta online · ${r.installment || 1}ª parte</b> · ` : ''}${r.amount ? BRL(r.amount) + ' · ' : ''}pago em ${fDate(r.paid_on)}${r.sent_by === 'clinica' ? ' · anexado pela clínica' : ''}${r.note ? html`<div class="tiny muted">${r.note}</div>` : ''}${r.response ? html`<div class="tiny" style="color:var(--brand)">Clínica: ${r.response}</div>` : ''}</span><span class="pill ${(RC_ST[r.status] || RC_ST.enviado)[0]}">${(RC_ST[r.status] || RC_ST.enviado)[1]}</span><button class="btn sm" data-act="rcView" data-id="${r.id}">${icon('file')} Ver</button></div>`)}</div>`;
}

act('pReceipt', async el => {
  const appt = el?.dataset?.appt ? await db.get('appointments', el.dataset.appt).catch(() => null) : null, inst = appt ? (+el.dataset.inst === 2 ? 2 : 1) : null;
  const open = appt ? [] : (await db.list('finance_entries', { eq: { patient_id: S.patient.id }, order: 'due_date' })).filter(f => !f.paid_at && f.kind !== 'despesa');
  const half = appt ? (+appt.fee || ONLINE_FEE) / 2 : null;
  modal(appt ? `Comprovante da ${inst}ª parte da consulta` : 'Anexar pagamento', html`<form data-form="pReceipt" class="stack">
    ${appt ? html`<input type="hidden" name="appointment_id" value="${appt.id}"><input type="hidden" name="installment" value="${inst}">
    <div class="tip">${icon('cal')}<span>Consulta online de <b>${fDate(appt.starts_at)} às ${fTime(appt.starts_at)}</b> · ${inst}ª parte (50%) · <b>${BRL(half)}</b></span></div>` : ''}
    <div class="tip">${icon('bulb')}<span>PIX: <b>${PIX.key}</b> em nome de <b>${PIX.name}</b></span></div>
    <label class="f"><span>Comprovante (foto ou PDF) <i>*</i></span><input class="in" type="file" name="file" accept="image/*,application/pdf" required></label>
    ${open.length ? html`<label class="f"><span>Referente a</span><select class="in" name="finance_entry_id"><option value="">Outro pagamento</option>${open.map(f => html`<option value="${f.id}" data-v="${f.amount}">${f.description} · ${BRL(f.amount)} · vence ${fDate(f.due_date)}</option>`)}</select></label>` : ''}
    <div class="grid g2"><label class="f"><span>Valor pago (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required placeholder="150,00" value="${half ? String(half.toFixed(2)).replace('.', ',') : ''}"></label><label class="f"><span>Data do pagamento</span><input class="in" type="date" name="paid_on" value="${ymd(new Date())}" max="${ymd(new Date())}" required></label></div>
    <label class="f"><span>Observação (opcional)</span><input class="in" name="note" maxlength="500" placeholder="Ex.: consulta de retorno, 1ª parcela"></label>
    <button class="btn primary" type="submit">${icon('send')} Enviar comprovante</button></form>`);
  const sel = document.querySelector('[data-form=pReceipt] [name=finance_entry_id]');
  if (sel) sel.addEventListener('change', () => { const v = sel.selectedOptions[0]?.dataset.v; const a = document.querySelector('[data-form=pReceipt] [name=amount]'); if (v && a) a.value = String(v).replace('.', ','); });
});
onForm('pReceipt', async (d, f) => {
  const file = f.querySelector('[name=file]').files[0]; if (!file) throw new Error('Escolha a foto ou o PDF do comprovante.');
  const amount = parseMoney(d.amount); if (!(amount > 0)) throw new Error('Informe o valor pago.');
  let blob = file, type = file.type;
  if (/^image\//.test(type)) { blob = await shrinkPhoto(file); type = 'image/jpeg'; }
  else if (type !== 'application/pdf') throw new Error('Mande uma foto ou um arquivo PDF.');
  if (blob.size > 10 * 1024 * 1024) throw new Error('Arquivo muito grande (máximo 10 MB).');
  const p = S.patient, id = uid(), ext = type === 'application/pdf' ? 'pdf' : 'jpg';
  const row = { id, status: 'enviado', sent_by: 'paciente', patient_id: p.id, finance_entry_id: nz(d.finance_entry_id), amount, ...(d.appointment_id ? { appointment_id: d.appointment_id, installment: +d.installment || 1 } : {}), paid_on: d.paid_on || ymd(new Date()), note: nz(d.note), file_type: type, file_path: `${S.clinic.id}/${p.id}/${id}.${ext}` };
  if (isDemo()) row.file_data = await blobToData(blob);
  else await Remote.upload('payment-receipts', row.file_path, blob, false);
  await db.insert('payment_receipts', row);
  closeModal(); toast('Comprovante enviado! A clínica vai conferir.', 'ok'); router();
});

/* ---------- equipe ---------- */
async function staffReceiptsBlock() {
  const list = await db.list('payment_receipts', { eq: { status: 'enviado' }, order: 'created_at' }).catch(() => []);
  if (!list.length) return '';
  const pm = await patientMap(list.map(r => r.patient_id));
  const aids = [...new Set(list.map(r => r.appointment_id).filter(Boolean))];
  const am = Object.fromEntries((aids.length ? await db.list('appointments', { in: { id: aids } }).catch(() => []) : []).map(a => [a.id, a]));
  return html`<div class="card" style="margin-bottom:14px"><h2>Comprovantes aguardando conferência (${list.length})</h2><div class="list" style="margin-top:10px">${list.map(r => html`<div class="li"><span class="grow"><span class="t">${pm[r.patient_id]?.name || ''}</span><span class="tiny muted">${r.sent_by === 'clinica' ? 'anexado pela clínica · ' : ''}${r.appointment_id ? `Consulta online ${am[r.appointment_id] ? 'de ' + fDT(am[r.appointment_id].starts_at) + ' ' : ''}· ${r.installment || 1}ª parte · ` : ''}${r.amount ? BRL(r.amount) + ' · ' : ''}pago em ${fDate(r.paid_on)}${r.note ? ' · ' + r.note : ''}${r.finance_entry_id ? ' · ligado a um lançamento' : ''}</span></span>
    <button class="btn sm" data-act="rcView" data-id="${r.id}">${icon('file')} Ver</button><button class="btn sm ok" data-act="rcOk" data-id="${r.id}">${icon('check')} Confirmar</button><button class="btn sm" data-act="rcNo" data-id="${r.id}">Recusar</button></div>`)}</div></div>`;
}
act('rcView', async el => {
  const r = await db.get('payment_receipts', el.dataset.id);
  if (r.file_data && /^data:image\//.test(r.file_data)) return modal('Comprovante', html`<img alt="Comprovante" src="${r.file_data}" style="max-width:100%;border-radius:8px">`, { wide: true });
  if (r.file_data) return toast('Na demonstração o PDF não abre. Na versão real ele é baixado.', 'bad');
  const blob = await Remote.download('payment-receipts', r.file_path);
  if (/^image\//.test(r.file_type)) { const src = await blobToData(blob); modal('Comprovante', html`<img alt="Comprovante" src="${src}" style="max-width:100%;border-radius:8px">`, { wide: true }); }
  else { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `comprovante-${fDate(r.paid_on).replace(/\//g, '-')}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); }
});
async function confirmReceipt(r) {
  const by = isDemo() ? null : Auth.userId(), now = new Date().toISOString();
  if (r.finance_entry_id) await db.update('finance_entries', r.finance_entry_id, { paid_at: r.paid_on, method: 'pix' });
  else await db.insert('finance_entries', { kind: 'receita', description: (r.appointment_id ? `Consulta online – ${r.installment || 1}ª parte (50%)` : r.sent_by === 'clinica' ? 'Pagamento PIX (comprovante anexado pela clínica)' : 'Pagamento PIX (comprovante do paciente)') + (r.note ? ' – ' + r.note : ''), amount: r.amount, due_date: r.paid_on, paid_at: r.paid_on, method: 'pix', category: 'Procedimentos', patient_id: r.patient_id });
  await db.update('payment_receipts', r.id, { status: 'confirmado', reviewed_at: now, reviewed_by: by });
}
act('rcOk', async el => {
  const r = await db.get('payment_receipts', el.dataset.id); if (!r) return;
  await confirmReceipt(r); toast('Pagamento confirmado e lançado no financeiro.', 'ok'); router();
});
act('rcNo', async el => {
  const why = prompt('Motivo (o paciente vai ver):', 'Não localizamos esse PIX. Confira o comprovante ou fale com a clínica.'); if (why === null) return;
  await db.update('payment_receipts', el.dataset.id, { status: 'recusado', response: why, reviewed_at: new Date().toISOString(), reviewed_by: isDemo() ? null : Auth.userId() }); router();
});

/* ---------- equipe anexa o comprovante pelo paciente (master, profissional ou recepção) ---------- */
act('sReceipt', async el => {
  const pid = el?.dataset?.p || '';
  if (!pid) return modal('Anexar comprovante', html`<form data-form="sReceiptPick" class="stack">
    <label class="f"><span>De qual paciente é o pagamento? <i>*</i></span>${patientPicker(null, { allowNew: false, required: true })}</label>
    <button class="btn primary" type="submit">Continuar</button></form>`);
  const p = await db.get('patients', pid); if (!p) return toast('Paciente não encontrado.', 'bad');
  const [open, appts] = await Promise.all([
    db.list('finance_entries', { eq: { patient_id: p.id }, order: 'due_date' }).then(r => r.filter(f => !f.paid_at && f.kind !== 'despesa')).catch(() => []),
    db.list('appointments', { eq: { patient_id: p.id, modality: 'online' }, gte: { starts_at: new Date(Date.now() - 7 * 86400000).toISOString() }, order: 'starts_at' }).then(r => r.filter(a => a.fee && !['cancelado', 'faltou'].includes(a.status))).catch(() => []),
  ]);
  modal('Anexar comprovante de pagamento', html`<form data-form="sReceipt" class="stack"><input type="hidden" name="patient_id" value="${p.id}">
    <div class="tip">${icon('user')}<span>Paciente: <b>${p.name}</b></span></div>
    <label class="f"><span>Comprovante (foto ou PDF) <i>*</i></span><input class="in" type="file" name="file" accept="image/*,application/pdf" required></label>
    <label class="f"><span>Referente a</span><select class="in" name="ref"><option value="">Outro pagamento</option>
      ${appts.flatMap(a => [1, 2].map(i => html`<option value="a:${a.id}:${i}" data-v="${(+a.fee || ONLINE_FEE) / 2}">Consulta online de ${fDate(a.starts_at)} às ${fTime(a.starts_at)} · ${i}ª parte (50%) · ${BRL((+a.fee || ONLINE_FEE) / 2)}</option>`))}
      ${open.map(f => html`<option value="f:${f.id}" data-v="${f.amount}">${f.description} · ${BRL(f.amount)} · vence ${fDate(f.due_date)}</option>`)}</select></label>
    <div class="grid g2"><label class="f"><span>Valor pago (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required placeholder="150,00"></label><label class="f"><span>Data do pagamento</span><input class="in" type="date" name="paid_on" value="${ymd(new Date())}" max="${ymd(new Date())}" required></label></div>
    <label class="f"><span>Observação (o paciente também vê)</span><input class="in" name="note" maxlength="500" placeholder="Ex.: comprovante recebido pelo WhatsApp"></label>
    <label class="check"><input type="checkbox" name="confirm" checked> Já conferi o pagamento: dar baixa no financeiro agora</label>
    <button class="btn primary" type="submit">${icon('send')} Anexar comprovante</button></form>`);
  const f = document.querySelector('[data-form=sReceipt]'), sel = f.querySelector('[name=ref]');
  sel.addEventListener('change', () => { const v = sel.selectedOptions[0]?.dataset.v; if (v) f.querySelector('[name=amount]').value = (+v).toFixed(2).replace('.', ','); });
});
onForm('sReceiptPick', async d => {
  if (!d.patient_id) throw new Error('Escolha o paciente na lista que aparece ao digitar o nome.');
  closeModal(); await ACT.sReceipt({ dataset: { p: d.patient_id } });
});
onForm('sReceipt', async (d, f) => {
  const file = f.querySelector('[name=file]').files[0]; if (!file) throw new Error('Escolha a foto ou o PDF do comprovante.');
  const amount = parseMoney(d.amount); if (!(amount > 0)) throw new Error('Informe o valor pago.');
  let blob = file, type = file.type;
  if (/^image\//.test(type)) { blob = await shrinkPhoto(file); type = 'image/jpeg'; }
  else if (type !== 'application/pdf') throw new Error('Anexe uma foto ou um arquivo PDF.');
  if (blob.size > 10 * 1024 * 1024) throw new Error('Arquivo muito grande (máximo 10 MB).');
  const [k, refId, inst] = (d.ref || '').split(':');
  const id = uid(), ext = type === 'application/pdf' ? 'pdf' : 'jpg', pid = d.patient_id;
  const row = { id, status: 'enviado', sent_by: 'clinica', patient_id: pid, amount, paid_on: d.paid_on || ymd(new Date()), note: nz((d.note || '').trim()), file_type: type, file_path: `${S.clinic.id}/${pid}/${id}.${ext}`,
    finance_entry_id: k === 'f' ? refId : null, ...(k === 'a' ? { appointment_id: refId, installment: +inst === 2 ? 2 : 1 } : {}) };
  if (isDemo()) row.file_data = await blobToData(blob);
  else await Remote.upload('payment-receipts', row.file_path, blob, false);
  await db.insert('payment_receipts', row);
  if (d.confirm) await confirmReceipt(row);
  closeModal(); toast(d.confirm ? 'Comprovante anexado e pagamento lançado no financeiro.' : 'Comprovante anexado. Fica aguardando conferência.', 'ok'); router();
});
act('rcDel', async el => {
  if (!await confirmBox('Excluir este comprovante? Se ele já deu baixa no financeiro, o lançamento continua lá.', 'Excluir')) return;
  const r = await db.get('payment_receipts', el.dataset.id);
  if (r && !isDemo()) await Remote.storageFetch(`object/payment-receipts/${r.file_path}`, { method: 'DELETE' }).catch(() => null);
  await db.remove('payment_receipts', el.dataset.id); toast('Comprovante excluído.', 'ok'); router();
});

/* lista de comprovantes de um paciente (aba Financeiro do prontuário) */
async function patientReceiptsCard(p) {
  const list = await db.list('payment_receipts', { eq: { patient_id: p.id }, order: 'created_at.desc' }).catch(() => []);
  return html`<div class="card" style="margin-bottom:14px"><div class="row between"><h2>${icon('receipt')} Comprovantes de pagamento</h2><button class="btn primary sm" data-act="sReceipt" data-p="${p.id}">${icon('clip')} Anexar comprovante</button></div>
    <p class="tiny muted" style="margin:4px 0 10px">O paciente anexa pela área dele, e a equipe também pode anexar por aqui (por exemplo, quando ele manda o PIX pelo WhatsApp). Ele vê todos os comprovantes no portal.</p>
    ${list.length ? html`<div class="list">${list.map(r => html`<div class="li small"><span class="grow">${r.appointment_id ? html`<b>Consulta online · ${r.installment || 1}ª parte</b> · ` : ''}${r.amount ? BRL(r.amount) + ' · ' : ''}pago em ${fDate(r.paid_on)}<div class="tiny muted">${r.sent_by === 'clinica' ? 'anexado pela clínica' : 'enviado pelo paciente'} em ${fDT(r.created_at)}${r.note ? ' · ' + r.note : ''}</div></span>
      <span class="pill ${(RC_ST[r.status] || RC_ST.enviado)[0]}">${(RC_ST[r.status] || RC_ST.enviado)[1]}</span><button class="btn sm" data-act="rcView" data-id="${r.id}">${icon('file')} Ver</button>
      ${r.status === 'enviado' ? html`<button class="btn sm ok" data-act="rcOk" data-id="${r.id}">${icon('check')} Confirmar</button><button class="btn sm" data-act="rcNo" data-id="${r.id}">Recusar</button>` : ''}<button class="btn sm ghost danger" data-act="rcDel" data-id="${r.id}" title="Excluir">${icon('trash')}</button></div>`)}</div>`
      : html`<p class="muted small">Nenhum comprovante ainda.</p>`}</div>`;
}
