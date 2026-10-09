import * as React from "react";
import { cn } from "@/lib/utils";
import { campoClases } from "@/components/ui/input";

// Igual que Input, pero crece con el texto (empieza del mismo alto).
const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(campoClases, "h-auto min-h-[var(--alto-campo)] py-3 leading-normal", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Textarea };
