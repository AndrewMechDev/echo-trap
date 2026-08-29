interface Detection {
  _id: string;
  source: string;
  score: number;
  veredicto: string;
  timestamp: number;
}

const verdictLabels: Record<string, string> = {
  verde: "Verificada",
  amarillo: "Sospechosa",
  rojo: "Alerta",
};

export function Timeline({ detections }: { detections: Detection[] }) {
  return (
    <section className="panel" aria-labelledby="timeline-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Historial de la llamada</span>
          <h2 id="timeline-title">Timeline de detecciones</h2>
        </div>
        <span className="status-chip">{detections.length} segmentos</span>
      </div>
      {detections.length === 0 ? (
        <p className="muted-copy">Los resultados de cada segmento aparecerán acá.</p>
      ) : (
        <ol className="timeline">
          {detections.map((detection) => (
            <li className={`timeline__item timeline__item--${detection.veredicto}`} key={detection._id}>
              <span className="timeline__dot" aria-hidden="true" />
              <div>
                <strong>{verdictLabels[detection.veredicto] ?? "Resultado recibido"}</strong>
                <span>{new Date(detection.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <b>{detection.score.toFixed(1)}%</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
