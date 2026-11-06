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
  return html`<h3 style="margin-top:16px">Comprovantes enviados</h3><div class="list">${list.map(r => html`<div class="li small"><span class="grow">${r.amount ? BRL(r.amount) + ' · ' : ''}pago em ${fDate(r.paid_on)}${r.note ? html`<div class="tiny muted">${r.note}</div>` : ''}${r.response ? html`<div class="tiny" style="color:var(--brand)">Clínica: ${r.response}</div>` : ''}</span><span class="pill ${(RC_ST[r.status] || RC_ST.enviado)[0]}">${(RC_ST[r.status] || RC_ST.enviado)[1]}</span></div>`)}</div>`;
}

act('pReceipt', async () => {
  const open = (await db.list('finance_entries', { eq: { patient_id: S.patient.id }, order: 'due_date' })).filter(f => !f.paid_at && f.kind !== 'despesa');
  modal('Anexar pagamento', html`<form data-form="pReceipt" class="stack">
    <div class="tip">${icon('bulb')}<span>PIX: <b>${PIX.key}</b> em nome de <b>${PIX.name}</b></span></div>
    <label class="f"><span>Comprovante (foto ou PDF) <i>*</i></span><input class="in" type="file" name="file" accept="image/*,application/pdf" required></label>
    ${open.length ? html`<label class="f"><span>Referente a</span><select class="in" name="finance_entry_id"><option value="">Outro pagamento</option>${open.map(f => html`<option value="${f.id}" data-v="${f.amount}">${f.description} · ${BRL(f.amount)} · vence ${fDate(f.due_date)}</option>`)}</select></label>` : ''}
    <div class="grid g2"><label class="f"><span>Valor pago (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required placeholder="150,00"></label><label class="f"><span>Data do pagamento</span><input class="in" type="date" name="paid_on" value="${ymd(new Date())}" max="${ymd(new Date())}" required></label></div>
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
  const row = { id, status: 'enviado', patient_id: p.id, finance_entry_id: nz(d.finance_entry_id), amount, paid_on: d.paid_on || ymd(new Date()), note: nz(d.note), file_type: type, file_path: `${S.clinic.id}/${p.id}/${id}.${ext}` };
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
  return html`<div class="card" style="margin-bottom:14px"><h2>Comprovantes enviados pelos pacientes (${list.length})</h2><div class="list" style="margin-top:10px">${list.map(r => html`<div class="li"><span class="grow"><span class="t">${pm[r.patient_id]?.name || ''}</span><span class="tiny muted">${r.amount ? BRL(r.amount) + ' · ' : ''}pago em ${fDate(r.paid_on)}${r.note ? ' · ' + r.note : ''}${r.finance_entry_id ? ' · ligado a um lançamento' : ''}</span></span>
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
act('rcOk', async el => {
  const r = await db.get('payment_receipts', el.dataset.id); const by = isDemo() ? null : Auth.userId(), now = new Date().toISOString();
  if (r.finance_entry_id) await db.update('finance_entries', r.finance_entry_id, { paid_at: r.paid_on, method: 'pix' });
  else await db.insert('finance_entries', { kind: 'receita', description: 'Pagamento PIX (comprovante do paciente)' + (r.note ? ' – ' + r.note : ''), amount: r.amount, due_date: r.paid_on, paid_at: r.paid_on, method: 'pix', category: 'Procedimentos', patient_id: r.patient_id });
  await db.update('payment_receipts', r.id, { status: 'confirmado', reviewed_at: now, reviewed_by: by });
  toast('Pagamento confirmado e lançado no financeiro.', 'ok'); router();
});
act('rcNo', async el => {
  const why = prompt('Motivo (o paciente vai ver):', 'Não localizamos esse PIX. Confira o comprovante ou fale com a clínica.'); if (why === null) return;
  await db.update('payment_receipts', el.dataset.id, { status: 'recusado', response: why, reviewed_at: new Date().toISOString(), reviewed_by: isDemo() ? null : Auth.userId() }); router();
});
