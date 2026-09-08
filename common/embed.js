/* =========================================================
   embed.js - közös "beágyazás" protokoll a gyakorló oldalakhoz
   =========================================================
   Minden gyakorló oldal önállóan is működik. Ha az index.html
   iframe-ben nyitja meg, akkor URL paraméterekkel kap utasítást:

       ?embed=1&count=20&id=osszeadas&token=abc123&op=add

   és postMessage-ben jelez vissza a szülő oldalnak:

       { kind:'gyak:ready',    id, token }
       { kind:'gyak:progress', id, token, correct, wrong, done, total }
       { kind:'gyak:done',     id, token, correct, wrong }

   A szülő oldal a billentyűleütéseket is továbbíthatja:

       { kind:'gyak:key', key:'5' }

   Használat a gyakorló oldalon:
       GyakEmbed.active          -> beágyazott módban vagyunk-e
       GyakEmbed.target          -> hány feladat kell (különben Infinity)
       GyakEmbed.progress(c, w, done)
       GyakEmbed.done(c, w)
       GyakEmbed.onKey(fn)       -> szülőtől jövő billentyű
   ========================================================= */
(function () {
    'use strict';

    const params = new URLSearchParams(location.search);
    const active = params.get('embed') === '1';
    const rawCount = parseInt(params.get('count'), 10);

    const api = {
        active: active,
        target: (Number.isFinite(rawCount) && rawCount > 0) ? rawCount : Infinity,
        id: params.get('id') || '',
        token: params.get('token') || '',
        param: (name, fallback) => params.get(name) || fallback
    };

    /* file:// esetén location.origin === "null", ami nem érvényes
       targetOrigin, ezért ott '*'-ra esünk vissza. Http(s) alatt viszont
       szigorúan a saját origin-ra küldünk. */
    function targetOrigin() {
        return (location.origin && location.origin !== 'null') ? location.origin : '*';
    }

    function post(kind, extra) {
        if (!active || window.parent === window) return;
        const msg = Object.assign({ kind: kind, id: api.id, token: api.token }, extra || {});
        try {
            window.parent.postMessage(msg, targetOrigin());
        } catch (err) {
            /* ha a szülő nem érhető el, önálló módként működünk tovább */
        }
    }

    api.ready = function () {
        post('gyak:ready', {});
    };
    api.progress = function (correct, wrong, done) {
        post('gyak:progress', {
            correct: correct,
            wrong: wrong,
            done: done,
            total: api.target === Infinity ? null : api.target
        });
    };
    api.done = function (correct, wrong) {
        post('gyak:done', { correct: correct, wrong: wrong });
    };

    /* Szülőtől érkező billentyűk (ha a fókusz a szülő dokumentumban van). */
    api.onKey = function (callback) {
        window.addEventListener('message', function (e) {
            const d = e.data;
            if (d && d.kind === 'gyak:key' && typeof d.key === 'string') callback(d.key);
        });
    };

    /* Véletlen navigáció elleni védelem a gyakorló oldalon:
       a Backspace egyes böngészőkben "vissza", az Alt+nyíl előzmény-léptetés. */
    function isTextField(el) {
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !isTextField(e.target)) e.preventDefault();
        else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.preventDefault();
    }, { capture: true });

    if (active) {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.classList.add('embed');
            api.ready();
            try { window.focus(); } catch (err) { /* nem kritikus */ }
        });
        /* Kattintásra is magához veszi a fókuszt, hogy a gépelés működjön. */
        document.addEventListener('mousedown', function () {
            try { window.focus(); } catch (err) { /* nem kritikus */ }
        });
    }

    window.GyakEmbed = api;
})();
