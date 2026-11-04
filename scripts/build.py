import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src'
html = (src / 'index.html').read_text()
css = (src / 'styles.css').read_text()
js = '\n'.join((src / f).read_text() for f in ['core.js', 'shell.js', 'pages-main.js', 'pages-record.js', 'pages-rx.js', 'pages-dental.js', 'pages-admin.js', 'pages-portal.js', 'pages-extra.js', 'pages-pdf.js', 'pages-auth.js', 'pages-weight.js', 'pages-places.js', 'pages-checkin.js'])
js = js + '\nconst GAS_CODE = ' + json.dumps((root / 'google' / 'Codigo.gs').read_text()).replace('</', '<\\/') + ';\n'
out = html.replace('/*CSS*/', css).replace('/*JS*/', js)
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'index.html').write_text(out)
icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b57b3"/><text x="32" y="41" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="800" fill="#fff">PE</text></svg>'
server = '''// PEPMH – servidor (Railway Function / Bun). Gerado por scripts/build.py — edite src/ e rode o build.
const HTML = %s;
const ICON = %s;
const URL_SB = Bun.env.SUPABASE_URL || "";
const KEY_SB = Bun.env.SUPABASE_KEY || "";
const page = HTML.replace('/*CONFIG*/{url:"",key:""}', JSON.stringify({ url: URL_SB, key: KEY_SB }).replace(/</g, "\\\\u003c"));
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://viacep.com.br https://brasilapi.com.br " + (URL_SB || ""),
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");
const sec = { "Content-Security-Policy": csp, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), microphone=(), geolocation=()" };
const manifest = JSON.stringify({ name: "PEPMH", short_name: "PEPMH", start_url: "/", display: "standalone", background_color: "#f4f6f9", theme_color: "#0b57b3", lang: "pt-BR", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] });
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/health") return new Response("ok");
    if (pathname === "/icon.svg") return new Response(ICON, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    if (pathname === "/manifest.webmanifest") return new Response(manifest, { headers: { "Content-Type": "application/manifest+json" } });
    return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", ...sec } });
  },
});
console.log("PEPMH no ar");
''' % (json.dumps(out, ensure_ascii=False), json.dumps(icon))
(dist / 'index.tsx').write_text(server)
print('ok', len(out), 'bytes html;', len(server), 'bytes server')
