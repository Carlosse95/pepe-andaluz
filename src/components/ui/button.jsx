import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Botón de shadcn/ui con la paleta de Pepe El Andaluz.
// Variantes:
//   default      higo negro (acción principal)
//   secondary    lavanda (acción secundaria)
//   outline      borde, fondo blanco
//   ghost        sin fondo (íconos de barra, acciones discretas)
//   link         solo texto en higo
//   destructive  pimentón lleno (borrar definitivo)
//   destructive-outline  borde pimentón (eliminar/cancelar con cuidado)
//   exito        verde de "pagado"/confirmar
// Tamaños: default (alto de campo, 46px), sm, lg, icon, icon-sm, auto (sin alto
// ni relleno, para botones de texto dentro de una línea).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display text-sm font-bold transition-[background-color,color,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_3px_10px_-3px_hsl(var(--higo)/0.4)] hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-border bg-card text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary font-semibold underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        "destructive-outline": "border border-destructive bg-transparent text-destructive hover:bg-destructive/10",
        exito: "bg-[#1FA971] text-white hover:bg-[#1FA971]/90",
      },
      size: {
        default: "min-h-[var(--alto-campo)] px-4 py-2",
        sm: "min-h-9 rounded-md px-3 text-xs",
        lg: "min-h-12 px-6 text-base",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        auto: "h-auto p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
