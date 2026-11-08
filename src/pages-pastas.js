/* ===== Pastas dos PDFs (Configurações) =====
   Cada computador escolhe onde salvar receitas, atestados e os demais arquivos gerados.
   Usa a File System Access API (Chrome/Edge no computador). A escolha fica guardada só neste
   navegador (IndexedDB), porque a pasta é do disco desta máquina. Sem suporte ou sem pasta
   escolhida, o arquivo vai para Downloads como antes. */
const PDF_KINDS = [
  ['padrao', 'Pasta geral', 'Usada para tudo o que não tiver pasta própria.', null],
  ['receitas', 'Receitas', 'Receituário, receita de manipulado e pedido de medicação.', 'Receitas'],
  ['atestados', 'Atestados', '', 'Atestados'],
  ['declaracoes', 'Declarações', '', 'Declarações'],
  ['exames', 'Pedidos de exames', 'Laboratoriais e de imagem.', 'Exames'],
  ['encaminhamentos', 'Encaminhamentos e cirurgias', 'Cartas, encaminhamentos e solicitações de cirurgia.', 'Encaminhamentos'],
  ['laudos', 'Laudos', '', 'Laudos'],
  ['assinados', 'PDFs assinados', 'Vazia: o assinado vai para a pasta do tipo (receita, atestado…).', 'Assinados'],
  ['relatorios', 'Relatórios e planilhas', 'Financeiro, livro-caixa e lista de pacientes.', 'Relatórios'],
];
const DOC_KIND = { receituario: 'receitas', manipulado: 'receitas', medicacao: 'receitas', atestado: 'atestados', declaracao: 'declaracoes', exames: 'exames', imagem: 'exames', carta: 'encaminhamentos', cirurgia: 'encaminhamentos', laudo: 'laudos' };
const PDF_OPTS0 = { porTipo: true, porPaciente: false, porMes: false, copiaImpressao: true, assinadosAuto: true, naoAssinado: false, perguntar: false };
const kindInfo = k => PDF_KINDS.find(x => x[0] === k) || PDF_KINDS[0];
const safeFolder = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 80) || 'Sem nome';

const PdfDirs = {
  supported: () => typeof window.showDirectoryPicker === 'function',
  async db() { return new Promise((ok, bad) => { const r = indexedDB.open('pepmh-pastas', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); }); },
  async kv(key, val, del) {
    try {
      const d = await this.db(); const mode = val === undefined && !del ? 'readonly' : 'readwrite';
      return await new Promise(ok => { const t = d.transaction('kv', mode), s = t.objectStore('kv'); const q = del ? s.delete(key) : val === undefined ? s.get(key) : s.put(val, key); q.onsuccess = () => ok(q.result ?? null); q.onerror = () => ok(null); });
    } catch { return null; }
  },
  get(k) { return this.kv('dir:' + k); },
  set(k, h) { return this.kv('dir:' + k, h); },
  del(k) { return this.kv('dir:' + k, undefined, true); },
  async opts() { return { ...PDF_OPTS0, ...((await this.kv('opts')) || {}) }; },
  async setOpts(o) { await this.kv('opts', { ...(await this.opts()), ...o }); },
  async perm(h, ask) {
    try { if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true; if (ask && (await h.requestPermission({ mode: 'readwrite' })) === 'granted') return true; } catch { }
    return false;
  },
  /* acha a pasta: a do tipo, a alternativa (tipo do documento, para os assinados) ou a geral com subpasta */
  async resolve(kind, alt, ask) {
    const o = await this.opts();
    for (const k of [kind, alt].filter(Boolean)) { const h = await this.get(k); if (h) return { h, sub: [], o, k }; }
    const h = await this.get('padrao'); if (!h) return { o };
    const sub = o.porTipo && kind !== 'padrao' ? [kindInfo(alt || kind)[3]].filter(Boolean) : [];
    return { h, sub, o, k: 'padrao' };
  },
  async uniqueName(dir, name) {
    const dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 1; i < 500; i++) { const n = i === 1 ? name : `${base} (${i})${ext}`; try { await dir.getFileHandle(n); } catch { return n; } }
    return `${base}-${Date.now()}${ext}`;
  },
  async write(dir, name, blob) { const fh = await dir.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close(); },
};

/* Salva um arquivo gerado. meta: { kind, alt, patient, ask=true, fallback=true, quiet=false }
   Retorna { where: 'folder'|'download'|'none', path?, reason? } */
async function saveOut(blob, name, meta = {}) {
  const { kind = 'padrao', alt, patient, ask = true, fallback = true, quiet = false } = meta;
  const down = (msg) => { if (fallback) { saveBlob(blob, name); if (!quiet) toast(msg || 'Arquivo baixado (pasta Downloads).', 'ok'); return { where: 'download' }; } return null; };
  if (S.mode !== 'staff' || !PdfDirs.supported()) return down() || { where: 'none', reason: 'unsupported' };
  const r = await PdfDirs.resolve(kind, alt, ask); const o = r.o;
  if (o.perguntar && ask && typeof window.showSaveFilePicker === 'function') {
    const pdf = /pdf/.test(blob.type) || /\.pdf$/i.test(name);
    try {
      const fh = await window.showSaveFilePicker({ suggestedName: name, startIn: r.h || 'documents', types: [pdf ? { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } } : { description: 'Planilha CSV', accept: { 'text/csv': ['.csv'] } }] });
      const w = await fh.createWritable(); await w.write(blob); await w.close(); if (!quiet) toast(`Salvo como ${fh.name}.`, 'ok'); return { where: 'folder', path: fh.name };
    } catch (e) { if (e.name === 'AbortError') return { where: 'none', reason: 'cancel' }; /* segue o caminho normal */ }
  }
  if (!r.h) return down() || { where: 'none', reason: 'nofolder' };
  if (!(await PdfDirs.perm(r.h, ask))) {
    return down(`Não tenho permissão na pasta "${r.h.name}" agora, então baixei em Downloads. Em Configurações → Pastas dos PDFs, clique em Liberar acesso.`) || { where: 'none', reason: 'perm' };
  }
  try {
    const parts = [...r.sub, ...(o.porPaciente && patient ? [safeFolder(patient)] : []), ...(o.porMes ? [new Date().toISOString().slice(0, 7)] : [])];
    let dir = r.h; for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
    const n = await PdfDirs.uniqueName(dir, name); await PdfDirs.write(dir, n, blob);
    const path = [r.h.name, ...parts, n].join(' › ');
    if (!quiet) toast(`Salvo em ${path}`, 'ok'); return { where: 'folder', path };
  } catch (e) {
    return down(`Não consegui gravar em "${r.h.name}" (${e.message}). Baixei em Downloads.`) || { where: 'none', reason: 'error' };
  }
}

/* ---------- cartão em Configurações ---------- */
async function pastasCard() {
  if (S.mode !== 'staff') return '';
  const sup = PdfDirs.supported(), o = await PdfDirs.opts();
  const rows = []; let geral = null, faltaPerm = false;
  for (const [k, label, desc, sub] of PDF_KINDS) {
    const h = sup ? await PdfDirs.get(k) : null; const ok = h ? await PdfDirs.perm(h, false) : false; if (h && !ok) faltaPerm = true;
    if (k === 'padrao') geral = h;
    const destino = h ? html`<b>${h.name}</b> ${ok ? html`<span class="pill ok">liberada</span>` : html`<span class="pill warn">precisa liberar</span>`}`
      : k === 'padrao' ? html`<span class="muted">Downloads (nenhuma escolhida)</span>`
        : k === 'assinados' ? html`<span class="muted">pasta do tipo do documento</span>`
          : geral ? html`<span class="muted">${geral.name}${o.porTipo && sub ? ' › ' + sub : ''}</span>` : html`<span class="muted">Downloads</span>`;
    rows.push(html`<div class="li small wrap" style="gap:6px"><span class="grow" style="min-width:180px"><b>${label}</b>${desc ? html`<span class="tiny muted" style="display:block">${desc}</span>` : ''}<span style="display:block;margin-top:2px">${icon('file')} ${destino}</span></span>
      ${sup ? html`<span class="row" style="gap:4px"><button class="btn sm ${h ? '' : 'primary'}" data-act="pickPasta" data-k="${k}">${h ? 'Trocar' : 'Escolher pasta'}</button>${h ? html`<button class="btn sm ghost danger" data-act="delPasta" data-k="${k}" title="Deixar sem pasta">${icon('x')}</button>` : ''}</span>` : ''}</div>`);
  }
  const chk = (n, t) => html`<label class="check"><input type="checkbox" data-change="pastaOpt" name="${n}" ${o[n] ? 'checked' : ''} ${sup ? '' : 'disabled'}> ${t}</label>`;
  return html`<div class="card" id="sec-pastas"><h2>${icon('file')} Pastas dos PDFs</h2>
    <p class="small muted">Escolha onde o PEPMH guarda receitas, atestados e os outros arquivos que ele gera. A escolha vale para este computador e este navegador; em outro computador, configure lá também.</p>
    ${sup ? '' : html`<div class="pill warn" style="white-space:normal;margin:8px 0">Este navegador não deixa escolher pastas. No computador, use o Google Chrome ou o Microsoft Edge. Enquanto isso, os arquivos continuam indo para Downloads.</div>`}
    ${faltaPerm ? html`<div class="tip" style="margin:8px 0">${icon('bulb')}<span>Por segurança o navegador pede de novo a permissão das pastas depois que ele é fechado. <button class="btn sm primary" data-act="unlockPastas">Liberar acesso</button> Na janela que abrir, prefira <b>Permitir em todas as visitas</b> para não precisar repetir.</span></div>` : ''}
    <div class="list" style="margin-top:10px">${rows}</div>
    <h3 style="margin-top:14px">Como organizar</h3>
    <div class="stack" style="margin-top:6px">
      ${chk('porTipo', 'Dentro da pasta geral, separar em subpastas por tipo (Receitas, Atestados, Exames…)')}
      ${chk('porPaciente', 'Criar uma subpasta com o nome do paciente')}
      ${chk('porMes', 'Criar uma subpasta por mês (ex.: 2026-11)')}
      ${chk('copiaImpressao', 'Ao imprimir um documento, guardar também uma cópia em PDF na pasta')}
      ${chk('assinadosAuto', 'Quando o PDF assinado chegar no PEPMH, guardar uma cópia dele na pasta')}
      ${chk('naoAssinado', 'Guardar também a versão sem assinatura que vai para o Acrobat')}
      ${chk('perguntar', 'Perguntar onde salvar toda vez (a pasta configurada aparece como sugestão)')}
    </div>
    ${sup ? html`<div class="row wrap" style="margin-top:12px"><button class="btn" data-act="testPasta">${icon('check')} Testar: salvar um PDF de teste</button></div>` : ''}
    <p class="tiny muted" style="margin-top:8px">O Windows não deixa o navegador usar direto a Área de Trabalho, Downloads ou Documentos. Crie uma pasta dentro, por exemplo <b>Documentos\\PEPMH</b>, e escolha ela. Se a mesma pasta for a pasta de assinatura, sem problema: o PEPMH só pega os PDFs que já vêm assinados. Documentos impressos pela janela do navegador (orçamento, anamnese, odontograma, prontuário) continuam saindo pela impressão; para eles, use <b>Salvar como PDF</b> na janela de impressão.</p></div>`;
}

act('pickPasta', async el => {
  const k = el.dataset.k; if (!PdfDirs.supported()) throw new Error('Use o Google Chrome ou o Microsoft Edge no computador para escolher pastas.');
  const cur = await PdfDirs.get(k); let h;
  try { h = await window.showDirectoryPicker({ id: 'pepmh-pasta-' + k, mode: 'readwrite', startIn: cur || 'documents' }); }
  catch (e) { if (e.name === 'AbortError') return; throw new Error('O navegador não liberou essa pasta. Crie uma pasta dentro de Documentos (por exemplo Documentos\\PEPMH) e escolha ela.'); }
  if (!(await PdfDirs.perm(h, true))) throw new Error('Sem permissão para gravar nessa pasta.');
  await PdfDirs.set(k, h); toast(`${kindInfo(k)[1]}: agora salva em "${h.name}".`, 'ok'); router();
});
act('delPasta', async el => { await PdfDirs.del(el.dataset.k); toast(`${kindInfo(el.dataset.k)[1]}: pasta removida.`); router(); });
act('unlockPastas', async () => {
  let n = 0, f = 0; const vistos = new Set();
  for (const [k] of PDF_KINDS) { const h = await PdfDirs.get(k); if (!h) continue; let dup = false; for (const v of vistos) if (await v.isSameEntry(h).catch(() => false)) dup = true; if (dup) continue; vistos.add(h); (await PdfDirs.perm(h, true)) ? n++ : f++; }
  toast(f ? `${n} pasta(s) liberada(s), ${f} sem permissão.` : 'Pastas liberadas.', f ? 'bad' : 'ok'); router();
});
onInput('pastaOpt', async el => { await PdfDirs.setOpts({ [el.name]: el.checked }); toast('Preferência salva.'); if (el.name === 'porTipo') router(); });
function tinyPdf(text) {
  const s = `BT /F1 16 Tf 60 780 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${s.length} >>\nstream\n${s}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}
act('testPasta', async () => {
  const r = await saveOut(tinyPdf(`PEPMH - teste de pasta - ${new Date().toLocaleString('pt-BR')}`), 'teste-pepmh.pdf', { kind: 'receitas', patient: 'Paciente Teste', quiet: true });
  if (r.where === 'folder') modal('Teste concluído', html`<p style="margin-top:0">${icon('check')} O PDF de teste foi salvo em:</p><div class="docprev" style="word-break:break-all">${r.path}</div><p class="small muted">Ele foi para o lugar das receitas. Pode apagar o arquivo depois.</p><button class="btn" data-act="closeModal">Fechar</button>`);
  else if (r.where === 'download') toast('Nenhuma pasta escolhida para receitas: o teste foi para Downloads.', 'bad');
});
