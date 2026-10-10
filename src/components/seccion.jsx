import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Sección que se despliega (Collapsible de shadcn). Así cada pantalla se ve
// como una lista corta de títulos y solo se abre lo que interesa, en vez de
// deslizar todo.
//   id: con él se recuerda en este aparato si se dejó abierta o cerrada.
//   cuenta: número gris junto al título (cuántas cosas hay adentro).
//   alerta: texto en color de aviso (p. ej. "3 por comprar").
//   ayuda: la "i" de información, va junto al título.
//   forzarAbierta: abierta sí o sí (buscando o filtrando, un resultado
//     escondido en una sección cerrada es como no haberlo encontrado).
const LLAVE = "secciones-abiertas";
const leer = () => {
  try { return JSON.parse(localStorage.getItem(LLAVE) || "{}"); } catch { return {}; }
};

function Seccion({ id, titulo, cuenta, alerta, ayuda, abiertaPorDefecto = false, forzarAbierta = false, className, children }) {
  const [abierta, setAbierta] = React.useState(() => {
    const guardado = id ? leer()[id] : undefined;
    return guardado === undefined ? abiertaPorDefecto : guardado;
  });
  const cambiar = (v) => {
    setAbierta(v);
    if (!id) return;
    try { localStorage.setItem(LLAVE, JSON.stringify({ ...leer(), [id]: v })); } catch { /* sin espacio */ }
  };
  const abiertaDeVerdad = forzarAbierta || abierta;

  return (
    <Collapsible open={abiertaDeVerdad} onOpenChange={cambiar} className={cn("mb-3", className)}>
      <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-card px-4 ring-1 ring-foreground/10">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left">
          <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform", !abiertaDeVerdad && "-rotate-90")} />
          <span className="truncate text-sm font-semibold text-foreground">{titulo}</span>
          {cuenta != null && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-2xs font-semibold text-secondary-foreground">{cuenta}</span>}
          {alerta && <span className="ml-auto shrink-0 rounded-full bg-aviso/20 px-2 py-0.5 text-2xs font-semibold text-aviso-fuerte">{alerta}</span>}
        </CollapsibleTrigger>
        {ayuda}
      </div>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export { Seccion };
