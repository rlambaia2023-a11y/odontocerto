// PEPMH – gera link de troca de senha para paciente ou membro da equipe (sem depender do Site URL do Supabase).
// Só o responsável (owner) ou a recepção (secretaria) da clínica pode gerar; o alvo precisa ser da mesma clínica.
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
      if (!p.user_id) return fail(400, 'Este paciente ainda não tem acesso online. Use o botão "Acesso online" para enviar o convite.');
      clinicId = p.clinic_id; targetUser = p.user_id;
    } else {
      const [m] = await rest(`clinic_members?select=clinic_id,user_id&user_id=eq.${memberId}&limit=1`);
      if (!m) return fail(404, 'Membro não encontrado.');
      clinicId = m.clinic_id; targetUser = m.user_id;
    }
    const [me] = await rest(`clinic_members?select=role&clinic_id=eq.${clinicId}&user_id=eq.${caller.id}`);
    if (!me || !(me.role === 'owner' || (me.role === 'secretaria' && patientId))) return fail(403, 'Só o responsável pela clínica (ou a recepção, para pacientes) pode gerar este link.');

    const tu = await admin(`/auth/v1/admin/users/${targetUser}`); if (!tu.ok) return fail(404, 'Conta não encontrada.');
    const email = (await tu.json()).email;
    const gl = await admin('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'recovery', email }) });
    const g = await gl.json(); if (!gl.ok) return fail(500, g.msg || g.message || 'Falha ao gerar o link.');
    const hashed = g.hashed_token || g.properties?.hashed_token; if (!hashed) return fail(500, 'Resposta sem token.');
    const appOrigin = origin && APP_ORIGINS.includes(origin) ? origin : APP_ORIGINS[0];
    return new Response(JSON.stringify({ link: `${appOrigin}/#/nova-senha?th=${hashed}`, email, expires_in_minutes: 60 }), { headers: h });
  } catch (e) {
    return fail(500, 'Erro ao gerar o link.');
  }
});
