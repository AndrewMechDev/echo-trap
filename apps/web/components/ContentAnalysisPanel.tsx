import type { ContentVerdict } from "@echo-trap/shared";

interface ContentAnalysis {
  veredicto: string;
  explicacion: string;
  sources: Array<{ titulo: string; url: string }>;
  transcript: string;
  timestamp: number;
}
const verdictLabels: Record<ContentVerdict, string> = {
  verdadera: "Contenido aparentemente verdadero",
  sospechosa_de_estafa: "Contenido sospechoso de estafa",
  enganosa: "Contenido posiblemente engañoso",
  inconclusa: "Análisis inconcluso",
};

export function ContentAnalysisPanel({ analysis }: { analysis?: ContentAnalysis }) {
  if (!analysis) {
    return (
      <section className="panel panel--muted" aria-labelledby="content-title">
        <div className="panel__heading">
          <div>
            <span className="eyebrow">Señal secundaria</span>
            <h2 id="content-title">Análisis de contenido</h2>
          </div>
          <span className="status-chip">Pendiente</span>
        </div>
        <p className="muted-copy">
          Se activa automáticamente si el semáforo detecta una señal amarilla o roja.
        </p>
      </section>
    );
  }

  const verdict = (analysis.veredicto in verdictLabels
    ? analysis.veredicto
    : "inconclusa") as ContentVerdict;

  return (
    <section className={`panel content-panel content-panel--${verdict}`} aria-labelledby="content-title">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Señal secundaria</span>
          <h2 id="content-title">Análisis de contenido</h2>
        </div>
        <span className="status-chip">{verdictLabels[verdict]}</span>
      </div>
      <p className="content-panel__explanation">{analysis.explicacion}</p>

      {analysis.transcript && (
        <details className="transcript">
          <summary>Ver transcripción</summary>
          <p>{analysis.transcript}</p>
        </details>
      )}

      {analysis.sources.length > 0 && (
        <div className="sources">
          <span className="eyebrow">Fuentes consultadas</span>
          <ul>
            {analysis.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.titulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
