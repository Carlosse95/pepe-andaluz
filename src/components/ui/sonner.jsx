import { Toaster as Sonner } from "sonner";
import { CircleCheck, Info, TriangleAlert, OctagonX, Loader2 } from "lucide-react";

// Toaster de shadcn/ui (Sonner) con el estilo MAIA: los colores y la esquina
// salen del tema de la app. La app no tiene modo oscuro, así que va en claro.
const Toaster = ({ ...props }) => (
  <Sonner
    theme="light"
    className="toaster group"
    icons={{
      success: <CircleCheck className="size-4" />,
      info: <Info className="size-4" />,
      warning: <TriangleAlert className="size-4" />,
      error: <OctagonX className="size-4" />,
      loading: <Loader2 className="size-4 animate-spin" />,
    }}
    style={{
      "--normal-bg": "hsl(var(--popover))",
      "--normal-text": "hsl(var(--popover-foreground))",
      "--normal-border": "hsl(var(--border))",
      "--border-radius": "var(--radius-lg)",
    }}
    {...props}
  />
);

export { Toaster };
