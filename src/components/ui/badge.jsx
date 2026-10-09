import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Etiqueta/chip de shadcn/ui con la paleta de marca. Los colores especiales
// de algunas etiquetas (WhatsApp, "ya llegué", vencido…) siguen llegando por
// className y le ganan a la variante.
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-2xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        neutral: "bg-[#E6EBFF] text-[#4257B8]",
        marca: "bg-[#E3E9FF] text-primary",
        oro: "bg-[#F5EDDC] text-[#7A5A1E]",
        exito: "bg-[#DDF3E9] text-[#1FA971]",
        destructive: "bg-destructive/15 text-[#C2391A]",
        outline: "border border-border text-foreground",
        plain: "",
      },
    },
    defaultVariants: { variant: "plain" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
