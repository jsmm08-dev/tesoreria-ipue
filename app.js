/* Tesorería IPUE · tesoreria.ipue.app
 * Página estática. Habla con el servicio de Google Apps Script «Tesorería IPUE» por POST {accion, datos}.
 * Sin ENDPOINT, o con ?demo en la dirección, funciona en modo de prueba sin enviar nada. */
(function () {
'use strict';
var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxzflk2Cvnf5MFPvW_IYkxIA2kRkysJNYShor3zZHI_mgYHN-vniMP22xgwEj9A98h8/exec';   // URL /exec de la aplicación web de Apps Script.
var DEMO = /[?&]demo(=|&|$)/.test(location.search) || !ENDPOINT;
var TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function r2(n) { return Math.round(n * 100) / 100; }
function eur(n) { return r2(+n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
function num(v) { if (typeof v === 'number') return v; var s = String(v || '').trim().replace(/\s|€/g, ''); if (!s) return 0; var n = Number(/,/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s); return isFinite(n) ? n : 0; }
function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('on'); }, 2600); }
function copiar(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copiado'); }, function () { toast('Mantén pulsado el texto para copiarlo'); }); }
function idTemp() { var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
function ahoraLocal(h) { var d = new Date(Date.now() - (h || 0) * 36e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function fechaTxt(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function guardar(k, v) { try { v == null ? sessionStorage.removeItem('tes.' + k) : sessionStorage.setItem('tes.' + k, JSON.stringify(v)); } catch (e) { } }
function recuperar(k) { try { return JSON.parse(sessionStorage.getItem('tes.' + k) || 'null'); } catch (e) { return null; } }

// Catálogo (igual que en el servidor).
var C = { OM: 'Ofrenda Misionera', OS: 'Ofrenda Obra Social', SU: 'Suministros', VC: 'Voto Convención', EV: 'Espigas de Vida', GC: 'Gavillas para Cristo', SM: 'Socios Misioneros', HT: 'Hucha Traslados', FE: 'Ferede', RC: 'Seg. Responsabilidad Civil', SV: 'Seguro de Vida', DP: 'Deudas Personales', DC: 'Deuda Congregación', AC: 'Ahorro Congregación', VS: 'Voto Pastoral Pro-Sede', AP: 'Ahorro Apoyo Pastoral', AS: 'Aporte Solidario', CO: 'Seguro Compliance', DI: 'Diezmos', AL: 'Voto Pro Alquiler', PDM: 'P.D.M.', VP: 'Voto Pastoral', CF: 'Confraternidad' };
var TPVB = ['OM', 'EV', 'VC', 'GC', 'SM', 'OS', 'HT', 'CO', 'AS', 'DI', 'AL', 'SU', 'RC', 'DC', 'AC', 'SV'];
var TIPOS = {
  gen: { n: 'Ofrendas generales', d: 'Ofrendas, suministros y deudas', nac: ['OM', 'OS', 'SU', 'VC', 'EV', 'GC', 'SM', 'HT', 'FE', 'RC', 'SV', 'DP', 'DC', 'AC', 'VS', 'AP', 'CO'], dis: ['PDM', 'VP', 'CF'], otros: true },
  sum: { n: 'Suministros solos', d: 'Solo suministros', nac: ['SU'] },
  alq: { n: 'Alquiler', d: 'Siempre va solo', nac: ['AL'], solo: true },
  die: { n: 'Diezmos', d: 'Siempre van solos', nac: ['DI'], solo: true },
  tpv: { n: 'TPV', nac: TPVB, otros: true },
  biz: { n: 'Bizum', nac: TPVB, otros: true }
};
var ICON = {
  ef: '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="8" width="32" height="24" rx="4" fill="#00338D"/><rect x="9" y="13" width="22" height="8" rx="2" fill="#009FDA"/><rect x="12" y="25" width="16" height="3" rx="1.5" fill="#fff"/></svg>',
  tpv: '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="10" y="3" width="20" height="34" rx="4" fill="#00338D"/><rect x="13" y="7" width="14" height="9" rx="1.5" fill="#009FDA"/><g fill="#fff"><rect x="14" y="20" width="3" height="3" rx=".8"/><rect x="18.5" y="20" width="3" height="3" rx=".8"/><rect x="23" y="20" width="3" height="3" rx=".8"/><rect x="14" y="25" width="3" height="3" rx=".8"/><rect x="18.5" y="25" width="3" height="3" rx=".8"/><rect x="23" y="25" width="3" height="3" rx=".8"/><rect x="14" y="30" width="3" height="3" rx=".8"/><rect x="18.5" y="30" width="3" height="3" rx=".8"/><rect x="23" y="30" width="3" height="3" rx=".8"/></g></svg>',
  biz: '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="9" fill="#009FDA"/><path d="M14 27l12-14M15 13h6M19 27h6" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>'
};

// ── Servidor ────────────────────────────────────────────────────
var CONF = { lecturaA: false, lecturaB: true, maxJustificantes: 6, maxMB: 10, plazoHoras: 24 };
function llamar(accion, datos) {
  if (DEMO) return demo(accion, datos);
  return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: accion, datos: datos || {} }), redirect: 'follow', credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error('El servidor no ha respondido bien (' + r.status + '). Inténtelo de nuevo.'); return r.json(); })
    .then(function (j) {
      if (j && j.sesion) { salir('La sesión ha caducado. Vuelva a entrar.'); throw new Error('La sesión ha caducado.'); }
      if (!j || j.ok !== true) throw new Error((j && j.error) || 'No se pudo completar la petición.');
      return j.datos;
    }, function (e) { if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) throw new Error('No hay conexión con el servidor. Compruebe la conexión y vuelva a intentarlo.'); throw e; });
}

// Modo de prueba: una congregación inventada; nada sale del navegador.
var DEMO_DB = { envios: [], avisos: [{ id: 'm1', tipo: 'msg', titulo: 'Bienvenidos a Tesorería IPUE', texto: 'Esta es la versión de prueba: puede declarar ingresos y ver cómo funciona. Nada se envía de verdad.', de: 'Recaudación General' }] };
function demo(accion, d) {
  return new Promise(function (res, rej) {
    setTimeout(function () {
      if (accion === 'config') return res(CONF);
      if (accion === 'login') {
        if (!/^[a-z]+\.[a-z]+$/.test(String(d.usuario || ''))) return rej(new Error('Usuario o contraseña incorrectos.'));
        return res({ token: 'demo', nombre: 'Pastor de Prueba', congregaciones: [{ cod: 'I999', nombre: 'Congregación de Prueba', dist: 1, lic: 'MC999', rol: 'Pastor', tpv: ['TPV000000001'] }] });
      }
      if (accion === 'inicio') return res({ avisos: DEMO_DB.avisos, envios: DEMO_DB.envios });
      if (accion === 'leido') { DEMO_DB.avisos = DEMO_DB.avisos.filter(function (a) { return a.id !== d.id; }); return res({ ok: true }); }
      if (accion === 'subirJustificante') return res({ id: 'demo' + Math.random().toString(36).slice(2) });
      if (accion === 'leerJustificante') return res({ disponible: false });
      if (accion === 'declarar') {
        var tot = r2(totalDesglose(S.d)), id = 'I999-' + new Date().toISOString().slice(2, 4) + ('0' + (new Date().getMonth() + 1)).slice(-2) + '-' + ('00' + (DEMO_DB.envios.length + 1)).slice(-3);
        var ch = comprobar(S.d), inc = ch.some(function (c) { return c.k === 'no'; }), fuera = ch.some(function (c) { return c.fuera; });
        var r = { id: id, estado: inc ? 'Incidencia' : fuera ? 'Fuera de plazo' : 'Recibido', incidencia: inc, fuera: fuera, congregacion: 'Congregación de Prueba', cod: 'I999', distrito: 1, metodo: d.tipo === 'tpv' ? 'TPV' : d.tipo === 'biz' ? 'Bizum' : 'Cajero', tipo: TIPOS[d.tipo].n, fecha: d.fecha, total: tot, lineas: lineasDe(S.d) };
        DEMO_DB.envios.unshift({ id: id, fecha: d.fecha, metodo: r.metodo, tipo: r.tipo, total: tot, estado: r.estado === 'Fuera de plazo' ? 'Recibido' : r.estado, fuera: fuera });
        return res(r);
      }
      rej(new Error('Acción desconocida'));
    }, accion === 'login' ? 500 : 300);
  });
}

// ── Estado y vistas ─────────────────────────────────────────────
var U = recuperar('u'), S = { v: U ? (U.c ? 'inicio' : 'elegir') : 'login' };
var VIEWS = {};
function render() {
  $('#salir').hidden = !U || !U.c;
  $('#sub').textContent = U && U.c ? U.c.nombre + ' · ' + U.c.cod + ' · Distrito ' + U.c.dist : 'tesoreria.ipue.app';
  (VIEWS[S.v] || VIEWS.login)();
  window.scrollTo(0, 0);
}
function salir(msg) { U = null; guardar('u', null); S = { v: 'login', msg: msg || '' }; render(); }
function cod() { return U.c.cod; }
function codl() { return U.c.cod.toLowerCase(); }
function conceptoEsperado(t) { return t === 'gen' ? 'Donativos ' + codl() : t === 'sum' ? 'Donativo SU' + codl() : t === 'alq' ? 'Donativo A' + codl() : t === 'die' ? 'Donativos ' + (U.c.lic || '') : ''; }
function codigoDe(txt) { var m = String(txt || '').toUpperCase().replace(/-/g, '').match(/DONATIV\w*\s+([A-Z]*\d+)/); return m ? m[1] : ''; }
function espera(btn, txt) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = txt; return function () { btn.disabled = false; btn.textContent = btn.dataset.t; }; }

VIEWS.login = function () {
  $('#app').innerHTML = '<div><h1>Declarar un ingreso al fondo nacional</h1><p class="nota" style="margin:0">Entra con tu usuario (nombre.primerapellido) y la contraseña de pastor o de recaudador de tu congregación.</p></div>' +
    '<form class="card" id="f" style="display:grid;gap:14px" novalidate><div><label class="lbl" for="u">Usuario</label><input class="in" id="u" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="nombre.apellido"></div>' +
    '<div><label class="lbl" for="p">Contraseña</label><input class="in" id="p" type="password" autocomplete="current-password"></div>' +
    '<p class="err" id="err" role="alert">' + esc(S.msg || '') + '</p><button class="btn pri full" id="ent">Entrar</button></form>' +
    '<p class="nota">¿No puedes entrar? Escribe a Recaudación: recaudacion@ipue.es</p>';
  $('#f').onsubmit = function (e) {
    e.preventDefault();
    var fin = espera($('#ent'), 'Entrando…');
    llamar('login', { usuario: $('#u').value.trim().toLowerCase(), clave: $('#p').value }).then(function (r) {
      U = { token: r.token, nombre: r.nombre, cs: r.congregaciones, c: r.congregaciones.length === 1 ? r.congregaciones[0] : null };
      guardar('u', U); S = { v: U.c ? 'inicio' : 'elegir' }; render();
    }).catch(function (e) { fin(); $('#err').textContent = e.message; });
  };
};
VIEWS.elegir = function () {
  $('#app').innerHTML = '<h1>¿De qué congregación es el ingreso?</h1><div class="metodos">' + U.cs.map(function (c, i) { return '<button class="opt" data-i="' + i + '"><div><b>' + esc(c.nombre) + '</b><span>' + esc(c.cod) + ' · Distrito ' + esc(c.dist) + '</span></div></button>'; }).join('') + '</div>';
  $$('[data-i]').forEach(function (b) { b.onclick = function () { U.c = U.cs[+b.dataset.i]; guardar('u', U); S = { v: 'inicio' }; render(); }; });
};

VIEWS.inicio = function () {
  $('#app').innerHTML = '<p class="nota">Cargando…</p>';
  llamar('inicio', { token: U.token, cod: cod() }).then(function (r) {
    var estilo = function (e) { return e.estado === 'Conciliado' || e.estado === 'Exportado' ? 'p-ok' : e.estado === 'Incidencia' ? 'p-in' : 'p-re'; };
    $('#app').innerHTML = '<div><p class="nota" style="margin:0">Hola, ' + esc(String(U.nombre || '').split(' ')[0]) + '</p><h1>' + esc(U.c.nombre) + '</h1>' + (U.cs.length > 1 ? '<button class="btn" id="otra" style="min-height:40px;margin-top:6px">Cambiar de congregación</button>' : '') + '</div>' +
      r.avisos.map(function (a) {
        return '<div class="aviso ' + (a.tipo === 'inc' ? 'inc' : 'msg') + '"><h3>' + (a.tipo === 'inc' ? '⚠ ' : '') + esc(a.titulo) + '</h3><p style="white-space:pre-line">' + esc(a.texto) + '</p><p class="nota">De ' + esc(a.de) + '</p>' +
          '<div class="row"><button class="btn" data-leer="' + esc(a.id) + '" data-t="' + a.tipo + '">Marcar como leído</button><button class="btn" data-resp="' + esc(a.id) + '">Responder</button></div>' +
          '<div data-caja="' + esc(a.id) + '" hidden style="margin-top:10px"><textarea class="in" aria-label="Respuesta"></textarea><button class="btn pri" style="margin-top:8px" data-env="' + esc(a.id) + '" data-t="' + a.tipo + '">Enviar respuesta</button></div></div>';
      }).join('') +
      '<button class="btn pri full" id="nuevo" style="min-height:58px;font-size:19px">Declarar un ingreso</button>' +
      '<section class="card"><h2>Mis envíos</h2>' + (r.envios.length ? r.envios.map(function (e) {
        return '<div class="envio"><div><b>' + esc(e.metodo + (e.metodo === 'Cajero' ? ' · ' + e.tipo : '')) + '</b><small>' + fechaTxt(e.fecha) + ' · ' + esc(e.id) + '</small></div><div style="text-align:right"><b>' + eur(e.total) + '</b><br><span class="pill ' + estilo(e) + '">' + esc(e.estado) + '</span>' + (e.fuera ? ' <span class="pill p-fp">Fuera de plazo</span>' : '') + '</div></div>';
      }).join('') : '<p class="nota">Aún no hay envíos.</p>') + '</section>';
    var leer = function (id, tipo, resp) { return llamar('leido', { token: U.token, cod: cod(), id: id, tipo: tipo, respuesta: resp || '' }).then(function () { toast(resp ? 'Respuesta enviada a Recaudación' : 'Marcado como leído'); render(); }, function (e) { toast(e.message); }); };
    $$('[data-leer]').forEach(function (b) { b.onclick = function () { b.disabled = true; leer(b.dataset.leer, b.dataset.t); }; });
    $$('[data-resp]').forEach(function (b) { b.onclick = function () { var c = document.querySelector('[data-caja="' + b.dataset.resp + '"]'); c.hidden = !c.hidden; c.querySelector('textarea').focus(); }; });
    $$('[data-env]').forEach(function (b) { b.onclick = function () { var t = document.querySelector('[data-caja="' + b.dataset.env + '"] textarea').value.trim(); if (!t) { toast('Escribe la respuesta'); return; } b.disabled = true; leer(b.dataset.env, b.dataset.t, t); }; });
    var o = $('#otra'); if (o) o.onclick = function () { U.c = null; guardar('u', U); S = { v: 'elegir' }; render(); };
    $('#nuevo').onclick = function () { S = { v: 'metodo', d: { envio: idTemp(), lin: {}, otros: [], otrosD: [], biz: [{ n: '', dni: '', imp: '' }], fecha: ahoraLocal(0), banco: 'BBVA', archivos: [] } }; render(); };
  }).catch(function (e) { $('#app').innerHTML = '<p class="card err">' + esc(e.message) + '</p><button class="btn" id="re">Reintentar</button>'; $('#re').onclick = render; });
};

function pasos(n) { return '<div class="pasos" aria-label="Paso ' + n + ' de 4">' + [1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }

VIEWS.metodo = function () {
  var d = S.d;
  $('#app').innerHTML = pasos(1) + '<h1>¿Cómo llegó el dinero?</h1><div class="metodos">' +
    '<button class="opt" data-m="ef" aria-pressed="' + (d.m === 'ef') + '">' + ICON.ef + '<div><b>Ingreso en cajero</b><span>Efectivo ingresado en el banco</span></div></button>' +
    '<button class="opt" data-m="tpv" aria-pressed="' + (d.m === 'tpv') + '">' + ICON.tpv + '<div><b>TPV (datáfono)</b><span>Totales del día de tu datáfono</span></div></button>' +
    '<button class="opt" data-m="biz" aria-pressed="' + (d.m === 'biz') + '">' + ICON.biz + '<div><b>Bizum</b><span>Bizum recibidos en la cuenta nacional</span></div></button></div>' +
    '<div id="det"></div><div class="bar"><button class="btn" id="atr">Cancelar</button><button class="btn pri" id="sig" ' + (d.m ? '' : 'disabled') + '>Siguiente</button></div>';
  $$('[data-m]').forEach(function (b) { b.onclick = function () { d.m = b.dataset.m; d.t = d.m === 'ef' ? (['gen', 'sum', 'alq', 'die'].indexOf(d.t) >= 0 ? d.t : 'gen') : d.m; d.lin = {}; d.mixto = false; render(); }; });
  var det = $('#det');
  if (d.m === 'ef') {
    det.innerHTML = '<h2 style="margin-top:8px">Tipo de ingreso</h2><div class="metodos" style="margin-top:8px">' + ['gen', 'sum', 'alq', 'die'].map(function (t) { return '<button class="opt" data-t="' + t + '" aria-pressed="' + (d.t === t) + '"><div><b>' + TIPOS[t].n + '</b><span>' + TIPOS[t].d + '</span></div></button>'; }).join('') + '</div>' +
      '<p class="sec">Escribe esto en el concepto del cajero</p><div class="conc"><code>' + esc(conceptoEsperado(d.t)) + '</code><button class="btn" id="cp">Copiar</button></div>' +
      (TIPOS[d.t].solo ? '<p class="regla"><b>' + TIPOS[d.t].n + ' va siempre solo.</b> No lo juntes con ofrendas ni con otros conceptos en el mismo ingreso.</p>' : d.t === 'gen' ? '<p class="regla">Puedes juntar ofrendas, suministros y deudas personales. <b>Alquiler y diezmos van siempre en ingresos aparte.</b></p>' : '') +
      '<div class="grid2" style="margin-top:6px"><div><label class="lbl" for="fe">Fecha y hora del ingreso</label><input class="in" type="datetime-local" id="fe" value="' + esc(d.fecha) + '"></div>' +
      '<div><label class="lbl" for="ba">Banco</label><select class="in" id="ba">' + ['BBVA', 'Santander'].map(function (b) { return '<option ' + (d.banco === b ? 'selected' : '') + '>' + b + '</option>'; }).join('') + '</select></div></div>';
    $$('[data-t]').forEach(function (b) { b.onclick = function () { d.t = b.dataset.t; d.lin = {}; d.mixto = false; render(); }; });
    $('#cp').onclick = function () { copiar(conceptoEsperado(d.t)); };
  }
  if (d.m === 'tpv') {
    var ts = U.c.tpv || [];
    d.tpv = d.tpv || ts[0] || 'otro';
    det.innerHTML = '<div class="grid2"><div><label class="lbl" for="tp">Datáfono</label><select class="in" id="tp">' + ts.map(function (t) { return '<option ' + (d.tpv === t ? 'selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '<option value="otro" ' + (d.tpv === 'otro' ? 'selected' : '') + '>Otro…</option></select></div>' +
      '<div><label class="lbl" for="fe">Día de los cobros</label><input class="in" type="datetime-local" id="fe" value="' + esc(d.fecha) + '"></div></div>' +
      (d.tpv === 'otro' ? '<div style="margin-top:10px"><label class="lbl" for="tpo">Número del datáfono</label><input class="in" id="tpo" placeholder="TPV y 9 o 10 cifras" value="' + esc(d.tpvOtro || '') + '"></div>' : '') +
      '<p class="nota">' + (ts.length > 1 ? 'Tu congregación tiene ' + ts.length + ' datáfonos: haz un envío por cada uno.' : ts.length ? 'Datáfono registrado para tu congregación.' : 'No hay datáfono registrado: elige «Otro…» y escribe su número.') + ' Puedes mezclar conceptos, pero <b>las deudas personales nunca van por TPV</b>.</p>';
    $('#tp').onchange = function () { d.tpv = this.value; render(); };
    var tpo = $('#tpo'); if (tpo) tpo.oninput = function () { d.tpvOtro = tpo.value; };
  }
  if (d.m === 'biz') {
    det.innerHTML = '<div><label class="lbl" for="fe">Fecha de los Bizum</label><input class="in" type="datetime-local" id="fe" value="' + esc(d.fecha) + '"></div>' +
      '<p class="sec">Personas que hicieron el Bizum</p><div id="bz"></div><button class="btn" id="mas">Añadir otro Bizum</button><p class="nota">Puedes mezclar conceptos, pero las deudas personales no van por Bizum.</p>';
    var pinta = function () {
      $('#bz').innerHTML = d.biz.map(function (b, i) {
        return '<div class="card" style="padding:12px;margin-bottom:8px;display:grid;gap:8px"><input class="in" placeholder="Nombre y apellidos" aria-label="Nombre y apellidos" data-b="' + i + '" data-k="n" value="' + esc(b.n) + '"><div class="grid2"><input class="in" placeholder="DNI o NIE" aria-label="DNI o NIE" data-b="' + i + '" data-k="dni" value="' + esc(b.dni) + '"><input class="in" inputmode="decimal" placeholder="Importe" aria-label="Importe" data-b="' + i + '" data-k="imp" value="' + esc(b.imp) + '"></div>' + (d.biz.length > 1 ? '<button class="btn" data-q="' + i + '" style="min-height:40px">Quitar</button>' : '') + '</div>';
      }).join('') + '<p class="rl tot"><span>Total Bizum</span><span>' + eur(d.biz.reduce(function (s, b) { return s + num(b.imp); }, 0)) + '</span></p>';
      $$('[data-b]').forEach(function (e) { e.onchange = function () { d.biz[+e.dataset.b][e.dataset.k] = e.value; pinta(); }; });
      $$('[data-q]').forEach(function (e) { e.onclick = function () { d.biz.splice(+e.dataset.q, 1); pinta(); }; });
    };
    pinta();
    $('#mas').onclick = function () { d.biz.push({ n: '', dni: '', imp: '' }); pinta(); };
  }
  var fe = $('#fe'); if (fe) fe.onchange = function () { d.fecha = fe.value; };
  var ba = $('#ba'); if (ba) ba.onchange = function () { d.banco = ba.value; };
  $('#atr').onclick = function () { S = { v: 'inicio' }; render(); };
  $('#sig').onclick = function () {
    if (!d.fecha) { toast('Indica la fecha'); return; }
    if (d.m === 'tpv' && d.tpv === 'otro' && !/^TPV\d{9,10}$/i.test(String(d.tpvOtro || '').replace(/\s/g, ''))) { toast('Escribe el número del datáfono'); return; }
    if (d.m === 'biz' && !d.biz.some(function (b) { return b.n.trim() && num(b.imp); })) { toast('Añade al menos un Bizum con nombre e importe'); return; }
    S.v = 'desglose'; render();
  };
};

function totalDesglose(d) { var s = 0; Object.keys(d.lin).forEach(function (k) { s += num(d.lin[k]); }); d.otros.forEach(function (o) { s += num(o.imp); }); d.otrosD.forEach(function (o) { s += num(o.imp); }); return r2(s); }
function lineasDe(d) {
  var L = [];
  Object.keys(d.lin).forEach(function (k) { if (num(d.lin[k])) L.push([C[k], num(d.lin[k])]); });
  d.otros.forEach(function (o) { if (num(o.imp)) L.push(['Otros: ' + o.desc, num(o.imp)]); });
  d.otrosD.forEach(function (o) { if (num(o.imp)) L.push(['Otros distritales: ' + o.desc, num(o.imp)]); });
  return L;
}

VIEWS.desglose = function () {
  var d = S.d, T = TIPOS[d.t], nac = T.nac.concat(d.mixto ? ['DI', 'AL'] : []);
  var fila = function (k) { return '<div class="linea"><label for="l-' + k + '">' + C[k] + '</label><input class="in" id="l-' + k + '" inputmode="decimal" data-l="' + k + '" value="' + esc(d.lin[k] || '') + '" placeholder="0,00"></div>'; };
  var otros = function (arr, key) { return arr.map(function (o, i) { return '<div class="otro"><input class="in" placeholder="Concepto a detallar" aria-label="Concepto" data-o="' + key + '" data-i="' + i + '" data-k="desc" value="' + esc(o.desc) + '"><input class="in" inputmode="decimal" placeholder="0,00" aria-label="Importe" data-o="' + key + '" data-i="' + i + '" data-k="imp" value="' + esc(o.imp) + '" style="text-align:right"><button class="x" data-q="' + key + '" data-i="' + i + '" aria-label="Quitar">✕</button></div>'; }).join(''); };
  $('#app').innerHTML = pasos(2) + '<h1>Desglose: ' + esc(T.n) + '</h1>' +
    '<section class="card"><p class="sec" style="margin-top:0">Aportes nacionales</p>' + nac.map(fila).join('') +
    (T.otros ? otros(d.otros, 'otros') + '<button class="btn" data-add="otros" style="margin-top:8px">Añadir otro concepto</button>' : '') +
    (T.dis ? '<p class="sec">Aportes distritales</p>' + T.dis.map(fila).join('') + otros(d.otrosD, 'otrosD') + '<button class="btn" data-add="otrosD" style="margin-top:8px">Añadir otro concepto distrital</button>' : '') + '</section>' +
    (d.t === 'gen' ? '<label class="card" style="cursor:pointer;display:flex;gap:12px;align-items:flex-start"><input type="checkbox" id="mx" ' + (d.mixto ? 'checked' : '') + ' style="width:24px;height:24px;flex:none;margin-top:2px"><span><strong>En este ingreso fue también alquiler o diezmos.</strong><br><span class="nota">Debían ir aparte. Desglósalo todo igualmente: llegará a Recaudación como incidencia para separarlo.</span></span></label>' : '') +
    '<div class="recibo"><h3>Total del desglose</h3><div class="big" id="tot">' + eur(totalDesglose(d)) + '</div></div>' +
    '<div class="bar"><button class="btn" id="atr">Atrás</button><button class="btn pri" id="sig">Siguiente</button></div>';
  var tot = function () { $('#tot').textContent = eur(totalDesglose(d)); };
  $$('[data-l]').forEach(function (e) { e.oninput = function () { d.lin[e.dataset.l] = e.value; tot(); }; });
  $$('[data-o]').forEach(function (e) { e.oninput = function () { d[e.dataset.o][+e.dataset.i][e.dataset.k] = e.value; tot(); }; });
  $$('[data-add]').forEach(function (b) { b.onclick = function () { d[b.dataset.add].push({ desc: '', imp: '' }); render(); }; });
  $$('[data-q]').forEach(function (b) { b.onclick = function () { d[b.dataset.q].splice(+b.dataset.i, 1); render(); }; });
  var mx = $('#mx'); if (mx) mx.onchange = function () { d.mixto = mx.checked; if (!d.mixto) { delete d.lin.DI; delete d.lin.AL; } render(); };
  $('#atr').onclick = function () { S.v = 'metodo'; render(); };
  $('#sig').onclick = function () {
    if (totalDesglose(d) <= 0) { toast('El desglose está vacío'); return; }
    if (d.otros.concat(d.otrosD).some(function (o) { return num(o.imp) > 0 && !String(o.desc).trim(); })) { toast('Escribe qué es cada «otro concepto»'); return; }
    S.v = 'justificante'; render();
  };
};

// ── Justificante: subida, lectura B (en el móvil) y A (servidor) ──
function reducir(file) {
  return new Promise(function (res) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return res(file);
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
      if (k === 1 && file.size < 1.5 * 1048576) { URL.revokeObjectURL(url); return res(file); }
      var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function (b) { res(b ? new File([b], 'justificante.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', .85);
    };
    img.onerror = function () { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
function base64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(blob); }); }
var tesseractListo = null;
function cargarTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (tesseractListo) return tesseractListo;
  tesseractListo = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = TESSERACT; s.onload = res; s.onerror = function () { tesseractListo = null; rej(new Error('No se pudo cargar el lector.')); }; document.head.appendChild(s); });
  return tesseractListo;
}
// Busca importe, fecha, hora y concepto en el texto leído del recibo.
function parsear(t) {
  var txt = String(t || '').replace(/\r/g, ''), r = { texto: txt.slice(0, 1500) };
  var amt = /(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/;
  var linea = txt.split('\n').filter(function (l) { return /(IMPORTE|TOTAL|IMP\.|CANTIDAD|EUR)/i.test(l) && amt.test(l); })[0];
  var m = (linea || '').match(amt);
  if (!m) { var todos = (txt.match(new RegExp(amt.source, 'g')) || []).map(num); if (todos.length) r.importe = Math.max.apply(null, todos); }
  else r.importe = num(m[1].replace(/\s/g, ''));
  var f = txt.match(/(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})/);
  if (f) { var y = f[3].length === 2 ? '20' + f[3] : f[3]; r.fecha = y + '-' + f[2] + '-' + f[1]; }
  var h = txt.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/); if (h) r.hora = h[1] + ':' + h[2];
  var c = txt.match(/DONATIV\w*\s*[A-Z]{0,3}-?\s?\d+/i); if (c) r.concepto = c[0].replace(/\s+/g, ' ');
  return r;
}

VIEWS.justificante = function () {
  var d = S.d;
  $('#app').innerHTML = pasos(3) + '<h1>Foto del justificante</h1><p class="nota" style="margin:-8px 0 0">' + (d.m === 'ef' ? 'El recibo que te dio el cajero.' : d.m === 'tpv' ? 'El ticket de cierre o de totales del datáfono.' : 'La captura de cada Bizum recibido.') + '</p>' +
    '<label class="foto" for="fi"><b>' + (d.archivos.length ? 'Añadir otra foto' : 'Hacer foto o elegir archivo') + '</b><br><span class="nota">Imagen o PDF · hasta ' + CONF.maxJustificantes + ' archivos</span></label>' +
    '<input id="fi" type="file" accept="image/*,application/pdf" capture="environment" hidden>' +
    '<section class="card" id="lista"' + (d.archivos.length ? '' : ' hidden') + '>' + d.archivos.map(function (a, i) { return '<div class="arch">' + (a.vista ? '<img src="' + a.vista + '" alt="">' : '') + '<span>' + esc(a.nombre) + '<br><span class="nota">' + esc(a.estado) + '</span></span><button class="x" data-q="' + i + '" aria-label="Quitar">✕</button></div>'; }).join('') + '</section>' +
    '<div id="lect"></div><div class="bar"><button class="btn" id="atr">Atrás</button><button class="btn pri" id="sig" ' + (d.archivos.some(function (a) { return a.id; }) && d.leido && !d.leyendo ? '' : 'disabled') + '>Revisar</button></div>';
  $('#fi').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (d.archivos.length >= CONF.maxJustificantes) { toast('Máximo ' + CONF.maxJustificantes + ' archivos'); return; }
    var a = { nombre: f.name || 'justificante', estado: 'Preparando…', vista: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' };
    d.archivos.push(a); render();
    reducir(f).then(function (b) {
      if (b.size > CONF.maxMB * 1048576) throw new Error('Pesa más de ' + CONF.maxMB + ' MB.');
      a.blob = b; a.estado = 'Subiendo…'; render();
      return base64(b).then(function (datos) { return llamar('subirJustificante', { token: U.token, cod: cod(), envio: d.envio, nombre: a.nombre, tipo: b.type || 'application/octet-stream', datos: datos }); });
    }).then(function (r) { a.id = r.id; a.estado = 'Subido'; render(); if (d.archivos.filter(function (x) { return x.id; }).length === 1) leer(a); else render(); })
      .catch(function (err) { a.estado = 'Error: ' + err.message; render(); });
  };
  $$('[data-q]').forEach(function (b) { b.onclick = function () { d.archivos.splice(+b.dataset.q, 1); if (!d.archivos.length) { d.leido = null; d.lecA = d.lecB = null; } render(); }; });
  $('#atr').onclick = function () { S.v = 'desglose'; render(); };
  $('#sig').onclick = function () { S.v = 'revisar'; render(); };
  if (d.leyendo) $('#lect').innerHTML = '<p class="card">Leyendo el justificante… puede tardar unos segundos.</p>';
  else if (d.leido) pintaLectura();

  function leer(a) {
    d.leido = { imp: '', fecha: d.fecha, conc: '' }; d.leyendo = true; render();
    var pB = CONF.lecturaB && a.blob && /^image\//.test(a.blob.type) ? cargarTesseract().then(function () { return window.Tesseract.recognize(a.blob, 'spa'); }).then(function (r) { return parsear(r.data && r.data.text); }).catch(function () { return null; }) : Promise.resolve(null);
    var pA = CONF.lecturaA ? llamar('leerJustificante', { token: U.token, cod: cod(), envio: d.envio, archivo: a.id, metodo: d.m }).catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([pA, pB]).then(function (x) {
      var A = x[0] && x[0].disponible ? x[0] : null, B = x[1];
      d.lecA = A; d.lecB = B; d.leyendo = false;
      var fuente = A && A.importe != null ? A : B || {};
      d.leido = { imp: fuente.importe != null ? String(fuente.importe).replace('.', ',') : '', fecha: fuente.fecha ? fuente.fecha + 'T' + (fuente.hora || d.fecha.slice(11, 16) || '12:00') : d.fecha, conc: fuente.concepto || '' };
      render();
    });
  }
  function pintaLectura() {
    var A = d.lecA, B = d.lecB, res = function (t, o) { return o ? '<div><b>' + t + ':</b> ' + (o.importe != null ? eur(o.importe) : 'sin importe') + (o.fecha ? ' · ' + fechaTxt(o.fecha) + (o.hora ? ' ' + o.hora : '') : '') + (o.concepto ? ' · ' + esc(o.concepto) : '') + '</div>' : ''; };
    $('#lect').innerHTML = '<section class="card" style="display:grid;gap:12px"><h2>Comprueba lo que se ha leído</h2>' +
      (A || B ? '<div class="lect">' + res('Lectura del servidor', A) + res('Lectura del móvil', B) + '</div>' : '<p class="nota" style="margin:0">No se pudo leer automáticamente: escribe los datos del justificante.</p>') +
      '<div class="grid2"><div><label class="lbl" for="li">Importe del justificante</label><input class="in" id="li" inputmode="decimal" value="' + esc(d.leido.imp) + '" placeholder="0,00"></div><div><label class="lbl" for="lf">Fecha y hora</label><input class="in" id="lf" type="datetime-local" value="' + esc(d.leido.fecha) + '"></div></div>' +
      (d.m === 'ef' ? '<div><label class="lbl" for="lc">Concepto impreso en el recibo</label><input class="in" id="lc" value="' + esc(d.leido.conc) + '" placeholder="' + esc(conceptoEsperado(d.t)) + '"></div>' : '') + '</section>';
    [['li', 'imp'], ['lf', 'fecha'], ['lc', 'conc']].forEach(function (p) { var e = $('#' + p[0]); if (e) e.oninput = function () { d.leido[p[1]] = e.value; }; });
  }
};

function comprobar(d) {
  var tot = totalDesglose(d), imp = num(d.leido.imp), dif = r2(imp - tot), R = [];
  R.push(!imp ? { k: 'no', t: 'Falta el importe del justificante.' } : dif === 0 ? { k: 'ok', t: 'El justificante (' + eur(imp) + ') coincide con el desglose.' } : { k: 'no', t: 'El justificante muestra ' + eur(imp) + ' y el desglose suma ' + eur(tot) + ' (diferencia de ' + eur(Math.abs(dif)) + ').' });
  if (d.m === 'biz') { var tb = r2(d.biz.reduce(function (s, b) { return s + num(b.imp); }, 0)); if (tb !== tot) R.push({ k: 'no', t: 'Los Bizum suman ' + eur(tb) + ' y el desglose ' + eur(tot) + '.' }); }
  if (d.m === 'ef') { var esp = codigoDe(conceptoEsperado(d.t)), lei = codigoDe(d.leido.conc); R.push(!lei ? { k: 'av', t: 'Sin concepto del recibo: Recaudación lo comprobará.' } : lei === esp ? { k: 'ok', t: 'El concepto del cajero (' + lei + ') es correcto.' } : { k: 'no', t: 'El concepto del cajero es ' + lei + ', pero para ' + TIPOS[d.t].n.toLowerCase() + ' debía ser ' + esp + '.' }); }
  if (d.mixto) R.push({ k: 'no', t: 'Ingreso mixto: alquiler o diezmos fueron junto con las ofrendas.' });
  var fi = new Date(d.leido.fecha || d.fecha), ahora = new Date(), h = (ahora - fi) / 36e5, fuera = h > CONF.plazoHoras || fi.getMonth() !== ahora.getMonth() || fi.getFullYear() !== ahora.getFullYear();
  R.push(fuera ? { k: 'av', fuera: true, t: 'Fuera de plazo: han pasado ' + Math.floor(h) + ' horas o es de otro mes. Se admite, queda registrado y se avisa a Recaudación.' } : { k: 'ok', t: 'Dentro de plazo.' });
  return R;
}

VIEWS.revisar = function () {
  var d = S.d, R = comprobar(d), inc = R.filter(function (r) { return r.k === 'no'; }), T = TIPOS[d.t];
  $('#app').innerHTML = pasos(4) + '<h1>Revisa y envía</h1>' +
    '<section class="card">' + R.map(function (r) { return '<div class="chk ' + r.k + '"><b>' + (r.k === 'ok' ? '✓' : r.k === 'no' ? '✕' : '!') + '</b><span>' + esc(r.t) + '</span></div>'; }).join('') + '</section>' +
    '<div class="recibo"><h3>' + esc(d.m === 'ef' ? 'Ingreso en cajero · ' + T.n : d.m === 'tpv' ? 'TPV · ' + (d.tpv === 'otro' ? d.tpvOtro : d.tpv) : 'Bizum') + '</h3>' + lineasDe(d).map(function (l) { return '<div class="rl"><span>' + esc(l[0]) + '</span><span>' + eur(l[1]) + '</span></div>'; }).join('') + '<div class="rl tot"><span>Total</span><span>' + eur(totalDesglose(d)) + '</span></div></div>' +
    (inc.length ? '<section class="card"><label class="lbl" for="ex">Explica la diferencia a Recaudación</label><textarea class="in" id="ex" placeholder="Por ejemplo: faltó anotar 2 € de una ofrenda misionera">' + esc(d.expl || '') + '</textarea><p class="nota">Puedes volver atrás y corregir, o enviarlo así: llegará como incidencia.</p></section>' : '') +
    '<p class="err" id="err" role="alert"></p><div class="bar"><button class="btn" id="atr">Atrás</button><button class="btn pri" id="env">' + (inc.length ? 'Enviar con incidencia' : 'Enviar') + '</button></div>';
  var ex = $('#ex'); if (ex) ex.oninput = function () { d.expl = ex.value; };
  $('#atr').onclick = function () { S.v = 'justificante'; render(); };
  $('#env').onclick = function () {
    if (inc.length && !String(d.expl || '').trim()) { toast('Escribe una explicación para Recaudación'); ex.focus(); return; }
    var fin = espera($('#env'), 'Enviando…');
    var lin = {}; Object.keys(d.lin).forEach(function (k) { if (num(d.lin[k])) lin[k] = num(d.lin[k]); });
    llamar('declarar', {
      token: U.token, cod: cod(), envio: d.envio, tipo: d.t, mixto: !!d.mixto, fecha: d.fecha, banco: d.banco,
      tpv: d.m === 'tpv' ? (d.tpv === 'otro' ? String(d.tpvOtro || '').replace(/\s/g, '').toUpperCase() : d.tpv) : '',
      lineas: lin, otros: d.otros.filter(function (o) { return num(o.imp); }).map(function (o) { return { desc: o.desc, imp: num(o.imp) }; }),
      otrosDistritales: d.otrosD.filter(function (o) { return num(o.imp); }).map(function (o) { return { desc: o.desc, imp: num(o.imp) }; }),
      bizum: d.m === 'biz' ? d.biz.filter(function (b) { return b.n.trim() || num(b.imp); }).map(function (b) { return { nombre: b.n, dni: b.dni, imp: num(b.imp) }; }) : [],
      justificantes: d.archivos.filter(function (a) { return a.id; }).map(function (a) { return a.id; }),
      importeJustificante: num(d.leido.imp), conceptoLeido: d.leido.conc || '', fechaLeida: d.leido.fecha || '',
      lecturaB: d.lecB ? { importe: d.lecB.importe, fecha: d.lecB.fecha, hora: d.lecB.hora, concepto: d.lecB.concepto } : null,
      explicacion: d.expl || ''
    }).then(function (r) { S = { v: 'hecho', r: r }; render(); }).catch(function (e) { fin(); $('#err').textContent = e.message; });
  };
};

VIEWS.hecho = function () {
  var r = S.r;
  $('#app').innerHTML = '<h1>Envío recibido</h1><p style="margin:-6px 0 0">Te hemos enviado este resguardo a tu correo corporativo.' + (r.fuera ? ' Se ha registrado que se envió <b>fuera de plazo</b>.' : '') + (r.incidencia ? ' Recaudación revisará la incidencia y te escribirá por aquí.' : '') + '</p>' +
    '<div class="recibo"><div class="row" style="justify-content:space-between"><h3>Resguardo de declaración</h3><span class="pill ' + (r.incidencia ? 'p-in' : r.fuera ? 'p-fp' : 'p-re') + '">' + esc(r.estado) + '</span></div>' +
    '<p style="margin:6px 0 10px"><b>' + esc(r.congregacion) + '</b> · ' + esc(r.cod) + ' · Distrito ' + esc(r.distrito) + '<br><span class="nota">Nº ' + esc(r.id) + ' · ' + esc(r.metodo + (r.metodo === 'Cajero' ? ' · ' + r.tipo : '')) + ' · ' + fechaTxt(r.fecha) + '</span></p>' +
    r.lineas.map(function (l) { return '<div class="rl"><span>' + esc(l[0]) + '</span><span>' + eur(l[1]) + '</span></div>'; }).join('') + '<div class="rl tot"><span>Total declarado</span><span>' + eur(r.total) + '</span></div>' +
    '<p class="nota" style="margin:12px 0 0">Este resguardo acredita la declaración del desglose. La confirmación del ingreso llegará cuando Recaudación lo concilie con el banco.</p></div>' +
    '<button class="btn pri full" id="vol">Volver al inicio</button>';
  $('#vol').onclick = function () { S = { v: 'inicio' }; render(); };
};

$('#salir').onclick = function () { salir(); };
if (DEMO) { var b = document.createElement('div'); b.className = 'demo'; b.textContent = 'Versión de prueba: no se envía nada. Entra con cualquier usuario del tipo nombre.apellido.'; document.body.insertBefore(b, document.body.firstChild); }
llamar('config').then(function (c) { Object.assign(CONF, c); }).catch(function () { }).then(render);
})();
