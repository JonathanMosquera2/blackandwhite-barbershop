/* Instalar la app en el celular, con la guía que corresponde a cada teléfono.
   - Android con Chrome: sale la ventana oficial de "Instalar" con un toque.
   - iPhone: Apple no deja instalar con un botón, así que mostramos los 2 pasos con flechas.
   - Si el link se abrió dentro de WhatsApp, Instagram o Facebook: primero hay que pasar al navegador.
   Botones que activan esto: cualquier elemento con [data-install]. */
(function () {
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|; wv\)/i.test(ua);
    const iosOther = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);   // Chrome/Firefox/Edge en iPhone
    const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const appName = (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content || "la app";
    let evt = null;

    const SHARE = '<svg viewBox="0 0 24 24" class="ig-i"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const PLUS = '<svg viewBox="0 0 24 24" class="ig-i"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const DOTS = '<svg viewBox="0 0 24 24" class="ig-i"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';

    const css = `
    .ig-back{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:ig-f .2s both}
    .ig-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;max-width:520px;margin:0 auto;padding:22px 20px calc(22px + env(safe-area-inset-bottom));background:#111;color:#fff;border-radius:26px 26px 0 0;border-top:2px solid #d4af37;box-shadow:0 -20px 60px rgba(0,0,0,.6);font-family:inherit;animation:ig-up .32s cubic-bezier(.2,.8,.2,1) both}
    .ig-sheet h2{margin:0 0 4px;font-size:1.45rem;font-weight:900;line-height:1.1}
    .ig-sheet p.ig-lead{margin:0 0 16px;color:#a6a6a6;font-size:.95rem}
    .ig-steps{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:10px}
    .ig-steps li{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:16px;background:#1b1b1b;font-size:1.02rem;line-height:1.3}
    .ig-num{display:grid;place-items:center;width:30px;height:30px;flex:none;border-radius:50%;background:linear-gradient(120deg,#fff3b0,#d4af37 45%,#a67c00);color:#0a0a0a;font-weight:900}
    .ig-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:9px;background:#2a2a2a;border:1px solid #3a3a3a;font-weight:700;white-space:nowrap}
    .ig-i{width:1.25em;height:1.25em;color:#3b9cff;vertical-align:-.25em}
    .ig-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;border:0;border-radius:999px;font:inherit;font-weight:800;font-size:1rem;cursor:pointer;text-decoration:none}
    .ig-gold{background:linear-gradient(120deg,#fff3b0,#f0d277 18%,#d4af37 40%,#a67c00 60%,#e9c96b 80%,#fff1a8);color:#0a0a0a}
    .ig-ghost{margin-top:8px;background:transparent;color:#a6a6a6}
    .ig-sheet.ig-mid{bottom:76px;left:12px;right:12px;border-radius:26px;border:2px solid #d4af37;padding-bottom:18px}
    .ig-arrow{position:fixed;z-index:10000;font-size:44px;line-height:1;color:#f0d277;filter:drop-shadow(0 4px 10px rgba(0,0,0,.8));pointer-events:none;animation:ig-b 1s ease-in-out infinite}
    .ig-arrow.down{left:calc(50% - 22px);bottom:14px}
    .ig-arrow.up-right{top:6px;right:10px}
    .ig-toast{position:fixed;left:50%;bottom:24px;z-index:10001;transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#0a0a0a;color:#f0d277;border:1px solid #d4af37;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.5)}
    @keyframes ig-up{from{transform:translateY(100%)}} @keyframes ig-f{from{opacity:0}}
    @keyframes ig-b{50%{translate:0 10px}}
    .ig-arrow.up-right{animation-name:ig-b2} @keyframes ig-b2{50%{translate:0 -8px}}
    @media (prefers-reduced-motion:reduce){.ig-sheet,.ig-back,.ig-arrow{animation:none}}`;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    const buttons = () => document.querySelectorAll("[data-install]");
    const hideAll = () => { buttons().forEach((b) => (b.hidden = true)); document.querySelectorAll("[data-install-ios], #install-ios").forEach((p) => (p.hidden = true)); };
    const toast = (t) => { const d = document.createElement("div"); d.className = "ig-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); };

    function close() { document.querySelectorAll(".ig-back,.ig-sheet,.ig-arrow").forEach((n) => n.remove()); }
    function sheet(html, arrow) {
        close();
        const back = document.createElement("div"); back.className = "ig-back"; back.addEventListener("click", close);
        const s = document.createElement("div"); s.className = "ig-sheet" + (arrow === "down" ? " ig-mid" : ""); s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true");
        s.innerHTML = html + '<button type="button" class="ig-btn ig-ghost" data-ig-close>Ahora no</button>';
        s.querySelectorAll("[data-ig-close]").forEach((b) => b.addEventListener("click", close));
        document.body.append(back, s);
        if (arrow) { const a = document.createElement("div"); a.className = "ig-arrow " + arrow; a.textContent = arrow === "down" ? "⬇" : "⬆"; document.body.appendChild(a); }
        const f = s.querySelector(".ig-btn"); f && f.focus();
    }
    const steps = (arr) => '<ol class="ig-steps">' + arr.map((t, i) => `<li><span class="ig-num">${i + 1}</span><span>${t}</span></li>`).join("") + "</ol>";

    function guide() {
        if (inApp) {
            const url = location.href;
            if (isAndroid) {
                const intent = "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
                return sheet(`<h2>Ábrela en Chrome primero</h2><p class="ig-lead">Desde WhatsApp, Instagram o Facebook no se puede instalar. Toca el botón, se abre en Chrome y ahí la instalas en un toque.</p>
                <a class="ig-btn ig-gold" href="${intent}">Abrir en Chrome</a>`);
            }
            return sheet(`<h2>Ábrela en Safari primero</h2><p class="ig-lead">Desde WhatsApp, Instagram o Facebook no se puede instalar.</p>
            ${steps([`Toca <span class="ig-chip">⋯</span> o el ícono de la brújula 🧭`, `Escoge <span class="ig-chip">Abrir en Safari</span>`, `Ahí vuelve a tocar <b>Instala la app</b>`])}
            <button type="button" class="ig-btn ig-gold" data-copy>Copiar el link</button>`);
        }
        if (isIOS && iosOther) {
            return sheet(`<h2>Ponla en tu inicio</h2><p class="ig-lead">Son 2 toques y queda como una app más.</p>
            ${steps([`Toca ${SHARE} <b>Compartir</b>, arriba al lado de la dirección`, `Toca ${PLUS} <span class="ig-chip">Agregar a inicio</span> y luego <b>Agregar</b>`])}
            <button type="button" class="ig-btn ig-gold" data-ig-close>Entendido</button>`, "up-right");
        }
        if (isIOS) {
            return sheet(`<h2>Ponla en tu inicio</h2><p class="ig-lead">En iPhone son 3 toques. Te señalo dónde 👇</p>
            ${steps([`Toca ${SHARE} <b>Compartir</b> abajo. Si no lo ves, toca primero <span class="ig-chip">⋯</span>`, `Baja un poco y toca ${PLUS} <span class="ig-chip">Agregar a inicio</span>`, `Arriba a la derecha toca <b>Agregar</b>. ¡Listo!`])}
            <button type="button" class="ig-btn ig-gold" data-ig-close>Entendido</button>`, "down");
        }
        if (isAndroid) {
            return sheet(`<h2>Ponla en tu inicio</h2><p class="ig-lead">Son 2 toques y queda como una app más.</p>
            ${steps([`Toca ${DOTS} el menú, arriba a la derecha`, `Escoge <span class="ig-chip">Instalar app</span> o <span class="ig-chip">Agregar a pantalla principal</span>`])}
            <button type="button" class="ig-btn ig-gold" data-ig-close>Entendido</button>`, "up-right");
        }
        sheet(`<h2>Instálala en tu celular</h2><p class="ig-lead">Abre esta página en tu celular y toca <b>Instala la app</b>. En computador puedes usar el ícono de instalar en la barra de direcciones.</p>
        <button type="button" class="ig-btn ig-gold" data-ig-close>Entendido</button>`);
    }

    document.addEventListener("click", async (e) => {
        if (e.target.closest("[data-copy]")) {
            try { await navigator.clipboard.writeText(location.href); toast("Link copiado. Pégalo en Safari"); } catch { prompt("Copia este link:", location.href); }
            return;
        }
        const b = e.target.closest("[data-install]");
        if (!b) return;
        if (evt) {
            evt.prompt();
            try { const r = await evt.userChoice; if (r && r.outcome === "accepted") hideAll(); } catch {}
            evt = null;
            return;
        }
        guide();
    });
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); evt = e; });
    addEventListener("appinstalled", () => { hideAll(); close(); toast(`¡Listo! Ya tienes ${appName} en tu celular`); });

    function init() {
        if (standalone()) return hideAll();
        buttons().forEach((b) => (b.hidden = false));                 // siempre visible: el botón sabe qué hacer en cada celular
        document.querySelectorAll("[data-install-ios], #install-ios").forEach((p) => (p.hidden = true));
    }
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
    window.showInstallGuide = guide;
})();
