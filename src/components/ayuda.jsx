import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// La "i" de información (HoverCard de shadcn). Los textos que explican cómo
// funciona algo ya no se ven todo el tiempo: viven aquí.
//
// El HoverCard de shadcn solo abre al pasar el mouse, y en iPad/iPhone no hay
// mouse: aquí además abre y cierra al TOCAR la "i", y se cierra al tocar
// afuera.
//   enLinea: la "i" va junto a un título (sin renglón propio).
function Ayuda({ children, className, enLinea = false, lado = "bottom" }) {
  const [abierto, setAbierto] = React.useState(false);
  const boton = React.useRef(null);
  const tarjeta = React.useRef(null);

  React.useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (boton.current?.contains(e.target) || tarjeta.current?.contains(e.target)) return;
      setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera, true);
    return () => document.removeEventListener("pointerdown", fuera, true);
  }, [abierto]);

  const i = (
    <HoverCard open={abierto} onOpenChange={setAbierto} openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          ref={boton}
          type="button"
          aria-label="Más información"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAbierto((v) => !v); }}
        >
          <Info className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardPrimitive.Portal>
        <HoverCardContent
          ref={tarjeta}
          side={lado}
          align="start"
          collisionPadding={12}
          className="z-[80] w-72 text-sm font-normal normal-case tracking-normal leading-relaxed"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </HoverCardContent>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );

  if (enLinea) return <span className={cn("ml-1 inline-flex align-middle", className)}>{i}</span>;
  return <div className={cn("flex", className)}>{i}</div>;
}

export { Ayuda };
