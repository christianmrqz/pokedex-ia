/**
 * URL pública del sitio. Orden: NEXT_PUBLIC_SITE_URL (manual), dominio de producción
 * que Vercel define automáticamente y, en local, http://localhost:3000.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");
