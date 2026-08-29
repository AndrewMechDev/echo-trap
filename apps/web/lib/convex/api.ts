import { anyApi } from "convex/server";

// Las referencias mantienen los nombres públicos reales de Convex sin importar
// el código servidor en el bundle de Next. El backend sigue siendo la fuente de
// validación y los nombres se regeneran en `packages/backend/convex/_generated`.
export const api = anyApi;

