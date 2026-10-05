/* ==========================================================================
   GUADALAJARA POWER LINE - main.js
   JavaScript sin dependencias obligatorias. Lenis (scroll suave) es opcional:
   si el CDN no carga, la pagina funciona igual con scroll nativo.

   Indice
   01 Utilidades            08 PhaseScope (canvas de ondas)
   02 Texto por palabras    09 Hero (puntero + escena)
   03 Loader                10 Convertidores (pasos al hacer scroll)
   04 Scroll suave / anclas 11 Tilt, spotlight y magnetismo
   05 Header / menu movil   12 Videos
   06 Revelado al scroll    13 Formulario a WhatsApp
   07 Tabs de sectores      14 Arranque
   ========================================================================== */
(() => {
    'use strict';

    /* 01. UTILIDADES ----------------------------------------------------- */
    const doc = document.documentElement;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const WA_NUMBER = '523324586841';
    const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    let lenis = null;

    /* 02. TEXTO POR PALABRAS --------------------------------------------- */
    function splitWords(el) {
        let i = 0;
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        const inner = document.createElement('span');
                        w.className = 'w';
                        inner.className = 'wi';
                        inner.style.setProperty('--i', i++);
                        inner.textContent = part;
                        w.appendChild(inner);
                        frag.appendChild(w);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
    }

    /* 03. LOADER --------------------------------------------------------- */
    function initLoader(onDone) {
        const loader = $('#loader');
        if (!loader) { onDone(); return; }

        const ring = $('#loader-ring');
        const count = $('#loader-count');
        let seen = false;
        try { seen = sessionStorage.getItem('gpl-seen') === '1'; } catch (e) { /* sin storage */ }

        const MIN = reduceMotion ? 350 : (seen ? 1100 : 2300);
        const HARD_LIMIT = 7000;
        const start = performance.now();
        let loaded = document.readyState === 'complete';
        let finished = false;

        window.addEventListener('load', () => { loaded = true; }, { once: true });

        const finish = () => {
            if (finished) return;
            finished = true;
            if (ring) ring.style.strokeDashoffset = 0;
            if (count) count.textContent = '100';
            try { sessionStorage.setItem('gpl-seen', '1'); } catch (e) { /* sin storage */ }
            loader.classList.add('is-done');
            setTimeout(onDone, reduceMotion ? 0 : 420);
            setTimeout(() => { loader.classList.add('is-gone'); loader.setAttribute('aria-hidden', 'true'); }, reduceMotion ? 50 : 1300);
        };

        const tick = (now) => {
            if (finished) return;
            const elapsed = now - start;
            const timed = easeOutCubic(clamp(elapsed / MIN, 0, 1)) * 100;
            const p = Math.min(timed, loaded ? 100 : 92);
            if (ring) ring.style.strokeDashoffset = String(100 - p);
            if (count) count.textContent = String(Math.round(p));
            if (p >= 99.5 || elapsed > HARD_LIMIT) { finish(); return; }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(finish, HARD_LIMIT + 500);
    }

    /* 04. SCROLL SUAVE / ANCLAS ------------------------------------------ */
    function initScroll() {
        if (!reduceMotion && window.Lenis) {
            lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }

        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (!id || id === '#') return;
            const target = id === '#top' ? document.body : $(id);
            if (!target) return;
            e.preventDefault();
            closeMenu();
            const header = parseFloat(getComputedStyle(doc).getPropertyValue('--header-h')) || 68;
            const offset = (id === '#top' || id === '#inicio') ? 0 : -(header + 8);
            if (lenis) {
                lenis.start();
                lenis.scrollTo(id === '#top' ? 0 : target, { offset, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
            } else {
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    }

    /* 05. HEADER / MENU MOVIL -------------------------------------------- */
    const burger = $('#burger');
    function openMenu() {
        doc.classList.add('menu-open');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        if (lenis) lenis.stop();
        else document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        if (!doc.classList.contains('menu-open')) return;
        doc.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        if (lenis) lenis.start();
        document.body.style.overflow = '';
    }

    function initHeader() {
        const header = $('.site-header');
        const sentinel = $('.header-sentinel');
        if (header && sentinel && 'IntersectionObserver' in window) {
            new IntersectionObserver(([en]) => header.classList.toggle('is-stuck', !en.isIntersecting)).observe(sentinel);
        }
        burger.addEventListener('click', () => (doc.classList.contains('menu-open') ? closeMenu() : openMenu()));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        window.matchMedia('(min-width: 960px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
    }

    /* 06. REVELADO AL SCROLL --------------------------------------------- */
    function initReveal() {
        const masks = $$('[data-reveal="mask"]');
        const targets = $$('[data-reveal]:not([data-reveal="mask"]), .split:not([data-hero])');
        if (!('IntersectionObserver' in window)) { [...targets, ...masks].forEach((el) => el.classList.add('is-in')); return; }

        const opts = { threshold: 0.12, rootMargin: '0px 0px -8% 0px' };
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, opts);
        targets.forEach((el) => io.observe(el));

        // Los elementos con clip-path no se pueden observar directamente (quedan
        // con area visible cero), asi que se observa a su contenedor.
        const groups = new Map();
        masks.forEach((el) => {
            const parent = el.parentElement;
            if (!groups.has(parent)) groups.set(parent, []);
            groups.get(parent).push(el);
        });
        const ioMask = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                groups.get(en.target).forEach((el) => el.classList.add('is-in'));
                ioMask.unobserve(en.target);
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
        groups.forEach((_, parent) => ioMask.observe(parent));
    }

    /* 07. TABS DE SECTORES ----------------------------------------------- */
    function initTabs() {
        const tabs = $$('.tab');
        if (!tabs.length) return;
        const panels = $$('.sector-panel');
        const imgs = $$('.sector-img');
        const cta = $('#sector-cta');
        const ctaLabel = $('#sector-cta-label');
        const messages = {
            casa: 'Hola, quiero cotizar servicio eléctrico para mi casa.',
            comercio: 'Hola, quiero cotizar servicio eléctrico para mi negocio.',
            industria: 'Hola, quiero cotizar servicio eléctrico industrial para mi planta.'
        };

        const select = (index, focus) => {
            tabs.forEach((tab, i) => {
                const on = i === index;
                tab.classList.toggle('is-active', on);
                tab.setAttribute('aria-selected', String(on));
                tab.tabIndex = on ? 0 : -1;
                if (on && focus) tab.focus();
            });
            const key = tabs[index].id.replace('tab-', '');
            panels.forEach((p) => {
                const on = p.dataset.panel === key;
                p.hidden = !on;
                p.classList.toggle('is-active', on);
                if (on && ctaLabel) ctaLabel.textContent = p.dataset.label;
            });
            imgs.forEach((img) => img.classList.toggle('is-active', img.dataset.panel === key));
            if (cta) cta.href = waLink(messages[key]);
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(i));
            tab.addEventListener('keydown', (e) => {
                const last = tabs.length - 1;
                let next = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
                if (e.key === 'Home') next = 0;
                if (e.key === 'End') next = last;
                if (next !== null) { e.preventDefault(); select(next, true); }
            });
        });
    }

    /* 08. PHASESCOPE: ONDAS ELECTRICAS EN CANVAS ------------------------- */
    /* Dibuja hasta 3 ondas (fases). A la izquierda toma la configuracion de
       "entrada" y a la derecha la de "salida", con una transicion suave en
       medio. Asi se ve literalmente una fase convertirse en tres. */
    const PHASE_SPREAD = [0, TAU / 3, (2 * TAU) / 3];

    class PhaseScope {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.cfg = Object.assign({
                cycles: 3, speed: 1.1, edge: [0.2, 0.6], amp: 0.34, lineWidth: 2.2,
                envelope: false, glow: true, alpha: 1,
                colors: [[63, 69, 144], [111, 119, 209], [245, 163, 0]]
            }, options);
            this.state = { inAmp: [1, 1, 1], inPh: [0, 0, 0], outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() };
            this.target = JSON.parse(JSON.stringify(this.state));
            this.t = 1.2;
            this.boost = 0;
            this.boostTarget = 0;
            this.running = false;
            this.visible = false;
            this.last = 0;
            this.w = 0;
            this.h = 0;
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.resize();
            if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([en]) => {
                    this.visible = en.isIntersecting;
                    this.visible ? this.start() : this.stop();
                }, { threshold: 0 }).observe(canvas);
            }
            this.draw();
        }

        setTarget(cfg, instant) {
            this.target = JSON.parse(JSON.stringify(cfg));
            if (instant || reduceMotion) { this.state = JSON.parse(JSON.stringify(cfg)); this.draw(); }
        }

        resize() {
            const w = this.canvas.clientWidth;
            const h = this.canvas.clientHeight;
            if (!w || !h) return;
            this.w = w; this.h = h;
            this.canvas.width = Math.round(w * this.dpr);
            this.canvas.height = Math.round(h * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.draw();
        }

        start() {
            if (reduceMotion || this.running || !this.visible) return;
            this.running = true;
            this.last = performance.now();
            const loop = (now) => {
                if (!this.running) return;
                const dt = Math.min(0.05, (now - this.last) / 1000);
                this.last = now;
                this.update(dt);
                this.draw();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        stop() { this.running = false; }

        update(dt) {
            const k = 1 - Math.exp(-dt * 5);
            ['inAmp', 'inPh', 'outAmp', 'outPh'].forEach((key) => {
                for (let i = 0; i < 3; i++) this.state[key][i] += (this.target[key][i] - this.state[key][i]) * k;
            });
            this.boost += (this.boostTarget - this.boost) * (1 - Math.exp(-dt * 4));
            this.t += dt;
        }

        draw() {
            const { ctx, w, h, cfg, state } = this;
            if (!w || !h) return;
            ctx.clearRect(0, 0, w, h);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const N = Math.max(80, Math.floor(w / 3));
            const [e0, e1] = cfg.edge;
            const breathe = 1 + Math.sin(this.t * 0.55) * 0.08 + this.boost * 0.45;

            // se dibuja de la fase 3 a la 1 para que la 1 quede arriba
            for (let ch = 2; ch >= 0; ch--) {
                const aIn = 0.2 + 0.8 * clamp(state.inAmp[ch] / 0.45, 0, 1);
                const aOut = 0.2 + 0.8 * clamp(state.outAmp[ch] / 0.45, 0, 1);
                const [r, g, b] = cfg.colors[ch];

                const grad = ctx.createLinearGradient(0, 0, w, 0);
                grad.addColorStop(0, `rgba(${r},${g},${b},${aIn * cfg.alpha})`);
                grad.addColorStop(clamp(e0, 0, 1), `rgba(${r},${g},${b},${aIn * cfg.alpha})`);
                grad.addColorStop(clamp(e1, 0, 1), `rgba(${r},${g},${b},${aOut * cfg.alpha})`);
                grad.addColorStop(1, `rgba(${r},${g},${b},${aOut * cfg.alpha})`);

                ctx.beginPath();
                for (let k = 0; k <= N; k++) {
                    const xn = k / N;
                    const s = smoothstep(e0, e1, xn);
                    const a = lerp(state.inAmp[ch], state.outAmp[ch], s);
                    const ph = lerp(state.inPh[ch], state.outPh[ch], s);
                    const env = cfg.envelope ? smoothstep(0, 0.08, xn) * smoothstep(1, 0.92, xn) : 1;
                    const y = h / 2 + a * h * cfg.amp * breathe * env * Math.sin(xn * TAU * cfg.cycles - this.t * cfg.speed * 2 + ph);
                    k === 0 ? ctx.moveTo(0, y) : ctx.lineTo(xn * w, y);
                }
                if (cfg.glow) {
                    ctx.strokeStyle = grad;
                    ctx.globalAlpha = 0.12;
                    ctx.lineWidth = cfg.lineWidth * 4.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
                ctx.strokeStyle = grad;
                ctx.lineWidth = cfg.lineWidth;
                ctx.stroke();
            }
        }
    }

    /* 09. HERO ----------------------------------------------------------- */
    let heroScope = null;
    let heroParticles = null;

    /* Campo de particulas ("electrones") que derivan lentamente en el fondo */
    class Particles {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.items = [];
            this.running = false;
            this.visible = false;
            this.w = 0;
            this.h = 0;
            this.resize();
            if ('ResizeObserver' in window) new ResizeObserver(() => this.resize()).observe(canvas);
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([en]) => {
                    this.visible = en.isIntersecting;
                    this.visible ? this.start() : (this.running = false);
                }).observe(canvas);
            }
        }

        resize() {
            const w = this.canvas.clientWidth;
            const h = this.canvas.clientHeight;
            if (!w || !h) return;
            this.w = w; this.h = h;
            this.canvas.width = Math.round(w * this.dpr);
            this.canvas.height = Math.round(h * this.dpr);
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            const count = clamp(Math.round((w * h) / 24000), 22, 64);
            this.items = Array.from({ length: count }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                r: 0.8 + Math.random() * 1.7,
                vx: 4 + Math.random() * 14, vy: -(2 + Math.random() * 8),
                a: 0.28 + Math.random() * 0.5, ph: Math.random() * TAU,
                volt: Math.random() < 0.22
            }));
            this.draw();
        }

        start() {
            if (reduceMotion || this.running || !this.visible) return;
            this.running = true;
            let last = performance.now();
            const loop = (now) => {
                if (!this.running) return;
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                this.items.forEach((p) => {
                    p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt * 1.2;
                    if (p.x > this.w + 10) p.x = -10;
                    if (p.y < -10) p.y = this.h + 10;
                });
                this.draw();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        draw() {
            const { ctx } = this;
            ctx.clearRect(0, 0, this.w, this.h);
            this.items.forEach((p) => {
                const a = p.a * (0.6 + 0.4 * Math.sin(p.ph));
                ctx.fillStyle = p.volt ? `rgba(245,163,0,${a})` : `rgba(63,69,144,${a * 0.85})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, TAU);
                ctx.fill();
            });
        }
    }

    function initHero() {
        const hero = $('.hero');
        const canvas = $('#hero-scope');
        const stage = $('.hero__stage');
        if (!hero) return;

        const particles = $('#hero-particles');
        if (particles) heroParticles = new Particles(particles);

        if (canvas) {
            const narrow = window.matchMedia('(max-width: 639px)').matches;
            heroScope = new PhaseScope(canvas, {
                cycles: narrow ? 1.8 : 3.1, speed: 0.9, edge: [0.08, 0.62], amp: 0.3, lineWidth: narrow ? 2 : 2.4, envelope: true
            });
            heroScope.setTarget({ inAmp: [1, 1, 1], inPh: [0, 0, 0], outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() }, true);
        }

        if (!finePointer || reduceMotion) return;

        let raf = 0;
        let px = 0, py = 0, mx = 0, my = 0;
        const apply = () => {
            raf = 0;
            hero.style.setProperty('--mx', `${mx}px`);
            hero.style.setProperty('--my', `${my}px`);
            if (stage) {
                stage.style.setProperty('--px', px.toFixed(3));
                stage.style.setProperty('--py', py.toFixed(3));
            }
        };
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mx = e.clientX - r.left;
            my = e.clientY - r.top;
            px = (mx / r.width - 0.5) * 2;
            py = (my / r.height - 0.5) * 2;
            hero.classList.add('is-pointer');
            if (heroScope) heroScope.boostTarget = clamp(1 - my / r.height, 0, 1) * 0.6;
            if (!raf) raf = requestAnimationFrame(apply);
        });
        hero.addEventListener('pointerleave', () => {
            hero.classList.remove('is-pointer');
            px = 0; py = 0;
            if (heroScope) heroScope.boostTarget = 0;
            if (!raf) raf = requestAnimationFrame(apply);
        });
    }

    /* 10. CONVERTIDORES: PASOS AL HACER SCROLL --------------------------- */
    function initConverter() {
        const canvas = $('#conv-scope');
        if (!canvas) return;

        const scope = new PhaseScope(canvas, {
            cycles: 2.4, speed: 1.0, edge: [0.37, 0.63], amp: 0.36, lineWidth: 2.6
        });

        const CFG = [
            { inAmp: [1, 1, 0], inPh: [0, Math.PI, 0], outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() },
            { inAmp: [0.5, 0.5, 0.5], inPh: PHASE_SPREAD.slice(), outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() },
            { inAmp: [0.55, 0, 0], inPh: [0, 0, 0], outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() }
        ];
        const DATA = [
            { inLabel: '220 V, 2 fases', outLabel: '220 V, 3 fases', from: 2, to: 3, unit: 'fases', msg: 'Hola, quiero mi convertidor de fase: 220 V bifásica a trifásica.' },
            { inLabel: '220 V, 3 fases', outLabel: '440 V, 3 fases', from: 220, to: 440, unit: 'V', msg: 'Hola, quiero mi convertidor de fase: trifásica de 220 a 440 V.' },
            { inLabel: '120 V, 1 fase', outLabel: '220 V, 3 fases', from: 120, to: 220, unit: 'V', msg: 'Hola, quiero mi convertidor de fase: 120 a 220 V trifásica.' }
        ];

        const steps = $$('.step');
        const dots = $$('.dots-nav li');
        const inLabel = $('#scope-in');
        const outLabel = $('#scope-out');
        const nFrom = $('#read-from');
        const nTo = $('#read-to');
        const unit = $('#read-unit');
        const cta = $('#conv-cta');

        const tween = (el, to) => {
            cancelAnimationFrame(el._raf);
            const from = parseFloat(el.textContent) || 0;
            if (reduceMotion) { el.textContent = String(to); return; }
            const t0 = performance.now();
            const step = (now) => {
                const k = clamp((now - t0) / 900, 0, 1);
                el.textContent = String(Math.round(lerp(from, to, easeOutCubic(k))));
                if (k < 1) el._raf = requestAnimationFrame(step);
            };
            el._raf = requestAnimationFrame(step);
        };

        let current = -1;
        const setStep = (i, instant) => {
            if (i === current) return;
            current = i;
            steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
            dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
            const d = DATA[i];
            inLabel.textContent = d.inLabel;
            outLabel.textContent = d.outLabel;
            unit.textContent = d.unit;
            if (instant) { nFrom.textContent = String(d.from); nTo.textContent = String(d.to); }
            else { tween(nFrom, d.from); tween(nTo, d.to); }
            scope.setTarget(CFG[i], instant);
            if (cta) cta.href = waLink(d.msg);
        };
        setStep(0, true);

        const triggers = $$('[data-trigger]');
        if ('IntersectionObserver' in window && triggers.length) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((en) => { if (en.isIntersecting) setStep(Number(en.target.dataset.trigger)); });
            }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
            triggers.forEach((t) => io.observe(t));
        }
    }

    /* Ondas decorativas del panel de contacto */
    function initContactWaves() {
        const canvas = $('#contact-waves');
        if (!canvas) return;
        const scope = new PhaseScope(canvas, {
            cycles: 2.2, speed: 0.55, edge: [0.15, 0.7], amp: 0.2, lineWidth: 1.6, envelope: true, glow: false, alpha: 0.55,
            colors: [[255, 255, 255], [190, 196, 255], [255, 210, 122]]
        });
        scope.setTarget({ inAmp: [1, 1, 1], inPh: [0, 0, 0], outAmp: [1, 1, 1], outPh: PHASE_SPREAD.slice() }, true);
    }

    /* 11. SPOTLIGHT Y MAGNETISMO ----------------------------------------- */
    function initPointerFx() {
        if (!finePointer || reduceMotion) return;

        $$('.tile').forEach((tile) => {
            tile.addEventListener('pointermove', (e) => {
                const r = tile.getBoundingClientRect();
                tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
                tile.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });

        $$('.magnetic').forEach((el) => {
            const kids = Array.from(el.children);
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = ((e.clientX - (r.left + r.width / 2)) / r.width) * 12;
                const y = ((e.clientY - (r.top + r.height / 2)) / r.height) * 10;
                kids.forEach((k) => { k.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; });
            });
            el.addEventListener('pointerleave', () => kids.forEach((k) => { k.style.transform = ''; }));
        });
    }

    /* 12. VIDEOS --------------------------------------------------------- */
    function initVideo() {
        const dlg = $('#vdialog');
        const video = $('#vdialog-video');
        const title = $('#vdialog-title');
        const closeBtn = $('#vdialog-close');
        const buttons = $$('.vcard__btn');
        if (!dlg || !video || !buttons.length) return;
        let lastBtn = null;

        buttons.forEach((btn) => btn.addEventListener('click', () => {
            lastBtn = btn;
            video.poster = btn.querySelector('img').currentSrc || btn.querySelector('img').src;
            video.src = btn.dataset.video;
            title.textContent = btn.dataset.title;
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
            if (lenis) lenis.stop();
            const p = video.play();
            if (p && p.catch) p.catch(() => { /* el usuario puede dar play manualmente */ });
        }));

        const shut = () => {
            video.pause();
            video.removeAttribute('src');
            video.load();
            if (lenis) lenis.start();
            if (lastBtn) lastBtn.focus();
        };
        dlg.addEventListener('close', shut);
        closeBtn.addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    }

    /* 13. FORMULARIO A WHATSAPP ------------------------------------------ */
    function initForm() {
        const form = $('#contact-form');
        if (!form) return;
        const submit = $('#form-submit');
        const status = $('#form-status');
        const f = { name: $('#f-name'), phone: $('#f-phone'), service: $('#f-service'), msg: $('#f-msg') };
        const errEl = { name: $('#e-name'), phone: $('#e-phone'), service: $('#e-service') };

        const setError = (key, message) => {
            const field = f[key].closest('.field');
            field.classList.toggle('has-error', Boolean(message));
            f[key].setAttribute('aria-invalid', message ? 'true' : 'false');
            errEl[key].textContent = message || '';
        };
        ['name', 'phone', 'service'].forEach((key) => {
            f[key].addEventListener('input', () => setError(key, ''));
            f[key].addEventListener('change', () => setError(key, ''));
        });

        const validate = () => {
            let firstBad = null;
            const bad = (key, msg) => { setError(key, msg); if (!firstBad) firstBad = f[key]; };
            if (f.name.value.trim().length < 2) bad('name', 'Escribe tu nombre.');
            const digits = f.phone.value.replace(/\D/g, '');
            if (digits.length < 10) bad('phone', 'Escribe un teléfono de 10 dígitos.');
            if (!f.service.value) bad('service', 'Selecciona qué necesitas.');
            if (firstBad) firstBad.focus();
            return !firstBad;
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            status.textContent = '';
            if (!validate()) return;

            const name = f.name.value.trim();
            const extra = f.msg.value.trim();
            const lines = [
                `Hola, soy ${name}. Quiero cotizar: ${f.service.value}.`,
                extra ? `Detalles: ${extra}` : '',
                `Mi teléfono: ${f.phone.value.trim()}.`,
                'Los contacto desde su página web.'
            ].filter(Boolean);
            const url = waLink(lines.join('\n'));

            const label = submit.querySelector('span');
            const original = label.textContent;
            submit.disabled = true;
            label.textContent = 'Abriendo WhatsApp...';

            const a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();

            status.textContent = `Listo, ${name.split(' ')[0]}. Si WhatsApp no se abrió, `;
            const fallback = document.createElement('a');
            fallback.href = url; fallback.target = '_blank'; fallback.rel = 'noopener';
            fallback.textContent = 'toca aquí.';
            status.appendChild(fallback);

            setTimeout(() => { submit.disabled = false; label.textContent = original; }, 2200);
        });
    }

    /* Imagenes remotas: si una falla, se muestra un fondo de marca */
    function initImageFallback() {
        $$('img').forEach((img) => {
            const fail = () => { img.style.visibility = 'hidden'; img.parentElement.classList.add('is-broken'); };
            img.addEventListener('error', fail);
            if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
        });
    }

    /* Burbuja del boton flotante de WhatsApp */
    function initWaTip() {
        const wa = $('#wa-float');
        if (!wa) return;
        setTimeout(() => {
            wa.classList.add('is-tip');
            setTimeout(() => wa.classList.remove('is-tip'), 5200);
        }, 5000);
    }

    /* 14. ARRANQUE ------------------------------------------------------- */
    function ready() {
        doc.classList.remove('is-loading');
        doc.classList.add('is-ready');
        const title = $('.hero__title');
        if (title) title.classList.add('is-in');
        if (heroScope) heroScope.start();
        if (heroParticles) heroParticles.start();
        if (lenis) lenis.start();
        initWaTip();
    }

    function boot() {
        doc.classList.add('is-loading');
        if (lenis) lenis.stop();

        $$('.split').forEach(splitWords);
        initScroll();
        if (lenis) lenis.stop();
        initHeader();
        initReveal();
        initTabs();
        initHero();
        initConverter();
        initContactWaves();
        initPointerFx();
        initVideo();
        initForm();
        initImageFallback();
        initLoader(ready);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
