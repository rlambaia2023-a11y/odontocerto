// Envia os 77 PDFs + o manifesto com o texto para o OdontoCerto na Railway.
// Uso: rode no PC, onde APP_USER/APP_PASSWORD já estão no ambiente
// (os mesmos valores definidos como variáveis no serviço da Railway).
// Nunca imprime a senha. Idempotente: pula PDFs que já estão no servidor.
//   node scripts/upload-railway.mjs https://odontocerto-production.up.railway.app
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2];
const user = process.env.APP_USER, pass = process.env.APP_PASSWORD;
if (!BASE || !user || !pass) { console.log('Uso: node scripts/upload-railway.mjs <URL> (com APP_USER/APP_PASSWORD no ambiente)'); process.exit(2); }
const auth = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
const here = path.dirname(new URL(import.meta.url).pathname);
const manifestPath = process.env.ODONTOCERTO_MANIFEST || path.resolve(here, '..', '..', 'materials-upload', 'upload-manifest.json');
const pdfDir = process.env.ODONTOCERTO_PDFS || path.resolve(here, '..', '..', 'materials-upload', 'pdfs');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const status = await (await fetch(`${BASE}/api/status`, { headers: { Authorization: auth } })).json();
const presentes = new Set((status.itens || []).filter((i) => i.pdfPresente).map((i) => i.id));
console.log(`No servidor: ${presentes.size} de ${manifest.length} PDFs`);

let ok = 0, skip = 0, fail = 0;
for (const m of manifest) {
  const id = m.stored.replace(/\.pdf$/i, '');
  if (presentes.has(id)) { skip++; continue; }
  const file = path.join(pdfDir, m.stored);
  if (!fs.existsSync(file)) { console.log('SEM ARQUIVO:', m.stored); fail++; continue; }
  const r = await fetch(`${BASE}/api/admin/upload-pdf/${id}`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/pdf' }, body: fs.readFileSync(file), duplex: 'half' });
  if (!r.ok) { console.log('FALHOU', r.status, m.stored); fail++; continue; }
  ok++; console.log(`OK ${ok}: ${m.original}`);
}
const r2 = await fetch(`${BASE}/api/admin/upload-manifest`, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: fs.readFileSync(manifestPath) });
console.log('Manifesto:', r2.status, await r2.text());
const final = await (await fetch(`${BASE}/api/status`, { headers: { Authorization: auth } })).json();
console.log(`RESULTADO enviados=${ok} ja_existiam=${skip} falhas=${fail} final=${final.pdfsPresentes}/${final.livros} PDFs`);
