import * as React from "react";
import {
  ChevronsUpDown, LogOut, CircleUserRound, Moon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

// Barra lateral de Pepe El Andaluz (base: sidebar-07 de shadcn/ui).
// Se encoge a solo íconos en iPad/compu y en celular sale como cajón.
export function AppSidebar({ secciones, vista, onIr, usuario, onPerfil, onCerrarSesion, tema, onCambiarTema, ...props }) {
  const { isMobile, setOpenMobile, setOpen } = useSidebar();
  // Como la barra de Aceternity UI: en iPad y compu vive angosta (solo
  // íconos), se ABRE sola al pasar el mouse o tocarla y se GUARDA sola al
  // salir o al elegir una sección. En celular sigue siendo el cajón.
  const ir = (fn) => () => { fn(); if (isMobile) setOpenMobile(false); else setOpen(false); };
  // Con el menú de perfil abierto la barra NO se guarda: el menú vive fuera
  // de la barra y, al pasar el mouse a él, la barra creía que la habían
  // dejado y se cerraba y abría sin parar.
  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const barra = React.useRef(null);
  const alCambiarMenu = (abierto) => {
    setMenuAbierto(abierto);
    if (!abierto && !isMobile && !barra.current?.matches(":hover")) setOpen(false);
  };
  const inicial = (usuario.nombre || "?").trim().charAt(0).toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      flotante
      ref={barra}
      onMouseEnter={() => { if (!isMobile) setOpen(true); }}
      onMouseLeave={() => { if (!isMobile && !menuAbierto) setOpen(false); }}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Pepe El Andaluz" aria-label="Pepe El Andaluz — ir a Hoy" onClick={ir(() => onIr("hoy"))} className="h-auto justify-center py-2 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:!p-0">
              <div className="af-logo-mark af-logo-barra shrink-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Celular: renglones más altos y con aire entre ellos (chicos y
            pegados, el dedo caía en la sección de al lado), pero juntos
            arriba: repartidos en todo el alto se veía exagerado. */}
        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarMenu className={isMobile ? "gap-1.5" : undefined}>
            {secciones.map((s) => (
              <SidebarMenuItem key={s.key}>
                <SidebarMenuButton tooltip={s.label} isActive={vista === s.key} onClick={ir(() => onIr(s.key))} className={"data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground" + (isMobile ? " h-11 gap-3.5 rounded-xl px-3.5 text-base [&>svg]:size-5" : "")}>
                  {s.icono}
                  <span>{s.label}</span>
                </SidebarMenuButton>
                {s.badge > 0 && <SidebarMenuBadge className={(s.badgeSuave ? "bg-aviso/25 text-higo dark:text-sidebar-foreground" : "bg-pimenton text-white") + (isMobile ? " right-3 !top-3" : "")}>{s.badge > 9 ? "9+" : s.badge}</SidebarMenuBadge>}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false} onOpenChange={alCambiarMenu}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-md">
                    {usuario.foto && <AvatarImage src={usuario.foto} alt={usuario.nombre} />}
                    <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold">{inicial}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{usuario.nombre}</span>
                    <span className="truncate text-xs opacity-70">{usuario.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
                <DropdownMenuLabel className="font-normal">
                  <div className="grid text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{usuario.nombre}</span>
                    <span className="truncate text-xs text-muted-foreground">{usuario.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={ir(onPerfil)}>
                  <CircleUserRound /> Mi perfil
                </DropdownMenuItem>
                {/* Modo oscuro: el renglón entero prende o apaga el switch y el
                    menú no se cierra, para ver el cambio al momento. */}
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onCambiarTema?.(tema === "oscuro" ? "claro" : "oscuro"); }}>
                  <Moon /> Modo oscuro
                  <Switch className="pointer-events-none ml-auto" checked={tema === "oscuro"} tabIndex={-1} aria-hidden />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onCerrarSesion}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
