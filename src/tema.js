// Modo claro / oscuro. Se guarda en ESTE aparato (cada quien elige el suyo)
// y se pone como clase "dark" en <html>, que es como shadcn/ui y Tailwind
// cambian sus colores.
const CLAVE = "tema";
const BARRA = { claro: "#B8CAFF", oscuro: "#141826" };

export function temaGuardado() {
  try {
    return localStorage.getItem(CLAVE) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema) {
  const oscuro = tema === "oscuro";
  document.documentElement.classList.toggle("dark", oscuro);
  document.documentElement.style.colorScheme = oscuro ? "dark" : "light";
  // La barra de arriba del iPhone (hora, batería) toma este color.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BARRA[oscuro ? "oscuro" : "claro"]);
}

export function guardarTema(tema) {
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    /* sin almacenamiento: dura solo esta vez */
  }
  aplicarTema(tema);
}
