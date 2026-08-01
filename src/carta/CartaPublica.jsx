// ---------------------------------------------------------------------
// Página pública de Pepe Andaluz (carta.html).
//
// Qué hace, en una línea: el cliente arma lo que le gustaría pedir y al
// mandarlo pasan DOS cosas — se guarda en la nube (tabla `solicitudes_web`,
// que la app lee) y se abre WhatsApp con el mismo resumen ya escrito.
//
// Por qué las dos: si solo fuera WhatsApp, cada solicitud dependería de que
// el cliente le diera "enviar" en el chat, y se pierden muchas ahí. Si solo
// fuera la base de datos, el cliente se quedaría sin la conversación con
// Pepe — que es justo lo que la gente busca del negocio.
// ---------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChefHat,
  Clock,
  Flame,
  MapPin,
  Minus,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import {
  enviarSolicitud,
  CARTA_FALLBACK,
  CATEGORIAS,
  cargarCarta,
  kgParaPersonas,
  money,
  rutaFoto,
} from "./datos.js";
import "./carta.css";

/* ------------------------------ Utilidades ------------------------------ */

// Deja el teléfono como lo quiere wa.me: solo dígitos y con lada de país.
// En México la gente escribe "55 1234 5678"; sin el 52 delante, el link no abre.
const telWhatsApp = (tel) => {
  const soloDigitos = (tel || "").replace(/\D/g, "");
  if (!soloDigitos) return "";
  if (soloDigitos.length === 10) return "52" + soloDigitos;
  if (soloDigitos.length === 11 && soloDigitos.startsWith("1")) return "52" + soloDigitos.slice(1);
  return soloDigitos;
};

// Se piden 48 horas de anticipación: el calendario no deja elegir antes.
const minimoISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fechaHumana = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/* --------------------------- Foto con respaldo --------------------------- */
// Las fotos llegan después de la sesión de fotos. Hasta entonces (o si un
// archivo falta) se dibuja el marco de papel en vez de un ícono de imagen rota.

function Foto({ item, alt, className = "" }) {
  const [falta, setFalta] = useState(false);
  const src = rutaFoto(item);

  if (falta || !src) {
    return (
      <div className={`cp-foto cp-foto-vacia ${className}`} role="img" aria-label={`Foto de ${alt} próximamente`}>
        <span>Foto en camino</span>
      </div>
    );
  }
  return (
    <div className={`cp-foto ${className}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFalta(true)} />
    </div>
  );
}

/* ---------------------------- Aparición suave ---------------------------- */

// `listo` re-arma la vigilancia cuando llega la carta de la nube y aparecen
// las tarjetas. Sin esa dependencia el efecto correría en cada render y
// volvería a esconder lo que ya se había mostrado.
function useRevelar(listo) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) return;
    const nodos = Array.from(ref.current.querySelectorAll(".cp-revelar:not(.cp-oculto)"));
    // Solo se esconde lo que todavía no se ve: lo que ya está en pantalla no
    // tiene por qué parpadear al cargar.
    const porRevelar = nodos.filter((n) => n.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (!porRevelar.length) return;
    porRevelar.forEach((n) => n.classList.add("cp-oculto"));

    const mostrar = (n) => n.classList.remove("cp-oculto");
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          mostrar(e.target);
          obs.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    porRevelar.forEach((n) => obs.observe(n));

    // Red de seguridad: pase lo que pase, a los 5 segundos todo se ve.
    const reloj = setTimeout(() => {
      porRevelar.forEach(mostrar);
      obs.disconnect();
    }, 5000);

    return () => {
      clearTimeout(reloj);
      obs.disconnect();
      porRevelar.forEach(mostrar);
    };
  }, [listo]);
  return ref;
}

/* -------------------------------- Página -------------------------------- */

export default function CartaPublica() {
  const [carta, setCarta] = useState(CARTA_FALLBACK);
  const [cargando, setCargando] = useState(true);
  const raiz = useRevelar(cargando);

  useEffect(() => {
    let vivo = true;
    cargarCarta().then((c) => {
      if (!vivo) return;
      setCarta(c);
      setCargando(false);
      if (c.negocio && c.negocio.nombre) document.title = `${c.negocio.nombre} · Carta y pedidos`;
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Selección del cliente. Las paellas se cuentan en PERSONAS (es como habla
  // la gente); los extras, en piezas. Los kilos se calculan al final.
  const [seleccion, setSeleccion] = useState({});

  const paellas = carta.paellas || [];
  const extras = carta.extras || [];
  const catalogo = useMemo(() => {
    const mapa = {};
    paellas.forEach((p) => (mapa[p.id] = { ...p, tipo: "paella" }));
    extras.forEach((e) => (mapa[e.id] = { ...e, tipo: "extra" }));
    return mapa;
  }, [paellas, extras]);

  const lineas = useMemo(
    () =>
      Object.entries(seleccion)
        .filter(([, cant]) => cant > 0)
        .map(([id, cant]) => {
          const item = catalogo[id];
          if (!item) return null;
          if (item.tipo === "paella") {
            const kg = kgParaPersonas(cant);
            return {
              id,
              tipo: "paella",
              nombre: item.nombre,
              personas: cant,
              kg,
              detalle: `${cant} personas · ${kg} kg`,
              importe: kg * (item.precioKg || 0),
            };
          }
          return {
            id,
            tipo: "extra",
            nombre: item.nombre,
            cantidad: cant,
            detalle: `${cant} × ${item.unidad || "pieza"}`,
            importe: cant * (item.precio || 0),
          };
        })
        .filter(Boolean),
    [seleccion, catalogo]
  );

  const total = lineas.reduce((a, l) => a + l.importe, 0);
  const personasTotales = lineas.filter((l) => l.tipo === "paella").reduce((a, l) => a + l.personas, 0);

  const cambiar = (item, delta) => {
    const paso = item.tipo === "paella" ? 2 : 1; // media paella no existe: se sube de 2 en 2 personas
    const minimo = item.tipo === "paella" ? 4 : 1;
    setSeleccion((prev) => {
      const actual = prev[item.id] || 0;
      const siguiente = actual === 0 && delta > 0 ? minimo : actual + delta * paso;
      const limpio = { ...prev };
      if (siguiente < minimo) delete limpio[item.id];
      else limpio[item.id] = Math.min(siguiente, item.tipo === "paella" ? 300 : 50);
      return limpio;
    });
  };

  const quitar = (id) =>
    setSeleccion((prev) => {
      const limpio = { ...prev };
      delete limpio[id];
      return limpio;
    });

  const irAPedido = () => {
    const destino = document.getElementById("pedido");
    if (destino) destino.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const negocio = carta.negocio || {};
  const precios = carta.mostrarPrecios !== false;

  return (
    <div className="cp" ref={raiz}>
      <Barra negocio={negocio} />

      <main>
        <Hero negocio={negocio} onVerCarta={() => document.getElementById("carta")?.scrollIntoView({ behavior: "smooth" })} onPedir={irAPedido} />

        <Carta
          cargando={cargando}
          paellas={paellas}
          extras={extras}
          precios={precios}
          seleccion={seleccion}
          onCambiar={cambiar}
        />

        <Pasos />

        <Pedido
          lineas={lineas}
          total={total}
          personasTotales={personasTotales}
          precios={precios}
          negocio={negocio}
          onQuitar={quitar}
          onVerCarta={() => document.getElementById("carta")?.scrollIntoView({ behavior: "smooth" })}
        />
      </main>

      <Pie negocio={negocio} />

      {lineas.length > 0 && (
        <div className="cp-barra-movil">
          <div className="cp-barra-movil-txt">
            {lineas.length} {lineas.length === 1 ? "cosa elegida" : "cosas elegidas"}
            {precios && <strong>{money(total)}</strong>}
          </div>
          <button className="cp-btn cp-btn-primario" onClick={irAPedido}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Barra --------------------------------- */

function Barra({ negocio }) {
  const ir = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <header className="cp-barra">
      <div className="cp-wrap cp-barra-fila">
        <span className="cp-marca">{negocio.nombre || "Pepe Andaluz"}</span>
        <nav className="cp-barra-links" aria-label="Secciones">
          <button className="cp-barra-link" onClick={() => ir("carta")}>Carta</button>
          <button className="cp-barra-link" onClick={() => ir("como")}>Cómo funciona</button>
          <button className="cp-barra-link" onClick={() => ir("pedido")}>Pedir</button>
        </nav>
        <button className="cp-btn cp-btn-primario" onClick={() => ir("pedido")}>
          Pedir
        </button>
      </div>
    </header>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

function Hero({ negocio, onVerCarta, onPedir }) {
  const claim = negocio.claim || "Paella hecha el mismo día de tu evento";
  // La primera palabra del claim va en cursiva: da el aire editorial sin
  // obligar a Pepe a escribir HTML dentro del texto.
  const [primera, ...resto] = claim.split(" ");

  return (
    <section className="cp-hero">
      <div className="cp-wrap cp-hero-grid">
        <div>
          <p className="cp-volanta">Paella valenciana a domicilio</p>
          <h1>
            <em>{primera}</em> {resto.join(" ")}
          </h1>
          <p className="cp-hero-texto">{negocio.descripcion}</p>
          <div className="cp-hero-botones">
            <button className="cp-btn cp-btn-primario" onClick={onVerCarta}>
              Ver la carta
            </button>
            <button className="cp-btn cp-btn-secundario" onClick={onPedir}>
              Armar mi pedido
            </button>
          </div>
          <div className="cp-hero-datos">
            {negocio.zona && (
              <span className="cp-hero-dato">
                <MapPin size={16} aria-hidden="true" /> {negocio.zona}
              </span>
            )}
            {negocio.horario && (
              <span className="cp-hero-dato">
                <Clock size={16} aria-hidden="true" /> {negocio.horario}
              </span>
            )}
          </div>
        </div>
        <div className="cp-hero-foto cp-revelar">
          <Foto item={{ id: "portada" }} alt="Paella recién hecha" />
          <span className="cp-sello">Hecha a la leña</span>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Carta --------------------------------- */

function Carta({ cargando, paellas, extras, precios, seleccion, onCambiar }) {
  return (
    <section className="cp-seccion" id="carta">
      <div className="cp-wrap">
        <p className="cp-volanta">La carta</p>
        <h2 className="cp-seccion-titulo">Las paellas</h2>
        <p className="cp-seccion-bajada">
          El precio es por kilo y cada kilo rinde para dos personas. Dinos para cuántos y nosotros
          calculamos la paellera.
        </p>

        <div className="cp-grid" style={{ marginTop: 24 }}>
          {paellas.map((p) => (
            <Plato
              key={p.id}
              item={{ ...p, tipo: "paella" }}
              precio={precios ? money(p.precioKg) : ""}
              unidad="por kilo · rinde para 2"
              cantidad={seleccion[p.id] || 0}
              etiquetaCantidad={(n) => `${n} personas`}
              onCambiar={onCambiar}
            />
          ))}
        </div>

        {CATEGORIAS.map((cat) => {
          const dela = extras.filter((e) => (e.categoria || "platillo") === cat.id);
          if (!dela.length) return null;
          return (
            <div key={cat.id} className="cp-bloque">
              <h3 className="cp-sub">{cat.label}</h3>
              <div className="cp-grid">
                {dela.map((e) => (
                  <Plato
                    key={e.id}
                    item={{ ...e, tipo: "extra" }}
                    precio={precios ? money(e.precio) : ""}
                    unidad={e.unidad || "pieza"}
                    cantidad={seleccion[e.id] || 0}
                    etiquetaCantidad={(n) => `${n} × ${e.unidad || "pieza"}`}
                    onCambiar={onCambiar}
                    fila
                  />
                ))}
              </div>
            </div>
          );
        })}

        {cargando && <p className="cp-vacio">Trayendo los precios de hoy…</p>}
      </div>
    </section>
  );
}

function Plato({ item, precio, unidad, cantidad, etiquetaCantidad, onCambiar, fila }) {
  const elegido = cantidad > 0;
  return (
    <article className={"cp-plato cp-revelar" + (elegido ? " elegido" : "") + (fila ? " cp-plato-fila" : "")}>
      <Foto item={item} alt={item.nombre} />
      <div className="cp-plato-cuerpo">
        <h3 className="cp-plato-nombre">{item.nombre}</h3>
        {item.descripcion && <p className="cp-plato-desc">{item.descripcion}</p>}
        <div className="cp-plato-pie">
          {precio && (
            <span className="cp-precio">
              {precio}
              <small>{unidad}</small>
            </span>
          )}
          {!precio && <span className="cp-precio"><small>Se cotiza</small></span>}

          {elegido ? (
            <div className="cp-cantidad">
              <button onClick={() => onCambiar(item, -1)} aria-label={`Quitar de ${item.nombre}`}>
                <Minus size={18} aria-hidden="true" />
              </button>
              <span className="cp-cantidad-valor" aria-live="polite">
                {etiquetaCantidad(cantidad)}
              </span>
              <button onClick={() => onCambiar(item, 1)} aria-label={`Agregar a ${item.nombre}`}>
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button className="cp-btn-agregar" onClick={() => onCambiar(item, 1)} aria-label={`Lo quiero: ${item.nombre}`}>
              Lo quiero
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------ Cómo funciona ------------------------------ */

function Pasos() {
  const pasos = [
    {
      icono: <ChefHat size={22} aria-hidden="true" />,
      titulo: "Eliges y nos mandas",
      texto: "Marca las paellas y los extras, pon la fecha y mándanoslo. Se abre WhatsApp con todo escrito.",
    },
    {
      icono: <Users size={22} aria-hidden="true" />,
      titulo: "Pepe te confirma",
      texto: "Te contesta él mismo para cuadrar kilos, hora y precio final. Nada se cobra hasta confirmar.",
    },
    {
      icono: <Flame size={22} aria-hidden="true" />,
      titulo: "Se cocina ese día",
      texto: "Se hace el mismo día, a la leña, y llega caliente a tu casa o pasas por ella.",
    },
  ];
  return (
    <section className="cp-seccion" id="como">
      <div className="cp-wrap">
        <p className="cp-volanta">Cómo funciona</p>
        <h2 className="cp-seccion-titulo">Tres pasos y ya</h2>
        <div className="cp-pasos" style={{ marginTop: 40 }}>
          {pasos.map((p) => (
            <div className="cp-paso cp-revelar" key={p.titulo}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {p.icono} {p.titulo}
              </h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Pedido --------------------------------- */

function Pedido({ lineas, total, personasTotales, precios, negocio, onQuitar, onVerCarta }) {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    fecha: "",
    hora: "",
    entrega: "recoger",
    direccion: "",
    nota: "",
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);
  const refs = { nombre: useRef(null), telefono: useRef(null), direccion: useRef(null) };

  const set = (campo) => (e) => {
    const valor = e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((err) => (err[campo] ? { ...err, [campo]: "" } : err));
  };

  const validar = () => {
    const err = {};
    if (form.nombre.trim().length < 2) err.nombre = "Necesitamos tu nombre para apuntar el pedido.";
    if (form.telefono.replace(/\D/g, "").length < 10) err.telefono = "Escribe los 10 dígitos de tu celular.";
    if (form.entrega === "domicilio" && form.direccion.trim().length < 8)
      err.direccion = "Pon calle, número y colonia para poder llegar.";
    if (!lineas.length) err.items = "Elige al menos una paella o un extra de la carta.";
    return err;
  };

  const textoResumen = () => {
    const partes = [`Hola, soy ${form.nombre.trim()}. Me gustaría pedir:`, ""];
    lineas.forEach((l) => {
      partes.push(`• ${l.nombre} — ${l.detalle}${precios ? ` (${money(l.importe)})` : ""}`);
    });
    partes.push("");
    if (precios) partes.push(`Estimado: ${money(total)}`);
    if (form.fecha) partes.push(`Fecha: ${fechaHumana(form.fecha)}${form.hora ? ` a las ${form.hora}` : ""}`);
    partes.push(form.entrega === "domicilio" ? `A domicilio: ${form.direccion.trim()}` : "Paso yo a recogerla");
    if (form.nota.trim()) partes.push(`Nota: ${form.nota.trim()}`);
    partes.push("", `Mi teléfono: ${form.telefono.trim()}`);
    return partes.join("\n");
  };

  const enviar = async (e) => {
    e.preventDefault();
    const err = validar();
    setErrores(err);
    const primerCampo = ["nombre", "telefono", "direccion"].find((c) => err[c]);
    if (primerCampo && refs[primerCampo].current) refs[primerCampo].current.focus();
    if (Object.keys(err).length) return;

    setEnviando(true);
    const resumen = textoResumen();

    // Se guarda primero y se abre WhatsApp después: si el guardado falla, el
    // cliente igual manda su mensaje y el pedido no se pierde por un error
    // de red que él no puede ver ni arreglar.
    try {
      await enviarSolicitud({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        fecha: form.fecha || null,
        hora: form.hora || null,
        personas: personasTotales || null,
        entrega: form.entrega,
        direccion: form.entrega === "domicilio" ? form.direccion.trim() : null,
        items: lineas,
        nota: form.nota.trim() || null,
        estimado: precios ? total : null,
      });
    } catch {
      // Silencioso a propósito: el WhatsApp de abajo es el respaldo.
    }

    const destino = telWhatsApp(negocio.telefono);
    if (destino) {
      window.open(`https://wa.me/${destino}?text=${encodeURIComponent(resumen)}`, "_blank", "noopener,noreferrer");
    }
    setEnviado({ resumen, huboWhatsApp: Boolean(destino) });
    setEnviando(false);
  };

  if (enviado) {
    return (
      <section className="cp-seccion cp-pedido" id="pedido">
        <div className="cp-wrap" style={{ maxWidth: 620 }}>
          <div className="cp-tarjeta cp-listo">
            <div className="cp-listo-icono">
              <Check size={28} aria-hidden="true" />
            </div>
            <h2 className="cp-seccion-titulo" style={{ fontSize: 30 }}>Ya nos llegó</h2>
            <p className="cp-seccion-bajada" style={{ margin: "0 auto" }}>
              {enviado.huboWhatsApp
                ? "Te abrimos WhatsApp con el resumen. Dale enviar y Pepe te contesta para confirmar la fecha y el precio final."
                : "Apuntamos tu solicitud. Copia el resumen y mándanoslo por WhatsApp para que Pepe te confirme."}
            </p>
            <textarea className="cp-textarea" readOnly value={enviado.resumen} aria-label="Resumen de tu pedido" />
            <button
              className="cp-btn cp-btn-secundario cp-btn-ancho"
              onClick={() => navigator.clipboard?.writeText(enviado.resumen)}
            >
              Copiar el resumen
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cp-seccion cp-pedido" id="pedido">
      <div className="cp-wrap">
        <p className="cp-volanta">Tu pedido</p>
        <h2 className="cp-seccion-titulo">¿Qué te gustaría pedir?</h2>
        <p className="cp-seccion-bajada">
          Esto no es una compra: es una solicitud. Pepe te contesta por WhatsApp para confirmar
          disponibilidad, kilos y precio final antes de cobrar nada.
        </p>

        <div className="cp-pedido-grid" style={{ marginTop: 32 }}>
          <form className="cp-tarjeta" onSubmit={enviar} noValidate>
            <div className="cp-campos cp-campos-2">
              <div className="cp-campo">
                <label htmlFor="cp-nombre">Tu nombre <span aria-hidden="true">*</span></label>
                <input
                  id="cp-nombre"
                  ref={refs.nombre}
                  className="cp-input"
                  value={form.nombre}
                  onChange={set("nombre")}
                  autoComplete="name"
                  aria-invalid={errores.nombre ? "true" : undefined}
                  aria-describedby={errores.nombre ? "cp-nombre-err" : undefined}
                />
                {errores.nombre && (
                  <p className="cp-error" id="cp-nombre-err" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {errores.nombre}
                  </p>
                )}
              </div>

              <div className="cp-campo">
                <label htmlFor="cp-tel">Tu WhatsApp <span aria-hidden="true">*</span></label>
                <input
                  id="cp-tel"
                  ref={refs.telefono}
                  className="cp-input"
                  type="tel"
                  inputMode="tel"
                  placeholder="55 1234 5678"
                  value={form.telefono}
                  onChange={set("telefono")}
                  autoComplete="tel"
                  aria-invalid={errores.telefono ? "true" : undefined}
                  aria-describedby={errores.telefono ? "cp-tel-err" : undefined}
                />
                {errores.telefono && (
                  <p className="cp-error" id="cp-tel-err" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {errores.telefono}
                  </p>
                )}
              </div>

              <div className="cp-campo">
                <label htmlFor="cp-fecha">¿Para qué día?</label>
                <input
                  id="cp-fecha"
                  className="cp-input"
                  type="date"
                  min={minimoISO()}
                  value={form.fecha}
                  onChange={set("fecha")}
                />
                <p className="cp-ayuda">Pedimos 48 horas para conseguir el marisco fresco.</p>
              </div>

              <div className="cp-campo">
                <label htmlFor="cp-hora">¿A qué hora?</label>
                <input id="cp-hora" className="cp-input" type="time" value={form.hora} onChange={set("hora")} />
              </div>
            </div>

            <fieldset className="cp-campo" style={{ border: 0, padding: 0, margin: "24px 0 0" }}>
              <legend style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, padding: 0 }}>¿Cómo la quieres?</legend>
              <div className="cp-opciones">
                <button
                  type="button"
                  className="cp-opcion"
                  aria-pressed={form.entrega === "recoger"}
                  onClick={() => setForm((f) => ({ ...f, entrega: "recoger" }))}
                >
                  <MapPin size={18} aria-hidden="true" /> Paso a recogerla
                </button>
                <button
                  type="button"
                  className="cp-opcion"
                  aria-pressed={form.entrega === "domicilio"}
                  onClick={() => setForm((f) => ({ ...f, entrega: "domicilio" }))}
                >
                  <Send size={18} aria-hidden="true" /> A mi domicilio
                </button>
              </div>
            </fieldset>

            {form.entrega === "domicilio" && (
              <div className="cp-campo" style={{ marginTop: 16 }}>
                <label htmlFor="cp-dir">Dirección <span aria-hidden="true">*</span></label>
                <input
                  id="cp-dir"
                  ref={refs.direccion}
                  className="cp-input"
                  value={form.direccion}
                  onChange={set("direccion")}
                  placeholder="Calle, número, colonia"
                  autoComplete="street-address"
                  aria-invalid={errores.direccion ? "true" : undefined}
                  aria-describedby={errores.direccion ? "cp-dir-err" : undefined}
                />
                {errores.direccion && (
                  <p className="cp-error" id="cp-dir-err" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {errores.direccion}
                  </p>
                )}
                <p className="cp-ayuda">El costo del envío depende de la zona; Pepe te lo dice al confirmar.</p>
              </div>
            )}

            <div className="cp-campo" style={{ marginTop: 16 }}>
              <label htmlFor="cp-nota">¿Algo que debamos saber?</label>
              <textarea
                id="cp-nota"
                className="cp-textarea"
                value={form.nota}
                onChange={set("nota")}
                placeholder="Alergias, si es cumpleaños, si hay niños, si necesitan platos…"
                maxLength={600}
              />
            </div>

            {errores.items && (
              <p className="cp-error" role="alert" style={{ marginTop: 16 }}>
                <AlertCircle size={15} aria-hidden="true" /> {errores.items}{" "}
                <button type="button" className="cp-barra-link" onClick={onVerCarta} style={{ color: "inherit" }}>
                  Ver la carta
                </button>
              </p>
            )}

            <button className="cp-btn cp-btn-wa cp-btn-ancho" style={{ marginTop: 24 }} disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar por WhatsApp"}
            </button>
            <p className="cp-ayuda" style={{ marginTop: 8, textAlign: "center" }}>
              Usamos tu teléfono solo para contestarte este pedido.
            </p>
          </form>

          <aside className="cp-tarjeta cp-resumen" aria-label="Resumen de tu pedido">
            <h3 style={{ fontSize: 22, marginBottom: 16 }}>Lo que elegiste</h3>

            {lineas.length === 0 ? (
              <p className="cp-vacio">
                Todavía no hay nada.
                <br />
                <button className="cp-barra-link" onClick={onVerCarta} style={{ color: "var(--barro)" }}>
                  Ir a la carta
                </button>
              </p>
            ) : (
              <>
                <ul className="cp-lista">
                  {lineas.map((l) => (
                    <li key={l.id}>
                      <span className="cp-l-nombre">
                        {l.nombre}
                        <br />
                        <span className="cp-ayuda">{l.detalle}</span>
                      </span>
                      {precios && <span className="cp-l-monto">{money(l.importe)}</span>}
                      <button onClick={() => onQuitar(l.id)} aria-label={`Quitar ${l.nombre}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>

                {personasTotales > 0 && (
                  <p className="cp-ayuda" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={15} aria-hidden="true" /> Alcanza para unas {personasTotales} personas
                  </p>
                )}

                {precios && (
                  <>
                    <div className="cp-total">
                      <span className="cp-total-label">Estimado</span>
                      <span className="cp-total-monto">{money(total)}</span>
                    </div>
                    <p className="cp-nota-precio">
                      Es un cálculo, no una cuenta. El precio final lo confirma Pepe según los kilos
                      que salgan y el envío.
                    </p>
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- Pie ----------------------------------- */

function Pie({ negocio }) {
  const tel = telWhatsApp(negocio.telefono);
  return (
    <footer className="cp-pie">
      <div className="cp-wrap cp-pie-grid">
        <div>
          <h3>{negocio.nombre || "Pepe Andaluz"}</h3>
          <p>{negocio.descripcion}</p>
        </div>
        <div>
          <h3>Contacto</h3>
          {tel ? (
            <p>
              <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer">
                WhatsApp {negocio.telefono}
              </a>
            </p>
          ) : (
            <p>Escríbenos por WhatsApp.</p>
          )}
          {negocio.instagram && (
            <p>
              <a href={`https://instagram.com/${negocio.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                @{negocio.instagram.replace("@", "")}
              </a>
            </p>
          )}
        </div>
        <div>
          <h3>Servicio</h3>
          {negocio.zona && (
            <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={15} aria-hidden="true" /> {negocio.zona}
            </p>
          )}
          {negocio.horario && (
            <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarDays size={15} aria-hidden="true" /> {negocio.horario}
            </p>
          )}
        </div>
      </div>
      <div className="cp-wrap cp-pie-legal">
        <p>
          © {new Date().getFullYear()} {negocio.nombre || "Pepe Andaluz"} ·{" "}
          <a href="privacidad.html">Aviso de privacidad</a>
        </p>
      </div>
    </footer>
  );
}
