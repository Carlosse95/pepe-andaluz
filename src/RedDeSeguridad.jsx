// Si algo truena al dibujar la pantalla, React desmonta TODA la app y deja el
// fondo en blanco. Desde el iPad eso se siente como "me sacó": la pantalla se
// vacía a media navegación y no hay forma de volver más que cerrar y abrir.
//
// Esto lo atrapa y muestra una salida. Los datos no se pierden: viven en la
// nube, no en la pantalla.
import React from "react";

export default class RedDeSeguridad extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda apuntado en la consola por si hay que revisarlo después.
    console.error("La app tronó al dibujar:", error, info?.componentStack);
    // Y se guarda lo último, para poder preguntarle a Carlos qué decía sin
    // depender de que alcance a leerlo en la pantalla.
    try {
      window.localStorage.setItem(
        "pepe_andaluz_ultimo_error",
        JSON.stringify({
          cuando: new Date().toISOString(),
          mensaje: String(error?.message || error),
          donde: (info?.componentStack || "").split("\n").slice(0, 6).join("\n"),
        })
      );
    } catch { /* si ni eso se puede, no vale la pena insistir */ }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={estilos.fondo}>
        <div style={estilos.caja}>
          <div style={estilos.titulo}>Se atoró la pantalla</div>
          <p style={estilos.texto}>
            No se perdió nada: tus pedidos y tus clientes están guardados en la nube.
            Vuelve a entrar y sigue donde ibas.
          </p>
          <button style={estilos.boton} onClick={() => window.location.reload()}>
            Volver a entrar
          </button>
          <p style={estilos.detalle}>{String(this.state.error?.message || this.state.error)}</p>
        </div>
      </div>
    );
  }
}

const estilos = {
  fondo: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "#eef2fb",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  caja: {
    maxWidth: 420,
    width: "100%",
    background: "#fff",
    borderRadius: 20,
    padding: 28,
    textAlign: "center",
    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
  },
  titulo: { fontSize: 20, fontWeight: 700, marginBottom: 10 },
  texto: { fontSize: 15, lineHeight: 1.5, color: "#4a5568", marginBottom: 20 },
  boton: {
    width: "100%",
    padding: 14,
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    background: "#3b5bdb",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
  },
  detalle: { fontSize: 11, color: "#a0aec0", marginTop: 16, wordBreak: "break-word" },
};
