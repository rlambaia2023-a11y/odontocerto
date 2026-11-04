/* ===== Nova senha (link do e-mail ou link gerado pela clínica) ===== */
pubRoute('/nova-senha', async (_, q) => {
  const th = q.get('th');
  if (th && !isDemo()) {
    try {
      const d = await Auth.call('verify', { type: 'recovery', token_hash: th });
      Auth.store(d); LS.set('pepmh_mode', 'remote'); history.replaceState(null, '', location.pathname + '#/nova-senha');
    } catch (e) {
      return html`<div class="auth"><div class="card stack"><div class="brand"><span class="mark" role="img" aria-label="PEPMH"></span><h1>Link expirado</h1></div><p class="small">Este link de troca de senha já foi usado ou passou de 1 hora. Peça um novo à clínica ou use "Esqueci minha senha" na tela de entrada.</p><a class="btn" href="#/">Ir para a entrada</a></div></div>`;
    }
  }
  const a = LS.get('pepmh_auth');
  if (!a?.access_token) return html`<div class="auth"><div class="card stack"><h2>Sessão não encontrada</h2><p class="small">Abra de novo o link que você recebeu.</p><a class="btn" href="#/">Ir para a entrada</a></div></div>`;
  return html`<div class="auth"><div class="card stack"><div class="brand"><span class="mark" role="img" aria-label="PEPMH"></span><div><h1>Criar nova senha</h1><div class="small muted">${a.user?.email || ''}</div></div></div>
    <form data-form="newPass" class="stack"><label class="f"><span>Nova senha (mínimo 8 caracteres)</span><input class="in" type="password" name="p1" minlength="8" required autocomplete="new-password"></label>
    <label class="f"><span>Repita a nova senha</span><input class="in" type="password" name="p2" minlength="8" required autocomplete="new-password"></label>
    <button class="btn primary block" type="submit">Salvar nova senha</button></form><p class="tiny muted" style="margin:0">Funciona em qualquer celular ou computador. Depois de salvar, você já entra no PEPMH.</p></div></div>`;
});
onForm('newPass', async d => {
  if (d.p1 !== d.p2) throw new Error('As duas senhas não são iguais.');
  if (d.p1.length < 8) throw new Error('Use pelo menos 8 caracteres.');
  await Remote.req('/auth/v1/user', { method: 'PUT', body: { password: d.p1 } });
  toast('Senha alterada! Entrando…', 'ok'); S.clinic = null; location.hash = '#/'; setTimeout(boot, 600);
});

/* ---------- clínica gera o link de nova senha ---------- */
act('genResetLink', async el => {
  if (isDemo()) return toast('Na demonstração não há contas reais.', 'bad');
  const body = el.dataset.patient ? { patient_id: el.dataset.patient } : { member_user_id: el.dataset.member };
  el.disabled = true;
  try {
    const call = async () => fetch(CFG.url + '/functions/v1/reset-link', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + LS.get('pepmh_auth').access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let r = await call(); if (r.status === 401 && await Auth.refresh()) r = await call();
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Não foi possível gerar o link.');
    const name = el.dataset.name || ''; const phone = el.dataset.phone || '';
    const msg = `Olá, ${name.split(' ')[0]}! Este é o seu link para criar uma nova senha no ${S.clinic.name} (vale por 1 hora): ${j.link}`;
    modal('Link de nova senha', html`<p style="margin-top:0">Link para <b>${name}</b> (${j.email}). Vale por <b>1 hora</b> e funciona uma única vez, em qualquer aparelho.</p>
      <div class="docprev" style="word-break:break-all">${j.link}</div>
      <div class="row" style="margin-top:12px">${phone ? html`<a class="btn ok" target="_blank" rel="noopener" href="${waLink(phone, msg)}">${icon('wa')} Enviar pelo WhatsApp</a>` : ''}<button class="btn" data-act="copyText" data-t="${j.link}">${icon('clip')} Copiar link</button></div>
      <p class="tiny muted">Envie só para a própria pessoa: quem abrir o link consegue trocar a senha da conta.</p>`);
  } finally { el.disabled = false; }
});
