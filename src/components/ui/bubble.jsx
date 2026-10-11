import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

// Burbuja de chat de shadcn/ui (estilo Maia), pasada a Tailwind 3 y a los
// colores de la app. Se usa en Mensajes: el cliente a la izquierda y lo que
// manda el negocio (o el asistente) a la derecha.

function BubbleGroup({ className, ...props }) {
  return <div data-slot="bubble-group" className={cn("flex min-w-0 flex-col gap-2", className)} {...props} />;
}

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "[&>[data-slot=bubble-content]]:bg-primary [&>[data-slot=bubble-content]]:text-primary-foreground",
        secondary:
          "[&>[data-slot=bubble-content]]:bg-secondary [&>[data-slot=bubble-content]]:text-secondary-foreground",
        muted: "[&>[data-slot=bubble-content]]:bg-muted [&>[data-slot=bubble-content]]:text-foreground",
        // El original mezcla el color principal con blanco (oklch); aquí es
        // el mismo tono suave que ya usa la app.
        tinted: "[&>[data-slot=bubble-content]]:bg-accent [&>[data-slot=bubble-content]]:text-foreground",
        outline:
          "[&>[data-slot=bubble-content]]:border-border [&>[data-slot=bubble-content]]:bg-background",
        ghost:
          "[&>[data-slot=bubble-content]]:rounded-none [&>[data-slot=bubble-content]]:bg-transparent [&>[data-slot=bubble-content]]:p-0",
        destructive:
          "[&>[data-slot=bubble-content]]:bg-destructive/10 [&>[data-slot=bubble-content]]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Bubble({ variant = "default", align = "start", className, ...props }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({ asChild = false, className, ...props }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden whitespace-pre-wrap break-words rounded-3xl border border-transparent px-3.5 py-2.5 text-sm leading-relaxed group-data-[align=end]/bubble:self-end",
        className
      )}
      {...props}
    />
  );
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-sm ring-[3px] ring-card",
  {
    variants: {
      side: { top: "top-0 -translate-y-3/4", bottom: "bottom-0 translate-y-3/4" },
      align: { start: "left-3", end: "right-3" },
    },
    defaultVariants: { side: "bottom", align: "end" },
  }
);

function BubbleReactions({ side = "bottom", align = "end", className, ...props }) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };
