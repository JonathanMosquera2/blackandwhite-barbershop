/* =========================================================
   Utilidades compartidas + base de datos (demo o Supabase)
   No hace falta tocar este archivo.
   ========================================================= */
const TZ = "America/Bogota";
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ACTIVE = ["separado", "atendido", "bloqueado"];   // estados que ocupan la hora

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const cop = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const barberById = (id) => CONFIG.barbers.find((b) => b.id === id);

/* ---------- Fechas y horas en hora de Colombia ---------- */
function nowCO() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const date = `${p.year}-${p.month}-${p.day}`;
    return { date, minutes: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10), day: dayOf(date) };
}
function dayOf(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function addDays(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
function to12(t) {
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "p. m." : "a. m."}`;
}
function dateLabel(iso) {
    const today = nowCO().date;
    if (iso === today) return "Hoy";
    if (iso === addDays(today, 1)) return "Mañana";
    return `${DAYS_SHORT[dayOf(iso)]} ${Number(iso.slice(8))}`;
}
function longDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}
function nextDays(n) { const t = nowCO().date; return Array.from({ length: n }, (_, i) => addDays(t, i)); }

/* Horas de turno de un día según el horario de la tienda */
function slotsFor(iso) {
    const h = CONFIG.hours[dayOf(iso)];
    if (!h) return [];
    const out = [];
    const now = nowCO();
    for (let m = toMin(h[0]); m + CONFIG.slotMinutes <= toMin(h[1]); m += CONFIG.slotMinutes) {
        if (iso === now.date && m <= now.minutes + 10) continue;   // ya pasó
        out.push(fromMin(m));
    }
    return out;
}
const worksOn = (barber, iso) => barber.days.includes(dayOf(iso));

/* ---------- Íconos (SVG propios, sin librerías externas) ---------- */
const ICONS = {
    whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.2.5.1.6 0l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.1Z"/>',
    instagram: '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.9 8c-.1-1.6-.4-3-1.6-4.2S17.6 2.2 16 2.1C14.4 2 9.6 2 8 2.1c-1.6.1-3 .4-4.2 1.6S2.2 6.4 2.1 8C2 9.6 2 14.4 2.1 16c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6.4 0-8Zm-2.1 9.7a3.3 3.3 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.9.4s-4.6.1-5.9-.4a3.3 3.3 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7A3.3 3.3 0 0 1 6.2 4.5C7.4 4 10.4 4.1 12 4.1s4.6-.1 5.9.4a3.3 3.3 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7Z"/>',
    facebook: '<path d="M14 8V6.2c0-.8.2-1.2 1.4-1.2H17V2h-2.6C11.3 2 10 3.5 10 6v2H8v3h2v11h4V11h2.7l.3-3h-3Z"/>',
    tiktok: '<path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2-2.8V9.2a6.2 6.2 0 1 0 5.3 6.2V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4Z"/>',
    pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/>',
    walk: '<path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2a5.3 5.3 0 0 1-4.5-2.5l-1-1.6a2 2 0 0 0-2.5-.8L6 8.3V13h2V9.6l1.8-.7"/>',
    phone: '<path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.6 3.6a1 1 0 0 1-.3 1l-2.2 2.2Z"/>',
    check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/>',
    x: '<path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4Z"/>',
    lock: '<path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2Z"/>',
};
const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[name] || ""}</svg>`;
function paintIcons(root = document) { $$("[data-icon]", root).forEach((el) => { el.innerHTML = icon(el.dataset.icon); }); }

/* =========================================================
   BASE DE DATOS
   Misma forma para los dos modos:
     takenSlots(date)      → [{barber_id, time}]  (público, sin datos del cliente)
     createBooking(b)      → {ok:true} | {ok:false, reason:"ocupado"}
     listBookings(date)    → turnos del día (requiere entrar al panel)
     setStatus(id, status) / blockSlot(barber_id, date, time)
     login(who, pin) / logout() / session()
     onChange(cb)          → avisa cuando entra o cambia un turno
   ========================================================= */
const DemoDB = (() => {
    const KEY = "barberia_turnos_v1", SKEY = "barberia_sesion_v1";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
    const write = (rows) => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {} };
    let mem = null;   // por si el navegador no deja guardar
    const all = () => mem || (mem = read() || seed());
    const save = (rows) => { mem = rows; write(rows); };
    const uid = () => Math.random().toString(36).slice(2, 10);

    function seed() {
        // Turnos de ejemplo para que el panel no arranque vacío
        const today = nowCO().date;
        const slots = slotsFor(today);
        const working = CONFIG.barbers.filter((b) => worksOn(b, today));
        const sample = [
            ["Cliente de ejemplo 1", "3001112233", ["Fade o degradado"], 25000],
            ["Cliente de ejemplo 2", "3104445566", ["Fade y barba", "Cejas"], 40000],
            ["Cliente de ejemplo 3", "3207778899", ["Corte clásico"], 20000],
        ];
        const rows = sample.map((s, i) => slots[i * 2] && working[i % working.length] ? {
            id: uid(), created_at: new Date().toISOString(), date: today, time: slots[i * 2 + 1] || slots[i * 2],
            barber_id: working[i % working.length].id, client_name: s[0], client_phone: s[1],
            services: s[2], total: s[3], status: "separado", source: "web",
        } : null).filter(Boolean);
        write(rows);
        return rows;
    }

    return {
        mode: "demo",
        async takenSlots(date) {
            return all().filter((r) => r.date === date && ACTIVE.includes(r.status)).map(({ barber_id, time }) => ({ barber_id, time }));
        },
        async createBooking(b) {
            mem = read() || mem;   // leer lo último (otra pestaña pudo guardar)
            const rows = all();
            if (rows.some((r) => r.barber_id === b.barber_id && r.date === b.date && r.time === b.time && ACTIVE.includes(r.status)))
                return { ok: false, reason: "ocupado" };
            rows.push({ id: uid(), created_at: new Date().toISOString(), status: "separado", source: "web", ...b });
            save(rows);
            return { ok: true };
        },
        async listBookings(date) { mem = read() || mem; return all().filter((r) => r.date === date); },
        async setStatus(id, status, extra = {}) {
            const rows = all(); const r = rows.find((x) => x.id === id);
            if (r) { Object.assign(r, extra, { status }); save(rows); }
        },
        async blockSlot(barber_id, date, time) {
            return this.createBooking({ barber_id, date, time, client_name: "Hora bloqueada", client_phone: "", services: [], total: 0, status: "bloqueado", source: "barbero" });
        },
        async addWalkIn(w) {
            // intenta ocupar la media hora; si ya está ocupada, guarda la hora exacta
            const rows = all();
            const busy = (t) => rows.some((r) => r.barber_id === w.barber_id && r.date === w.date && r.time === t && ACTIVE.includes(r.status));
            const time = w.slot && !busy(w.slot) ? w.slot : w.exact;
            rows.push({ id: uid(), created_at: new Date().toISOString(), status: "atendido", source: "paso", client_phone: "",
                barber_id: w.barber_id, date: w.date, time, client_name: w.client_name, services: w.services, total: w.total, payment: w.payment });
            save(rows);
            return { ok: true, time };
        },
        async login(who, pin) {
            if (pin !== CONFIG.demoPin) return { ok: false };
            const s = who === "owner" ? { role: "owner" } : { role: "barber", barber_id: who };
            try { sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch {}
            this._s = s;
            return { ok: true, session: s };
        },
        async logout() { this._s = null; try { sessionStorage.removeItem(SKEY); } catch {} },
        async session() {
            if (this._s) return this._s;
            try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch { return null; }
        },
        onChange(cb) {
            window.addEventListener("storage", (e) => { if (e.key === KEY) { mem = null; cb(); } });
            setInterval(() => { const fresh = read(); if (fresh && JSON.stringify(fresh) !== JSON.stringify(mem)) { mem = fresh; cb(); } }, 5000);
        },
    };
})();

const SupaDB = (() => {
    let client = null;
    async function sb() {
        if (client) return client;
        if (!window.supabase) {
            await new Promise((ok, fail) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
                s.onload = ok; s.onerror = fail; document.head.appendChild(s);
            });
        }
        client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
        return client;
    }
    async function profile() {
        const c = await sb();
        const { data: { user } } = await c.auth.getUser();
        if (!user) return null;
        const { data } = await c.from("profiles").select("role, barber_id").eq("user_id", user.id).single();
        return data || null;
    }
    return {
        mode: "supabase",
        async takenSlots(date) {
            const { data, error } = await (await sb()).rpc("taken_slots", { d: date });
            if (error) throw error;
            return data || [];
        },
        async createBooking(b) {
            const { error } = await (await sb()).from("bookings").insert({ ...b, status: "separado", source: "web" });
            if (error) return { ok: false, reason: error.code === "23505" ? "ocupado" : "error" };
            return { ok: true };
        },
        async listBookings(date) {
            const { data, error } = await (await sb()).from("bookings").select("*").eq("date", date).order("time");
            if (error) throw error;
            return data || [];
        },
        async setStatus(id, status, extra = {}) {
            const { error } = await (await sb()).from("bookings").update({ ...extra, status }).eq("id", id);
            if (error) throw error;
        },
        async blockSlot(barber_id, date, time) {
            const { error } = await (await sb()).from("bookings").insert({
                barber_id, date, time, client_name: "Hora bloqueada", client_phone: "", services: [], total: 0, status: "bloqueado", source: "barbero" });
            return error ? { ok: false, reason: error.code === "23505" ? "ocupado" : "error" } : { ok: true };
        },
        async addWalkIn(w) {
            const c = await sb();
            const row = { barber_id: w.barber_id, date: w.date, client_name: w.client_name, client_phone: "",
                services: w.services, total: w.total, payment: w.payment, status: "atendido", source: "paso" };
            for (const time of [w.slot, w.exact].filter(Boolean)) {
                const { error } = await c.from("bookings").insert({ ...row, time });
                if (!error) return { ok: true, time };
                if (error.code !== "23505") return { ok: false, reason: "error" };
            }
            return { ok: false, reason: "ocupado" };
        },
        async login(who, pin) {
            const email = who === "owner" ? CONFIG.ownerEmail : barberById(who)?.email;
            const { error } = await (await sb()).auth.signInWithPassword({ email, password: pin });
            if (error) return { ok: false };
            return { ok: true, session: await profile() };
        },
        async logout() { await (await sb()).auth.signOut(); },
        async session() { return profile(); },
        async onChange(cb) {
            (await sb()).channel("turnos").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, cb).subscribe();
        },
    };
})();

const DB = CONFIG.mode === "supabase" ? SupaDB : DemoDB;
