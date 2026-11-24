/* Página de clientes (versión app). Los datos se cambian en config.js */
{
const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const TITLES = { 1: "¿Con quién?", 2: "¿Qué te vas a hacer?", 3: "¿Cuándo?", 4: "Tus datos", 5: "Turno separado" };
const ALL_SERVICES = [...CONFIG.services, ...CONFIG.extras];
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch {} };
const avatarHtml = (b) => b.photo ? `<img src="${esc(b.photo)}" alt="">` : esc(b.emoji || b.name.charAt(0));

/* =========================================================
   Textos, horario, precios, ubicación
   ========================================================= */
function fillTexts() {
    $$("[data-config]").forEach((el) => { const v = CONFIG[el.dataset.config]; if (v) el.textContent = v; });
    document.title = CONFIG.name;
    $("#year").textContent = new Date().getFullYear();
    if (DB.mode === "demo") $("#demo-bar").hidden = false;
}

function updateStatus() {
    const { day, minutes } = nowCO();
    const h = CONFIG.hours[day];
    const open = h && minutes >= toMin(h[0]) && minutes < toMin(h[1]);
    $("#status").classList.toggle("is-open", !!open);
    let t = "";
    if (open) t = `Abierto ahora, hasta las ${to12(h[1])}`;
    else if (h && minutes < toMin(h[0])) t = `Cerrado, abrimos hoy a las ${to12(h[0])}`;
    else for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        if (CONFIG.hours[d]) { t = `Cerrado, abrimos ${i === 1 ? "mañana" : "el " + DAYS[d].toLowerCase()} a las ${to12(CONFIG.hours[d][0])}`; break; }
    }
    $("#status-text").textContent = t;
}

function renderHours() {
    const today = nowCO().day;
    $("#hours-list").innerHTML = WEEK.map((d) => {
        const h = CONFIG.hours[d];
        return `<li class="${d === today ? "today" : ""}"><span>${DAYS[d]}${d === today ? " (hoy)" : ""}</span><span>${h ? `${to12(h[0])} a ${to12(h[1])}` : "Cerrado"}</span></li>`;
    }).join("");
}

// "Corte (incluye mascarilla negra)" → título "Corte" + nota "Incluye mascarilla negra"
const splitName = (n) => { const m = n.match(/^(.*?)\s*\((.*)\)\s*$/); return m ? [m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)] : [n, ""]; };
function renderMenu() {
    const main = CONFIG.services.map((s, i) => { const [t, note] = splitName(s.name); return `<div class="menu-row${i === 0 ? " is-main" : ""}">
        <h3>${esc(t)}</h3><span class="menu-price">${cop(s.price)}</span>${note ? `<p>${esc(note)}</p>` : ""}</div>`; });
    const extras = CONFIG.extras.map((x) => `<div class="menu-row">
        <h3>${esc(x.name)}</h3><span class="menu-price"><span class="menu-plus">+</span>${cop(x.price)}</span>
        <p>Con el corte o solo.</p></div>`);
    $("#menu").innerHTML = [...main, ...extras].join("");
}

function renderVisit() {
    const q = encodeURIComponent(`${CONFIG.name}, ${CONFIG.address}`);
    $("#map-frame").src = `https://maps.google.com/maps?q=${q}&z=17&output=embed`;
    $("#map-link").href = CONFIG.mapLink || `https://www.google.com/maps/search/?api=1&query=${q}`;
    $("#payments").innerHTML = CONFIG.payments.map((p) => `<span>${esc(p)}</span>`).join("");
    const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Hola 👋")}`;
    $("#wa-link").href = wa;
    $("#whatsapp-float").href = wa;
    $("#social-links").innerHTML = Object.entries(CONFIG.social).filter(([, u]) => u)
        .map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`).join("");
    if (CONFIG.gallery.length) {
        $("#trabajos").hidden = false;
        $("#gallery").innerHTML = CONFIG.gallery.map((g) => `<button type="button"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy"></button>`).join("");
    }
}

/* =========================================================
   ¿Quién está libre hoy? (en vivo)
   ========================================================= */
let todayTaken = [];
function nextFree(barber, date, taken) {
    if (!worksOn(barber, date)) return { kind: "off" };
    const t = slotsFor(date).find((s) => !taken.some((x) => x.barber_id === barber.id && x.time === s));
    return t ? { kind: "free", time: t } : { kind: "full" };
}

async function loadToday() {
    try { todayTaken = await DB.takenSlots(nowCO().date); } catch { todayTaken = []; }
    renderRail();
}

function renderRail() {
    const today = nowCO().date;
    const list = CONFIG.barbers.map((b) => ({ b, nf: nextFree(b, today, todayTaken) }));
    const rank = (x) => x.nf.kind === "free" ? toMin(x.nf.time) : x.nf.kind === "full" ? 1e5 : 2e5;
    list.sort((a, b) => rank(a) - rank(b));
    const firstFree = list.find((x) => x.nf.kind === "free");
    $("#rail").innerHTML = list.map(({ b, nf }) => {
        const when = nf.kind === "free"
            ? `<div class="free-when"><small>${toMin(nf.time) - nowCO().minutes <= CONFIG.slotMinutes ? "Libre ya, próximo turno" : "Libre desde las"}</small><strong>${to12(nf.time)}</strong></div>`
            : nf.kind === "full"
                ? `<div class="free-when is-muted"><small>Hoy</small><strong>Lleno</strong></div>`
                : `<div class="free-when is-muted"><small>Hoy</small><strong>No viene</strong></div>`;
        const days = WEEK.map((d) => `<span class="${b.days.includes(d) ? "on" : ""}" title="${DAYS[d]}">${DAY_LETTERS[d]}</span>`).join("");
        return `<article class="free-card${nf.kind === "free" ? " is-free" : ""}${firstFree && firstFree.b === b ? " is-first" : ""}">
            ${firstFree && firstFree.b === b ? `<span class="tag">El más pronto</span>` : ""}
            <div class="free-top"><span class="avatar">${avatarHtml(b)}</span>
                <div><p class="free-name">${esc(b.name)}</p>${b.specialty ? `<p class="free-spec">${esc(b.specialty)}</p>` : ""}</div></div>
            ${when}
            <div class="free-days" aria-label="Días que trabaja">${days}</div>
            <div class="free-actions">
                <button type="button" class="btn ${nf.kind === "free" ? "btn-gold" : "btn-white"}" data-book data-barber="${esc(b.id)}">
                    ${nf.kind === "free" ? (b.whatsapp ? "Separar turno" : `Separar con ${esc(b.name)}`) : "Separar otro día"}</button>
                ${b.whatsapp ? `<a class="free-wa" href="https://wa.me/${encodeURIComponent(b.whatsapp)}?text=${encodeURIComponent(`Hola ${b.name} 👋`)}" target="_blank" rel="noopener" aria-label="Escribirle a ${esc(b.name)} por WhatsApp">${icon("whatsapp")}</a>` : ""}
            </div>
        </article>`;
    }).join("");
    const freeCount = list.filter((x) => x.nf.kind === "free").length;
    $("#libres-sub").textContent = freeCount
        ? `${freeCount} de ${list.length} barberos tienen espacio hoy. Toca uno para separar con él.`
        : "Hoy ya no quedan turnos por la página. Sepárale para otro día o llega y haz fila.";
    $("#live-text").textContent = `En vivo, actualizado a las ${to12(fromMin(nowCO().minutes))}`;
    if (firstFree) $("#next-free-btn").textContent = `Próximo libre: ${firstFree.b.name}, ${to12(firstFree.nf.time)}`;
}

$$(".rail-btn").forEach((btn) => btn.addEventListener("click", () => {
    $("#rail").scrollBy({ left: Number(btn.dataset.rail) * $("#rail").clientWidth * .8, behavior: "smooth" });
}));

/* =========================================================
   Ventana paso a paso para separar turno
   ========================================================= */
const S = { step: 1, barber: "", items: new Set(), date: "", time: "", taken: [], open: false, done: null };

function openSheet(barberId) {
    S.barber = barberId || "";
    S.items = new Set(CONFIG.services.length ? [CONFIG.services[0].id] : []);
    S.date = ""; S.time = ""; S.done = null;
    $("#client-name").value = $("#client-name").value || "";
    $("#sheet-wrap").hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => $("#sheet-wrap").classList.add("open")));
    S.open = true;
    try { history.pushState({ sheet: true }, ""); } catch {}
    goTo(barberId ? 2 : 1, false);
    buzz();
}

function closeSheet(fromHistory) {
    if (!S.open) return;
    S.open = false;
    $("#sheet-wrap").classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => { if (!S.open) $("#sheet-wrap").hidden = true; }, 360);
    if (!fromHistory) { try { if (history.state && history.state.sheet) history.back(); } catch {} }
    if (S.done) loadToday();
}

function goTo(step, back) {
    S.step = step;
    $$(".step").forEach((el) => {
        const on = Number(el.dataset.step) === step;
        el.hidden = !on;
        el.classList.toggle("back", !!back);
        if (on) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
    });
    $("#sheet-title").textContent = TITLES[step];
    $("#sheet-step").textContent = step <= 4 ? `Paso ${step} de 4` : "Todo listo";
    $("#progress-bar").style.width = `${Math.min(step, 4) * 25}%`;
    $("#sheet-back").disabled = step === 1 || step === 5;
    $("#sheet-error").textContent = "";
    $("#sheet-next").textContent = step === 4 ? "Confirmar turno" : step === 5 ? "Listo" : "Siguiente";
    $("#sheet-next").disabled = false;
    $(".sheet-total").hidden = step === 5;
    $("#sheet-body").scrollTop = 0;
    if (step === 1) renderBarberPick();
    if (step === 2) renderServicePick();
    if (step === 3) renderDayPick();
    if (step === 4) renderSummary();
    updateTotal();
}

function selectedItems() { return ALL_SERVICES.filter((s) => S.items.has(s.id)); }
function updateTotal() { $("#sheet-total").textContent = cop(selectedItems().reduce((a, s) => a + s.price, 0)); }

/* Paso 1 */
function renderBarberPick() {
    const today = nowCO().date;
    const rows = CONFIG.barbers.map((b) => {
        const nf = nextFree(b, today, todayTaken);
        const sub = nf.kind === "free" ? `<span class="pick-sub free">Libre hoy desde las ${to12(nf.time)}</span>`
            : nf.kind === "full" ? `<span class="pick-sub">Hoy está lleno, sepárale otro día</span>`
            : `<span class="pick-sub">Hoy no viene, sepárale otro día</span>`;
        return `<button type="button" class="pick${S.barber === b.id ? " is-on" : ""}" data-barber="${esc(b.id)}" role="radio" aria-checked="${S.barber === b.id}">
            <span class="avatar">${avatarHtml(b)}</span><span><span class="pick-name">${esc(b.name)}</span>${sub}</span><span class="pick-check">✓</span></button>`;
    });
    $("#pick-barber").innerHTML = `<button type="button" class="pick pick-any${S.barber === "" ? " is-on" : ""}" data-barber="" role="radio" aria-checked="${S.barber === ""}">
        <span class="avatar">B&amp;W</span><span><span class="pick-name">El que esté libre</span><span class="pick-sub">Te asignamos el primero disponible</span></span><span class="pick-check">✓</span></button>` + rows.join("");
}
$("#pick-barber").addEventListener("click", (e) => {
    const p = e.target.closest(".pick"); if (!p) return;
    S.barber = p.dataset.barber; buzz();
    renderBarberPick();
    setTimeout(() => goTo(2), 160);
});

/* Paso 2 */
function renderServicePick() {
    $("#pick-service").innerHTML = ALL_SERVICES.map((s) => {
        const isExtra = CONFIG.extras.includes(s);
        return `<button type="button" class="pick${S.items.has(s.id) ? " is-on" : ""}" data-s="${esc(s.id)}" aria-pressed="${S.items.has(s.id)}">
            <span class="pick-check">✓</span><span><span class="pick-name">${esc(splitName(s.name)[0])}</span><span class="pick-sub">${esc(isExtra ? "Adicional" : splitName(s.name)[1])}</span></span>
            <span class="pick-price">${isExtra ? "+" : ""}${cop(s.price)}</span></button>`;
    }).join("");
}
$("#pick-service").addEventListener("click", (e) => {
    const p = e.target.closest(".pick"); if (!p) return;
    S.items.has(p.dataset.s) ? S.items.delete(p.dataset.s) : S.items.add(p.dataset.s);
    buzz(); renderServicePick(); updateTotal();
});

/* Paso 3 */
function dayAvailable(d) {
    if (!CONFIG.hours[dayOf(d)] || !slotsFor(d).length) return false;
    if (S.barber) return worksOn(barberById(S.barber), d);
    return CONFIG.barbers.some((b) => worksOn(b, d));
}
function renderDayPick() {
    const days = nextDays(CONFIG.daysAhead);
    if (!S.date || !dayAvailable(S.date)) S.date = days.find(dayAvailable) || days[0];
    // calendario: semanas de lunes a domingo
    const lead = (dayOf(days[0]) + 6) % 7;            // espacios antes del primer día
    const head = ["L", "M", "M", "J", "V", "S", "D"].map((d) => `<span class="cal-h">${d}</span>`).join("");
    const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const months = [...new Set(days.map((d) => MONTHS[Number(d.slice(5, 7)) - 1]))];
    const cells = days.map((d, i) => {
        const ok = dayAvailable(d);
        const first = Number(d.slice(8)) === 1 && i > 0;
        return `<button type="button" class="cal-d${d === S.date ? " is-on" : ""}${i === 0 ? " is-today" : ""}${first ? " is-first" : ""}" data-date="${d}" ${ok ? "" : "disabled"} role="radio" aria-checked="${d === S.date}" aria-label="${esc(longDate(d))}${ok ? "" : ", no disponible"}">
            ${Number(d.slice(8))}${i === 0 ? "<small>hoy</small>" : first ? `<small>${MONTHS[Number(d.slice(5, 7)) - 1].slice(0, 3)}</small>` : ""}</button>`;
    }).join("");
    $("#pick-day").innerHTML = `<p class="cal-month">${months.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" y ")}</p>
        <div class="cal-grid">${head}${"<span></span>".repeat(lead)}${cells}</div>`;
    paintPicked();
    loadSlots();
}
function paintPicked() {
    const t = longDate(S.date);
    $("#cal-picked").textContent = t.charAt(0).toUpperCase() + t.slice(1);
}
async function loadSlots() {
    $("#pick-slot").innerHTML = `<p class="slots-msg">Buscando horas libres…</p>`;
    try { S.taken = await DB.takenSlots(S.date); }
    catch { $("#pick-slot").innerHTML = `<p class="slots-msg">No pudimos cargar las horas. Revisa tu internet.</p>`; return; }
    renderSlots();
}
function freeBarbersAt(time) {
    const pool = S.barber ? [barberById(S.barber)] : CONFIG.barbers;
    return pool.filter((b) => worksOn(b, S.date) && !S.taken.some((t) => t.barber_id === b.id && t.time === time));
}
function renderSlots() {
    const slots = slotsFor(S.date);
    const html = slots.map((t) => {
        const free = freeBarbersAt(t).length > 0;
        return `<button type="button" class="slot${S.time === t ? " is-on" : ""}" data-time="${t}" ${free ? "" : "disabled"}>${to12(t)}</button>`;
    }).join("");
    const anyFree = slots.some((t) => freeBarbersAt(t).length);
    $("#pick-slot").innerHTML = anyFree ? html : `<p class="slots-msg">No quedan horas libres este día. Prueba otro día.</p>`;
}
$("#pick-day").addEventListener("click", (e) => {
    const d = e.target.closest(".cal-d"); if (!d || d.disabled) return;
    S.date = d.dataset.date; S.time = ""; buzz();
    $$("#pick-day .cal-d").forEach((x) => { const on = x === d; x.classList.toggle("is-on", on); x.setAttribute("aria-checked", on); });
    paintPicked();
    loadSlots();
});
$("#pick-slot").addEventListener("click", (e) => {
    const s = e.target.closest(".slot"); if (!s || s.disabled) return;
    S.time = s.dataset.time; buzz();
    $$("#pick-slot .slot").forEach((x) => x.classList.toggle("is-on", x === s));
    setTimeout(() => goTo(4), 180);
});

/* Paso 4 */
function summaryHtml(barberName) {
    const items = selectedItems();
    return [
        ["Barbero", barberName],
        ["Día", longDate(S.date)],
        ["Hora", to12(S.time)],
        ["Servicio", items.map((x) => x.name).join(", ")],
        ["Total", cop(items.reduce((a, s) => a + s.price, 0))],
    ].map(([k, v]) => `<div><span>${k}</span><strong>${esc(v)}</strong></div>`).join("");
}
function renderSummary() {
    const b = S.barber && barberById(S.barber);
    $("#summary").innerHTML = summaryHtml(b ? b.name : "El que esté libre");
    setTimeout(() => { if (!$("#client-name").value) $("#client-name").focus({ preventScroll: true }); }, 350);
}
$("#client-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#client-phone").focus(); } });
$("#client-phone").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); next(); } });

async function submit() {
    const name = $("#client-name").value.trim();
    const phone = $("#client-phone").value.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
    const err = $("#sheet-error");
    if (!name) { err.textContent = "Escribe tu nombre."; $("#client-name").focus(); return; }
    if (!/^3\d{9}$/.test(phone)) { err.textContent = "Escribe un celular de 10 dígitos que empiece por 3."; $("#client-phone").focus(); return; }
    const btn = $("#sheet-next");
    btn.disabled = true; btn.textContent = "Separando…";
    const items = selectedItems();
    const total = items.reduce((a, s) => a + s.price, 0);
    let done = null;
    for (const b of freeBarbersAt(S.time)) {
        const res = await DB.createBooking({ date: S.date, time: S.time, barber_id: b.id,
            client_name: name, client_phone: phone, services: items.map((x) => x.name), total });
        if (res.ok) { done = b; break; }
        if (res.reason !== "ocupado") break;
    }
    btn.disabled = false;
    if (!done) {
        err.textContent = "Esa hora se acaba de ocupar. Escoge otra.";
        S.time = "";
        goTo(3, true);
        return;
    }
    S.done = done;
    $("#done-title").textContent = `¡Listo, ${name}! Tu turno quedó separado`;
    $("#done-summary").innerHTML = summaryHtml(done.name);
    const msg = `Hola, soy ${name}. No puedo ir a mi turno con ${done.name} el ${longDate(S.date)} a las ${to12(S.time)}.`;
    // si el barbero tiene WhatsApp, cancelar y escribir le llega a él; si no, a la barbería
    const waTo = done.whatsapp || CONFIG.whatsapp;
    $("#cancel-link").href = `https://wa.me/${waTo}?text=${encodeURIComponent(msg)}`;
    if (done.whatsapp) {
        $("#barber-wa").hidden = false;
        $("#barber-wa").innerHTML = `${icon("whatsapp")} Escribirle a ${esc(done.name)}`;
        $("#barber-wa").href = `https://wa.me/${done.whatsapp}?text=${encodeURIComponent(`Hola ${done.name}, soy ${name}. Separé turno contigo el ${longDate(S.date)} a las ${to12(S.time)} por la página.`)}`;
    } else $("#barber-wa").hidden = true;
    try { navigator.vibrate && navigator.vibrate([12, 60, 18]); } catch {}
    goTo(5);
}

function next() {
    const err = $("#sheet-error");
    if (S.step === 1) return goTo(2);
    if (S.step === 2) {
        if (!S.items.size) { err.textContent = "Escoge al menos un servicio."; return; }
        return goTo(3);
    }
    if (S.step === 3) {
        if (!S.time) { err.textContent = "Toca una hora."; return; }
        return goTo(4);
    }
    if (S.step === 4) return submit();
    if (S.step === 5) return closeSheet();
}

$("#sheet-next").addEventListener("click", next);
$("#sheet-back").addEventListener("click", () => { if (S.step > 1 && S.step < 5) goTo(S.step - 1, true); });
$$("[data-close]").forEach((el) => el.addEventListener("click", () => closeSheet()));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.open) closeSheet(); });
window.addEventListener("popstate", () => { if (S.open) closeSheet(true); });
document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book]"); if (!b) return;
    e.preventDefault();
    openSheet(b.dataset.barber || "");
});

/* deslizar hacia abajo para cerrar (celular) */
{
    let y0 = null;
    const sheet = $(".sheet");
    sheet.addEventListener("touchstart", (e) => {
        const head = e.target.closest(".sheet-grab, .sheet-head");
        y0 = head ? e.touches[0].clientY : null;
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
        if (y0 === null) return;
        const dy = Math.max(0, e.touches[0].clientY - y0);
        sheet.style.transition = "none";
        sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    sheet.addEventListener("touchend", (e) => {
        if (y0 === null) return;
        const dy = e.changedTouches[0].clientY - y0;
        sheet.style.transition = ""; sheet.style.transform = "";
        y0 = null;
        if (dy > 110) closeSheet();
    });
}

/* =========================================================
   Instalar como app
   ========================================================= */
let installEvt = null;
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvt = e;
    if (!standalone()) $("#install-btn").hidden = false;
});
$("#install-btn").addEventListener("click", async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch {}
    installEvt = null;
    $("#install-btn").hidden = true;
});
window.addEventListener("appinstalled", () => { $("#install-btn").hidden = true; toast("¡Listo! Ya tienes la app B&W en tu celular"); });
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone()) $("#install-ios").hidden = false;
if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 5000);
}

/* =========================================================
   Arranque
   ========================================================= */
fillTexts();
paintIcons();
updateStatus();
renderHours();
renderMenu();
renderVisit();
renderRail();
loadToday();
setInterval(() => { updateStatus(); loadToday(); }, 60000);
DB.onChange(() => loadToday());
}
