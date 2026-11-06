/* ===== Agendamento público, teleconsulta, portal do paciente, equipe ===== */
const WDS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MOD = { online: 'Online (vídeo)', presencial: 'Presencial' };
const PERIOD = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', qualquer: 'Qualquer horário' };
const gcalLink = (title, start, end, details, location) => { const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(start)}/${f(end)}&details=${encodeURIComponent(details || '')}&location=${encodeURIComponent(location || '')}`; };
const randCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const TCLE = prof => `Termo de consentimento para teleconsulta. Declaro que fui informado(a) e concordo que: (1) a consulta será feita por vídeo e não substitui todas as etapas do atendimento presencial, pois não permite exame físico completo; (2) o(a) profissional pode indicar atendimento presencial a qualquer momento, e eu também posso optar por ele; (3) o atendimento será registrado em prontuário, com sigilo profissional e proteção dos meus dados conforme a LGPD; (4) receitas, atestados e pedidos de exame poderão ser emitidos quando o(a) profissional julgar adequado; (5) devo estar em local reservado e com conexão estável; a gravação da consulta não é obrigatória e só ocorrerá com meu consentimento. Referência: ${prof === 'medicina' ? 'Resolução CFM nº 2.314/2022' : prof === 'odontologia' ? 'Resolução CFO-SEC-278/2025' : 'normas do conselho profissional'}.`;

/* ---------- RPCs da demonstração (espelham as funções do banco) ---------- */
const DemoRPC = {
  clinic_professionals() { const d = Demo.load(); const cid = (d.patients.find(p => p.user_id === Auth.userId()) || {}).clinic_id || 'demo-clinic'; return d.clinic_members.filter(m => m.clinic_id === cid && ['owner', 'dentista'].includes(m.role)).map(({ cpf, ...m }) => m); },
  public_clinic({ p_slug }) {
    const d = Demo.load(); const c = d.clinics.find(x => x.slug === p_slug && x.public_booking); if (!c) return null;
    return { ...c, note: c.booking_note, professionals: d.clinic_members.filter(m => m.clinic_id === c.id && ['owner', 'dentista'].includes(m.role) && d.availability.some(a => a.professional_id === m.user_id)).map(m => ({ ...m, online: m.accepts_online && !!m.meet_url, presencial: m.accepts_presencial })) };
  },
  public_slots({ p_slug, p_professional, p_from, p_days = 14 }) {
    const d = Demo.load(); const c = d.clinics.find(x => x.slug === p_slug && x.public_booking); if (!c) return [];
    const m = d.clinic_members.find(x => x.clinic_id === c.id && x.user_id === p_professional); if (!m) return [];
    const step = m.slot_min * 60000, lead = Date.now() + (c.min_lead_hours || 0) * 3600000, out = [];
    const busy = d.appointments.filter(a => a.professional_id === m.user_id && !['cancelado', 'faltou'].includes(a.status)).map(a => [+new Date(a.starts_at), +new Date(a.ends_at)]);
    for (let i = 0; i < Math.min(p_days, 31); i++) {
      const day = addDays(parseYmd(p_from), i);
      d.availability.filter(a => a.professional_id === m.user_id && +a.weekday === day.getDay()).sort((a, b) => a.start_time < b.start_time ? -1 : 1).forEach(a => {
        const [sh, sm] = a.start_time.split(':').map(Number), [eh, em] = a.end_time.split(':').map(Number);
        let t = new Date(day); t.setHours(sh, sm, 0, 0); const end = new Date(day); end.setHours(eh, em, 0, 0);
        while (+t + step <= +end) {
          const s = +t, e = s + step;
          if (s >= lead && !busy.some(([bs, be]) => bs < e && be > s)) {
            if (['ambos', 'online'].includes(a.modality) && m.accepts_online && (m.meet_url || c.booking_requires_approval)) out.push({ starts_at: new Date(s).toISOString(), modality: 'online' });
            if (['ambos', 'presencial'].includes(a.modality) && m.accepts_presencial) out.push({ starts_at: new Date(s).toISOString(), modality: 'presencial' });
          }
          t = new Date(e);
        }
      });
    }
    return out;
  },
  async book_appointment({ p_slug, p_professional, p_start, p_modality, p_reason, p_consent }) {
    const me = Auth.userId(); if (!me) throw new Error('Entre na sua conta para agendar.');
    if (p_modality === 'online' && !p_consent) throw new Error('Para a consulta online é preciso aceitar o termo de consentimento.');
    const d = Demo.load(); const c = d.clinics.find(x => x.slug === p_slug); const m = d.clinic_members.find(x => x.user_id === p_professional);
    if (d.clinic_members.some(x => x.user_id === me)) throw new Error('Profissionais da clínica agendam pela agenda interna.');
    if (!DemoRPC.public_slots({ p_slug, p_professional, p_from: ymd(p_start), p_days: 1 }).some(s => s.starts_at === p_start && s.modality === p_modality)) throw new Error('Esse horário acabou de ser ocupado ou não está disponível. Escolha outro.');
    let p = d.patients.find(x => x.user_id === me);
    if (!p) { const meta = LS.get('pepmh_demo_signup', {}); [p] = [await Demo.insert('patients', { clinic_id: c.id, user_id: me, name: meta.full_name || 'Paciente', phone: onlyDigits(meta.phone), email: meta.email, birth_date: meta.birth_date || null, origin: 'Agendamento online' })]; }
    const pend = !!c.booking_requires_approval;
    const a = await Demo.insert('appointments', { approval: pend ? 'pendente' : null, clinic_id: c.id, patient_id: p.id, professional_id: m.user_id, starts_at: p_start, ends_at: new Date(+new Date(p_start) + m.slot_min * 60000).toISOString(), status: 'agendado', kind: p_modality === 'online' ? 'teleconsulta' : 'consulta', modality: p_modality, meeting_url: p_modality === 'online' && !pend ? m.meet_url : null, tele_consent_at: p_modality === 'online' ? new Date().toISOString() : null, booked_by_patient: true, reason: p_reason || null });
    return { appointment_id: a.id, patient_id: p.id, meeting_url: a.meeting_url, pending: pend };
  },
  async accept_tele_consent({ p_id }) { const t = new Date().toISOString(); await Demo.updateWhere('appointments', { id: p_id }, { tele_consent_at: t }); return t; },
  async cancel_my_appointment({ p_id }) { const a = await db.get('appointments', p_id); if (!a || +new Date(a.starts_at) < Date.now() + 2 * 3600000) throw new Error('Não foi possível cancelar (faltam menos de 2 horas). Fale com a clínica.'); await Demo.updateWhere('appointments', { id: p_id }, { status: 'cancelado' }); },
  verify_document({ p_code }) {
    const d = Demo.load(); const doc = d.documents.find(x => x.verify_code === String(p_code).toUpperCase()); if (!doc) return null;
    const m = d.clinic_members.find(x => x.user_id === doc.professional_id) || {}; const p = d.patients.find(x => x.id === doc.patient_id) || {};
    return { tipo: doc.doc_type, emitido_em: doc.created_at, profissional: doc.professional_name, conselho: councilOf(m), clinica: d.clinics[0].name, paciente_iniciais: initials(p.name), hash: doc.content_hash, assinado_icp: !!doc.signed_file_path, assinado_em: doc.signed_at, hash_pdf_assinado: doc.signed_sha256 || null };
  },
  accept_invite() { throw new Error('Convites funcionam só na versão real (fora da demonstração).'); },
  link_patient_account() { throw new Error('Códigos de acesso funcionam só na versão real (fora da demonstração).'); },
};

/* ---------- ficha de cadastro preenchida pelo próprio paciente ---------- */
// Mesmos dados da ficha "Novo paciente" da equipe, menos o que é só da clínica (etiquetas, observações, convênio cadastrado).
const cpfValid = v => {
  const d = onlyDigits(v); if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +d[9] && dv(10) === +d[10];
};
function patientSignupFields() {
  return html`<div class="grid g2 collapse">
    <label class="f" style="grid-column:1/-1"><span>Nome completo <i>*</i></span><input class="in" name="full_name" required autocomplete="name"></label>
    <label class="f"><span>Data de nascimento <i>*</i></span><input class="in" type="date" name="birth_date" required max="${ymd(new Date())}"></label>
    <label class="f"><span>Sexo <i>*</i></span><select class="in" name="sex" required><option value="">Escolha</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option></select></label>
    <label class="f"><span>CPF <i>*</i></span><input class="in" name="cpf" required inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label>
    <label class="f"><span>RG</span><input class="in" name="rg"></label>
    <label class="f"><span>Celular (WhatsApp) <i>*</i></span><input class="in" name="phone" required inputmode="tel" autocomplete="tel" placeholder="(75) 99999-9999"></label>
    <label class="f"><span>Profissão</span><input class="in" name="occupation"></label>
    <label class="f"><span>CEP <i>*</i></span><input class="in" name="zip" required inputmode="numeric" maxlength="9" placeholder="00000-000" autocomplete="postal-code"></label>
    <div class="grid g2" style="gap:8px"><label class="f"><span>Cidade <i>*</i></span><input class="in" name="city" required></label><label class="f"><span>UF <i>*</i></span><input class="in" name="state" required maxlength="2" style="text-transform:uppercase"></label></div>
    <label class="f" style="grid-column:1/-1"><span>Endereço (rua, número, bairro) <i>*</i></span><input class="in" name="address" required autocomplete="street-address"></label>
    <label class="f" style="grid-column:1/-1"><span>Alergias ou problemas de saúde que a clínica deve saber</span><input class="in" name="alerts" placeholder="Ex.: alergia a dipirona, hipertensão"></label>
    <label class="f"><span>E-mail <i>*</i></span><input class="in" type="email" name="email" required autocomplete="email"></label>
    <label class="f"><span>Crie uma senha (mín. 6) <i>*</i></span><input class="in" type="password" name="password" minlength="6" required autocomplete="new-password"></label>
  </div>
  <label class="check small"><input type="checkbox" name="lgpd" required> Autorizo o uso dos meus dados pela clínica para cadastro, agendamento e atendimento, conforme a LGPD.</label>`;
}
function patientSignupMeta(d, slug, via) {
  if (!cpfValid(d.cpf)) throw new Error('Confira o CPF: os números não batem.');
  if (onlyDigits(d.phone).length < 10) throw new Error('Informe o celular com DDD.');
  if (onlyDigits(d.zip).length !== 8) throw new Error('O CEP precisa ter 8 números.');
  const t = v => (v || '').trim() || null;
  return { full_name: t(d.full_name), birth_date: d.birth_date || null, sex: d.sex || null, cpf: onlyDigits(d.cpf), rg: t(d.rg), phone: onlyDigits(d.phone), occupation: t(d.occupation),
    zip: onlyDigits(d.zip), city: t(d.city), state: (d.state || '').trim().toUpperCase() || null, address: t(d.address), insurance: t(d.insurance), origin: t(d.origin),
    guardian_name: t(d.guardian_name), alerts: t(d.alerts), book_slug: slug, signup_via: via };
}
const checkEmailCard = email => html`<div class="card"><h2>Falta só confirmar seu e-mail</h2><p>Enviamos um link para <b>${email}</b>. Abra o e-mail e toque no link para ativar sua conta. Seu cadastro já chegou à clínica.</p><p class="small muted">Não chegou? Veja a caixa de spam ou promoções.</p></div>`;

/* página de cadastro que a clínica manda para o paciente: /#/cadastro/<endereco-da-clinica> */
pubRoute('/cadastro/:slug', async ({ slug }) => {
  const c = await db.rpc('public_clinic', { p_slug: slug });
  if (!c) return html`<div class="auth"><div class="card"><h2>Cadastro indisponível</h2><p class="muted">Esta clínica não está recebendo cadastros online agora. Fale diretamente com ela.</p><a class="btn" href="#/">Voltar</a></div></div>`;
  applyTheme(c); BK.slug = slug; BK.clinic = c;
  if (S.mode === 'patient') return html`<div class="auth"><div class="card stack"><h2>Você já tem cadastro</h2><p class="muted" style="margin:0">Esta conta já é de paciente. Seus dados ficam em "Meus dados".</p><a class="btn primary" href="#/">Ir para minha área</a></div></div>`;
  return html`<div style="min-height:100vh;background:var(--bg)">
    <header class="topbar ${safeLogo(c.logo_url) ? 'light' : ''}"><span class="logo">${safeLogo(c.logo_url) ? brandLogo(c) : html`<span class="mark" role="img" aria-label="PEPMH"></span>${c.name}`}</span><span class="sp"></span><a class="btn sm ${safeLogo(c.logo_url) ? 'primary' : ''}" style="${safeLogo(c.logo_url) ? '' : 'background:#fff'}" href="#/" data-act="bkLoginLink">Já tenho conta</a></header>
    <main style="max-width:760px;margin:0 auto;padding:18px 16px 60px"><div id="cad">
      <div class="card"><h1>Cadastro de paciente</h1><p class="muted" style="margin:6px 0 0">${c.name}${c.city ? ' · ' + c.city + (c.state ? '/' + c.state : '') : ''}</p>
        <p class="small" style="margin:8px 0 0">Preencha seus dados uma vez só. Eles vão direto para a ficha da clínica e você ganha acesso à sua área do paciente, onde marca consultas e recebe receitas e documentos.</p></div>
      <form data-form="cadSignup" class="card stack" style="margin-top:14px">${patientSignupFields()}<button class="btn primary block" type="submit">${icon('check')} Concluir cadastro</button></form>
    </div></main></div>`;
});
onForm('cadSignup', async d => {
  if (isDemo()) throw new Error('O cadastro por link funciona só na versão real (fora da demonstração).');
  const meta = patientSignupMeta(d, BK.slug, 'cadastro');
  const ok = await Auth.call('signup?redirect_to=' + encodeURIComponent(location.origin + '/'), { email: d.email.trim(), password: d.password, data: meta });
  if (ok.access_token) { Auth.store(ok); LS.set('pepmh_mode', 'remote'); location.hash = '#/'; S.clinic = null; await boot(); toast('Cadastro concluído!', 'ok'); return; }
  document.getElementById('cad').innerHTML = fv(checkEmailCard(d.email.trim())); window.scrollTo(0, 0);
});

/* ---------- página pública de agendamento ---------- */
const BK = {};
pubRoute('/agendar/:slug', async ({ slug }) => {
  if (isDemo() && LS.get('pepmh_demo_user') && !S.clinic) { try { await loadContext(); } catch { } }
  const c = await db.rpc('public_clinic', { p_slug: slug });
  if (!c) return html`<div class="auth"><div class="card"><h2>Agendamento indisponível</h2><p class="muted">Esta clínica não está recebendo agendamentos online agora. Fale diretamente com ela.</p><a class="btn" href="#/">Voltar</a></div></div>`;
  applyTheme(c);
  Object.assign(BK, { slug, clinic: c, pro: null, modality: null, date: null, slots: [], slot: null, done: null, embedded: false });
  if (c.professionals.length === 1) after(() => ACT.bkPro({ dataset: { id: c.professionals[0].user_id } }));
  return html`<div style="min-height:100vh;background:var(--bg)">
    <header class="topbar ${safeLogo(c.logo_url) ? 'light' : ''}"><span class="logo">${safeLogo(c.logo_url) ? brandLogo(c) : html`<span class="mark" role="img" aria-label="PEPMH"></span>${c.name}`}</span><span class="sp"></span>${S.mode === 'patient' ? html`<a class="btn sm ${safeLogo(c.logo_url) ? 'primary' : ''}" style="${safeLogo(c.logo_url) ? '' : 'background:#fff'}" href="#/">Minha área</a>` : html`<a class="btn sm ${safeLogo(c.logo_url) ? 'primary' : ''}" style="${safeLogo(c.logo_url) ? '' : 'background:#fff'}" href="#/" data-act="bkLoginLink">Entrar</a>`}</header>
    <main style="max-width:860px;margin:0 auto;padding:18px 16px 60px">
      <div class="card"><h1>Marque sua consulta</h1><p class="muted" style="margin:6px 0 0">${[c.address, c.city && c.city + (c.state ? '/' + c.state : '')].filter(Boolean).join(' · ')}${c.phone ? ' · ' + fPhone(c.phone) : ''}</p>${c.note ? html`<p class="small" style="margin:8px 0 0">${c.note}</p>` : ''}
        <p class="tiny muted" style="margin:8px 0 0">Cadastro gratuito para pacientes. Consultas online acontecem pelo Google Meet.</p></div>
      <div id="bk" style="margin-top:14px">${bookingBody()}</div>
    </main></div>`;
});
act('bkLoginLink', () => { location.hash = '#/'; S.clinic ? router() : renderAuth('login'); });

function bookingBody() {
  const c = BK.clinic;
  if (BK.done) return bookingDone();
  const proCard = p => html`<button class="card" style="text-align:left;cursor:pointer;width:100%;${BK.pro?.user_id === p.user_id ? 'border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-50)' : ''}" data-act="bkPro" data-id="${p.user_id}">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="avatar lg">${initials(p.full_name)}</span><div class="grow"><b>${p.full_name}</b><div class="small muted">${p.specialty || PROF[p.profession] || ''}${councilOf(p) ? ' · ' + councilOf(p) : ''}</div>
    ${p.bio ? html`<div class="small" style="margin-top:4px">${p.bio}</div>` : ''}<div class="row" style="gap:6px;margin-top:8px">${p.online ? html`<span class="pill">${icon('video')} Online${p.online_price ? ' · ' + BRL(p.online_price) : ''}</span>` : ''}${p.presencial ? html`<span class="pill gray">Presencial</span>` : ''}</div></div></div></button>`;
  if (!c.professionals.length) return html`<div class="card empty">Nenhum profissional com horários abertos no momento.</div>`;
  let body = html`<h2 style="margin:0 0 10px">1. Escolha o profissional</h2><div class="grid g2 collapse">${c.professionals.map(proCard)}</div>`;
  if (BK.pro) {
    const mods = [...new Set(BK.slots.map(s => s.modality))];
    const days = [...Array(14)].map((_, i) => ymd(addDays(new Date(), i)));
    const byDay = groupBy(BK.slots.filter(s => !BK.modality || s.modality === BK.modality), s => ymd(s.starts_at));
    body = html`${body}<div class="card" style="margin-top:14px"><h2 style="margin:0 0 10px">2. Tipo de consulta e horário</h2>
      ${BK.loading ? html`<div class="loading">Buscando horários…</div>` : !BK.slots.length ? html`<div class="empty small">Sem horários livres nos próximos 14 dias. Tente outro profissional ou fale com a clínica${c.phone ? html` pelo <a target="_blank" rel="noopener" href="${waLink(c.phone, 'Olá! Gostaria de marcar uma consulta.')}">WhatsApp</a>` : ''}.</div>` : html`
      <div class="seg" style="margin-bottom:12px">${mods.map(m => html`<button class="${BK.modality === m ? 'on' : ''}" data-act="bkMod" data-m="${m}">${m === 'online' ? icon('video') : ''} ${MOD[m]}</button>`)}</div>
      <div class="row" style="gap:6px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px">${days.map(dd => { const n = (byDay[dd] || []).length, dt = parseYmd(dd); return html`<button class="btn sm ${BK.date === dd ? 'primary' : ''}" style="flex:none;height:auto;padding:6px 10px;flex-direction:column;gap:0" ${n ? '' : 'disabled'} data-act="bkDay" data-d="${dd}"><span class="tiny">${WDS[dt.getDay()]}</span><b>${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}</b></button>`; })}</div>
      ${BK.date ? html`<div class="row" style="gap:6px;margin-top:10px">${(byDay[BK.date] || []).map(s => html`<button class="btn sm ${BK.slot?.starts_at === s.starts_at && BK.slot?.modality === s.modality ? 'primary' : ''}" data-act="bkSlot" data-s="${s.starts_at}" data-m="${s.modality}">${fTime(s.starts_at)}</button>`)}</div>` : html`<p class="small muted">Escolha um dia.</p>`}`}
    </div>`;
  }
  if (BK.slot) {
    const online = BK.slot.modality === 'online'; const logged = S.mode === 'patient'; const staff = S.mode === 'staff' && S.clinic;
    body = html`${body}<div class="card" style="margin-top:14px"><h2 style="margin:0 0 10px">3. Confirme</h2>
      <div class="tip">${icon(online ? 'video' : 'cal')}<span><b>${fLong(new Date(BK.slot.starts_at))} às ${fTime(BK.slot.starts_at)}</b> · ${MOD[BK.slot.modality]} com ${BK.pro.full_name}${online && BK.pro.online_price ? ' · ' + BRL(BK.pro.online_price) : ''}</span></div>
      <form data-form="bkConfirm" class="stack" style="margin-top:12px">
        <label class="f"><span>Motivo da consulta (opcional)</span><textarea class="in" name="reason" rows="2" placeholder="Conte rapidamente o que está sentindo ou o que precisa"></textarea></label>
        ${online ? html`<div class="card" style="background:#fafbfc;padding:12px"><p class="small" style="margin:0">${TCLE(BK.pro.profession)}</p><label class="check" style="margin-top:10px"><input type="checkbox" name="consent" required> Li e aceito o termo de consentimento para teleconsulta</label></div>` : ''}
        ${staff ? html`<div class="pill warn" style="white-space:normal">Você está conectado(a) como profissional da clínica. Para testar como paciente, saia da conta ou use outro navegador.</div>`
        : logged ? html`<p class="small muted" style="margin:0">Agendando como <b>${S.patient.name}</b>.</p>` : html`
          <div class="seg" style="width:100%"><button type="button" class="${BK.auth !== 'login' ? 'on' : ''}" style="flex:1" data-act="bkAuth" data-a="novo">Primeira vez aqui</button><button type="button" class="${BK.auth === 'login' ? 'on' : ''}" style="flex:1" data-act="bkAuth" data-a="login">Já tenho conta</button></div>
          ${BK.auth === 'login' ? html`<div class="grid g2 collapse"><label class="f"><span>E-mail</span><input class="in" type="email" name="email" required autocomplete="email"></label><label class="f"><span>Senha</span><input class="in" type="password" name="password" required autocomplete="current-password"></label></div>`
          : patientSignupFields()}`}
        <button class="btn primary block" type="submit" ${staff ? 'disabled' : ''}>${icon('check')} Confirmar agendamento</button></form></div>`;
  }
  return body;
}
const bkRender = () => { const el = document.getElementById('bk'); if (el) el.innerHTML = fv(bookingBody()); };
act('bkPro', async el => {
  BK.pro = BK.clinic.professionals.find(p => p.user_id === el.dataset.id); BK.slot = null; BK.date = null; BK.loading = true; bkRender();
  BK.slots = await db.rpc('public_slots', { p_slug: BK.slug, p_professional: BK.pro.user_id, p_from: ymd(new Date()), p_days: 14 }) || [];
  BK.loading = false; const mods = [...new Set(BK.slots.map(s => s.modality))]; BK.modality = mods.includes('online') ? 'online' : mods[0] || null;
  BK.date = Object.keys(groupBy(BK.slots.filter(s => s.modality === BK.modality), s => ymd(s.starts_at))).sort()[0] || null; bkRender();
});
act('bkMod', el => { BK.modality = el.dataset.m; BK.slot = null; BK.date = Object.keys(groupBy(BK.slots.filter(s => s.modality === BK.modality), s => ymd(s.starts_at))).sort()[0] || null; bkRender(); });
act('bkDay', el => { BK.date = el.dataset.d; BK.slot = null; bkRender(); });
act('bkSlot', el => { BK.slot = { starts_at: el.dataset.s, modality: el.dataset.m }; bkRender(); document.querySelector('[data-form=bkConfirm]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
act('bkAuth', el => { BK.auth = el.dataset.a; bkRender(); });
onForm('bkConfirm', async d => {
  if (S.mode !== 'patient') {
    if (isDemo()) { const u = 'demo-p-' + uid().slice(0, 8); LS.set('pepmh_demo_user', u); LS.set('pepmh_demo_signup', { full_name: d.full_name || 'Paciente demonstração', phone: d.phone, email: d.email, birth_date: d.birth_date || null }); }
    else if (BK.auth === 'login') await Auth.signIn(d.email, d.password);
    else {
      const ok = await Auth.call('signup?redirect_to=' + encodeURIComponent(location.origin + '/?agendar=' + BK.slug), { email: d.email.trim(), password: d.password, data: patientSignupMeta(d, BK.slug, 'agendamento') });
      if (!ok.access_token) { LS.set('pepmh_pending_book', { slug: BK.slug }); document.getElementById('bk').innerHTML = fv(html`<div class="card"><h2>Falta só confirmar seu e-mail</h2><p>Enviamos um link para <b>${d.email}</b>. Abra o e-mail, toque no link e você volta para cá já com a conta ativa para escolher o horário.</p><p class="small muted">Seu cadastro já chegou à clínica. Não chegou o e-mail? Veja a caixa de spam ou promoções.</p></div>`); return; }
      Auth.store(ok); LS.set('pepmh_mode', 'remote');
    }
  }
  const r = await db.rpc('book_appointment', { p_slug: BK.slug, p_professional: BK.pro.user_id, p_start: BK.slot.starts_at, p_modality: BK.slot.modality, p_reason: d.reason || null, p_consent: !!d.consent });
  BK.done = { ...BK.slot, meeting_url: r.meeting_url, pending: !!r.pending, pro: BK.pro };
  if (S.mode !== 'patient') { S.clinic = null; document.getElementById('view')?.remove(); try { await loadContext(); } catch { } }
  bkRender(); window.scrollTo(0, 0);
  const hb = document.querySelector('.topbar .btn'); if (hb) { hb.textContent = 'Minha área'; hb.removeAttribute('data-act'); hb.setAttribute('href', '#/'); hb.addEventListener('click', e => { e.preventDefault(); ACT.bkGoHome(); }); }
});
function bookingDone() {
  const b = BK.done, start = new Date(b.starts_at), end = new Date(+start + (b.pro.slot_min || 30) * 60000); const c = BK.clinic;
  return html`<div class="card" style="text-align:center"><div style="font-size:2.2rem">${b.pending ? '⏳' : '✅'}</div><h2>${b.pending ? 'Pedido de consulta enviado!' : 'Consulta marcada!'}</h2>
    <p style="margin:8px 0"><b>${fLong(start)} às ${fTime(start)}</b><br>${MOD[b.modality]} com ${b.pro.full_name}</p>
    ${b.pending ? html`<p class="small">O horário ficou reservado para você. ${b.pro.full_name} vai confirmar o atendimento e, assim que aprovar, o link da consulta aparece na sua área do paciente. A clínica também pode te avisar pelo WhatsApp.</p>` : b.modality === 'online' && !b.meeting_url ? html`<p class="small">Consulta online marcada. A clínica vai enviar o link da sala do Google Meet, que também aparece na sua área do paciente.</p>`: b.modality === 'online' ? html`<p class="small muted">No horário, entre pela sala do Google Meet abaixo. Teste câmera e microfone alguns minutos antes.</p><a class="btn primary" target="_blank" rel="noopener" href="${b.meeting_url}">${icon('video')} Link da consulta (Google Meet)</a>` : html`<p class="small muted">${[c.address, c.city].filter(Boolean).join(' · ')}</p>`}
    <div class="row" style="justify-content:center;margin-top:12px"><a class="btn" target="_blank" rel="noopener" href="${gcalLink(`Consulta – ${b.pro.full_name}`, start, end, b.modality === 'online' ? 'Teleconsulta pelo Google Meet: ' + b.meeting_url : 'Consulta presencial – ' + c.name, b.modality === 'online' ? b.meeting_url : [c.address, c.city].filter(Boolean).join(', '))}">${icon('cal')} Adicionar ao Google Agenda</a><a class="btn" href="#/" data-act="bkGoHome">${icon('home')} Minha área</a></div></div>`;
}
act('bkGoHome', async () => { location.hash = '#/'; await boot(); });

/* ---------- PORTAL DO PACIENTE ---------- */
const joinBtn = a => a.modality === 'online' && a.meeting_url && a.approval !== 'pendente' && !['cancelado', 'faltou', 'atendido'].includes(a.status)
  ? (a.tele_consent_at ? html`<a class="btn primary sm" target="_blank" rel="noopener" href="${a.meeting_url}">${icon('video')} Entrar na consulta</a>` : html`<button class="btn primary sm" data-act="pTeleConsent" data-id="${a.id}">${icon('video')} Aceitar termo e entrar</button>`) : '';
act('pTeleConsent', async el => {
  const a = await db.get('appointments', el.dataset.id);
  modal('Termo de consentimento para teleconsulta', html`<p class="small" style="margin:0">${TCLE(proById(a.professional_id).profession)}</p>
    <label class="check" style="margin-top:12px"><input type="checkbox" id="teleok"> Li e aceito o termo de consentimento para teleconsulta</label>`,
    { footer: html`<button class="btn" data-act="closeModal">Agora não</button><button class="btn primary" data-act="pTeleAccept" data-id="${a.id}">Aceitar</button>` });
});
act('pTeleAccept', async el => {
  if (!document.getElementById('teleok').checked) return toast('Marque que leu e aceita o termo.', 'bad');
  await db.rpc('accept_tele_consent', { p_id: el.dataset.id }); closeModal(); toast('Termo aceito. O botão para entrar na consulta já está liberado.', 'ok'); router();
});
const proById = id => S.members.find(m => m.user_id === id) || {};
proute('/', async () => {
  const p = S.patient, now = new Date();
  const [ap, docs, reqs, rets] = await Promise.all([db.list('appointments', { eq: { patient_id: p.id }, gte: { ends_at: new Date(+now - 3600000).toISOString() }, order: 'starts_at' }), db.list('documents', { eq: { patient_id: p.id }, order: 'created_at.desc', limit: 3 }), db.list('appointment_requests', { eq: { patient_id: p.id, status: 'pendente' } }), db.list('return_alerts', { eq: { patient_id: p.id, done: false }, order: 'due_date', limit: 3 })]);
  const next = ap.find(a => !['cancelado', 'faltou'].includes(a.status));
  return html`<div class="pagehead"><div><h1>Olá, ${p.name.split(' ')[0]}!</h1><div class="muted small">${S.clinic.name}</div></div></div>
  <div class="grid g2 collapse"><div class="card"><h2>Próxima consulta</h2>${next ? html`<div class="row" style="margin:12px 0;flex-wrap:nowrap"><span class="avatar lg">${icon(next.modality === 'online' ? 'video' : 'cal')}</span><div><b>${fLong(new Date(next.starts_at))} às ${fTime(next.starts_at)}</b><div class="small muted">${MOD[next.modality || 'presencial']} · ${proById(next.professional_id).full_name || ''}</div>${apPill(next)}</div></div>
      <div class="row">${joinBtn(next)}<a class="btn sm" href="#/consultas">Ver detalhes</a></div>${next.approval === 'pendente' ? html`<p class="tiny muted">Aguardando a confirmação de ${proById(next.professional_id).full_name || 'profissional'}. O link aparece aqui após a aprovação.</p>` : next.modality === 'online' ? html`<p class="tiny muted">O link do Google Meet funciona no horário da consulta.</p>` : ''}`
    : html`<div class="empty">${icon('cal')}<div>Nenhuma consulta marcada.</div><a class="btn primary sm" style="margin-top:10px" href="#/agendar">Marcar consulta</a></div>`}</div>
    <div class="quick" style="grid-template-columns:repeat(2,1fr)">${[['#/agendar', 'plus', 'Marcar consulta'], ['#/documentos', 'file', 'Receitas e documentos'], ['#/pre-consulta', 'edit', 'Ficha de saúde'], ['#/tratamentos', 'clip', 'Tratamentos'], ['#/tratamentos?anexar=1', 'money', 'Anexar pagamento']].map(([h, i, l]) => html`<a href="${h}">${icon(i)}<span>${l}</span></a>`)}</div></div>
  ${reqs.length ? html`<div class="card"><h3>Pedidos aguardando a clínica</h3>${reqs.map(r => html`<p class="small" style="margin:8px 0 0">${r.preferred_date ? fDate(r.preferred_date) + ' · ' : ''}${PERIOD[r.period]} — ${r.reason || 'Consulta'}</p>`)}</div>` : ''}
  ${rets.length ? html`<div class="card"><h3>Lembretes de retorno</h3>${rets.map(r => html`<p class="small" style="margin:8px 0 0">${icon('alarm')} ${r.reason || 'Retorno'} — a partir de ${fDate(r.due_date)}</p>`)}</div>` : ''}
  ${docs.length ? html`<div class="card"><div class="row between"><h3>Documentos recentes</h3><a class="small" href="#/documentos">Ver todos</a></div>${docs.map(d => html`<p class="small" style="margin:8px 0 0">${DOCT[d.doc_type]?.[0]} · ${fDate(d.created_at)}</p>`)}</div>` : ''}`;
}, 'inicio');

proute('/agendar', async () => {
  if (S.clinic.slug && S.clinic.public_booking) {
    const c = await db.rpc('public_clinic', { p_slug: S.clinic.slug });
    if (c && c.professionals.length) {
      Object.assign(BK, { slug: S.clinic.slug, clinic: c, pro: null, modality: null, date: null, slots: [], slot: null, done: null });
      if (c.professionals.length === 1) after(() => ACT.bkPro({ dataset: { id: c.professionals[0].user_id } }));
      return html`<div class="pagehead"><h1>Marcar consulta</h1></div><div id="bk">${bookingBody()}</div>`;
    }
  }
  return html`<div class="pagehead"><h1>Pedir consulta</h1></div><div class="card"><p class="small muted" style="margin-top:0">Diga sua preferência e a clínica confirma o horário com você.</p>
    <form data-form="reqAppt" class="stack"><label class="f"><span>Profissional</span><select class="in" name="professional_id"><option value="">Qualquer um</option>${S.members.map(m => html`<option value="${m.user_id}">${m.full_name} · ${m.specialty || PROF[m.profession] || ''}</option>`)}</select></label>
    <div class="grid g2"><label class="f"><span>Data preferida</span><input class="in" type="date" name="preferred_date" min="${ymd(new Date())}"></label><label class="f"><span>Período</span><select class="in" name="period">${Object.entries(PERIOD).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label></div>
    <label class="f"><span>Tipo de consulta</span><select class="in" name="modality"><option value="presencial">Presencial</option><option value="online">Online (vídeo pelo Google Meet)</option></select></label>
    <label class="f"><span>Motivo</span><textarea class="in" name="reason" rows="3"></textarea></label><button class="btn primary" type="submit">Enviar pedido</button></form></div>`;
}, 'agendar');
onForm('reqAppt', async d => { await db.insert('appointment_requests', { patient_id: S.patient.id, professional_id: nz(d.professional_id), preferred_date: nz(d.preferred_date), period: d.period, modality: d.modality, reason: nz(d.reason) }); toast('Pedido enviado! A clínica vai confirmar com você.', 'ok'); go('#/consultas'); });

proute('/consultas', async () => {
  const p = S.patient, now = Date.now();
  const [ap, reqs] = await Promise.all([db.list('appointments', { eq: { patient_id: p.id }, order: 'starts_at.desc' }), db.list('appointment_requests', { eq: { patient_id: p.id }, order: 'created_at.desc' })]);
  const fut = ap.filter(a => +new Date(a.ends_at) >= now && !['cancelado'].includes(a.status)).reverse(), past = ap.filter(a => !fut.includes(a));
  const card = a => { const pr = proById(a.professional_id), s = new Date(a.starts_at), e = new Date(a.ends_at); return html`<div class="card"><div class="row between"><div><b>${fLong(s)} às ${fTime(s)}</b><div class="small muted">${MOD[a.modality || 'presencial']} · ${pr.full_name || ''}${a.reason ? ' · ' + a.reason : ''}</div></div>${apPill(a)}</div>
    ${fut.includes(a) ? html`<div class="row" style="margin-top:10px">${joinBtn(a)}<a class="btn sm" target="_blank" rel="noopener" href="${gcalLink(`Consulta – ${pr.full_name || S.clinic.name}`, s, e, a.meeting_url ? 'Google Meet: ' + a.meeting_url : S.clinic.name, a.meeting_url || S.clinic.address || '')}">${icon('cal')} Google Agenda</a>${['agendado', 'confirmado'].includes(a.status) ? html`<button class="btn sm danger" data-act="pCancel" data-id="${a.id}">Cancelar</button>` : ''}</div>` : ''}</div>`; };
  return html`<div class="pagehead"><h1>Minhas consultas</h1><a class="btn primary" href="#/agendar">${icon('plus')} Marcar</a></div>
    <h3>Próximas</h3>${fut.length ? fut.map(card) : html`<div class="card empty small">Nenhuma consulta futura.</div>`}
    ${reqs.length ? html`<h3 style="margin-top:18px">Pedidos</h3><div class="list">${reqs.map(r => html`<div class="li"><span class="grow small">${r.preferred_date ? fDate(r.preferred_date) + ' · ' : ''}${PERIOD[r.period]} — ${r.reason || 'Consulta'}${r.response ? html`<div class="tiny muted">Resposta: ${r.response}</div>` : ''}</span><span class="pill ${r.status === 'agendado' ? 'ok' : r.status === 'pendente' ? 'warn' : 'gray'}">${r.status}</span>${r.status === 'pendente' ? html`<button class="btn sm ghost" data-act="pReqCancel" data-id="${r.id}">${icon('x')}</button>` : ''}</div>`)}</div>` : ''}
    <h3 style="margin-top:18px">Anteriores</h3>${past.length ? html`<div class="list">${past.map(a => html`<div class="li"><b class="small" style="width:120px">${fDT(a.starts_at)}</b><span class="grow small">${MOD[a.modality || 'presencial']} · ${proById(a.professional_id).full_name || ''}</span>${apPill(a)}</div>`)}</div>` : html`<p class="muted small">Nada por aqui ainda.</p>`}`;
}, 'consultas');
act('pCancel', async el => { if (await confirmBox('Cancelar esta consulta? O horário fica livre para outra pessoa.', 'Cancelar consulta')) { await db.rpc('cancel_my_appointment', { p_id: el.dataset.id }); toast('Consulta cancelada.', 'ok'); router(); } });
act('pReqCancel', async el => { await db.update('appointment_requests', el.dataset.id, { status: 'cancelado' }); router(); });

proute('/documentos', async () => {
  const docs = await db.list('documents', { eq: { patient_id: S.patient.id }, order: 'created_at.desc' });
  return html`<div class="pagehead"><h1>Receitas e documentos</h1></div>${docs.length ? html`<div class="stack">${docs.map(d => html`<details class="card"><summary class="row between" style="cursor:pointer;list-style:none"><span class="row">${icon(DOCT[d.doc_type]?.[1] || 'file')}<b>${DOCT[d.doc_type]?.[0] || d.doc_type}</b></span><span class="small muted">${fDate(d.created_at)}</span></summary>
    <div class="docprev" style="margin-top:12px">${raw(sanitize(d.content).replace(/\{paciente\}/g, esc(S.patient.name)))}</div><div class="tiny muted" style="margin-top:6px">${d.professional_name || ''}</div>
    <div class="row" style="margin-top:10px">${d.signed_file_path ? html`<button class="btn sm ok" data-act="downloadSigned" data-id="${d.id}">${icon('down')} Baixar PDF assinado (ICP-Brasil)</button><a class="btn sm" target="_blank" rel="noopener" href="https://validar.iti.gov.br">Validar no ITI</a>` : ''}<button class="btn sm primary" data-act="pdfDoc" data-id="${d.id}">${icon('down')} Baixar PDF</button><button class="btn sm" data-act="pPrintDoc" data-id="${d.id}">${icon('print')} Imprimir</button></div>${d.verify_code ? html`<div class="tiny muted" style="margin-top:6px">Código de verificação: ${d.verify_code}</div>` : ''}</details>`)}</div>` : html`<div class="card empty">${icon('file')}<div>Nenhum documento ainda.</div></div>`}
    <p class="tiny muted">Receitas de medicamentos controlados precisam da via original assinada; peça à clínica se necessário.</p>`;
}, 'documentos');
act('pPrintDoc', async el => { const d = await db.get('documents', el.dataset.id); printDocument(d, S.patient, proById(d.professional_id).full_name ? proById(d.professional_id) : { full_name: d.professional_name }); });

proute('/tratamentos', async (_, q) => {
  if (q && q.get && q.get('anexar')) after(() => ACT.pReceipt());
  const [plans, fin] = await Promise.all([db.list('treatment_plans', { eq: { patient_id: S.patient.id }, order: 'created_at.desc' }), db.list('finance_entries', { eq: { patient_id: S.patient.id }, order: 'due_date' })]);
  const items = plans.length ? await db.list('treatment_items', { in: { plan_id: plans.map(p => p.id) } }) : [];
  return html`<div class="pagehead"><h1>Tratamentos e pagamentos</h1></div>
  ${pixCard()}
  ${plans.length ? plans.map(pl => { const its = items.filter(i => i.plan_id === pl.id); const tot = Math.max(0, sum(its, i => i.price) - (+pl.discount || 0)); return html`<div class="card"><div class="row between"><h3>${pl.title}</h3><span class="pill">${pl.status}</span></div><div class="list" style="margin-top:10px">${its.map(i => html`<div class="li small"><span>${i.status === 'realizado' ? '✅' : '⏳'}</span><span class="grow">${i.description}${i.tooth ? ' · dente ' + i.tooth : ''}</span><b>${BRL(i.price)}</b></div>`)}</div><p class="small" style="text-align:right;margin:8px 0 0">${+pl.discount ? `Desconto ${BRL(pl.discount)} · ` : ''}<b>Total ${BRL(tot)}</b></p></div>`; }) : html`<div class="card empty small">Nenhum plano de tratamento.</div>`}
  <h3 style="margin-top:16px">Pagamentos</h3>${fin.length ? html`<div class="list">${fin.map(f => html`<div class="li small"><span class="grow">${f.description}<div class="tiny muted">vence ${fDate(f.due_date)}</div></span><b>${BRL(f.amount)}</b>${f.paid_at ? html`<span class="pill ok">pago</span>` : f.due_date < ymd(new Date()) ? html`<span class="pill bad">vencido</span>` : html`<span class="pill gray">em aberto</span>`}</div>`)}</div>` : html`<p class="muted small">Nenhum lançamento.</p>`}
  ${await myReceiptsBlock()}`;
}, 'tratamentos');

proute('/pre-consulta', async () => {
  const last = (await db.list('anamneses', { eq: { patient_id: S.patient.id }, order: 'created_at.desc', limit: 1 }))[0]; const a = last?.data || {};
  return html`<div class="pagehead"><h1>Ficha de saúde</h1></div><div class="card"><p class="small muted" style="margin-top:0">Preencher antes da consulta agiliza o atendimento. Só os profissionais que te atendem veem estas respostas.${last ? ' Última atualização: ' + fDT(last.created_at) + '.' : ''}</p>
    <form data-form="pAnam" class="stack"><div class="grid g2 collapse">${ANAM.filter(x => x[2] === 'bool').map(([k, l]) => html`<label class="check"><input type="checkbox" name="${k}" ${a[k] ? 'checked' : ''}> ${l}</label>`)}</div>
    <div class="grid g2 collapse">${ANAM.filter(x => x[2] === 'text').map(([k, l]) => html`<label class="f"><span>${l}</span><input class="in" name="${k}" value="${a[k] || ''}"></label>`)}</div>
    <label class="check small"><input type="checkbox" required> Declaro que as informações são verdadeiras.</label><button class="btn primary" type="submit">Enviar ficha</button></form></div>`;
}, 'precons');
onForm('pAnam', async d => { await db.insert('anamneses', { patient_id: S.patient.id, data: { ...d, preenchido_pelo_paciente: true }, created_by: isDemo() ? null : Auth.userId() }); toast('Ficha enviada. Obrigado!', 'ok'); go('#/'); });

proute('/meus-dados', async () => {
  const p = await db.get('patients', S.patient.id); S.patient = p;
  return html`<div class="pagehead"><h1>Meus dados</h1></div><div class="card"><p class="small muted" style="margin-top:0">Nome, CPF e data de nascimento só a clínica altera. Se algo estiver errado, avise na próxima consulta.</p>
    <p><b>${p.name}</b><br><span class="small muted">${p.birth_date ? fDate(p.birth_date) + ' · ' : ''}${p.cpf ? 'CPF ' + fCPF(p.cpf) : ''}</span></p>
    <form data-form="pData" class="stack"><div class="grid g2 collapse"><label class="f"><span>Celular</span><input class="in" name="phone" value="${fPhone(p.phone)}"></label><label class="f"><span>E-mail</span><input class="in" type="email" name="email" value="${p.email || ''}"></label></div>
    <div class="grid g3"><label class="f"><span>CEP</span><input class="in" name="zip" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${fCEP(p.zip || '')}"></label><label class="f"><span>Cidade</span><input class="in" name="city" value="${p.city || ''}"></label><label class="f"><span>UF</span><input class="in" name="state" maxlength="2" value="${p.state || ''}"></label></div>
    <label class="f"><span>Endereço</span><input class="in" name="address" value="${p.address || ''}"></label><button class="btn primary" type="submit">Salvar</button></form></div>
    ${!isDemo() ? html`<div class="card"><h3>Senha</h3><form data-form="savePass" class="row" style="margin-top:8px;align-items:end"><label class="f" style="flex:1"><span>Nova senha</span><input class="in" type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn" type="submit">Alterar</button></form></div>` : ''}
    <div class="card"><h3>Seus dados e a LGPD</h3><p class="small">Você pode pedir à clínica uma cópia do seu prontuário, a correção de dados ou esclarecimentos sobre o uso das suas informações.</p>${S.clinic.phone ? html`<a class="btn sm" target="_blank" rel="noopener" href="${waLink(S.clinic.phone, 'Olá! Gostaria de solicitar uma cópia do meu prontuário.')}">${icon('wa')} Falar com a clínica</a>` : ''}</div>`;
}, 'dados');
onForm('pData', async d => { await db.update('patients', S.patient.id, { phone: nz(onlyDigits(d.phone)), email: nz(d.email), zip: nz(onlyDigits(d.zip)), city: nz(d.city), state: nz((d.state || '').toUpperCase()), address: nz(d.address) }); toast('Dados atualizados.', 'ok'); router(); });

/* ---------- EQUIPE: agendamentos online e pedidos ---------- */
route('/solicitacoes', async () => {
  const [reqs, booked] = await Promise.all([db.list('appointment_requests', { eq: { status: 'pendente' }, order: 'created_at' }), db.list('appointments', { eq: { booked_by_patient: true }, gte: { starts_at: startOfDay(new Date()).toISOString() }, order: 'starts_at' })]);
  const pm = await patientMap([...reqs.map(r => r.patient_id), ...booked.map(a => a.patient_id)]); const c = S.clinic;
  const link = c.slug ? `${location.origin}/#/agendar/${c.slug}` : ''; const cadLink = c.slug ? `${location.origin}/#/cadastro/${c.slug}` : '';
  return html`<div class="pagehead"><h1>Agendamentos online</h1></div>
  <div class="card"><div class="row between"><h2>Sua página de agendamento</h2>${c.public_booking && c.slug ? html`<span class="pill ok">no ar</span>` : html`<span class="pill gray">desligada</span>`}</div>
    ${c.public_booking && c.slug ? html`<p class="small" style="word-break:break-all"><a href="${link}" target="_blank" rel="noopener">${link}</a></p><div class="row"><button class="btn sm" data-act="copyText" data-t="${link}">${icon('clip')} Copiar link</button><a class="btn sm" target="_blank" rel="noopener" href="${waLink('', 'Marque sua consulta online ou presencial com a gente: ' + link)}">${icon('wa')} Divulgar no WhatsApp</a></div><p class="tiny muted">Coloque esse link na bio do Instagram, no Google Meu Negócio e no status do WhatsApp.</p>
    <h3 style="margin:14px 0 4px">Link de cadastro de paciente</h3><p class="small muted" style="margin:0 0 6px">Mande para o paciente preencher a ficha completa sozinho. O cadastro entra direto na lista de pacientes, sem código.</p>
    <p class="small" style="word-break:break-all"><a href="${cadLink}" target="_blank" rel="noopener">${cadLink}</a></p><div class="row"><button class="btn sm" data-act="copyText" data-t="${cadLink}">${icon('clip')} Copiar link</button><a class="btn sm" target="_blank" rel="noopener" href="${waLink('', 'Olá! Para agilizar seu atendimento, faça seu cadastro na ' + c.name + ' por este link: ' + cadLink)}">${icon('wa')} Enviar no WhatsApp</a></div>`
    : html`<p class="small muted">Ative para pacientes novos se cadastrarem de graça e marcarem consulta presencial ou online sozinhos.</p><a class="btn primary sm" href="#/configuracoes?sec=online">Configurar agora</a>`}</div>
  ${await approvalsBlock()}
  ${await remindersBlock()}
  <div class="card"><h2>Pedidos de consulta (${reqs.length})</h2>${reqs.length ? html`<div class="list" style="margin-top:10px">${reqs.map(r => html`<div class="li"><span class="grow"><span class="t">${pm[r.patient_id]?.name || ''}</span><span class="tiny muted">${r.preferred_date ? fDate(r.preferred_date) + ' · ' : ''}${PERIOD[r.period]} · ${MOD[r.modality || 'presencial']}${r.professional_id ? ' · ' + proName(r.professional_id) : ''} — ${r.reason || ''}</span></span>
    <button class="btn sm primary" data-act="reqSchedule" data-id="${r.id}">${icon('cal')} Agendar</button><button class="btn sm" data-act="reqDecline" data-id="${r.id}">Recusar</button></div>`)}</div>` : html`<p class="muted small">Nenhum pedido pendente.</p>`}</div>
  <div class="card"><h2>Marcados pelos pacientes</h2>${booked.length ? html`<div class="list" style="margin-top:10px">${booked.map(a => html`<div class="li"><b class="small" style="width:110px">${fDT(a.starts_at)}</b><span class="grow"><span class="t">${pm[a.patient_id]?.name || ''}</span><span class="tiny muted">${MOD[a.modality]} · ${proName(a.professional_id)}${a.reason ? ' · ' + a.reason : ''}${a.tele_consent_at ? ' · termo aceito ' + fDT(a.tele_consent_at) : ''}</span></span>${apPill(a)}${a.modality === 'online' && a.meeting_url && isClinical() ? html`<button class="btn sm primary" data-act="startTele" data-id="${a.id}" title="Iniciar teleconsulta">${icon('video')}</button>` : ''}<button class="btn sm" data-act="editAppt" data-id="${a.id}">${icon('edit')}</button></div>`)}</div>` : html`<p class="muted small">Nenhum agendamento futuro feito pela página.</p>`}</div>`;
}, 'online');
act('copyText', async el => { try { await navigator.clipboard.writeText(el.dataset.t); toast('Copiado!', 'ok'); } catch { prompt('Copie:', el.dataset.t); } });
act('reqSchedule', async el => {
  const r = await db.get('appointment_requests', el.dataset.id); const p = await db.get('patients', r.patient_id);
  modal('Agendar pedido', apptForm({ _date: r.preferred_date || ymd(new Date()), _time: r.period === 'tarde' ? '14:00' : r.period === 'noite' ? '18:00' : '08:00', professional_id: r.professional_id, notes: r.reason, modality: r.modality, kind: r.modality === 'online' ? 'teleconsulta' : 'consulta', _request: r.id }, p));
});
act('reqDecline', async el => { const why = prompt('Motivo (o paciente vai ver):', 'Sem horário disponível no período. Entre em contato pelo WhatsApp.'); if (why === null) return; await db.update('appointment_requests', el.dataset.id, { status: 'recusado', response: why }); updateNotif(); router(); });

/* ---------- CONFIG: página pública, meu atendimento online, horários, equipe ---------- */
async function configExtra() {
  const c = S.clinic, m = S.me; const av = isClinical() ? await db.list('availability', { eq: { professional_id: m.user_id }, order: 'weekday,start_time' }) : [];
  const invites = isOwner() ? await db.list('clinic_invites', { order: 'created_at.desc' }) : [];
  return html`
  ${isOwner() ? html`<div class="card" id="sec-online"><h2>${icon('globe')} Agendamento online da clínica</h2><p class="small muted">Pacientes novos se cadastram de graça e marcam consulta sozinhos, presencial ou por vídeo, nos horários livres de cada profissional.</p>
    <form data-form="saveBooking" class="stack" style="margin-top:10px"><label class="check"><input type="checkbox" name="public_booking" ${c.public_booking ? 'checked' : ''}> Página pública de agendamento ligada</label>
    <label class="check"><input type="checkbox" name="booking_requires_approval" ${c.booking_requires_approval ? 'checked' : ''}> Consultas marcadas pelos pacientes precisam da aprovação do profissional (o link do Meet vai na aprovação)</label>
    <label class="f"><span>Endereço da página</span><div class="row" style="flex-wrap:nowrap;gap:4px"><span class="small muted" style="white-space:nowrap">${location.host}/#/agendar/</span><input class="in" name="slug" value="${c.slug || ''}" placeholder="minha-clinica" pattern="[a-z0-9][a-z0-9\\-]{2,40}" required></div></label>
    <label class="f"><span>Recado para os pacientes</span><input class="in" name="booking_note" value="${c.booking_note || ''}" placeholder="Ex.: Atendemos convênios X e Y. Chegue 10 min antes."></label>
    <label class="f"><span>Antecedência mínima (horas)</span><input class="in" type="number" min="0" max="168" name="min_lead_hours" value="${c.min_lead_hours ?? 2}"></label>
    <button class="btn primary" type="submit">Salvar</button></form></div>` : ''}
  ${isClinical() ? html`<div class="card" id="sec-meet"><h2>${icon('video')} Meu atendimento online</h2>
    <div class="tip" style="margin:8px 0">${icon('bulb')}<span>Crie uma sala fixa no Google Meet: abra <a href="https://meet.google.com" target="_blank" rel="noopener">meet.google.com</a> → <b>Nova reunião</b> → <b>Criar uma reunião para depois</b> e cole o link aqui. Ele vai automaticamente para cada teleconsulta marcada com você. Também dá para trocar o link de uma consulta específica na agenda.</span></div>
    <form data-form="saveMeet" class="stack">${isGenericMeet(m.meet_url) ? html`<div class="pill bad" style="white-space:normal">⚠ Sua sala está como meet.google.com/new, que abre uma sala diferente para cada pessoa. O paciente não vai te encontrar. Troque pelo endereço fixo da sua sala.</div>` : ''}<label class="f"><span>Link da sua sala do Google Meet</span><input class="in" name="meet_url" type="url" placeholder="https://meet.google.com/abc-defg-hij" value="${m.meet_url || ''}"><span class="tiny muted"><a href="https://meet.google.com/new" target="_blank" rel="noopener">Criar sala no Meet</a> e copie o endereço que aparecer (ex.: meet.google.com/abc-defg-hij). Esse endereço é a sua sala fixa.</span></label>
    <div class="row"><label class="check"><input type="checkbox" name="accepts_online" ${m.accepts_online !== false ? 'checked' : ''}> Atendo online</label><label class="check"><input type="checkbox" name="accepts_presencial" ${m.accepts_presencial !== false ? 'checked' : ''}> Atendo presencial</label></div>
    <div class="grid g2"><label class="f"><span>Duração de cada consulta (min)</span><select class="in" name="slot_min">${[15, 20, 30, 40, 45, 50, 60, 90].map(n => html`<option ${+(m.slot_min || 30) === n ? 'selected' : ''}>${n}</option>`)}</select></label><label class="f"><span>Valor da teleconsulta (R$)</span><input class="in" name="online_price" inputmode="decimal" value="${m.online_price || ''}"></label></div>
    <label class="f"><span>Apresentação curta (aparece na página)</span><textarea class="in" name="bio" rows="2">${m.bio || ''}</textarea></label><button class="btn primary" type="submit">Salvar</button></form>
    <h3 style="margin-top:16px">Meus horários de atendimento</h3><p class="small muted" style="margin:4px 0 8px">Só aparecem na página os horários sem consulta marcada.</p>
    ${av.length ? html`<div class="list">${av.map(a => html`<div class="li small"><b style="width:44px">${WDS[a.weekday]}</b><span class="grow">${a.start_time.slice(0, 5)} – ${a.end_time.slice(0, 5)}</span><span class="pill ${a.modality === 'online' ? '' : 'gray'}">${{ ambos: 'online e presencial', online: 'só online', presencial: 'só presencial' }[a.modality]}</span><button class="btn sm ghost danger" data-act="delAvail" data-id="${a.id}">${icon('x')}</button></div>`)}</div>` : html`<p class="small" style="color:var(--warn)">Você ainda não tem horários: ninguém consegue marcar com você pela página.</p>`}
    <form data-form="addAvail" class="grid g4" style="margin-top:10px;align-items:end"><label class="f"><span>Dias</span><select class="in" name="days"><option value="1,2,3,4,5">Seg a Sex</option>${WDS.map((w, i) => html`<option value="${i}">${w}</option>`)}<option value="1,2,3,4,5,6">Seg a Sáb</option></select></label>
      <label class="f"><span>Das</span><input class="in" type="time" name="start" value="08:00" required></label><label class="f"><span>Até</span><input class="in" type="time" name="end" value="12:00" required></label>
      <label class="f"><span>Tipo</span><select class="in" name="modality"><option value="ambos">Online e presencial</option><option value="online">Só online</option><option value="presencial">Só presencial</option></select></label><button class="btn" type="submit">${icon('plus')} Adicionar</button></form></div>` : ''}
  <div class="card"><h2>${icon('users')} Equipe</h2><div class="list" style="margin-top:10px">${S.members.map(x => html`<div class="li"><span class="avatar">${initials(x.full_name)}</span><span class="grow"><span class="t">${x.full_name}</span><span class="tiny muted">${ROLE[x.role]}${x.role !== 'secretaria' ? ' · ' + PROF[x.profession || 'odontologia'] : ''}${councilOf(x) ? ' · ' + councilOf(x) : ''}</span></span>${isOwner() && x.user_id !== S.me.user_id ? html`<button class="btn sm" data-act="genResetLink" data-member="${x.user_id}" data-name="${x.full_name}">${icon('repeat')} Link de senha</button>` : ''}</div>`)}</div>
    ${isOwner() ? html`<h3 style="margin-top:14px">Convidar para a equipe</h3><form data-form="newInvite" class="grid g4" style="align-items:end;margin-top:6px"><label class="f"><span>Função</span><select class="in" name="role"><option value="dentista">Profissional de saúde</option><option value="secretaria">Secretária / recepção</option></select></label>
      <label class="f"><span>Área</span><select class="in" name="profession"><option value="odontologia">Odontologia</option><option value="medicina">Medicina</option><option value="outra">Outra</option></select></label><label class="f"><span>Para quem (anotação)</span><input class="in" name="label" placeholder="Ex.: Dr. João"></label><button class="btn primary" type="submit">Gerar convite</button></form>
      <p class="tiny muted">Secretárias veem agenda, cadastro e financeiro, mas não o conteúdo clínico (evolução, anamnese, odontograma, receitas).</p>
      ${invites.length ? html`<div class="list" style="margin-top:8px">${invites.map(i => { const l = `${location.origin}/#/convite/${i.code}`; return html`<div class="li small"><b>${i.code}</b><span class="grow">${i.label || ''} · ${ROLE[i.role]}${i.role === 'dentista' ? ' · ' + PROF[i.profession] : ''}<div class="tiny muted">${i.used_at ? 'usado em ' + fDate(i.used_at) : new Date(i.expires_at) < new Date() ? 'expirado' : 'válido até ' + fDate(i.expires_at)}</div></span>${!i.used_at ? html`<button class="btn sm" data-act="copyText" data-t="${l}">${icon('clip')}</button><a class="btn sm" target="_blank" rel="noopener" href="${waLink('', `Você foi convidado(a) para a equipe do ${S.clinic.name} no PEPMH. Crie sua conta por aqui: ${l}`)}">${icon('wa')}</a>` : ''}<button class="btn sm ghost danger" data-act="delInvite" data-id="${i.id}">${icon('x')}</button></div>`; })}</div>` : ''}` : ''}</div>`;
}
onForm('saveBooking', async d => { const slug = d.slug.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); if (slug.length < 3) throw new Error('Use pelo menos 3 letras no endereço.'); const r = await B().updateWhere('clinics', { id: S.clinic.id }, { public_booking: !!d.public_booking, booking_requires_approval: !!d.booking_requires_approval, slug, booking_note: nz(d.booking_note), min_lead_hours: +d.min_lead_hours || 0 }).catch(e => { throw new Error(/duplicate|unique/i.test(e.message) ? 'Esse endereço já está em uso. Escolha outro.' : e.message); }); Object.assign(S.clinic, r); toast('Agendamento online salvo.', 'ok'); router(); });
onForm('saveMeet', async d => { if (d.meet_url && !/^https:\/\//.test(d.meet_url)) throw new Error('O link precisa começar com https://'); if (isGenericMeet(d.meet_url)) throw new Error(MEET_GENERIC_MSG); const row = { meet_url: nz(d.meet_url), accepts_online: !!d.accepts_online, accepts_presencial: !!d.accepts_presencial, slot_min: +d.slot_min, online_price: parseMoney(d.online_price) || null, bio: nz(d.bio) }; await B().updateWhere('clinic_members', { clinic_id: S.clinic.id, user_id: S.me.user_id }, row); Object.assign(S.me, row); S.members = await db.list('clinic_members', { eq: { clinic_id: S.clinic.id } }); toast('Atendimento online salvo.', 'ok'); router(); });
onForm('addAvail', async d => { if (d.end <= d.start) throw new Error('O horário final precisa ser depois do inicial.'); await db.insert('availability', d.days.split(',').map(w => ({ professional_id: S.me.user_id, weekday: +w, start_time: d.start, end_time: d.end, modality: d.modality }))); toast('Horários adicionados.', 'ok'); router(); });
act('delAvail', async el => { await db.remove('availability', el.dataset.id); router(); });
onForm('newInvite', async d => { const i = await db.insert('clinic_invites', { role: d.role, profession: d.role === 'secretaria' ? 'outra' : d.profession, label: nz(d.label), code: randCode(), created_by: isDemo() ? null : Auth.userId(), expires_at: addDays(new Date(), 14).toISOString() }); toast(`Convite ${i.code} criado. Envie o link para a pessoa.`, 'ok'); router(); });
act('delInvite', async el => { await db.remove('clinic_invites', el.dataset.id); router(); });

/* ---------- acesso do paciente ao portal (gerado pela clínica) ---------- */
act('patientAccess', async el => {
  const p = await db.get('patients', el.dataset.id);
  if (p.user_id) return modal('Acesso do paciente', html`<p style="margin-top:0">${icon('check')} <b>${p.name}</b> já tem acesso à área do paciente.</p><p class="small muted">Ele(a) vê consultas, receitas, orçamentos e pode marcar consultas e atualizar contato.</p><div class="row">${isAdmin() ? html`<button class="btn" data-act="genResetLink" data-patient="${p.id}" data-name="${p.name}" data-phone="${p.phone || ''}">${icon('repeat')} Link de nova senha</button>` : ''}<button class="btn danger" data-act="revokeAccess" data-id="${p.id}">Remover acesso</button></div>`);
  const code = p.portal_code || randCode(); if (!p.portal_code) await db.update('patients', p.id, { portal_code: code });
  const link = `${location.origin}/#/acesso/${code}`;
  modal('Acesso do paciente', html`<p style="margin-top:0">Envie este link para <b>${p.name}</b>. Ao criar a conta, ele(a) passa a ver as próprias consultas, receitas e orçamentos, e pode marcar consultas online.</p>
    <div class="docprev" style="word-break:break-all">${link}</div><p class="small">Código: <b>${code}</b></p>
    <div class="row"><button class="btn" data-act="copyText" data-t="${link}">${icon('clip')} Copiar</button>${p.phone ? html`<a class="btn primary" target="_blank" rel="noopener" href="${waLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Este é seu acesso à área do paciente do ${S.clinic.name}, onde você vê suas consultas e receitas: ${link}`)}">${icon('wa')} Enviar no WhatsApp</a>` : ''}</div>`);
});
act('revokeAccess', async el => { if (await confirmBox('Remover o acesso do paciente à área online? Os dados do prontuário continuam.', 'Remover')) { await db.update('patients', el.dataset.id, { user_id: null, portal_code: null }); closeModal(); toast('Acesso removido.'); router(); } });

/* ---------- SINAIS VITAIS (aba do prontuário) ---------- */
TABRENDER.sinais = async p => {
  const v = await db.list('vitals', { eq: { patient_id: p.id }, order: 'measured_at.desc' });
  const imc = x => x.peso && x.altura ? (x.peso / (x.altura * x.altura)) : null;
  const paFlag = x => x.pa_sis && (x.pa_sis >= 140 || x.pa_dia >= 90) ? 'warn' : '';
  return html`<div class="card"><h2>Sinais vitais</h2><form data-form="saveVitals" class="grid g4" style="margin-top:12px;align-items:end"><input type="hidden" name="patient_id" value="${p.id}">
    ${[['pa_sis', 'PA sistólica (mmHg)'], ['pa_dia', 'PA diastólica (mmHg)'], ['fc', 'Freq. cardíaca (bpm)'], ['fr', 'Freq. respiratória (irpm)'], ['temp', 'Temperatura (°C)'], ['spo2', 'Saturação O₂ (%)'], ['glicemia', 'Glicemia capilar (mg/dL)'], ['peso', 'Peso (kg)'], ['altura', 'Altura (m)']].map(([k, l]) => html`<label class="f"><span>${l}</span><input class="in" name="${k}" inputmode="decimal"></label>`)}
    <label class="f" style="grid-column:span 2"><span>Observação</span><input class="in" name="notes"></label><button class="btn primary" type="submit">Registrar</button></form></div>
  ${v.length ? html`<div class="tblwrap"><table class="tbl"><tr><th>Data</th><th>PA</th><th class="num">FC</th><th class="num">SpO₂</th><th class="num">Temp</th><th class="num">Glic.</th><th class="num">Peso</th><th class="num">IMC</th><th></th></tr>${v.map(x => html`<tr><td class="small">${fDT(x.measured_at)}</td><td>${x.pa_sis ? html`<span class="pill ${paFlag(x) || 'gray'}">${x.pa_sis}/${x.pa_dia}</span>` : '—'}</td><td class="num">${x.fc || '—'}</td><td class="num">${x.spo2 ? x.spo2 + '%' : '—'}</td><td class="num">${x.temp || '—'}</td><td class="num">${x.glicemia || '—'}</td><td class="num">${x.peso || '—'}</td><td class="num">${imc(x) ? imc(x).toFixed(1) : '—'}</td><td class="num"><button class="btn sm ghost danger" data-act="delVital" data-id="${x.id}">${icon('x')}</button></td></tr>`)}</table></div><p class="tiny muted">PA destacada quando ≥ 140/90 mmHg. IMC = peso ÷ altura².</p>` : html`<div class="card empty small">Nenhuma medida registrada.</div>`}`;
};
onForm('saveVitals', async d => {
  const row = { patient_id: d.patient_id, notes: nz(d.notes), created_by: isDemo() ? null : Auth.userId() }; let any = false;
  for (const k of ['pa_sis', 'pa_dia', 'fc', 'fr', 'temp', 'spo2', 'glicemia', 'peso', 'altura']) { if (d[k] !== '') { const v = parseMoney(d[k]); if (!isFinite(v)) throw new Error('Confira os números.'); row[k] = ['temp', 'peso', 'altura'].includes(k) ? v : Math.round(v); any = true; } }
  if (row.altura > 3) row.altura = row.altura / 100;
  if (!any) throw new Error('Preencha pelo menos uma medida.'); if ((row.pa_sis == null) !== (row.pa_dia == null)) throw new Error('Informe a pressão sistólica e a diastólica.');
  await db.insert('vitals', row); toast('Sinais vitais registrados.', 'ok'); router();
});
act('delVital', async el => { if (await confirmBox('Excluir esta medida?', 'Excluir')) { await db.remove('vitals', el.dataset.id); router(); } });
