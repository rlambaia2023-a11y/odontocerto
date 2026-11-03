/* ===== Exames, assinatura ICP-Brasil, verificação, teleconsulta completa ===== */

/* ---------- catálogo de exames ---------- */
const EXAMS = {
  'Hematologia e bioquímica': ['Hemograma completo', 'Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Ureia', 'Creatinina', 'Ácido úrico', 'Sódio', 'Potássio', 'Cálcio', 'Magnésio', 'TGO (AST)', 'TGP (ALT)', 'Gama-GT', 'Fosfatase alcalina', 'Bilirrubinas total e frações', 'Proteínas totais e frações', 'Amilase', 'Lipase', 'CPK', 'Ferro sérico', 'Ferritina', 'Transferrina / saturação de transferrina', 'Vitamina B12', 'Ácido fólico', '25-OH vitamina D', 'Proteína C reativa (PCR)', 'VHS'],
  'Hormônios': ['TSH', 'T4 livre', 'T3', 'Insulina de jejum', 'Beta-hCG quantitativo', 'PSA total e livre', 'Cortisol', 'Prolactina', 'FSH', 'LH', 'Estradiol', 'Testosterona total'],
  'Coagulação': ['Coagulograma completo', 'Tempo de protrombina (TP/INR)', 'TTPa', 'Contagem de plaquetas', 'Tempo de sangramento', 'Fibrinogênio'],
  'Urina e fezes': ['Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Microalbuminúria', 'Parasitológico de fezes (3 amostras)', 'Pesquisa de sangue oculto nas fezes'],
  'Sorologias e infecções': ['Anti-HIV 1 e 2', 'HBsAg', 'Anti-HBs', 'Anti-HCV', 'VDRL', 'Toxoplasmose IgG e IgM', 'Rubéola IgG e IgM', 'Citomegalovírus IgG e IgM', 'Dengue (NS1, IgG e IgM)', 'Teste para COVID-19 (RT-PCR ou antígeno)', 'Cultura de secreção com antibiograma'],
  'Imagem e cardiologia': ['Radiografia de tórax PA e perfil', 'Eletrocardiograma (ECG)', 'Ecocardiograma transtorácico', 'Teste ergométrico', 'Holter 24 horas', 'MAPA 24 horas', 'Ultrassonografia de abdome total', 'Ultrassonografia de tireoide', 'Ultrassonografia de vias urinárias', 'Ultrassonografia pélvica', 'Mamografia bilateral', 'Densitometria óssea', 'Tomografia computadorizada (especificar região)', 'Ressonância magnética (especificar região)'],
  'Odontológicos – imagem': ['Radiografia panorâmica', 'Radiografia periapical (especificar dentes)', 'Radiografia interproximal (bite-wing)', 'Radiografia oclusal', 'Telerradiografia lateral com traçado cefalométrico', 'Telerradiografia frontal (PA)', 'Tomografia computadorizada de feixe cônico (especificar região)', 'Radiografia de ATM (boca aberta e fechada)', 'Ressonância magnética de ATM'],
  'Odontológicos – diagnóstico': ['Documentação ortodôntica completa', 'Fotografias intra e extraorais', 'Modelos de estudo / escaneamento intraoral', 'Biópsia com exame anatomopatológico', 'Citologia esfoliativa', 'Teste de vitalidade pulpar', 'Teste de fluxo salivar', 'Exame microbiológico / cultura de canal'],
};
const EXAM_PACKS = {
  'Check-up adulto': ['Hemograma completo', 'Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Creatinina', 'TGO (AST)', 'TGP (ALT)', 'TSH', 'Urina tipo 1 (EAS)', '25-OH vitamina D'],
  'Pré-operatório': ['Hemograma completo', 'Coagulograma completo', 'Glicemia de jejum', 'Ureia', 'Creatinina', 'Sódio', 'Potássio', 'Eletrocardiograma (ECG)', 'Radiografia de tórax PA e perfil'],
  'Pré-cirurgia oral': ['Hemograma completo', 'Coagulograma completo', 'Glicemia de jejum', 'Radiografia panorâmica', 'Tomografia computadorizada de feixe cônico (especificar região)'],
  'Ortodontia': ['Documentação ortodôntica completa', 'Radiografia panorâmica', 'Telerradiografia lateral com traçado cefalométrico', 'Fotografias intra e extraorais', 'Modelos de estudo / escaneamento intraoral'],
  'Diabetes – acompanhamento': ['Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Creatinina', 'Microalbuminúria', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Urina tipo 1 (EAS)'],
  'Pré-natal (1º trimestre)': ['Hemograma completo', 'Glicemia de jejum', 'Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Anti-HIV 1 e 2', 'HBsAg', 'Anti-HCV', 'VDRL', 'Toxoplasmose IgG e IgM', 'Rubéola IgG e IgM', 'Ultrassonografia pélvica'],
};
function examBox(type) {
  const odonto = S.me?.profession !== 'medicina';
  const groups = Object.entries(EXAMS).sort(([a], [b]) => (a.startsWith('Odonto') === odonto ? -1 : 0) - (b.startsWith('Odonto') === odonto ? -1 : 0));
  return html`<div id="exambox" class="${type === 'exames' ? '' : 'hidden'}"><div class="card" style="background:#fafbfc;padding:12px">
    <div class="row between"><b class="small">Monte a solicitação</b><div class="search" style="min-width:200px">${icon('search')}<input class="in" style="height:34px" placeholder="Filtrar exames" data-input="exFilter"></div></div>
    <div class="row" style="gap:6px;margin:10px 0">${Object.keys(EXAM_PACKS).map(k => html`<button type="button" class="btn sm" data-act="exPack" data-k="${k}">+ ${k}</button>`)}</div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff">${groups.map(([g, list]) => html`<div class="exgroup"><div class="tiny" style="font-weight:700;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 4px">${g}</div>
      <div class="grid g2 collapse" style="gap:2px 12px">${list.map(e => html`<label class="check small exitem"><input type="checkbox" value="${e}" data-group="${g}" data-ex="1"> ${e}</label>`)}</div></div>`)}</div>
    <div class="grid g2 collapse" style="margin-top:10px"><label class="f"><span>Indicação clínica / hipótese diagnóstica</span><input class="in" id="exind" placeholder="Ex.: avaliação pré-operatória"></label><label class="f"><span>CID-10 (opcional)</span><input class="in" id="excid" maxlength="12" style="text-transform:uppercase"></label></div>
    <label class="f" style="margin-top:8px"><span>Outros exames ou observações</span><input class="in" id="exobs" placeholder="Ex.: jejum de 8 horas; dentes 36 e 46"></label>
    <div class="row between" style="margin-top:10px"><span class="small muted" id="excount">Nenhum exame marcado</span><button type="button" class="btn primary" data-act="exBuild">${icon('check')} Montar solicitação no documento</button></div></div></div>`;
}
onInput('exFilter', el => { const q = norm(el.value); document.querySelectorAll('#exambox .exitem').forEach(l => l.classList.toggle('hidden', q && !norm(l.textContent).includes(q))); document.querySelectorAll('#exambox .exgroup').forEach(g => g.classList.toggle('hidden', ![...g.querySelectorAll('.exitem')].some(l => !l.classList.contains('hidden')))); });
const exCount = () => { const n = document.querySelectorAll('#exambox [data-ex]:checked').length; const el = document.getElementById('excount'); if (el) el.textContent = n ? `${n} exame(s) marcado(s)` : 'Nenhum exame marcado'; };
document.addEventListener('change', e => { if (e.target.matches?.('#exambox [data-ex]')) exCount(); });
act('exPack', el => { EXAM_PACKS[el.dataset.k].forEach(n => { const cb = [...document.querySelectorAll('#exambox [data-ex]')].find(c => c.value === n); if (cb) cb.checked = true; }); exCount(); toast(`Pacote "${el.dataset.k}" marcado.`); });
act('exBuild', () => {
  const sel = [...document.querySelectorAll('#exambox [data-ex]:checked')]; const obs = document.getElementById('exobs').value.trim();
  if (!sel.length && !obs) return toast('Marque pelo menos um exame.', 'bad');
  const by = groupBy(sel, c => c.dataset.group); let n = 0;
  let h = '<p>Solicito os seguintes exames:</p>';
  for (const [g, items] of Object.entries(by)) h += `<p><b>${esc(g)}</b><br>${items.map(c => `${++n}. ${esc(c.value)}`).join('<br>')}</p>`;
  if (obs) h += `<p><b>Outros / observações:</b> ${esc(obs)}</p>`;
  const ind = document.getElementById('exind').value.trim(), cid = document.getElementById('excid').value.trim().toUpperCase();
  h += `<p><b>Indicação clínica:</b> ${esc(ind || '____________________________')}${cid ? `<br><b>CID-10:</b> ${esc(cid)}` : ''}</p>`;
  document.getElementById('rxed').innerHTML = h; toast('Solicitação montada. Revise e salve.', 'ok');
  document.getElementById('rxed').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* ---------- hash e verificação ---------- */
async function sha256(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const verifyUrl = code => `${location.origin}/#/verificar/${code}`;
pubRoute('/verificar/:code', async ({ code }) => {
  let v = null; try { v = await db.rpc('verify_document', { p_code: code }); } catch { }
  return html`<div class="auth"><div class="card stack"><div class="brand"><span class="mark">PE</span><div><h1>Verificação de documento</h1><div class="small muted">Código ${code.toUpperCase()}</div></div></div>
    ${v ? html`<div class="pill ok" style="font-size:.9rem">✓ Documento emitido pelo PEPMH</div>
      <table class="tbl"><tr><td class="muted">Tipo</td><td><b>${DOCT[v.tipo]?.[0] || v.tipo}</b></td></tr><tr><td class="muted">Emitido em</td><td>${fDT(v.emitido_em)}</td></tr><tr><td class="muted">Profissional</td><td>${v.profissional || ''} ${v.conselho && !/^-\s*$/.test(v.conselho.trim()) ? '· ' + v.conselho : ''}</td></tr><tr><td class="muted">Clínica</td><td>${v.clinica}</td></tr><tr><td class="muted">Paciente</td><td>${v.paciente_iniciais} (iniciais)</td></tr>
      <tr><td class="muted">Assinatura ICP-Brasil</td><td>${v.assinado_icp ? html`<span class="pill ok">PDF assinado enviado em ${fDT(v.assinado_em)}</span>` : html`<span class="pill gray">não enviada — vale a via assinada à mão</span>`}</td></tr></table>
      ${v.hash ? html`<p class="tiny muted" style="word-break:break-all">Impressão digital (SHA-256): ${v.hash}</p>` : ''}
      <p class="small muted">${v.assinado_icp ? html`Para conferir a assinatura do arquivo PDF, use o validador oficial do ITI: <a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a>.` : 'O conteúdo não é exibido aqui para proteger os dados do paciente.'}</p>`
      : html`<div class="pill bad" style="font-size:.9rem">Documento não encontrado</div><p class="small">Confira se o código foi digitado corretamente. Se o problema continuar, fale com a clínica que emitiu.</p>`}
  </div></div>`;
});

/* ---------- PDF assinado com certificado ICP-Brasil ---------- */
const ICP_HELP = html`<ol class="small" style="padding-left:18px;margin:6px 0">
  <li>Baixe o <b>PDF</b> do documento (botão abaixo).</li>
  <li>Assine o PDF com o seu certificado digital ICP-Brasil (A1, token A3 ou certificado em nuvem como BirdID, VIDaaS, SafeID ou NeoID), no assinador da sua certificadora ou no Assinador ITI/SERPRO, no padrão <b>PAdES</b>.</li>
  <li>Volte aqui e envie o PDF assinado. O paciente passa a baixar essa versão na área dele, e a farmácia confere em <a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a>.</li></ol>
  <p class="tiny muted" style="margin:0">Receitas de controle especial e de antimicrobianos em formato digital exigem assinatura ICP-Brasil. Medicamentos das listas que exigem notificação de receita (A, B2 e similares) seguem em papel até a integração com o SNCR.</p>`;
act('signDoc', async el => {
  const d = await db.get('documents', el.dataset.id);
  modal('Assinatura digital ICP-Brasil', html`${ICP_HELP}<div class="docprev" style="margin:12px 0">Código de verificação: <b>${d.verify_code || '—'}</b></div>
    <div class="row"><button class="btn" data-act="pdfDoc" data-id="${d.id}">${icon('down')} 1. Baixar PDF</button></div>
    <label class="f" style="margin-top:12px"><span>3. PDF assinado</span><input type="file" class="in" accept="application/pdf" id="signedpdf" style="padding-top:8px"></label>
    <button class="btn primary" style="margin-top:12px" data-act="uploadSigned" data-id="${d.id}">${icon('up')} Enviar PDF assinado</button>`, { wide: true });
});
act('uploadSigned', async el => {
  const f = document.getElementById('signedpdf').files[0]; if (!f) throw new Error('Escolha o arquivo PDF assinado.');
  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) throw new Error('O arquivo precisa ser PDF.');
  if (f.size > 10 * 1024 * 1024) throw new Error('O PDF passa de 10 MB.');
  const head = new TextDecoder('latin1').decode(await f.arrayBuffer());
  if (!head.startsWith('%PDF')) throw new Error('Esse arquivo não parece ser um PDF válido.');
  const hasSig = /\/ByteRange\s*\[/.test(head) && /\/(Sig|DocTimeStamp)\b/.test(head);
  if (!hasSig && !(await confirmBox('Não encontramos uma assinatura digital dentro deste PDF. Ele foi mesmo assinado com o certificado? Enviar assim mesmo?', 'Enviar assim mesmo'))) return;
  const d = await db.get('documents', el.dataset.id); const path = `${d.clinic_id}/${d.id}.pdf`;
  el.disabled = true;
  try {
    if (isDemo()) { await db.update('documents', d.id, { signed_file_path: 'demo/' + d.id + '.pdf', signed_at: new Date().toISOString() }); }
    else { await Remote.upload('signed-docs', path, f); await db.update('documents', d.id, { signed_file_path: path, signed_at: new Date().toISOString(), signed_by: Auth.userId() }); }
    closeModal(); toast('PDF assinado salvo. O paciente já pode baixar.', 'ok'); router();
  } finally { el.disabled = false; }
});
act('downloadSigned', async el => {
  const d = await db.get('documents', el.dataset.id);
  if (isDemo()) return toast('Na demonstração não há arquivo real para baixar.', 'bad');
  const blob = await Remote.download('signed-docs', d.signed_file_path);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(DOCT[d.doc_type]?.[0] || 'documento').replace(/\W+/g, '-').toLowerCase()}-${d.verify_code || d.id.slice(0, 8)}-assinado.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

/* ---------- teleconsulta: iniciar com registro no prontuário ---------- */
act('startTele', async el => {
  const a = await db.get('appointments', el.dataset.id);
  if (a.meeting_url) window.open(a.meeting_url, '_blank', 'noopener');
  if (!['atendido', 'em_atendimento'].includes(a.status)) await db.update('appointments', a.id, { status: 'em_atendimento' });
  closeModal(); location.hash = `#/paciente/${a.patient_id}?tab=evolucao`;
  setTimeout(() => ACT.newEvolution({ dataset: { id: a.patient_id, prefill: `Teleconsulta por vídeo (Google Meet) em ${fDT(a.starts_at)}. Termo de consentimento ${a.tele_consent_at ? 'aceito pelo paciente em ' + fDT(a.tele_consent_at) : 'NÃO registrado no sistema – confirmar verbalmente e anotar'}. Paciente identificado(a) por vídeo.\n${a.reason ? 'Motivo informado: ' + a.reason + '\n' : ''}` } }), 900);
});

/* ---------- lembretes de amanhã (WhatsApp) ---------- */
async function remindersBlock() {
  const t1 = addDays(startOfDay(new Date()), 1), t2 = addDays(t1, 1);
  const ap = (await db.list('appointments', { gte: { starts_at: t1.toISOString() }, lt: { starts_at: t2.toISOString() }, order: 'starts_at' })).filter(a => !['cancelado', 'faltou'].includes(a.status));
  const pm = await patientMap(ap.map(a => a.patient_id));
  const msg = (p, a) => `Olá, ${p.name.split(' ')[0]}! Lembrete da sua consulta amanhã (${fDate(a.starts_at)}) às ${fTime(a.starts_at)} no ${S.clinic.name}.${a.modality === 'online' && a.meeting_url ? ` É online: entre por este link no horário ${a.meeting_url} (teste câmera e microfone antes).` : ` Endereço: ${[S.clinic.address, S.clinic.city].filter(Boolean).join(', ')}.`} Pode confirmar sua presença?`;
  return html`<div class="card"><h2>Lembretes de amanhã (${ap.length})</h2><p class="small muted" style="margin:4px 0 8px">Um toque abre o WhatsApp com a mensagem pronta${ap.some(a => a.modality === 'online') ? ', já com o link do Meet nas teleconsultas' : ''}.</p>
    ${ap.length ? html`<div class="list">${ap.map(a => { const p = pm[a.patient_id]; return html`<div class="li"><b class="small" style="width:46px">${fTime(a.starts_at)}</b><span class="grow"><span class="t">${p?.name || ''}</span><span class="tiny muted">${MOD[a.modality || 'presencial']} · ${proName(a.professional_id)}</span></span>${apPill(a)}${p?.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, msg(p, a))}">${icon('wa')} Lembrar</a>` : html`<span class="tiny muted">sem celular</span>`}</div>`; })}</div>` : html`<p class="muted small">Nenhuma consulta amanhã.</p>`}</div>`;
}

/* ---------- importação de pacientes (CSV / Excel) ---------- */
const IMP_FIELDS = [
  ['name', 'Nome *', /^(nome|paciente|nome completo|nome do paciente|cliente)$|nome/],
  ['cpf', 'CPF', /cpf/], ['birth_date', 'Nascimento', /nasc|data de nasc|dt nasc|aniver/], ['sex', 'Sexo', /^sexo$|genero|gênero/],
  ['phone', 'Celular / WhatsApp', /celular|whats|telefone|fone|contato/], ['email', 'E-mail', /e-?mail/],
  ['zip', 'CEP', /cep/], ['address', 'Endereço (pode juntar colunas)', /endere|logradouro|^rua|numero|número|bairro|complemento/],
  ['city', 'Cidade', /cidade|municipio|município/], ['state', 'UF', /^uf$|estado/],
  ['insurance', 'Convênio', /conv[eê]nio|plano/], ['insurance_card', 'Carteirinha', /carteir|matr[ií]cula/],
  ['rg', 'RG', /^rg$|identidade/], ['occupation', 'Profissão', /profiss|ocupa/], ['guardian_name', 'Responsável', /respons/],
  ['alerts', 'Alergias / alertas clínicos', /alerg|alerta/],
  ['notes', 'Observações (pode juntar colunas)', /obs|anota|nota|etiqueta|tag/],
];
const MULTI = new Set(['address', 'notes']);
function parseCSV(text) {
  text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '';
  const delim = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Não consegui carregar o leitor de Excel. Salve a planilha como CSV e tente de novo.')); document.head.appendChild(s); }); }
async function readSheet(file) {
  if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
  }
  const buf = await file.arrayBuffer(); let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
  return parseCSV(text);
}
function impDate(v) {
  if (v instanceof Date && !isNaN(v)) return ymd(new Date(v.getTime() + v.getTimezoneOffset() * 60000 + 12 * 3600000));
  if (typeof v === 'number' && v > 1000 && v < 80000) return ymd(new Date(Date.UTC(1899, 11, 30) + v * 864e5 + 12 * 3600000));
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) { let y = +m[3]; if (y < 100) y += y > (new Date().getFullYear() % 100) ? 1900 : 2000; const d = new Date(y, +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? ymd(d) : null; }
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
const impSex = v => { const s = norm(v); return /^f|fem/.test(s) ? 'F' : /^m|masc/.test(s) ? 'M' : s ? 'O' : null; };
const titleCase = s => String(s || '').toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (a, b, c) => b + c.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, w => w.toLowerCase());
act('importPatients', () => {
  window.__imp = null;
  modal('Importar pacientes', html`<p class="small" style="margin-top:0">Envie a planilha exportada do sistema anterior (CSV ou Excel). Nada é gravado antes de você conferir a prévia.</p>
    <input type="file" class="in" style="padding-top:8px" accept=".csv,.txt,.xlsx,.xls,.ods" data-change="impFile"><div id="impbody" style="margin-top:12px"></div>`, { wide: true });
});
onInput('impFile', async el => {
  const f = el.files[0]; if (!f) return; const box = document.getElementById('impbody'); box.innerHTML = '<div class="loading">Lendo a planilha…</div>';
  try {
    const rows = (await readSheet(f)).filter(r => r.some(c => String(c ?? '').trim()));
    const hi = rows.findIndex(r => r.filter(c => String(c ?? '').trim()).length >= 2); if (hi < 0) throw new Error('Não encontrei cabeçalho com colunas.');
    const header = rows[hi].map(h => String(h ?? '').trim()), data = rows.slice(hi + 1);
    const map = {}; const used = new Set();
    IMP_FIELDS.forEach(([k, , re]) => { const cols = header.map((h, i) => [norm(h), i]).filter(([h, i]) => h && re.test(h) && (MULTI.has(k) || !used.has(i))); if (!cols.length) return; if (MULTI.has(k)) map[k] = cols.map(c => c[1]); else { map[k] = [cols[0][1]]; used.add(cols[0][1]); } });
    if (map.name) map.name = [header.findIndex((h, i) => /^(nome|paciente|nome completo|nome do paciente)$/.test(norm(h))) >= 0 ? header.findIndex(h => /^(nome|paciente|nome completo|nome do paciente)$/.test(norm(h))) : map.name[0]];
    ['address', 'notes'].forEach(k => map[k] && (map[k] = map[k].filter(i => !Object.entries(map).some(([kk, v]) => kk !== k && !MULTI.has(kk) && v.includes(i)))));
    const existing = await db.list('patients', { select: 'id,name,cpf,birth_date', limit: 10000 });
    window.__imp = { file: f.name, header, data, map, existing };
    impRender();
  } catch (e) { box.innerHTML = fv(html`<p style="color:var(--bad)">${e.message}</p>`); }
});
function impRows() {
  const { data, map, existing } = window.__imp; const get = (r, k) => (map[k] || []).map(i => r[i]).filter(v => String(v ?? '').trim() !== '');
  const byCpf = new Set(existing.map(p => p.cpf).filter(Boolean)), byNameBirth = new Set(existing.map(p => norm(p.name) + '|' + (p.birth_date || '')));
  const seen = new Set();
  return data.map(r => {
    const one = k => get(r, k)[0];
    const name = titleCase(String(one('name') || '').replace(/\s+/g, ' ').trim());
    let cpf = onlyDigits(one('cpf')); if (cpf && cpf.length < 11 && cpf.length >= 9) cpf = cpf.padStart(11, '0'); if (cpf.length !== 11) cpf = null;
    const birth = impDate(one('birth_date')); let phone = onlyDigits(one('phone')); if (phone.startsWith('55') && phone.length > 11) phone = phone.slice(2); if (phone.length < 10) phone = phone || null;
    const insName = String(one('insurance') || '').trim();
    const notes = [...get(r, 'notes').map(String), insName && !/particular/i.test(insName) && !S.insurances.some(i => norm(i.name) === norm(insName)) ? 'Convênio no sistema anterior: ' + insName : ''].filter(Boolean).join(' · ');
    const row = { name, cpf, birth_date: birth, sex: impSex(one('sex')), phone: phone || null, email: (String(one('email') || '').trim().toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || [null])[0],
      zip: onlyDigits(one('zip')) || null, address: get(r, 'address').map(v => String(v).trim()).join(', ') || null, city: titleCase(one('city')) || null, state: (String(one('state') || '').trim().toUpperCase().slice(0, 2)) || null,
      insurance_id: S.insurances.find(i => norm(i.name) === norm(insName) && !/particular/i.test(i.name))?.id || null, insurance_card: String(one('insurance_card') || '').trim() || null,
      rg: String(one('rg') || '').trim() || null, occupation: String(one('occupation') || '').trim() || null, guardian_name: titleCase(one('guardian_name')) || null, alerts: get(r, 'alerts').map(String).join(' · ') || null, notes: notes || null };
    let status = 'novo';
    if (!name || name.length < 2) status = 'sem nome';
    else if ((cpf && byCpf.has(cpf)) || byNameBirth.has(norm(name) + '|' + (birth || ''))) status = 'já cadastrado';
    else { const k = cpf || norm(name) + '|' + (birth || ''); if (seen.has(k)) status = 'repetido na planilha'; seen.add(k); }
    return { row, status };
  });
}
function impRender() {
  const imp = window.__imp, rows = impRows(), cnt = groupBy(rows, r => r.status);
  const opt = (k, i) => html`<option value="${i}" ${(imp.map[k] || []).includes(i) ? 'selected' : ''}>${imp.header[i] || 'Coluna ' + (i + 1)}</option>`;
  document.getElementById('impbody').innerHTML = fv(html`
    <div class="row" style="gap:6px;margin-bottom:10px"><span class="pill">${imp.file}</span><span class="pill ok">${(cnt['novo'] || []).length} novos</span>${cnt['já cadastrado'] ? html`<span class="pill gray">${cnt['já cadastrado'].length} já cadastrados (serão pulados)</span>` : ''}${cnt['repetido na planilha'] ? html`<span class="pill warn">${cnt['repetido na planilha'].length} repetidos na planilha</span>` : ''}${cnt['sem nome'] ? html`<span class="pill bad">${cnt['sem nome'].length} sem nome</span>` : ''}</div>
    <details ${Object.keys(imp.map).length < 3 ? 'open' : ''}><summary class="small" style="cursor:pointer;font-weight:600">Conferir quais colunas vão para cada campo</summary>
      <div class="grid g3 collapse" style="margin-top:8px">${IMP_FIELDS.map(([k, l]) => html`<label class="f"><span>${l}</span><select class="in" ${MULTI.has(k) ? 'multiple size="3" style="height:auto"' : ''} data-change="impMap" data-k="${k}">${!MULTI.has(k) ? html`<option value="">— não importar —</option>` : ''}${imp.header.map((_, i) => opt(k, i))}</select></label>`)}</div></details>
    <div class="tblwrap" style="margin-top:12px;max-height:300px;overflow:auto"><table class="tbl"><tr><th></th><th>Nome</th><th>CPF</th><th>Nascimento</th><th>Celular</th><th>E-mail</th><th>Cidade</th></tr>
      ${rows.slice(0, 50).map(({ row: r, status }) => html`<tr style="${status !== 'novo' ? 'opacity:.55' : ''}"><td><span class="pill ${status === 'novo' ? 'ok' : status === 'sem nome' ? 'bad' : 'gray'}">${status}</span></td><td>${r.name}</td><td class="small">${fCPF(r.cpf)}</td><td class="small">${fDate(r.birth_date)}</td><td class="small">${fPhone(r.phone)}</td><td class="small">${r.email || ''}</td><td class="small">${r.city || ''}</td></tr>`)}</table></div>
    ${rows.length > 50 ? html`<p class="tiny muted">Mostrando 50 de ${rows.length} linhas.</p>` : ''}
    <label class="check small" style="margin-top:10px"><input type="checkbox" id="impok"> Confirmo que estes pacientes pertencem a esta clínica/profissional (ou há autorização do responsável pelos dados) e que posso tratá-los conforme a LGPD.</label>
    <div class="row between" style="margin-top:10px"><span class="small muted">Os importados recebem a etiqueta <b>importado</b>.</span><button class="btn primary" data-act="impRun" ${(cnt['novo'] || []).length ? '' : 'disabled'}>${icon('up')} Importar ${(cnt['novo'] || []).length} paciente(s)</button></div>`);
}
onInput('impMap', el => { const k = el.dataset.k; const vals = [...el.selectedOptions].map(o => o.value).filter(v => v !== '').map(Number); if (vals.length) window.__imp.map[k] = vals; else delete window.__imp.map[k]; impRender(); });
act('impRun', async el => {
  if (!document.getElementById('impok').checked) throw new Error('Marque a confirmação antes de importar.');
  const novos = impRows().filter(r => r.status === 'novo').map(r => ({ ...r.row, tags: ['importado'], origin: 'Sistema anterior', active: true }));
  el.disabled = true; let done = 0;
  try {
    for (let i = 0; i < novos.length; i += 200) { await db.insert('patients', novos.slice(i, i + 200)); done += Math.min(200, novos.length - i); el.textContent = `Importando… ${done}/${novos.length}`; }
    closeModal(); toast(`${done} paciente(s) importado(s).`, 'ok'); go('#/pacientes');
  } catch (e) { el.disabled = false; el.textContent = 'Tentar de novo'; throw new Error(`Parou depois de ${done} pacientes: ${e.message}`); }
});

/* ---------- aprovação das consultas marcadas pelos pacientes ---------- */
async function approvalsBlock() {
  const ap = (await db.list('appointments', { eq: { approval: 'pendente' }, gte: { ends_at: new Date().toISOString() }, order: 'starts_at' })).filter(a => a.status !== 'cancelado' && (isOwner() || a.professional_id === Auth.userId() || S.me.role === 'secretaria'));
  if (!ap.length && !S.clinic.booking_requires_approval) return '';
  const pm = await patientMap(ap.map(a => a.patient_id));
  return html`<div class="card" style="${ap.length ? 'border-color:var(--warn)' : ''}"><h2>Aguardando aprovação (${ap.length})</h2>
    ${ap.length ? html`<div class="list" style="margin-top:10px">${ap.map(a => html`<div class="li"><b class="small" style="width:110px">${fDT(a.starts_at)}</b><span class="grow"><span class="t">${pm[a.patient_id]?.name || ''}</span><span class="tiny muted">${MOD[a.modality]} · ${proName(a.professional_id)}${a.reason ? ' · ' + a.reason : ''}${a.tele_consent_at ? ' · termo aceito' : ''}</span></span>
      ${isClinical() ? html`<button class="btn sm ok" data-act="approveAppt" data-id="${a.id}">${icon('check')} Aprovar</button>` : ''}<button class="btn sm" data-act="declineAppt" data-id="${a.id}">Recusar</button></div>`)}</div>` : html`<p class="muted small">Nenhuma consulta esperando aprovação.</p>`}</div>`;
}
act('approveAppt', async el => {
  const a = await db.get('appointments', el.dataset.id);
  if (!(await conflictGate(await findConflicts({ pro: a.professional_id, start: a.starts_at, end: a.ends_at, online: a.modality === 'online', ignoreAppt: a.id })))) return; const p = await db.get('patients', a.patient_id); const pro = pros().find(m => m.user_id === a.professional_id) || S.me;
  modal('Aprovar consulta', html`<p style="margin-top:0"><b>${p.name}</b> · ${fLong(new Date(a.starts_at))} às ${fTime(a.starts_at)} · ${MOD[a.modality]}</p>${a.reason ? html`<p class="small"><b>Motivo:</b> ${a.reason}</p>` : ''}
    <form data-form="approveAppt" class="stack"><input type="hidden" name="id" value="${a.id}">
    ${a.modality === 'online' ? html`<label class="f"><span>Link da chamada (Google Meet) <i>*</i></span><input class="in" name="meeting_url" type="url" required placeholder="https://meet.google.com/abc-defg-hij" value="${a.meeting_url || pro.meet_url || ''}"></label>
      <p class="small muted" style="margin:0">Não tem sala fixa? <a href="https://meet.google.com/new" target="_blank" rel="noopener">Abra o Meet</a> logado(a) na conta da clínica, copie o link da reunião e cole aqui. Para não repetir isso, cadastre uma sala fixa em Configurações → Meu atendimento online.</p>` : ''}
    <button class="btn ok" type="submit">${icon('check')} Aprovar e avisar o paciente</button></form>`);
});
onForm('approveAppt', async d => {
  if (d.meeting_url && !/^https:\/\//.test(d.meeting_url)) throw new Error('O link precisa começar com https://');
  const a = await db.update('appointments', d.id, { approval: 'aprovado', status: 'confirmado', ...(d.meeting_url ? { meeting_url: d.meeting_url } : {}) });
  const full = a || await db.get('appointments', d.id); const p = await db.get('patients', full.patient_id); gpush('pushAppt', { id: d.id });
  const txt = `Olá, ${p.name.split(' ')[0]}! Sua consulta ${full.modality === 'online' ? 'online ' : ''}com ${proName(full.professional_id)} está CONFIRMADA para ${fDate(full.starts_at)} às ${fTime(full.starts_at)}.${full.modality === 'online' ? ` Entre por este link no horário: ${d.meeting_url} (teste câmera e microfone antes). O link também está na sua área do paciente.` : ''}`;
  updateNotif(); await router();
  modal('Consulta aprovada', html`<p style="margin-top:0">${icon('check')} Aprovada. O paciente já vê ${full.modality === 'online' ? 'o link ' : 'a confirmação '}na área dele.</p>${p.phone ? html`<a class="btn primary" target="_blank" rel="noopener" href="${waLink(p.phone, txt)}" data-act="closeAfterOpen">${icon('wa')} Avisar no WhatsApp</a>` : html`<p class="small muted">Paciente sem celular cadastrado.</p>`}`);
});
act('closeAfterOpen', el => { window.open(el.href, '_blank', 'noopener'); closeModal(); });
act('declineAppt', async el => {
  const why = prompt('Motivo (vai na mensagem ao paciente):', 'Infelizmente não conseguiremos atender neste horário. Por favor, escolha outro na página de agendamento.'); if (why === null) return;
  const a = await db.update('appointments', el.dataset.id, { approval: 'recusado', status: 'cancelado', notes: 'Recusada: ' + why }); const full = a || await db.get('appointments', el.dataset.id); const p = await db.get('patients', full.patient_id); gpush('pushAppt', { id: el.dataset.id });
  updateNotif(); await router();
  if (p.phone) modal('Consulta recusada', html`<p style="margin-top:0">O horário foi liberado.</p><a class="btn" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Sobre sua consulta de ${fDate(full.starts_at)} às ${fTime(full.starts_at)}: ${why}`)}" data-act="closeAfterOpen">${icon('wa')} Avisar no WhatsApp</a>`);
});
