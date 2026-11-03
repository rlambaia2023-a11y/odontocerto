// PEPMH – ponte chamada PELO script do Google da clínica (a cada 5 min, gatilho de tempo).
// O Google não precisa ficar aberto à internet: é o script que busca as tarefas aqui.
// Autenticação: cabeçalho x-pepmh-secret = clinic_integrations.gas_secret.
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const J = { 'Content-Type': 'application/json' };
const admin = (path: string, init: RequestInit = {}) => fetch(`${SB_URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const rest = async (q: string, init: RequestInit = {}) => { const r = await admin(`/rest/v1/${q}`, init); const t = await r.text(); if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 200)); return t ? JSON.parse(t) : null; };
const patch = (q: string, body: unknown) => rest(q, { method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' } });
const b64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const send = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: J });

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return send({ ok: false, message: 'POST' }, 405);
    const secret = req.headers.get('x-pepmh-secret') || '';
    if (!/^[0-9a-f]{32,128}$/.test(secret)) return send({ ok: false, message: 'Não autorizado' }, 401);
    const [integ] = await rest(`clinic_integrations?select=clinic_id,calendar_sync&gas_secret=eq.${secret}`);
    if (!integ) return send({ ok: false, message: 'Não autorizado' }, 401);
    const clinicId = integ.clinic_id;
    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();
    await patch(`clinic_integrations?clinic_id=eq.${clinicId}`, { last_seen_at: now, ...(body.account ? { account_email: String(body.account).slice(0, 200) } : {}) });

    // 1) resultados das tarefas executadas no Google
    for (const r of Array.isArray(body.results) ? body.results.slice(0, 50) : []) {
      if (typeof r?.id !== 'string') continue;
      const [job] = await rest(`google_jobs?select=*&id=eq.${r.id}&clinic_id=eq.${clinicId}`);
      if (!job) continue;
      await patch(`google_jobs?id=eq.${job.id}`, { status: r.ok ? 'ok' : (job.attempts >= 4 ? 'erro' : 'pendente'), result: r.data ?? null, error: r.ok ? null : String(r.error || '').slice(0, 300), done_at: now });
      if (!r.ok) { if (job.ref_table === 'weight_checkins') await patch(`weight_checkins?id=eq.${job.ref_id}`, { notify_error: String(r.error || '').slice(0, 300) }); continue; }
      if (job.kind === 'upsertEvent' && r.data?.id && ['appointments', 'work_events'].includes(job.ref_table)) await patch(`${job.ref_table}?id=eq.${job.ref_id}&clinic_id=eq.${clinicId}`, { google_event_id: r.data.id });
      if (job.kind === 'checkin') await patch(`weight_checkins?id=eq.${job.ref_id}`, { notified_at: now, drive_url: r.data?.drive_url || null, notify_error: null });
    }

    // 2) eventos que já estão no Google Agenda (para conflitos)
    if (Array.isArray(body.events) && integ.calendar_sync && body.from && body.to) {
      const [owner] = await rest(`clinic_members?select=user_id&clinic_id=eq.${clinicId}&role=eq.owner&limit=1`);
      const keep = body.events.filter((e: any) => e && !e.allDay && e.id && e.start).slice(0, 2000);
      if (keep.length) await rest('work_events?on_conflict=clinic_id,google_event_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(keep.map((e: any) => ({ clinic_id: clinicId, professional_id: owner.user_id, title: String(e.title || 'Evento do Google').slice(0, 200), kind: 'google', starts_at: e.start, ends_at: e.end > e.start ? e.end : new Date(new Date(e.start).getTime() + 30 * 60000).toISOString(), location: e.location ? String(e.location).slice(0, 300) : null, source: 'google', google_event_id: String(e.id).slice(0, 300) }))) });
      const existing: any[] = await rest(`work_events?select=id,google_event_id&clinic_id=eq.${clinicId}&source=eq.google&starts_at=gte.${encodeURIComponent(body.from)}&starts_at=lt.${encodeURIComponent(body.to)}`);
      const ids = new Set(keep.map((e: any) => String(e.id)));
      const gone = existing.filter(x => !ids.has(x.google_event_id)).map(x => x.id);
      for (let i = 0; i < gone.length; i += 100) await rest(`work_events?id=in.(${gone.slice(i, i + 100).join(',')})`, { method: 'DELETE' });
      await patch(`clinic_integrations?clinic_id=eq.${clinicId}`, { last_sync_at: now, last_error: null });
    }

    // 3) próximas tarefas (reenvia as que ficaram presas há mais de 10 min)
    const stale = new Date(Date.now() - 10 * 60000).toISOString();
    const jobs: any[] = await rest(`google_jobs?select=*&clinic_id=eq.${clinicId}&or=(status.eq.pendente,and(status.eq.enviado,sent_at.lt.${stale}))&attempts=lt.5&order=created_at&limit=15`);
    const out = [];
    for (const j of jobs) {
      const p = { ...j.payload };
      // id atual do evento no Google (evita duplicar em reenvio)
      if (j.kind === 'upsertEvent' && ['appointments', 'work_events'].includes(j.ref_table)) { const [row] = await rest(`${j.ref_table}?select=google_event_id&id=eq.${j.ref_id}`); if (!row) { await patch(`google_jobs?id=eq.${j.id}`, { status: 'ok', error: 'registro apagado', done_at: now }); continue; } p.id = row.google_event_id || null; }
      if (j.kind === 'checkin' && p.photo_path) { const fr = await admin(`/storage/v1/object/progress-photos/${p.photo_path}`); if (fr.ok) { p.photo_b64 = b64(await fr.arrayBuffer()); p.photo_mime = fr.headers.get('content-type') || 'image/jpeg'; } delete p.photo_path; }
      await patch(`google_jobs?id=eq.${j.id}`, { status: 'enviado', sent_at: now, attempts: j.attempts + 1 });
      out.push({ id: j.id, kind: j.kind, payload: p });
    }
    return send({ ok: true, jobs: out });
  } catch (e: any) {
    return send({ ok: false, message: String(e.message || e).slice(0, 300) }, 500);
  }
});
