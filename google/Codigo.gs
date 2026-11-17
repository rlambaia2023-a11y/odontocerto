/**
 * PEPMH ↔ Google da clínica (Agenda, Gmail e Drive)
 * Roda dentro da conta Google da clínica. A cada 5 minutos este script BUSCA no PEPMH
 * o que precisa ser feito (eventos na agenda, e-mails de aviso, fotos no Drive) e envia
 * os eventos da agenda para o PEPMH checar conflitos. Nada fica aberto na internet.
 *
 * Como instalar: script.google.com → Novo projeto → cole este arquivo → salve →
 * escolha a função "instalar" no topo → Executar → autorize com a conta da clínica.
 * Consultas online sem link ganham uma sala do Google Meet criada aqui; o link só volta ao PEPMH
 * depois que o Google confirma a sala. "instalar" já roda testarMeet() (veja o Registro de execução).
 */
const SECRET = '__PEPMH_SECRET__';
const BRIDGE = 'https://ltppzixkhcjaoamoddjm.supabase.co/functions/v1/google-bridge';
const TAG = 'pepmh';
const ROOT = 'PEPMH';

// Rode UMA vez: cria o gatilho de 5 em 5 minutos e já sincroniza.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(5).create();
  testarMeet();
  sincronizar();
}

function sincronizar() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return;
  try {
    const now = Date.now(), from = new Date(now - 864e5), to = new Date(now + 90 * 864e5);
    const events = cal_().getEvents(from, to)
      .filter(function (ev) { return ev.getTag(TAG) !== '1' && ev.getMyStatus() !== CalendarApp.GuestStatus.NO; })
      .map(function (ev) { return { id: ev.getId(), title: ev.getTitle(), start: ev.getStartTime().toISOString(), end: ev.getEndTime().toISOString(), allDay: ev.isAllDayEvent(), location: ev.getLocation() || '' }; });
    let r = call_({ op: 'tick', from: from.toISOString(), to: to.toISOString(), events: events, account: Session.getEffectiveUser().getEmail() });
    for (let i = 0; i < 6 && r.jobs && r.jobs.length; i++) r = call_({ op: 'tick', results: r.jobs.map(run_) });
  } finally { lock.releaseLock(); }
}

function run_(j) {
  try { return { id: j.id, ok: true, data: JOBS[j.kind](j.payload || {}) }; }
  catch (e) { return { id: j.id, ok: false, error: String((e && e.message) || e) }; }
}

const JOBS = {
  upsertEvent: function (p) {
    let ev = p.id ? safeEvent_(p.id) : null;
    if (ev && ev.getTag(TAG) !== '1') ev = null;
    if (ev) { ev.setTitle(p.title); ev.setTime(new Date(p.start), new Date(p.end)); ev.setLocation(p.location || ''); ev.setDescription(p.description || ''); }
    else { ev = cal_().createEvent(p.title, new Date(p.start), new Date(p.end), { location: p.location || '', description: p.description || '' }); ev.setTag(TAG, '1'); }
    const out = { id: ev.getId() };
    if (p.meet) { const m = meet_(ev.getId(), p.request_id); out.meet_status = m.status; out.meet_url = m.url || null; out.meet_error = m.error || null; }
    return out;
  },
  // só apaga eventos criados pelo próprio PEPMH
  deleteEvent: function (p) { const ev = p.id ? safeEvent_(p.id) : null; if (ev && ev.getTag(TAG) === '1') { ev.deleteEvent(); return { deleted: true }; } return { deleted: false }; },
  checkin: function (p) {
    let url = null;
    if (p.photo_b64) {
      let dir = folder_(ROOT, DriveApp.getRootFolder()); (p.folder || []).forEach(function (n) { dir = folder_(n, dir); });
      url = dir.createFile(Utilities.newBlob(Utilities.base64Decode(p.photo_b64), p.photo_mime || 'image/jpeg', p.file || 'foto.jpg')).getUrl();
    }
    const html = String(p.html || '').replace('{{DRIVE}}', url ? 'Foto salva no Drive: <a href="' + url + '">abrir foto</a><br>' : '');
    MailApp.sendEmail({ to: p.to, subject: String(p.subject || '').slice(0, 200), htmlBody: html, body: (p.text || '') + (url ? '\nFoto: ' + url : ''), name: p.name || 'PEPMH' });
    return { drive_url: url };
  },
  test: function (p) {
    const dir = folder_(ROOT, DriveApp.getRootFolder());
    MailApp.sendEmail({ to: p.to, subject: 'PEPMH conectado ao Google da clínica', htmlBody: '<p>Tudo certo! O PEPMH agora está ligado ao Google Agenda, Gmail e Drive da ' + (p.name || 'clínica') + '.</p><p>Os avisos de acompanhamento semanal dos pacientes chegam neste e-mail e as fotos ficam na pasta <b>' + ROOT + '</b> do Drive.</p>', body: 'PEPMH conectado ao Google da clínica.', name: p.name || 'PEPMH' });
    return { email: Session.getEffectiveUser().getEmail(), calendar: cal_().getName(), drive: dir.getUrl() };
  },
};

function call_(body) {
  const r = UrlFetchApp.fetch(BRIDGE, { method: 'post', contentType: 'application/json', headers: { 'x-pepmh-secret': SECRET }, payload: JSON.stringify(body), muteHttpExceptions: true });
  const j = JSON.parse(r.getContentText() || '{}'); if (!j.ok) throw new Error('PEPMH: ' + (j.message || r.getResponseCode()));
  return j;
}
// Cria (ou reaproveita) a sala do Google Meet no evento e só devolve o link depois que o Google confirma.
function meet_(icalId, requestId) {
  try {
    const calId = cal_().getId(), eventId = String(icalId).split('@')[0];
    let ev = gcal_('get', calId, eventId);
    for (let i = 0; i < 8; i++) {
      const cd = ev.conferenceData || null;
      const st = cd && cd.createRequest && cd.createRequest.status ? cd.createRequest.status.statusCode : (cd ? 'success' : null);
      const video = cd && (cd.entryPoints || []).filter(function (e) { return e.entryPointType === 'video'; })[0];
      const url = ev.hangoutLink || (video && video.uri) || '';
      if (st === 'success' && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url)) return { status: 'success', url: url };
      if (st === 'failure') return { status: 'failure', error: 'O Google recusou criar a sala do Meet.' };
      if (!cd) ev = gcal_('patch', calId, eventId, { conferenceData: { createRequest: { requestId: requestId || Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } });
      else { Utilities.sleep(1500); ev = gcal_('get', calId, eventId); }
    }
    return { status: 'pending', error: 'O Google ainda não liberou a sala do Meet. Tente de novo.' };
  } catch (e) { return { status: 'failure', error: String((e && e.message) || e).slice(0, 250) }; }
}
// Google Calendar API: usa o serviço avançado "Calendar" se estiver ativo; senão chama a API direto.
function gcal_(op, calId, eventId, body) {
  if (typeof Calendar !== 'undefined' && Calendar.Events) {
    return op === 'get' ? Calendar.Events.get(calId, eventId) : Calendar.Events.patch(body, calId, eventId, { conferenceDataVersion: 1 });
  }
  const url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events/' + encodeURIComponent(eventId) + (op === 'get' ? '' : '?conferenceDataVersion=1');
  const r = UrlFetchApp.fetch(url, { method: op === 'get' ? 'get' : 'patch', contentType: 'application/json', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: op === 'get' ? undefined : JSON.stringify(body), muteHttpExceptions: true });
  const j = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() >= 300) throw new Error('Google Agenda ' + r.getResponseCode() + ': ' + ((j.error && j.error.message) || ''));
  return j;
}
// Teste do Meet automático: cria um evento provisório com Meet, mostra o link no registro e apaga.
function testarMeet() {
  const s = new Date(Date.now() + 3600000), ev = cal_().createEvent('Teste PEPMH (pode apagar)', s, new Date(+s + 1800000));
  try { const m = meet_(ev.getId(), Utilities.getUuid()); Logger.log(m.status === 'success' ? 'Meet OK: ' + m.url : 'Meet falhou: ' + (m.error || m.status)); return m; }
  finally { ev.deleteEvent(); }
}
function cal_() { return CalendarApp.getDefaultCalendar(); }
function safeEvent_(id) { try { return cal_().getEventById(id); } catch (e) { return null; } }
function folder_(name, parent) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
