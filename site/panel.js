/* Panel de barberos y dueño */
{
const STATUS = {
    separado:  { label: "Separado",  cls: "st-sep" },
    atendido:  { label: "Atendido",  cls: "st-ok" },
    no_vino:   { label: "No vino",   cls: "st-no" },
    cancelado: { label: "Cancelado", cls: "st-cx" },
    bloqueado: { label: "Bloqueada", cls: "st-bl" },
};
const ALL = [...CONFIG.services, ...CONFIG.extras];
const state = { session: null, who: "", date: nowCO().date, filter: "", rows: [], seen: null, payFor: "" };
const isOwner = () => state.session?.role === "owner";
const isToday = () => state.date === nowCO().date;
const avatar = (b) => b.photo ? `<img src="${esc(b.photo)}" alt="">` : esc(b.emoji || b.name.charAt(0));
const money = (rows) => rows.reduce((a, r) => a + (r.total || 0), 0);
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch {} };

/* ---------- Entrar ---------- */
function renderWho() {
    const tiles = CONFIG.barbers.map((b) =>
        `<button type="button" class="who-btn" data-who="${esc(b.id)}"><span class="avatar">${avatar(b)}</span><strong>${esc(b.name)}</strong></button>`).join("");
    const owner = `<button type="button" class="who-btn who-owner" data-who="owner">
        <svg class="avatar avatar-sello" viewBox="0 0 120 120" aria-hidden="true"><use href="#sello"/></svg><span><strong>${esc(CONFIG.ownerName || "Administrador")}</strong><span class="who-role">Administrador</span></span></button>`;
    $("#who").innerHTML = tiles + owner;
    $("#who").addEventListener("click", (e) => {
        const b = e.target.closest(".who-btn"); if (!b) return;
        state.who = b.dataset.who; buzz();
        $$(".who-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        $("#pin-label").textContent = `Clave de ${b.querySelector("strong").textContent}`;
        $("#pin-form").hidden = false;
        $("#login-note").textContent = "";
        $("#pin").value = "";
        $("#pin").focus();
        $("#pin-form").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $("#pin-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = $("#pin-form button");
        btn.disabled = true;
        const res = await DB.login(state.who, $("#pin").value.trim()).catch(() => ({ ok: false }));
        btn.disabled = false;
        if (!res.ok || !res.session) {
            $("#login-note").textContent = "Clave incorrecta. Vuelve a intentar.";
            $("#login-note").classList.add("is-error");
            return;
        }
        state.session = res.session;
        startApp();
    });
}

/* ---------- Panel ---------- */
function startApp() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    $("#logout").hidden = false;
    $("#live").hidden = false;
    const me = barberById(state.session.barber_id);
    const m = nowCO().minutes;
    const greet = m < 720 ? "Buenos días" : m < 1140 ? "Buenas tardes" : "Buenas noches";
    $("#hello").textContent = `${greet}, ${isOwner() ? (CONFIG.ownerName || "jefe") : (me ? me.name : "")}`;
    $("#owner-box").hidden = !isOwner();
    renderDays();
    if (isOwner()) renderFilter();
    syncButtons();
    load();
}

function syncButtons() {
    $("#walkin-btn").hidden = isOwner() || !isToday();
    $("#block-btn").hidden = isOwner();
}

function renderDays() {
    const t = nowCO().date;
    const days = Array.from({ length: 10 }, (_, i) => addDays(t, i - 3));
    $("#day-strip").innerHTML = days.map((d) =>
        `<button type="button" class="day${d === state.date ? " is-on" : ""}${d === t ? " is-today" : ""}" data-date="${d}" aria-pressed="${d === state.date}">
            <span>${d === addDays(t, -1) ? "Ayer" : dateLabel(d).split(" ")[0]}</span><strong>${Number(d.slice(8))}</strong></button>`).join("");
    requestAnimationFrame(() => {
        const on = $("#day-strip .is-on");
        if (on) $("#day-strip").scrollLeft = on.offsetLeft - $("#day-strip").clientWidth / 2 + on.clientWidth / 2;
    });
}

function renderFilter() {
    $("#filter").innerHTML = `<button type="button" class="chip is-on" data-f="">Todos</button>` +
        CONFIG.barbers.map((b) => `<button type="button" class="chip" data-f="${esc(b.id)}">${esc(b.name)}</button>`).join("");
}

async function load() {
    let rows;
    try { rows = await DB.listBookings(state.date); }
    catch { $("#turns").innerHTML = `<li class="empty">No se pudieron cargar los turnos. Revisa el internet.</li>`; return; }
    if (!isOwner()) rows = rows.filter((r) => r.barber_id === state.session.barber_id);
    rows.sort((a, b) => a.time.localeCompare(b.time));

    const ids = new Set(rows.map((r) => r.id));
    if (state.seen && state.seenDate === state.date) {
        const fresh = rows.filter((r) => !state.seen.has(r.id) && r.source === "web");
        if (fresh.length) notify(fresh[0]);
    }
    state.seen = ids; state.seenDate = state.date;
    state.rows = rows;
    render();
}

/* tarjeta principal: próximo cliente (barbero) o plata del día (dueño) */
function renderHero(real, done) {
    const total = money(done);
    if (isOwner()) {
        const label = isToday() ? "Hoy van" : `El ${longDate(state.date)}`;
        const pending = real.filter((r) => r.status === "separado").length;
        $("#hero-card").innerHTML = `<p class="hero-k">${esc(label)}</p>
            <p class="hero-money">${cop(total)}</p>
            <p class="hero-sub">${done.length} ${done.length === 1 ? "cliente atendido" : "clientes atendidos"}${pending ? `, ${pending} ${pending === 1 ? "turno pendiente" : "turnos pendientes"}` : ""}</p>`;
        return;
    }
    const now = nowCO().minutes;
    const next = isToday()
        ? real.find((r) => r.status === "separado" && toMin(r.time) >= now - 15)
        : real.find((r) => r.status === "separado");
    let nextHtml;
    if (next) {
        const diff = toMin(next.time) - now;
        const when = !isToday() ? to12(next.time) : diff <= 0 ? "Ya debería estar aquí" : diff < 60 ? `En ${diff} min` : `A las ${to12(next.time)}`;
        nextHtml = `<p class="hero-k">${isToday() ? "Tu próximo cliente" : "Tu primer turno ese día"}</p>
            <p class="hero-name">${esc(next.client_name)}</p>
            <p class="hero-when"><strong>${esc(when)}</strong>${isToday() && diff > 0 && diff < 60 ? `, a las ${to12(next.time)}` : ""}</p>
            <p class="hero-sub">${esc((next.services || []).join(", "))}, ${cop(next.total)}</p>`;
    } else {
        nextHtml = `<p class="hero-k">${isToday() ? "Tu próximo cliente" : "Ese día"}</p>
            <p class="hero-name hero-none">${isToday() ? "Sin turnos pendientes" : "Sin turnos separados"}</p>
            <p class="hero-sub">${isToday() ? "Cuando alguien separe contigo, aparece aquí y suena." : "Todavía nadie ha separado para ese día."}</p>`;
    }
    $("#hero-card").innerHTML = `${nextHtml}<div class="hero-foot"><span>Plata ${isToday() ? "hoy" : "ese día"}</span><strong>${cop(total)}</strong></div>`;
}

function render() {
    const rows = state.filter ? state.rows.filter((r) => r.barber_id === state.filter) : state.rows;
    const real = state.rows.filter((r) => r.status !== "bloqueado" && r.status !== "cancelado");
    const done = real.filter((r) => r.status === "atendido");
    const noshow = real.filter((r) => r.status === "no_vino");
    const web = real.filter((r) => r.source === "web");
    const walkins = real.filter((r) => r.source === "paso");
    renderHero(real, done);
    $("#stats").innerHTML = [["Por la página", web.length], ["De paso", walkins.length], ["No vinieron", noshow.length]]
        .map(([k, v]) => `<div class="stat"><strong>${v}</strong><span>${k}</span></div>`).join("");

    if (isOwner()) {
        const per = CONFIG.barbers.map((b) => {
            const mine = real.filter((r) => r.barber_id === b.id);
            const ok = mine.filter((r) => r.status === "atendido");
            return { b, plata: money(ok), web: mine.filter((r) => r.source === "web").length, walk: mine.filter((r) => r.source === "paso").length, ok: ok.length };
        }).sort((x, y) => y.plata - x.plata);
        const max = Math.max(1, ...per.map((p) => p.plata));
        $("#bars").innerHTML = per.map((p, i) => `<div class="bar-row${i === 0 && p.plata ? " is-top" : ""}">
            <span class="avatar avatar-sm">${avatar(p.b)}</span>
            <div class="bar-main">
                <div class="bar-line"><strong>${esc(p.b.name)}</strong><span class="bar-money">${cop(p.plata)}</span></div>
                <div class="bar-track"><span style="width:${Math.round((p.plata / max) * 100)}%"></span></div>
                <p class="bar-meta">${p.web} por la página, ${p.walk} de paso, ${p.ok} atendidos</p>
            </div></div>`).join("");
        const byPay = {};
        done.forEach((r) => { const k = r.payment || "Sin anotar"; byPay[k] = (byPay[k] || 0) + (r.total || 0); });
        $("#by-pay").innerHTML = Object.keys(byPay).length
            ? Object.entries(byPay).map(([k, v]) => `<div class="pay-chip"><span>${esc(k)}</span><strong>${cop(v)}</strong></div>`).join("")
            : `<p class="muted">Todavía no hay pagos registrados este día.</p>`;
    }

    $("#list-title").textContent = isToday() ? "Clientes de hoy" : `Clientes del ${longDate(state.date)}`;
    $("#turns").innerHTML = rows.length
        ? rows.map(turnCard).join("")
        : `<li class="empty">No hay turnos ni clientes registrados este día.</li>`;
}

function turnCard(r) {
    const st = STATUS[r.status] || STATUS.separado;
    const barber = barberById(r.barber_id);
    const who = isOwner() && barber ? `<p class="turn-barber"><span class="avatar avatar-xs">${avatar(barber)}</span>${esc(barber.name)}</p>` : "";
    if (r.status === "bloqueado") {
        return `<li class="turn is-block"><time>${to12(r.time)}</time><div class="turn-body">
            <p class="turn-name">Hora bloqueada</p>${who}
            <div class="turn-actions"><button type="button" class="act" data-id="${esc(r.id)}" data-st="cancelado">Desbloquear</button></div></div></li>`;
    }
    if (r.source === "paso") {
        return `<li class="turn is-walk ${st.cls}"><time>${to12(r.time)}</time><div class="turn-body">
            <div class="turn-top"><p class="turn-name">${esc(r.client_name)}</p><span class="pill pill-walk">De paso</span></div>${who}
            <p class="turn-services">${esc((r.services || []).join(", "))} <strong>${cop(r.total)}</strong>${r.payment ? ` <span class="turn-pay">${esc(r.payment)}</span>` : ""}</p>
            <div class="turn-actions">${r.status === "cancelado"
                ? `<button type="button" class="act" data-id="${esc(r.id)}" data-st="atendido">Deshacer</button>`
                : `<button type="button" class="act" data-id="${esc(r.id)}" data-st="cancelado">Borrar (me equivoqué)</button>`}</div></div></li>`;
    }
    const wa = r.client_phone ? `https://wa.me/57${encodeURIComponent(r.client_phone)}?text=${encodeURIComponent(
        `Hola ${r.client_name}, te escribimos de ${CONFIG.name} por tu turno de las ${to12(r.time)}.`)}` : "";
    let actions;
    if (state.payFor === r.id) {
        actions = `<div class="pay-ask"><span>¿Cómo pagó?</span>${CONFIG.payments.map((m) =>
            `<button type="button" class="act act-ok" data-id="${esc(r.id)}" data-st="atendido" data-pay="${esc(m)}">${esc(m)}</button>`).join("")}
            <button type="button" class="act" data-id="${esc(r.id)}" data-st="close-pay">Volver</button></div>`;
    } else if (r.status === "separado") {
        actions = `<button type="button" class="act act-ok" data-id="${esc(r.id)}" data-st="ask-pay">${icon("check")} Atendido</button>
            <button type="button" class="act" data-id="${esc(r.id)}" data-st="no_vino">No vino</button>
            <button type="button" class="act" data-id="${esc(r.id)}" data-st="cancelado">Cancelar</button>`;
    } else {
        actions = `<button type="button" class="act" data-id="${esc(r.id)}" data-st="separado">Deshacer</button>`;
    }
    return `<li class="turn ${st.cls}"><time>${to12(r.time)}</time><div class="turn-body">
        <div class="turn-top"><p class="turn-name">${esc(r.client_name)}</p><span class="pill">${st.label}</span></div>${who}
        <p class="turn-services">${esc((r.services || []).join(", "))} <strong>${cop(r.total)}</strong>${r.payment && r.status === "atendido" ? ` <span class="turn-pay">${esc(r.payment)}</span>` : ""}</p>
        ${r.client_phone ? `<p class="turn-phone">${icon("phone")} ${esc(r.client_phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"))}
            <a href="${wa}" target="_blank" rel="noopener">${icon("whatsapp")} Escribirle</a></p>` : ""}
        <div class="turn-actions">${actions}</div></div></li>`;
}

/* ---------- Bloquear horas ---------- */
function renderBlockSlots() {
    const taken = new Set(state.rows.filter((r) => ["separado", "atendido", "bloqueado"].includes(r.status)).map((r) => r.time));
    const slots = slotsFor(state.date);
    $("#block-slots").innerHTML = slots.length
        ? slots.map((t) => `<button type="button" class="slot" data-time="${t}" ${taken.has(t) ? "disabled" : ""}>${to12(t)}</button>`).join("")
        : `<p class="muted">No quedan horas para bloquear este día.</p>`;
}

/* ---------- Cliente de paso ---------- */
const walk = { items: new Set(), pay: "" };
const parseMoney = (v) => Number(String(v).replace(/\D/g, "")) || 0;
function openWalkIn() {
    walk.items = new Set(CONFIG.services.length ? [CONFIG.services[0].id] : []);
    walk.pay = CONFIG.payments[0] || "";
    $("#walkin-services").innerHTML = ALL.map((s) =>
        `<button type="button" class="chip" data-s="${esc(s.id)}">${esc(s.name)} <small>${cop(s.price)}</small></button>`).join("");
    $("#walkin-pay").innerHTML = CONFIG.payments.map((p) => `<button type="button" class="chip" data-p="${esc(p)}">${esc(p)}</button>`).join("");
    $("#walkin-name").value = "";
    $("#walkin-note").textContent = "";
    $("#walkin-note").classList.remove("is-error");
    paintWalkIn(true);
    $("#walkin-form").hidden = false;
    $("#block-picker").hidden = true;
    $("#walkin-form").scrollIntoView({ behavior: "smooth", block: "start" });
}
function paintWalkIn(resetTotal) {
    $$("#walkin-services .chip").forEach((c) => { const on = walk.items.has(c.dataset.s); c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on); });
    $$("#walkin-pay .chip").forEach((c) => { const on = c.dataset.p === walk.pay; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on); });
    if (resetTotal) $("#walkin-total").value = cop(ALL.filter((s) => walk.items.has(s.id)).reduce((a, s) => a + s.price, 0));
}
$("#walkin-btn").addEventListener("click", openWalkIn);
$("#walkin-close").addEventListener("click", () => { $("#walkin-form").hidden = true; });
$("#walkin-services").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    walk.items.has(c.dataset.s) ? walk.items.delete(c.dataset.s) : walk.items.add(c.dataset.s);
    buzz(); paintWalkIn(true);
});
$("#walkin-pay").addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; walk.pay = c.dataset.p; buzz(); paintWalkIn(false); });
$("#walkin-total").addEventListener("blur", () => { $("#walkin-total").value = cop(parseMoney($("#walkin-total").value)); });
$("#walkin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#walkin-note");
    const items = ALL.filter((s) => walk.items.has(s.id));
    const total = parseMoney($("#walkin-total").value);
    if (!items.length) { note.textContent = "Toca lo que le hiciste."; note.classList.add("is-error"); return; }
    const now = nowCO();
    const exact = fromMin(now.minutes);
    const slotM = Math.floor(now.minutes / CONFIG.slotMinutes) * CONFIG.slotMinutes;
    const h = CONFIG.hours[dayOf(state.date)];
    const slot = isToday() && h && slotM >= toMin(h[0]) && slotM + CONFIG.slotMinutes <= toMin(h[1]) ? fromMin(slotM) : "";
    const btn = $("#walkin-form button[type=submit]");
    btn.disabled = true;
    const res = await DB.addWalkIn({ barber_id: state.session.barber_id, date: state.date, slot,
        exact: exact === slot ? fromMin(now.minutes + 1) : exact,
        client_name: $("#walkin-name").value.trim() || "Cliente de paso", services: items.map((s) => s.name), total, payment: walk.pay })
        .catch(() => ({ ok: false }));
    btn.disabled = false;
    if (!res.ok) { note.textContent = "No se pudo guardar. Revisa el internet y vuelve a intentar."; note.classList.add("is-error"); return; }
    $("#walkin-form").hidden = true;
    await load();
    toast(`Guardado: ${cop(total)}${res.time === slot ? `. Bloqueé las ${to12(slot)} en la página` : ""}`);
});

/* ---------- Avisos ---------- */
let audioCtx = null;
function beep() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        [0, .18].forEach((t) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
            g.gain.setValueAtTime(.2, audioCtx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + t + .15);
            o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .16);
        });
    } catch {}
}
function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 6000);
}
function notify(r) {
    const b = barberById(r.barber_id);
    toast(`Turno nuevo: ${r.client_name} a las ${to12(r.time)}${isOwner() && b ? ` con ${b.name}` : ""}`);
    beep();
    try { navigator.vibrate && navigator.vibrate([20, 80, 20]); } catch {}
}

/* ---------- Eventos ---------- */
$("#day-strip").addEventListener("click", (e) => {
    const d = e.target.closest(".day"); if (!d) return;
    state.date = d.dataset.date; buzz();
    $$("#day-strip .day").forEach((x) => { const on = x === d; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on); });
    $("#block-picker").hidden = true;
    $("#walkin-form").hidden = true;
    syncButtons();
    load();
});
$("#filter").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    state.filter = c.dataset.f;
    $$("#filter .chip").forEach((x) => x.classList.toggle("is-on", x === c));
    render();
});
$("#turns").addEventListener("click", async (e) => {
    const b = e.target.closest(".act"); if (!b) return;
    const { id, st, pay } = b.dataset;
    buzz();
    if (st === "ask-pay") { state.payFor = id; render(); return; }
    if (st === "close-pay") { state.payFor = ""; render(); return; }
    b.disabled = true;
    const extra = st === "separado" ? { payment: null } : pay ? { payment: pay } : {};
    try { await DB.setStatus(id, st, extra); }
    catch { toast("No se pudo guardar. Revisa el internet."); }
    state.payFor = "";
    await load();
    if (pay) toast(`Atendido, pagó con ${pay}`);
});
$("#block-btn").addEventListener("click", () => { $("#block-picker").hidden = false; $("#walkin-form").hidden = true; renderBlockSlots(); });
$("#block-close").addEventListener("click", () => { $("#block-picker").hidden = true; });
$("#block-slots").addEventListener("click", async (e) => {
    const s = e.target.closest(".slot"); if (!s || s.disabled) return;
    s.disabled = true;
    await DB.blockSlot(state.session.barber_id, state.date, s.dataset.time);
    await load();
    renderBlockSlots();
    toast(`Bloqueaste las ${to12(s.dataset.time)}`);
});
$("#logout").addEventListener("click", async () => {
    await DB.logout();
    state.session = null; state.seen = null;
    $("#app-view").hidden = true; $("#logout").hidden = true; $("#live").hidden = true; $("#login-view").hidden = false;
    $("#pin-form").hidden = true; $$(".who-btn").forEach((x) => x.classList.remove("is-on"));
});
document.addEventListener("click", () => { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch {} }, { once: true });

/* ---------- Instalar la app B&W Barberos ---------- */
/* la lógica de instalar está en install.js */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

/* ---------- Arranque ---------- */
(async () => {
    if (DB.mode === "demo") $("#demo-bar").hidden = false;
    paintIcons();
    renderWho();
    state.session = await DB.session().catch(() => null);
    if (state.session) startApp(); else $("#login-view").hidden = false;
    DB.onChange(() => { if (state.session) load(); });
    setInterval(() => { if (state.session) load(); }, 30000);
})();
}
