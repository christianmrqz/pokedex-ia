# Progreso

Última actualización: 2026-10-12. Estado: **fases 1 a 4 implementadas**. 127 tests en verde (`npm test`), `npm run typecheck`, `npm run lint` y `npm run build` sin errores.

## Fase 1 — MVP funcional ✅

| Funcionalidad | Verificación |
| --- | --- |
| Next.js 16 + TypeScript estricto + Tailwind 4 + shadcn/ui | typecheck, lint, build |
| Índices estáticos desde PokéAPI (1351 variedades, 1025 especies, 919 movimientos, 25 naturalezas, 32 juegos) | `data-integrity.test.ts` |
| Buscador (español/inglés, número, autocompletado, erratas) | `search.test.ts` |
| Ficha `/pokemon/[slug]`: descripción, altura, peso, habilidades, formas, evolución (sin sprites clásicos: se retiraron a petición) | Probada en desarrollo y producción |
| Artwork normal/shiny con alternativas | `sprites.test.ts` (fixtures reales) |
| Estadísticas base (barras + radar), históricas por generación | `strategy.test.ts` |
| Motor de tipos por generación (modo rápido) | `type-chart.test.ts` (cruce celda a celda con @smogon/calc, Gen 1-9) |
| Modo avanzado (habilidades, Teracristal, objetos, Gravedad, Turbulencia, Respiro…) | `battle-effectiveness.test.ts` |
| Selector global de juego/generación | Manual |
| Explorador y calculadora de tipos | Manual (capturas a 1280 y 390 px) |

## Fase 2 — Herramientas avanzadas ✅

| Funcionalidad | Verificación |
| --- | --- |
| Calculadora de estadísticas (Gen 1-2 con DV/experiencia y Gen 3+ con IV/EV/naturaleza, Shedinja, límites de EV por generación) | `stats.test.ts` (cruce con `calcStat` de @smogon/calc) |
| Optimizador «¿Qué EV e IV me convienen?» (7 objetivos, IV 0 cuando procede) | `optimizer.test.ts` |
| Movimientos por juego con filtros y valores históricos (potencia, tipo, categoría) | `learnset.test.ts` |
| Comparador (estadísticas base y reales, velocidad, tipos, movimientos destacados en un juego común) | `compare.test.ts` |
| Calculadora de daño con @smogon/calc (rangos, % de PS, probabilidad de KO, tiradas) | `damage.test.ts` (cálculo a mano verificado) |

## Fase 3 — Inteligencia artificial ✅

| Funcionalidad | Verificación |
| --- | --- |
| Interpretación determinista de preguntas (Pokémon, tipos, intención) | `interpret.test.ts` |
| Hechos verificables (tipos, rivales, repartos, enfrentamientos con daño real, cobertura) | `facts.test.ts` |
| Respuesta sin IA a partir de los hechos | `facts.test.ts` + prueba manual de la ruta |
| Asistente con Claude (`claude-opus-5-5`, streaming, *fallback* de servidor ante rechazos) | **Sin probar contra la API real** (no hay clave configurada en este entorno) |
| Interfaz de chat (`/asistente` y botón «Preguntar» en cada ficha, con contexto) | Prueba de interacción automatizada en navegador |

## Fase 4 — Funcionalidades adicionales ✅

| Funcionalidad | Verificación |
| --- | --- |
| Constructor de equipos (hasta 6, naturaleza, habilidad, objeto, movimientos, IV/EV, Teracristal; guardado local) | Manual con equipo de prueba |
| Análisis: debilidades compartidas, cobertura, físico/especial, velocidad y sugerencias | `team.test.ts` |
| Exportación a formato Showdown | `showdown.test.ts` |
| Favoritos (ficha, portada y filtro del explorador) | Manual |
| SEO: metadatos por ficha, Open Graph, `sitemap.xml`, `robots.txt` | Build (rutas estáticas generadas) |
| Responsive | Sin desbordamiento horizontal ni errores de consola en 11 rutas a 1280 y 390 px (producción) |

## Limitaciones conocidas

- El modo IA del asistente no se ha probado con una clave real; el modo sin IA sí.
- Algunas formas recientes no tienen nombre oficial en español en PokéAPI; se muestran en inglés.
- Los rivales sugeridos y las sugerencias de equipo se basan en tipos y estadísticas base; no comprueban movimientos concretos (se indica en la interfaz).
- Tres formas no tienen equivalencia en @smogon/calc (Marowak Totem y Mega-Meowstic): sin estadísticas históricas ni cálculo de daño.
- La interfaz está en español; los diccionarios en inglés existen, pero aún no hay selector de idioma.
- Leyendas: Arceus y Let's Go usan sistemas de esfuerzo propios que la calculadora de estadísticas no modela (usa las fórmulas de su generación).

## Ideas para siguientes pasos

- Selector de idioma (es/en) usando los diccionarios existentes.
- Importar equipos desde texto de Showdown.
- Tests de extremo a extremo (Playwright) para los flujos principales.
