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

// Modo de prueba: una congregación inventada con año y medio de envíos de ejemplo; nada sale del navegador.
var DEMO_DB = { avisos: [
  { id: 'm0', tipo: 'msg', prioridad: 'Importante', confirmar: true, titulo: 'Cierre de mes', texto: 'Recuerde declarar cada ingreso como tarde 24 horas después de hacerlo, y siempre dentro del mismo mes.', de: 'Recaudación General' },
  { id: 'm1', tipo: 'msg', prioridad: 'Normal', titulo: 'Bienvenidos a Tesorería IPUE', texto: 'Esta es la versión de prueba: puede declarar ingresos y ver cómo funciona. Nada se envía de verdad.', de: 'Recaudación General' }] };
var DEMO_HIST = null;
function isoLocal(d) { var p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
function demoHistorial() {
  if (DEMO_HIST) return DEMO_HIST;
  var seed = 20261126, R = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  var am = function (a, b, st) { st = st || 1; return Math.round((a + R() * (b - a)) / st) * st; };
  var hoy = new Date(), out = [], n = {};
  var mk = function (f, metodo, tipo, L) {
    var tot = r2(L.reduce(function (s, l) { return s + l[2]; }, 0)), k = f.getFullYear() + '-' + f.getMonth();
    n[k] = (n[k] || 0) + 1;
    var dias = (hoy - f) / 864e5;
    var e = { id: 'I999-' + String(f.getFullYear()).slice(2) + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('00' + n[k]).slice(-3), fecha: isoLocal(f), recibido: isoLocal(new Date(+f + 36e5)), metodo: metodo, tipo: tipo, total: tot, justificante: tot,
      estado: dias > 6 ? 'Conciliado' : 'Recibido', fuera: R() < .05, mixto: false, datafono: metodo === 'TPV' ? 'TPV000000001' : '', banco: metodo === 'Cajero' ? (R() < .8 ? 'BBVA' : 'Santander') : '', lineas: L, incidencia: null };
    if (R() < .035) { e.justificante = r2(tot + am(1, 20)); e.estado = dias > 12 ? 'Conciliado' : 'Incidencia'; e.incidencia = { tipo: 'Importe', estado: dias > 12 ? 'Resuelta' : 'Notificada', respuesta: dias > 12 ? 'Faltó anotar una ofrenda; corregido.' : '' }; }
    out.push(e);
  };
  for (var d = new Date(hoy.getFullYear() - 1, 0, 1); d <= hoy; d.setDate(d.getDate() + 1)) {
    var f = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 30), dia = f.getDate(), w = f.getDay(), L;
    if (f > hoy) break;
    if (w === 0) { L = [['AC', C.AC, am(40, 260, .5)]]; if (R() < .35) L.push(['DI', C.DI, am(30, 300, .5)]); if (R() < .3) L.push(['OM', C.OM, am(10, 60, 5)]); mk(f, 'TPV', 'TPV', L); }
    if (dia === 3 || (dia === 17 && R() < .5)) {
      L = [['OM', C.OM, am(40, 160, 5)], ['SU', C.SU, am(30, 120, .5)], ['VC', C.VC, am(5, 30, 5)]];
      if (R() < .6) L.push(['EV', C.EV, am(5, 20, 5)]); if (R() < .6) L.push(['GC', C.GC, am(5, 20, 5)]); if (R() < .5) L.push(['SM', C.SM, am(10, 40, 5)]);
      if (R() < .4) L.push(['SV', C.SV, 14.5]); if (R() < .4) L.push(['RC', C.RC, am(40, 90)]); if (R() < .3) L.push(['PDM', C.PDM, am(10, 40, 5)]);
      mk(f, 'Cajero', 'Ofrendas generales', L);
    }
    if (dia === 5) mk(f, 'Cajero', 'Diezmos', [['DI', C.DI, am(280, 900, .1)]]);
    if (dia === 1) mk(f, 'Cajero', 'Alquiler', [['AL', C.AL, 650]]);
    if (dia === 12 && R() < .55) mk(f, 'Bizum', 'Bizum', [['OM', C.OM, am(20, 90, 5)], ['AC', C.AC, am(10, 60, 5)]]);
  }
  DEMO_HIST = out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
  return DEMO_HIST;
}
function demo(accion, d) {
  return new Promise(function (res, rej) {
    setTimeout(function () {
      if (accion === 'config') return res(CONF);
      if (accion === 'login') {
        if (!/^[a-z]+\.[a-z]+$/.test(String(d.usuario || ''))) return rej(new Error('Usuario o contraseña incorrectos.'));
        return res({ token: 'demo', nombre: 'Pastor de Prueba', congregaciones: [{ cod: 'I999', nombre: 'Congregación de Prueba', dist: 1, lic: 'MC999', rol: 'Pastor', tpv: ['TPV000000001'] }] });
      }
      if (accion === 'inicio') return res({ avisos: DEMO_DB.avisos, envios: demoHistorial().slice(0, 20) });
      if (accion === 'misEnvios') return res({ envios: demoHistorial() });
      if (accion === 'leido') { DEMO_DB.avisos = DEMO_DB.avisos.filter(function (a) { return a.id !== d.id; }); return res({ ok: true }); }
      if (accion === 'subirJustificante') return res({ id: 'demo' + Math.random().toString(36).slice(2) });
      if (accion === 'leerJustificante') return res({ disponible: false });
      if (accion === 'declarar') {
        var H = demoHistorial(), f = new Date(d.fecha), k = f.getFullYear() + '-' + f.getMonth();
        var nmes = H.filter(function (e) { return e.fecha.slice(0, 7) === d.fecha.slice(0, 7); }).length + 1;
        var tot = r2(totalDesglose(S.d)), id = 'I999-' + String(f.getFullYear()).slice(2) + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('00' + nmes).slice(-3);
        var ch = comprobar(S.d), inc = ch.some(function (c) { return c.k === 'no'; }), fuera = ch.some(function (c) { return c.fuera; });
        var met = d.tipo === 'tpv' ? 'TPV' : d.tipo === 'biz' ? 'Bizum' : 'Cajero';
        var r = { id: id, estado: inc ? 'Incidencia' : fuera ? 'Fuera de plazo' : 'Recibido', incidencia: inc, fuera: fuera, congregacion: 'Congregación de Prueba', cod: 'I999', distrito: 1, metodo: met, tipo: TIPOS[d.tipo].n, fecha: d.fecha, total: tot, lineas: lineasDe(S.d) };
        H.unshift({ id: id, fecha: d.fecha, recibido: isoLocal(new Date()), metodo: met, tipo: TIPOS[d.tipo].n, total: tot, justificante: num(d.importeJustificante), estado: inc ? 'Incidencia' : 'Recibido', fuera: fuera, mixto: !!d.mixto, datafono: d.tpv || '', banco: met === 'Cajero' ? d.banco : '', lineas: lineasCod(S.d), incidencia: inc ? { tipo: 'Importe', estado: 'Abierta', respuesta: '' } : null });
        H.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
        return res(r);
      }
      rej(new Error('Acción desconocida'));
    }, accion === 'login' ? 500 : 250);
  });
}

// ── Estado y vistas ─────────────────────────────────────────────
var U = recuperar('u'), S = { v: U ? (U.c ? 'inicio' : 'elegir') : 'login' };
var VIEWS = {};
function render() {
  var dentro = !!(U && U.c);
  document.documentElement.dataset.vista = VIEWS[S.v] && U ? S.v : 'login';
  cerrarMenu();
  $('#uchip').hidden = !dentro;
  if (dentro) { $('#uav').textContent = iniciales(U.nombre); $('#ucod').textContent = U.c.cod; }
  (VIEWS[S.v] || VIEWS.login)();
  window.scrollTo(0, 0);
}
// ── Tema (día / noche), como en EDEM ────────────────────────────
function temaActual() { var t = document.documentElement.dataset.theme; return t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
function cambiarTema() { var t = temaActual() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('tes.tema', t); } catch (e) { } }
function iniciales(n) { var p = String(n || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '?').charAt(0) + (p[1] || '').charAt(0)).toUpperCase(); }
var IC = {
  sol: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  luna: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  casa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  salir: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 12H4M8 8l-4 4 4 4M13 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6"/></svg>',
  usuario: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  candado: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  ojo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  ojoNo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
};
function cerrarMenu() { var m = $('#menu'); if (m) m.remove(); var c = $('#uchip'); if (c) c.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', fueraMenu, true); }
function fueraMenu(ev) { if (!ev.target.closest('#menu') && !ev.target.closest('#uchip')) cerrarMenu(); }
function abrirMenu() {
  if ($('#menu')) return cerrarMenu();
  var noche = temaActual() === 'dark';
  var m = document.createElement('div'); m.className = 'menu'; m.id = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = '<div class="mh"><b>' + esc(U.nombre || '') + '</b><small>' + esc(U.c.nombre) + ' · ' + esc(U.c.cod) + ' · ' + esc(U.c.rol || 'Pastor') + '</small></div><div class="mb">' +
    (U.cs.length > 1 ? '<button role="menuitem" data-a="otra">' + IC.casa + 'Cambiar de congregación</button>' : '') +
    '<button role="menuitem" data-a="tema">' + (noche ? IC.sol + 'Modo día' : IC.luna + 'Modo noche') + '</button>' +
    '<button role="menuitem" class="dan" data-a="salir">' + IC.salir + 'Salir</button></div>';
  document.body.appendChild(m); var rc = $('#uchip').getBoundingClientRect(); m.style.top = Math.round(rc.bottom + 8) + 'px'; m.style.right = Math.max(12, Math.round(innerWidth - rc.right)) + 'px'; $('#uchip').setAttribute('aria-expanded', 'true');
  m.onclick = function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a; cerrarMenu();
    if (a === 'tema') cambiarTema();
    else if (a === 'salir') salir();
    else if (a === 'otra') { U.c = null; HIST = null; guardar('u', U); S = { v: 'elegir' }; render(); }
  };
  setTimeout(function () { document.addEventListener('click', fueraMenu, true); }, 0);
}
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrarMenu(); });

function salir(msg) { U = null; HIST = null; guardar('u', null); S = { v: 'login', msg: msg || '' }; render(); }
function cod() { return U.c.cod; }
function codl() { return U.c.cod.toLowerCase(); }
function conceptoEsperado(t) { return t === 'gen' ? 'Donativos ' + codl() : t === 'sum' ? 'Donativo SU' + codl() : t === 'alq' ? 'Donativo A' + codl() : t === 'die' ? 'Donativos ' + (U.c.lic || '') : ''; }
function codigoDe(txt) { var m = String(txt || '').toUpperCase().replace(/-/g, '').match(/DONATIV\w*\s+([A-Z]*\d+)/); return m ? m[1] : ''; }
function espera(btn, txt) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = txt; return function () { btn.disabled = false; btn.textContent = btn.dataset.t; }; }

VIEWS.login = function () {
  $('#app').innerHTML = '<div class="acceso"><section class="bpane" aria-hidden="true"><div class="dots"></div><div class="mapa"></div>' +
    '<img class="blogo" src="logo-blanco.png" alt="">' +
    '<h2>Formulario Digital<span>Envíos al fondo nacional</span></h2>' +
    '<p class="bpie"><b>Tesorería IPUE</b>Sede Administrativa Nacional</p></section>' +
    '<section class="fstage"><form class="lcard" id="f" novalidate><h1 class="greet">Hola,<br>Dios te bendiga.</h1>' +
    '<p class="nota" style="margin:-6px 0 0">Entra con tu usuario y la contraseña de pastor o de recaudador de tu congregación.</p>' +
    '<div><label class="lbl" for="u">Usuario</label><div class="campo"><span class="ico">' + IC.usuario + '</span><input class="in" id="u" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="nombre.apellido"></div></div>' +
    '<div><label class="lbl" for="p">Contraseña</label><div class="campo pw"><span class="ico">' + IC.candado + '</span><input class="in" id="p" type="password" autocomplete="current-password"><button type="button" class="ojo" id="ojo" aria-label="Mostrar la contraseña">' + IC.ojo + '</button></div></div>' +
    '<p class="err" id="err" role="alert">' + esc(S.msg || '') + '</p><button class="btn pri full" id="ent">Continuar</button>' +
    '<p class="nota" style="margin:0;text-align:center">¿No puedes entrar? Escribe a <a class="lnk" href="mailto:recaudacion@ipue.es">recaudacion@ipue.es</a></p></form>' +
    '<div class="lpie"><button type="button" class="tswitch" id="tsw"><i></i><span id="tswt"></span></button><span class="proto">tesoreria.ipue.app</span></div></section></div>';
  var tt = function () { $('#tswt').textContent = temaActual() === 'dark' ? 'Modo noche' : 'Modo día'; }; tt();
  $('#tsw').onclick = function () { cambiarTema(); tt(); };
  $('#ojo').onclick = function () { var p = $('#p'), v = p.type === 'password'; p.type = v ? 'text' : 'password'; this.innerHTML = v ? IC.ojoNo : IC.ojo; this.setAttribute('aria-label', v ? 'Ocultar la contraseña' : 'Mostrar la contraseña'); };
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

// ── Historial («Mis envíos») ────────────────────────────────────
var HIST = null;
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
var MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fISO(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)) : new Date(0); }
function mk(e) { return e.metodo === 'TPV' ? 'tpv' : e.metodo === 'Bizum' ? 'biz' : 'ef'; }
function eur0(n) { return Math.round(+n || 0).toLocaleString('es-ES') + ' €'; }
function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
function estadoDe(e) { var s = e.estado === 'Exportado' ? 'Conciliado' : e.estado; return { t: s === 'Recibido' ? 'En revisión' : s, c: s === 'Conciliado' ? 'p-ok' : s === 'Incidencia' ? 'p-in' : 'p-re' }; }
function suma(L) { return r2(L.reduce(function (s, e) { return s + (+e.total || 0); }, 0)); }
function cargarHistorial(forzar) {
  if (!forzar && HIST && HIST.cod === cod()) return Promise.resolve(HIST);
  return llamar('misEnvios', { token: U.token, cod: cod() }).then(function (r) { HIST = { cod: cod(), envios: r.envios || [], completo: true }; return HIST; });
}
var MET = { ef: 'Cajero', tpv: 'TPV', biz: 'Bizum' };
var MI = { ef: '€', tpv: 'TPV', biz: 'Bz' };
function filaEnvio(e) {
  var st = estadoDe(e), m = mk(e), f = fISO(e.fecha);
  return '<button class="envio" data-env="' + esc(e.id) + '"><span class="mi ' + m + '" aria-hidden="true">' + MI[m] + '</span><span class="tx"><b>' + esc(m === 'ef' ? e.tipo : MET[m]) + '</b><small>' + f.getDate() + ' ' + MES3[f.getMonth()] + ' · ' + esc(e.id) + '</small></span>' +
    '<span class="im"><b>' + eur(e.total) + '</b><span class="pill ' + st.c + '">' + esc(st.t) + '</span>' + (e.fuera ? ' <span class="pill p-fp">Fuera de plazo</span>' : '') + '</span></button>';
}
function hojaEnvio(e) {
  var st = estadoDe(e), m = mk(e), f = fISO(e.fecha), dif = e.justificante ? r2(e.justificante - e.total) : 0;
  var v = document.createElement('div'); v.className = 'velo';
  v.innerHTML = '<div class="hoja" role="dialog" aria-modal="true" aria-label="Envío ' + esc(e.id) + '"><div class="asa"></div>' +
    '<div class="shead"><div><p class="nota" style="margin:0">' + esc(e.id) + '</p><h2 style="font-size:21px">' + esc(m === 'ef' ? 'Cajero · ' + e.tipo : MET[m]) + '</h2></div><button class="btn sm" data-x>Cerrar</button></div>' +
    '<p style="margin:4px 0 12px"><span class="pill ' + st.c + '">' + esc(st.t) + '</span>' + (e.fuera ? ' <span class="pill p-fp">Fuera de plazo</span>' : '') + (e.mixto ? ' <span class="pill p-in">Ingreso mixto</span>' : '') + '</p>' +
    '<div class="recibo"><h3>Ingreso del ' + f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear() + (e.fecha.length > 11 ? ' · ' + e.fecha.slice(11, 16) : '') + '</h3>' +
    (e.lineas && e.lineas.length ? e.lineas.map(function (l) { return '<div class="rl"><span>' + esc(l[1] || C[l[0]] || l[0]) + '</span><span>' + eur(l[2]) + '</span></div>'; }).join('') : '<p class="nota">El detalle del desglose estará disponible cuando se actualice el servicio.</p>') +
    '<div class="rl tot"><span>Total declarado</span><span>' + eur(e.total) + '</span></div>' +
    (e.justificante ? '<div class="rl"><span class="nota">Importe del justificante</span><span class="nota">' + eur(e.justificante) + (dif ? ' (' + (dif > 0 ? '+' : '−') + eur(Math.abs(dif)) + ')' : ' ✓') + '</span></div>' : '') + '</div>' +
    '<div style="display:grid;gap:4px;margin-top:18px" class="nota">' + (e.datafono ? '<span>Datáfono: ' + esc(e.datafono) + '</span>' : '') + (e.banco ? '<span>Banco: ' + esc(e.banco) + '</span>' : '') + (e.recibido ? '<span>Declarado: ' + fechaTxt(e.recibido) + ' ' + esc(e.recibido.slice(11, 16)) + (e.usuario ? ' · ' + esc(e.usuario) : '') + '</span>' : '') + '</div>' +
    (e.incidencia ? '<div class="aviso inc" style="margin-top:14px;box-shadow:none"><p class="et">Incidencia · ' + esc(e.incidencia.estado) + '</p><p style="margin:0">' + esc(e.incidencia.tipo) + (e.incidencia.respuesta ? '<br><span class="nota">Respuesta: ' + esc(e.incidencia.respuesta) + '</span>' : '') + '</p></div>' : '') +
    '<button class="btn full" style="margin-top:16px" data-cp>Copiar resumen</button></div>';
  document.body.appendChild(v);
  var cerrar = function () { v.remove(); document.removeEventListener('keydown', k); }, k = function (ev) { if (ev.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', k);
  v.onclick = function (ev) { if (ev.target === v) cerrar(); };
  v.querySelector('[data-x]').onclick = cerrar; v.querySelector('[data-x]').focus();
  v.querySelector('[data-cp]').onclick = function () {
    copiar(U.c.nombre + ' (' + U.c.cod + ') · envío ' + e.id + '\n' + (m === 'ef' ? 'Cajero · ' + e.tipo : MET[m]) + ' · ' + fechaTxt(e.fecha) + '\n' +
      (e.lineas || []).map(function (l) { return (l[1] || C[l[0]] || l[0]) + ': ' + eur(l[2]); }).join('\n') + '\nTotal: ' + eur(e.total) + ' · ' + st.t);
  };
}
function conectarFilas(L) { $$('[data-env]').forEach(function (b) { b.onclick = function () { var e = L.filter(function (x) { return x.id === b.dataset.env; })[0]; if (e) hojaEnvio(e); }; }); }

VIEWS.inicio = function () {
  $('#app').innerHTML = '<p class="nota">Cargando…</p>';
  Promise.all([llamar('inicio', { token: U.token, cod: cod() }), cargarHistorial().catch(function () { return null; })]).then(function (x) {
    var r = x[0], h = x[1];
    if (!h) HIST = h = { cod: cod(), envios: (r.envios || []).map(function (e) { return Object.assign({ lineas: [] }, e); }), completo: false };
    var E = h.envios, hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
    var deMes = function (yy, mm, hastaDia) { return E.filter(function (e) { var f = fISO(e.fecha); return f.getFullYear() === yy && f.getMonth() === mm && (!hastaDia || f.getDate() <= hastaDia); }); };
    var este = deMes(y, m), pm = new Date(y, m - 1, 1), prev = deMes(pm.getFullYear(), pm.getMonth(), hoy.getDate());
    var tEste = suma(este), tPrev = suma(prev), dp = tPrev ? Math.round(100 * (tEste - tPrev) / tPrev) : null;
    var meses6 = [5, 4, 3, 2, 1, 0].map(function (k) { var d = new Date(y, m - k, 1); return { l: MES3[d.getMonth()], t: suma(deMes(d.getFullYear(), d.getMonth())) }; });
    var mx = Math.max.apply(null, meses6.map(function (q) { return q.t; }).concat([1]));
    var enPlazo = este.length ? Math.round(100 * este.filter(function (e) { return !e.fuera; }).length / este.length) : null;
    var incs = E.filter(function (e) { return e.estado === 'Incidencia'; }).length;
    var avisoHtml = function (a) {
      var cls = a.tipo === 'inc' ? 'inc' : (a.prioridad || 'Normal'), et = a.tipo === 'inc' ? 'Incidencia en un envío' : a.prioridad === 'Urgente' ? 'Urgente' : a.prioridad === 'Importante' ? 'Importante' : 'Mensaje de Recaudación';
      return '<div class="aviso ' + esc(cls) + '"><p class="et">' + et + '</p><h3>' + esc(a.titulo) + '</h3><p style="white-space:pre-line">' + esc(a.texto) + '</p>' +
        '<div class="row"><button class="btn sm ' + (a.confirmar || a.tipo === 'inc' ? 'pri' : '') + '" data-leer="' + esc(a.id) + '" data-t="' + a.tipo + '">' + (a.confirmar ? 'Confirmo que lo he leído' : 'Marcar como leído') + '</button><button class="btn sm" data-resp="' + esc(a.id) + '">Responder</button></div>' +
        '<div data-caja="' + esc(a.id) + '" hidden style="margin-top:12px"><textarea class="in" aria-label="Respuesta"></textarea><button class="btn pri sm" style="margin-top:8px" data-envr="' + esc(a.id) + '" data-t="' + a.tipo + '">Enviar respuesta</button></div></div>';
    };
    $('#app').innerHTML = '<div class="hola"><p class="gsm">Dios te bendiga, ' + esc(cap(String(U.nombre || '').split(' ')[0].toLowerCase())) + '.</p><h1>' + esc(U.c.nombre) + '</h1><div class="chips"><span class="chip">' + esc(U.c.cod) + '</span><span class="chip">Distrito ' + esc(U.c.dist) + '</span><span class="chip">' + esc(U.c.rol || 'Pastor') + '</span>' + (U.cs.length > 1 ? '<button class="lnk" id="otra" style="padding:0 4px">Cambiar de congregación</button>' : '') + '</div></div>' +
      r.avisos.map(avisoHtml).join('') +
      '<button class="cta" id="nuevo"><span class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span><span><b>Declarar un ingreso</b><span>Cajero, TPV o Bizum · 4 pasos</span></span><span class="fl" aria-hidden="true">›</span></button>' +
      '<section class="card mes"><div class="cab"><h2>' + cap(MESES[m]) + ' ' + y + '</h2><button class="lnk" id="vermes">Ver detalle</button></div>' +
      '<div><div class="cifra">' + eur(tEste) + '</div><div class="delta ' + (dp > 0 ? 'up' : dp < 0 ? 'down' : '') + '">' + (dp == null ? 'Declarado este mes' : (dp > 0 ? '▲ ' : dp < 0 ? '▼ ' : '') + Math.abs(dp) + ' % frente a ' + MESES[pm.getMonth()] + ' a estas alturas') + '</div></div>' +
      '<div class="tres"><div><b>' + este.length + '</b><span>envíos</span></div><div><b>' + (enPlazo == null ? '—' : enPlazo + ' %') + '</b><span>en plazo</span></div><div><b>' + incs + '</b><span>incidencias</span></div></div>' +
      '<div class="mini" role="img" aria-label="Declarado en los últimos seis meses">' + meses6.map(function (q, i) { return '<div title="' + esc(cap(q.l) + ': ' + eur(q.t)) + '"><i class="' + (i === 5 ? 'on' : '') + '" style="height:' + Math.max(4, Math.round(40 * q.t / mx)) + 'px"></i><small>' + q.l + '</small></div>'; }).join('') + '</div></section>' +
      '<section class="card"><div class="shead"><h2>Últimos envíos</h2>' + (E.length ? '<button class="lnk" id="todos">Ver todos</button>' : '') + '</div>' +
      (E.length ? E.slice(0, 4).map(filaEnvio).join('') : '<p class="vacio">Aún no hay envíos. Cuando declares uno, aparecerá aquí.</p>') + '</section>' +
      (E.length ? '<button class="btn full" id="todos2">Ver todos mis envíos, balances y gráficos</button>' : '');
    conectarFilas(E);
    var leer = function (id, tipo, resp) { return llamar('leido', { token: U.token, cod: cod(), id: id, tipo: tipo, respuesta: resp || '' }).then(function () { toast(resp ? 'Respuesta enviada a Recaudación' : 'Marcado como leído'); render(); }, function (e) { toast(e.message); }); };
    $$('[data-leer]').forEach(function (b) { b.onclick = function () { b.disabled = true; leer(b.dataset.leer, b.dataset.t); }; });
    $$('[data-resp]').forEach(function (b) { b.onclick = function () { var c = document.querySelector('[data-caja="' + b.dataset.resp + '"]'); c.hidden = !c.hidden; c.querySelector('textarea').focus(); }; });
    $$('[data-envr]').forEach(function (b) { b.onclick = function () { var t = document.querySelector('[data-caja="' + b.dataset.envr + '"] textarea').value.trim(); if (!t) { toast('Escribe la respuesta'); return; } b.disabled = true; leer(b.dataset.envr, b.dataset.t, t); }; });
    var o = $('#otra'); if (o) o.onclick = function () { U.c = null; HIST = null; guardar('u', U); S = { v: 'elegir' }; render(); };
    var ir = function (per) { return function () { S = { v: 'envios', f: { per: per, q: '', met: '', est: '', lim: 40 } }; render(); }; };
    ['#todos', '#todos2'].forEach(function (s) { var b = $(s); if (b) b.onclick = ir('anio'); });
    $('#vermes').onclick = ir('mes');
    $('#nuevo').onclick = function () { S = { v: 'metodo', d: { envio: idTemp(), lin: {}, otros: [], otrosD: [], biz: [{ n: '', dni: '', imp: '' }], fecha: ahoraLocal(0), banco: 'BBVA', archivos: [] } }; render(); };
  }).catch(function (e) { $('#app').innerHTML = '<p class="card err">' + esc(e.message) + '</p><button class="btn" id="re">Reintentar</button>'; $('#re').onclick = render; });
};

// Periodos de «Mis envíos».
function periodos() { var h = new Date(); return [['mes', 'Este mes'], ['ant', cap(MESES[(h.getMonth() + 11) % 12])], ['anio', String(h.getFullYear())], ['anioAnt', String(h.getFullYear() - 1)], ['todo', 'Todo']]; }
function rango(per) {
  var h = new Date(), y = h.getFullYear(), m = h.getMonth(), fin = function (yy, mm) { return new Date(yy, mm + 1, 0, 23, 59); };
  if (per === 'mes') { var pd = Math.min(h.getDate(), new Date(y, m, 0).getDate()); return { a: new Date(y, m, 1), b: h, g: 'dia', n: MESES[m], pa: new Date(y, m - 1, 1), pb: new Date(y, m - 1, pd, 23, 59), pn: MESES[(m + 11) % 12] + ' a estas alturas' }; }
  if (per === 'ant') return { a: new Date(y, m - 1, 1), b: fin(y, m - 1), g: 'dia', n: MESES[(m + 11) % 12], pa: new Date(y, m - 2, 1), pb: fin(y, m - 2), pn: MESES[(m + 10) % 12] };
  if (per === 'anio') return { a: new Date(y, 0, 1), b: h, g: 'mes', n: String(y), pa: new Date(y - 1, 0, 1), pb: new Date(y - 1, m, h.getDate(), 23, 59), pn: (y - 1) + ' a estas alturas' };
  if (per === 'anioAnt') return { a: new Date(y - 1, 0, 1), b: fin(y - 1, 11), g: 'mes', n: String(y - 1) };
  return { a: new Date(1970, 0, 1), b: h, g: 'mes', n: 'todo el historial' };
}
var ESTADOS = [['', 'Todos'], ['rev', 'En revisión'], ['ok', 'Conciliados'], ['inc', 'Incidencias'], ['fp', 'Fuera de plazo']];
function pasaFiltros(e, f) {
  if (f.met && mk(e) !== f.met) return false;
  if (f.est === 'rev' && e.estado !== 'Recibido') return false;
  if (f.est === 'ok' && !/^(Conciliado|Exportado)$/.test(e.estado)) return false;
  if (f.est === 'inc' && !(e.estado === 'Incidencia' || e.incidencia)) return false;
  if (f.est === 'fp' && !e.fuera) return false;
  var q = String(f.q || '').trim().toLowerCase();
  if (!q) return true;
  var qn = num(q), txt = [e.id, e.tipo, e.metodo, e.datafono, e.banco, estadoDe(e).t, fechaTxt(e.fecha)].concat((e.lineas || []).map(function (l) { return l[1] || C[l[0]] || ''; })).join(' ').toLowerCase();
  if (txt.indexOf(q) >= 0) return true;
  if (qn && /^[\d.,\s€]+$/.test(q)) return Math.abs(e.total - qn) < .005 || (e.lineas || []).some(function (l) { return Math.abs(l[2] - qn) < .005; }) || String(e.total).indexOf(String(qn)) === 0;
  return false;
}
function niceTop(max) { var p = Math.pow(10, Math.floor(Math.log10(max || 1))), s = [1, 2, 2.5, 5, 10].map(function (k) { return k * p; }).filter(function (v) { return v * 3 >= max; })[0] || 10 * p; return { st: s, top: Math.ceil(max / s) * s }; }
function kfmt(v) { return v >= 1000 ? (v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + 'k' : String(Math.round(v)); }
function grafico(el, B) {
  var W = Math.max(280, el.clientWidth), H = 196, pl = 38, pr = 4, pt = 8, pb = 24, keys = ['ef', 'tpv', 'biz'];
  var tot = function (b) { return b.v.ef + b.v.tpv + b.v.biz; }, mx = Math.max.apply(null, B.map(tot).concat([1])), nt = niceTop(mx);
  var bw = (W - pl - pr) / B.length, w = Math.max(3, Math.min(34, bw * .66)), ih = H - pt - pb, g = '';
  for (var v = 0; v <= nt.top + .001; v += nt.st) { var yy = H - pb - ih * v / nt.top; g += '<line x1="' + pl + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--line)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + kfmt(v) + '</text>'; }
  var cada = Math.ceil(B.length / (W < 420 ? 6 : 10));
  B.forEach(function (b, i) {
    var x = pl + i * bw + (bw - w) / 2, y = H - pb, vis = keys.filter(function (k) { return b.v[k] > 0; });
    vis.forEach(function (k, j) {
      var h = ih * b.v[k] / nt.top, hh = Math.max(1, h - (j > 0 ? 2 : 0)), top = j === vis.length - 1, r = top ? Math.min(4, w / 2, hh) : 0, y0 = y - h;
      g += top ? '<path d="M' + x + ',' + (y0 + hh) + 'V' + (y0 + r) + 'Q' + x + ',' + y0 + ' ' + (x + r) + ',' + y0 + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y0 + ' ' + (x + w) + ',' + (y0 + r) + 'V' + (y0 + hh) + 'Z" fill="var(--m-' + k + ')"/>' : '<rect x="' + x + '" y="' + y0 + '" width="' + w + '" height="' + hh + '" fill="var(--m-' + k + ')"/>';
      y -= h;
    });
    if (i % cada === 0 || i === B.length - 1 && B.length < 14) g += '<text x="' + (pl + i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + esc(b.l) + '</text>';
    g += '<rect x="' + (pl + i * bw) + '" y="0" width="' + bw + '" height="' + (H - pb) + '" fill="transparent" data-i="' + i + '"/>';
  });
  el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="Importe declarado por ' + (B.length > 13 ? 'día o mes' : 'periodo') + ' y método">' + g + '</svg><div class="tip" hidden></div>';
  var tip = el.querySelector('.tip'), svg = el.querySelector('svg');
  var ver = function (ev) {
    var t = ev.target; if (!t.dataset || t.dataset.i == null) { tip.hidden = true; return; }
    var b = B[+t.dataset.i], x = pl + (+t.dataset.i) * bw + bw / 2, s = W / svg.getBoundingClientRect().width;
    tip.innerHTML = '<b>' + esc(b.full) + '</b>' + keys.filter(function (k) { return b.v[k]; }).map(function (k) { return '<span><em style="font-style:normal">' + MET[k] + '</em>' + eur(b.v[k]) + '</span>'; }).join('') + '<span><em style="font-style:normal">Total</em><strong>' + eur(tot(b)) + '</strong></span>';
    tip.hidden = false; var px = Math.min(Math.max(x / s, 80), svg.getBoundingClientRect().width - 80); tip.style.left = px + 'px'; tip.style.top = '6px';
  };
  svg.addEventListener('pointermove', ver); svg.addEventListener('click', ver); svg.addEventListener('pointerleave', function () { tip.hidden = true; });
}
function descargarCSV(L) {
  var q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var filas = [['Nº', 'Fecha', 'Método', 'Tipo', 'Concepto', 'Importe', 'Estado', 'Fuera de plazo']];
  L.forEach(function (e) { var st = estadoDe(e).t; (e.lineas && e.lineas.length ? e.lineas : [['', '(sin desglose)', e.total]]).forEach(function (l) { filas.push([e.id, fechaTxt(e.fecha), e.metodo, e.tipo, l[1] || C[l[0]] || l[0], String(r2(l[2]).toFixed(2)).replace('.', ','), st, e.fuera ? 'Sí' : 'No']); }); });
  var blob = new Blob(['﻿' + filas.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'envios-' + cod() + '.csv'; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

VIEWS.envios = function () {
  var f = S.f = S.f || { per: 'anio', q: '', met: '', est: '', lim: 40 };
  if (!HIST || HIST.cod !== cod()) {
    $('#app').innerHTML = '<p class="nota">Cargando…</p>';
    cargarHistorial().then(render, function () { llamar('inicio', { token: U.token, cod: cod() }).then(function (r) { HIST = { cod: cod(), envios: (r.envios || []).map(function (e) { return Object.assign({ lineas: [] }, e); }), completo: false }; render(); }, function (e) { $('#app').innerHTML = '<p class="card err">' + esc(e.message) + '</p>'; }); });
    return;
  }
  var R = rango(f.per), E = HIST.envios, enR = function (e, a, b) { var d = fISO(e.fecha); return d >= a && d <= b; };
  var L = E.filter(function (e) { return enR(e, R.a, R.b) && pasaFiltros(e, f); });
  var P = R.pa ? E.filter(function (e) { return enR(e, R.pa, R.pb) && pasaFiltros(e, f); }) : null;
  var T = suma(L), TP = P ? suma(P) : 0, dp = P && TP ? Math.round(100 * (T - TP) / TP) : null;
  var enPlazo = L.length ? Math.round(100 * L.filter(function (e) { return !e.fuera; }).length / L.length) : null;
  var incs = L.filter(function (e) { return e.estado === 'Incidencia'; }).length;
  // Cubos para el gráfico.
  var B = [];
  if (R.g === 'dia') { var dias = new Date(R.a.getFullYear(), R.a.getMonth() + 1, 0).getDate(); for (var i = 1; i <= dias; i++) B.push({ l: String(i), full: i + ' de ' + MESES[R.a.getMonth()], v: { ef: 0, tpv: 0, biz: 0 } }); L.forEach(function (e) { B[fISO(e.fecha).getDate() - 1].v[mk(e)] += e.total; }); }
  else {
    var ini = f.per === 'todo' && L.length ? fISO(L[L.length - 1].fecha) : R.a, a0 = new Date(ini.getFullYear(), ini.getMonth(), 1), b0 = f.per === 'anioAnt' ? new Date(R.a.getFullYear(), 11, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (f.per === 'anio') a0 = new Date(R.a.getFullYear(), 0, 1);
    for (var d = new Date(a0); d <= b0; d.setMonth(d.getMonth() + 1)) B.push({ k: d.getFullYear() * 12 + d.getMonth(), l: MES3[d.getMonth()] + (f.per === 'todo' && d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''), full: cap(MESES[d.getMonth()]) + ' ' + d.getFullYear(), v: { ef: 0, tpv: 0, biz: 0 } });
    var idx = {}; B.forEach(function (b, j) { idx[b.k] = j; });
    L.forEach(function (e) { var x = fISO(e.fecha), j = idx[x.getFullYear() * 12 + x.getMonth()]; if (j != null) B[j].v[mk(e)] += e.total; });
  }
  var porMet = { ef: 0, tpv: 0, biz: 0 }; L.forEach(function (e) { porMet[mk(e)] += e.total; });
  var porC = {}; L.forEach(function (e) { (e.lineas || []).forEach(function (l) { var n = l[0] === 'OT' || l[0] === 'OD' ? 'Otros conceptos' : (C[l[0]] || l[1] || l[0]); porC[n] = (porC[n] || 0) + l[2]; }); });
  var conc = Object.keys(porC).map(function (k) { return [k, r2(porC[k])]; }).sort(function (a, b) { return b[1] - a[1]; });
  if (conc.length > 8) { var resto = conc.slice(7).reduce(function (s, c) { return s + c[1]; }, 0); conc = conc.slice(0, 7).concat([['Resto de conceptos', r2(resto)]]); }
  var cmax = conc.length ? conc[0][1] : 1, ctot = conc.reduce(function (s, c) { return s + c[1]; }, 0) || 1;
  // Lista agrupada por mes.
  var lista = '', mesAct = '', visibles = L.slice(0, f.lim);
  visibles.forEach(function (e) {
    var x = fISO(e.fecha), km = x.getFullYear() + '-' + x.getMonth();
    if (km !== mesAct) { mesAct = km; var st = suma(L.filter(function (z) { var y = fISO(z.fecha); return y.getFullYear() === x.getFullYear() && y.getMonth() === x.getMonth(); })); lista += '<div class="mesg"><span>' + MESES[x.getMonth()] + ' ' + x.getFullYear() + '</span><span>' + eur(st) + '</span></div>'; }
    lista += filaEnvio(e);
  });
  var nFil = (f.met ? 1 : 0) + (f.est ? 1 : 0), qc = String(f.q || '').trim().toLowerCase(), qConc = null;
  if (qc.length > 2 && !/^[\d.,\s€]+$/.test(qc)) { var sumC = 0, nombres = {}; L.forEach(function (e) { (e.lineas || []).forEach(function (l) { var n = C[l[0]] || l[1] || ''; if (n.toLowerCase().indexOf(qc) >= 0) { sumC += l[2]; nombres[n] = 1; } }); }); if (sumC) qConc = [Object.keys(nombres).slice(0, 2).join(', ') + (Object.keys(nombres).length > 2 ? '…' : ''), r2(sumC)]; }
  $('#app').innerHTML = '<div class="volver"><button id="vol" aria-label="Volver al inicio">‹</button><div><h1>Mis envíos</h1><p class="nota" style="margin:0">' + esc(U.c.nombre) + ' · ' + esc(U.c.cod) + '</p></div></div>' +
    '<div class="seg" role="group" aria-label="Periodo">' + periodos().map(function (p) { return '<button data-per="' + p[0] + '" aria-pressed="' + (f.per === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>' +
    '<div class="brow"><div class="buscar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input class="in" id="q" type="search" placeholder="Buscar nº, concepto, importe…" value="' + esc(f.q) + '" aria-label="Buscar en mis envíos" autocomplete="off"></div>' +
    '<button class="fbtn" id="fbtn" aria-expanded="' + !!f.panel + '" aria-controls="fpanel"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Filtros' + (nFil ? '<i>' + nFil + '</i>' : '') + '</button></div>' +
    (f.panel ? '<div class="card fpanel" id="fpanel"><p class="sec">Método</p><div class="fchips">' + [['', 'Todos'], ['ef', 'Cajero'], ['tpv', 'TPV'], ['biz', 'Bizum']].map(function (o) { return '<button class="fchip" data-met="' + o[0] + '" aria-pressed="' + (f.met === o[0]) + '">' + (o[0] ? '<i style="background:var(--m-' + o[0] + ')"></i>' : '') + o[1] + '</button>'; }).join('') + '</div>' +
      '<p class="sec">Estado</p><div class="fchips">' + ESTADOS.map(function (o) { return '<button class="fchip" data-est="' + o[0] + '" aria-pressed="' + (f.est === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>' :
      (nFil ? '<div class="activos">' + (f.met ? '<button data-quitar="met" aria-label="Quitar filtro ' + MET[f.met] + '">' + MET[f.met] + ' ✕</button>' : '') + (f.est ? '<button data-quitar="est" aria-label="Quitar filtro">' + ESTADOS.filter(function (o) { return o[0] === f.est; })[0][1] + ' ✕</button>' : '') + '</div>' : '')) +
    (nFil || f.q ? '<p class="nota" style="margin:-6px 0 0">' + L.length + ' envíos con estos filtros · <button class="lnk" id="limpiar" style="padding:0">Quitar filtros</button></p>' : '') +
    '<div class="kp"><div class="big1"><span>Declarado · ' + esc(R.n) + '</span><b>' + eur(T) + '</b>' + (qConc ? '<span class="sub">De ello, ' + esc(qConc[0]) + ': <b style="display:inline;font-size:inherit">' + eur(qConc[1]) + '</b></span>' : '') + '<span class="delta ' + (dp > 0 ? 'up' : dp < 0 ? 'down' : '') + '">' + (dp == null ? (P ? 'Sin envíos en ' + esc(R.pn) + ' para comparar' : '&nbsp;') : (dp > 0 ? '▲ ' : dp < 0 ? '▼ ' : '') + Math.abs(dp) + ' % frente a ' + esc(R.pn) + ' (' + eur0(TP) + ')') + '</span></div>' +
    '<div><b>' + L.length + '</b><span>envíos</span></div><div><b>' + (L.length ? eur0(T / L.length) : '—') + '</b><span>media por envío</span></div>' +
    '<div><b>' + (enPlazo == null ? '—' : enPlazo + ' %') + '</b><span>enviados en plazo</span></div><div><b>' + incs + '</b><span>con incidencia abierta</span></div></div>' +
    (L.length ? '<section class="card"><div class="shead"><h2>' + (R.g === 'dia' ? 'Cada día' : 'Cada mes') + '</h2></div><div class="graf" id="g"></div>' +
      '<div class="ley">' + ['ef', 'tpv', 'biz'].filter(function (k) { return porMet[k] || !f.met; }).map(function (k) { return '<span><i style="background:var(--m-' + k + ')"></i>' + MET[k] + ' <em>' + eur0(porMet[k]) + (T ? ' · ' + Math.round(100 * porMet[k] / T) + ' %' : '') + '</em></span>'; }).join('') + '</div></section>' +
      '<section class="card"><div class="shead"><h2>Por concepto</h2></div>' + (conc.length ? conc.map(function (c) { return '<div class="hb"><span>' + esc(c[0]) + '</span><b>' + eur(c[1]) + '<em>' + Math.round(100 * c[1] / ctot) + ' %</em></b><span class="t"><i style="width:' + Math.max(1, 100 * c[1] / cmax) + '%"></i></span></div>'; }).join('') : '<p class="nota">El desglose por concepto aparecerá cuando se actualice el servicio.</p>') + '</section>' : '') +
    '<section class="card"><div class="shead"><h2>' + (L.length === 1 ? '1 envío' : L.length + ' envíos') + '</h2>' + (L.length ? '<button class="lnk" id="csv">Descargar (CSV)</button>' : '') + '</div>' +
    (L.length ? lista + (L.length > f.lim ? '<button class="btn full" id="mas" style="margin-top:12px">Ver ' + Math.min(40, L.length - f.lim) + ' más</button>' : '') : '<p class="vacio">No hay envíos ' + (nFil || f.q ? 'con estos filtros' : 'en este periodo') + '.</p>') + '</section>' +
    (HIST.completo ? '' : '<p class="proto">Se muestran los últimos envíos. El historial completo llegará con la próxima actualización del servicio.</p>');
  if (L.length) grafico($('#g'), B);
  conectarFilas(L);
  $('#vol').onclick = function () { S = { v: 'inicio' }; render(); };
  $$('[data-per]').forEach(function (b) { b.onclick = function () { f.per = b.dataset.per; f.lim = 40; render(); }; });
  $$('[data-met]').forEach(function (b) { b.onclick = function () { f.met = b.dataset.met; f.lim = 40; var y = window.scrollY; render(); window.scrollTo(0, y); }; });
  $$('[data-est]').forEach(function (b) { b.onclick = function () { f.est = b.dataset.est; f.lim = 40; var y = window.scrollY; render(); window.scrollTo(0, y); }; });
  $('#fbtn').onclick = function () { f.panel = !f.panel; var y = window.scrollY; render(); window.scrollTo(0, y); };
  $$('[data-quitar]').forEach(function (b) { b.onclick = function () { f[b.dataset.quitar] = ''; render(); }; });
  var q = $('#q'), tq;
  q.oninput = function () { clearTimeout(tq); tq = setTimeout(function () { f.q = q.value; f.lim = 40; var y = window.scrollY; render(); window.scrollTo(0, y); var n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220); };
  var lp = $('#limpiar'); if (lp) lp.onclick = function () { f.q = ''; f.met = ''; f.est = ''; f.panel = false; render(); };
  var mas = $('#mas'); if (mas) mas.onclick = function () { var y = window.scrollY; f.lim += 40; render(); window.scrollTo(0, y); };
  var csv = $('#csv'); if (csv) csv.onclick = function () { descargarCSV(L); toast('Descargando ' + L.length + ' envíos'); };
};

var PASOS = ['Cómo llegó', 'Desglose', 'Justificante', 'Revisar'];
function pasos(n) { return '<div class="paso"><small>Paso ' + n + ' de 4 · ' + PASOS[n - 1] + '</small><div class="pasos" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '"></i>'; }).join('') + '</div></div>'; }

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

function lineasCod(d) {
  var L = [];
  Object.keys(d.lin).forEach(function (k) { if (num(d.lin[k])) L.push([k, C[k], num(d.lin[k])]); });
  d.otros.forEach(function (o) { if (num(o.imp)) L.push(['OT', 'Otros: ' + o.desc, num(o.imp)]); });
  d.otrosD.forEach(function (o) { if (num(o.imp)) L.push(['OD', 'Otros distritales: ' + o.desc, num(o.imp)]); });
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
    }).then(function (r) { HIST = null; S = { v: 'hecho', r: r }; render(); }).catch(function (e) { fin(); $('#err').textContent = e.message; });
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

$('#uchip').onclick = function () { abrirMenu(); };
if (DEMO) { var b = document.createElement('div'); b.className = 'demo'; b.textContent = 'Versión de prueba: no se envía nada. Entra con cualquier usuario del tipo nombre.apellido.'; document.body.insertBefore(b, document.body.firstChild); }
llamar('config').then(function (c) { Object.assign(CONF, c); }).catch(function () { }).then(render);
})();
