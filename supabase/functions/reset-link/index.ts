// PEPMH – gera link de troca de senha para paciente ou membro da equipe (sem depender do Site URL do Supabase).
// Só o responsável (owner) ou a recepção (secretaria) da clínica pode gerar; o alvo precisa ser da mesma clínica.
// Com mode = 'password', o responsável define uma senha provisória para o paciente (troca obrigatória no 1º acesso).
// Para pacientes, o e-mail que vale é SEMPRE o da ficha: se a conta de login estiver com outro e-mail, ela é
// corrigida antes (mode = 'sync' faz só essa correção). Ficha ligada a conta da equipe é recusada.
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_ORIGINS = ['https://pepmh-web-production.up.railway.app', 'http://localhost:4173'];
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && APP_ORIGINS.includes(origin) ? origin : APP_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const admin = (path: string, init: RequestInit = {}) => fetch(`${SB_URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const rest = async (q: string) => { const r = await admin(`/rest/v1/${q}`); if (!r.ok) throw new Error('db ' + r.status); return r.json(); };

Deno.serve(async (req) => {
  const origin = req.headers.get('origin'); const h = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const fail = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: h });
  try {
    if (req.method !== 'POST') return fail(405, 'Método não permitido');
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${jwt}` } });
    if (!ur.ok) return fail(401, 'Sessão expirada. Entre de novo.');
    const caller = await ur.json();
    const body = await req.json().catch(() => ({}));
    const patientId = typeof body.patient_id === 'string' ? body.patient_id : null;
    const memberId = typeof body.member_user_id === 'string' ? body.member_user_id : null;
    if (!patientId && !memberId) return fail(400, 'Informe o paciente ou o membro da equipe.');
    const uuid = /^[0-9a-f-]{36}$/i;
    if ((patientId && !uuid.test(patientId)) || (memberId && !uuid.test(memberId))) return fail(400, 'Identificador inválido.');

    let clinicId: string, targetUser: string | null;
    if (patientId) {
      const [p] = await rest(`patients?select=clinic_id,user_id&id=eq.${patientId}`);
      if (!p) return fail(404, 'Paciente não encontrado.');
      clinicId = p.clinic_id; targetUser = p.user_id;
      if (!p.user_id && body.mode !== 'create') return fail(400, 'Este paciente ainda não tem acesso online. Use o botão "Acesso online" para enviar o convite.');
    } else {
      const [m] = await rest(`clinic_members?select=clinic_id,user_id&user_id=eq.${memberId}&limit=1`);
      if (!m) return fail(404, 'Membro não encontrado.');
      clinicId = m.clinic_id; targetUser = m.user_id;
    }
    const [me] = await rest(`clinic_members?select=role&clinic_id=eq.${clinicId}&user_id=eq.${caller.id}`);
    if (!me || !(me.role === 'owner' || (me.role === 'secretaria' && patientId))) return fail(403, 'Só o responsável pela clínica (ou a recepção, para pacientes) pode gerar este link.');

    // Senha escolhida pelo responsável (opcional); sem ela, o sistema gera uma provisória.
    const genPass = () => { const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => abc[b % abc.length]).join(''); };
    const chosen = typeof body.password === 'string' && body.password.trim() ? body.password.trim() : null;
    if (chosen && (chosen.length < 8 || chosen.length > 72)) return fail(400, 'A senha precisa ter de 8 a 72 caracteres.');

    // Criar o acesso do paciente direto pelo responsável: exige nome, CPF, nascimento e e-mail na ficha.
    if (body.mode === 'create') {
      if (!patientId || me.role !== 'owner') return fail(403, 'Só o responsável pela clínica pode criar o acesso do paciente.');
      if (targetUser) return fail(400, 'Este paciente já tem acesso. Use "Alterar senha".');
      const [pf] = await rest(`patients?select=name,cpf,birth_date,email&id=eq.${patientId}`);
      const falta = [!(pf.name || '').trim() && 'nome', !pf.cpf && 'CPF', !pf.birth_date && 'data de nascimento', !pf.email && 'e-mail'].filter(Boolean);
      if (falta.length) return fail(400, `Preencha na ficha antes de criar o acesso: ${falta.join(', ')}. Salve e tente de novo.`);
      const em = String(pf.email).trim().toLowerCase();
      const password = chosen || genPass();
      const cr = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: em, password, email_confirm: true, user_metadata: { full_name: pf.name, must_change_password: !chosen, created_by_clinic: true } }) });
      const cj = await cr.json().catch(() => ({}));
      if (!cr.ok) return fail(400, /already|registered|exists/i.test(cj.msg || cj.message || cj.error_code || '') ? 'Esse e-mail já tem uma conta no PEPMH. Use o "Acesso online" para o paciente ligar a conta dele, ou corrija o e-mail.' : (cj.msg || cj.message || 'Não foi possível criar o acesso.'));
      const lk = await admin(`/rest/v1/patients?id=eq.${patientId}&user_id=is.null`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: cj.id, portal_code: null }) });
      if (!lk.ok) { await admin(`/auth/v1/admin/users/${cj.id}`, { method: 'DELETE' }); return fail(500, 'Não foi possível ligar a conta à ficha.'); }
      return new Response(JSON.stringify({ password, email: em, created: true, provisional: !chosen }), { headers: h });
    }

    const tu = await admin(`/auth/v1/admin/users/${targetUser}`); if (!tu.ok) return fail(404, 'Conta não encontrada.');
    let email = String((await tu.json()).email || '').toLowerCase();

    if (patientId) {
      // Conta da equipe (dono, profissional, recepção) nunca pode ser mexida pela ficha de um paciente.
      const staff = await rest(`clinic_members?select=clinic_id&user_id=eq.${targetUser}&limit=1`);
      if (staff.length) return fail(409, 'Esta ficha está ligada à conta de um profissional da equipe, e não à do paciente. Por segurança, nada foi alterado.');
      const [pf] = await rest(`patients?select=email&id=eq.${patientId}`);
      const fichaEmail = String(pf?.email || '').trim().toLowerCase();
      if (!fichaEmail) return fail(400, 'Cadastre o e-mail do paciente na ficha e salve antes de continuar.');
      if (fichaEmail !== email) {
        const up = await admin(`/auth/v1/admin/users/${targetUser}`, { method: 'PUT', body: JSON.stringify({ email: fichaEmail, email_confirm: true }) });
        if (!up.ok) {
          const e = await up.json().catch(() => ({}));
          return fail(409, /already|registered|exists/i.test(e.msg || e.message || e.error_code || '') ? `O e-mail ${fichaEmail} já é usado por outra conta no PEPMH. Confira o e-mail da ficha.` : (e.msg || e.message || 'Não foi possível atualizar o e-mail da conta.'));
        }
        email = fichaEmail;
      }
      if (body.mode === 'sync') return new Response(JSON.stringify({ email, synced: true }), { headers: h });
    }

    // Senha provisória definida pelo responsável (master): só para pacientes. O paciente entra com ela
    // e o sistema pede uma senha nova logo no primeiro acesso (must_change_password).
    if (body.mode === 'password') {
      if (!patientId || me.role !== 'owner') return fail(403, 'Só o responsável pela clínica pode definir uma senha nova para o paciente.');
      const password = chosen || genPass();
      const up = await admin(`/auth/v1/admin/users/${targetUser}`, { method: 'PUT', body: JSON.stringify({ password, user_metadata: { must_change_password: !chosen } }) });
      if (!up.ok) { const e = await up.json().catch(() => ({})); return fail(500, e.msg || e.message || 'Não foi possível trocar a senha.'); }
      return new Response(JSON.stringify({ password, email, provisional: !chosen }), { headers: h });
    }
    const gl = await admin('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'recovery', email }) });
    const g = await gl.json(); if (!gl.ok) return fail(500, g.msg || g.message || 'Falha ao gerar o link.');
    const hashed = g.hashed_token || g.properties?.hashed_token; if (!hashed) return fail(500, 'Resposta sem token.');
    const appOrigin = origin && APP_ORIGINS.includes(origin) ? origin : APP_ORIGINS[0];
    return new Response(JSON.stringify({ link: `${appOrigin}/#/nova-senha?th=${hashed}`, email, expires_in_minutes: 60 }), { headers: h });
  } catch (e) {
    return fail(500, 'Erro ao gerar o link.');
  }
});
