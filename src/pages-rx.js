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
/* Medicina: referências usuais por área — revisar dose, intervalo e duração para cada paciente.
   5º campo: 'atm' antimicrobiano (receita em 2 vias, retida na farmácia); 'ret' venda com retenção de receita (2 vias);
   'ce' controle especial (Portaria 344/98, lista C1 – receituário de controle especial em 2 vias). */
const MEDS_MED_CATS = {
  'Ginecologia': [
    ['Fluconazol 150 mg', 'uso oral', '1 cápsula', 'Tomar 1 cápsula em dose única.'],
    ['Nitrato de miconazol 2% creme vaginal', 'uso vaginal', '1 bisnaga com aplicadores', 'Aplicar 1 aplicador cheio no fundo da vagina, à noite, ao deitar, por 7 noites seguidas.'],
    ['Metronidazol 400 mg', 'uso oral', '14 comprimidos', 'Tomar 1 comprimido de 12 em 12 horas, por 7 dias. Não ingerir bebida alcoólica durante o uso e até 48 horas após.', 'atm'],
    ['Metronidazol gel vaginal 100 mg/g', 'uso vaginal', '1 bisnaga com aplicadores', 'Aplicar 1 aplicador cheio na vagina, à noite, ao deitar, por 5 noites. Evitar bebida alcoólica durante o tratamento.', 'atm'],
    ['Clindamicina creme vaginal 2%', 'uso vaginal', '1 bisnaga com aplicadores', 'Aplicar 1 aplicador cheio na vagina, à noite, ao deitar, por 7 noites.', 'atm'],
    ['Secnidazol 1 g', 'uso oral', '2 comprimidos', 'Tomar 2 comprimidos juntos (2 g), em dose única, após uma refeição. Não ingerir bebida alcoólica por 48 horas.', 'atm'],
    ['Azitromicina 500 mg', 'uso oral', '2 comprimidos', 'Tomar 2 comprimidos juntos (1 g), em dose única.', 'atm'],
    ['Nitrofurantoína 100 mg', 'uso oral', '20 cápsulas', 'Tomar 1 cápsula de 6 em 6 horas, por 5 dias, junto com alimento.', 'atm'],
    ['Fosfomicina trometamol 3 g', 'uso oral', '1 envelope', 'Dissolver o envelope em meio copo de água e tomar em dose única, à noite, após esvaziar a bexiga.', 'atm'],
    ['Ácido mefenâmico 500 mg', 'uso oral', '9 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, durante a menstruação, por até 3 dias.'],
    ['Ácido tranexâmico 250 mg', 'uso oral', '30 comprimidos', 'Tomar 2 comprimidos (500 mg) de 8 em 8 horas durante o sangramento, por até 5 dias.'],
    ['Butilbrometo de escopolamina 10 mg + dipirona 250 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se cólica.'],
    ['Levonorgestrel 0,15 mg + etinilestradiol 0,03 mg', 'uso oral', '3 cartelas', 'Tomar 1 comprimido ao dia, no mesmo horário, por 21 dias. Fazer pausa de 7 dias e iniciar a cartela seguinte.'],
    ['Desogestrel 0,075 mg', 'uso oral', '3 cartelas', 'Tomar 1 comprimido ao dia, sempre no mesmo horário, de forma contínua, sem pausa entre as cartelas.'],
    ['Levonorgestrel 1,5 mg (contracepção de emergência)', 'uso oral', '1 comprimido', 'Tomar 1 comprimido em dose única, o quanto antes, até 72 horas após a relação.'],
    ['Estriol 1 mg/g creme vaginal', 'uso vaginal', '1 bisnaga com aplicador', 'Aplicar 1 aplicador na vagina à noite, todos os dias, por 2 semanas. Depois, 2 vezes por semana, conforme reavaliação.'],
  ],
  'Obstetrícia': [
    ['Ácido fólico 0,4 mg', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido ao dia. Iniciar pelo menos 30 dias antes de engravidar e manter até a 12ª semana de gestação.'],
    ['Ácido fólico 5 mg', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido ao dia, conforme orientação médica.'],
    ['Sulfato ferroso 40 mg de ferro elementar', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido ao dia, 30 minutos antes do almoço, de preferência com suco de fruta cítrica. Não tomar junto com leite ou cálcio.'],
    ['Carbonato de cálcio 1.250 mg (500 mg de cálcio elementar)', 'uso oral', '60 comprimidos', 'Tomar 1 comprimido no almoço e 1 no jantar, a partir da 12ª semana até o parto. Tomar longe do sulfato ferroso.'],
    ['Ácido acetilsalicílico 100 mg (prevenção de pré-eclâmpsia)', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido ao dia, à noite, da 12ª até a 36ª semana de gestação.'],
    ['Dimenidrinato 50 mg + piridoxina 10 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se náusea ou vômito. Pode causar sonolência.'],
    ['Metoclopramida 10 mg', 'uso oral', '10 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, 30 minutos antes das refeições, se náusea ou vômito.'],
    ['Paracetamol 750 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se dor ou febre. Não ultrapassar 4 comprimidos por dia.'],
    ['Butilbrometo de escopolamina 10 mg', 'uso oral', '10 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, se cólica.'],
    ['Cefalexina 500 mg', 'uso oral', '28 cápsulas', 'Tomar 1 cápsula de 6 em 6 horas, por 7 dias.', 'atm'],
    ['Progesterona natural micronizada 200 mg', 'uso vaginal', '30 cápsulas', 'Introduzir 1 cápsula na vagina à noite, ao deitar, pelo período indicado pela médica.'],
    ['Simeticona 40 mg', 'uso oral', '20 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, se gases ou desconforto abdominal.'],
    ['Lactulose 667 mg/mL', 'uso oral', '1 frasco', 'Tomar 15 mL uma vez ao dia, se intestino preso. Ajustar a dose conforme o funcionamento do intestino.'],
    ['Lanolina pomada', 'uso tópico', '1 bisnaga', 'Aplicar uma pequena quantidade nos mamilos após cada mamada. Não precisa retirar antes de amamentar.'],
  ],
  'Emagrecimento e metabolismo': [
    ['Tirzepatida 2,5 mg (caneta)', 'uso subcutâneo', '1 caixa', 'Aplicar 2,5 mg por via subcutânea, 1 vez por semana, sempre no mesmo dia, por 4 semanas. Depois, reavaliar para subir para 5 mg semanais.', 'ret'],
    ['Tirzepatida 5 mg (caneta)', 'uso subcutâneo', '1 caixa', 'Aplicar 5 mg por via subcutânea, 1 vez por semana, sempre no mesmo dia.', 'ret'],
    ['Semaglutida 0,25 mg (caneta)', 'uso subcutâneo', '1 caneta', 'Aplicar 0,25 mg por via subcutânea, 1 vez por semana, por 4 semanas. Depois, subir para 0,5 mg semanais.', 'ret'],
    ['Liraglutida 6 mg/mL (caneta)', 'uso subcutâneo', '1 caixa', 'Aplicar por via subcutânea, 1 vez ao dia: 0,6 mg na 1ª semana, aumentando 0,6 mg por semana até 3 mg ao dia, conforme tolerância.', 'ret'],
    ['Orlistate 120 mg', 'uso oral', '84 cápsulas', 'Tomar 1 cápsula junto com cada refeição principal (até 3 por dia). Se pular a refeição ou ela não tiver gordura, não tomar.'],
    ['Cloridrato de metformina XR 500 mg', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido no jantar. Ajustar a dose no retorno.'],
    ['Topiramato 25 mg', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido à noite.', 'ce'],
    ['Cloridrato de bupropiona 150 mg (liberação prolongada)', 'uso oral', '30 comprimidos', 'Tomar 1 comprimido pela manhã.', 'ce'],
    ['Psyllium 5 g (sachê)', 'uso oral', '30 sachês', 'Diluir 1 sachê em 200 mL de água e tomar 1 vez ao dia, 30 minutos antes da principal refeição. Beber bastante água ao longo do dia.'],
    ['Colecalciferol (vitamina D3) 50.000 UI', 'uso oral', '8 cápsulas', 'Tomar 1 cápsula por semana, junto com uma refeição, por 8 semanas.'],
    ['Pantogar', 'uso oral', '1 caixa', 'Tomar 1 cápsula por via oral ao dia, por 3 meses.'],
    ['Buscopan Composto', 'uso oral', '1 caixa', 'Tomar 1 comprimido por via oral de 8 em 8 horas, se dor.'],
    ['Lactulona', 'uso oral', '1 frasco', 'Tomar 10 mL por via oral à noite, se intestino preso (obstipação).'],
    ['Ondif 8 mg', 'uso sublingual', '1 caixa', 'Colocar 1 comprimido debaixo da língua, se enjoo.'],
    ['Whey protein', 'uso oral', 'uso contínuo', 'Tomar 30 g após o café da manhã e 30 g após o treino.'],
    ['Ômega 3 1 g', 'uso oral', 'uso contínuo', 'Tomar 2 cápsulas de 12 em 12 horas.'],
  ],
  'Fórmulas manipuladas': [
    ['Creatina 5 g + Peptstrong 2,4 g (sachê)', 'uso oral', 'Manipular 30 sachês', 'Tomar 1 sachê ao dia.'],
    ['Colecalciferol (vitamina D3) 50.000 UI', 'uso oral', 'Manipular 8 cápsulas', 'Tomar 1 cápsula por semana, junto com uma refeição, por 8 semanas.'],
    ['Metilfolato 1 mg + metilcobalamina 1.000 mcg', 'uso oral', 'Manipular 30 cápsulas', 'Tomar 1 cápsula ao dia.'],
    ['Mio-inositol 2 g + ácido fólico 200 mcg (sachê)', 'uso oral', 'Manipular 60 sachês', 'Dissolver 1 sachê em água e tomar 2 vezes ao dia, antes do café da manhã e antes do jantar.'],
    ['Picolinato de cromo 200 mcg', 'uso oral', 'Manipular 30 cápsulas', 'Tomar 1 cápsula ao dia, antes do almoço.'],
    ['Berberina 500 mg', 'uso oral', 'Manipular 60 cápsulas', 'Tomar 1 cápsula antes do almoço e 1 antes do jantar.'],
    ['Psyllium 5 g (sachê)', 'uso oral', 'Manipular 30 sachês', 'Diluir 1 sachê em 200 mL de água e tomar 30 minutos antes da principal refeição.'],
    ['Creatina monoidratada 3 g (sachê)', 'uso oral', 'Manipular 30 sachês', 'Diluir 1 sachê em água ou suco e tomar 1 vez ao dia.'],
    ['Bisglicinato de ferro 30 mg + vitamina C 100 mg', 'uso oral', 'Manipular 30 cápsulas', 'Tomar 1 cápsula ao dia, longe de leite e derivados.'],
    ['Magnésio quelato 300 mg', 'uso oral', 'Manipular 30 cápsulas', 'Tomar 1 cápsula à noite.'],
    ['Melatonina 3 mg', 'uso oral', 'Manipular 30 cápsulas', 'Tomar 1 cápsula 30 minutos antes de dormir.'],
    ['Estriol 1 mg/g – creme vaginal', 'uso vaginal', 'Manipular 30 g com aplicador', 'Aplicar 1 aplicador na vagina à noite, todos os dias, por 2 semanas. Depois, 2 vezes por semana.'],
    ['Ácido bórico 600 mg – óvulo vaginal', 'uso vaginal', 'Manipular 14 óvulos', 'Introduzir 1 óvulo na vagina à noite, ao deitar, por 14 noites. Não ingerir. Não usar durante a gestação.'],
  ],
  'Medicação para aplicação': [
    ['Benzilpenicilina benzatina 1.200.000 UI', 'uso intramuscular', '2 frascos-ampola', 'Aplicar 2.400.000 UI por via intramuscular (1.200.000 UI em cada glúteo), em dose única.', 'atm'],
    ['Ceftriaxona 500 mg', 'uso intramuscular', '1 frasco-ampola', 'Aplicar 500 mg por via intramuscular, em dose única.', 'atm'],
    ['Imunoglobulina anti-D 300 mcg', 'uso intramuscular', '1 seringa/ampola', 'Aplicar 1 dose por via intramuscular (gestante Rh negativo não sensibilizada), na data indicada pela médica.'],
    ['Sacarato de hidróxido férrico 100 mg/5 mL', 'uso endovenoso', '2 ampolas', 'Diluir 200 mg em 200 mL de soro fisiológico 0,9% e infundir por via endovenosa em, no mínimo, 30 minutos, em ambiente com observação.'],
    ['Cianocobalamina (vitamina B12) 1.000 mcg/mL', 'uso intramuscular', '4 ampolas', 'Aplicar 1 ampola por via intramuscular, 1 vez por semana, por 4 semanas.'],
    ['Vacina dTpa (difteria, tétano e coqueluche acelular)', 'uso intramuscular', '1 dose', 'Aplicar 1 dose por via intramuscular, a partir da 20ª semana de gestação.'],
    ['Vacina influenza', 'uso intramuscular', '1 dose', 'Aplicar 1 dose por via intramuscular.'],
    ['Dipirona sódica 500 mg/mL', 'uso intramuscular', '1 ampola de 2 mL', 'Aplicar 1 ampola por via intramuscular, dose única, se dor.'],
  ],
  'Clínica geral': [
    ['Dipirona sódica 1 g', 'uso oral', '10 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se dor ou febre.'],
    ['Paracetamol 750 mg', 'uso oral', '12 comprimidos', 'Tomar 1 comprimido de 6 em 6 horas, se dor ou febre. Não ultrapassar 4 comprimidos por dia.'],
    ['Ibuprofeno 600 mg', 'uso oral', '9 comprimidos', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 3 dias.'],
    ['Amoxicilina 500 mg', 'uso oral', '21 cápsulas', 'Tomar 1 cápsula de 8 em 8 horas, por 7 dias.', 'atm'],
    ['Cefalexina 500 mg', 'uso oral', '28 cápsulas', 'Tomar 1 cápsula de 6 em 6 horas, por 7 dias.', 'atm'],
    ['Omeprazol 20 mg', 'uso oral', '30 cápsulas', 'Tomar 1 cápsula em jejum, 30 minutos antes do café da manhã, por 30 dias.'],
    ['Loratadina 10 mg', 'uso oral', '5 comprimidos', 'Tomar 1 comprimido ao dia, por 5 dias.'],
    ['Ondansetrona 4 mg (orodispersível)', 'uso oral', '10 comprimidos', 'Dissolver 1 comprimido na boca de 8 em 8 horas, se náusea ou vômito.'],
    ['Prednisona 20 mg', 'uso oral', '5 comprimidos', 'Tomar 1 comprimido pela manhã, após o café, por 5 dias.'],
    ['Sais para reidratação oral', 'uso oral', '4 envelopes', 'Diluir 1 envelope em 1 litro de água filtrada e tomar aos poucos ao longo do dia, principalmente após cada evacuação líquida.'],
  ],
};
/* Protocolos prontos da clínica (Dra. Mayara – emagrecimento). Aparecem em "Modelo" no receituário e podem ser editados antes de salvar. */
const RX_PROTOS = {
  obesidade: ['Receita – protocolo de obesidade',
    `<p><b>Uso oral</b></p><p data-med="1">1. Pantogar ———— 1 caixa<br>Tomar 1 cápsula por via oral ao dia, por 3 meses.</p><p data-med="1">2. Buscopan Composto ———— 1 caixa<br>Tomar 1 comprimido por via oral de 8 em 8 horas, se dor.</p><p data-med="1">3. Lactulona ———— 1 frasco<br>Tomar 10 mL por via oral à noite, se intestino preso (obstipação).</p><p><b>Uso sublingual</b></p><p data-med="1">4. Ondif 8 mg ———— 1 caixa<br>Colocar 1 comprimido debaixo da língua, se enjoo.</p>`],
  suplementos: ['Suplementos e dieta – protocolo de obesidade',
    `<p><b>Dieta</b></p><p>1. Dieta hiperproteica de 900 kcal por dia<br>30% de carboidratos, 40% de proteínas e 30% de gorduras, com predomínio de gorduras boas.</p><p><b>Uso oral</b></p><p data-med="1">2. Whey protein ———— uso contínuo<br>Tomar 30 g após o café da manhã e 30 g após o treino.</p><p data-med="1">3. Creatina 5 g + Peptstrong 2,4 g (sachê) ———— Manipular 30 sachês<br>Tomar 1 sachê ao dia.</p><p data-med="1">4. Ômega 3 1 g ———— uso contínuo<br>Tomar 2 cápsulas de 12 em 12 horas.</p>`],
  completo: ['Protocolo de obesidade completo (medicações + suplementos e dieta)', null],
};
RX_PROTOS.completo[1] = RX_PROTOS.obesidade[1] + '<p><br></p>' + RX_PROTOS.suplementos[1].replace(/<p(?: data-med="1")?>(\d)\./g, (m, n) => m.replace(n + '.', (+n + 4) + '.'));
const protoOptions = type => type === 'receituario' && S.me?.profession === 'medicina' ? html`<optgroup label="Protocolos da clínica">${Object.entries(RX_PROTOS).map(([k, [t]]) => html`<option value="proto:${k}">${t}</option>`)}</optgroup>` : '';
const MED_FLAG = { atm: 'antimicrobiano: receita em 2 vias, a farmácia retém uma', ret: 'venda com retenção de receita: emitir em 2 vias', ce: 'controle especial (lista C1): receituário de controle especial em 2 vias' };
/* qual lista aparece em cada tipo de documento */
function medCats(type) {
  if (S.me?.profession !== 'medicina') return { 'Medicamentos': MEDS_ODO };
  if (type === 'manipulado') return { 'Fórmulas manipuladas': MEDS_MED_CATS['Fórmulas manipuladas'] };
  if (type === 'medicacao') return { 'Medicação para aplicação': MEDS_MED_CATS['Medicação para aplicação'] };
  return MEDS_MED_CATS;
}
const medById = id => { const [c, i] = String(id || '').split('::'); return (S.me?.profession !== 'medicina' ? (c === 'Medicamentos' ? MEDS_ODO : null) : MEDS_MED_CATS[c])?.[i]; };
const curMeds = () => S.me?.profession === 'medicina' ? Object.values(MEDS_MED_CATS).flat() : MEDS_ODO;
const medOptions = type => html`<option value="">Selecione…</option>${Object.entries(medCats(type)).map(([c, list]) => html`<optgroup label="${c}">${list.map((m, i) => html`<option value="${c}::${i}">${m[0]}${m[4] ? ' ⚑' : ''}</option>`)}</optgroup>`)}`;
const MED_TYPES = ['receituario', 'manipulado', 'medicacao'];
const DOC_FALLBACK = { imagem: 'exames', manipulado: 'receituario', medicacao: 'receituario' };
const RXTYPES = { simples: 'Simples (uma via)', duas_vias: 'Simples em duas vias (antimicrobiano ou retenção de receita)', controle_especial: 'Controle especial (duas vias)' };

route('/prescrever', async (_, q) => {
  const pid = q.get('p'); const tipo = q.get('tipo') || 'receituario';
  const editId = q.get('editar'), subId = q.get('substituir'); const rep = editId || subId || q.get('repetir');
  window.__rxEdit = editId ? { id: editId, mode: 'editar' } : subId ? { id: subId, mode: 'substituir' } : null;
  const p = pid ? await db.get('patients', pid) : null; const repDoc = rep ? await db.get('documents', rep) : null;
  const type = repDoc?.doc_type || tipo;
  const tpls = await db.list('document_templates', { order: 'title' });
  const hist = p ? await db.list('documents', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 5 }) : [];
  window.__tpls = tpls; await loadAllergy(p);
  after(() => { const ed = document.getElementById('rxed'); if (ed) ed.innerHTML = repDoc ? sanitize(repDoc.content) : window.__rxPrefill ? sanitize(window.__rxPrefill) : RX_PROTOS[q.get('proto')] ? sanitize(RX_PROTOS[q.get('proto')][1]) : ''; window.__rxPrefill = null; });
  return html`<div class="pagehead"><div class="row">${p ? html`<a class="btn sm back" href="#/paciente/${p.id}?tab=documentos">${icon('back')}</a>` : ''}<h1>${editId ? 'Editar documento' : subId ? 'Corrigir documento assinado' : 'Prescrições e laudos'}</h1></div></div>
  ${editId ? html`<div class="tip">${icon('edit')}<span>Você está editando o documento salvo. Ao salvar, ele é atualizado (ainda não foi assinado).</span></div>` : subId ? html`<div class="tip">${icon('edit')}<span>Documento assinado não muda depois da assinatura. Corrija aqui: ao salvar, sai um documento novo para assinar e o antigo é excluído (anulado e retirado da área do paciente).</span></div>` : ''}
  <form id="rxform" onsubmit="return false" class="stack">
    <div class="card"><h2 style="color:var(--brand);margin-bottom:12px">Informe os dados do paciente</h2>
      <label class="f"><span>Nome completo <i>*</i></span>${patientPicker(p)}</label><div id="rxallergy">${allergyBanner()}</div>
      <div class="grid g2 collapse" style="margin-top:12px"><label class="f"><span>E-mail</span><input class="in" name="email" type="email" value="${p?.email || ''}"></label><label class="f"><span>Telefone celular</span><input class="in" name="phone" inputmode="tel" value="${fPhone(p?.phone)}"></label></div></div>
    <div class="card stack">
      <label class="f"><span>Profissional</span><select class="in" name="professional_id">${S.members.map(m => html`<option value="${m.user_id}" ${m.user_id === Auth.userId() ? 'selected' : ''}>${m.full_name} ${councilOf(m) ? '· ' + councilOf(m) : ''}</option>`)}</select></label>
      <div><span class="small" style="font-weight:600;color:var(--ink-2)">Escolha um tipo</span><input type="hidden" name="doc_type" value="${type}">
      <div class="doctype" style="margin-top:8px">${Object.entries(DOCT).map(([k, [l, ic]]) => html`<button type="button" class="${k === type ? 'on' : ''}" data-act="rxType" data-t="${k}">${icon(ic)}${l}</button>`)}</div></div>
      <div class="grid g2 collapse" style="align-items:end"><label class="f"><span>Modelo personalizado</span><select class="in" id="rxtpl" data-change="rxTpl"><option value="">Selecione…</option>${protoOptions(type)}${tpls.filter(t => t.doc_type === type).map(t => html`<option value="${t.id}">${t.title}</option>`)}</select></label>
        <div class="row"><button type="button" class="btn sm" data-act="manageTpl">${icon('edit')} Editar lista de modelos</button></div></div>
      ${examBox(type)}
      <div id="medbox" class="${MED_TYPES.includes(type) ? '' : 'hidden'}"><div class="grid g2 collapse" style="align-items:end"><label class="f"><span>Adicionar medicamento</span><select class="in" id="rxmed" data-change="rxMed">${medOptions(type)}</select></label>
        <label class="f"><span>Quantidade</span><input class="in" id="rxqty"></label></div>
        <label class="f" style="margin-top:10px"><span>Posologia</span><input class="in" id="rxpos"></label>
        <div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="rxClearMed">${icon('x')} Remover</button><button type="button" class="btn ok" data-act="rxAddMed">${icon('plus')} Adicionar</button></div>
        <p class="tiny muted" id="rxflag" style="margin:8px 0 0;color:var(--warn,#b26a00)"></p><p class="tiny muted" style="margin:8px 0 0">⚑ = exige receita em 2 vias / retenção. Posologias de referência. Confira dose, intervalo e duração para cada paciente (idade, peso, alergias, função renal/hepática).</p></div>
      <div><span class="small" style="font-weight:600;color:var(--ink-2)">Escreva o documento <i style="color:var(--bad);font-style:normal">*</i></span>
        <div class="editor-bar" style="margin-top:6px">${[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['undo', '↶'], ['redo', '↷'], ['insertOrderedList', '1.'], ['insertUnorderedList', '•']].map(([c, l]) => html`<button type="button" data-act="rxCmd" data-c="${c}" title="${c}">${l}</button>`)}</div>
        <div class="editor" id="rxed" contenteditable="true"></div></div>
      <div class="grid g2 collapse"><label class="f ${type === 'receituario' || type === 'manipulado' ? '' : 'hidden'}" id="rxtypebox"><span>Tipo de receituário</span><select class="in" name="rx_type">${Object.entries(RXTYPES).map(([k, v]) => html`<option value="${k}" ${repDoc?.rx_type === k ? 'selected' : ''}>${v}</option>`)}</select></label>
        <div class="stack"><label class="check"><input type="checkbox" name="save_tpl"> Salvar como modelo para uso futuro</label><label class="check"><input type="checkbox" name="no_date"> Emitir sem data</label></div></div>
      <div class="tip">${icon('bulb')}<span>Cabeçalho, endereço e assinatura saem dos dados da clínica e do seu cadastro. <a href="#/configuracoes">Ajustar agora</a>. O PDF sai com a logo, os dados da clínica e os seus, e pode ser enviado por WhatsApp, e-mail ou link. Para receita digital valer na farmácia, assine o PDF com certificado ICP-Brasil.</span></div>
      <div class="grid g2"><button type="button" class="btn primary" data-act="rxSave" data-mode="pdf">${icon('down')} Salvar, gerar PDF e assinar</button><button type="button" class="btn" data-act="rxSave" data-mode="print">${icon('print')} Salvar e imprimir</button></div>
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
  const t = el.dataset.t;
  document.getElementById('medbox').classList.toggle('hidden', !MED_TYPES.includes(t));
  if (MED_TYPES.includes(t)) { document.getElementById('rxmed').innerHTML = fv(medOptions(t)); ACT.rxClearMed(); }
  const eb = document.getElementById('exambox'); if (eb) eb.outerHTML = fv(examBox(t));
  document.getElementById('rxtypebox').classList.toggle('hidden', !['receituario', 'manipulado'].includes(t));
  document.getElementById('rxtpl').innerHTML = fv(html`<option value="">Selecione…</option>${protoOptions(el.dataset.t)}${(window.__tpls || []).filter(t => t.doc_type === el.dataset.t).map(t => html`<option value="${t.id}">${t.title}</option>`)}`);
});
onInput('rxTpl', el => {
  if (el.value.startsWith('proto:')) { const pr = RX_PROTOS[el.value.slice(6)]; if (!pr) return; const ed = document.getElementById('rxed'); ed.innerHTML = (ed.innerHTML.trim() ? ed.innerHTML + '<p><br></p>' : '') + sanitize(pr[1]); toast('Protocolo inserido. Confira e ajuste antes de salvar.', 'ok'); return; }
  const t = (window.__tpls || []).find(x => x.id === el.value); if (!t) return;
  const name = document.querySelector('#rxform [name=patient_name]').value || '______________';
  const ed = document.getElementById('rxed'); ed.innerHTML = (ed.innerHTML.trim() ? ed.innerHTML : '') + sanitize(t.content).replace(/\{paciente\}/g, esc(name));
});
onInput('rxMed', el => { const m = medById(el.value); document.getElementById('rxqty').value = m ? m[2] : ''; document.getElementById('rxpos').value = m ? m[3] : ''; document.getElementById('rxflag').textContent = m?.[4] ? '⚑ ' + MED_FLAG[m[4]] + '.' : ''; });
act('rxClearMed', () => { document.getElementById('rxmed').value = ''; document.getElementById('rxqty').value = ''; document.getElementById('rxpos').value = ''; const fl = document.getElementById('rxflag'); if (fl) fl.textContent = ''; });
act('rxAddMed', async () => {
  const m = medById(document.getElementById('rxmed').value); if (!m) return toast('Escolha um medicamento.', 'bad');
  if (allergyHit(m[0]) && !(await confirmBox(`Atenção: o paciente tem registro de "${window.__allergy}". ${m[0]} pode estar relacionado. Incluir mesmo assim?`, 'Incluir mesmo assim'))) return;
  const ed = document.getElementById('rxed'); const n = (ed.querySelectorAll('[data-med]').length || ed.innerHTML.match(/<p>\d+\./g)?.length || 0) + 1;
  const via = m[1]; const hasVia = ed.textContent.toLowerCase().includes(via);
  ed.insertAdjacentHTML('beforeend', `${hasVia ? '' : `<p><b>${esc(via[0].toUpperCase() + via.slice(1))}</b></p>`}<p data-med="1">${n}. ${esc(m[0])} ———— ${esc(document.getElementById('rxqty').value)}<br>${esc(document.getElementById('rxpos').value)}</p>`);
  if (m[4]) { const sel = document.querySelector('#rxform [name=rx_type]'); const want = m[4] === 'ce' ? 'controle_especial' : 'duas_vias'; if (sel && sel.value !== 'controle_especial' && sel.value !== want) { sel.value = want; toast(`${m[0].split(' ')[0]}: ${MED_FLAG[m[4]]}. Ajustei o tipo de receituário.`); } }
  ACT.rxClearMed();
});
act('rxCmd', el => { document.getElementById('rxed').focus(); document.execCommand(el.dataset.c, false, null); });
act('rxSave', async el => {
  const f = document.getElementById('rxform'); const d = formData(f); const content = sanitize(document.getElementById('rxed').innerHTML);
  if (!htmlToText(content)) throw new Error('Escreva o conteúdo do documento.');
  if (MED_TYPES.includes(d.doc_type) && window.__allergy) { const hit = curMeds().find(m => norm(htmlToText(content)).includes(norm(m[0].split(' ')[0])) && allergyHit(m[0])); if (hit && !(await confirmBox(`O texto inclui ${hit[0].split(' ')[0]} e o paciente tem registro de "${window.__allergy}". Salvar mesmo assim?`, 'Salvar mesmo assim'))) return; }
  el.disabled = true;
  try {
    const pid = await resolvePatient(d, { phone: onlyDigits(d.phone), email: d.email });
    const p = await db.get('patients', pid);
    if (d.phone && onlyDigits(d.phone) !== (p.phone || '')) { await db.update('patients', pid, { phone: onlyDigits(d.phone) }); p.phone = onlyDigits(d.phone); }
    const prof = S.members.find(m => m.user_id === d.professional_id) || S.me;
    const row = { content_hash: await sha256(content), patient_id: pid, professional_id: prof.user_id, professional_name: prof.full_name, doc_type: d.doc_type, rx_type: ['receituario', 'manipulado'].includes(d.doc_type) ? d.rx_type : null, content, no_date: !!d.no_date, sent_to: null };
    const ed = window.__rxEdit; let doc;
    if (ed?.mode === 'editar') { doc = await db.update('documents', ed.id, row) || await db.get('documents', ed.id); }
    else try { doc = await db.insert('documents', row); } catch (e) {
      /* banco ainda sem os tipos novos: grava no tipo equivalente (exames / receituário) */
      const fb = DOC_FALLBACK[d.doc_type]; if (!fb || !/doc_type|check/i.test(e.message)) throw e;
      doc = await db.insert('documents', { ...row, doc_type: fb, rx_type: fb === 'receituario' ? (row.rx_type || 'simples') : null });
    }
    if (ed?.mode === 'substituir') await db.update('documents', ed.id, { deleted_at: new Date().toISOString(), delete_reason: 'Substituído por documento corrigido' + (doc.verify_code ? ' (' + doc.verify_code + ')' : ''), released_at: null, released_by: null, share_token: null, share_expires_at: null, share_file_url: null }).catch(e => toast('O novo foi salvo, mas não consegui excluir o antigo: ' + e.message, 'bad'));
    window.__rxEdit = null;
    if (d.save_tpl) { const title = prompt('Nome do modelo:', DOCT[d.doc_type][0] + ' – ' + fDate(new Date())); if (title) await db.insert('document_templates', { doc_type: d.doc_type, title, content }); }
    if (el.dataset.mode === 'print') printDocument(doc, p, prof);
    toast(el.dataset.mode === 'pdf' && !isPhone() ? 'Documento salvo. Confira e assine com o certificado…' : 'Documento salvo. Assine com o certificado e ele aparece sozinho na área do paciente.', 'ok'); go(`#/paciente/${pid}?tab=documentos`);
    if (el.dataset.mode === 'pdf') setTimeout(async () => { for (let i = 0; i < 25 && document.querySelector('#app .loading'); i++) await new Promise(r => setTimeout(r, 200)); signPreview(doc.id).catch(e => toast(e.message, 'bad')); }, 700);
  } finally { el.disabled = false; }
});

function printDocument(doc, p, prof) {
  const { title, body } = docPrintParts(doc, p, prof);
  printDoc(title + ' – ' + p.name, body);
  printCopy(doc, p, prof).catch(() => { });
}
function docPrintParts(doc, p, prof) {
  const title = DOCT[doc.doc_type]?.[0] || 'Documento'; const city = S.clinic.city || '';
  const dateLine = doc.no_date ? `<p style="text-align:right;margin-top:26px">${esc(city)}, ____/____/________</p>` : `<p style="text-align:right;margin-top:26px">${esc(city)}${city ? ', ' : ''}${esc(new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))}</p>`;
  const body = (via) => `<div class="page">${docHeader()}<h1>${doc.rx_type === 'controle_especial' ? 'Receituário de controle especial' : esc(title)}</h1>${via ? `<p style="text-align:right;font-size:12px"><b>${via}</b></p>` : ''}
    <p><b>Paciente:</b> ${esc(p.name)}${doc.rx_type === 'controle_especial' ? `<br><b>Endereço:</b> ${esc([p.address, p.city, p.state].filter(Boolean).join(', ') || '________________________________')}` : ''}</p>
    <div style="min-height:260px">${sanitize(doc.content).replace(/\{paciente\}/g, esc(p.name))}</div>${dateLine}${signature(prof.full_name, councilOf(prof))}
    ${doc.rx_type === 'controle_especial' ? `<div style="display:flex;gap:12px;margin-top:20px"><div class="box" style="flex:1"><b>Identificação do comprador</b><br>Nome:<br>RG:<br>Endereço:<br>Telefone:</div><div class="box" style="flex:1"><b>Identificação do fornecedor</b><br><br><br>Assinatura do farmacêutico &nbsp; Data: __/__/__</div></div>` : ''}
    <div class="ft">${esc(S.clinic.name)} · ${esc(fPhone(S.clinic.phone))}${doc.verify_code ? ` · Código de verificação <b>${esc(doc.verify_code)}</b> — confira em ${esc(verifyUrl(doc.verify_code))}` : ''}</div></div>`;
  return { title, body: doc.rx_type === 'controle_especial' || doc.rx_type === 'duas_vias' ? body('1ª via – Farmácia') + body('2ª via – Paciente') : body('') };
}
/* cópia em PDF do que foi impresso, na pasta configurada (só se houver pasta e a opção estiver ligada) */
async function printCopy(doc, p, prof) {
  if (S.mode !== 'staff' || !PdfDirs.supported() || !(await PdfDirs.opts()).copiaImpressao) return;
  const b = { doc: { ...doc, signed: !!doc.signed_file_path }, patient: p, prof, clinic: S.clinic };
  const r = await saveOut(await buildDocPdf(b), pdfName(b.doc, p), { kind: DOC_KIND[doc.doc_type] || 'padrao', patient: p.name, ask: false, fallback: false, quiet: true });
  if (r.where === 'folder') toast(`Cópia em PDF guardada em ${r.path}`, 'ok');
  else if (r.reason === 'perm') toast('A cópia em PDF não foi guardada: o navegador pediu permissão da pasta de novo. Libere em Configurações → Pastas dos PDFs.', 'bad');
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
