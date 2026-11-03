// PEPMH – pedidos ao Google da clínica (Agenda, Gmail e Drive).
// Não chama o Google diretamente: grava tarefas em google_jobs, que o script da conta da clínica
// busca a cada 5 minutos pela função google-bridge.
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_ORIGINS = ['https://pepmh-web-production.up.railway.app', 'http://localhost:4173'];
const APP = APP_ORIGINS[0];
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && APP_ORIGINS.includes(origin) ? origin : APP,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
});
const admin = (path: string, init: RequestInit = {}) => fetch(`${SB_URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const rest = async (q: string, init: RequestInit = {}) => { const r = await admin(`/rest/v1/${q}`, init); const t = await r.text(); if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 200)); return t ? JSON.parse(t) : null; };
const patch = (q: string, body: unknown) => rest(q, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const escH = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fdate = (d: string) => d ? d.split('-').reverse().join('/') : '';
const connected = (integ: any) => !!integ?.last_seen_at && Date.now() - new Date(integ.last_seen_at).getTime() < 3 * 864e5;

async function enqueue(clinicId: string, kind: string, payload: unknown, ref_table: string | null = null, ref_id: string | null = null) {
  // tarefa repetida para o mesmo registro ainda não enviada: substitui
  if (ref_table && ref_id) await rest(`google_jobs?clinic_id=eq.${clinicId}&ref_table=eq.${ref_table}&ref_id=eq.${ref_id}&kind=eq.${kind}&status=eq.pendente`, { method: 'DELETE' });
  await rest('google_jobs', { method: 'POST', body: JSON.stringify({ clinic_id: clinicId, kind, payload, ref_table, ref_id }), headers: { Prefer: 'return=minimal' } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin'); const h = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const send = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  const fail = (status: number, message: string) => send({ message }, status);
  try {
    if (req.method !== 'POST') return fail(405, 'Método não permitido');
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const ur = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${jwt}` } });
    if (!ur.ok) return fail(401, 'Sessão expirada. Entre de novo.');
    const caller = await ur.json();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const [member] = await rest(`clinic_members?select=clinic_id,role,user_id&user_id=eq.${caller.id}&limit=1`);

    // ---------- paciente enviou acompanhamento ----------
    if (action === 'checkin') {
      if (!uuid.test(body.id || '')) return fail(400, 'Acompanhamento inválido.');
      const [c] = await rest(`weight_checkins?select=*&id=eq.${body.id}`);
      if (!c) return fail(404, 'Acompanhamento não encontrado.');
      const [p] = await rest(`patients?select=id,name,user_id,clinic_id&id=eq.${c.patient_id}`);
      const allowed = p && (p.user_id === caller.id || (member && member.clinic_id === c.clinic_id && ['owner', 'dentista'].includes(member.role)));
      if (!allowed) return fail(403, 'Sem permissão.');
      if (c.notified_at && !body.force) return send({ ok: true, already: true });
      const [clinic] = await rest(`clinics?select=name,email&id=eq.${c.clinic_id}`);
      const [integ] = await rest(`clinic_integrations?select=*&clinic_id=eq.${c.clinic_id}`);
      if (!integ?.gas_secret) return send({ ok: false, configured: false, message: 'Google da clínica não conectado' });
      const link = `${APP}/#/paciente/${p.id}?tab=emagrecimento`;
      const rows = [['Paciente', p.name], ['Data', fdate(c.data)], ['Dose informada', c.dose || '—'], ['Peso', c.peso ? String(c.peso).replace('.', ',') + ' kg' : '—'], ['Sintomas', (c.sintomas || []).join(', ') || '—'], ['Queixas', c.queixas || '—']];
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Chegou um novo acompanhamento semanal pelo PEPMH.</p>
        <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${escH(k)}</td><td style="padding:4px 0"><b>${escH(v)}</b></td></tr>`).join('')}</table>
        <p>{{DRIVE}}<a href="${escH(link)}">Abrir no prontuário</a></p><p style="color:#777;font-size:12px">Mensagem automática do PEPMH · ${escH(clinic.name)}</p></div>`;
      await enqueue(c.clinic_id, 'checkin', { to: integ.notify_email || clinic.email, subject: `Acompanhamento semanal · ${p.name}`, html, text: rows.map(r => r.join(': ')).join('\n') + '\n' + link, name: clinic.name, folder: ['Acompanhamentos', p.name], file: `${c.data} - semana.jpg`, photo_path: c.photo_path || null }, 'weight_checkins', c.id);
      return send({ ok: true, queued: true, connected: connected(integ) });
    }

    // ---------- daqui para baixo: só equipe da clínica ----------
    if (!member) return fail(403, 'Sem permissão.');
    const clinicId = member.clinic_id;
    const [integ] = await rest(`clinic_integrations?select=*&clinic_id=eq.${clinicId}`);
    if (!integ?.gas_secret) return send({ ok: false, configured: false, message: 'Google da clínica não conectado' });
    const [clinic] = await rest(`clinics?select=name,address,city,state,email&id=eq.${clinicId}`);

    if (action === 'status' || action === 'sync') {
      return send({ ok: connected(integ), configured: true, connected: connected(integ), last_seen_at: integ.last_seen_at, last_sync_at: integ.last_sync_at, email: integ.account_email,
        message: connected(integ) ? undefined : 'O script do Google ainda não se comunicou. Rode a função "instalar" no Apps Script.' });
    }
    if (action === 'test') {
      if (member.role !== 'owner') return fail(403, 'Só o responsável.');
      await enqueue(clinicId, 'test', { to: integ.notify_email || clinic.email, name: clinic.name });
      return send({ ok: true, queued: true });
    }

    if (action === 'pushAppt' || action === 'pushEvent') {
      if (!uuid.test(body.id || '')) return fail(400, 'Registro inválido.');
      if (action === 'pushAppt') {
        const [a] = await rest(`appointments?select=*&id=eq.${body.id}&clinic_id=eq.${clinicId}`);
        if (!a) return fail(404, 'Agendamento não encontrado.');
        const dead = ['cancelado', 'faltou'].includes(a.status) || a.approval === 'recusado' || a.approval === 'pendente';
        if (dead) { if (a.google_event_id) { await enqueue(clinicId, 'deleteEvent', { id: a.google_event_id }); await patch(`appointments?id=eq.${a.id}`, { google_event_id: null }); } return send({ ok: true, removed: true }); }
        const [p] = a.patient_id ? await rest(`patients?select=name&id=eq.${a.patient_id}`) : [null];
        const online = a.modality === 'online';
        const title = `${online ? 'Teleconsulta' : 'Consulta'} · ${p?.name || a.title || 'Paciente'}`;
        const loc = online ? (a.meeting_url || 'Google Meet') : [clinic.name, clinic.address, clinic.city && `${clinic.city}/${clinic.state || ''}`].filter(Boolean).join(' – ');
        const desc = `Agendado pelo PEPMH.${online && a.meeting_url ? '\nLink: ' + a.meeting_url : ''}\n${APP}/#/agenda`;
        await enqueue(clinicId, 'upsertEvent', { title, start: a.starts_at, end: a.ends_at, location: loc, description: desc }, 'appointments', a.id);
      } else {
        const [w] = await rest(`work_events?select=*,work_places(name,address,city)&id=eq.${body.id}&clinic_id=eq.${clinicId}`);
        if (!w || w.source !== 'pepmh') return fail(404, 'Compromisso não encontrado.');
        const pl = w.work_places;
        await enqueue(clinicId, 'upsertEvent', { title: w.title, start: w.starts_at, end: w.ends_at, location: pl ? [pl.name, pl.address, pl.city].filter(Boolean).join(' – ') : (w.location || ''), description: `Compromisso registrado no PEPMH.${w.notes ? '\n' + w.notes : ''}` }, 'work_events', w.id);
      }
      return send({ ok: true, queued: true });
    }

    if (action === 'deleteRemote') {
      const gid = String(body.google_event_id || ''); if (!gid || gid.length > 300) return fail(400, 'Evento inválido.');
      const still = await rest(`appointments?select=id&clinic_id=eq.${clinicId}&google_event_id=eq.${encodeURIComponent(gid)}`);
      const still2 = await rest(`work_events?select=id&clinic_id=eq.${clinicId}&google_event_id=eq.${encodeURIComponent(gid)}`);
      if (still.length || still2.length) return send({ ok: false, message: 'Evento ainda em uso.' });
      await enqueue(clinicId, 'deleteEvent', { id: gid }); // o script só apaga eventos criados pelo PEPMH
      return send({ ok: true, queued: true });
    }

    return fail(400, 'Ação desconhecida.');
  } catch (e: any) {
    return send({ ok: false, message: String(e.message || e).slice(0, 300) }, 200);
  }
});
