// PEPMH – ponte com a conta Google da clínica (Apps Script): Agenda, Gmail e Drive.
// O segredo e o endereço do script ficam em clinic_integrations (só o responsável e este servidor leem).
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
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fdate = (d: string) => d ? d.split('-').reverse().join('/') : '';

async function gas(integ: any, action: string, payload: Record<string, unknown> = {}) {
  if (!integ?.gas_url || !integ?.gas_secret) throw Object.assign(new Error('Google ainda não conectado'), { notConfigured: true });
  const r = await fetch(integ.gas_url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ secret: integ.gas_secret, action, ...payload }) });
  const t = await r.text(); let j: any; try { j = JSON.parse(t); } catch { throw new Error('O script do Google não respondeu corretamente (confira se a implantação está como "Qualquer pessoa").'); }
  if (!j.ok) throw new Error('Google: ' + j.error);
  return j.data;
}
const b64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

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
    const [member] = await rest(`clinic_members?select=clinic_id,role,user_id,full_name&user_id=eq.${caller.id}&limit=1`);

    // ---------- paciente enviou acompanhamento ----------
    if (action === 'checkin') {
      if (!uuid.test(body.id || '')) return fail(400, 'Acompanhamento inválido.');
      const [c] = await rest(`weight_checkins?select=*&id=eq.${body.id}`);
      if (!c) return fail(404, 'Acompanhamento não encontrado.');
      const [p] = await rest(`patients?select=id,name,phone,user_id,clinic_id&id=eq.${c.patient_id}`);
      const allowed = p && (p.user_id === caller.id || (member && member.clinic_id === c.clinic_id && ['owner', 'dentista'].includes(member.role)));
      if (!allowed) return fail(403, 'Sem permissão.');
      if (c.notified_at && !body.force) return send({ ok: true, already: true });
      const [clinic] = await rest(`clinics?select=name,email&id=eq.${c.clinic_id}`);
      const [integ] = await rest(`clinic_integrations?select=*&clinic_id=eq.${c.clinic_id}`);
      try {
        let driveUrl = c.drive_url;
        if (c.photo_path && !driveUrl) {
          const fr = await admin(`/storage/v1/object/progress-photos/${c.photo_path}`);
          if (fr.ok) {
            const buf = await fr.arrayBuffer();
            const saved = await gas(integ, 'saveFile', { path: ['Acompanhamentos', p.name], name: `${c.data} - semana.jpg`, mime: fr.headers.get('content-type') || 'image/jpeg', b64: b64(buf) });
            driveUrl = saved.url;
          }
        }
        const to = integ?.notify_email || clinic.email;
        const link = `${APP}/#/paciente/${p.id}?tab=emagrecimento`;
        const rows = [['Paciente', p.name], ['Data', fdate(c.data)], ['Dose informada', c.dose || '—'], ['Peso', c.peso ? String(c.peso).replace('.', ',') + ' kg' : '—'], ['Sintomas', (c.sintomas || []).join(', ') || '—'], ['Queixas', c.queixas || '—']];
        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Chegou um novo acompanhamento semanal pelo PEPMH.</p>
          <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${escH(k)}</td><td style="padding:4px 0"><b>${escH(v)}</b></td></tr>`).join('')}</table>
          <p>${driveUrl ? `Foto salva no Drive: <a href="${escH(driveUrl)}">abrir foto</a><br>` : ''}<a href="${escH(link)}">Abrir no prontuário</a></p>
          <p style="color:#777;font-size:12px">Mensagem automática do PEPMH · ${escH(clinic.name)}</p></div>`;
        await gas(integ, 'sendMail', { to, subject: `Acompanhamento semanal · ${p.name}`, html, text: rows.map(r => r.join(': ')).join('\n') + '\n' + link, name: clinic.name });
        await patch(`weight_checkins?id=eq.${c.id}`, { notified_at: new Date().toISOString(), drive_url: driveUrl, notify_error: null });
        return send({ ok: true, drive_url: driveUrl });
      } catch (e: any) {
        await patch(`weight_checkins?id=eq.${c.id}`, { notify_error: String(e.message).slice(0, 300) });
        return send({ ok: false, configured: !e.notConfigured, message: e.message });
      }
    }

    // ---------- daqui para baixo: só equipe da clínica ----------
    if (!member) return fail(403, 'Sem permissão.');
    const clinicId = member.clinic_id;
    const [integ] = await rest(`clinic_integrations?select=*&clinic_id=eq.${clinicId}`);
    const [clinic] = await rest(`clinics?select=name,address,city,state&id=eq.${clinicId}`);
    const [owner] = await rest(`clinic_members?select=user_id&clinic_id=eq.${clinicId}&role=eq.owner&limit=1`);

    if (action === 'status') {
      if (member.role !== 'owner') return fail(403, 'Só o responsável.');
      const d = await gas(integ, 'ping');
      await patch(`clinic_integrations?clinic_id=eq.${clinicId}`, { last_error: null, updated_at: new Date().toISOString() });
      return send({ ok: true, ...d });
    }

    if (action === 'sync') {
      // traz os eventos do Google (próximos 90 dias) como compromissos "google" da dona da agenda
      if (!integ?.calendar_sync) return send({ ok: false, configured: !!integ?.gas_url, message: 'Sincronização desligada' });
      const from = new Date(Date.now() - 864e5).toISOString(), to = new Date(Date.now() + 90 * 864e5).toISOString();
      const evs: any[] = await gas(integ, 'listEvents', { from, to });
      const pro = owner.user_id;
      const keep = evs.filter(e => !e.allDay);
      if (keep.length) await rest('work_events?on_conflict=clinic_id,google_event_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(keep.map(e => ({ clinic_id: clinicId, professional_id: pro, title: String(e.title || 'Evento do Google').slice(0, 200), kind: 'google', starts_at: e.start, ends_at: e.end > e.start ? e.end : new Date(new Date(e.start).getTime() + 30 * 60000).toISOString(), location: e.location || null, source: 'google', google_event_id: e.id }))) });
      const existing: any[] = await rest(`work_events?select=id,google_event_id&clinic_id=eq.${clinicId}&source=eq.google&starts_at=gte.${from}&starts_at=lt.${to}`);
      const ids = new Set(keep.map(e => e.id));
      const gone = existing.filter(x => !ids.has(x.google_event_id)).map(x => x.id);
      if (gone.length) await rest(`work_events?id=in.(${gone.join(',')})`, { method: 'DELETE' });
      await patch(`clinic_integrations?clinic_id=eq.${clinicId}`, { last_sync_at: new Date().toISOString(), last_error: null });
      return send({ ok: true, imported: keep.length, removed: gone.length });
    }

    if (action === 'pushAppt' || action === 'pushEvent') {
      if (!uuid.test(body.id || '')) return fail(400, 'Registro inválido.');
      if (action === 'pushAppt') {
        const [a] = await rest(`appointments?select=*&id=eq.${body.id}&clinic_id=eq.${clinicId}`);
        if (!a) return fail(404, 'Agendamento não encontrado.');
        const dead = ['cancelado', 'faltou'].includes(a.status) || a.approval === 'recusado' || a.approval === 'pendente';
        if (dead) { if (a.google_event_id) { await gas(integ, 'deleteEvent', { id: a.google_event_id }); await patch(`appointments?id=eq.${a.id}`, { google_event_id: null }); } return send({ ok: true, removed: true }); }
        const [p] = a.patient_id ? await rest(`patients?select=name&id=eq.${a.patient_id}`) : [null];
        const online = a.modality === 'online';
        const title = `${online ? 'Teleconsulta' : 'Consulta'} · ${p?.name || a.title || 'Paciente'}`;
        const loc = online ? (a.meeting_url || 'Google Meet') : [clinic.name, clinic.address, clinic.city && `${clinic.city}/${clinic.state || ''}`].filter(Boolean).join(' – ');
        const desc = `Agendado pelo PEPMH.${online && a.meeting_url ? '\nLink: ' + a.meeting_url : ''}\n${APP}/#/agenda`;
        const r = await gas(integ, 'upsertEvent', { id: a.google_event_id, title, start: a.starts_at, end: a.ends_at, location: loc, description: desc });
        if (r.id !== a.google_event_id) await patch(`appointments?id=eq.${a.id}`, { google_event_id: r.id });
        return send({ ok: true, id: r.id });
      } else {
        const [w] = await rest(`work_events?select=*,work_places(name,address,city)&id=eq.${body.id}&clinic_id=eq.${clinicId}`);
        if (!w || w.source !== 'pepmh') return fail(404, 'Compromisso não encontrado.');
        const pl = w.work_places;
        const r = await gas(integ, 'upsertEvent', { id: w.google_event_id, title: w.title, start: w.starts_at, end: w.ends_at, location: pl ? [pl.name, pl.address, pl.city].filter(Boolean).join(' – ') : (w.location || ''), description: `Compromisso registrado no PEPMH.${w.notes ? '\n' + w.notes : ''}` });
        if (r.id !== w.google_event_id) await patch(`work_events?id=eq.${w.id}`, { google_event_id: r.id });
        return send({ ok: true, id: r.id });
      }
    }

    if (action === 'deleteRemote') {
      const gid = String(body.google_event_id || ''); if (!gid || gid.length > 300) return fail(400, 'Evento inválido.');
      // só apaga se nenhum registro da clínica ainda usa esse evento (o registro local já foi excluído)
      const still = await rest(`appointments?select=id&clinic_id=eq.${clinicId}&google_event_id=eq.${encodeURIComponent(gid)}`);
      const still2 = await rest(`work_events?select=id&clinic_id=eq.${clinicId}&google_event_id=eq.${encodeURIComponent(gid)}`);
      if (still.length || still2.length) return send({ ok: false, message: 'Evento ainda em uso.' });
      await gas(integ, 'deleteEvent', { id: gid });
      return send({ ok: true });
    }

    return fail(400, 'Ação desconhecida.');
  } catch (e: any) {
    if (e.notConfigured) return send({ ok: false, configured: false, message: e.message });
    return send({ ok: false, message: String(e.message || e).slice(0, 300) }, 200);
  }
});
