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
const APP = 'https://pepmh-web-production.up.railway.app';
// sala real do Meet (ex.: https://meet.google.com/abc-defg-hij)
const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
const OLD_SCRIPT = 'O script do Google da clínica está desatualizado e não cria o Meet. Em Configurações → Google, copie o código novo, cole no Apps Script e rode "instalar".';

// evento da consulta montado na hora do envio (sempre com os dados atuais)
async function apptPayload(a: any, attempt: number) {
  const [p] = a.patient_id ? await rest(`patients?select=name&id=eq.${a.patient_id}`) : [null];
  const [c] = await rest(`clinics?select=name,address,city,state&id=eq.${a.clinic_id}`);
  const online = a.modality === 'online';
  const out: any = {
    title: `${online ? 'Teleconsulta' : 'Consulta'} · ${p?.name || a.title || 'Paciente'}`,
    start: a.starts_at, end: a.ends_at,
    location: online ? (a.meeting_url || 'Google Meet') : [c?.name, c?.address, c?.city && `${c.city}/${c.state || ''}`].filter(Boolean).join(' – '),
    description: `Agendado pelo PEPMH.${online && a.meeting_url ? '\nLink: ' + a.meeting_url : ''}\n${APP}/#/agenda`,
  };
  if (online && !a.meeting_url && a.meet_status === 'gerando') { out.meet = true; out.request_id = `${a.id}-${attempt}`; }
  return out;
}

// resposta do Google sobre o Meet: só grava o link se a sala foi confirmada
async function meetResult(id: string, clinicId: string, d: any) {
  const [a] = await rest(`appointments?select=id,meeting_url,meet_status&id=eq.${id}&clinic_id=eq.${clinicId}`);
  if (!a || a.meet_status !== 'gerando' || a.meeting_url) return;
  const url = typeof d?.meet_url === 'string' ? d.meet_url.trim() : '';
  if (d?.meet_status === 'success' && MEET_RE.test(url)) { await patch(`appointments?id=eq.${id}&meet_status=eq.gerando`, { meeting_url: url, meet_status: 'validado', meet_error: null }); await meetMail(id, clinicId); }
  else await patch(`appointments?id=eq.${id}&meet_status=eq.gerando`, { meet_status: 'erro', meet_error: (d?.meet_error ? String(d.meet_error) : (d && 'meet_status' in d) ? 'O Google não confirmou a sala do Meet.' : OLD_SCRIPT).slice(0, 300) });
}

const escH = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fmtBR = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(new Date(iso));

// link validado → e-mail automático ao paciente (só para e-mail validado), pelo Gmail da clínica
async function meetMail(id: string, clinicId: string) {
  const [a] = await rest(`appointments?select=id,patient_id,professional_id,starts_at,meeting_url,meet_mail_status&id=eq.${id}&clinic_id=eq.${clinicId}`);
  if (!a?.meeting_url || ['enviando', 'enviado'].includes(a.meet_mail_status)) return;
  const [p] = a.patient_id ? await rest(`patients?select=name,email,email_verified_at&id=eq.${a.patient_id}`) : [null];
  if (!p?.email || !p.email_verified_at) { await patch(`appointments?id=eq.${id}`, { meet_mail_status: 'sem_email' }); return; }
  const [c] = await rest(`clinics?select=name,phone&id=eq.${clinicId}`);
  const [m] = a.professional_id ? await rest(`clinic_members?select=full_name&clinic_id=eq.${clinicId}&user_id=eq.${a.professional_id}`) : [null];
  const dia = fmtBR(a.starts_at, { weekday: 'long', day: '2-digit', month: 'long' }), hora = fmtBR(a.starts_at, { hour: '2-digit', minute: '2-digit' });
  const first = String(p.name || '').trim().split(/\s+/)[0] || 'paciente';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.5"><p>Olá, ${escH(first)}!</p>
    <p>Sua teleconsulta${m?.full_name ? ` com <b>${escH(m.full_name)}</b>` : ''} está confirmada para <b>${escH(dia)} às ${escH(hora)}</b> (horário de Brasília).</p>
    <p style="margin:20px 0"><a href="${escH(a.meeting_url)}" style="background:#1a73e8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Entrar na consulta (Google Meet)</a></p>
    <p>Link: <a href="${escH(a.meeting_url)}">${escH(a.meeting_url)}</a></p>
    <p>Antes do horário, teste câmera e microfone e fique em um local reservado. O link também está na sua <a href="${APP}">área do paciente</a>.</p>
    <p style="color:#777;font-size:12px">${escH(c?.name || '')}${c?.phone ? ' · ' + escH(c.phone) : ''} · mensagem automática</p></div>`;
  const text = `Olá, ${first}! Sua teleconsulta${m?.full_name ? ' com ' + m.full_name : ''} está confirmada para ${dia} às ${hora} (horário de Brasília).\nEntre pelo link: ${a.meeting_url}\nTeste câmera e microfone antes. O link também está na sua área do paciente: ${APP}`;
  // tipo "checkin" = e-mail simples pelo Gmail da clínica
  await rest('google_jobs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ clinic_id: clinicId, kind: 'checkin', ref_table: 'appointments_mail', ref_id: id,
    payload: { to: p.email, name: c?.name || 'Clínica', subject: `Link da sua teleconsulta · ${dia} às ${hora}`, html, text } }) });
  await patch(`appointments?id=eq.${id}`, { meet_mail_status: 'enviando' });
}

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
      if (!r.ok) {
        if (job.ref_table === 'weight_checkins') await patch(`weight_checkins?id=eq.${job.ref_id}`, { notify_error: String(r.error || '').slice(0, 300) });
        if (job.ref_table === 'appointments_mail' && job.attempts >= 4) await patch(`appointments?id=eq.${job.ref_id}&clinic_id=eq.${clinicId}`, { meet_mail_status: 'erro' });
        if (job.ref_table === 'appointments' && job.attempts >= 4) await patch(`appointments?id=eq.${job.ref_id}&clinic_id=eq.${clinicId}&meet_status=eq.gerando`, { meet_status: 'erro', meet_error: String(r.error || 'Falha no Google Agenda').slice(0, 300) });
        continue;
      }
      if (job.kind === 'upsertEvent' && r.data?.id && ['appointments', 'work_events'].includes(job.ref_table)) await patch(`${job.ref_table}?id=eq.${job.ref_id}&clinic_id=eq.${clinicId}`, { google_event_id: r.data.id });
      if (job.kind === 'upsertEvent' && job.ref_table === 'appointments' && r.data?.id) await meetResult(job.ref_id, clinicId, r.data);
      if (job.kind === 'checkin' && job.ref_table === 'weight_checkins') await patch(`weight_checkins?id=eq.${job.ref_id}`, { notified_at: now, drive_url: r.data?.drive_url || null, notify_error: null });
      if (job.ref_table === 'appointments_mail') await patch(`appointments?id=eq.${job.ref_id}&clinic_id=eq.${clinicId}`, { meet_mail_status: 'enviado', meet_mail_at: now });
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
      let p = { ...j.payload };
      // id atual do evento no Google (evita duplicar em reenvio)
      if (j.kind === 'upsertEvent' && ['appointments', 'work_events'].includes(j.ref_table)) {
        const [row] = await rest(`${j.ref_table}?select=*&id=eq.${j.ref_id}`);
        if (!row) { await patch(`google_jobs?id=eq.${j.id}`, { status: 'ok', error: 'registro apagado', done_at: now }); continue; }
        if (j.ref_table === 'appointments') {
          if (['cancelado', 'faltou'].includes(row.status) || ['recusado', 'pendente'].includes(row.approval)) { await patch(`google_jobs?id=eq.${j.id}`, { status: 'ok', error: 'consulta inativa', done_at: now }); continue; }
          p = await apptPayload(row, j.attempts);
        }
        p.id = row.google_event_id || null;
      }
      if (j.kind === 'checkin' && p.photo_path) { const fr = await admin(`/storage/v1/object/progress-photos/${p.photo_path}`); if (fr.ok) { p.photo_b64 = b64(await fr.arrayBuffer()); p.photo_mime = fr.headers.get('content-type') || 'image/jpeg'; } delete p.photo_path; }
      await patch(`google_jobs?id=eq.${j.id}`, { status: 'enviado', sent_at: now, attempts: j.attempts + 1 });
      out.push({ id: j.id, kind: j.kind, payload: p });
    }
    return send({ ok: true, jobs: out });
  } catch (e: any) {
    return send({ ok: false, message: String(e.message || e).slice(0, 300) }, 500);
  }
});
