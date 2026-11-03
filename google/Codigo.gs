/**
 * PEPMH ↔ Google da clínica (Agenda, Gmail e Drive)
 * Roda dentro da conta Google da clínica. O PEPMH chama este script pelo servidor,
 * sempre com o código secreto abaixo — sem ele, nada é feito.
 *
 * Como instalar: script.google.com → Novo projeto → cole este arquivo → Implantar →
 * Nova implantação → Tipo "App da Web" → Executar como: Eu → Quem pode acessar: Qualquer pessoa →
 * Implantar → autorize → copie o URL que termina em /exec e cole no PEPMH (Configurações → Google).
 */
const SECRET = '__PEPMH_SECRET__';
const TAG = 'pepmh';
const ROOT = 'PEPMH';

function doGet() { return out_({ ok: true, service: 'pepmh' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Requisição inválida' }); }
  if (!req || req.secret !== SECRET || SECRET.indexOf('__') === 0) return out_({ ok: false, error: 'Não autorizado' });
  const fn = ACTIONS[req.action];
  if (!fn) return out_({ ok: false, error: 'Ação desconhecida' });
  try { return out_({ ok: true, data: fn(req) }); }
  catch (err) { return out_({ ok: false, error: String((err && err.message) || err) }); }
}

const ACTIONS = {
  ping: function () { return { email: Session.getEffectiveUser().getEmail(), calendar: cal_().getName(), timezone: Session.getScriptTimeZone() }; },

  // Eventos da agenda que NÃO foram criados pelo PEPMH (para checar conflitos)
  listEvents: function (r) {
    return cal_().getEvents(new Date(r.from), new Date(r.to))
      .filter(function (ev) { return ev.getTag(TAG) !== '1' && ev.getMyStatus() !== CalendarApp.GuestStatus.NO; })
      .map(function (ev) {
        return { id: ev.getId(), title: ev.getTitle(), start: ev.getStartTime().toISOString(), end: ev.getEndTime().toISOString(),
          allDay: ev.isAllDayEvent(), location: ev.getLocation() || '' };
      });
  },

  upsertEvent: function (r) {
    let ev = r.id ? safeEvent_(r.id) : null;
    if (ev && ev.getTag(TAG) !== '1') ev = null;
    if (ev) {
      ev.setTitle(r.title); ev.setTime(new Date(r.start), new Date(r.end));
      ev.setLocation(r.location || ''); ev.setDescription(r.description || '');
    } else {
      ev = cal_().createEvent(r.title, new Date(r.start), new Date(r.end), { location: r.location || '', description: r.description || '' });
      ev.setTag(TAG, '1');
    }
    if (r.color) { try { ev.setColor(String(r.color)); } catch (e) { } }
    return { id: ev.getId() };
  },

  // só apaga eventos criados pelo próprio PEPMH
  deleteEvent: function (r) { const ev = r.id ? safeEvent_(r.id) : null; if (ev && ev.getTag(TAG) === '1') { ev.deleteEvent(); return { deleted: true }; } return { deleted: false }; },

  sendMail: function (r) {
    MailApp.sendEmail({ to: r.to, subject: String(r.subject || '').slice(0, 200), htmlBody: r.html || '', body: r.text || '', name: r.name || 'PEPMH' });
    return { sent: true };
  },

  saveFile: function (r) {
    let dir = folder_(ROOT, DriveApp.getRootFolder());
    (r.path || []).forEach(function (p) { dir = folder_(p, dir); });
    const blob = Utilities.newBlob(Utilities.base64Decode(r.b64), r.mime || 'image/jpeg', r.name || 'arquivo');
    const f = dir.createFile(blob);
    return { id: f.getId(), url: f.getUrl() };
  },
};

function cal_() { return CalendarApp.getDefaultCalendar(); }
function safeEvent_(id) { try { return cal_().getEventById(id); } catch (e) { return null; } }
function folder_(name, parent) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Rode esta função uma vez no editor para autorizar Agenda, Gmail e Drive.
function autorizar() { ACTIONS.ping(); DriveApp.getRootFolder(); MailApp.getRemainingDailyQuota(); }
