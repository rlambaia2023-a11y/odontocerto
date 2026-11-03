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
  <li>Clique em <b>Imprimir</b> no documento e escolha <b>Salvar como PDF</b>.</li>
  <li>Assine o PDF com o seu certificado digital ICP-Brasil (A1, token A3 ou certificado em nuvem como BirdID, VIDaaS, SafeID ou NeoID), no assinador da sua certificadora ou no Assinador ITI/SERPRO, no padrão <b>PAdES</b>.</li>
  <li>Volte aqui e envie o PDF assinado. O paciente passa a baixar essa versão na área dele, e a farmácia confere em <a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a>.</li></ol>
  <p class="tiny muted" style="margin:0">Receitas de controle especial e de antimicrobianos em formato digital exigem assinatura ICP-Brasil. Medicamentos das listas que exigem notificação de receita (A, B2 e similares) seguem em papel até a integração com o SNCR.</p>`;
act('signDoc', async el => {
  const d = await db.get('documents', el.dataset.id);
  modal('Assinatura digital ICP-Brasil', html`${ICP_HELP}<div class="docprev" style="margin:12px 0">Código de verificação: <b>${d.verify_code || '—'}</b></div>
    <div class="row"><button class="btn" data-act="printDocId" data-id="${d.id}">${icon('print')} 1. Imprimir / salvar PDF</button></div>
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
    ${ap.length ? html`<div class="list">${ap.map(a => { const p = pm[a.patient_id]; return html`<div class="li"><b class="small" style="width:46px">${fTime(a.starts_at)}</b><span class="grow"><span class="t">${p?.name || ''}</span><span class="tiny muted">${MOD[a.modality || 'presencial']} · ${proName(a.professional_id)}</span></span>${statusPill(a.status)}${p?.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(p.phone, msg(p, a))}">${icon('wa')} Lembrar</a>` : html`<span class="tiny muted">sem celular</span>`}</div>`; })}</div>` : html`<p class="muted small">Nenhuma consulta amanhã.</p>`}</div>`;
}
