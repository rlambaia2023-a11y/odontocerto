/* ===== Casca do app, login/cadastro, dados de demonstração ===== */
const NAV = [
  ['inicio', '#/', 'home', 'Início'], ['agenda', '#/agenda', 'cal', 'Agenda'], ['minha', '#/minha-agenda', 'calme', 'Minha agenda', 'clin'],
  ['online', '#/solicitacoes', 'globe', 'Agendamentos online'],
  ['pacientes', '#/pacientes', 'user', 'Pacientes'], ['emagrecimento', '#/emagrecimento', 'scale', 'Emagrecimento'], ['prescrever', '#/prescrever', 'pill', 'Prescrever', 'clin'],
  ['sep', 'Gestão'], ['financeiro', '#/financeiro', 'money', 'Financeiro'], ['precificador', '#/precificador', 'tag', 'Precificador'],
  ['convenios', '#/convenios', 'building', 'Convênios'], ['relatorios', '#/relatorios', 'chart', 'Relatórios'], ['estoque', '#/estoque', 'box', 'Estoque'],
  ['sep', 'Relacionamento'], ['marketing', '#/marketing', 'mega', 'Marketing'], ['crm', '#/crm', 'crm', 'CRM'], ['ideias', '#/ideias', 'bulb', 'Central de ideias'],
  ['sep', ''], ['config', '#/configuracoes', 'gear', 'Configurações'],
];
const PNAV = [
  ['inicio', '#/', 'home', 'Início'], ['agendar', '#/agendar', 'plus', 'Marcar consulta'], ['consultas', '#/consultas', 'cal', 'Minhas consultas'],
  ['documentos', '#/documentos', 'file', 'Receitas e documentos'], ['tratamentos', '#/tratamentos', 'clip', 'Tratamentos e pagamentos'], ['tratamento', '#/meu-tratamento', 'scale', 'Meu emagrecimento'],
  ['precons', '#/pre-consulta', 'edit', 'Ficha de saúde'], ['dados', '#/meus-dados', 'user', 'Meus dados'],
];
let NOTIF = { count: 0, items: [] };

function renderShell(active) {
  const app = document.getElementById('app'); const patient = S.mode === 'patient';
  if (!document.getElementById('view')) {
    app.innerHTML = fv(html`
    <header class="topbar">
      <button class="iconbtn only-m" data-act="toggleMenu" aria-label="Menu">${icon('menu')}</button>
      <a class="logo" href="#/">${patient && safeLogo(S.clinic.logo_url) ? html`<span style="background:#fff;border-radius:9px;padding:3px 8px;display:inline-flex"><img src="${S.clinic.logo_url}" alt="${S.clinic.name}" style="height:30px"></span>` : html`<span class="mark">PE</span>PEPMH`}${patient && !safeLogo(S.clinic.logo_url) ? html`<span class="small hide-m" style="font-weight:500;opacity:.85;letter-spacing:0"> · ${S.clinic.name}</span>` : ''}</a>
      <span class="sp"></span>
      ${!patient ? html`<button class="iconbtn" data-act="globalSearch" aria-label="Buscar paciente">${icon('search')}</button>
      <div class="rel"><button class="iconbtn" data-act="openNotif" aria-label="Notificações" id="bellbtn">${icon('bell')}</button></div>` : S.clinic.phone ? html`<a class="iconbtn" target="_blank" rel="noopener" href="${waLink(S.clinic.phone, 'Olá! Sou paciente e gostaria de falar com a clínica.')}" aria-label="Falar com a clínica">${icon('wa')}</a>` : ''}
      <div class="rel"><button class="iconbtn" data-act="popmenu" data-menu="usermenu" aria-label="Conta" style="width:auto;padding:0 8px;gap:6px;display:inline-flex"><span class="avatar" style="width:30px;height:30px;font-size:.75rem;background:#fff">${initials(S.me.full_name || 'U')}</span></button></div>
    </header>
    <template id="usermenu"><div style="padding:8px 10px 6px"><b>${S.me.full_name || 'Usuário'}</b><div class="tiny muted">${ROLE[S.me.role] || ''} · ${S.clinic.name}${isDemo() ? ' · demonstração' : ''}</div></div>
      ${!patient ? html`<a href="#/configuracoes">${icon('gear')} Configurações</a>` : html`<a href="#/meus-dados">${icon('user')} Meus dados</a>`}${isDemo() ? html`<button data-act="resetDemo">${icon('repeat')} Reiniciar demonstração</button>` : ''}<button data-act="logout">${icon('logout')} Sair</button></template>
    <div class="shell"><nav class="side" id="side"></nav><div class="scrim" data-act="toggleMenu"></div><main id="view"></main></div>`);
    if (!patient) updateNotif();
  }
  const items = patient ? PNAV : NAV.filter(n => (n[4] !== 'clin' || isClinical()) && (!ADM_NAV.includes(n[0]) || isAdmin())).filter((n, i, a) => !(n[0] === 'sep' && n[1] === 'Gestão' && !isAdmin()));
  document.getElementById('side').innerHTML = fv(items.map(n => n[0] === 'sep' ? html`<div class="sep"></div>${n[1] ? html`<div class="label">${n[1]}</div>` : ''}` : html`<a href="${n[1]}" class="${active === n[0] ? 'on' : ''}">${icon(n[2])}<span>${n[3]}</span>${n[0] === 'online' && NOTIF.pending ? html`<span class="pill accent" style="margin-left:auto">${NOTIF.pending}</span>` : ''}</a>`));
}
act('toggleMenu', () => document.body.classList.toggle('menu-open'));
act('logout', () => { LS.del('pepmh_demo_user'); Auth.signOut(); });
act('resetDemo', async () => { if (await confirmBox('Apagar tudo o que foi feito na demonstração e recomeçar com os dados de exemplo?', 'Reiniciar')) { LS.del('pepmh_demo_db_v2'); location.reload(); } });

async function updateNotif() {
  try {
    const today = ymd(new Date()); const t0 = startOfDay(new Date());
    const [rets, pats, stock, reqs, online] = await Promise.all([
      db.list('return_alerts', { eq: { done: false }, lte: { due_date: ymd(addDays(new Date(), 7)) }, order: 'due_date' }),
      db.list('patients', { eq: { active: true }, select: 'id,name,birth_date,phone' }),
      db.list('stock_items', { select: 'id,name,quantity,min_quantity' }),
      db.list('appointment_requests', { eq: { status: 'pendente' } }),
      db.list('appointments', { eq: { booked_by_patient: true }, gte: { ends_at: new Date().toISOString() } }),
    ]);
    const cks = isClinical() ? await db.list('weight_checkins', { is: { reviewed_at: 'null' }, order: 'created_at.desc', limit: 20 }).catch(() => []) : [];
    const md = today.slice(5);
    const bdays = pats.filter(p => p.birth_date && p.birth_date.slice(5, 10) === md);
    const low = stock.filter(s => +s.quantity <= +s.min_quantity);
    const pm = Object.fromEntries(pats.map(p => [p.id, p]));
    const toApprove = online.filter(a => a.approval === 'pendente' && a.status !== 'cancelado');
    NOTIF.pending = reqs.length + toApprove.length;
    NOTIF.items = [
      ...toApprove.map(a => ({ ic: 'check', t: `Aprovar consulta: ${pm[a.patient_id]?.name || ''}`, s: `${fDT(a.starts_at)} · ${a.modality === 'online' ? 'online' : 'presencial'}`, h: '#/solicitacoes' })),
      ...reqs.map(r => ({ ic: 'globe', t: `Pedido de consulta: ${pm[r.patient_id]?.name || 'paciente'}`, s: r.reason || 'Aguardando resposta', h: '#/solicitacoes' })),
      ...online.filter(a => a.status !== 'cancelado').map(a => ({ ic: a.modality === 'online' ? 'video' : 'cal', t: `Agendado pelo paciente: ${pm[a.patient_id]?.name || ''}`, s: `${fDT(a.starts_at)} · ${a.modality === 'online' ? 'online' : 'presencial'}`, h: '#/solicitacoes' })),
      ...cks.map(c => ({ ic: 'scale', t: `Acompanhamento semanal: ${pm[c.patient_id]?.name || 'paciente'}`, s: `${fDate(c.data)}${c.sintomas?.length ? ' · ' + c.sintomas.join(', ') : ''}`, h: `#/paciente/${c.patient_id}?tab=emagrecimento` })),
      ...rets.map(r => ({ ic: 'alarm', t: `Retorno: ${pm[r.patient_id]?.name || 'paciente'}`, s: `${r.due_date <= today ? 'Vencido/hoje' : 'Em ' + fDate(r.due_date)} · ${r.reason || ''}`, h: `#/paciente/${r.patient_id}?tab=retornos` })),
      ...bdays.map(p => ({ ic: 'cake', t: `Aniversário: ${p.name}`, s: 'Mande uma mensagem hoje', h: `#/marketing` })),
      ...low.map(s => ({ ic: 'box', t: `Estoque baixo: ${s.name}`, s: `Restam ${s.quantity}`, h: '#/estoque' })),
    ];
    const b = document.getElementById('bellbtn'); if (!b) return;
    b.querySelector('.dot')?.remove();
    if (NOTIF.items.length) b.insertAdjacentHTML('beforeend', `<span class="dot">${NOTIF.items.length > 9 ? '9+' : NOTIF.items.length}</span>`);
    const on = document.querySelector('.side a[href="#/solicitacoes"]'); if (on && NOTIF.pending && !on.querySelector('.pill')) on.insertAdjacentHTML('beforeend', `<span class="pill accent" style="margin-left:auto">${NOTIF.pending}</span>`);
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
const SU = { type: 'clinica', code: '' };
const SHOW_DEMO = () => /[?&]demo\b/.test(location.search) || ['localhost', '127.0.0.1'].includes(location.hostname) || !(CFG.url && CFG.key);
function renderAuth(mode = 'login') {
  const app = document.getElementById('app');
  const remoteOk = !!(CFG.url && CFG.key);
  const t = SU.type;
  app.innerHTML = fv(html`<div class="auth"><div class="card">
    <div class="brand"><span class="mark">PE</span><div><h1>PEPMH</h1><div class="small muted">Prontuário, agenda e teleconsulta para dentistas, médicos e pacientes</div></div></div>
    <div class="seg" style="margin:18px 0 16px;width:100%"><button class="${mode === 'login' ? 'on' : ''}" style="flex:1" data-act="authLogin">Entrar</button><button class="${mode === 'signup' ? 'on' : ''}" style="flex:1" data-act="authSignup">Criar conta</button></div>
    ${mode === 'login' ? html`
      <form data-form="login" class="stack">
        <label class="f"><span>E-mail</span><input class="in" type="email" name="email" required autocomplete="email"></label>
        <label class="f"><span>Senha</span><input class="in" type="password" name="password" required autocomplete="current-password"></label>
        <button class="btn primary block" type="submit">Entrar</button>
        <button class="btn ghost block small" type="button" data-act="forgot">Esqueci minha senha</button>
      </form>` : html`
      <label class="f"><span>Quero…</span><select class="in" data-change="suType">
        <option value="clinica" ${t === 'clinica' ? 'selected' : ''}>Abrir meu consultório (dentista ou médico)</option>
        <option value="equipe" ${t === 'equipe' ? 'selected' : ''}>Entrar na equipe de uma clínica (tenho convite)</option>
        <option value="paciente" ${t === 'paciente' ? 'selected' : ''}>Sou paciente</option></select></label>
      <form data-form="signup" class="stack" style="margin-top:12px"><input type="hidden" name="type" value="${t}">
        <label class="f"><span>Nome completo <i>*</i></span><input class="in" name="full_name" required autocomplete="name"></label>
        ${t === 'clinica' ? html`<label class="f"><span>Área</span><select class="in" name="profession"><option value="odontologia">Odontologia (CRO)</option><option value="medicina">Medicina (CRM)</option><option value="outra">Outra área da saúde</option></select></label>` : ''}
        ${t !== 'paciente' ? html`<div class="grid g2"><label class="f"><span>Nº do conselho</span><input class="in" name="council_number" inputmode="numeric"></label><label class="f"><span>UF</span><input class="in" name="council_uf" maxlength="2" style="text-transform:uppercase"></label></div>` : ''}
        ${t === 'clinica' ? html`<label class="f"><span>Nome do consultório/clínica <i>*</i></span><input class="in" name="clinic_name" required></label>` : ''}
        ${t === 'equipe' ? html`<label class="f"><span>Código do convite <i>*</i></span><input class="in" name="invite_code" required value="${SU.code}" style="text-transform:uppercase"></label>` : ''}
        ${t === 'paciente' ? html`<div class="tip">${icon('bulb')}<span>Para <b>marcar consulta</b> (presencial ou online), abra o link de agendamento que a sua clínica divulga. Se a clínica te mandou um <b>código de acesso</b>, informe abaixo.</span></div>
          <label class="f"><span>Código de acesso enviado pela clínica <i>*</i></span><input class="in" name="patient_code" required value="${SU.code}" style="text-transform:uppercase"></label>
          <label class="f"><span>Celular (WhatsApp)</span><input class="in" name="phone" inputmode="tel"></label>` : ''}
        <label class="f"><span>E-mail <i>*</i></span><input class="in" type="email" name="email" required autocomplete="email"></label>
        <label class="f"><span>Senha (mín. 6 caracteres) <i>*</i></span><input class="in" type="password" name="password" minlength="6" required autocomplete="new-password"></label>
        <button class="btn primary block" type="submit">Criar conta</button>
      </form>`}
    ${SHOW_DEMO() ? html`<div class="sep" style="height:1px;background:var(--line);margin:18px 0"></div>
    <div class="grid g2"><button class="btn" data-act="enterDemo" data-u="demo-user">${icon('sparkle')} Demo clínica</button><button class="btn" data-act="enterDemo" data-u="demo-patient">${icon('user')} Demo paciente</button></div>
    <a class="btn ghost block small" style="margin-top:6px" href="#/agendar/demonstracao" data-act="demoBookPage">${icon('globe')} Ver a página pública de agendamento (demo)</a>
    <p class="tiny muted" style="text-align:center;margin:10px 0 0">A demonstração usa pessoas fictícias e fica salva só neste navegador.</p>` : ''}
    ${!remoteOk ? html`<p class="tiny" style="color:var(--bad)">Servidor não configurado: apenas o modo demonstração está disponível.</p>` : ''}
  </div></div>`);
}
act('authLogin', () => renderAuth('login'));
act('authSignup', () => renderAuth('signup'));
onInput('suType', el => { SU.type = el.value; renderAuth('signup'); });
act('enterDemo', async el => { LS.set('pepmh_mode', 'demo'); LS.set('pepmh_demo_user', el.dataset.u); Demo.load(); location.hash = '#/'; await boot(); });
act('demoBookPage', () => { LS.set('pepmh_mode', 'demo'); LS.del('pepmh_demo_user'); Demo.load(); location.hash = '#/agendar/demonstracao'; });
onForm('login', async d => { await Auth.signIn(d.email, d.password); await boot(); });
onForm('signup', async d => {
  const meta = { full_name: d.full_name };
  if (d.type === 'clinica') Object.assign(meta, { profession: d.profession, clinic_name: d.clinic_name, council_number: d.council_number, council_uf: (d.council_uf || '').toUpperCase() });
  if (d.type === 'equipe') Object.assign(meta, { invite_code: d.invite_code.toUpperCase(), council_number: d.council_number, council_uf: (d.council_uf || '').toUpperCase() });
  if (d.type === 'paciente') Object.assign(meta, { patient_code: d.patient_code.toUpperCase(), phone: d.phone });
  const ok = await Auth.signUp(d.email, d.password, meta);
  if (ok) { await boot(); return; }
  renderAuth('login'); toast('Conta criada! Abra o e-mail de confirmação que enviamos e depois entre aqui.', 'ok');
});
act('forgot', async () => {
  const email = document.querySelector('[name=email]')?.value.trim();
  if (!email) return toast('Digite seu e-mail no campo acima primeiro.', 'bad');
  await Auth.recover(email); toast('Se o e-mail existir, enviamos um link para redefinir a senha.', 'ok');
});

/* links de convite (equipe) e de acesso (paciente) */
pubRoute('/convite/:code', async ({ code }) => {
  if (LS.get('pepmh_auth') && !isDemo()) return orphanScreen(html`Você recebeu um convite para entrar numa equipe.`, code.toUpperCase(), 'equipe');
  SU.type = 'equipe'; SU.code = code.toUpperCase(); history.replaceState(null, '', location.pathname + '#/'); renderAuth('signup');
});
pubRoute('/acesso/:code', async ({ code }) => {
  if (LS.get('pepmh_auth') && !isDemo()) return orphanScreen(html`A clínica liberou seu acesso de paciente.`, code.toUpperCase(), 'paciente');
  SU.type = 'paciente'; SU.code = code.toUpperCase(); history.replaceState(null, '', location.pathname + '#/'); renderAuth('signup');
});
function orphanScreen(msg = '', code = '', kind = 'equipe') {
  return html`<div class="auth"><div class="card stack"><div class="brand"><span class="mark">PE</span><h1>PEPMH</h1></div>
    <p style="margin:0">${msg || 'Sua conta ainda não está ligada a nenhuma clínica.'} Informe o código que você recebeu:</p>
    <form data-form="useCode" class="stack"><select class="in" name="kind"><option value="equipe" ${kind === 'equipe' ? 'selected' : ''}>Convite para a equipe</option><option value="paciente" ${kind === 'paciente' ? 'selected' : ''}>Código de acesso de paciente</option></select>
    <input class="in" name="code" required value="${code}" placeholder="Ex.: 7F3A9C21" style="text-transform:uppercase"><button class="btn primary" type="submit">Continuar</button></form>
    <button class="btn ghost" data-act="logout">Sair</button></div></div>`;
}
onForm('useCode', async d => { await db.rpc(d.kind === 'equipe' ? 'accept_invite' : 'link_patient_account', { p_code: d.code.toUpperCase() }); toast('Pronto! Acesso liberado.', 'ok'); location.hash = '#/'; S.clinic = null; await boot(); });

async function boot() {
  const app = document.getElementById('app');
  // retorno do link de confirmação/recuperação do Supabase (#access_token=...)
  if (location.hash.includes('access_token=')) {
    const p = new URLSearchParams(location.hash.slice(1));
    Auth.store({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, user: null });
    LS.set('pepmh_mode', 'remote');
    try { const u = await Remote.req('/auth/v1/user'); const a = LS.get('pepmh_auth'); a.user = u; LS.set('pepmh_auth', a); } catch { }
    const isRecovery = p.get('type') === 'recovery'; const back = new URLSearchParams(location.search).get('agendar');
    history.replaceState(null, '', location.pathname + (isRecovery ? '#/nova-senha' : back ? '#/agendar/' + back : '#/'));
    if (isRecovery) { await router(); return; }
  }
  const loggedIn = isDemo() ? !!LS.get('pepmh_demo_user') : !!LS.get('pepmh_auth');
  const h = (location.hash.slice(1) || '/').split('?')[0];
  if (!loggedIn) { S.clinic = null; await router(); return; }
  if (PUB.some(r => r.re.test(h)) && !h.startsWith('/agendar/')) { await router(); return; }
  app.innerHTML = '<div class="loading">Abrindo o PEPMH…</div>';
  try {
    const ctx = await loadContext();
    if (ctx === 'orphan') { app.innerHTML = fv(orphanScreen()); return; }
    if (!ctx) { LS.del('pepmh_auth'); LS.del('pepmh_mode'); S.clinic = null; renderAuth(); return; }
  } catch (e) { LS.del('pepmh_auth'); S.clinic = null; renderAuth(); toast(e.message, 'bad'); return; }
  if (S.mode === 'patient') { const pend = LS.get('pepmh_pending_book'); if (pend) { LS.del('pepmh_pending_book'); if (!location.hash.startsWith('#/agendar')) location.hash = '#/agendar'; } }
  document.getElementById('view') || (app.innerHTML = '');
  await router();
}

/* ---------- dados fictícios para a demonstração ---------- */
function seedDemo() {
  const C = 'demo-clinic', U = 'demo-user', M = 'demo-medico', now = new Date(), T = ymd(now);
  const id = () => uid(), ts = (d, h, m = 0) => { const x = startOfDay(d); x.setHours(h, m); return x.toISOString(); };
  const D = { clinics: [{ id: C, name: 'Clínica Integrada Bem-Estar', slug: 'demonstracao', public_booking: true, min_lead_hours: 2, booking_note: 'Consultas presenciais na Rua das Acácias, 120 ou online pelo Google Meet.', city: 'Campinas', state: 'SP', phone: '19999990000', address: 'Rua das Acácias, 120 – sala 4', email: 'contato@exemplo.com' }],
    clinic_members: [
      { clinic_id: C, user_id: U, role: 'owner', profession: 'odontologia', full_name: 'Dra. Camila Rezende', council: 'CRO', council_uf: 'SP', council_number: '000000', specialty: 'Clínica geral e estética', bio: 'Cirurgiã-dentista com foco em prevenção e estética.', meet_url: 'https://meet.google.com/new', accepts_online: true, accepts_presencial: true, slot_min: 30, online_price: 120 },
      { clinic_id: C, user_id: M, role: 'dentista', profession: 'medicina', full_name: 'Dr. Paulo Menezes', council: 'CRM', council_uf: 'SP', council_number: '000000', specialty: 'Clínica médica', bio: 'Clínico geral. Atende adultos e idosos.', meet_url: 'https://meet.google.com/new', accepts_online: true, accepts_presencial: true, slot_min: 30, online_price: 200 },
      { clinic_id: C, user_id: 'demo-sec', role: 'secretaria', profession: 'outra', full_name: 'Júlia Prates', accepts_online: false, accepts_presencial: false, slot_min: 30 }] };
  const w = (t, rows) => (D[t] = rows.map(r => ({ id: id(), clinic_id: C, created_at: new Date().toISOString(), ...r })));
  w('insurances', [{ name: 'Particular', discount_pct: 0, active: true }, { name: 'OdontoPlus (fictício)', ans_code: '000001', discount_pct: 15, active: true }, { name: 'SaúdeVida (fictício)', ans_code: '000002', discount_pct: 20, active: true }]);
  const ins = D.insurances;
  w('procedures', [['Consulta / Avaliação', 'Clínica geral', 30, 5, 150], ['Teleconsulta odontológica', 'Clínica geral', 30, 0, 120], ['Profilaxia e raspagem supragengival', 'Periodontia', 45, 25, 220], ['Restauração em resina – 1 face', 'Dentística', 40, 35, 250], ['Restauração em resina – 2 faces', 'Dentística', 50, 45, 320], ['Exodontia simples', 'Cirurgia', 40, 30, 280], ['Tratamento endodôntico – unirradicular', 'Endodontia', 60, 60, 750], ['Clareamento de consultório', 'Estética', 90, 180, 900], ['Coroa cerâmica', 'Prótese', 60, 450, 1800], ['Consulta médica', 'Clínica médica', 30, 0, 250], ['Teleconsulta médica', 'Clínica médica', 30, 0, 200], ['Eletrocardiograma', 'Exames', 20, 15, 120]]
    .map(([name, category, duration_min, material_cost, price]) => ({ name, category, duration_min, material_cost, hour_cost: 120, tax_pct: 6, margin_pct: 30, price, active: true })));
  const P = D.procedures;
  const people = [['Mariana Duarte Lopes', '1991-03-14', 'F', '11987650001', ['ortodontia']], ['Carlos Henrique Prado', '1978-11-02', 'M', '11987650002', []], ['Beatriz Nogueira Sá', '2001-07-21', 'F', '11987650003', ['estética']], ['Rafael Antunes Mota', '1985-05-09', 'M', '11987650004', []], ['Luíza Fontes Barreto', '1969-' + T.slice(5), 'F', '11987650005', ['prótese']], ['Tiago Ramalho Costa', '1996-01-30', 'M', '11987650006', []], ['Helena Castro Vidal', '2015-09-12', 'F', '11987650007', ['infantil']], ['Otávio Siqueira Lima', '1958-12-03', 'M', '11987650008', ['hipertenso']]];
  w('patients', people.map(([name, birth_date, sex, phone, tags], i) => ({ record_number: i + 1, name, birth_date, sex, phone, email: i === 0 ? 'mariana@exemplo.com' : '', city: 'Campinas', state: 'SP', insurance_id: ins[i % 3].id, tags, active: true, origin: ['Indicação', 'Instagram', 'Google'][i % 3], alerts: i === 7 ? 'Hipertensão controlada – aferir PA antes de anestesia' : (i === 3 ? 'Alergia a penicilina' : null), guardian_name: i === 6 ? 'Paula Castro (mãe)' : null, user_id: i === 0 ? 'demo-patient' : null })));
  const pt = D.patients;
  const appts = []; const st = ['confirmado', 'agendado', 'atendido'];
  [[0, 8, 0, U], [0, 9, 0, M], [0, 10, 30, U], [0, 14, 0, M], [0, 15, 30, U], [1, 9, 0, U], [1, 11, 0, M], [2, 8, 30, U], [3, 16, 0, M], [-1, 9, 0, U], [-1, 10, 0, U], [-3, 14, 0, M]].forEach(([dd, h, m, pro], i) => {
    const s = new Date(ts(addDays(now, dd), h, m)); const e = new Date(s.getTime() + 30 * 60000); const online = i % 4 === 1;
    appts.push({ patient_id: pt[i % pt.length].id, professional_id: pro, starts_at: s.toISOString(), ends_at: e.toISOString(), status: dd < 0 ? (i === 10 ? 'faltou' : 'atendido') : (dd === 0 && h < 10 ? st[i % 2] : 'agendado'), kind: online ? 'teleconsulta' : ['consulta', 'retorno', 'procedimento'][i % 3], modality: online ? 'online' : 'presencial', meeting_url: online ? 'https://meet.google.com/new' : null, tele_consent_at: online ? s.toISOString() : null, booked_by_patient: online, title: null, notes: '' });
  });
  appts.push({ patient_id: pt[0].id, professional_id: M, starts_at: ts(addDays(now, 2), 10), ends_at: ts(addDays(now, 2), 10, 30), status: 'agendado', kind: 'teleconsulta', modality: 'online', meeting_url: 'https://meet.google.com/new', tele_consent_at: new Date().toISOString(), booked_by_patient: true, reason: 'Check-up e renovação de receita' });
  w('appointments', appts);
  w('availability', [U, M].flatMap(pro => [1, 2, 3, 4, 5].flatMap(wd => [{ professional_id: pro, weekday: wd, start_time: '08:00', end_time: '12:00', modality: 'ambos' }, { professional_id: pro, weekday: wd, start_time: '14:00', end_time: '18:00', modality: pro === M ? 'online' : 'presencial' }])).concat([{ professional_id: U, weekday: 6, start_time: '08:00', end_time: '12:00', modality: 'online' }]));
  w('appointment_requests', [{ patient_id: pt[2].id, preferred_date: ymd(addDays(now, 3)), period: 'tarde', reason: 'Sensibilidade nos dentes ao tomar gelado', status: 'pendente' }]);
  w('anamneses', [{ patient_id: pt[7].id, created_by: U, data: { queixa: 'Sensibilidade ao frio no lado direito', hipertensao: true, diabetes: false, cardiopatia: false, alergias: 'Nenhuma conhecida', medicamentos: 'Losartana 50 mg', gestante: false, fumante: false, sangramento: false, anestesia_reacao: false, observacoes: '' } }]);
  w('vitals', [{ patient_id: pt[7].id, measured_at: ts(addDays(now, -3), 14), pa_sis: 138, pa_dia: 86, fc: 74, spo2: 97, temp: 36.4, peso: 82, altura: 1.74, created_by: M }]);
  w('evolutions', [{ patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', chief_complaint: 'Avaliação de rotina', content: 'Exame clínico sem alterações em tecidos moles. Biofilme visível em região de molares inferiores. Orientada técnica de escovação e uso de fio dental. Solicitada radiografia panorâmica.', created_at: ts(addDays(now, -20), 9) },
    { patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', chief_complaint: 'Restauração', content: 'Restauração em resina composta (A2) no 36, face oclusal, sob isolamento absoluto. Ajuste oclusal realizado. Paciente sem queixas.', created_at: ts(addDays(now, -6), 10) }]);
  w('odontogram', [{ patient_id: pt[0].id, tooth: 36, faces: ['O'], condition: 'Restauração', status: 'realizado' }, { patient_id: pt[0].id, tooth: 46, faces: ['O', 'D'], condition: 'Cárie', status: 'a_realizar' }, { patient_id: pt[0].id, tooth: 18, faces: [], condition: 'Ausente', status: 'existente' }, { patient_id: pt[0].id, tooth: 25, faces: [], condition: 'Canal (endodontia)', status: 'a_realizar' }]);
  const plan = { id: id(), clinic_id: C, patient_id: pt[0].id, title: 'Plano inicial', status: 'aprovado', discount: 50, payment_terms: '3x no cartão', created_at: ts(addDays(now, -20), 9) };
  D.treatment_plans = [plan];
  w('treatment_items', [{ plan_id: plan.id, procedure_id: P[3].id, description: P[3].name, tooth: 36, faces: ['O'], price: 250, status: 'realizado', done_at: ts(addDays(now, -6), 10) }, { plan_id: plan.id, procedure_id: P[4].id, description: P[4].name, tooth: 46, faces: ['O', 'D'], price: 320, status: 'pendente' }, { plan_id: plan.id, procedure_id: P[6].id, description: P[6].name, tooth: 25, faces: [], price: 750, status: 'pendente' }]);
  w('documents', [{ patient_id: pt[0].id, professional_id: U, professional_name: 'Dra. Camila Rezende', doc_type: 'receituario', rx_type: 'simples', content: '<p><b>Uso oral</b></p><p>1. Dipirona sódica 500 mg ———— 12 comprimidos<br>Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias.</p>', no_date: false, created_at: ts(addDays(now, -6), 10, 30) }]);
  w('document_templates', [{ doc_type: 'receituario', title: 'Analgesia pós-exodontia', content: '<p><b>Uso oral</b></p><p>1. Dipirona sódica 500 mg ———— 12 comprimidos<br>Tomar 1 comprimido de 6 em 6 horas, em caso de dor, por até 3 dias.</p>' }, { doc_type: 'receituario', title: 'Bochecho com clorexidina', content: '<p><b>Uso tópico</b></p><p>1. Digluconato de clorexidina 0,12% ———— 1 frasco<br>Bochechar 15 mL por 1 minuto, de 12 em 12 horas, por 7 dias. Não engolir.</p>' }, { doc_type: 'atestado', title: 'Atestado de comparecimento', content: '<p>Atesto, para os devidos fins, que o(a) paciente <b>{paciente}</b> esteve sob atendimento nesta data, no período das ____ às ____ horas.</p>' }, { doc_type: 'exames', title: 'Exames laboratoriais de rotina', content: '<p>Solicito:</p><ul><li>Hemograma completo</li><li>Glicemia de jejum</li><li>Colesterol total e frações</li><li>Creatinina</li></ul>' }]);
  const fin = []; for (let i = 0; i < 14; i++) { const d = ymd(addDays(now, -i * 2)); fin.push({ kind: 'receita', description: `Atendimento – ${pt[i % pt.length].name.split(' ')[0]}`, category: 'Procedimentos', amount: [150, 250, 320, 220, 750][i % 5], due_date: d, paid_at: i % 4 === 0 && i < 3 ? null : d, method: ['pix', 'cartao_credito', 'dinheiro'][i % 3], patient_id: pt[i % pt.length].id }); }
  fin.push({ kind: 'receita', description: 'Plano de tratamento – parcela 2/3', category: 'Procedimentos', amount: 340, due_date: ymd(addDays(now, 20)), paid_at: null, method: 'cartao_credito', patient_id: pt[0].id, plan_id: plan.id });
  fin.push({ kind: 'despesa', description: 'Aluguel da sala', category: 'Aluguel', amount: 2200, due_date: T.slice(0, 8) + '05', paid_at: T.slice(0, 8) + '05', method: 'boleto' }, { kind: 'despesa', description: 'Dental – resinas e anestésicos', category: 'Materiais', amount: 640, due_date: ymd(addDays(now, -3)), paid_at: ymd(addDays(now, -3)), method: 'pix' }, { kind: 'despesa', description: 'Laboratório de prótese', category: 'Laboratório', amount: 480, due_date: ymd(addDays(now, 5)), paid_at: null, method: 'boleto' }, { kind: 'despesa', description: 'Internet e telefone', category: 'Contas', amount: 160, due_date: ymd(addDays(now, 8)), paid_at: null, method: 'boleto' });
  w('finance_entries', fin);
  w('stock_items', [['Resina composta A2', 'Dentística', 'seringa', 6, 3, 89.9], ['Anestésico lidocaína 2% c/ epinefrina', 'Anestesia', 'tubete', 40, 50, 2.1], ['Luvas de procedimento M', 'EPI', 'caixa', 4, 2, 32], ['Sugador descartável', 'Descartáveis', 'pacote', 1, 2, 14.5], ['Ácido fosfórico 37%', 'Dentística', 'seringa', 5, 2, 12], ['Agulha gengival curta 30G', 'Anestesia', 'caixa', 2, 1, 48]].map(([name, category, unit, quantity, min_quantity, unit_cost]) => ({ name, category, unit, quantity, min_quantity, unit_cost, supplier: 'Dental Exemplo' })));
  w('stock_movements', []);
  w('crm_leads', [{ name: 'Fernanda Lacerda', phone: '11987650101', source: 'Instagram', stage: 'novo', interest: 'Clareamento', value: 900 }, { name: 'Jorge Matias', phone: '11987650102', source: 'Google', stage: 'avaliacao', interest: 'Implante', value: 3500 }, { name: 'Patrícia Moura', phone: '11987650103', source: 'Indicação', stage: 'orcamento', interest: 'Facetas em resina', value: 2400 }, { name: 'Diego Pires', phone: '11987650104', source: 'WhatsApp', stage: 'contato', interest: 'Canal', value: 750 }]);
  w('campaigns', []); w('clinic_invites', []);
  w('return_alerts', [{ patient_id: pt[1].id, due_date: T, reason: 'Profilaxia semestral', done: false }, { patient_id: pt[0].id, due_date: ymd(addDays(now, 5)), reason: 'Controle pós-restauração', done: false }]);
  w('ideas', [{ author_name: 'Dra. Camila Rezende', text: 'Enviar lembrete automático de retorno 6 meses após a profilaxia', votes: 3, status: 'nova' }]);
  return D;
}
