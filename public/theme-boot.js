// Modo de pantalla (spec 019): pone `dark` en <html> antes de pintar, sin destello blanco. La regla
// de src/features/theme/theme-mode.ts: los pacientes siguen a su aparato; el resto, lo último
// elegido aquí o el aparato. Luego manda la cuenta. Archivo propio: la CSP sólo permite 'self'.
(function () {
  var mode = "auto";
  try {
    var stored = localStorage.getItem("agenda360:modo-pantalla");
    if (stored === "light" || stored === "dark") mode = stored;
  } catch {
    // Sin almacenamiento.
  }
  if (/^\/(book|pago|cita)\//.test(location.pathname)) mode = "auto";
  var dark = mode === "dark" || (mode === "auto" && !!window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");

  // Los colores propios del panel (src/features/branding/brand-boot.ts): la pantalla de carga y el fondo
  // salen ya con ellos, sin pasar por los de Agenda360. Sólo en /dashboard y /admin; la app los quita
  // al aplicar los suyos. Lo que se lee se valida: sólo variables con colores, nada más de CSS.
  var brand = null;
  var area = /^\/dashboard(\/|$)/.test(location.pathname) ? "dashboard" : /^\/admin(\/|$)/.test(location.pathname) ? "admin" : null;
  if (area) {
    try {
      brand = JSON.parse(localStorage.getItem("agenda360:colores-carga") || "{}")[area] || null;
    } catch {
      brand = null;
    }
  }
  var SAFE_CSS = /^(\s*--[a-z0-9-]+:\s*(#[0-9a-f]{3,8}|rgba?\([0-9. ,/]+\));)+\s*$/i;
  var HEX = /^#[0-9a-f]{6}$/i;
  var valid = function (m) {
    return !!m && typeof m.css === "string" && SAFE_CSS.test(m.css) && HEX.test(m.ink) && HEX.test(m.paper) && HEX.test(m.highlight) && HEX.test(m.soft);
  };
  if (!brand || !valid(brand.light) || !valid(brand.dark)) brand = null;
  if (brand) {
    var loader = function (m) {
      return "--boot-ink: " + m.ink + "; --boot-paper: " + m.paper + "; --boot-highlight: " + m.highlight + "; --boot-soft: " + m.soft + ";";
    };
    var style = document.createElement("style");
    style.setAttribute("data-brand-boot", "");
    style.textContent =
      "html.brand-boot:root { " + brand.light.css + " }\n" +
      "@media screen { html.brand-boot:root.dark { " + brand.dark.css + " } html.brand-boot.dark { background: " + brand.dark.paper + "; } }\n" +
      "html.brand-boot .boot-loader { " + loader(brand.light) + " }\n" +
      "html.brand-boot.dark .boot-loader { " + loader(brand.dark) + " }";
    document.head.append(style);
    document.documentElement.classList.add("brand-boot");
  }

  // La barra del celular: --background de Agenda360, o el del panel con sus colores.
  var meta = document.querySelector('meta[name="theme-color"]');
  var agenda = dark ? "#201612" : "#ffffff";
  if (meta) meta.setAttribute("content", brand ? (dark ? brand.dark.paper : brand.light.paper) : agenda);
})();
