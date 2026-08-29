import type { ContentVerdict } from "@echo-trap/shared";

interface ContentAnalysis {
  _id: string;
  veredicto: string;
  explicacion: string;
  transcript: string;
  timestamp: number;
}

const ESTADO_LABEL: Record<ContentVerdict, string> = {
  verdadera: "Verificado",
  sospechosa_de_estafa: "Alerta",
  enganosa: "Sospechoso",
  inconclusa: "Sin datos",
};

function veredictoValido(veredicto: string): ContentVerdict {
  return veredicto in ESTADO_LABEL ? (veredicto as ContentVerdict) : "inconclusa";
}

function recortar(texto: string, maxPalabras: number): string {
  const palabras = texto.trim().split(/\s+/);
  if (palabras.length <= maxPalabras) return texto.trim();
  return `${palabras.slice(0, maxPalabras).join(" ")}…`;
}

// Feed cronológico y esquemático de lo que va diciendo la llamada — análogo al monitor
// de consola del prototipo original (ESTADO/DICE/MOTIVO), pero como componente visual
// real en vez de texto plano. Muestra el historial completo de análisis de contenido
// (no solo el último, a diferencia de ContentAnalysisPanel), más nuevo primero.
export function LiveFeed({ analyses }: { analyses: ContentAnalysis[] }) {
  const ordenadas = [...analyses].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <section className="panel live-feed" aria-labelledby="live-feed-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Monitor en vivo</span>
          <h2 id="live-feed-title">Qué está diciendo la llamada</h2>
        </div>
        <span className="status-chip">{ordenadas.length} eventos</span>
      </div>

      {ordenadas.length === 0 ? (
        <p className="muted-copy">
          Sin actividad todavía — aparece solo si el semáforo detecta una señal amarilla o roja.
        </p>
      ) : (
        <ol className="live-feed__list">
          {ordenadas.map((analysis) => {
            const veredicto = veredictoValido(analysis.veredicto);
            return (
              <li className={`live-feed__item live-feed__item--${veredicto}`} key={analysis._id}>
                <div className="live-feed__row">
                  <span className="live-feed__badge">{ESTADO_LABEL[veredicto]}</span>
                  <time className="live-feed__time">
                    {new Date(analysis.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </time>
                </div>
                <p className="live-feed__line">
                  <strong>Dice:</strong> {recortar(analysis.transcript, 16)}
                </p>
                <p className="live-feed__line live-feed__line--muted">
                  <strong>Motivo:</strong> {recortar(analysis.explicacion, 16)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
