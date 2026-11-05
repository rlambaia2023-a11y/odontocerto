/**
 * PEPMH ↔ Google da clínica (Agenda, Gmail e Drive)
 * Roda dentro da conta Google da clínica. A cada 5 minutos este script BUSCA no PEPMH
 * o que precisa ser feito (eventos na agenda, e-mails de aviso, fotos no Drive) e envia
 * os eventos da agenda para o PEPMH checar conflitos. Nada fica aberto na internet.
 *
 * Como instalar: script.google.com → Novo projeto → cole este arquivo → salve →
 * escolha a função "instalar" no topo → Executar → autorize com a conta da clínica.
 */
const SECRET = '__PEPMH_SECRET__';
const BRIDGE = 'https://ltppzixkhcjaoamoddjm.supabase.co/functions/v1/google-bridge';
const TAG = 'pepmh';
const ROOT = 'PEPMH';

// Rode UMA vez: cria o gatilho de 5 em 5 minutos e já sincroniza.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(5).create();
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
    return { id: ev.getId() };
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
function cal_() { return CalendarApp.getDefaultCalendar(); }
function safeEvent_(id) { try { return cal_().getEventById(id); } catch (e) { return null; } }
function folder_(name, parent) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
