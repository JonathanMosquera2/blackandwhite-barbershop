/* Fondo de oro: partículas doradas dibujadas en <canvas> detrás del contenido.
   Uso: <section data-fx="bokeh|sparks" data-fx-density="1" data-fx-tone="dark|light"> */
(function () {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const GOLD = [[255, 236, 160], [246, 206, 98], [222, 170, 52], [176, 124, 22]];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[(Math.random() * a.length) | 0];
    const GOLD_L = [[196, 146, 30], [170, 120, 20], [214, 170, 60], [140, 98, 14]];

    function make(host) {
        const mode = host.dataset.fx || 'bokeh';
        const dens = parseFloat(host.dataset.fxDensity || '1');
        const light = host.dataset.fxTone === 'light';
        const cv = document.createElement('canvas');
        cv.className = 'fx-canvas';
        cv.setAttribute('aria-hidden', 'true');
        host.prepend(cv);
        const ctx = cv.getContext('2d');
        let W = 0, H = 0, dpr = 1, parts = [], visible = true;

        function seed() {
            const n = Math.round((W * H) / (mode === 'sparks' ? 5200 : 9000) * dens);
            parts = Array.from({ length: Math.min(n, 260) }, () => spawn(true));
        }
        function spawn(any) {
            const big = Math.random() < (mode === 'bokeh' ? .16 : .06);
            return {
                x: rnd(0, W), y: any ? rnd(0, H) : H + 10,
                r: big ? rnd(10, 30) : rnd(1, mode === 'sparks' ? 2.6 : 4.5),
                big, c: pick(light ? GOLD_L : GOLD),
                a: big ? rnd(.08, .22) * (light ? .7 : 1) : rnd(.35, .95),
                vx: rnd(-.12, .12), vy: mode === 'sparks' ? -rnd(.25, 1.1) : -rnd(.04, .22),
                tw: rnd(0, Math.PI * 2), ts: rnd(.01, .05)
            };
        }
        function size() {
            const r = host.getBoundingClientRect();
            dpr = Math.min(devicePixelRatio || 1, 2);
            W = r.width; H = r.height;
            cv.width = W * dpr; cv.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed(); draw();
        }
        function dot(p) {
            const tw = .55 + .45 * Math.sin(p.tw);
            const [r, g, b] = p.c;
            const a = p.a * (p.big ? 1 : tw);
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (p.big ? 1 : 2.6));
            if (p.big) {
                grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
                grd.addColorStop(.7, `rgba(${r},${g},${b},${a * .55})`);
                grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
            } else {
                grd.addColorStop(0, light ? `rgba(${r},${g},${b},${a})` : `rgba(255,250,225,${a})`);
                grd.addColorStop(.35, `rgba(${r},${g},${b},${a * .8})`);
                grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
            }
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.big ? 1 : 2.6), 0, Math.PI * 2); ctx.fill();
            // destello en cruz en las chispas más brillantes
            if (!p.big && p.r > 2.2 && tw > .92 && !light) {
                ctx.strokeStyle = `rgba(255,250,225,${a * .7})`; ctx.lineWidth = .8;
                const L = p.r * 6;
                ctx.beginPath(); ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y);
                ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L); ctx.stroke();
            }
        }
        function draw() {
            ctx.clearRect(0, 0, W, H);
            ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
            for (const p of parts) dot(p);
        }
        function step() {
            if (visible) {
                for (let i = 0; i < parts.length; i++) {
                    const p = parts[i];
                    p.x += p.vx; p.y += p.vy; p.tw += p.ts;
                    if (p.y < -40 || p.x < -40 || p.x > W + 40) parts[i] = spawn(false);
                }
                draw();
            }
            requestAnimationFrame(step);
        }
        new ResizeObserver(size).observe(host);
        new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(host);
        size();
        if (!reduce) requestAnimationFrame(step);
    }
    const go = () => document.querySelectorAll('[data-fx]').forEach(make);
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
