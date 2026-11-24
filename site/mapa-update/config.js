/* =========================================================
   CONFIGURACIÓN DE LA BARBERÍA
   👉 Todo lo que hay que cambiar está aquí (lo marcado con ✏️).
      Lo usan las dos páginas: la de clientes y el panel.
   ========================================================= */
const CONFIG = {
    name: "Black and White Barber Shop",                              // ✏️
    shortName: "B&W",                                                // ✏️ va en el emblema dorado
    tagline: "Cortes, barba y cejas en el barrio La Esperanza, San José del Guaviare. Escoge tu barbero, mira las horas libres y separa tu turno en un minuto.",
    address: "Carrera 23 # 10-115, Barrio La Esperanza, San José del Guaviare", // ✏️
    // ✏️ Link de la barbería en Google Maps (Compartir → Copiar link)
    mapLink: "https://maps.app.goo.gl/oNzSumgutaj7pPdE9",

    // ✏️ WhatsApp de la barbería, solo para preguntas y cancelaciones (57 + número)
    whatsapp: "573158909903",

    // ✏️ Horario de la tienda. 0 = domingo … 6 = sábado. null = cerrado
    hours: {
        1: ["10:00", "21:00"], 2: ["10:00", "21:00"], 3: ["10:00", "21:00"],
        4: ["10:00", "21:00"], 5: ["10:00", "21:00"], 6: ["10:00", "21:00"],
        0: ["12:00", "19:00"],
    },

    slotMinutes: 30,   // ✏️ Cada cuánto hay un turno (30 = 8:00, 8:30, 9:00…)
    daysAhead: 21,     // ✏️ Cuántos días adelante se puede separar (máximo 31)

    // ✏️ Barberos
    //   id: corto, sin espacios ni tildes (no cambiarlo después de publicar)
    //   days: días que trabaja (0 = domingo … 6 = sábado)
    //   photo: "images/darwin.webp" cuando haya foto. Mientras tanto se usa el emoji
    //   specialty: opcional, ej. "Fades y diseños"
    //   email: el usuario con el que entra al panel (no tiene que ser un correo real)
    barbers: [
        { id: "darwin",  name: "Darwin",  specialty: "", days: [1,2,3,4,5,6],   emoji: "🧔", photo: "", email: "darwin@blackandwhite.co" },
        { id: "andy",    name: "Andy",    specialty: "", days: [1,2,3,4,5,6],   emoji: "👨", photo: "", email: "andy@blackandwhite.co" },
        { id: "jackson", name: "Jackson", specialty: "", days: [1,2,3,4,5,6,0], emoji: "🧑", photo: "", email: "jackson@blackandwhite.co" },
        { id: "didier",  name: "Didier",  specialty: "", days: [1,2,3,4,5,6,0], emoji: "👨‍🦱", photo: "", email: "didier@blackandwhite.co" },
        { id: "juan",    name: "Juan",    specialty: "", days: [1,2,3,4,5,6],   emoji: "👱", photo: "", email: "juan@blackandwhite.co" },
        { id: "arley",   name: "Arley",   specialty: "", days: [1,2,3,4,5,6],   emoji: "🧔‍♂️", photo: "", email: "arley@blackandwhite.co" },
    ],
    ownerName: "John Edisson",               // ✏️ nombre del dueño (sale en el panel)
    ownerEmail: "johnedisson@blackandwhite.co",   // ✏️ usuario del dueño para el panel

    // ✏️ Cortes (el cliente escoge uno) y adicionales (varios). Pesos colombianos
    services: [
        { id: "corte", name: "Corte (incluye mascarilla negra)", price: 20000 },
    ],
    // Adicionales: se pueden pedir con el corte o solos. [] = no aparece la columna
    extras: [
        { id: "barba", name: "Barba", price: 10000 },
        { id: "cejas", name: "Cejas", price: 5000 },
    ],

    // ✏️ Fotos de cortes hechos en la barbería (carpeta images/).
    //    Mientras esté vacío, la sección de trabajos no aparece.
    gallery: [
        // { src: "images/corte1.webp", alt: "Fade con diseño" },
    ],
    heroPhoto: "",   // ✏️ foto grande de arriba. Vacío = emblema dorado
    payments: ["Efectivo", "Nequi", "Transferencia (cualquier banco)"],                    // ✏️
    social: { instagram: "", facebook: "", tiktok: "" }, // ✏️

    /* ---------- Base de datos ----------
       mode: "demo"     → los turnos se guardan solo en este navegador (para probar)
       mode: "supabase" → turnos reales, compartidos entre todos (ver LEEME.md) */
    mode: "supabase",
    supabaseUrl: "https://srkvgkjwbtvxvixlgijt.supabase.co",
    supabaseAnonKey: "sb_publishable_2cypQL9AbfB8HOPDMqYgVQ_7OJWOQ26",   // llave pública (publishable)
    demoPin: "123456",     // clave de todos en el modo demo
};
