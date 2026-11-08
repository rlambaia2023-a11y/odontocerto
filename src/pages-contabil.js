/* ===== Contábil do médico: livro-caixa, Receita Saúde, carnê-leão, INSS, ISS, PJ e agenda fiscal ===== */
/* Parâmetros de 2026 (Lei 15.270/2025, tabela mensal do IRPF, Portaria MPS/MF 13/2026). Revise todo janeiro. */
const TX = {
  ano: 2026,
  ir: [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
  dep: 189.59, sm: 1621.00, teto: 8475.55,
  red: { lim1: 5000, max1: 312.89, lim2: 7350, a: 978.62, b: 0.133145 },
  s3: [[180000, .06, 0], [360000, .112, 9360], [720000, .135, 17640], [1800000, .16, 35640], [3600000, .21, 125640], [4800000, .33, 648000]],
  s5: [[180000, .155, 0], [360000, .18, 4500], [720000, .195, 9900], [1800000, .205, 17100], [3600000, .23, 62100], [4800000, .305, 540000]],
};
const REGIME = { pf: 'Pessoa física (autônoma)', pj_simples: 'Empresa no Simples Nacional', pj_presumido: 'Empresa no Lucro Presumido' };
const PAYER = { pf: 'Paciente (pessoa física)', pj: 'Empresa, hospital, convênio ou plantão', exterior: 'Exterior' };
const ACC_REC = ['Consulta particular', 'Retorno / acompanhamento', 'Pré-natal', 'Acompanhamento do parto (disponibilidade)', 'Parto / cirurgia', 'Procedimento ginecológico (DIU, colposcopia, biópsia, CAF)', 'Ultrassom', 'Programa de emagrecimento', 'Aplicação no consultório', 'Teleconsulta', 'Convênio', 'Plantão', 'Outras receitas'];
const ACC_DES = [
  ['Aluguel e condomínio do consultório', 'sim'], ['Energia, água, internet e telefone do consultório', 'sim'], ['Secretária: salário e encargos', 'sim'],
  ['Material médico de consumo', 'sim'], ['Material de escritório e impressos', 'sim'], ['Limpeza, lavanderia e descarte de resíduos', 'sim'],
  ['Manutenção de equipamentos', 'sim'], ['Anuidade CRM e sociedades médicas', 'sim'], ['ISS pago', 'sim'], ['Contador', 'sim'],
  ['Sistema, software e site', 'sim'], ['Marketing e divulgação', 'sim'], ['Taxas de cartão e maquininha', 'sim'],
  ['Cursos, congressos e livros', 'confirmar'], ['Medicamentos e insumos aplicados no consultório', 'confirmar'], ['Seguro de responsabilidade civil', 'confirmar'],
  ['Carro, combustível e estacionamento', 'nao'], ['Despesa pessoal', 'nao'], ['Outras despesas', 'confirmar'],
];
const ACC_BENS = ['Aparelho de ultrassom', 'Colposcópio / equipamento médico', 'Móveis do consultório', 'Computador e eletrônicos', 'Ar-condicionado', 'Outro bem'];
const DED = { sim: ['Dedutível', 'ok'], nao: ['Não dedutível', 'gray'], confirmar: ['Confirmar com o contador', 'warn'] };
const ACC_PAY = { carne_leao: 'Carnê-leão (DARF 0190)', inss: 'INSS autônomo (GPS)', iss: 'ISS', das: 'DAS do Simples', pro_labore: 'INSS/IR do pró-labore (DCTFWeb)', irpj_csll: 'IRPJ e CSLL (trimestral)', pis_cofins: 'PIS e Cofins', irpf: 'Declaração do IRPF', dmed: 'DMED', defis: 'DEFIS', crm: 'Anuidade do CRM', outro: 'Outro' };
const RS_URL = 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/auditoria-fiscal/conformidade/perguntas-e-respostas-receita-saude';

const r2 = n => Math.round((+n || 0) * 100) / 100;
const pctf = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fCpf = v => { const d = onlyDigits(v); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : (v || ''); };
const meU = () => Auth.userId();
const own = () => ({ user_id: meU(), clinic_id: S.clinic.id });
const monthName = (y, m) => { const t = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
/* Só cobra guia vencida a partir do mês em que a médica começou a usar o módulo */
async function accStart() { const r = await db.list('acc_entries', { eq: own(), order: 'paid_on', limit: 1 }); return r[0] ? String(r[0].paid_on).slice(0, 7) + '-01' : ymd(new Date()).slice(0, 7) + '-01'; }

/* ---------- cálculos ---------- */
function irTabela(base) { if (!(base > 0)) return 0; const f = TX.ir.find(([lim]) => base <= lim); return Math.max(0, base * f[1] - f[2]); }
function redutor(rend, imposto) {
  if (rend <= TX.red.lim1) return Math.min(TX.red.max1, imposto);
  if (rend <= TX.red.lim2) return clamp(TX.red.a - TX.red.b * rend, 0, imposto);
  return 0;
}
function irMensal(base, rendTrib) { const bruto = irTabela(base); const red = redutor(rendTrib, bruto); return { bruto: r2(bruto), red: r2(red), devido: r2(Math.max(0, bruto - red)) }; }
function inssAutonomo(prof, rendTotal, inssRetido) {
  const baseRetida = inssRetido > 0 ? inssRetido / 0.11 : 0;
  switch (prof.inss_mode) {
    case 'nao': return 0;
    case 'minimo': return r2(Math.max(0, 0.2 * Math.max(0, TX.sm - baseRetida)));
    case 'simplificado': return r2(baseRetida >= TX.sm ? 0 : 0.11 * TX.sm);
    case 'renda': return rendTotal > 0 ? r2(0.2 * Math.max(0, clamp(rendTotal, TX.sm, TX.teto) - baseRetida)) : 0;
    default: return r2(0.2 * Math.max(0, TX.teto - baseRetida));
  }
}
function simplesAliq(rbt12, tab) { const rb = Math.max(rbt12, 1); const f = tab.find(([lim]) => rb <= lim) || tab[tab.length - 1]; return Math.max(0, (rb * f[1] - f[2]) / rb); }
function issMes(prof, rend) { return prof.iss_mode === 'percentual' ? r2(rend * (+prof.iss_pct || 0) / 100) : prof.iss_mode === 'fixo' ? r2((+prof.iss_fixo_anual || 0) / 12) : 0; }
function proLaboreCusto(p) { const inss = r2(0.11 * Math.min(p, TX.teto)); const ir = irMensal(Math.max(0, p - inss), p).devido; return { inss, ir }; }

/* Apuração mês a mês do ano (o excesso de livro-caixa passa para o mês seguinte, até dezembro) */
function apuraAno(entries, prof, ano) {
  const out = []; let sobra = 0;
  for (let m = 1; m <= 12; m++) {
    const k = `${ano}-${pad(m)}`; const es = entries.filter(e => String(e.paid_on).slice(0, 7) === k);
    const rec = es.filter(e => e.kind === 'receita'); const des = es.filter(e => e.kind === 'despesa');
    const recPF = sum(rec.filter(e => e.payer_type !== 'pj'), e => e.amount), recPJ = sum(rec.filter(e => e.payer_type === 'pj'), e => e.amount);
    const irrf = sum(rec, e => e.irrf_retido), inssRet = sum(rec, e => e.inss_retido);
    const desDed = sum(des.filter(e => e.deductible === 'sim'), e => e.amount), desConf = sum(des.filter(e => e.deductible === 'confirmar'), e => e.amount), desTot = sum(des, e => e.amount);
    const disp = desDed + sobra; const lcUsado = Math.min(disp, recPF); sobra = disp - lcUsado;
    const inss = (recPF + recPJ) > 0 || prof.inss_mode === 'teto' || prof.inss_mode === 'minimo' || prof.inss_mode === 'simplificado' ? inssAutonomo(prof, recPF + recPJ, inssRet) : 0;
    const deducoes = inss + (+prof.dependentes || 0) * TX.dep + (+prof.pensao || 0);
    const base = r2(Math.max(0, recPF - lcUsado - deducoes));
    const ir = recPF > 0 ? irMensal(base, recPF) : { bruto: 0, red: 0, devido: 0 };
    const iss = issMes(prof, recPF + recPJ);
    const rsPend = rec.filter(e => e.receita_saude === 'pendente').length;
    out.push({ m, k, recPF: r2(recPF), recPJ: r2(recPJ), irrf: r2(irrf), inssRet: r2(inssRet), desDed: r2(desDed), desConf: r2(desConf), desTot: r2(desTot), lcUsado: r2(lcUsado), sobra: r2(sobra), inss, deducoes: r2(deducoes), base, ir, iss, rsPend,
      liquido: r2(recPF + recPJ - irrf - inssRet - desTot - inss - ir.devido - iss) });
  }
  return out;
}
function apuraPJ(entries, prof, ano, m) {
  const k = `${ano}-${pad(m)}`; const fim = new Date(ano, m, 0); const ini12 = ymd(new Date(ano, m - 12, 1));
  const rec = entries.filter(e => e.kind === 'receita');
  const recMes = sum(rec.filter(e => String(e.paid_on).slice(0, 7) === k), e => e.amount);
  const ult12 = rec.filter(e => e.paid_on >= ini12 && e.paid_on <= ymd(fim));
  const meses = new Set(ult12.map(e => String(e.paid_on).slice(0, 7))).size || 1;
  const rbt12 = meses < 12 ? sum(ult12, e => e.amount) / meses * 12 : sum(ult12, e => e.amount);
  const folha12 = ((+prof.pro_labore || 0) + (+prof.folha_mensal || 0)) * 12; const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0;
  const anexo = fatorR >= 0.28 ? 'III' : 'V'; const aliq = simplesAliq(rbt12, anexo === 'III' ? TX.s3 : TX.s5);
  const pl = proLaboreCusto(+prof.pro_labore || 0);
  const issPct = (+prof.iss_pct || 2) / 100; const pIR = prof.equiparacao_hospitalar ? 0.08 : 0.32, pCS = prof.equiparacao_hospitalar ? 0.12 : 0.32;
  const pres = { irpj: r2(recMes * pIR * 0.15 + Math.max(0, recMes * pIR - 20000) * 0.10), csll: r2(recMes * pCS * 0.09), pis: r2(recMes * 0.0065), cofins: r2(recMes * 0.03), iss: r2(recMes * issPct), cpp: r2(0.2 * ((+prof.pro_labore || 0) + (+prof.folha_mensal || 0))) };
  return { recMes: r2(recMes), rbt12: r2(rbt12), meses, fatorR, anexo, aliq, das: r2(recMes * aliq), pl, pres, presTotal: r2(Object.values(pres).reduce((a, b) => a + b, 0)) };
}

/* ---------- agenda fiscal ---------- */
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
function lastBizDay(y, m) { const d = new Date(y, m, 0); while (isWeekend(d)) d.setDate(d.getDate() - 1); return d; }
function nextBiz(d) { d = new Date(d); while (isWeekend(d)) d.setDate(d.getDate() + 1); return d; }
function prevBiz(d) { d = new Date(d); while (isWeekend(d)) d.setDate(d.getDate() - 1); return d; }
function agendaAno(prof, ano) {
  const it = []; const pf = prof.regime === 'pf', sn = prof.regime === 'pj_simples', lp = prof.regime === 'pj_presumido';
  for (let m = 1; m <= 12; m++) {
    const comp = `${ano}-${pad(m)}-01`, ny = m === 12 ? ano + 1 : ano, nm = m === 12 ? 1 : m + 1;
    if (pf) {
      it.push({ kind: 'carne_leao', comp, due: lastBizDay(ny, nm), how: 'Carnê-Leão Web (e-CAC) → gerar DARF código 0190. Se o imposto der menos de R$ 10, ele soma com o do mês seguinte.' });
      if (prof.inss_mode !== 'nao') it.push({ kind: 'inss', comp, due: nextBiz(new Date(ny, nm - 1, 15)), how: `GPS pelo Meu INSS ou SAL: código ${prof.inss_mode === 'simplificado' ? '1163 (plano simplificado, 11%)' : '1007 (contribuinte individual, 20%)'}.` });
      if (prof.iss_mode === 'percentual') it.push({ kind: 'iss', comp, due: null, how: 'Guia do ISS no site da prefeitura (o vencimento muda de cidade para cidade).' });
    }
    if (sn) it.push({ kind: 'das', comp, due: nextBiz(new Date(ny, nm - 1, 20)), how: 'PGDAS-D no Portal do Simples Nacional: declarar o faturamento do mês e gerar o DAS.' });
    if (sn || lp) it.push({ kind: 'pro_labore', comp, due: prevBiz(new Date(ny, nm - 1, 20)), how: 'Folha do pró-labore no eSocial e DARF previdenciário da DCTFWeb (o contador costuma gerar).' });
    if (lp) { it.push({ kind: 'pis_cofins', comp, due: prevBiz(new Date(ny, nm - 1, 25)), how: 'DARF de PIS (8109) e Cofins (2172), regime cumulativo.' }); if (m % 3 === 0) it.push({ kind: 'irpj_csll', comp, due: lastBizDay(ny, nm), how: 'DARF de IRPJ (2089) e CSLL (2372) do trimestre. Dá para dividir em até 3 cotas.' }); }
  }
  const ann = [];
  if (pf) ann.push({ kind: 'outro', comp: `${ano}-12-31`, due: new Date(ano + 1, 2, 0), how: `Último dia para emitir no Receita Saúde, com data retroativa, os recibos de ${ano} que ficaram para trás.`, label: `Receita Saúde: recibos atrasados de ${ano}` });
  ann.push({ kind: 'irpf', comp: `${ano}-12-31`, due: null, how: `Declaração de ${ano + 1} (ano-base ${ano}). O prazo costuma ir de março ao fim de maio; confira a data oficial do ano.` });
  if (sn || lp) ann.push({ kind: 'dmed', comp: `${ano}-12-31`, due: lastBizDay(ano + 1, 2), how: 'Empresa que presta serviço de saúde informa à Receita os pagamentos recebidos de pacientes pessoa física.' });
  if (sn) ann.push({ kind: 'defis', comp: `${ano}-12-31`, due: new Date(ano + 1, 2, 31), how: 'Declaração anual do Simples Nacional, no Portal do Simples.' });
  ann.push({ kind: 'crm', comp: `${ano}-01-01`, due: null, how: 'Boleto anual do CRM (desconto para pagamento antecipado). É despesa dedutível no livro-caixa.' });
  return { mensal: it, anual: ann };
}

/* ---------- dados ---------- */
async function accProfile() {
  const r = await db.list('acc_profiles', { eq: own(), limit: 1 });
  return r[0] || { regime: 'pf', inss_mode: 'teto', dependentes: 0, pensao: 0, iss_mode: 'fixo', iss_pct: 0, iss_fixo_anual: 0, pro_labore: 0, folha_mensal: 0, equiparacao_hospitalar: false, _novo: true };
}
const accEntries = (from, to) => db.list('acc_entries', { eq: own(), gte: { paid_on: from }, lte: { paid_on: to }, order: 'paid_on,created_at' });

/* ---------- página ---------- */
const ACC_TABS = [['painel', 'Painel'], ['livro', 'Livro-caixa'], ['recibos', 'Receita Saúde'], ['impostos', 'Impostos do mês'], ['agenda', 'Agenda fiscal'], ['simulador', 'PF ou PJ?'], ['anual', 'Resumo do ano'], ['guia', 'Guia']];
route('/contabil', async (_, q) => {
  if (!isClinical()) return html`<div class="card empty">${icon('calc')}<h2>Contábil</h2><p class="muted">Esta área é pessoal de cada profissional de saúde.</p></div>`;
  const now = new Date(); const ym = q.get('m') || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; const [y, m] = ym.split('-').map(Number); const tab = q.get('t') || 'painel';
  const prof = await accProfile();
  const all = await accEntries(ymd(new Date(y - 1, m, 1)), `${y}-12-31`);
  const doAno = all.filter(e => String(e.paid_on).slice(0, 4) === String(y));
  const ap = apuraAno(doAno, prof, y); const cur = ap[m - 1];
  const link = (t, dm = 0) => { const d = new Date(y, m - 1 + dm, 1); return `#/contabil?t=${t}&m=${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const ctx = { y, m, ym, tab, prof, all, doAno, ap, cur, link, mes: all.filter(e => String(e.paid_on).slice(0, 7) === ym) };
  const body = await ({ painel: accPainel, livro: accLivro, recibos: accRecibos, impostos: accImpostos, agenda: accAgenda, simulador: accSimulador, anual: accAnual, guia: accGuia }[tab] || accPainel)(ctx);
  return html`<div class="pagehead"><div><h1>Contábil</h1><div class="small muted">${REGIME[prof.regime]} · só você vê estes dados</div></div><div class="row"><button class="btn" data-act="accProfile">${icon('gear')} Meu perfil fiscal</button><button class="btn" data-act="accNew" data-kind="despesa">${icon('receipt')} Despesa</button><button class="btn primary" data-act="accNew" data-kind="receita">${icon('money')} Receita</button></div></div>
  ${prof._novo ? html`<div class="tip" style="margin-bottom:12px">${icon('bulb')}<span>Comece pelo <a href="#" data-act="accProfile"><b>perfil fiscal</b></a>: se você atende como pessoa física ou empresa, como paga o INSS e o ISS. Os cálculos se ajustam a isso.</span></div>` : ''}
  <div class="seg" style="margin-bottom:12px;flex-wrap:wrap">${ACC_TABS.map(([k, l]) => html`<a class="${tab === k ? 'on' : ''}" href="${link(k)}">${l}</a>`)}</div>
  ${['painel', 'livro', 'recibos', 'impostos'].includes(tab) ? html`<div class="row" style="margin-bottom:12px"><a class="btn sm" href="${link(tab, -1)}">${icon('chevl')}</a><b style="min-width:150px;text-align:center">${monthName(y, m)}</b><a class="btn sm" href="${link(tab, 1)}">${icon('chev')}</a></div>` : ['agenda', 'anual'].includes(tab) ? html`<div class="row" style="margin-bottom:12px"><a class="btn sm" href="${link(tab, -12)}">${icon('chevl')}</a><b style="min-width:80px;text-align:center">${y}</b><a class="btn sm" href="${link(tab, 12)}">${icon('chev')}</a></div>` : ''}
  ${body}`;
}, 'contabil');

async function accPainel(c) {
  const { cur, prof, y, m } = c; const pj = prof.regime !== 'pf';
  const pjr = pj ? apuraPJ(c.all, prof, y, m) : null;
  const ag = agendaAno(prof, y); const pays = await db.list('acc_payments', { eq: own() });
  const T = ymd(new Date()); const proximos = ag.mensal.filter(i => i.due && ymd(i.due) >= T && !pays.some(p => p.kind === i.kind && p.competence === i.comp)).sort((a, b) => a.due - b.due).slice(0, 4);
  const ini = await accStart(); const atrasados = ag.mensal.filter(i => i.due && ymd(i.due) < T && !pays.some(p => p.kind === i.kind && p.competence === i.comp) && i.comp >= ini);
  const imposto = pj ? (prof.regime === 'pj_simples' ? pjr.das + pjr.pl.inss + pjr.pl.ir : pjr.presTotal + pjr.pl.inss + pjr.pl.ir) : cur.ir.devido + cur.inss + cur.iss;
  const receita = cur.recPF + cur.recPJ;
  return html`<div class="grid g4"><div class="card kpi"><div class="l">Recebido no mês</div><div class="v" style="color:var(--ok)">${BRL(receita)}</div><div class="tiny muted">pacientes ${BRL(cur.recPF)} · empresas ${BRL(cur.recPJ)}</div></div>
    <div class="card kpi"><div class="l">Despesas</div><div class="v" style="color:var(--bad)">${BRL(cur.desTot)}</div><div class="tiny muted">dedutíveis ${BRL(cur.desDed)}</div></div>
    <div class="card kpi"><div class="l">Impostos estimados</div><div class="v">${BRL(imposto)}</div><div class="tiny muted">${pj ? (prof.regime === 'pj_simples' ? `DAS Anexo ${pjr.anexo} + pró-labore` : 'Presumido + pró-labore') : 'IR + INSS + ISS'}</div></div>
    <div class="card kpi"><div class="l">Sobra estimada</div><div class="v">${BRL(receita - cur.desTot - imposto - cur.irrf - cur.inssRet)}</div><div class="tiny muted">depois de despesas e impostos</div></div></div>
  <div class="grid g2 collapse" style="margin-top:14px;align-items:start">
    <div class="card"><h3>O que pede atenção</h3><div class="stack small" style="margin-top:8px">
      ${cur.rsPend ? html`<a class="li" href="${c.link('recibos')}" style="display:flex;gap:8px;align-items:center">${icon('receipt')}<span class="grow"><b>${cur.rsPend}</b> recibo${cur.rsPend > 1 ? 's' : ''} do Receita Saúde para emitir</span><span class="pill warn">pendente</span></a>` : html`<div class="row">${icon('check')}<span>Receita Saúde em dia neste mês.</span></div>`}
      ${atrasados.length ? html`<a href="${c.link('agenda')}" class="row" style="color:var(--bad)">${icon('alarm')}<span>${atrasados.length} guia${atrasados.length > 1 ? 's' : ''} vencida${atrasados.length > 1 ? 's' : ''} sem marcar como paga</span></a>` : ''}
      ${cur.desConf ? html`<div class="row">${icon('bulb')}<span>${BRL(cur.desConf)} em despesas marcadas para confirmar com o contador.</span></div>` : ''}
      ${!pj && cur.sobra > 0 ? html`<div class="row">${icon('repeat')}<span>${BRL(cur.sobra)} de livro-caixa passam para o mês seguinte (despesa maior que a receita de pacientes).</span></div>` : ''}
      ${pj && pjr.anexo === 'V' ? html`<div class="row" style="color:var(--warn)">${icon('alarm')}<span>Fator R em ${pctf(pjr.fatorR)}: abaixo de 28% a empresa cai no Anexo V. Veja a aba Impostos.</span></div>` : ''}
    </div></div>
    <div class="card"><h3>Próximos vencimentos</h3>${proximos.length ? html`<div class="list" style="margin-top:8px">${proximos.map(i => html`<div class="li small"><b style="width:90px">${fDate(ymd(i.due))}</b><span class="grow">${ACC_PAY[i.kind]} <span class="muted">· ${monthName(...i.comp.split('-').map(Number).slice(0, 2))}</span></span></div>`)}</div>` : html`<p class="muted small">Nada pendente por enquanto.</p>`}<a class="small" href="${c.link('agenda')}">Ver agenda fiscal completa</a></div></div>
  <div class="card" style="margin-top:14px"><div class="row between"><h3>Últimos lançamentos</h3><a class="small" href="${c.link('livro')}">Abrir livro-caixa</a></div>${accTable(c.mes.slice(-6).reverse())}</div>`;
}

function accTable(rows) {
  if (!rows.length) return html`<div class="empty small">Nenhum lançamento neste mês. Use os botões <b>Receita</b> e <b>Despesa</b> ou importe do Financeiro.</div>`;
  return html`<div class="tblwrap"><table class="tbl"><tr><th>Data</th><th>Descrição</th><th class="hide-m">Tipo</th><th class="num">Valor</th><th></th></tr>${rows.map(e => html`<tr>
    <td class="small">${fDate(e.paid_on)}</td><td>${e.description}<div class="tiny muted">${e.category || ''}${e.payer_name ? ' · ' + e.payer_name : ''}</div></td>
    <td class="hide-m">${e.kind === 'receita' ? html`<span class="pill ${e.payer_type === 'pj' ? 'gray' : 'accent'}">${e.payer_type === 'pj' ? 'empresa' : e.payer_type === 'exterior' ? 'exterior' : 'paciente'}</span>${e.receita_saude === 'pendente' ? html` <span class="pill warn">recibo</span>` : e.receita_saude === 'emitido' ? html` <span class="pill ok">recibo ok</span>` : ''}` : e.kind === 'bem' ? html`<span class="pill gray">bem</span>` : html`<span class="pill ${DED[e.deductible][1]}">${DED[e.deductible][0]}</span>`}</td>
    <td class="num" style="font-weight:700;color:${e.kind === 'receita' ? 'var(--ok)' : 'var(--bad)'}">${e.kind === 'receita' ? '' : '− '}${BRL(e.amount)}</td>
    <td class="num"><button class="btn sm" data-act="accEdit" data-id="${e.id}">${icon('edit')}</button></td></tr>`)}</table></div>`;
}

async function accLivro(c) {
  const f = c.mes; const rec = f.filter(e => e.kind === 'receita'), des = f.filter(e => e.kind !== 'receita');
  return html`<div class="row between" style="margin-bottom:10px"><div class="small muted">Lance pela <b>data em que o dinheiro entrou ou saiu</b> (regime de caixa). Guarde as notas e recibos por 5 anos.</div>
    <div class="row"><button class="btn sm" data-act="accImport" data-m="${c.ym}">${icon('down')} Importar do Financeiro</button><button class="btn sm" data-act="accNew" data-kind="bem">${icon('box')} Compra de equipamento</button><button class="btn sm" data-act="accCsv" data-de="${c.ym}-01" data-ate="${ymd(new Date(c.y, c.m, 0))}">${icon('down')} Planilha do mês</button></div></div>
  <div class="grid g2 collapse" style="align-items:start"><div class="card"><div class="row between"><h3>Receitas</h3><b style="color:var(--ok)">${BRL(sum(rec, e => e.amount))}</b></div>${accTable(rec)}</div>
  <div class="card"><div class="row between"><h3>Despesas e bens</h3><b style="color:var(--bad)">${BRL(sum(des, e => e.amount))}</b></div>${accTable(des)}</div></div>`;
}

async function accRecibos(c) {
  const pend = c.doAno.filter(e => e.kind === 'receita' && e.receita_saude === 'pendente').sort((a, b) => a.paid_on < b.paid_on ? -1 : 1);
  const feitos = c.mes.filter(e => e.kind === 'receita' && e.receita_saude === 'emitido');
  const card = e => { const dados = `Pagador: ${e.payer_name || '—'} · CPF ${fCpf(e.payer_doc) || '—'}\nBeneficiário: ${e.beneficiary_name || e.payer_name || '—'} · CPF ${fCpf(e.beneficiary_cpf || e.payer_doc) || '—'}\nValor: ${BRL(e.amount)} · Pago em ${fDate(e.paid_on)}\nServiço: ${e.description}`;
    return html`<div class="card"><div class="row between"><b>${e.payer_name || e.description}</b><span class="pill warn">${fDate(e.paid_on)}</span></div>
      <div class="docprev" style="margin:10px 0;white-space:pre-line">${dados}</div>
      ${!onlyDigits(e.payer_doc) ? html`<p class="tiny" style="color:var(--bad);margin:0 0 8px">Falta o CPF de quem pagou: o Receita Saúde exige.</p>` : ''}
      <div class="row wrap"><button class="btn sm" data-act="copyText" data-t="${dados}">${icon('clip')} Copiar dados</button><button class="btn sm ok" data-act="accRsDone" data-id="${e.id}">${icon('check')} Já emiti</button><button class="btn sm ghost" data-act="accEdit" data-id="${e.id}">${icon('edit')} Corrigir</button></div></div>`; };
  return html`<div class="tip" style="margin-bottom:12px">${icon('receipt')}<span>Médica que atende como <b>pessoa física</b> é obrigada a emitir o recibo no <b>Receita Saúde</b> (app Receita Federal ou e-CAC) no momento do pagamento, um por pagamento ou parcela. Atraso pode gerar multa de R$ 100 por mês. Recibos atrasados do ano podem ser emitidos até o último dia de fevereiro do ano seguinte. <a href="${RS_URL}" target="_blank" rel="noopener">Manual oficial</a></span></div>
    ${c.prof.regime !== 'pf' ? html`<p class="small muted">Seu perfil está como empresa: quem atende por CNPJ emite nota fiscal (NFS-e), não Receita Saúde. Os recibos abaixo valem para atendimentos que você fez como pessoa física.</p>` : ''}
    <h3>Para emitir (${pend.length})</h3>${pend.length ? html`<div class="grid g2 collapse">${pend.map(card)}</div>` : html`<div class="card empty small">${icon('check')}<div>Nenhum recibo pendente em ${c.y}.</div></div>`}
    <h3 style="margin-top:16px">Emitidos neste mês (${feitos.length})</h3>${feitos.length ? html`<div class="list">${feitos.map(e => html`<div class="li small"><span class="grow">${e.payer_name || e.description} · ${BRL(e.amount)}</span><span class="muted">${e.receita_saude_code || ''}</span><button class="btn sm ghost" data-act="accRsUndo" data-id="${e.id}">desfazer</button></div>`)}</div>` : html`<p class="muted small">Nada marcado como emitido neste mês.</p>`}
    <details class="card" style="margin-top:14px"><summary><b>Passo a passo no app Receita Federal</b></summary><ol class="small" style="padding-left:18px">
      <li>Abra o app <b>Receita Federal</b> e entre com a conta gov.br (prata ou ouro).</li><li>Toque em <b>Receita Saúde</b> → <b>Emitir recibo</b>.</li>
      <li>Informe o CPF de quem pagou e, se for outra pessoa, o CPF do beneficiário (a paciente). Dá para colar os dados copiados aqui.</li>
      <li>Coloque o valor, a data do pagamento e a descrição do serviço. Confirme.</li><li>Volte aqui e toque em <b>Já emiti</b> (se quiser, anote o número do recibo).</li></ol></details>`;
}

async function accImpostos(c) {
  const { cur, prof } = c;
  if (prof.regime !== 'pf') {
    const p = apuraPJ(c.all, prof, c.y, c.m); const sn = prof.regime === 'pj_simples';
    return html`<div class="grid g2 collapse" style="align-items:start"><div class="card"><h3>${sn ? 'Simples Nacional' : 'Lucro Presumido'} · ${monthName(c.y, c.m)}</h3><div class="list small" style="margin-top:8px">
      <div class="li"><span class="grow">Faturamento do mês</span><b>${BRL(p.recMes)}</b></div>
      ${sn ? html`<div class="li"><span class="grow">Receita dos últimos 12 meses (RBT12)${p.meses < 12 ? html`<div class="tiny muted">proporcional: só ${p.meses} ${p.meses > 1 ? 'meses' : 'mês'} com lançamento</div>` : ''}</span><b>${BRL(p.rbt12)}</b></div>
        <div class="li"><span class="grow">Fator R (folha ÷ receita)</span><b style="color:${p.anexo === 'III' ? 'var(--ok)' : 'var(--warn)'}">${pctf(p.fatorR)} → Anexo ${p.anexo}</b></div>
        <div class="li"><span class="grow">Alíquota efetiva</span><b>${pctf(p.aliq)}</b></div><div class="li"><span class="grow"><b>DAS estimado</b><div class="tiny muted">vence dia 20 do mês seguinte · já inclui ISS e INSS patronal</div></span><b>${BRL(p.das)}</b></div>`
      : html`${[['IRPJ', p.pres.irpj, prof.equiparacao_hospitalar ? 'presunção de 8% (equiparação hospitalar)' : 'presunção de 32%'], ['CSLL', p.pres.csll, prof.equiparacao_hospitalar ? 'presunção de 12%' : 'presunção de 32%'], ['PIS', p.pres.pis, '0,65%'], ['Cofins', p.pres.cofins, '3%'], ['ISS', p.pres.iss, `${(+prof.iss_pct || 2).toString().replace('.', ',')}%`], ['INSS patronal (20% da folha)', p.pres.cpp, '']].map(([l, v, n]) => html`<div class="li"><span class="grow">${l}<div class="tiny muted">${n}</div></span><b>${BRL(v)}</b></div>`)}<div class="li"><span class="grow"><b>Total da empresa</b></span><b>${BRL(p.presTotal)}</b></div>`}
      <div class="li"><span class="grow">Pró-labore de ${BRL(prof.pro_labore)}: INSS 11% + IR</span><b>${BRL(p.pl.inss + p.pl.ir)}</b></div></div>
      <p class="tiny muted">Estimativa para planejamento. Quem calcula e transmite é o contador. Desde 2026 há cobrança de 10% na fonte sobre lucros distribuídos acima de R$ 50 mil por mês, por empresa.</p></div>
      <div class="card"><h3>Fator R na prática</h3><p class="small">Médica no Simples paga a partir de <b>6%</b> (Anexo III) se a folha dos últimos 12 meses (pró-labore + salários) for pelo menos <b>28%</b> do faturamento. Abaixo disso, a alíquota começa em <b>15,5%</b> (Anexo V).</p>
      ${sn ? html`<p class="small">Para ficar no Anexo III com o faturamento de agora, o pró-labore precisaria ser de pelo menos <b>${BRL(Math.max(TX.sm, p.rbt12 / 12 * 0.28 - (+prof.folha_mensal || 0)))}</b> por mês.</p>` : ''}
      <button class="btn sm" data-act="accProfile">${icon('gear')} Ajustar pró-labore e folha</button></div></div>`;
  }
  const rows = [['Recebido de pacientes (pessoa física)', cur.recPF], ['(−) Livro-caixa usado no mês', -cur.lcUsado], ['(−) INSS pago como autônoma', -cur.inss], ...(prof.dependentes ? [[`(−) Dependentes (${prof.dependentes} × ${BRL(TX.dep)})`, -prof.dependentes * TX.dep]] : []), ...(+prof.pensao ? [['(−) Pensão alimentícia', -prof.pensao]] : [])];
  return html`<div class="grid g2 collapse" style="align-items:start"><div class="card"><h3>Carnê-leão · ${monthName(c.y, c.m)}</h3><div class="list small" style="margin-top:8px">
    ${rows.map(([l, v]) => html`<div class="li"><span class="grow">${l}</span><b>${BRL(v)}</b></div>`)}
    <div class="li"><span class="grow"><b>Base de cálculo</b></span><b>${BRL(cur.base)}</b></div>
    <div class="li"><span class="grow">Imposto pela tabela</span><b>${BRL(cur.ir.bruto)}</b></div>
    ${cur.ir.red ? html`<div class="li"><span class="grow">(−) Redução de 2026 (renda até R$ 7.350)</span><b>${BRL(-cur.ir.red)}</b></div>` : ''}
    <div class="li"><span class="grow"><b>DARF do carnê-leão (código 0190)</b><div class="tiny muted">vence no último dia útil de ${monthName(c.m === 12 ? c.y + 1 : c.y, c.m === 12 ? 1 : c.m + 1)}</div></span><b style="font-size:1.1rem">${BRL(cur.ir.devido)}</b></div></div>
    ${cur.ir.devido > 0 && cur.ir.devido < 10 ? html`<p class="tiny muted">Abaixo de R$ 10 não se gera DARF: o valor soma com o do mês seguinte.</p>` : ''}
    <p class="tiny muted">O que você recebe de empresas, hospitais e convênios já tem IR retido na fonte e <b>não entra</b> no carnê-leão; ele vai para a declaração anual. O valor oficial é o do Carnê-Leão Web.</p></div>
    <div class="stack"><div class="card"><h3>INSS de autônoma</h3><div class="row between"><span class="small">${{ teto: 'Pelo teto (20% de ' + BRL(TX.teto) + ')', renda: '20% do que recebeu (até o teto)', minimo: '20% do salário mínimo', simplificado: 'Plano simplificado (11% do mínimo)', nao: 'Não recolho por aqui' }[prof.inss_mode]}</span><b>${BRL(cur.inss)}</b></div>${cur.inssRet ? html`<p class="tiny muted">Já descontado o INSS retido pelas empresas (${BRL(cur.inssRet)}).</p>` : ''}<p class="tiny muted">GPS código ${prof.inss_mode === 'simplificado' ? '1163' : '1007'}, vence dia 15 do mês seguinte. O INSS pago reduz a base do carnê-leão.</p></div>
    <div class="card"><h3>ISS</h3><div class="row between"><span class="small">${prof.iss_mode === 'fixo' ? 'Valor fixo anual da prefeitura (por mês)' : prof.iss_mode === 'percentual' ? `${String(prof.iss_pct).replace('.', ',')}% sobre o que recebeu` : 'Não se aplica'}</span><b>${BRL(cur.iss)}</b></div><p class="tiny muted">Lançou o ISS pago como despesa? Ele também é dedutível no livro-caixa.</p></div>
    <div class="card"><h3>Retido na fonte por empresas</h3><div class="row between small"><span>IR retido</span><b>${BRL(cur.irrf)}</b></div><div class="row between small"><span>INSS retido</span><b>${BRL(cur.inssRet)}</b></div></div></div></div>`;
}

async function accAgenda(c) {
  const ag = agendaAno(c.prof, c.y); const pays = await db.list('acc_payments', { eq: own() }); const T = ymd(new Date()); const ini = await accStart();
  const row = i => { const p = pays.find(x => x.kind === i.kind && x.competence === i.comp); const venc = i.due && ymd(i.due) < T && !p && i.comp >= ini;
    return html`<div class="li small"><b style="width:92px">${i.due ? fDate(ymd(i.due)) : 'ver prazo'}</b><span class="grow"><b>${i.label || ACC_PAY[i.kind]}</b>${i.kind !== 'crm' && i.comp.slice(5) !== '12-31' ? html` <span class="muted">· competência ${monthName(...i.comp.split('-').map(Number).slice(0, 2))}</span>` : ''}<div class="tiny muted">${i.how}</div></span>
      ${p ? html`<span class="pill ok">pago ${fDate(p.paid_on).slice(0, 5)}${p.amount ? ' · ' + BRL(p.amount) : ''}</span><button class="btn sm ghost" data-act="accUnpay" data-id="${p.id}">${icon('repeat')}</button>` : html`${venc ? html`<span class="pill bad">vencido</span>` : ''}<button class="btn sm ok" data-act="accPay" data-kind="${i.kind}" data-comp="${i.comp}">${icon('check')} Paguei</button>`}</div>`; };
  const byM = groupBy(ag.mensal, i => i.comp.slice(0, 7));
  return html`<p class="small muted">Datas calculadas pelos fins de semana; feriados podem antecipar ou adiar um dia. Marque o que for pagando para ter o histórico do ano.</p>
    <div class="card"><h3>Anuais</h3><div class="list">${ag.anual.map(row)}</div></div>
    ${Object.entries(byM).map(([k, its]) => html`<div class="card" style="margin-top:12px"><h3>${monthName(...k.split('-').map(Number))}</h3><div class="list">${its.map(row)}</div></div>`)}`;
}

async function accSimulador(c) {
  const med = c.ap.filter(a => a.recPF + a.recPJ > 0); const fat = med.length ? sum(med, a => a.recPF + a.recPJ) / med.length : 20000; const desp = med.length ? sum(med, a => a.desDed) / med.length : 3000;
  return html`<div class="card"><h3>Quanto sobra como pessoa física ou com empresa?</h3><p class="small muted">Simulação mensal com as regras de 2026. Os valores iniciais vêm da média dos seus lançamentos do ano.</p>
    <div class="grid g4"><label class="f"><span>Faturamento mensal</span><input class="in" id="sim_f" inputmode="decimal" value="${String(r2(fat)).replace('.', ',')}" data-input="accSim"></label><label class="f"><span>Despesas dedutíveis/mês</span><input class="in" id="sim_d" inputmode="decimal" value="${String(r2(desp)).replace('.', ',')}" data-input="accSim"></label><label class="f"><span>Pró-labore na empresa</span><input class="in" id="sim_p" inputmode="decimal" placeholder="automático (28%)" value="" data-input="accSim"></label><label class="f"><span>ISS da cidade (%)</span><input class="in" id="sim_i" inputmode="decimal" value="${String(+c.prof.iss_pct || 2).replace('.', ',')}" data-input="accSim"></label></div>
    <label class="check" style="margin-top:8px"><input type="checkbox" id="sim_e" data-change="accSim" ${c.prof.equiparacao_hospitalar ? 'checked' : ''}> Empresa com equiparação hospitalar (Lucro Presumido com presunção de 8% e 12%)</label>
    <div id="simout" style="margin-top:14px">${raw(simHtml(fat, desp, null, +c.prof.iss_pct || 2, c.prof.equiparacao_hospitalar, c.prof))}</div></div>`;
}
function simCalc(F, D, P, issPct, equip, prof) {
  const Pauto = Math.max(TX.sm, Math.ceil(F * 0.28)); P = P > 0 ? P : Pauto; const ip = issPct / 100;
  const inssPF = r2(0.2 * clamp(F, TX.sm, TX.teto)); const lc = Math.min(D, F); const irPF = irMensal(Math.max(0, F - lc - inssPF), F).devido; const issPF = prof.iss_mode === 'fixo' ? r2((+prof.iss_fixo_anual || 0) / 12) : r2(F * ip);
  const pf = { nome: 'Pessoa física', itens: [['IR (carnê-leão)', irPF], ['INSS 20%', inssPF], ['ISS', issPF]] };
  const pl = proLaboreCusto(P); const fr = P * 12 / (F * 12 || 1);
  const sn = { nome: `Simples · Anexo ${fr >= 0.28 ? 'III' : 'V'}`, itens: [[`DAS (${pctf(simplesAliq(F * 12, fr >= 0.28 ? TX.s3 : TX.s5))})`, r2(F * simplesAliq(F * 12, fr >= 0.28 ? TX.s3 : TX.s5))], ['INSS do pró-labore (11%)', pl.inss], ['IR do pró-labore', pl.ir]], obs: `Pró-labore ${BRL(P)} · Fator R ${pctf(fr)}` };
  const pIR = equip ? 0.08 : 0.32, pCS = equip ? 0.12 : 0.32;
  const lp = { nome: `Lucro Presumido${equip ? ' (equiparação)' : ''}`, itens: [['IRPJ', r2(F * pIR * 0.15 + Math.max(0, F * pIR - 20000) * 0.1)], ['CSLL', r2(F * pCS * 0.09)], ['PIS + Cofins', r2(F * 0.0365)], ['ISS', r2(F * Math.max(ip, 0.02))], ['INSS patronal 20% do pró-labore', r2(0.2 * P)], ['INSS do pró-labore (11%)', pl.inss], ['IR do pró-labore', pl.ir]], obs: `Pró-labore ${BRL(P)}` };
  [pf, sn, lp].forEach(s => { s.total = r2(s.itens.reduce((a, [, v]) => a + v, 0)); s.sobra = r2(F - D - s.total); });
  return [pf, sn, lp];
}
function simHtml(F, D, P, issPct, equip, prof) {
  if (!(F > 0)) return fv(html`<p class="muted small">Informe o faturamento.</p>`);
  const s = simCalc(F, D, P, issPct, equip, prof); const best = s.reduce((a, b) => b.total < a.total ? b : a);
  return fv(html`<div class="grid g3 collapse">${s.map(x => html`<div class="card" style="${x === best ? 'border:2px solid var(--ok)' : ''}"><div class="row between"><b>${x.nome}</b>${x === best ? html`<span class="pill ok">menor imposto</span>` : ''}</div>${x.obs ? html`<div class="tiny muted">${x.obs}</div>` : ''}
    <div class="list small" style="margin-top:8px">${x.itens.map(([l, v]) => html`<div class="li"><span class="grow">${l}</span><span>${BRL(v)}</span></div>`)}<div class="li"><span class="grow"><b>Impostos</b> (${pctf(x.total / F)})</span><b>${BRL(x.total)}</b></div><div class="li"><span class="grow">Sobra depois das despesas</span><b style="color:var(--ok)">${BRL(x.sobra)}</b></div></div></div>`)}</div>
    <p class="tiny muted" style="margin-top:10px">Não inclui honorários do contador (com empresa costuma ser R$ 300 a R$ 900 por mês), taxas de abertura nem tarifas. A empresa só faz sentido se a diferença cobrir esses custos com folga. Decida junto com seu contador.</p>`);
}
onInput('accSim', async () => {
  const g = id => parseMoney(document.getElementById(id)?.value); const prof = await accProfile();
  document.getElementById('simout').innerHTML = simHtml(g('sim_f'), g('sim_d') || 0, g('sim_p') || 0, g('sim_i') || 2, document.getElementById('sim_e').checked, prof);
});

async function accAnual(c) {
  const a = c.ap; const tot = k => r2(sum(a, x => typeof k === 'function' ? k(x) : x[k]));
  const bens = c.doAno.filter(e => e.kind === 'bem');
  const pays = (await db.list('acc_payments', { eq: own() })).filter(p => p.competence.startsWith(String(c.y)));
  return html`<div class="grid g4"><div class="card kpi"><div class="l">Recebido no ano</div><div class="v">${BRL(tot(x => x.recPF + x.recPJ))}</div></div><div class="card kpi"><div class="l">Livro-caixa dedutível</div><div class="v">${BRL(tot('desDed'))}</div></div><div class="card kpi"><div class="l">Carnê-leão estimado</div><div class="v">${BRL(tot(x => x.ir.devido))}</div></div><div class="card kpi"><div class="l">Guias marcadas como pagas</div><div class="v">${BRL(sum(pays, p => p.amount))}</div></div></div>
  <div class="card" style="margin-top:14px"><div class="row between"><h3>Mês a mês</h3><button class="btn sm" data-act="accCsv" data-de="${c.y}-01-01" data-ate="${c.y}-12-31">${icon('down')} Livro-caixa do ano (planilha)</button></div>
  <div class="tblwrap"><table class="tbl"><tr><th>Mês</th><th class="num">Pacientes</th><th class="num">Empresas</th><th class="num">Dedutível</th><th class="num">INSS</th><th class="num">Carnê-leão</th><th class="num">Recibos pendentes</th></tr>
  ${a.map(x => html`<tr><td style="text-transform:capitalize"><a href="#/contabil?t=impostos&m=${x.k}">${new Date(c.y, x.m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })}</a></td><td class="num">${BRL(x.recPF)}</td><td class="num">${BRL(x.recPJ)}</td><td class="num">${BRL(x.desDed)}</td><td class="num">${BRL(x.inss)}</td><td class="num">${BRL(x.ir.devido)}</td><td class="num">${x.rsPend ? html`<span class="pill warn">${x.rsPend}</span>` : '—'}</td></tr>`)}</table></div></div>
  <div class="grid g2 collapse" style="margin-top:14px;align-items:start"><div class="card"><h3>Para a declaração de ${c.y + 1}</h3><ul class="small" style="padding-left:18px">
    <li>Rendimentos de pessoa física e livro-caixa: vêm do Carnê-Leão Web (importe na declaração).</li><li>Rendimentos de empresas: use os informes de rendimentos que hospitais, convênios e clínicas mandam até fevereiro (IR retido: ${BRL(tot('irrf'))}).</li>
    <li>INSS pago como autônoma no ano: ${BRL(tot('inss'))} (estimado).</li><li>Equipamentos e móveis comprados entram em <b>Bens e Direitos</b>, não no livro-caixa.</li></ul></div>
    <div class="card"><h3>Bens comprados em ${c.y}</h3>${bens.length ? html`<div class="list">${bens.map(b => html`<div class="li small"><span class="grow">${b.description}<div class="tiny muted">${fDate(b.paid_on)}${b.doc_ref ? ' · NF ' + b.doc_ref : ''}</div></span><b>${BRL(b.amount)}</b></div>`)}</div>` : html`<p class="muted small">Nenhum bem lançado.</p>`}</div></div>`;
}

async function accGuia() {
  const sec = (t, items) => html`<details class="card" style="margin-top:10px"><summary><b>${t}</b></summary><ul class="small" style="padding-left:18px;margin-bottom:0">${items.map(i => html`<li style="margin-top:6px">${raw(i)}</li>`)}</ul></details>`;
  return html`<p class="small muted">Resumo prático para o dia a dia do consultório. Regras de 2026; na dúvida, confirme com seu contador.</p>
  ${sec('Atendendo como pessoa física', ['Todo pagamento de paciente gera recibo no <b>Receita Saúde</b>, na hora. Parcelado? Um recibo por parcela.', 'Todo mês: some o que recebeu de pacientes, tire as despesas do <b>livro-caixa</b>, o INSS e os dependentes, e pague o <b>carnê-leão</b> (DARF 0190) até o último dia útil do mês seguinte.', 'Desde 2026 quem tem renda tributável de até R$ 5 mil no mês fica sem imposto, e há desconto parcial até R$ 7.350.', 'INSS de autônoma: 20% sobre um valor entre o salário mínimo (R$ 1.621) e o teto (R$ 8.475,55), via GPS código 1007, até o dia 15.', 'Despesa que passa da receita do mês não se perde: sobra para os meses seguintes, até dezembro.'])}
  ${sec('O que entra no livro-caixa', ['<b>Pode:</b> aluguel e condomínio do consultório, luz, água, internet e telefone do consultório, salário e encargos da secretária, material médico de consumo, limpeza e descarte de resíduos, anuidade do CRM, ISS pago, contador, sistema e marketing.', '<b>Não pode:</b> carro, combustível, despesas pessoais e o seu próprio INSS (ele tem campo próprio). Compra de ultrassom, colposcópio, móveis ou ar-condicionado é <b>bem</b>, vai para a declaração anual.', 'Comprovante precisa ter nome e CPF/CNPJ de quem recebeu, valor e data. Guarde por 5 anos.', 'Se o consultório é dividido com outras médicas, lance só a sua parte.'])}
  ${sec('Ginecologia e obstetrícia', ['<b>Acompanhamento do parto (disponibilidade obstétrica):</b> pelo Parecer CFM 39/2012, é ético cobrar da gestante quando combinado na primeira consulta e você não está de plantão. O pagamento gera recibo (Receita Saúde), que a paciente pode usar no reembolso do plano e no IR.', '<b>Plantões e convênios:</b> o hospital ou a operadora retém IR (e INSS de 11% quando paga por RPA). Lance como receita de <b>empresa</b> com os valores retidos; não entra no carnê-leão.', 'Procedimentos de consultório (DIU, colposcopia, biópsia, CAF, ultrassom): material usado é despesa; o aparelho é bem.', 'Ultrassom e procedimentos com estrutura própria podem pesar a favor de abrir empresa; use a aba <b>PF ou PJ?</b>'])}
  ${sec('Emagrecimento', ['Cobre a <b>consulta, o acompanhamento e a aplicação</b>. O CFM proíbe o médico de comercializar medicamento ou ganhar margem sobre ele: <i>o que se vende é a consulta e o tratamento</i>.', 'Use só medicamento com registro na Anvisa ou manipulado por farmácia habilitada, com prescrição. Produto sem registro é infração ética e crime (art. 273 do Código Penal).', 'Programa mensal pago pela paciente: um recibo do Receita Saúde a cada pagamento.', 'Insumos aplicados no consultório: marque como "confirmar com o contador" até ele validar o tratamento.'])}
  ${sec('Quando vale abrir empresa', ['No Simples Nacional, médica paga a partir de <b>6%</b> (Anexo III) se a folha (pró-labore + salários) for pelo menos 28% do faturamento (Fator R). Sem isso, começa em <b>15,5%</b> (Anexo V).', 'No Lucro Presumido a carga fica perto de 13% a 17% com ISS; clínicas com estrutura e alvará sanitário podem pedir <b>equiparação hospitalar</b> (presunção de 8% no IRPJ e 12% na CSLL).', 'Desde 2026, lucro distribuído acima de R$ 50 mil por mês, por empresa, tem retenção de 10% na fonte.', 'Empresa de saúde entrega <b>DMED</b> (fevereiro) e emite NFS-e; a médica PJ não emite Receita Saúde pelos atendimentos da empresa.'])}
  ${sec('Calendário que não pode esquecer', ['Dia 15: INSS de autônoma.', 'Dia 20: DAS do Simples e DCTFWeb do pró-labore.', 'Último dia útil do mês: carnê-leão do mês anterior.', 'Fevereiro: informes de rendimentos, DMED e prazo final dos recibos atrasados do ano anterior.', 'Março a maio: declaração do IRPF (confira o prazo do ano).'])}`;
}

/* ---------- formulários ---------- */
async function accForm(e) {
  const rec = e.kind === 'receita', bem = e.kind === 'bem'; const p = e.patient_id ? await db.get('patients', e.patient_id) : null;
  const cats = rec ? ACC_REC : bem ? ACC_BENS : ACC_DES.map(x => x[0]);
  return html`<form data-form="accSave" class="stack"><input type="hidden" name="id" value="${e.id || ''}"><input type="hidden" name="kind" value="${e.kind}">
    <div class="grid g2"><label class="f"><span>Data do ${rec ? 'recebimento' : 'pagamento'} <i>*</i></span><input class="in" type="date" name="paid_on" required value="${e.paid_on || ymd(new Date())}"></label><label class="f"><span>Valor (R$) <i>*</i></span><input class="in" name="amount" inputmode="decimal" required value="${e.amount ? String(e.amount).replace('.', ',') : ''}"></label></div>
    <label class="f"><span>Categoria</span><select class="in" name="category" data-change="accCat">${cats.map(x => html`<option ${e.category === x ? 'selected' : ''}>${x}</option>`)}</select></label>
    <label class="f"><span>Descrição <i>*</i></span><input class="in" name="description" required maxlength="300" value="${e.description || ''}" placeholder="${rec ? 'Ex.: Consulta + ultrassom' : bem ? 'Ex.: Ultrassom portátil' : 'Ex.: Aluguel de novembro'}"></label>
    ${rec ? html`<label class="f"><span>Quem pagou</span><select class="in" name="payer_type" data-change="accPayer">${Object.entries(PAYER).map(([k, l]) => html`<option value="${k}" ${(e.payer_type || 'pf') === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <div id="acc_pf" style="${(e.payer_type || 'pf') === 'pj' ? 'display:none' : ''}" class="stack"><label class="f"><span>Paciente</span>${patientPicker(p, { allowNew: false, required: false })}</label>
        <div class="grid g2"><label class="f"><span>Nome de quem pagou</span><input class="in" name="payer_name" value="${e.payer_name || ''}" placeholder="Se vazio, usa o da paciente"></label><label class="f"><span>CPF de quem pagou</span><input class="in" name="payer_doc" inputmode="numeric" value="${fCpf(e.payer_doc)}"></label></div>
        <div class="grid g2"><label class="f"><span>Beneficiária (se outra pessoa)</span><input class="in" name="beneficiary_name" value="${e.beneficiary_name || ''}"></label><label class="f"><span>CPF da beneficiária</span><input class="in" name="beneficiary_cpf" inputmode="numeric" value="${fCpf(e.beneficiary_cpf)}"></label></div>
        <label class="check"><input type="checkbox" name="rs_done" ${e.receita_saude === 'emitido' ? 'checked' : ''}> Já emiti o recibo no Receita Saúde</label></div>
      <div id="acc_pj" style="${(e.payer_type || 'pf') === 'pj' ? '' : 'display:none'}" class="stack"><div class="grid g2"><label class="f"><span>Empresa / hospital / convênio</span><input class="in" name="pj_name" value="${e.payer_type === 'pj' ? e.payer_name || '' : ''}"></label><label class="f"><span>CNPJ</span><input class="in" name="pj_doc" inputmode="numeric" value="${e.payer_type === 'pj' ? fCpf(e.payer_doc) : ''}"></label></div>
        <div class="grid g2"><label class="f"><span>IR retido (R$)</span><input class="in" name="irrf_retido" inputmode="decimal" value="${e.irrf_retido ? String(e.irrf_retido).replace('.', ',') : ''}"></label><label class="f"><span>INSS retido (R$)</span><input class="in" name="inss_retido" inputmode="decimal" value="${e.inss_retido ? String(e.inss_retido).replace('.', ',') : ''}"></label></div><p class="tiny muted" style="margin:0">Lance o valor bruto do serviço e os valores retidos que aparecem no RPA ou no informe.</p></div>`
    : bem ? html`<p class="tiny muted" style="margin:0">Equipamento e móvel não deduzem no carnê-leão: ficam registrados para a declaração (Bens e Direitos) ou para a depreciação na empresa.</p>`
    : html`<label class="f"><span>Entra no livro-caixa?</span><select class="in" name="deductible" id="acc_ded">${Object.entries(DED).map(([k, [l]]) => html`<option value="${k}" ${(e.deductible || (ACC_DES.find(x => x[0] === (e.category || ACC_DES[0][0]))?.[1]) || 'sim') === k ? 'selected' : ''}>${l}</option>`)}</select></label>`}
    <label class="f"><span>Nº da nota / recibo</span><input class="in" name="doc_ref" value="${e.doc_ref || ''}"></label>
    <label class="f"><span>Observação</span><input class="in" name="notes" value="${e.notes || ''}"></label>
    <div class="row between">${e.id ? html`<button type="button" class="btn danger" data-act="accDel" data-id="${e.id}">${icon('trash')} Excluir</button>` : html`<span></span>`}<button class="btn primary" type="submit">Salvar</button></div></form>`;
}
onInput('accPayer', el => { const pj = el.value === 'pj'; const cat = el.form.querySelector('[name=category]'); if (pj && /^(Consulta particular|Retorno)/.test(cat.value)) cat.value = 'Plantão'; else if (!pj && /^(Plantão|Convênio)$/.test(cat.value)) cat.value = 'Consulta particular'; document.getElementById('acc_pf').style.display = pj ? 'none' : ''; document.getElementById('acc_pj').style.display = pj ? '' : 'none'; });
onInput('accCat', el => { const d = document.getElementById('acc_ded'); const c = ACC_DES.find(x => x[0] === el.value); if (d && c) d.value = c[1]; });
act('accNew', async el => modal({ receita: 'Nova receita', despesa: 'Nova despesa', bem: 'Compra de equipamento ou móvel' }[el.dataset.kind], await accForm({ kind: el.dataset.kind }), { wide: true }));
act('accEdit', async el => { const e = await db.get('acc_entries', el.dataset.id); modal('Editar lançamento', await accForm(e), { wide: true }); });
act('accDel', async el => { if (await confirmBox('Excluir este lançamento do livro-caixa?', 'Excluir')) { await db.remove('acc_entries', el.dataset.id); closeModal(); router(); } });
onForm('accSave', async d => {
  const amount = parseMoney(d.amount); if (!(amount > 0)) throw new Error('Informe um valor maior que zero.');
  const row = { kind: d.kind, paid_on: d.paid_on, amount, description: d.description.trim(), category: d.category, doc_ref: nz(d.doc_ref), notes: nz(d.notes) };
  if (d.kind === 'receita') {
    const pt = d.payer_type || 'pf'; row.payer_type = pt; row.deductible = 'nao';
    if (pt === 'pj') Object.assign(row, { payer_name: nz(d.pj_name), payer_doc: nz(onlyDigits(d.pj_doc)), patient_id: null, beneficiary_name: null, beneficiary_cpf: null, irrf_retido: parseMoney(d.irrf_retido) || 0, inss_retido: parseMoney(d.inss_retido) || 0, receita_saude: 'nao_se_aplica' });
    else {
      const p = d.patient_id ? await db.get('patients', d.patient_id) : null;
      Object.assign(row, { patient_id: nz(d.patient_id), payer_name: nz(d.payer_name) || p?.name || null, payer_doc: nz(onlyDigits(d.payer_doc)) || nz(onlyDigits(p?.cpf)), beneficiary_name: nz(d.beneficiary_name), beneficiary_cpf: nz(onlyDigits(d.beneficiary_cpf)), irrf_retido: 0, inss_retido: 0,
        receita_saude: pt === 'exterior' ? 'nao_se_aplica' : d.rs_done ? 'emitido' : 'pendente', receita_saude_at: d.rs_done ? new Date().toISOString() : null });
    }
  } else row.deductible = d.kind === 'bem' ? 'nao' : d.deductible || 'sim';
  if (d.id) await db.update('acc_entries', d.id, row); else await db.insert('acc_entries', { ...row, user_id: meU() });
  closeModal(); toast(row.receita_saude === 'pendente' ? 'Receita lançada. Falta emitir o recibo no Receita Saúde.' : 'Lançamento salvo.', 'ok'); router();
});
act('accRsDone', async el => {
  const code = prompt('Número do recibo no Receita Saúde (opcional):', '') ?? null; if (code === null) return;
  await db.update('acc_entries', el.dataset.id, { receita_saude: 'emitido', receita_saude_code: nz(code.trim()), receita_saude_at: new Date().toISOString() }); toast('Recibo marcado como emitido.', 'ok'); router();
});
act('accRsUndo', async el => { await db.update('acc_entries', el.dataset.id, { receita_saude: 'pendente', receita_saude_code: null, receita_saude_at: null }); router(); });
act('accPay', async el => {
  const v = prompt(`Valor pago em ${ACC_PAY[el.dataset.kind]} (opcional):`, ''); if (v === null) return;
  await db.insert('acc_payments', { user_id: meU(), kind: el.dataset.kind, competence: el.dataset.comp, amount: parseMoney(v) >= 0 ? parseMoney(v) : null, paid_on: ymd(new Date()) }); toast('Marcado como pago.', 'ok'); router();
});
act('accUnpay', async el => { await db.remove('acc_payments', el.dataset.id); router(); });

act('accProfile', async () => {
  const p = await accProfile();
  modal('Meu perfil fiscal', html`<form data-form="accProfileSave" class="stack">
    <label class="f"><span>Como você recebe pelos atendimentos?</span><select class="in" name="regime">${Object.entries(REGIME).map(([k, l]) => html`<option value="${k}" ${p.regime === k ? 'selected' : ''}>${l}</option>`)}</select></label>
    <div class="grid g2"><label class="f"><span>INSS como autônoma</span><select class="in" name="inss_mode">${[['teto', 'Pelo teto (20% de ' + BRL(TX.teto) + ')'], ['renda', '20% do que recebo, até o teto'], ['minimo', '20% do salário mínimo'], ['simplificado', 'Plano simplificado (11% do mínimo)'], ['nao', 'Não recolho / recolho por outro vínculo']].map(([k, l]) => html`<option value="${k}" ${p.inss_mode === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="f"><span>Dependentes no IR</span><input class="in" type="number" min="0" max="20" name="dependentes" value="${p.dependentes || 0}"></label></div>
    <div class="grid g2"><label class="f"><span>ISS</span><select class="in" name="iss_mode">${[['fixo', 'Valor fixo anual (autônoma)'], ['percentual', 'Percentual sobre o faturamento'], ['nao', 'Não pago ISS']].map(([k, l]) => html`<option value="${k}" ${p.iss_mode === k ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="f"><span>ISS fixo anual (R$) ou alíquota (%)</span><div class="row" style="flex-wrap:nowrap"><input class="in" name="iss_fixo_anual" inputmode="decimal" placeholder="R$/ano" value="${+p.iss_fixo_anual ? String(p.iss_fixo_anual).replace('.', ',') : ''}"><input class="in" name="iss_pct" inputmode="decimal" placeholder="%" value="${+p.iss_pct ? String(p.iss_pct).replace('.', ',') : ''}"></div></label></div>
    <label class="f"><span>Pensão alimentícia paga por mês (R$)</span><input class="in" name="pensao" inputmode="decimal" value="${+p.pensao ? String(p.pensao).replace('.', ',') : ''}"></label>
    <details><summary class="small"><b>Se você tem empresa</b></summary><div class="stack" style="margin-top:8px"><label class="f"><span>CNPJ</span><input class="in" name="cnpj" value="${fCpf(p.cnpj)}"></label>
      <div class="grid g2"><label class="f"><span>Pró-labore mensal (R$)</span><input class="in" name="pro_labore" inputmode="decimal" value="${+p.pro_labore ? String(p.pro_labore).replace('.', ',') : ''}"></label><label class="f"><span>Outros salários + FGTS por mês (R$)</span><input class="in" name="folha_mensal" inputmode="decimal" value="${+p.folha_mensal ? String(p.folha_mensal).replace('.', ',') : ''}"></label></div>
      <label class="check"><input type="checkbox" name="equiparacao_hospitalar" ${p.equiparacao_hospitalar ? 'checked' : ''}> Tenho equiparação hospitalar no Lucro Presumido</label></div></details>
    <button class="btn primary" type="submit">Salvar perfil</button></form>`, { wide: true });
});
onForm('accProfileSave', async d => {
  const num = v => { const n = parseMoney(v); return n >= 0 ? n : 0; };
  const row = { regime: d.regime, inss_mode: d.inss_mode, dependentes: clamp(parseInt(d.dependentes) || 0, 0, 20), iss_mode: d.iss_mode, iss_fixo_anual: num(d.iss_fixo_anual), iss_pct: clamp(num(d.iss_pct), 0, 10), pensao: num(d.pensao), cnpj: nz(onlyDigits(d.cnpj)), pro_labore: num(d.pro_labore), folha_mensal: num(d.folha_mensal), equiparacao_hospitalar: !!d.equiparacao_hospitalar, updated_at: new Date().toISOString() };
  const cur = await db.list('acc_profiles', { eq: own(), limit: 1 });
  if (cur.length) await db.updateWhere('acc_profiles', { user_id: meU(), clinic_id: S.clinic.id }, row); else await db.insert('acc_profiles', { ...row, user_id: meU() });
  closeModal(); toast('Perfil fiscal salvo.', 'ok'); router();
});

/* Importar do Financeiro da clínica */
act('accImport', async el => {
  const [y, m] = el.dataset.m.split('-').map(Number); const from = `${el.dataset.m}-01`, to = ymd(new Date(y, m, 0));
  const fin = (await db.list('finance_entries', { gte: { paid_at: from }, lte: { paid_at: to }, order: 'paid_at' })).filter(f => f.paid_at);
  const done = new Set((await db.list('acc_entries', { eq: own(), gte: { paid_on: from }, lte: { paid_on: to } })).map(e => e.finance_entry_id).filter(Boolean));
  const avail = fin.filter(f => !done.has(f.id)); const pm = await patientMap(avail.map(f => f.patient_id));
  modal('Importar do Financeiro', avail.length ? html`<p class="small muted" style="margin-top:0">Marque só o que é <b>seu</b>: atendimentos que você fez e despesas que você pagou. Receitas de pacientes entram como pendentes de recibo.</p>
    <form data-form="accImportSave" class="stack"><div class="list">${avail.map(f => html`<label class="li small" style="cursor:pointer"><input type="checkbox" name="f_${f.id}" ${f.kind === 'receita' ? 'checked' : ''}><span class="grow">${f.description}<div class="tiny muted">${fDate(f.paid_at)}${f.patient_id && pm[f.patient_id] ? ' · ' + pm[f.patient_id].name : ''}${f.category ? ' · ' + f.category : ''}</div></span><b style="color:${f.kind === 'receita' ? 'var(--ok)' : 'var(--bad)'}">${f.kind === 'despesa' ? '− ' : ''}${BRL(f.amount)}</b></label>`)}</div>
    <button class="btn primary" type="submit">Importar selecionados</button></form>` : html`<div class="empty small">${icon('check')}<div>Nada novo para importar neste mês.</div></div>`, { wide: true });
});
onForm('accImportSave', async d => {
  const ids = Object.keys(d).filter(k => k.startsWith('f_') && d[k]).map(k => k.slice(2)); if (!ids.length) throw new Error('Marque pelo menos um lançamento.');
  const fin = await db.list('finance_entries', { in: { id: ids } }); const pm = await patientMap(fin.map(f => f.patient_id));
  const rows = fin.map(f => { const p = f.patient_id ? pm[f.patient_id] : null; const rec = f.kind === 'receita'; const conv = f.method === 'convenio' || /conv[eê]nio/i.test(f.category || '');
    return { user_id: meU(), kind: rec ? 'receita' : 'despesa', paid_on: f.paid_at, amount: +f.amount, description: f.description.slice(0, 300), category: rec ? (conv ? 'Convênio' : /emagrec/i.test(f.description) ? 'Programa de emagrecimento' : 'Consulta particular') : 'Outras despesas', deductible: rec ? 'nao' : 'confirmar',
      payer_type: rec ? (conv ? 'pj' : 'pf') : null, payer_name: rec && !conv ? p?.name || null : null, payer_doc: rec && !conv ? nz(onlyDigits(p?.cpf)) : null, patient_id: rec && !conv ? f.patient_id : null, method: f.method, receita_saude: rec && !conv ? 'pendente' : 'nao_se_aplica', finance_entry_id: f.id }; });
  await db.insert('acc_entries', rows); closeModal(); toast(`${rows.length} lançamento${rows.length > 1 ? 's' : ''} importado${rows.length > 1 ? 's' : ''}. Confira as categorias.`, 'ok'); router();
});

/* Planilha (CSV) do livro-caixa para o contador ou para conferir no Carnê-Leão Web */
act('accCsv', async el => {
  const rows = await accEntries(el.dataset.de, el.dataset.ate);
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Quem pagou', 'CPF/CNPJ', 'Beneficiária', 'CPF beneficiária', 'IR retido', 'INSS retido', 'Livro-caixa', 'Receita Saúde', 'Nº recibo', 'Nota/recibo'].map(q).join(';'),
    ...rows.map(e => [fDate(e.paid_on), e.kind === 'receita' ? (e.payer_type === 'pj' ? 'Receita de empresa' : e.payer_type === 'exterior' ? 'Receita do exterior' : 'Receita de pessoa física') : e.kind === 'bem' ? 'Bem' : 'Despesa', e.category, e.description, String(e.amount).replace('.', ','), e.payer_name, fCpf(e.payer_doc), e.beneficiary_name, fCpf(e.beneficiary_cpf), String(e.irrf_retido || 0).replace('.', ','), String(e.inss_retido || 0).replace('.', ','), e.kind === 'despesa' ? DED[e.deductible][0] : '', { pendente: 'Pendente', emitido: 'Emitido', nao_se_aplica: '' }[e.receita_saude], e.receita_saude_code, e.doc_ref].map(q).join(';'))];
  await saveOut(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `livro-caixa-${el.dataset.de}-a-${el.dataset.ate}.csv`, { kind: 'relatorios' });
});
