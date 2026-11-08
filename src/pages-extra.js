/* ===== Exames, assinatura ICP-Brasil, verificação, teleconsulta completa ===== */

/* ---------- catálogo de exames ---------- */
const EXAMS = {
  'Hematologia e bioquímica': ['Hemograma completo', 'Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Ureia', 'Creatinina', 'Ácido úrico', 'Sódio', 'Potássio', 'Cálcio', 'Magnésio', 'TGO (AST)', 'TGP (ALT)', 'Gama-GT', 'Fosfatase alcalina', 'Bilirrubinas total e frações', 'Proteínas totais e frações', 'Albumina', 'Amilase', 'Lipase', 'CPK', 'Desidrogenase láctica (DHL)', 'Ferro sérico', 'Ferritina', 'Transferrina / saturação de transferrina', 'Vitamina B12', 'Ácido fólico', '25-OH vitamina D', 'Zinco', 'PTH (paratormônio)', 'Proteína C reativa (PCR)', 'VHS'],
  'Hormônios': ['TSH', 'T4 livre', 'T3', 'Anti-TPO', 'Insulina de jejum', 'Beta-hCG quantitativo', 'PSA total e livre', 'Cortisol', 'Prolactina', 'FSH', 'LH', 'Estradiol', 'Testosterona total'],
  'Ginecologia – rastreamento e infecções': ['Colpocitologia oncótica (Papanicolaou)', 'Teste de DNA-HPV oncogênico', 'Colposcopia', 'Biópsia de colo uterino guiada por colposcopia', 'Bacterioscopia de secreção vaginal (Gram)', 'Cultura de secreção vaginal para fungos', 'PCR para Chlamydia trachomatis e Neisseria gonorrhoeae', 'PCR para Mycoplasma genitalium', 'Pesquisa de Trichomonas vaginalis', 'Biópsia de endométrio', 'CA-125'],
  'Ginecologia – hormônios e fertilidade': ['Progesterona (21º dia do ciclo)', 'Macroprolactina', 'Testosterona livre calculada', 'SHBG', 'DHEA-S', 'Androstenediona', '17-OH progesterona', 'Hormônio antimülleriano (AMH)', 'Espermograma (parceiro)'],
  'Obstetrícia – pré-natal': ['Tipagem sanguínea ABO e fator Rh', 'Coombs indireto', 'TOTG 75 g (jejum, 1 h e 2 h) – 24 a 28 semanas', 'Teste treponêmico para sífilis', 'VDRL', 'Anti-HIV 1 e 2', 'HBsAg', 'Anti-HCV', 'Toxoplasmose IgG e IgM', 'Avidez de IgG para toxoplasmose', 'Rubéola IgG e IgM', 'Citomegalovírus IgG e IgM', 'HTLV I e II', 'Eletroforese de hemoglobina', 'Cultura para estreptococo do grupo B (swab vaginal e retal) – 35 a 37 semanas', 'Relação proteína/creatinina em amostra de urina', 'Proteinúria de 24 horas', 'Contagem de plaquetas'],
  'Emagrecimento e metabolismo': ['HOMA-IR (glicemia e insulina de jejum)', 'Peptídeo C', 'TOTG 75 g com dosagem de insulina (curva glicêmica e insulinêmica)', 'Apolipoproteína B', 'Lipoproteína(a)', 'Creatinina com taxa de filtração glomerular estimada', 'Cortisol sérico às 8 h', 'Calcitonina', 'Bioimpedância (composição corporal)', 'Calorimetria indireta (gasto energético de repouso)'],
  'Coagulação': ['Coagulograma completo', 'Tempo de protrombina (TP/INR)', 'TTPa', 'Tempo de sangramento', 'Fibrinogênio'],
  'Urina e fezes': ['Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Microalbuminúria', 'Parasitológico de fezes (3 amostras)', 'Pesquisa de sangue oculto nas fezes'],
  'Sorologias e infecções': ['Anti-HBs', 'Dengue (NS1, IgG e IgM)', 'Teste para COVID-19 (RT-PCR ou antígeno)', 'Cultura de secreção com antibiograma'],
  'Imagem – ginecologia e mamas': ['Ultrassonografia transvaginal', 'Ultrassonografia pélvica (via abdominal)', 'Ultrassonografia transvaginal com Doppler', 'Ultrassonografia transvaginal com preparo intestinal (pesquisa de endometriose)', 'Ultrassonografia de mamas bilateral', 'Mamografia bilateral', 'Ressonância magnética de mamas', 'Ressonância magnética de pelve (protocolo para endometriose)', 'Histerossalpingografia', 'Histeroscopia diagnóstica', 'Densitometria óssea (coluna lombar e fêmur)'],
  'Imagem – obstetrícia': ['Ultrassonografia obstétrica inicial (transvaginal)', 'Ultrassonografia morfológica de 1º trimestre (11 a 14 semanas) com translucência nucal', 'Ultrassonografia morfológica de 2º trimestre (20 a 24 semanas)', 'Ultrassonografia obstétrica', 'Ultrassonografia obstétrica com Doppler', 'Perfil biofísico fetal', 'Cervicometria por via transvaginal', 'Ecocardiograma fetal', 'Cardiotocografia'],
  'Imagem – emagrecimento, geral e cardiologia': ['Ultrassonografia de abdome total', 'Ultrassonografia de abdome superior', 'Elastografia hepática', 'Densitometria de corpo inteiro (composição corporal – DEXA)', 'Ultrassonografia de tireoide', 'Ultrassonografia de vias urinárias', 'Radiografia de tórax PA e perfil', 'Eletrocardiograma (ECG)', 'Ecocardiograma transtorácico', 'Teste ergométrico', 'Holter 24 horas', 'MAPA 24 horas', 'Endoscopia digestiva alta', 'Tomografia computadorizada (especificar região)', 'Ressonância magnética (especificar região)'],
  'Odontológicos – imagem': ['Radiografia panorâmica', 'Radiografia periapical (especificar dentes)', 'Radiografia interproximal (bite-wing)', 'Radiografia oclusal', 'Telerradiografia lateral com traçado cefalométrico', 'Telerradiografia frontal (PA)', 'Tomografia computadorizada de feixe cônico (especificar região)', 'Radiografia de ATM (boca aberta e fechada)', 'Ressonância magnética de ATM'],
  'Odontológicos – diagnóstico': ['Documentação ortodôntica completa', 'Fotografias intra e extraorais', 'Modelos de estudo / escaneamento intraoral', 'Biópsia com exame anatomopatológico', 'Citologia esfoliativa', 'Teste de vitalidade pulpar', 'Teste de fluxo salivar', 'Exame microbiológico / cultura de canal'],
};
const isImgGroup = g => /imagem/i.test(g);
const EXAM_PACKS = {
  'Pré-natal 1º trimestre': ['Hemograma completo', 'Tipagem sanguínea ABO e fator Rh', 'Coombs indireto', 'Glicemia de jejum', 'Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Teste treponêmico para sífilis', 'VDRL', 'Anti-HIV 1 e 2', 'HBsAg', 'Anti-HCV', 'Toxoplasmose IgG e IgM', 'Rubéola IgG e IgM', 'Eletroforese de hemoglobina', 'TSH', 'Parasitológico de fezes (3 amostras)', 'Ultrassonografia obstétrica inicial (transvaginal)', 'Ultrassonografia morfológica de 1º trimestre (11 a 14 semanas) com translucência nucal'],
  'Pré-natal 2º trimestre': ['Hemograma completo', 'TOTG 75 g (jejum, 1 h e 2 h) – 24 a 28 semanas', 'VDRL', 'Anti-HIV 1 e 2', 'Toxoplasmose IgG e IgM', 'Coombs indireto', 'Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Ultrassonografia morfológica de 2º trimestre (20 a 24 semanas)'],
  'Pré-natal 3º trimestre': ['Hemograma completo', 'VDRL', 'Anti-HIV 1 e 2', 'HBsAg', 'Toxoplasmose IgG e IgM', 'Coombs indireto', 'Urina tipo 1 (EAS)', 'Urocultura com antibiograma', 'Cultura para estreptococo do grupo B (swab vaginal e retal) – 35 a 37 semanas', 'Ultrassonografia obstétrica com Doppler'],
  'Rotina ginecológica': ['Colpocitologia oncótica (Papanicolaou)', 'Hemograma completo', 'Glicemia de jejum', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'TSH', '25-OH vitamina D', 'Anti-HIV 1 e 2', 'VDRL', 'HBsAg', 'Anti-HCV', 'Ultrassonografia transvaginal', 'Ultrassonografia de mamas bilateral'],
  'SOP': ['LH', 'FSH', 'Prolactina', 'TSH', 'Testosterona total', 'SHBG', 'DHEA-S', '17-OH progesterona', 'Hormônio antimülleriano (AMH)', 'Glicemia de jejum', 'Insulina de jejum', 'TOTG 75 g com dosagem de insulina (curva glicêmica e insulinêmica)', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Ultrassonografia transvaginal'],
  'Climatério': ['FSH', 'Estradiol', 'TSH', 'Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', '25-OH vitamina D', 'Colpocitologia oncótica (Papanicolaou)', 'Mamografia bilateral', 'Densitometria óssea (coluna lombar e fêmur)', 'Ultrassonografia transvaginal'],
  'Infertilidade (casal)': ['FSH', 'LH', 'Estradiol', 'Hormônio antimülleriano (AMH)', 'Prolactina', 'TSH', 'Progesterona (21º dia do ciclo)', 'Anti-HIV 1 e 2', 'VDRL', 'HBsAg', 'Anti-HCV', 'Rubéola IgG e IgM', 'Ultrassonografia transvaginal', 'Histerossalpingografia', 'Espermograma (parceiro)'],
  'Antes do DIU': ['Beta-hCG quantitativo', 'Colpocitologia oncótica (Papanicolaou)', 'PCR para Chlamydia trachomatis e Neisseria gonorrhoeae', 'Ultrassonografia transvaginal'],
  'ISTs': ['Anti-HIV 1 e 2', 'Teste treponêmico para sífilis', 'VDRL', 'HBsAg', 'Anti-HCV', 'PCR para Chlamydia trachomatis e Neisseria gonorrhoeae', 'Pesquisa de Trichomonas vaginalis'],
  'Emagrecimento – avaliação inicial': ['Hemograma completo', 'Glicemia de jejum', 'Insulina de jejum', 'HOMA-IR (glicemia e insulina de jejum)', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'TGO (AST)', 'TGP (ALT)', 'Gama-GT', 'Ácido úrico', 'Creatinina com taxa de filtração glomerular estimada', 'TSH', 'T4 livre', 'Vitamina B12', '25-OH vitamina D', 'Ferritina', 'Urina tipo 1 (EAS)', 'Ultrassonografia de abdome superior', 'Bioimpedância (composição corporal)'],
  'Tirzepatida / semaglutida (antes e acompanhamento)': ['Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Amilase', 'Lipase', 'Creatinina com taxa de filtração glomerular estimada', 'TGO (AST)', 'TGP (ALT)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'TSH', 'Ultrassonografia de abdome superior'],
  'Pós-bariátrica': ['Hemograma completo', 'Ferro sérico', 'Ferritina', 'Vitamina B12', 'Ácido fólico', '25-OH vitamina D', 'PTH (paratormônio)', 'Cálcio', 'Zinco', 'Magnésio', 'Albumina', 'Proteínas totais e frações'],
  'Check-up adulto': ['Hemograma completo', 'Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Creatinina', 'TGO (AST)', 'TGP (ALT)', 'TSH', 'Urina tipo 1 (EAS)', '25-OH vitamina D'],
  'Pré-operatório': ['Hemograma completo', 'Coagulograma completo', 'Glicemia de jejum', 'Ureia', 'Creatinina', 'Sódio', 'Potássio', 'Eletrocardiograma (ECG)', 'Radiografia de tórax PA e perfil'],
  'Pré-cirurgia oral': ['Hemograma completo', 'Coagulograma completo', 'Glicemia de jejum', 'Radiografia panorâmica', 'Tomografia computadorizada de feixe cônico (especificar região)'],
  'Ortodontia': ['Documentação ortodôntica completa', 'Radiografia panorâmica', 'Telerradiografia lateral com traçado cefalométrico', 'Fotografias intra e extraorais', 'Modelos de estudo / escaneamento intraoral'],
  'Diabetes – acompanhamento': ['Glicemia de jejum', 'Hemoglobina glicada (HbA1c)', 'Creatinina', 'Microalbuminúria', 'Colesterol total e frações (HDL, LDL, VLDL)', 'Triglicerídeos', 'Urina tipo 1 (EAS)'],
};
const ODONTO_PACKS = ['Pré-cirurgia oral', 'Ortodontia'];
function examBox(type) {
  const odonto = S.me?.profession !== 'medicina';
  const img = type === 'imagem';
  const groups = Object.entries(EXAMS).filter(([g]) => !img || isImgGroup(g)).filter(([g]) => odonto || !g.startsWith('Odonto')).sort(([a], [b]) => (a.startsWith('Odonto') === odonto ? -1 : 0) - (b.startsWith('Odonto') === odonto ? -1 : 0));
  const inGroups = new Set(groups.flatMap(([, l]) => l));
  const packs = Object.keys(EXAM_PACKS).filter(k => (odonto || !ODONTO_PACKS.includes(k)) && EXAM_PACKS[k].some(e => inGroups.has(e)));
  return html`<div id="exambox" class="${type === 'exames' || type === 'imagem' ? '' : 'hidden'}"><div class="card" style="background:#fafbfc;padding:12px">
    <div class="row between"><b class="small">Monte a solicitação</b><div class="search" style="min-width:200px">${icon('search')}<input class="in" style="height:34px" placeholder="Filtrar exames" data-input="exFilter"></div></div>
    <div class="row wrap" style="gap:6px;margin:10px 0">${packs.map(k => html`<button type="button" class="btn sm" data-act="exPack" data-k="${k}">+ ${k}</button>`)}</div>
    <div style="max-height:340px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff">${groups.map(([g, list]) => html`<div class="exgroup"><div class="tiny" style="font-weight:700;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 4px">${g}</div>
      <div class="grid g2 collapse" style="gap:2px 12px">${list.map(e => html`<label class="check small exitem"><input type="checkbox" value="${e}" data-group="${g}" data-ex="1"> ${e}</label>`)}</div></div>`)}</div>
    <div class="grid g2 collapse" style="margin-top:10px"><label class="f"><span>Indicação clínica / hipótese diagnóstica</span><input class="in" id="exind" placeholder="${img ? 'Ex.: gestação de 12 semanas – rastreamento' : 'Ex.: rotina pré-natal'}"></label><label class="f"><span>CID-10 (opcional)</span><input class="in" id="excid" maxlength="12" style="text-transform:uppercase"></label></div>
    <label class="f" style="margin-top:8px"><span>Outros exames ou observações</span><input class="in" id="exobs" placeholder="Ex.: jejum de 8 horas; DUM 10/09/2026"></label>
    <div class="row between" style="margin-top:10px"><span class="small muted" id="excount">Nenhum exame marcado</span><button type="button" class="btn primary" data-act="exBuild">${icon('check')} Montar solicitação no documento</button></div></div></div>`;
}
onInput('exFilter', el => { const q = norm(el.value); document.querySelectorAll('#exambox .exitem').forEach(l => l.classList.toggle('hidden', q && !norm(l.textContent).includes(q))); document.querySelectorAll('#exambox .exgroup').forEach(g => g.classList.toggle('hidden', ![...g.querySelectorAll('.exitem')].some(l => !l.classList.contains('hidden')))); });
const exCount = () => { const n = document.querySelectorAll('#exambox [data-ex]:checked').length; const el = document.getElementById('excount'); if (el) el.textContent = n ? `${n} exame(s) marcado(s)` : 'Nenhum exame marcado'; };
document.addEventListener('change', e => { if (e.target.matches?.('#exambox [data-ex]')) exCount(); });
act('exPack', el => { let n = 0; EXAM_PACKS[el.dataset.k].forEach(x => { const cb = [...document.querySelectorAll('#exambox [data-ex]')].find(c => c.value === x); if (cb) { cb.checked = true; n++; } }); exCount(); toast(`Pacote "${el.dataset.k}" marcado (${n} exames).`); });
act('exBuild', () => {
  const sel = [...document.querySelectorAll('#exambox [data-ex]:checked')]; const obs = document.getElementById('exobs').value.trim();
  if (!sel.length && !obs) return toast('Marque pelo menos um exame.', 'bad');
  const by = groupBy(sel, c => c.dataset.group); let n = 0;
  let h = document.querySelector('#rxform [name=doc_type]')?.value === 'imagem' ? '<p>Solicito os seguintes exames de imagem:</p>' : '<p>Solicito os seguintes exames:</p>';
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
  return html`<div class="auth"><div class="card stack"><div class="brand"><span class="mark" role="img" aria-label="PEPMH"></span><div><h1>Verificação de documento</h1><div class="small muted">Código ${code.toUpperCase()}</div></div></div>
    ${v ? html`${v.anulado_em ? html`<div class="pill bad" style="font-size:.9rem;white-space:normal">✗ Documento ANULADO pelo profissional em ${fDT(v.anulado_em)}. Não deve ser aceito.</div>` : html`<div class="pill ok" style="font-size:.9rem">✓ Documento emitido pelo PEPMH</div>`}
      <table class="tbl"><tr><td class="muted">Tipo</td><td><b>${DOCT[v.tipo]?.[0] || v.tipo}</b></td></tr><tr><td class="muted">Emitido em</td><td>${fDT(v.emitido_em)}</td></tr><tr><td class="muted">Profissional</td><td>${v.profissional || ''} ${v.conselho && !/^-\s*$/.test(v.conselho.trim()) ? '· ' + v.conselho : ''}</td></tr><tr><td class="muted">Clínica</td><td>${v.clinica}</td></tr><tr><td class="muted">Paciente</td><td>${v.paciente_iniciais} (iniciais)</td></tr>
      <tr><td class="muted">Assinatura ICP-Brasil</td><td>${v.assinado_icp ? html`<span class="pill ok">PDF assinado enviado em ${fDT(v.assinado_em)}</span>` : html`<span class="pill gray">não enviada — vale a via assinada à mão</span>`}</td></tr></table>
      ${v.hash ? html`<p class="tiny muted" style="word-break:break-all">Impressão digital (SHA-256): ${v.hash}</p>` : ''}
      ${v.hash_pdf_assinado ? html`<p class="tiny muted" style="word-break:break-all">SHA-256 do PDF assinado: ${v.hash_pdf_assinado}</p>` : ''}
      <p class="small muted">${v.assinado_icp ? html`Para conferir a assinatura do arquivo PDF, use o validador oficial do ITI: <a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a>.` : 'O conteúdo não é exibido aqui para proteger os dados do paciente.'}</p>`
      : html`<div class="pill bad" style="font-size:.9rem">Documento não encontrado</div><p class="small">Confira se o código foi digitado corretamente. Se o problema continuar, fale com a clínica que emitiu.</p>`}
  </div></div>`;
});

/* ---------- PDF assinado com certificado ICP-Brasil (VIDaaS e outros em nuvem) ---------- */
const signUrl = id => `${location.origin}/#/assinar/${id}`;
const isPhone = () => matchMedia('(pointer:coarse)').matches && innerWidth < 900;
const ICP_HELP = html`<ol class="small" style="padding-left:18px;margin:6px 0">
  <li><b>No celular</b>, toque em <b>1. Abrir no VIDaaS</b> e escolha o VIDaaS na lista. Se não aparecer, toque em <b>Baixar PDF</b>, abra o app VIDaaS, vá em <b>Assinar documento</b> e escolha o arquivo baixado.</li>
  <li>Confira o documento e aprove com a sua senha (PIN) ou biometria. O VIDaaS salva uma cópia do PDF já assinada no padrão ICP-Brasil (PAdES), normalmente com <i>assinado</i> no nome.</li>
  <li>Volte para esta tela, toque em <b>3. PDF assinado</b>, escolha o arquivo assinado e toque em <b>Enviar PDF assinado</b>.</li>
  <li>Pronto: na mesma hora o documento aparece na área do paciente, com o PDF assinado para baixar. A farmácia ou o laboratório confere em <a href="https://validar.iti.gov.br" target="_blank" rel="noopener">validar.iti.gov.br</a>.</li></ol>
  <p class="tiny muted" style="margin:0">Serve também para BirdID, SafeID, NeoID, token A3 ou A1: assine o PDF no assinador da sua certificadora e envie aqui. Depois de enviado, o documento fica travado — se estiver errado, use <b>Excluir</b> e emita um novo com <b>Repetir</b>. <a href="#" data-act="signGuide">Passo a passo completo</a></p>`;
const SIGN_GUIDE = html`<div class="stack small">
  <div><b>Antes da primeira vez (uma vez só)</b><ol style="padding-left:18px;margin:6px 0">
    <li>Tenha um certificado digital ICP-Brasil de pessoa física (e-CPF ou o certificado do CRM/CFO) em nuvem. O VIDaaS, da Valid, é o mais usado e funciona direto no celular.</li>
    <li>Instale o app <b>VIDaaS</b> (Play Store ou App Store), entre com o seu CPF e crie o PIN. Guarde esse PIN: é ele que assina.</li>
    <li>Entre no PEPMH pelo mesmo celular, com o seu usuário de profissional. Só quem emitiu o documento consegue anexar a versão assinada.</li></ol></div>
  <div><b>Para cada documento (receita, atestado, pedido de exame, encaminhamento, laudo)</b><ol style="padding-left:18px;margin:6px 0">
    <li>Emita o documento normalmente em <b>Prescrever / laudar</b> e salve. Ele fica no prontuário como <i>aguardando assinatura</i> e o paciente ainda não vê.</li>
    <li>No prontuário do paciente, aba <b>Documentos</b>, abra o documento e toque em <b>Assinar com certificado</b>.</li>
    <li>Toque em <b>1. Abrir no VIDaaS</b>, escolha o VIDaaS e aprove com o PIN ou a biometria.</li>
    <li>Volte ao PEPMH, toque em <b>3. PDF assinado</b>, escolha o arquivo que o VIDaaS gerou e toque em <b>Enviar PDF assinado</b>.</li>
    <li>O documento passa para <i>na área do paciente</i>. O paciente entra na área dele, vai em <b>Receitas e documentos</b> e baixa o PDF assinado.</li></ol></div>
  <div><b>Está no computador?</b> Na tela de assinatura tem um link para mandar o documento ao seu WhatsApp. Abra no celular, já logada, e siga do passo 3.</div>
  <div><b>Só vai para o paciente o que está assinado.</b> Documento sem assinatura digital fica apenas no prontuário (pode imprimir e assinar à mão). Assinou errado? Use <b>Excluir</b>: o documento é anulado, sai da área do paciente e a verificação pública passa a mostrar "anulado".</div>
  <div class="tiny muted">Receita de controle especial ou de antimicrobiano em formato digital precisa da numeração do SNCR da Anvisa, que o PEPMH ainda não emite. Para essas, use a Prescrição Eletrônica do CFM ou imprima e assine à mão.</div></div>`;
act('signGuide', () => modal('Como assinar digitalmente', SIGN_GUIDE, { wide: true }));
const CONTROL_NOTE = html`<div class="tip">${icon('bulb')}<span>Receita de <b>controle especial</b> ou de <b>antimicrobiano</b> em formato digital precisa da numeração do SNCR da Anvisa, que o PEPMH ainda não emite. Para essas, use a <a href="https://prescricaoeletronica.cfm.org.br/" target="_blank" rel="noopener">Prescrição Eletrônica do CFM</a> (médicos) ou a <a href="https://prescricao.cfo.org.br/" target="_blank" rel="noopener">do CFO</a> (dentistas), ou imprima e assine à mão.</span></div>`;
async function signPanel(d) {
  const mine = isDemo() || d.professional_id === Auth.userId();
  if (d.signed_file_path) return html`<div class="pill ok">Assinado com certificado ICP-Brasil em ${fDT(d.signed_at)}</div>
    <div class="row" style="margin-top:12px"><button class="btn ok" data-act="downloadSigned" data-id="${d.id}">${icon('down')} Baixar PDF assinado</button><a class="btn" href="https://validar.iti.gov.br" target="_blank" rel="noopener">Validar no ITI</a></div>`;
  if (!mine) return html`<p class="small">Só <b>${d.professional_name || 'o profissional que emitiu'}</b> pode assinar este documento, com o certificado dele.</p>`;
  const wa = `https://wa.me/?text=${encodeURIComponent('Assinar no PEPMH: ' + signUrl(d.id))}`;
  if (!isPhone()) {
    const dir = await SignDir.get();
    return html`${d.rx_type === 'controle_especial' ? CONTROL_NOTE : ''}
    <div class="docprev" style="margin:0 0 12px">Código de verificação: <b>${d.verify_code || '—'}</b></div>
    <ol class="small" style="padding-left:18px;margin:0 0 10px"><li>Clique em <b>Assinar no computador</b>: o PDF abre no Acrobat.</li><li>No Acrobat, <b>Usar um certificado → Assinar digitalmente</b>, escolha o certificado da AC VALID (VIDaaS Connect) e salve.</li><li>O PEPMH encontra o arquivo assinado e libera para a paciente sozinho.</li></ol>
    <div class="row wrap"><button class="btn primary" data-act="desktopSign" data-id="${d.id}">${icon('check')} Assinar no computador</button><button class="btn" data-act="pickSignDir" data-id="${d.id}">${icon('file')} ${dir ? 'Trocar pasta' : 'Ativar pasta'}</button><button class="btn ghost" data-act="signPcSetup">Configurar (uma vez)</button></div>
    <p class="tiny muted" style="margin:6px 0 0">Pasta vigiada: <b id="signdirname">${dir ? dir.name : 'nenhuma'}</b>${SignDir.supported() ? '' : ' · este navegador não vigia pastas; use Chrome ou Edge'}</p>
    <div style="margin-top:10px"><span id="signstatus" class="pill gray" style="white-space:normal">Pronto para assinar.</span></div>
    <div id="signdrop" data-id="${d.id}" class="signdrop">Ou arraste o PDF assinado para cá<br><label class="btn sm" style="margin-top:8px">${icon('up')} Escolher arquivo<input type="file" accept="application/pdf" id="signedpdf" hidden data-change="signedPicked" data-id="${d.id}"></label></div>
    <p class="tiny muted" style="margin:8px 0 0">Vai assinar pelo celular? <a href="${wa}" target="_blank" rel="noopener">Mande para o seu WhatsApp</a>.</p>`;
  }
  return html`${d.rx_type === 'controle_especial' ? CONTROL_NOTE : ''}${ICP_HELP}
    <div class="docprev" style="margin:12px 0">Código de verificação: <b>${d.verify_code || '—'}</b></div>
    <div class="row wrap"><button class="btn primary" data-act="shareToSigner" data-id="${d.id}">${icon('send')} 1. Abrir no VIDaaS</button><button class="btn" data-act="pdfDoc" data-id="${d.id}">${icon('down')} Baixar PDF</button></div>
    ${isPhone() ? '' : html`<p class="small muted" style="margin:10px 0 0">Está no computador? <a href="${wa}" target="_blank" rel="noopener">Mande este link para o seu WhatsApp</a> e abra no celular, já logada no PEPMH: <span style="word-break:break-all">${signUrl(d.id)}</span></p>`}
    <label class="f" style="margin-top:14px"><span>3. PDF assinado</span><input type="file" class="in" accept="application/pdf" id="signedpdf" style="padding-top:8px"></label>
    <button class="btn primary" style="margin-top:12px" data-act="uploadSigned" data-id="${d.id}">${icon('up')} Enviar PDF assinado</button>`;
}
act('signDoc', async el => {
  const d = await db.get('documents', el.dataset.id);
  modal('Assinatura digital ICP-Brasil', await signPanel(d), { wide: true });
});
route('/assinar/:id', async ({ id }) => {
  const d = await db.get('documents', id); if (!d) return html`<div class="card empty">${icon('file')}<div>Documento não encontrado.</div></div>`;
  const p = await db.get('patients', d.patient_id);
  return html`<div class="card stack" style="max-width:640px;margin:0 auto"><h2 style="margin:0">${DOCT[d.doc_type]?.[0] || 'Documento'} · ${p?.name || ''}</h2><div class="small muted">Emitido em ${fDT(d.created_at)}</div>${await signPanel(d)}
    <a class="btn ghost" href="#/paciente/${d.patient_id}?tab=documentos">Voltar ao prontuário</a></div>`;
});
act('shareToSigner', async el => {
  const b = await docBundle(el.dataset.id); const file = new File([await buildDocPdf(b)], pdfName(b.doc, b.patient), { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); toast('Escolha o VIDaaS na lista. Depois de assinar, envie o PDF assinado aqui.', 'ok'); } catch (e) { if (e.name !== 'AbortError') throw e; }
    return;
  }
  saveBlob(file, file.name); toast('PDF baixado. Abra o app VIDaaS → Assinar documento e escolha este arquivo.', 'ok');
});
/* ---------- validação do PDF assinado ----------
   Confere, antes de aceitar: (1) existe assinatura PAdES/CMS cobrindo o arquivo inteiro; (2) o conteúdo
   não mudou depois de assinado (o hash dos trechos assinados bate com o messageDigest da assinatura);
   (3) o certificado é da cadeia ICP-Brasil; (4) o nome no certificado é o do profissional que emitiu.
   A conferência criptográfica completa da cadeia continua sendo a do validador do ITI. */
const _hexBytes = h => { h = h.replace(/[^0-9a-f]/gi, ''); const o = new Uint8Array(h.length >> 1); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; };
function _derLen(b, i) { let l = b[i]; if (l < 0x80) return [l, i + 1]; const n = l & 0x7f; l = 0; for (let k = 0; k < n; k++) l = l * 256 + b[i + 1 + k]; return [l, i + 1 + n]; }
function _findSeq(b, seq, from = 0) { outer: for (let i = from; i <= b.length - seq.length; i++) { for (let k = 0; k < seq.length; k++) if (b[i + k] !== seq[k]) continue outer; return i; } return -1; }
const _normName = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]+/g, ' ').replace(/\s+/g, ' ').trim();
function _cmsNames(cms) {
  const oid = [0x06, 0x03, 0x55, 0x04, 0x03], out = []; let i = 0;
  while ((i = _findSeq(cms, oid, i)) >= 0) {
    const t = cms[i + 5]; const [l, st] = _derLen(cms, i + 6); i = st + l;
    if (![0x0c, 0x13, 0x14, 0x16, 0x1e].includes(t) || l > 200) continue;
    const raw = cms.slice(st, st + l); out.push(t === 0x1e ? new TextDecoder('utf-16be').decode(raw) : new TextDecoder(t === 0x0c ? 'utf-8' : 'latin1').decode(raw));
  }
  return out;
}
async function verifySignedPdf(f, d) {
  const buf = new Uint8Array(await f.arrayBuffer()); const txt = new TextDecoder('latin1').decode(buf);
  if (!txt.startsWith('%PDF')) throw new Error('Esse arquivo não é um PDF válido.');
  const ranges = [...txt.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)].map(m => m.slice(1, 5).map(Number));
  if (!ranges.length) throw new Error('Este PDF não tem assinatura digital. Assine com o certificado (VIDaaS) e envie o arquivo assinado.');
  if (!ranges.some(([a, , c, e]) => a === 0 && c + e === buf.length)) throw new Error('A assinatura deste PDF não cobre o arquivo inteiro: ele foi alterado depois de assinado. Assine de novo o PDF original.');
  const mdOid = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x04], icp = [...new TextEncoder().encode('ICP-Brasil')];
  const want = _normName(d.professional_name).split(' ').filter(w => w.length > 2 && !['DRA', 'DR', 'DOS', 'DAS'].includes(w));
  let lastErr = 'Não encontrei uma assinatura válida dentro do PDF. Assine de novo com o certificado.';
  for (const [a, b, c, e] of ranges) {
    if (a !== 0 || c + e > buf.length || c <= b) continue;
    const cms = _hexBytes(txt.slice(b, c)); const mi = _findSeq(cms, mdOid); if (mi < 0) continue;
    const [, j] = _derLen(cms, mi + mdOid.length + 1); const [dl, ds] = _derLen(cms, j + 1);
    const md = cms.slice(ds, ds + dl); const alg = { 32: 'SHA-256', 48: 'SHA-384', 64: 'SHA-512' }[dl]; if (!alg) continue;
    const signed = new Uint8Array(b + e); signed.set(buf.subarray(0, b), 0); signed.set(buf.subarray(c, c + e), b);
    const h = new Uint8Array(await crypto.subtle.digest(alg, signed));
    if (h.length !== md.length || h.some((x, k) => x !== md[k])) { lastErr = 'O conteúdo do PDF não confere com a assinatura (arquivo alterado ou corrompido). Assine de novo.'; continue; }
    if (_findSeq(cms, icp) < 0) { lastErr = 'O certificado usado não é ICP-Brasil. Use o certificado do VIDaaS (AC VALID) ou outro ICP-Brasil.'; continue; }
    const raw = _cmsNames(cms), names = raw.map(_normName);
    const signer = (raw.find(n => /:\d{11}$/.test(n)) || raw[0] || '').replace(/:\d+$/, '');
    if (want.length && !names.some(n => want.every(w => n.split(' ').includes(w)))) { lastErr = `Este PDF foi assinado por ${signer || 'outra pessoa'}, mas o documento é de ${d.professional_name}. Só quem emitiu pode assinar. Se o nome no PEPMH estiver diferente do certificado, ajuste o nome do profissional na equipe.`; continue; }
    return { signer, alg };
  }
  throw new Error(lastErr);
}

async function uploadSignedFile(d, f, auto = false) {
  if (!d) throw new Error('Documento não encontrado.');
  if (d.deleted_at) throw new Error('Este documento foi excluído.');
  if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) throw new Error('O arquivo precisa ser PDF.');
  if (f.size > 10 * 1024 * 1024) throw new Error('O PDF passa de 10 MB.');
  if (d.signed_file_path) throw new Error('Este documento já tem PDF assinado.');
  const v = await verifySignedPdf(f, d);
  const path = `${d.clinic_id}/${d.id}-${Date.now()}.pdf`; const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))].map(x => x.toString(16).padStart(2, '0')).join('');
  const now = new Date().toISOString(), rel = d.released_at ? {} : { released_at: now };
  if (isDemo()) { await db.update('documents', d.id, { signed_file_path: 'demo/' + d.id + '.pdf', signed_at: now, signed_sha256: hash, ...rel }); }
  else { await Remote.upload('signed-docs', path, f, false); await db.update('documents', d.id, { signed_file_path: path, signed_at: now, signed_by: Auth.userId(), signed_sha256: hash, ...rel, ...(d.released_at ? {} : { released_by: Auth.userId() }) }); }
  stopSignWatch();
  modal('Documento assinado', html`<div class="pill ok" style="font-size:.95rem;white-space:normal">✓ Assinatura conferida e documento liberado na área da paciente${auto ? ' (enviado automaticamente)' : ''}.</div>
    <p class="small">Assinado por <b>${v.signer || d.professional_name}</b> com certificado ICP-Brasil. O PEPMH conferiu que o arquivo não foi alterado depois da assinatura. A validação oficial completa é no ITI (envie o arquivo <i>${esc(f.name)}</i>).</p>
    <div class="row wrap"><a class="btn primary" href="https://validar.iti.gov.br" target="_blank" rel="noopener">${icon('check')} Validar no ITI</a><button class="btn ok" data-act="shareDoc" data-id="${d.id}">${icon('send')} Enviar à paciente</button><button class="btn" data-act="closeModal">Fechar</button></div>`, { wide: true });
  toast('Documento assinado e liberado para a paciente.', 'ok');
  saveSignedCopy(d, f).catch(() => { });
  if (location.hash.includes('/paciente/')) { const iv = setInterval(() => { if (!document.getElementById('modal')) { clearInterval(iv); router(); } }, 400); }
}
async function saveSignedCopy(d, f) {
  if (S.mode !== 'staff' || !PdfDirs.supported() || !(await PdfDirs.opts()).assinadosAuto) return;
  const p = await db.get('patients', d.patient_id).catch(() => null) || {};
  const r = await saveOut(f, pdfName(d, p).replace(/\.pdf$/i, '-assinado.pdf'), { kind: 'assinados', alt: DOC_KIND[d.doc_type], patient: p.name, ask: false, fallback: false, quiet: true });
  if (r.where === 'folder') toast(`Cópia assinada guardada em ${r.path}`, 'ok');
  else if (r.reason === 'perm') toast('O PDF assinado não foi guardado na sua pasta porque o navegador pediu permissão de novo. Libere em Configurações → Pastas dos PDFs.', 'bad');
}
act('uploadSigned', async el => {
  const f = document.getElementById('signedpdf').files[0]; if (!f) throw new Error('Escolha o arquivo PDF assinado.');
  el.disabled = true; try { await uploadSignedFile(await db.get('documents', el.dataset.id), f); } finally { el.disabled = false; }
});
onInput('signedPicked', el => { const f = el.files[0]; if (f) db.get('documents', el.dataset.id).then(d => uploadSignedFile(d, f)).catch(e => toast(e.message, 'bad')); });
/* ---------- assinatura no computador (VIDaaS Connect / certificado instalado no Windows) ----------
   O navegador não acessa o certificado direto. Fluxo: o PEPMH baixa o PDF, o Chrome abre sozinho no
   Adobe Acrobat Reader (configuração feita uma vez), a médica assina com o certificado do VIDaaS Connect
   e salva. O PEPMH vigia a pasta escolhida e envia o PDF assinado sozinho, sem passar pelo celular. */
const SignDir = {
  async db() { return new Promise((ok, bad) => { const r = indexedDB.open('pepmh-sign', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); }); },
  async get() { try { const d = await this.db(); return await new Promise(ok => { const q = d.transaction('kv').objectStore('kv').get('dir'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch { return null; } },
  async set(h) { const d = await this.db(); await new Promise(ok => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(h, 'dir'); t.oncomplete = ok; t.onerror = ok; }); },
  supported: () => 'showDirectoryPicker' in window,
  async ready(ask) {
    const h = await this.get(); if (!h) return null;
    try { if ((await h.queryPermission({ mode: 'read' })) === 'granted') return h; if (ask && (await h.requestPermission({ mode: 'read' })) === 'granted') return h; } catch { }
    return null;
  },
};
const pdfHasSig = txt => /\/ByteRange\s*\[/.test(txt) && /\/(Sig|DocTimeStamp)\b/.test(txt);
let signWatch = null;
function stopSignWatch() { if (signWatch) { clearInterval(signWatch.t); signWatch = null; } }
function setSignStatus(msg, kind = '') { const el = document.getElementById('signstatus'); if (el) { el.className = 'pill ' + (kind || 'gray'); el.style.whiteSpace = 'normal'; el.textContent = msg; } }
async function startSignWatch(d, base, since) {
  stopSignWatch();
  const dir = await SignDir.ready(true);
  if (!dir) { setSignStatus('Assine no Acrobat e arraste o PDF assinado para cá (ou ative a pasta de assinatura para o envio ser automático).'); return; }
  setSignStatus(`Aguardando o PDF assinado na pasta "${dir.name}"…`, 'warn');
  const seen = new Map(); const t0 = Date.now();
  signWatch = { id: d.id, t: setInterval(async () => {
    if (!document.getElementById('signstatus') || Date.now() - t0 > 20 * 60 * 1000) return stopSignWatch();
    try {
      for await (const [name, h] of dir.entries()) {
        if (h.kind !== 'file' || !/\.pdf$/i.test(name) || !name.toLowerCase().startsWith(base)) continue;
        const f = await h.getFile(); if (f.lastModified < since - 2000 || seen.get(name) === f.lastModified) continue;
        seen.set(name, f.lastModified);
        if (!pdfHasSig(new TextDecoder('latin1').decode(await f.arrayBuffer()))) continue;
        stopSignWatch(); setSignStatus('PDF assinado encontrado. Enviando…', 'ok');
        await uploadSignedFile(await db.get('documents', d.id), f, true); return;
      }
    } catch (e) { stopSignWatch(); setSignStatus('Não consegui ler a pasta: ' + e.message + '. Arraste o PDF assinado para cá.', 'bad'); }
  }, 2000) };
}
async function desktopSign(docId) {
  const b = await docBundle(docId); const name = pdfName(b.doc, b.patient);
  const since = Date.now(); const pdfB = new Blob([await buildDocPdf(b)], { type: 'application/pdf' }); saveBlob(pdfB, name);
  if ((await PdfDirs.opts()).naoAssinado) saveOut(pdfB, name, { kind: DOC_KIND[b.doc.doc_type] || 'padrao', patient: b.patient.name, ask: false, fallback: false, quiet: true }).catch(() => { });
  toast('PDF gerado. Assine no Acrobat com o certificado do VIDaaS Connect e salve.', 'ok');
  await startSignWatch(b.doc, name.replace(/\.pdf$/i, '').toLowerCase(), since);
}
act('desktopSign', el => desktopSign(el.dataset.id));
act('pickSignDir', async el => {
  if (!SignDir.supported()) throw new Error('Este navegador não deixa vigiar pastas. Use o Google Chrome ou o Microsoft Edge no computador.');
  let h; try { h = await window.showDirectoryPicker({ id: 'pepmh-assinatura', mode: 'read', startIn: 'downloads' }); } catch (e) { if (e.name === 'AbortError') return; throw new Error('O navegador não liberou essa pasta. Crie uma pasta, por exemplo Documentos\\PEPMH Assinados, e escolha ela (e salve os PDFs assinados lá).'); }
  await SignDir.set(h); toast(`Pasta "${h.name}" ativada. Os PDFs assinados salvos nela sobem sozinhos.`, 'ok');
  const lbl = document.getElementById('signdirname'); if (lbl) lbl.textContent = h.name;
  if (el.dataset.id && signWatch?.id !== el.dataset.id) { const d = await db.get('documents', el.dataset.id); const b = await docBundle(d.id); startSignWatch(d, pdfName(b.doc, b.patient).replace(/\.pdf$/i, '').toLowerCase(), Date.now() - 30 * 60 * 1000); }
});
act('signPcSetup', () => modal('Assinar no computador – configurar uma vez', SIGN_PC_SETUP, { wide: true }));
const SIGN_PC_SETUP = html`<div class="stack small">
  <div><b>1. VIDaaS Connect</b><ol style="padding-left:18px;margin:6px 0"><li>Deixe o VIDaaS Connect aberto e conectado com o seu CPF (ícone perto do relógio do Windows).</li><li>Nas opções dele, aumente o <b>tempo de sessão</b>. Assim você aprova no celular uma vez e assina várias receitas seguidas sem novo pedido.</li></ol></div>
  <div><b>2. Adobe Acrobat Reader</b> (grátis)<ol style="padding-left:18px;margin:6px 0"><li>Instale e deixe como programa padrão para PDF no Windows.</li><li>Em <b>Editar → Preferências → Assinaturas → Identidades e certificados confiáveis</b>, confira se o seu certificado da AC VALID aparece. Se não aparecer, reinicie o VIDaaS Connect.</li></ol></div>
  <div><b>3. Chrome abrindo o PDF direto no Acrobat</b><ol style="padding-left:18px;margin:6px 0"><li>No Chrome: <b>Configurações → Privacidade e segurança → Configurações do site → Configurações de conteúdo adicionais → Documentos PDF</b> e marque <b>Fazer o download de PDFs</b>.</li><li>Gere um documento no PEPMH. Quando o download aparecer no canto, clique na setinha (ou nos três pontinhos) e escolha <b>Sempre abrir arquivos deste tipo</b>. A partir daí, todo PDF do PEPMH abre sozinho no Acrobat.</li><li>No Edge é igual: <b>Configurações → Cookies e permissões de site → Documentos PDF → Sempre baixar arquivos PDF</b>.</li></ol></div>
  <div><b>4. Pasta de assinatura</b><p style="margin:6px 0">Na tela de assinatura, clique em <b>Ativar pasta</b> e escolha a pasta onde o Acrobat salva (normalmente <i>Downloads</i>). O PEPMH fica olhando essa pasta e envia o PDF assinado sozinho. Se o Chrome não aceitar a pasta Downloads, crie <i>Documentos\\PEPMH Assinados</i> e salve os assinados nela.</p></div>
  <div><b>No dia a dia</b><ol style="padding-left:18px;margin:6px 0"><li>Salve a receita: o PDF abre sozinho no Acrobat.</li><li>No Acrobat: <b>Todas as ferramentas → Usar um certificado → Assinar digitalmente</b>, desenhe o quadro no canto inferior esquerdo, escolha o seu certificado (AC VALID) e clique em <b>Assinar</b>.</li><li>Salve com o nome sugerido (pode acrescentar "assinado" no fim). Em segundos o PEPMH mostra <b>assinado</b> e libera para a paciente.</li></ol></div>
  <div class="tiny muted">O navegador, por segurança, não consegue abrir o certificado sozinho; por isso a assinatura acontece no Acrobat. Nada é baixado no celular: a aprovação do VIDaaS só aparece no app quando a sessão do Connect expira.</div></div>`;
document.addEventListener('dragover', e => { if (e.target.closest?.('#signdrop')) { e.preventDefault(); e.target.closest('#signdrop').classList.add('on'); } });
document.addEventListener('dragleave', e => e.target.closest?.('#signdrop')?.classList.remove('on'));
document.addEventListener('drop', e => {
  const z = e.target.closest?.('#signdrop'); if (!z) return; e.preventDefault(); z.classList.remove('on');
  const f = e.dataTransfer.files[0]; if (!f) return;
  db.get('documents', z.dataset.id).then(d => uploadSignedFile(d, f)).catch(err => toast(err.message, 'bad'));
});

act('releaseDoc', async el => {
  const d = await db.get('documents', el.dataset.id);
  if (!d.signed_file_path) throw new Error('Só documento assinado com certificado digital vai para a área do paciente. Assine primeiro.');
  await db.update('documents', d.id, { released_at: new Date().toISOString(), ...(isDemo() ? {} : { released_by: Auth.userId() }) });
  toast('Documento de volta à área do paciente.', 'ok'); router();
});
act('hideDoc', async el => {
  if (!(await confirmBox('Tirar este documento da área do paciente? Ele continua no prontuário e você pode liberar de novo quando quiser.', 'Ocultar'))) return;
  await db.update('documents', el.dataset.id, { released_at: null, released_by: null });
  toast('Documento oculto da área do paciente.'); router();
});
act('downloadSigned', async el => {
  const d = await db.get('documents', el.dataset.id);
  if (isDemo()) return toast('Na demonstração não há arquivo real para baixar.', 'bad');
  const blob = await Remote.download('signed-docs', d.signed_file_path);
  const nome = `${(DOCT[d.doc_type]?.[0] || 'documento').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '-').toLowerCase()}-${d.verify_code || d.id.slice(0, 8)}-assinado.pdf`;
  const p = S.mode === 'staff' ? await db.get('patients', d.patient_id).catch(() => null) : null;
  await saveOut(blob, nome, { kind: 'assinados', alt: DOC_KIND[d.doc_type], patient: p?.name, quiet: S.mode !== 'staff' });
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

/* ---------- prontuário: anexar documento já assinado, excluir e restaurar ---------- */
act('attachSigned', async el => {
  const pid = el.dataset.p;
  modal('Anexar documento assinado', html`<form data-form="attachSigned" class="stack">
    <input type="hidden" name="patient_id" value="${pid}">
    <label class="f"><span>Tipo de documento</span><select class="in" name="doc_type" required>${Object.entries(DOCT).map(([k, v]) => html`<option value="${k}">${v[0]}</option>`)}</select></label>
    <label class="f"><span>Descrição (opcional)</span><input class="in" name="desc" maxlength="200" placeholder="Ex.: atestado de 2 dias, receita de tirzepatida"></label>
    <label class="f"><span>PDF assinado com certificado ICP-Brasil</span><input class="in" type="file" name="file" accept="application/pdf" required style="padding-top:8px"></label>
    <p class="tiny muted" style="margin:0">O PEPMH confere a assinatura antes de aceitar: precisa ser ICP-Brasil, no nome de ${S.me?.full_name || 'quem está logado'}, e o arquivo não pode ter sido alterado depois de assinado. Aceito, vai direto para a área do paciente.</p>
    <button class="btn primary" type="submit">${icon('up')} Conferir e anexar</button></form>`, { wide: true });
});
onForm('attachSigned', async (d, f) => {
  const file = f.querySelector('[name=file]').files[0]; if (!file) throw new Error('Escolha o PDF assinado.');
  if (file.size > 10 * 1024 * 1024) throw new Error('O PDF passa de 10 MB.');
  await verifySignedPdf(file, { professional_name: S.me.full_name });
  const content = sanitize(`<p><b>Documento anexado</b> (PDF assinado digitalmente).</p>${d.desc ? `<p>${esc(d.desc)}</p>` : ''}`);
  const row = { patient_id: d.patient_id, professional_id: Auth.userId(), professional_name: S.me.full_name, doc_type: d.doc_type, rx_type: ['receituario', 'manipulado'].includes(d.doc_type) ? 'simples' : null, content, content_hash: await sha256(content), no_date: false, sent_to: null };
  let doc; try { doc = await db.insert('documents', row); } catch (e) {
    const fb = DOC_FALLBACK[d.doc_type]; if (!fb || !/doc_type|check/i.test(e.message)) throw e;
    doc = await db.insert('documents', { ...row, doc_type: fb, rx_type: fb === 'receituario' ? 'simples' : null });
  }
  try { await uploadSignedFile(doc, file); }
  catch (e) { await db.remove('documents', doc.id).catch(() => { }); throw e; }
});
act('trashDoc', async el => {
  const d = await db.get('documents', el.dataset.id);
  if (!d.signed_file_path) { if (await confirmBox('Excluir este documento? Ele ainda não foi assinado, então sai do prontuário de vez.', 'Excluir')) { await db.remove('documents', d.id); toast('Documento excluído.'); router(); } return; }
  modal('Excluir documento assinado', html`<form data-form="trashDoc" class="stack"><input type="hidden" name="id" value="${d.id}">
    <p class="small" style="margin:0">O documento sai do prontuário e da área do paciente, o link enviado deixa de funcionar e quem conferir o código <b>${d.verify_code || ''}</b> vai ver que ele foi <b>anulado</b>. O registro fica guardado em "Documentos excluídos", como manda a guarda do prontuário, e pode ser restaurado.</p>
    <label class="f"><span>Motivo</span><input class="in" name="reason" required maxlength="200" placeholder="Ex.: dose errada, emitido para a paciente errada"></label>
    <div class="row"><button class="btn danger" type="submit">${icon('trash')} Excluir</button><button class="btn" type="button" data-act="closeModal">Cancelar</button></div></form>`);
});
onForm('trashDoc', async d => {
  await db.update('documents', d.id, { deleted_at: new Date().toISOString(), delete_reason: d.reason.trim(), released_at: null, released_by: null, share_token: null, share_expires_at: null, share_file_url: null });
  closeModal(); toast('Documento excluído e retirado da área do paciente.', 'ok'); router();
});
act('restoreDoc', async el => {
  if (!(await confirmBox('Restaurar este documento? Se ele for assinado, volta para a área do paciente.', 'Restaurar'))) return;
  const d = await db.get('documents', el.dataset.id);
  await db.update('documents', d.id, { deleted_at: null, delete_reason: null, ...(d.signed_file_path ? { released_at: new Date().toISOString() } : {}) });
  toast('Documento restaurado.', 'ok'); router();
});

act('editDoc', async el => {
  const d = await db.get('documents', el.dataset.id), pid = el.dataset.p || d.patient_id;
  if (!d.signed_file_path) return go(`#/prescrever?p=${pid}&editar=${d.id}`);
  if (!isDemo() && d.professional_id !== Auth.userId()) throw new Error(`Só ${d.professional_name || 'quem emitiu'} pode corrigir este documento assinado.`);
  if (await confirmBox('Este documento já está assinado e não pode ser alterado. Abrir uma cópia para corrigir? Ao salvar, o novo documento vai para assinatura e este é excluído (anulado e retirado da área do paciente).', 'Corrigir')) go(`#/prescrever?p=${pid}&substituir=${d.id}`);
});
