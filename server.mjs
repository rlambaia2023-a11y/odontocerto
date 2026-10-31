// OdontoCerto — mini aplicativo ebook para os PDFs de odontologia já existentes.
// Node sem dependências. Serve a biblioteca, o texto extraído (para busca
// dentro do livro) e os próprios PDFs, com suporte a Range (o visualizador
// do navegador precisa disso para PDFs grandes).
//
// Fontes de dados, nesta ordem:
//  1. DATA_DIR (Railway, volume em /app/data): DATA_DIR/manifest.json
//     (texto completo) e DATA_DIR/pdfs/*.pdf — enviados pelo script de
//     upload depois do deploy, para os PDFs não irem para o GitHub.
//  2. Local (dev): ../materials-upload/upload-manifest.json e pdfs.
//  3. Só catálogo: catalog.json no repo (título, matéria, páginas, tamanho,
//     sem o texto completo e sem os PDFs). O app abre, mostra os 77 títulos
//     e o status de quantos PDFs já estão no servidor.
//
// Autenticação: se APP_USER e APP_PASSWORD estiverem definidos, todas as
// rotas exceto /api/health exigem HTTP Basic com esses valores. Sem essas
// variáveis, o app fica aberto (uso local). O upload de admin exige a
// autenticação e DATA_DIR, e nunca aceita upload sem senha.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3107);
const DATA_DIR = process.env.DATA_DIR || null;
const LOCAL_PDF_DIR = process.env.ODONTOCERTO_PDFS
  || path.resolve(__dirname, '..', 'materials-upload', 'pdfs');
const LOCAL_MANIFEST = process.env.ODONTOCERTO_MANIFEST
  || path.resolve(__dirname, '..', 'materials-upload', 'upload-manifest.json');
const PUBLIC = path.join(__dirname, 'public');
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

let livros = [], porId = new Map(), pdfDir = LOCAL_PDF_DIR, fonte = 'local';

function loadData() {
  let items = null, dir = LOCAL_PDF_DIR, src = 'local';
  const dataManifest = DATA_DIR ? path.join(DATA_DIR, 'manifest.json') : null;
  const dataPdfs = DATA_DIR ? path.join(DATA_DIR, 'pdfs') : null;
  if (dataManifest && fs.existsSync(dataManifest)) {
    items = JSON.parse(fs.readFileSync(dataManifest, 'utf8'));
    dir = dataPdfs; src = 'volume';
  } else if (fs.existsSync(LOCAL_MANIFEST)) {
    items = JSON.parse(fs.readFileSync(LOCAL_MANIFEST, 'utf8'));
    dir = LOCAL_PDF_DIR; src = 'local';
  } else {
    const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
    items = cat.map((c) => ({ stored: c.arquivo, original: c.titulo + '.pdf', subject_name: c.materia, text: '', _paginas: c.paginas }));
    dir = dataPdfs || LOCAL_PDF_DIR; src = 'catalogo';
  }
  pdfDir = dir; fonte = src;
  livros = items.map((it) => {
    const id = String(it.stored).replace(/\.pdf$/i, '');
    let tamanhoMB = null;
    try { tamanhoMB = +(fs.statSync(path.join(dir, it.stored)).size / 1048576).toFixed(1); } catch {}
    const paginas = it._paginas ? it._paginas : String(it.text || '').split('\f');
    const temTexto = clean(it.text).length > 0;
    return {
      id, arquivo: it.stored,
      titulo: clean(it.original).replace(/\.pdf$/i, ''),
      materia: it.subject_name || 'Sem matéria',
      paginas: temTexto ? paginas.length : (it._paginas || paginas.length),
      tamanhoMB, temTexto,
      pdfPresente: fs.existsSync(path.join(dir, it.stored)),
      _paginas: temTexto ? paginas.map((p) => clean(p)) : Array(it._paginas || 0).fill(''),
    };
  });
  porId = new Map(livros.map((l) => [l.id, l]));
  console.log(`OdontoCerto: ${livros.length} livros, fonte=${fonte}, pdfs=${livros.filter((l) => l.pdfPresente).length}, dir=${dir}`);
}
loadData();

function json(res, obj, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function sendFile(res, file, type) {
  res.writeHead(200, { 'content-type': type });
  fs.createReadStream(file).pipe(res);
}
function autorizado(req) {
  const user = process.env.APP_USER, pass = process.env.APP_PASSWORD;
  if (!user || !pass) return true; // sem senha configurada: uso local
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const [u, p] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
  const a = Buffer.from(u || ''), b = Buffer.from(user);
  const c = Buffer.from(p || ''), d = Buffer.from(pass);
  return a.length === b.length && c.length === d.length
    && crypto.timingSafeEqual(a, b) && crypto.timingSafeEqual(c, d);
}
function readBody(req, limit, cb) {
  const chunks = []; let total = 0;
  req.on('data', (ch) => { total += ch.length; if (total > limit) { req.destroy(); return cb(new Error('muito grande')); } chunks.push(ch); });
  req.on('end', () => cb(null, Buffer.concat(chunks)));
  req.on('error', cb);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (p === '/api/health') {
    return json(res, { ok: true, livros: livros.length, pdfsPresentes: livros.filter((l) => l.pdfPresente).length, fonte });
  }
  if (!autorizado(req)) {
    res.writeHead(401, { 'www-authenticate': 'Basic realm="OdontoCerto"' });
    return res.end('OdontoCerto: login necessário.');
  }

  if (p === '/' || p === '/index.html') return sendFile(res, path.join(PUBLIC, 'index.html'), 'text/html; charset=utf-8');
  if (p === '/manifest.json') return sendFile(res, path.join(PUBLIC, 'manifest.json'), 'application/json; charset=utf-8');
  if (p === '/favicon.svg') return sendFile(res, path.join(PUBLIC, 'favicon.svg'), 'image/svg+xml');
  if (p === '/api/status') {
    return json(res, { livros: livros.length, pdfsPresentes: livros.filter((l) => l.pdfPresente).length, fonte, itens: livros.map((l) => ({ id: l.id, pdfPresente: l.pdfPresente })) });
  }
  if (p === '/api/livros') return json(res, livros.map(({ _paginas, ...l }) => l));

  const mLivro = p.match(/^\/api\/livro\/([a-z0-9-]+)(\/texto)?$/);
  if (mLivro) {
    const livro = porId.get(mLivro[1]);
    if (!livro) return json(res, { erro: 'Livro não encontrado' }, 404);
    if (mLivro[2]) return json(res, { id: livro.id, paginas: livro._paginas });
    return json(res, {
      id: livro.id, titulo: livro.titulo, materia: livro.materia,
      paginas: livro._paginas.map((t, i) => ({ pagina: i + 1, inicio: t.slice(0, 180) })),
      temTexto: livro.temTexto, pdfPresente: livro.pdfPresente,
    });
  }

  const mUpPdf = p.match(/^\/api\/admin\/upload-pdf\/([a-z0-9-]+)$/);
  if (mUpPdf && req.method === 'POST') {
    if (!process.env.APP_USER || !process.env.APP_PASSWORD || !DATA_DIR) return json(res, { erro: 'Upload exige senha e DATA_DIR' }, 503);
    const livro = porId.get(mUpPdf[1]);
    if (!livro) return json(res, { erro: 'Livro não encontrado' }, 404);
    const destDir = path.join(DATA_DIR, 'pdfs'); fs.mkdirSync(destDir, { recursive: true });
    return readBody(req, 300 * 1024 * 1024, (err, buf) => {
      if (err) return json(res, { erro: 'Upload falhou' }, 400);
      fs.writeFileSync(path.join(destDir, livro.arquivo), buf);
      livro.pdfPresente = true;
      json(res, { ok: true, id: livro.id, bytes: buf.length });
    });
  }
  if (p === '/api/admin/upload-manifest' && req.method === 'POST') {
    if (!process.env.APP_USER || !process.env.APP_PASSWORD || !DATA_DIR) return json(res, { erro: 'Upload exige senha e DATA_DIR' }, 503);
    return readBody(req, 50 * 1024 * 1024, (err, buf) => {
      if (err) return json(res, { erro: 'Upload falhou' }, 400);
      let items; try { items = JSON.parse(buf.toString('utf8')); } catch { return json(res, { erro: 'JSON inválido' }, 400); }
      if (!Array.isArray(items) || items.length === 0) return json(res, { erro: 'Manifesto vazio' }, 400);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(path.join(DATA_DIR, 'manifest.json'), buf);
      loadData();
      json(res, { ok: true, livros: livros.length, fonte });
    });
  }

  const mPdf = p.match(/^\/pdf\/([a-z0-9-]+)$/);
  if (mPdf) {
    const livro = porId.get(mPdf[1]);
    if (!livro) { res.writeHead(404); return res.end('Livro não encontrado'); }
    const file = path.join(pdfDir, livro.arquivo);
    let stat;
    try { stat = fs.statSync(file); } catch { res.writeHead(404); return res.end('PDF ainda não enviado para este servidor.'); }
    const range = req.headers.range;
    const headers = {
      'content-type': 'application/pdf',
      'accept-ranges': 'bytes',
      'content-disposition': `inline; filename="${encodeURIComponent(livro.titulo)}.pdf"`,
    };
    if (range) {
      const [s, e] = range.replace(/bytes=/, '').split('-').map(Number);
      const start = Number.isFinite(s) ? s : 0;
      const end = Number.isFinite(e) ? e : stat.size - 1;
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${stat.size}`, 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'content-length': stat.size });
    return fs.createReadStream(file).pipe(res);
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado');
});

server.listen(PORT, () => console.log(`OdontoCerto no ar em http://localhost:${PORT}`));
