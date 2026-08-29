interface AlertPopupProps {
  alert: { tipo: string; timestamp: number } | null;
  onClose: () => void;
}
export function AlertPopup({ alert, onClose }: AlertPopupProps) {
  if (!alert) return null;

  return (
    <aside className="alert-popup" role="alert" aria-live="assertive">
      <div className="alert-popup__icon" aria-hidden="true">!</div>
      <div>
        <span className="eyebrow">Alerta de seguridad</span>
        <h2>Posible estafa detectada</h2>
        <p>La voz fue marcada como sintética. Actuá con precaución.</p>
      </div>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar alerta">
        ×
      </button>
    </aside>
  );
}
