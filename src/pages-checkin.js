/* ===== Acompanhamento semanal enviado pelo paciente (foto, dose, peso, queixas) ===== */
const SINTOMAS = ['Náusea', 'Vômito', 'Diarreia', 'Intestino preso', 'Azia / refluxo', 'Dor na barriga', 'Cansaço', 'Tontura', 'Falta de apetite', 'Queda de cabelo', 'Reação no local da aplicação'];
const weekStart = d => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

/* reduz a foto para no máximo 1600 px e JPEG, para subir rápido mesmo no 4G */
async function shrinkPhoto(file) {
  if (!/^image\//.test(file.type)) throw new Error('Escolha uma imagem (foto).');
  const url = await blobToData(file); // a política de segurança da página só aceita imagens data:
  {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não consegui abrir essa foto. Tente outra.')); i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.82));
  }
}
const blobToData = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const PHOTO_CACHE = {};
async function photoData(c) {
  if (c.photo_data) return c.photo_data; if (!c.photo_path) return '';
  if (PHOTO_CACHE[c.photo_path]) return PHOTO_CACHE[c.photo_path];
  try { return (PHOTO_CACHE[c.photo_path] = await blobToData(await Remote.download('progress-photos', c.photo_path))); } catch { return ''; }
}
/* carrega as fotos depois que a tela aparece */
function hydratePhotos(list) {
  after(async () => { for (const c of list) { const el = document.querySelector(`[data-ph="${c.id}"]`); if (!el) continue; const src = await photoData(c); if (src && /^data:image\//.test(src)) { const img = document.createElement('img'); img.className = 'ckph'; img.alt = 'Foto de ' + fDate(c.data); img.src = src; el.replaceWith(img); } else el.textContent = 'sem foto'; } });
}
const ckPhotoBox = c => c.photo_path || c.photo_data ? html`<div class="ckph empty" data-ph="${c.id}">carregando foto…</div>` : html`<div class="ckph empty">sem foto</div>`;

/* ---------- área do paciente ---------- */
async function myCheckinSection(tr) {
  const p = S.patient; const now = new Date(); const ws = ymd(weekStart(now)); const m0 = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const list = await db.list('weight_checkins', { eq: { patient_id: p.id }, order: 'data.desc', limit: 12 });
  const month = list.filter(c => c.data >= m0); const thisWeek = list.find(c => ymd(weekStart(parseYmd(c.data))) === ws);
  const can = !thisWeek && month.length < 4;
  hydratePhotos(list.slice(0, 8));
  return html`<div class="card" style="margin-top:14px" id="checkin"><div class="row between"><h2 style="margin:0">Acompanhamento da semana</h2><span class="pill ${month.length >= 4 ? 'ok' : 'gray'}">${month.length} de 4 neste mês</span></div>
    <p class="small muted">Uma vez por semana, mande uma foto, a dose que aplicou e como está se sentindo. A clínica recebe na hora.</p>
    <div class="weeks">${[0, 1, 2, 3].map(i => html`<div class="w ${month.length > i ? 'done' : month.length === i && can ? 'now' : ''}">${month.length > i ? icon('check') : ''} Semana ${i + 1}${month[month.length - 1 - i] ? html`<div class="tiny">${fDate(month[month.length - 1 - i].data).slice(0, 5)}</div>` : ''}</div>`)}</div>
    ${can ? html`<form data-form="sendCheckin" class="stack" style="margin-top:14px">
      <label class="f"><span>Foto da semana <i>*</i></span><input class="in" type="file" name="photo" accept="image/*" capture="environment" required></label>
      <p class="tiny muted" style="margin:0">Dica: mesma roupa, mesmo lugar e mesma luz toda semana, de frente e corpo inteiro. A foto fica guardada só para você e a equipe da clínica.</p>
      <div class="grid g3"><label class="f"><span>Data</span><input class="in" type="date" name="data" value="${ymd(now)}" min="${ws}" max="${ymd(now)}" required></label>
        <label class="f"><span>Dose aplicada</span><input class="in" name="dose" list="ckdoses" value="${tr?.dose_atual || ''}" placeholder="2,5 mg"></label>
        <label class="f"><span>Peso (kg)</span><input class="in" name="peso" inputmode="decimal" placeholder="82,5"></label></div>
      <datalist id="ckdoses">${WDOSES.map(x => html`<option>${x}</option>`)}</datalist>
      <div class="f"><span>Sentiu algo esta semana?</span><div class="row" style="gap:6px 14px;margin-top:4px">${SINTOMAS.map(s => html`<label class="check small"><input type="checkbox" name="sintomas" data-multi="1" value="${s}"> ${s}</label>`)}</div></div>
      <label class="f"><span>Queixas ou dúvidas</span><textarea class="in" name="queixas" rows="3" placeholder="Conte como foi a semana: apetite, enjoo, intestino, sono…"></textarea></label>
      <button class="btn primary" type="submit">${icon('send')} Enviar para a clínica</button></form>`
    : html`<div class="tip" style="margin-top:12px">${icon('check')}<span>${thisWeek ? 'Você já enviou o acompanhamento desta semana. O próximo libera na segunda-feira.' : 'Você já mandou os 4 acompanhamentos deste mês. Até o mês que vem!'}</span></div>`}
    ${list.length ? html`<h3 style="margin:18px 0 8px">Meus envios</h3><div class="ckgrid">${list.slice(0, 8).map(c => html`<div>${ckPhotoBox(c)}<div class="tiny" style="margin-top:4px"><b>${fDate(c.data)}</b>${c.dose ? ' · ' + c.dose : ''}${c.peso ? ' · ' + kg(c.peso) : ''}</div>${c.resposta ? html`<div class="tiny" style="color:var(--brand)">Clínica: ${c.resposta}</div>` : c.reviewed_at ? html`<div class="tiny" style="color:var(--ok)">visto pela clínica</div>` : ''}</div>`)}</div>` : ''}
    <p class="tiny muted" style="margin-bottom:0">Sintoma forte (vômitos que não param, dor abdominal intensa, falta de ar, desmaio)? Não espere o acompanhamento: procure atendimento ou fale com a clínica agora.</p></div>`;
}
onForm('sendCheckin', async (d, f) => {
  const file = f.querySelector('[name=photo]').files[0]; if (!file) throw new Error('Escolha a foto da semana.');
  const peso = d.peso ? parseMoney(d.peso) : null; if (peso != null && !(peso >= 20 && peso <= 400)) throw new Error('Confira o peso (entre 20 e 400 kg).');
  if (file.size > 25 * 1024 * 1024) throw new Error('Foto muito grande.');
  const blob = await shrinkPhoto(file); const p = S.patient; const id = uid();
  const row = { id, patient_id: p.id, data: d.data || ymd(new Date()), dose: nz(normDose(d.dose)), peso, queixas: nz(d.queixas), sintomas: d.sintomas || [] };
  if (isDemo()) row.photo_data = await blobToData(blob);
  else { row.photo_path = `${S.clinic.id}/${p.id}/${id}.jpg`; await Remote.upload('progress-photos', row.photo_path, blob); }
  try { await db.insert('weight_checkins', row); }
  catch (e) { if (/duplicate|unique/i.test(e.message)) throw new Error('Você já enviou o acompanhamento desta semana.'); throw e; }
  if (peso != null) await db.insert('weight_logs', { patient_id: p.id, data: row.data, peso, observacao: 'Acompanhamento semanal', registrado_pelo_paciente: true }).catch(() => { });
  const r = await gcall('checkin', { id });
  toast(r.ok || r.demo ? 'Enviado! A clínica já foi avisada.' : 'Enviado! A clínica vai ver no sistema.', 'ok');
  router();
});

/* ---------- prontuário: o que o paciente mandou ---------- */
async function staffCheckins(p) {
  const list = await db.list('weight_checkins', { eq: { patient_id: p.id }, order: 'data.desc', limit: 16 });
  if (!list.length) return html`<div class="card" style="margin-top:14px"><h3 style="margin-top:0">Acompanhamento semanal do paciente</h3><p class="small muted">${p.user_id ? 'O paciente ainda não enviou nenhum acompanhamento.' : 'O paciente envia fotos, dose e queixas pela área do paciente. Use “Acesso online” no topo do prontuário para mandar o convite.'}</p></div>`;
  hydratePhotos(list);
  return html`<div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">Acompanhamento semanal do paciente</h3><span class="tiny muted">${list.filter(c => !c.reviewed_at).length} novo(s)</span></div>
    <div class="ckgrid" style="margin-top:12px">${list.map(c => html`<div class="${c.reviewed_at ? '' : 'cknew'}">${ckPhotoBox(c)}
      <div class="small" style="margin-top:6px"><b>${fDate(c.data)}</b>${c.reviewed_at ? '' : html` <span class="pill accent">novo</span>`}</div>
      <div class="tiny">${[c.dose, c.peso ? kg(c.peso) : ''].filter(Boolean).join(' · ') || '—'}</div>
      ${c.sintomas?.length ? html`<div class="tiny" style="color:var(--warn)">${c.sintomas.join(', ')}</div>` : ''}
      ${c.queixas ? html`<div class="tiny muted" style="white-space:pre-wrap">“${c.queixas}”</div>` : ''}
      ${c.resposta ? html`<div class="tiny" style="color:var(--brand)">Resposta: ${c.resposta}</div>` : ''}
      <div class="row" style="margin-top:6px;gap:4px">${!c.reviewed_at ? html`<button class="btn sm ok" data-act="ckSeen" data-id="${c.id}">${icon('check')} Visto</button>` : ''}<button class="btn sm" data-act="ckReply" data-id="${c.id}" data-p="${p.id}">Responder</button>${c.drive_url ? html`<a class="btn sm ghost" target="_blank" rel="noopener" href="${c.drive_url}">Drive</a>` : ''}</div></div>`)}</div></div>`;
}
act('ckSeen', async el => { await db.update('weight_checkins', el.dataset.id, { reviewed_at: new Date().toISOString(), reviewed_by: isDemo() ? null : Auth.userId() }); updateNotif(); router(); });
act('ckReply', async el => {
  const c = await db.get('weight_checkins', el.dataset.id);
  modal('Responder ao paciente', html`<form data-form="ckReply" class="stack"><input type="hidden" name="id" value="${c.id}"><input type="hidden" name="p" value="${el.dataset.p}"><label class="f"><span>Resposta (aparece na área do paciente)</span><textarea class="in" name="resposta" rows="3" required>${c.resposta || ''}</textarea></label><label class="check"><input type="checkbox" name="wa" checked> Abrir também no WhatsApp</label><button class="btn primary" type="submit">Salvar resposta</button></form>`);
});
onForm('ckReply', async d => {
  await db.update('weight_checkins', d.id, { resposta: d.resposta, reviewed_at: new Date().toISOString(), reviewed_by: isDemo() ? null : Auth.userId() });
  const p = await db.get('patients', d.p); closeModal(); toast('Resposta salva.', 'ok'); updateNotif();
  if (d.wa && p?.phone) window.open(waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Vimos seu acompanhamento da semana. ${d.resposta}`), '_blank', 'noopener');
  router();
});
