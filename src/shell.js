/* ===== Casca do app, login/cadastro, dados de demonstração ===== */
const NAV = [
  ['inicio', '#/', 'home', 'Início'], ['agenda', '#/agenda', 'cal', 'Agenda'], ['minha', '#/minha-agenda', 'calme', 'Minha agenda'],
  ['pacientes', '#/pacientes', 'user', 'Pacientes'], ['prescrever', '#/prescrever', 'pill', 'Prescrever'],
  ['sep', 'Gestão'], ['financeiro', '#/financeiro', 'money', 'Financeiro'], ['precificador', '#/precificador', 'tag', 'Precificador'],
  ['convenios', '#/convenios', 'building', 'Convênios'], ['relatorios', '#/relatorios', 'chart', 'Relatórios'], ['estoque', '#/estoque', 'box', 'Estoque'],
  ['sep', 'Relacionamento'], ['marketing', '#/marketing', 'mega', 'Marketing'], ['crm', '#/crm', 'crm', 'CRM'], ['ideias', '#/ideias', 'bulb', 'Central de ideias'],
  ['sep', ''], ['config', '#/configuracoes', 'gear', 'Configurações'],
];
let NOTIF = { count: 0, items: [] };

function renderShell(active) {
  const app = document.getElementById('app');
  if (!document.getElementById('view')) {
    app.innerHTML = fv(html`
    <header class="topbar">
      <button class="iconbtn only-m" data-act="toggleMenu" aria-label="Menu">${icon('menu')}</button>
      <a class="logo" href="#/"><span class="mark">PE</span>PEPMH</a>
      <span class="sp"></span>
      <button class="iconbtn" data-act="globalSearch" aria-label="Buscar paciente">${icon('search')}</button>
      <div class="rel"><button class="iconbtn" data-act="openNotif" aria-label="Notificações" id="bellbtn">${icon('bell')}</button></div>
      <a class="iconbtn hide-m" href="#/marketing" aria-label="Mensagens">${icon('chat')}</a>
      <div class="rel"><button class="iconbtn" data-act="popmenu" data-menu="usermenu" aria-label="Conta" style="width:auto;padding:0 8px;gap:6px;display:inline-flex"><span class="avatar" style="width:30px;height:30px;font-size:.75rem;background:#fff">${initials(S.me.full_name || 'U')}</span></button></div>
    </header>
    <template id="usermenu"><div style="padding:8px 10px 6px"><b>${S.me.full_name || 'Usuário'}</b><div class="tiny muted">${S.clinic.name}${isDemo() ? ' · demonstração' : ''}</div></div>
      <a href="#/configuracoes">${icon('gear')} Configurações</a>${isDemo() ? html`<button data-act="resetDemo">${icon('repeat')} Reiniciar demonstração</button>` : ''}<button data-act="logout">${icon('logout')} Sair</button></template>
    <div class="shell"><nav class="side" id="side"></nav><div class="scrim" data-act="toggleMenu"></div><main id="view"></main></div>`);
    updateNotif();
  }
  document.getElementById('side').innerHTML = fv(NAV.map(n => n[0] === 'sep' ? html`<div class="sep"></div>${n[1] ? html`<div class="label">${n[1]}</div>` : ''}` : html`<a href="${n[1]}" class="${active === n[0] ? 'on' : ''}">${icon(n[2])}<span>${n[3]}</span></a>`));
}
act('toggleMenu', () => document.body.classList.toggle('menu-open'));
act('logout', () => Auth.signOut());
act('resetDemo', async () => { if (await confirmBox('Apagar tudo o que foi feito na demonstração e recomeçar com os dados de exemplo?', 'Reiniciar')) { LS.del('pepmh_demo_db'); location.reload(); } });

async function updateNotif() {
  try {
    const today = ymd(new Date());
    const [rets, pats, stock] = await Promise.all([
      db.list('return_alerts', { eq: { done: false }, lte: { due_date: ymd(addDays(new Date(), 7)) }, order: 'due_date' }),
      db.list('patients', { eq: { active: true }, select: 'id,name,birth_date,phone' }),
      db.list('stock_items', { select: 'id,name,quantity,min_quantity' }),
    ]);
    const md = today.slice(5);
    const bdays = pats.filter(p => p.birth_date && p.birth_date.slice(5, 10) === md);
    const low = stock.filter(s => +s.quantity <= +s.min_quantity);
    const pm = Object.fromEntries(pats.map(p => [p.id, p]));
    NOTIF.items = [
      ...rets.map(r => ({ ic: 'alarm', t: `Retorno: ${pm[r.patient_id]?.name || 'paciente'}`, s: `${r.due_date <= today ? 'Vencido/hoje' : 'Em ' + fDate(r.due_date)} · ${r.reason || ''}`, h: `#/paciente/${r.patient_id}?tab=retornos` })),
      ...bdays.map(p => ({ ic: 'cake', t: `Aniversário: ${p.name}`, s: 'Mande uma mensagem hoje', h: `#/marketing` })),
      ...low.map(s => ({ ic: 'box', t: `Estoque baixo: ${s.name}`, s: `Restam ${s.quantity}`, h: '#/estoque' })),
    ];
    const b = document.getElementById('bellbtn'); if (!b) return;
    b.querySelector('.dot')?.remove();
    if (NOTIF.items.length) b.insertAdjacentHTML('beforeend', `<span class="dot">${NOTIF.items.length > 9 ? '9+' : NOTIF.items.length}</span>`);
  } catch (e) { console.warn(e); }
}
act('openNotif', el => {
  document.querySelectorAll('.menu-pop.float').forEach(m => m.remove());
  const p = document.createElement('div'); p.className = 'menu-pop float'; p.style.minWidth = '300px'; p.style.maxWidth = '92vw';
  p.innerHTML = fv(NOTIF.items.length ? NOTIF.items.map(n => html`<a href="${n.h}">${icon(n.ic)}<span><b class="small">${n.t}</b><br><span class="tiny muted">${n.s}</span></span></a>`) : html`<div class="empty small">Nada pendente por aqui.</div>`);
  el.parentElement.appendChild(p);
});

/* busca global de pacientes */
act('globalSearch', () => {
  modal('Buscar paciente', html`<div class="search">${icon('search')}<input class="in" placeholder="Nome, CPF ou telefone" data-input="gsearch" autocomplete="off"></div><div id="gsres" class="list" style="margin-top:10px"></div>`);
});
let gsT;
onInput('gsearch', el => {
  clearTimeout(gsT); gsT = setTimeout(async () => {
    const q = el.value.trim(); const box = document.getElementById('gsres'); if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    const rows = await searchPatients(q);
    box.innerHTML = fv(rows.length ? rows.map(p => html`<a class="li" href="#/paciente/${p.id}" data-act="closeModalNav"><span class="avatar">${initials(p.name)}</span><span class="grow"><span class="t">${p.name}</span><span class="tiny muted">${p.birth_date ? age(p.birth_date) + ' anos · ' : ''}${fPhone(p.phone)}</span></span></a>`) : html`<div class="empty small">Nenhum paciente encontrado.</div>`);
  }, 220);
});
act('closeModalNav', el => { closeModal(); location.hash = el.getAttribute('href'); });
async function searchPatients(q, limit = 12) {
  const d = onlyDigits(q);
  if (d.length >= 4) {
    const [a, b] = await Promise.all([db.list('patients', { ilike: { cpf: `*${d}*` }, limit }), db.list('patients', { ilike: { phone: `*${d}*` }, limit })]);
    const m = new Map([...a, ...b].map(p => [p.id, p])); return [...m.values()];
  }
  return db.list('patients', { ilike: { name: `*${q}*` }, order: 'name', limit });
}

/* ---------- login / cadastro ---------- */
function renderAuth(mode = 'login') {
  const app = document.getElementById('app');
  const remoteOk = !!(CFG.url && CFG.key);
  app.innerHTML = fv(html`<div class="auth"><div class="card">
    <div class="brand"><span class="mark">PE</span><div><h1>PEPMH</h1><div class="small muted">Prontuário eletrônico e gestão do consultório</div></div></div>
    <div class="seg" style="margin:18px 0 16px;width:100%"><button class="${mode === 'login' ? 'on' : ''}" style="flex:1" data-act="authLogin">Entrar</button><button class="${mode === 'signup' ? 'on' : ''}" style="flex:1" data-act="authSignup">Criar conta</button></div>
    ${mode === 'login' ? html`
      <form data-form="login" class="stack">
        <label class="f"><span>E-mail</span><input class="in" type="email" name="email" required autocomplete="email"></label>
        <label class="f"><span>Senha</span><input class="in" type="password" name="password" required autocomplete="current-password"></label>
        <button class="btn primary block" type="submit">Entrar</button>
        <button class="btn ghost block small" type="button" data-act="forgot">Esqueci minha senha</button>
      </form>` : html`
      <form data-form="signup" class="stack">
        <label class="f"><span>Seu nome completo <i>*</i></span><input class="in" name="full_name" required></label>
        <div class="grid g2"><label class="f"><span>Nº do CRO</span><input class="in" name="council_number" inputmode="numeric"></label><label class="f"><span>UF</span><input class="in" name="council_uf" maxlength="2" style="text-transform:uppercase"></label></div>
        <label class="f"><span>Nome do consultório <i>*</i></span><input class="in" name="clinic_name" required></label>
        <label class="f"><span>E-mail <i>*</i></span><input class="in" type="email" name="email" required autocomplete="email"></label>
        <label class="f"><span>Senha (mín. 6 caracteres) <i>*</i></span><input class="in" type="password" name="password" minlength="6" required autocomplete="new-password"></label>
        <button class="btn primary block" type="submit">Criar conta</button>
      </form>`}
    <div class="sep" style="height:1px;background:var(--line);margin:18px 0"></div>
    <button class="btn block" data-act="enterDemo">${icon('sparkle')} Explorar a demonstração</button>
    <p class="tiny muted" style="text-align:center;margin:10px 0 0">A demonstração usa pacientes fictícios e fica salva só neste navegador.</p>
    ${!remoteOk ? html`<p class="tiny" style="color:var(--bad)">Servidor não configurado: apenas o modo demonstração está disponível.</p>` : ''}
  </div></div>`);
}
act('authLogin', () => renderAuth('login'));
act('authSignup', () => renderAuth('signup'));
act('enterDemo', async () => { LS.set('pepmh_mode', 'demo'); Demo.load(); await boot(); });
onForm('login', async d => { await Auth.signIn(d.email, d.password); await boot(); });
onForm('signup', async d => {
  const ok = await Auth.signUp(d.email, d.password, { full_name: d.full_name, clinic_name: d.clinic_name, council_number: d.council_number, council_uf: (d.council_uf || '').toUpperCase() });
  if (ok) { await boot(); return; }
  renderAuth('login'); toast('Conta criada! Abra o e-mail de confirmação que enviamos e depois entre aqui.', 'ok');
});
act('forgot', async () => {
  const email = document.querySelector('[name=email]')?.value.trim();
  if (!email) return toast('Digite seu e-mail no campo acima primeiro.', 'bad');
  await Auth.recover(email); toast('Se o e-mail existir, enviamos um link para redefinir a senha.', 'ok');
});

async function boot() {
  const app = document.getElementById('app');
  // retorno do link de confirmação/recuperação do Supabase (#access_token=...)
  if (location.hash.includes('access_token=')) {
    const p = new URLSearchParams(location.hash.slice(1));
    Auth.store({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, user: null });
    LS.set('pepmh_mode', 'remote');
    try { const u = await Remote.req('/auth/v1/user'); const a = LS.get('pepmh_auth'); a.user = u; LS.set('pepmh_auth', a); } catch { }
    const isRecovery = p.get('type') === 'recovery';
    history.replaceState(null, '', location.pathname + (isRecovery ? '#/configuracoes?senha=1' : '#/'));
  }
  if (!isDemo() && !LS.get('pepmh_auth')) { renderAuth(); return; }
  app.innerHTML = '<div class="loading">Abrindo o PEPMH…</div>';
  try {
    if (!(await loadContext())) { LS.del('pepmh_auth'); LS.del('pepmh_mode'); renderAuth(); toast('Não encontramos um consultório vinculado a essa conta.', 'bad'); return; }
  } catch (e) { LS.del('pepmh_auth'); renderAuth(); toast(e.message, 'bad'); return; }
  await router();
}

/* ---------- dados fictícios para a demonstração ---------- */
function seedDemo() {
  const C = 'demo-clinic', U = 'demo-user', now = new Date(), T = ymd(now);
  const id = () => uid(), ts = (d, h, m = 0) => { const x = startOfDay(d); x.setHours(h, m); return x.toISOString(); };
  const D = { clinics: [{ id: C, name: 'Consultório Sorriso Claro', city: 'Campinas', state: 'SP', phone: '19999990000', address: 'Rua das Acácias, 120 – sala 4', email: 'contato@exemplo.com' }],
    clinic_members: [{ clinic_id: C, user_id: U, role: 'owner', full_name: 'Dra. Camila Rezende', council: 'CRO', council_uf: 'SP', council_number: '000000', specialty: 'Clínica geral', color: '#0b57b3' }] };
  const w = (t, rows) => (D[t] = rows.map(r => ({ id: id(), clinic_id: C, created_at: new Date().toISOString(), ...r })));
  w('insurances', [{ name: 'Particular', discount_pct: 0, active: true }, { name: 'OdontoPlus (fictício)', ans_code: '000001', discount_pct: 15, active: true }, { name: 'DentalVida (fictício)', ans_code: '000002', discount_pct: 20, active: true }]);
  const ins = D.insurances;
  w('procedures', [['Consulta / Avaliação', 'Clínica geral', 30, 5, 150], ['Profilaxia e raspagem supragengival', 'Periodontia', 45, 25, 220], ['Restauração em resina – 1 face', 'Dentística', 40, 35, 250], ['Restauração em resina – 2 faces', 'Dentística', 50, 45, 320], ['Exodontia simples', 'Cirurgia', 40, 30, 280], ['Tratamento endodôntico – unirradicular', 'Endodontia', 60, 60, 750], ['Tratamento endodôntico – multirradicular', 'Endodontia', 90, 90, 1200], ['Clareamento de consultório', 'Estética', 90, 180, 900], ['Coroa cerâmica', 'Prótese', 60, 450, 1800], ['Aplicação tópica de flúor', 'Prevenção', 15, 8, 80]]
    .map(([name, category, duration_min, material_cost, price]) => ({ name, category, duration_min, material_cost, hour_cost: 120, tax_pct: 6, margin_pct: 30, price, active: true })));
  const P = D.procedures;
  const people = [['Mariana Duarte Lopes', '1991-03-14', 'F', '11987650001', ['ortodontia']], ['Carlos Henrique Prado', '1978-11-02', 'M', '11987650002', []], ['Beatriz Nogueira Sá', '2001-07-21', 'F', '11987650003', ['estética']], ['Rafael Antunes Mota', '1985-05-09', 'M', '11987650004', []], ['Luíza Fontes Barreto', '1969-' + T.slice(5), 'F', '11987650005', ['prótese']], ['Tiago Ramalho Costa', '1996-01-30', 'M', '11987650006', []], ['Helena Castro Vidal', '2015-09-12', 'F', '11987650007', ['infantil']], ['Otávio Siqueira Lima', '1958-12-03', 'M', '11987650008', ['hipertenso']]];
  w('patients', people.map(([name, birth_date, sex, phone, tags], i) => ({ record_number: i + 1, name, birth_date, sex, phone, email: '', city: 'Campinas', state: 'SP', insurance_id: ins[i % 3].id, tags, active: true, origin: ['Indicação', 'Instagram', 'Google'][i % 3], alerts: i === 7 ? 'Hipertensão controlada – aferir PA antes de anestesia' : (i === 3 ? 'Alergia a penicilina' : null), guardian_name: i === 6 ? 'Paula Castro (mãe)' : null })));
  const pt = D.patients;
  const appts = []; const st = ['confirmado', 'agendado', 'atendido'];
  [[0, 8, 0], [0, 9, 0], [0, 10, 30], [0, 14, 0], [0, 15, 30], [1, 9, 0], [1, 11, 0], [2, 8, 30], [3, 16, 0], [-1, 9, 0], [-1, 10, 0], [-3, 14, 0]].forEach(([dd, h, m], i) => {
    const s = new Date(ts(addDays(now, dd), h, m)); const e = new Date(s.getTime() + 45 * 60000);
    appts.push({ patient_id: pt[i % pt.length].id, professional_id: U, starts_at: s.toISOString(), ends_at: e.toISOString(), status: dd < 0 ? (i === 10 ? 'faltou' : 'atendido') : (dd === 0 && h < 10 ? st[i % 2] : 'agendado'), kind: ['consulta', 'retorno', 'procedimento'][i % 3], title: null, notes: '' });
  });
  w('appointments', appts);
  w('anamneses', [{ patient_id: pt[7].id, created_by: U, data: { queixa: 'Sensibilidade ao frio no lado direito', hipertensao: true, diabetes: false, cardiopatia: false, alergias: 'Nenhuma conhecida', medicamentos: 'Losartana 50 mg', gestante: false, fumante: false, sangramento: false, anestesia_reacao: false, observacoes: '' } }]);
  w('evolutions', [{ patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', chief_complaint: 'Avaliação de rotina', content: 'Exame clínico sem alterações em tecidos moles. Biofilme visível em região de molares inferiores. Orientada técnica de escovação e uso de fio dental. Solicitada radiografia panorâmica.', created_at: ts(addDays(now, -20), 9) },
    { patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', chief_complaint: 'Restauração', content: 'Restauração em resina composta (A2) no 36, face oclusal, sob isolamento absoluto. Ajuste oclusal realizado. Paciente sem queixas.', created_at: ts(addDays(now, -6), 10) }]);
  w('odontogram', [{ patient_id: pt[0].id, tooth: 36, faces: ['O'], condition: 'Restauração', status: 'realizado' }, { patient_id: pt[0].id, tooth: 46, faces: ['O', 'D'], condition: 'Cárie', status: 'a_realizar' }, { patient_id: pt[0].id, tooth: 18, faces: [], condition: 'Ausente', status: 'existente' }, { patient_id: pt[0].id, tooth: 25, faces: [], condition: 'Canal', status: 'a_realizar' }]);
  const plan = { id: id(), clinic_id: C, patient_id: pt[0].id, title: 'Plano inicial', status: 'aprovado', discount: 50, payment_terms: '3x no cartão', created_at: ts(addDays(now, -20), 9) };
  D.treatment_plans = [plan];
  w('treatment_items', [{ plan_id: plan.id, procedure_id: P[2].id, description: P[2].name, tooth: 36, faces: ['O'], price: 250, status: 'realizado', done_at: ts(addDays(now, -6), 10) }, { plan_id: plan.id, procedure_id: P[3].id, description: P[3].name, tooth: 46, faces: ['O', 'D'], price: 320, status: 'pendente' }, { plan_id: plan.id, procedure_id: P[5].id, description: P[5].name, tooth: 25, faces: [], price: 750, status: 'pendente' }]);
  w('documents', [{ patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', doc_type: 'receituario', rx_type: 'simples', content: '<p><b>Uso oral</b></p><p>1. Dipirona sódica 500 mg ———— 12 comprimidos<br>Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias.</p>', no_date: false, created_at: ts(addDays(now, -6), 10, 30) }]);
  w('document_templates', [{ doc_type: 'receituario', title: 'Analgesia pós-exodontia', content: '<p><b>Uso oral</b></p><p>1. Dipirona sódica 500 mg ———— 12 comprimidos<br>Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias.</p>' }, { doc_type: 'receituario', title: 'Bochecho com clorexidina', content: '<p><b>Uso tópico</b></p><p>1. Digluconato de clorexidina 0,12% ———— 1 frasco<br>Bochechar 15 mL por 1 minuto, de 12 em 12 horas, por 7 dias. Não engolir.</p>' }, { doc_type: 'atestado', title: 'Atestado de comparecimento', content: '<p>Atesto, para os devidos fins, que o(a) paciente <b>{paciente}</b> esteve sob atendimento odontológico nesta data, no período das ____ às ____ horas.</p>' }]);
  const fin = []; for (let i = 0; i < 14; i++) { const d = ymd(addDays(now, -i * 2)); fin.push({ kind: 'receita', description: `Atendimento – ${pt[i % pt.length].name.split(' ')[0]}`, category: 'Procedimentos', amount: [150, 250, 320, 220, 750][i % 5], due_date: d, paid_at: i % 4 === 0 && i < 3 ? null : d, method: ['pix', 'cartao_credito', 'dinheiro'][i % 3], patient_id: pt[i % pt.length].id }); }
  fin.push({ kind: 'despesa', description: 'Aluguel da sala', category: 'Aluguel', amount: 2200, due_date: T.slice(0, 8) + '05', paid_at: T.slice(0, 8) + '05', method: 'boleto' }, { kind: 'despesa', description: 'Dental – resinas e anestésicos', category: 'Materiais', amount: 640, due_date: ymd(addDays(now, -3)), paid_at: ymd(addDays(now, -3)), method: 'pix' }, { kind: 'despesa', description: 'Laboratório de prótese', category: 'Laboratório', amount: 480, due_date: ymd(addDays(now, 5)), paid_at: null, method: 'boleto' }, { kind: 'despesa', description: 'Internet e telefone', category: 'Contas', amount: 160, due_date: ymd(addDays(now, 8)), paid_at: null, method: 'boleto' });
  w('finance_entries', fin);
  w('stock_items', [['Resina composta A2', 'Dentística', 'seringa', 6, 3, 89.9], ['Anestésico lidocaína 2% c/ epinefrina', 'Anestesia', 'tubete', 40, 50, 2.1], ['Luvas de procedimento M', 'EPI', 'caixa', 4, 2, 32], ['Sugador descartável', 'Descartáveis', 'pacote', 1, 2, 14.5], ['Ácido fosfórico 37%', 'Dentística', 'seringa', 5, 2, 12], ['Agulha gengival curta 30G', 'Anestesia', 'caixa', 2, 1, 48]].map(([name, category, unit, quantity, min_quantity, unit_cost]) => ({ name, category, unit, quantity, min_quantity, unit_cost, supplier: 'Dental Exemplo' })));
  w('stock_movements', []);
  w('crm_leads', [{ name: 'Fernanda Lacerda', phone: '11987650101', source: 'Instagram', stage: 'novo', interest: 'Clareamento', value: 900 }, { name: 'Jorge Matias', phone: '11987650102', source: 'Google', stage: 'avaliacao', interest: 'Implante', value: 3500 }, { name: 'Patrícia Moura', phone: '11987650103', source: 'Indicação', stage: 'orcamento', interest: 'Facetas em resina', value: 2400 }, { name: 'Diego Pires', phone: '11987650104', source: 'WhatsApp', stage: 'contato', interest: 'Canal', value: 750 }]);
  w('campaigns', []);
  w('return_alerts', [{ patient_id: pt[1].id, due_date: T, reason: 'Profilaxia semestral', done: false }, { patient_id: pt[0].id, due_date: ymd(addDays(now, 5)), reason: 'Controle pós-restauração', done: false }]);
  w('ideas', [{ author_name: 'Dra. Camila Rezende', text: 'Enviar lembrete automático de retorno 6 meses após a profilaxia', votes: 3, status: 'nova' }]);
  return D;
}
