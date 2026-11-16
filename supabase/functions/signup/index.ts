// PEPMH – cadastro de paciente (e de membro da equipe com convite) sem depender do e-mail de confirmação.
// O envio de e-mail embutido do Supabase tem limite de poucos envios por hora; quando estoura, o cadastro
// falhava com "Muitas tentativas seguidas". Aqui a conta já nasce confirmada (admin API) e os gatilhos do
// banco (_self_patient, _join_clinic etc.) rodam do mesmo jeito, a partir do user_metadata.
// Cadastro de consultório novo (type clinica) continua pelo fluxo normal, com confirmação por e-mail.
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

// Só estes campos podem ir para o user_metadata (o resto é descartado).
const ALLOWED = ['full_name', 'phone', 'cpf', 'birth_date', 'sex', 'rg', 'zip', 'address', 'city', 'state', 'occupation', 'guardian_name',
  'insurance', 'alerts', 'origin', 'consult_type', 'signup_via', 'book_slug', 'patient_code', 'invite_code',
  'council_number', 'council_uf', 'lgpd_accepted_at', 'terms_accepted_at', 'online_terms_accepted_at'];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin'); const h = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const fail = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: h });
  try {
    if (req.method !== 'POST') return fail(405, 'Método não permitido');
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const raw = body.data && typeof body.data === 'object' ? body.data : {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return fail(400, 'Confira o e-mail digitado.');
    if (password.length < 6 || password.length > 72) return fail(400, 'A senha precisa ter pelo menos 6 caracteres.');
    const meta: Record<string, string> = {};
    for (const k of ALLOWED) if (raw[k] != null && String(raw[k]).trim() !== '') meta[k] = String(raw[k]).slice(0, 500);
    if (!meta.full_name) return fail(400, 'Informe o nome completo.');
    // Só paciente (com clínica ou código de acesso) ou equipe (com convite). Consultório novo segue o fluxo com e-mail.
    if (!meta.invite_code && !meta.patient_code && !meta.book_slug) return fail(400, 'Escolha a clínica.');

    const cr = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: meta }) });
    const cj = await cr.json().catch(() => ({}));
    if (!cr.ok) {
      const m = String(cj.msg || cj.message || cj.error_code || '');
      if (/already|registered|exists/i.test(m)) return fail(409, 'Já existe uma conta com esse e-mail. Use "Entrar" ou "Esqueci minha senha".');
      if (/Database error/i.test(m)) return fail(400, 'Não foi possível concluir o cadastro: confira o código de convite/acesso ou o link da clínica.');
      return fail(400, m || 'Não foi possível criar a conta.');
    }
    return new Response(JSON.stringify({ ok: true, id: cj.id }), { headers: h });
  } catch (_e) {
    return fail(500, 'Erro ao criar a conta. Tente de novo.');
  }
});
