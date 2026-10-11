// Cuánto se ve DE VERDAD de la pantalla. En iPhone/iPad, cuando sale el
// teclado, Safari no achica la página (100vh sigue siendo la pantalla entera):
// lo que se encoge es la "vista visible". Las ventanas que se medían con vh
// quedaban detrás del teclado y Safari arrastraba toda la página hacia arriba
// para enseñar lo que se escribía, hasta dejar la pantalla corrida.
//
// Aquí se publica esa medida en dos variables de CSS, que usan las ventanas
// (Agregar ítem, Mi perfil, confirmaciones) para caber arriba del teclado:
//   --alto-visible   alto que se ve (sin el teclado)
//   --arriba-visible cuánto se corrió la vista hacia abajo
export function seguirVistaVisible() {
  const vv = window.visualViewport;
  if (!vv) return;
  const raiz = document.documentElement;
  let tecladoAbierto = false;
  const medir = () => {
    raiz.style.setProperty("--alto-visible", `${Math.round(vv.height)}px`);
    raiz.style.setProperty("--arriba-visible", `${Math.round(vv.offsetTop)}px`);
    const abierto = vv.height < window.innerHeight - 120;
    // Al cerrarse el teclado, Safari a veces deja la página corrida (con un
    // hueco abajo o el encabezado escondido). Se regresa a donde debe estar.
    if (tecladoAbierto && !abierto) {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(window.scrollX, Math.min(window.scrollY, max));
    }
    tecladoAbierto = abierto;
  };
  vv.addEventListener("resize", medir);
  vv.addEventListener("scroll", medir);
  medir();
}
