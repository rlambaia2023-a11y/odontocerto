/* ===== PDF dos documentos (receitas, atestados, exames…) e envio ao paciente ===== */

/* ---------- gerador de PDF mínimo (texto + JPEG), sem dependências ---------- */
const WIN = { 0x20ac: 0x80, 0x201a: 0x82, 0x201e: 0x84, 0x2026: 0x85, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2122: 0x99, 0x2080: 0x30, 0x2081: 0x31, 0x2082: 0x32 };
const winByte = ch => { const c = ch.codePointAt(0); if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) return c; return WIN[c] ?? 0x3f; };
const pdfStr = s => { let o = ''; for (const ch of String(s)) { const b = winByte(ch); const c = String.fromCharCode(b); o += c === '(' || c === ')' || c === '\\' ? '\\' + c : c; } return '(' + o + ')'; };
const FONTS = { r: 'F1', b: 'F2', i: 'F3', bi: 'F4' };
const FONTCSS = { r: '', b: 'bold ', i: 'italic ', bi: 'italic bold ' };
const _mctx = document.createElement('canvas').getContext('2d');
const textW = (s, size, st = 'r') => { _mctx.font = `${FONTCSS[st]}100px Arial, Helvetica, "Liberation Sans", sans-serif`; return _mctx.measureText(s).width / 100 * size; };
const hex2rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(v => v.toFixed(3)).join(' '); };
class MiniPDF {
  constructor() { this.W = 595.28; this.H = 841.89; this.pages = []; this.images = []; this.addPage(); }
  addPage() { this.cur = []; this.pages.push(this.cur); }
  text(x, y, s, size = 11, st = 'r', color = '#111111') { this.cur.push(`BT ${hex2rgb(color)} rg /${FONTS[st]} ${size} Tf ${x.toFixed(2)} ${(this.H - y).toFixed(2)} Td ${pdfStr(s)} Tj ET`); }
  line(x1, y1, x2, y2, w = 0.6, color = '#999999') { this.cur.push(`${hex2rgb(color)} RG ${w} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`); }
  rect(x, y, w, h, lw = 0.6, color = '#333333') { this.cur.push(`${hex2rgb(color)} RG ${lw} w ${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`); }
  image(jpeg, iw, ih, x, y, w, h) { const n = this.images.push({ jpeg, iw, ih }); this.cur.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} cm /Im${n} Do Q`); }
  output() {
    const enc = new TextEncoder(); const chunks = []; let len = 0; const offs = [];
    const push = s => { const b = typeof s === 'string' ? Uint8Array.from(s, c => c.charCodeAt(0) & 255) : s; chunks.push(b); len += b.length; };
    const objs = []; const add = (body) => objs.push(body) ; // body: string or [string, bytes, string]
    add('<< /Type /Catalog /Pages 2 0 R >>'); add(null); // 2 = pages (filled later)
    const fontIds = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'].map(n => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${n} /Encoding /WinAnsiEncoding >>`));
    const imgIds = this.images.map(im => add([`<< /Type /XObject /Subtype /Image /Width ${im.iw} /Height ${im.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`, im.jpeg, '\nendstream']));
    const res = `<< /Font << ${fontIds.map((id, i) => `/F${i + 1} ${id} 0 R`).join(' ')} >> /XObject << ${imgIds.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ')} >> >>`;
    const pageIds = this.pages.map(ops => { const content = ops.join('\n'); const bytes = Uint8Array.from(content, c => c.charCodeAt(0) & 255); const cid = add([`<< /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream']); return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources ${res} /Contents ${cid} 0 R >>`); });
    objs[1] = `<< /Type /Pages /Kids [${pageIds.map(i => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    const info = add(`<< /Producer (PEPMH) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z) >>`);
    push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    objs.forEach((body, i) => { offs[i] = len; push(`${i + 1} 0 obj\n`); if (Array.isArray(body)) body.forEach(push); else push(body); push('\nendobj\n'); });
    const xref = len; push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
    push(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    const out = new Uint8Array(len); let p = 0; chunks.forEach(c => { out.set(c, p); p += c.length; }); return out;
  }
}
async function logoToJpeg(dataUrl, maxH = 140) {
  if (!safeLogo(dataUrl)) return null;
  const img = new Image(); img.src = dataUrl; await img.decode().catch(() => null); if (!img.naturalWidth && !img.width) return null;
  const w0 = img.naturalWidth || 360, h0 = img.naturalHeight || 80, k = maxH / h0, cv = document.createElement('canvas'); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
  const b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1]; return { bytes: Uint8Array.from(atob(b64), c => c.charCodeAt(0)), w: cv.width, h: cv.height };
}

/* ---------- conteúdo HTML → blocos de texto ---------- */
function htmlBlocks(h) {
  const root = new DOMParser().parseFromString('<div>' + sanitize(h) + '</div>', 'text/html').body.firstChild; const blocks = []; let cur = null;
  const flush = () => { if (cur && cur.runs.some(r => r.t.trim())) blocks.push(cur); cur = null; };
  const start = (prefix = '', indent = 0) => { flush(); cur = { runs: prefix ? [{ t: prefix, st: 'r' }] : [], indent }; };
  const walk = (node, st, list) => {
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { if (!cur) start(); cur.runs.push({ t: n.textContent.replace(/\s+/g, ' '), st }); return; }
      const tag = n.tagName; let s2 = st;
      if (tag === 'B' || tag === 'STRONG' || tag === 'H3' || tag === 'H4') s2 = st.includes('i') ? 'bi' : 'b';
      if (tag === 'I' || tag === 'EM') s2 = st.includes('b') ? 'bi' : 'i';
      if (tag === 'BR') { start(); return; }
      if (tag === 'UL' || tag === 'OL') { walk(n, s2, { ol: tag === 'OL', i: 0 }); flush(); return; }
      if (tag === 'LI') { list.i++; start(list.ol ? list.i + '. ' : '•  ', 14); walk(n, s2, list); flush(); return; }
      if (tag === 'P' || tag === 'DIV' || tag === 'H3' || tag === 'H4') { start(); walk(n, s2, list); flush(); blocks.push({ gap: true }); return; }
      walk(n, s2, list);
    });
  };
  walk(root, 'r', { ol: false, i: 0 }); flush();
  while (blocks.length && blocks[blocks.length - 1].gap) blocks.pop();
  return blocks;
}

/* ---------- monta o PDF de um documento ---------- */
async function buildDocPdf({ doc, patient, prof, clinic }) {
  const pdf = new MiniPDF(), M = 50, W = pdf.W - 2 * M; const brand = '#5b2a4f';
  const title = doc.rx_type === 'controle_especial' ? 'Receituário de controle especial' : (DOCT[doc.doc_type]?.[0] || 'Documento');
  const council = councilOf(prof); const logo = await logoToJpeg(clinic.logo_url);
  const addr = [clinic.address, clinic.city && clinic.city + (clinic.state ? '/' + clinic.state : '')].filter(Boolean).join(' · ');
  const contact = [fPhone(clinic.phone), clinic.email].filter(Boolean).join(' · ');
  const wrap = (runs, maxW, size) => { // quebra de linha com estilos misturados
    const lines = [[]]; let lw = 0;
    runs.forEach(r => r.t.split(/(\s+)/).forEach(w => { if (!w) return; const ww = textW(w, size, r.st); if (lw + ww > maxW && lw > 0 && w.trim()) { lines.push([]); lw = 0; if (!w.trim()) return; } if (!lines[lines.length - 1].length && !w.trim()) return; lines[lines.length - 1].push({ t: w, st: r.st, w: ww }); lw += ww; }));
    return lines.filter(l => l.length);
  };
  const header = via => {
    let y = 40;
    if (logo) { const h = 46, w = logo.w * h / logo.h; pdf.image(logo.bytes, logo.w, logo.h, M, y, Math.min(w, 230), Math.min(w, 230) * logo.h / logo.w); }
    else pdf.text(M, y + 22, clinic.name || '', 16, 'b', brand);
    const rx = pdf.W - M; const right = (s, yy, size, st, color) => pdf.text(rx - textW(s, size, st), yy, s, size, st, color);
    right(prof.full_name || doc.professional_name || '', y + 14, 11.5, 'b', brand);
    if (prof.specialty) right(prof.specialty, y + 28, 9, 'r', '#555555');
    if (council) right(council, y + (prof.specialty ? 40 : 28), 9, 'r', '#555555');
    y += 62; pdf.text(M, y, [clinic.name, addr].filter(Boolean).join(' · '), 8.5, 'r', '#444444'); if (contact) pdf.text(rx - textW(contact, 8.5), y, contact, 8.5, 'r', '#444444');
    y += 8; pdf.line(M, y, pdf.W - M, y, 1.2, brand); y += 30;
    const t = title.toUpperCase(); pdf.text((pdf.W - textW(t, 13, 'b')) / 2, y, t, 13, 'b', '#111111');
    if (via) { y += 16; pdf.text(pdf.W - M - textW(via, 9, 'b'), y, via, 9, 'b', '#333333'); }
    y += 26; pdf.text(M, y, 'Paciente: ', 11, 'b'); pdf.text(M + textW('Paciente: ', 11, 'b'), y, patient.name || '', 11);
    if (doc.rx_type === 'controle_especial') { y += 16; const a = [patient.address, patient.city, patient.state].filter(Boolean).join(', ') || '______________________________________'; pdf.text(M, y, 'Endereço: ', 11, 'b'); pdf.text(M + textW('Endereço: ', 11, 'b'), y, a, 11); }
    return y + 24;
  };
  // rodapé à direita: o canto inferior esquerdo fica livre para o carimbo do assinador (o VIDaaS assina ali, sem escolha de posição)
  const footer = () => {
    const x0 = M + 190, rx = pdf.W - M, avail = rx - x0; pdf.line(x0, pdf.H - 58, rx, pdf.H - 58, 0.5, '#bbbbbb');
    const f1 = [clinic.name, addr, fPhone(clinic.phone)].filter(Boolean).join(' · ');
    const rows = [[f1, 7.5, '#555555'], ...(doc.verify_code ? [[`Código de verificação ${doc.verify_code}`, 7.5, '#777777'], [`confira em ${verifyUrl(doc.verify_code)}`, 7, '#777777']] : [])]
      .flatMap(([t, s, c]) => wrap([{ t, st: 'r' }], avail, s).map(ln => [ln.map(w => w.t).join(''), s, c]));
    let y = pdf.H - 47; rows.slice(0, 4).forEach(([t, s, c]) => { pdf.text(rx - textW(t, s), y, t, s, 'r', c); y += 9.5; });
  };
  const body = via => {
    let y = header(via); const size = 11.5, lh = 16.5; const blocks = htmlBlocks(String(doc.content || '').replace(/\{paciente\}/g, esc(patient.name || '')));
    blocks.forEach(b => {
      if (b.gap) { y += 6; return; }
      wrap(b.runs, W - (b.indent || 0), size).forEach((ln, i) => {
        if (y > pdf.H - 210) { footer(); pdf.addPage(); y = header(via); }
        let x = M + (i > 0 ? (b.indent || 0) : 0); ln.forEach(w => { pdf.text(x, y, w.t, size, w.st); x += w.w; }); y += lh;
      });
    });
    y = Math.max(y + 30, pdf.H - 250);
    const city = clinic.city || ''; const dt = doc.no_date ? `${city}${city ? ', ' : ''}____/____/________` : `${city}${city ? ', ' : ''}${new Date(doc.created_at || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    pdf.text(pdf.W - M - textW(dt, 10.5), y, dt, 10.5); y += 58;
    const cx = pdf.W / 2; pdf.line(cx - 130, y, cx + 130, y, 0.7, '#222222');
    const nm = prof.full_name || doc.professional_name || ''; pdf.text(cx - textW(nm, 11, 'b') / 2, y + 15, nm, 11, 'b');
    const sub = [council, prof.specialty].filter(Boolean).join(' · '); if (sub) pdf.text(cx - textW(sub, 9) / 2, y + 28, sub, 9, 'r', '#444444');
    if (doc.signed) { const s = 'Documento assinado digitalmente com certificado ICP-Brasil'; pdf.text(cx - textW(s, 8.5, 'i') / 2, y + 42, s, 8.5, 'i', '#2e7d32'); }
    if (doc.rx_type === 'controle_especial') {
      const by = y + 52, bw = (W - 12) / 2, bh = 70; pdf.rect(M, by, bw, bh); pdf.rect(M + bw + 12, by, bw, bh);
      ['IDENTIFICAÇÃO DO COMPRADOR', 'Nome:', 'RG:', 'Endereço:', 'Telefone:'].forEach((t, i) => pdf.text(M + 6, by + 13 + i * 13, t, 8, i ? 'r' : 'b'));
      ['IDENTIFICAÇÃO DO FORNECEDOR', '', '', 'Assinatura do farmacêutico', 'Data: ___/___/_____'].forEach((t, i) => t && pdf.text(M + bw + 18, by + 13 + i * 13, t, 8, i ? 'r' : 'b'));
    }
    footer();
  };
  if (doc.rx_type === 'controle_especial') { body('1ª via – Farmácia'); pdf.addPage(); body('2ª via – Paciente'); } else body('');
  return new Blob([pdf.output()], { type: 'application/pdf' });
}
const pdfName = (doc, patient) => `${(DOCT[doc.doc_type]?.[0] || 'documento')}-${(patient.name || '').split(' ')[0] || 'paciente'}-${fDate(doc.created_at || new Date()).replace(/\//g, '-')}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase() + '.pdf';
function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
async function docBundle(docId) {
  const doc = await db.get('documents', docId); const patient = S.mode === 'patient' ? S.patient : await db.get('patients', doc.patient_id);
  const prof = S.members.find(m => m.user_id === doc.professional_id) || { full_name: doc.professional_name };
  return { doc: { ...doc, signed: !!doc.signed_file_path }, patient, prof, clinic: S.clinic };
}

/* ---------- ações: baixar, compartilhar ---------- */
act('pdfDoc', async el => { const b = await docBundle(el.dataset.id); saveBlob(await buildDocPdf(b), pdfName(b.doc, b.patient)); toast('PDF gerado.', 'ok'); });
const shareLink = token => `${location.origin}/#/d/${token}`;
async function ensureShare(docId) {
  const d = await db.get('documents', docId);
  if (d.share_token && (!d.share_expires_at || new Date(d.share_expires_at) > new Date())) return d;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
  return await db.update('documents', docId, { share_token: token, share_expires_at: addDays(new Date(), 30).toISOString() }) || { ...d, share_token: token };
}
async function shareModal(docId) {
  const b = await docBundle(docId); const d = await ensureShare(docId); const link = shareLink(d.share_token); const p = b.patient, t = (DOCT[b.doc.doc_type]?.[0] || 'documento').toLowerCase();
  const msg = `Olá, ${(p.name || '').split(' ')[0]}! Aqui está seu ${t} emitido por ${b.prof.full_name || 'seu profissional'} (${S.clinic.name}). Baixe o PDF neste link (válido por 30 dias): ${link}`;
  const mail = `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(`${DOCT[b.doc.doc_type]?.[0] || 'Documento'} – ${S.clinic.name}`)}&body=${encodeURIComponent(msg + `\n\nCódigo de verificação: ${b.doc.verify_code || ''}\n${S.clinic.name}${S.clinic.phone ? ' · ' + fPhone(S.clinic.phone) : ''}`)}`;
  modal('Documento pronto', html`<p style="margin-top:0"><b>${DOCT[b.doc.doc_type]?.[0]}</b> de <b>${p.name}</b>${b.doc.verify_code ? html` · código ${b.doc.verify_code}` : ''}</p>
    <div class="grid g2"><button class="btn primary" data-act="pdfDoc" data-id="${docId}">${icon('down')} Baixar PDF</button>
      ${p.phone ? html`<a class="btn ok" target="_blank" rel="noopener" href="${waLink(p.phone, msg)}" data-act="shareSent" data-id="${docId}" data-to="whatsapp">${icon('wa')} Enviar pelo WhatsApp</a>` : html`<button class="btn" disabled title="Paciente sem celular">${icon('wa')} WhatsApp (sem celular)</button>`}
      <a class="btn" href="${mail}" data-act="shareSent" data-id="${docId}" data-to="email">${icon('send')} Enviar por e-mail${p.email ? '' : ' (digite o endereço)'}</a>
      <button class="btn" data-act="copyText" data-t="${link}">${icon('clip')} Copiar link do paciente</button>
      <button class="btn" data-act="printDocId" data-id="${docId}">${icon('print')} Imprimir</button>
      ${S.mode === 'staff' && isClinical() ? html`<button class="btn" data-act="signDoc" data-id="${docId}">${icon('check')} Assinar com certificado</button>` : ''}</div>
    <div class="docprev" style="margin-top:12px;word-break:break-all">${link}</div>
    <p class="tiny muted">O link abre o PDF sem login e vale até ${fDate(d.share_expires_at)}. ${S.mode === 'staff' ? html`<a href="#" data-act="revokeShare" data-id="${docId}">Cancelar este link</a>.` : ''} Receitas de controle especial e de antimicrobianos em formato digital só valem na farmácia depois de assinadas com certificado ICP-Brasil.</p>`, { wide: true });
}
act('shareDoc', el => shareModal(el.dataset.id));
act('shareSent', async el => { window.open(el.href, el.dataset.to === 'email' ? '_self' : '_blank', 'noopener'); await db.update('documents', el.dataset.id, { sent_to: el.dataset.to }).catch(() => { }); });
act('revokeShare', async el => { if (!(await confirmBox('Cancelar o link? Quem tiver o endereço não consegue mais abrir o documento. Você pode gerar outro depois.', 'Cancelar link'))) return; await db.update('documents', el.dataset.id, { share_token: null, share_expires_at: null }); closeModal(); toast('Link cancelado.'); });

/* ---------- página pública do documento (link do paciente) ---------- */
pubRoute('/d/:token', async ({ token }) => {
  let v = null; try { v = await db.rpc('shared_document', { p_token: token }); } catch { }
  if (!v) return html`<div class="auth"><div class="card"><h2>Link indisponível</h2><p class="muted">Este link expirou ou foi cancelado. Peça um novo à clínica ou entre na sua área do paciente.</p><a class="btn" href="#/">Entrar</a></div></div>`;
  window.__shared = v; const c = v.clinic, d = v.doc;
  return html`<div class="auth" style="background:linear-gradient(160deg,#f6eef3,#efe6f0)"><div class="card stack" style="max-width:460px">
    ${safeLogo(c.logo_url) ? html`<img src="${c.logo_url}" alt="${c.name}" style="height:54px;align-self:flex-start">` : html`<h2>${c.name}</h2>`}
    <div><h1 style="font-size:1.25rem">${DOCT[d.doc_type]?.[0] || 'Documento'}</h1><p class="small muted" style="margin:4px 0 0">Para ${v.patient.name} · ${fDT(d.created_at)}<br>${v.prof?.full_name || d.professional_name || ''}${v.prof ? ' · ' + councilOf(v.prof) : ''}</p></div>
    <button class="btn primary block" data-act="pdfShared">${icon('down')} Baixar PDF</button>
    ${d.signed ? html`<p class="small" style="margin:0">Este documento tem versão assinada com certificado ICP-Brasil. Para baixar a versão assinada, <a href="#/">entre na sua área do paciente</a>.</p>` : ''}
    <p class="tiny muted" style="margin:0">Código de verificação: <b>${d.verify_code || ''}</b> · <a href="#/verificar/${d.verify_code}">conferir</a><br>${[c.address, c.city && c.city + (c.state ? '/' + c.state : ''), fPhone(c.phone)].filter(Boolean).join(' · ')}</p></div></div>`;
});
act('pdfShared', async () => { const v = window.__shared; if (!v) return; const blob = await buildDocPdf({ doc: v.doc, patient: v.patient, prof: v.prof || { full_name: v.doc.professional_name }, clinic: v.clinic }); saveBlob(blob, pdfName(v.doc, v.patient)); });
/* demonstração: link do paciente */
DemoRPC.shared_document = ({ p_token }) => {
  const d = Demo.load(); const doc = d.documents.find(x => x.share_token === p_token && (!x.share_expires_at || new Date(x.share_expires_at) > new Date())); if (!doc) return null;
  const p = d.patients.find(x => x.id === doc.patient_id) || {}; const m = d.clinic_members.find(x => x.user_id === doc.professional_id); const c = d.clinics[0];
  return { doc: { ...doc, signed: !!doc.signed_file_path }, patient: { name: p.name, address: p.address, city: p.city, state: p.state }, prof: m ? { full_name: m.full_name, council: m.council, council_number: m.council_number, council_uf: m.council_uf, specialty: m.specialty, profession: m.profession } : null, clinic: { name: c.name, address: c.address, city: c.city, state: c.state, phone: c.phone, email: c.email, logo_url: c.logo_url } };
};
