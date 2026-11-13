import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Combobox de shadcn/ui (Popover + Command) para TODAS las listas de la app.
// Se usa igual que el <select> de antes, para no tocar la lógica de cada
// pantalla: los hijos son <option value="…">texto</option> (pueden venir de un
// .map), `value` es el valor elegido y `onChange` recibe { target: { value } }.
//
// Con más de 7 opciones sale un buscador arriba (clientes, productos,
// categorías); con pocas, solo la lista.
//   compacto: versión chica (para las celdas de la tabla de gastos).

// Saca las opciones de los hijos <option>, sin importar si vienen sueltos, en
// arreglos (de un .map) o envueltos en fragmentos.
function opcionesDe(children) {
  const lista = [];
  const recorrer = (nodos) =>
    React.Children.forEach(nodos, (n) => {
      if (!React.isValidElement(n)) return;
      if (n.type === React.Fragment) return recorrer(n.props.children);
      if (n.type === "option") {
        const valor = n.props.value !== undefined ? String(n.props.value) : String(n.props.children ?? "");
        const texto = React.Children.toArray(n.props.children).join("");
        lista.push({ valor, texto: texto || valor, deshabilitada: !!n.props.disabled });
      }
    });
  recorrer(children);
  return lista;
}

// Cuánto de la parte de abajo de la pantalla está tapado (teclado, barra de
// Safari en el iPhone): la diferencia entre la ventana y lo que de verdad se ve.
const tapadoAbajo = () => {
  if (typeof window === "undefined" || !window.visualViewport) return 0;
  const vv = window.visualViewport;
  return Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
};

function Combobox({ value, onChange, children, className, style, disabled, placeholder = "Elegir…", buscar, compacto = false, title, id }) {
  const [abierto, setAbierto] = React.useState(false);
  const opciones = opcionesDe(children);
  const elegido = opciones.find((o) => o.valor === String(value ?? ""));
  const conBuscador = buscar ?? opciones.length > 7;
  // Dentro de una hoja de abajo (Drawer), la lista se monta DENTRO de la
  // hoja. Montada fuera, la hoja tomaba el toque como "picaste afuera": se
  // cerraba antes de elegir la opción y no se aplicaba nada.
  const botonRef = React.useRef(null);
  const [dentroDe, setDentroDe] = React.useState(undefined);

  return (
    <Popover
      open={abierto}
      onOpenChange={(o) => {
        if (o) setDentroDe(botonRef.current?.closest("[data-slot=drawer-content]") || undefined);
        setAbierto(o);
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={botonRef}
          type="button"
          id={id}
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          title={title}
          style={style}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // Estilo original de shadcn (botón "outline" del ejemplo de Combobox).
            // "af-input" queda solo como gancho de acomodo (anchos por pantalla).
            "af-input inline-flex w-full min-w-0 items-center justify-between gap-2 whitespace-nowrap rounded-[2rem] border border-input bg-input/30 px-3 py-2 text-sm font-normal transition-colors hover:bg-input/50 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
            compacto ? "h-8 w-auto px-2 text-xs" : "h-9",
            !elegido && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{elegido ? elegido.texto : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        container={dentroDe}
        // Siempre con aire contra la orilla de la pantalla (y la rayita del
        // iPad/iPhone): si abajo no cabe, se abre hacia arriba.
        // Abajo se suma lo que tape la barra de Safari o el teclado: el
        // navegador cuenta esa franja como pantalla libre y no lo es.
        collisionPadding={{ top: 16, bottom: 24 + tapadoAbajo(), left: 12, right: 12 }}
        className="z-[70] w-[--radix-popover-trigger-width] min-w-[12rem] p-0"
        align="start"
        // En celular/iPad NO se pone el cursor en el buscador al abrir: eso
        // sacaba el teclado y tapaba la lista aunque solo se quisiera elegir.
        // Si hace falta buscar, se toca el buscador y ahí sale el teclado.
        onOpenAutoFocus={(e) => { if (!conBuscador || window.matchMedia?.("(pointer: coarse)").matches) e.preventDefault(); }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          {conBuscador && <CommandInput data-teclear placeholder="Buscar…" className="h-9" />}
          {/* La lista nunca pasa del espacio libre en la pantalla: en un
              iPhone con la barra de Safari no cabía ni arriba ni abajo y se
              salía por arriba, escondida bajo el encabezado. Ahora se encoge
              y se desplaza por dentro. */}
          <CommandList className={conBuscador
            ? "max-h-[min(300px,calc(var(--radix-popover-content-available-height)-44px))]"
            : "max-h-[min(300px,var(--radix-popover-content-available-height))]"}>
            <CommandEmpty>No hay coincidencias.</CommandEmpty>
            <CommandGroup>
              {opciones.map((o, i) => (
                <CommandItem
                  key={o.valor + "_" + i}
                  value={o.texto + " " + i}
                  keywords={[o.texto]}
                  disabled={o.deshabilitada}
                  onSelect={() => {
                    if (o.valor !== String(value ?? "")) onChange?.({ target: { value: o.valor } });
                    setAbierto(false);
                  }}
                >
                  <span className="truncate">{o.texto}</span>
                  <Check className={cn("ml-auto size-4 shrink-0", o.valor === String(value ?? "") ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
