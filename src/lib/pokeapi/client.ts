/**
 * Cliente HTTP mínimo para PokéAPI v2 con timeout y reintentos controlados.
 * Solo reintenta errores de red y 5xx/429; un 404 se devuelve inmediatamente.
 */
export const POKEAPI_BASE = "https://pokeapi.co/api/v2/";

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly path: string,
  ) {
    super(message);
    this.name = "PokeApiError";
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function pokeApiFetch<T>(path: string, { retries = 2, timeoutMs = 12_000 } = {}): Promise<T> {
  const url = path.startsWith("http") ? path : POKEAPI_BASE + path.replace(/^\//, "");
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (res.ok) return (await res.json()) as T;
      if (!RETRYABLE.has(res.status)) throw new PokeApiError(`PokéAPI respondió ${res.status}`, res.status, path);
      lastError = new PokeApiError(`PokéAPI respondió ${res.status}`, res.status, path);
    } catch (err) {
      if (err instanceof PokeApiError && !RETRYABLE.has(err.status ?? 0)) throw err;
      lastError = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new PokeApiError("No se pudo contactar con PokéAPI", null, path);
}

export const idFromUrl = (url: string): number => Number(url.replace(/\/$/, "").split("/").at(-1));
