// Teclado físico del iPad (el magnético donde se cuelga) y de la compu.
//
// Safari en iPad no deja poner el cursor en un campo "solo": solo cuando
// alguien lo toca. Así que al abrir un buscador el cursor muchas veces NO
// está ahí; se empezaba a escribir y las letras se perdían. Peor: la barra
// espaciadora fuera de un campo es "bajar una pantalla", así que al escribir
// "Juan Pérez" la página brincaba hacia abajo.
//
// Aquí: si se escribe sin ningún campo elegido y hay un buscador abierto
// (marcado con data-teclear), la letra se va a ese buscador. Y la barra
// espaciadora fuera de un campo ya no mueve la página.

const esCampo = (el) =>
  !!el &&
  (el.isContentEditable ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(el.type)));

const esBoton = (el) => !!el && !!el.closest?.("button, a[href], [role=button], [role=tab], [role=switch], [role=checkbox], [role=option], [role=menuitem], summary");

const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

// El buscador al que mandar lo que se escribe: el de la ventana abierta si
// hay una; si no, el que esté a la vista en la pantalla.
const buscadorAbierto = () => {
  const enVentana = [...document.querySelectorAll("[role=dialog] [data-teclear], [role=alertdialog] [data-teclear], [data-radix-popper-content-wrapper] [data-teclear]")].find(visible);
  if (enVentana) return enVentana;
  if (document.querySelector("[role=dialog], [role=alertdialog]")) return null;
  return [...document.querySelectorAll("[data-teclear]")].find(visible) || null;
};

// React no se entera si solo se cambia .value: hay que usar el "setter"
// original y avisar con un evento input.
const escribirEn = (campo, texto) => {
  const proto = campo.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(campo, (campo.value || "") + texto);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
};

export function cuidarTecladoFisico() {
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = document.activeElement;
      if (esCampo(t)) return;
      const letra = e.key && e.key.length === 1;
      if (letra) {
        const campo = buscadorAbierto();
        if (campo) {
          e.preventDefault();
          campo.focus({ preventScroll: true });
          escribirEn(campo, e.key);
          return;
        }
      }
      // Espacio fuera de un campo: en un botón lo deja (lo "pica"); en lo
      // demás no deja que la página brinque.
      if (e.key === " " && !esBoton(t)) e.preventDefault();
    },
    true
  );
}
