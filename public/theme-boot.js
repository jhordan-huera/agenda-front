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
  // La barra del celular: --background de Agenda360.
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#201612" : "#ffffff");
})();
