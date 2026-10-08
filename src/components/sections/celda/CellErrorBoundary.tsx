import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Se llama una vez si la celda falló (para que el loader del vault no quede esperando). */
  onError?: () => void;
};

/**
 * Si la escena 3D falla (un modelo que no baja, WebGL que se pierde), la celda
 * desaparece y el resto del portafolio sigue funcionando: es un extra, no puede
 * tirar abajo la página.
 */
export default class CellErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[celda] la escena 3D falló y se oculta:", error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
