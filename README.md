# DexLab — Pokédex inteligente

Pokédex web en español que ayuda a entender cualquier enfrentamiento Pokémon: escribe el nombre del rival (por ejemplo **Drapion**) y obtén al instante sus debilidades exactas, estadísticas, movimientos por juego y cómo derrotarlo.

Todos los datos proceden de [PokéAPI](https://pokeapi.co) y todos los cálculos son deterministas y están cubiertos por tests. No hay datos simulados ni resultados generados por IA.

> Proyecto no oficial creado por fans. Pokémon y los nombres de los personajes son marcas de Nintendo, Creatures Inc. y GAME FREAK inc.

## Requisitos

- Node.js 20.9 o superior (probado con Node 21.7).
- npm 10.

## Puesta en marcha

```bash
npm install          # el proyecto incluye .npmrc con legacy-peer-deps=true (ver «Notas»)
npm run dev          # http://localhost:3000
```

Producción:

```bash
npm run build
npm start
```

No hace falta configurar nada más: la aplicación funciona sin claves ni variables de entorno.

### Asistente con IA (opcional)

Copia `.env.example` a `.env.local` y rellena `ANTHROPIC_API_KEY`. Con la clave, el asistente redacta las respuestas con Claude (`claude-opus-5-5`); sin ella responde igualmente, sin IA, con los mismos datos calculados. La clave solo se usa en el servidor (`/api/assistant`) y nunca llega al navegador.

El asistente sigue siempre estos pasos: interpreta la pregunta (sin IA), identifica Pokémon y tipos, consulta los datos, ejecuta los cálculos deterministas y envía a la IA solo esos hechos con la instrucción de no inventar nada. Cada respuesta muestra los «Datos usados». Está activado el *fallback* de servidor de la API (`fallbacks: "default"`): si los filtros de seguridad rechazan una petición, la API la reintenta con otro modelo; si todo falla, se muestra la respuesta sin IA.

## Funcionalidades

- **Pokédex**: 1351 Pokémon y formas, buscador tolerante a errores (español, inglés o número) y explorador con filtros.
- **Ficha** `/pokemon/{nombre}`: artwork normal/shiny, debilidades (modo rápido y avanzado), estadísticas, estrategia («¿Cómo derroto a este Pokémon?»), calculadora, movimientos por juego, evoluciones y formas.
- **Tipos** `/tipos`, **Estadísticas** `/calculadora/estadisticas`, **Daño** `/calculadora/dano`, **Comparador** `/comparador`, **Asistente** `/asistente` y **Equipos** `/equipos`.
- Selector global de juego en la cabecera: cambia la tabla de tipos, los tipos y estadísticas históricos, los movimientos disponibles y las fórmulas.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Turbopack). |
| `npm run build` / `npm start` | Build y servidor de producción. |
| `npm test` | Tests unitarios (Vitest). |
| `npm run typecheck` | Comprobación de TypeScript estricto. |
| `npm run lint` | ESLint. |
| `npm run data:build` | Regenera los índices estáticos desde PokéAPI (ver abajo). |

## Arquitectura

```
scripts/build-data.ts        Genera src/data/generated/*.json desde PokéAPI (una vez)
src/
  app/                       Rutas (App Router)
    page.tsx                 Portada: buscador, Pokémon del día, favoritos, herramientas
    pokedex/                 Explorador con filtros
    pokemon/[slug]/          Ficha completa (prerender parcial + streaming)
    tipos/ calculadora/ comparador/ asistente/ equipos/
    api/pokemon/[slug]/      Movimientos aprendibles (para el navegador)
    api/assistant/           Asistente (streaming NDJSON)
    sitemap.ts, robots.ts    SEO
  components/                UI (shadcn/ui en components/ui)
  data/generated/            Índices estáticos versionados
  i18n/                      Diccionarios es (por defecto) y en
  lib/
    domain.ts                Tipos de dominio compartidos
    data/                    Acceso a los índices (pokedex, catálogos, juegos)
    engine/                  Motores puros y testeados (sin React ni red)
      type-chart.ts          Efectividad de tipos por generación
      battle-effectiveness.ts Efectividad real (habilidades, Tera, objetos, campo)
      learnset.ts            Movimientos aprendibles por juego e historial de valores
      strategy.ts            Análisis del rival y enfrentamientos sugeridos
      search.ts              Buscador tolerante a errores
      sprites.ts             Resolución de imágenes con alternativas
      stats.ts  optimizer.ts Estadísticas reales y repartos de EV/IV recomendados
      damage.ts              Envoltorio de @smogon/calc (no reimplementa la fórmula)
      compare.ts  coverage.ts  team.ts
    assistant/               Intérprete, hechos, respuesta sin IA y prompt
    team/                    Modelo de equipo y exportación a Showdown
    pokeapi/                 Cliente REST con reintentos, transformaciones y servicios cacheados
    pokemon/                 Modelos de vista para la ficha
```

### Estrategia de datos

- **Índices estáticos** (`npm run data:build`): una consulta GraphQL a PokéAPI (más un complemento REST para lo que la réplica GraphQL aún no tiene) genera índices ligeros de Pokémon, movimientos, habilidades, naturalezas, juegos y tabla de tipos con sus valores históricos. Permiten búsqueda, filtros y motor de tipos instantáneos sin descargar miles de fichas.
- **Fichas individuales**: `/pokemon/{slug}`, `/pokemon-species/{id}` y `/evolution-chain/{id}` se piden en el servidor y se cachean con `use cache` (`cacheLife("weeks")`). Se guarda el modelo recortado, no la respuesta completa.
- **Degradación elegante**: si PokéAPI no responde, la ficha sigue mostrando tipos, debilidades, estadísticas y estrategia desde el índice local.
- **Buscador**: el índice de búsqueda (~90 KB) se descarga bajo demanda la primera vez que se usa (TanStack Query).
- Se respeta la política de uso justo de PokéAPI: caché agresiva, concurrencia limitada y reintentos con espera exponencial.

### Fuentes complementarias

- [`@smogon/calc`](https://github.com/smogon/damage-calc) (MIT): motor de la calculadora de daño, estadísticas base históricas por generación (p. ej. los ajustes de Gen 6) y verificación cruzada de la tabla de tipos y de las fórmulas de estadísticas en los tests. En la interfaz se indica cuándo un dato procede de esta fuente.
- Imágenes: repositorio [PokeAPI/sprites](https://github.com/PokeAPI/sprites).

## Tests

```bash
npm test
```

Incluyen, entre otros: Drapion débil a Tierra ×2 e inmune a Psíquico, Agua/Volador ×4 a Eléctrico, Agua/Tierra ×0 a Eléctrico, Planta/Acero ×4 a Fuego, monotipos, tablas de las Gen 1, 2-5 y 6+ (comparadas celda a celda con `@smogon/calc` en las 9 generaciones), tipos históricos (Clefairy, Magnemite), modo avanzado (Levitación, Tera, Superguarda…), fallback de imágenes shiny y movimientos no aprendibles en un juego (con datos reales de PokéAPI guardados como fixtures). También cubren las fórmulas de estadísticas (comparadas con `calcStat` de @smogon/calc en Gen 1-2 y 3+), el daño (verificado a mano), el optimizador, el comparador, los equipos, la exportación a Showdown y el intérprete y los hechos del asistente: 127 tests en total. Ver [PROGRESS.md](./PROGRESS.md).

## Notas

- `.npmrc` activa `legacy-peer-deps` para evitar un fallo interno de npm 10.5 («Cannot read properties of null (reading 'edgesOut')») al resolver *peer dependencies* opcionales.
- Vitest está fijado en la rama 3.2 (con Vite 6) porque Vitest 4/5 requieren Node 22.
- Next.js 16 con Cache Components: consulta `node_modules/next/dist/docs/` antes de cambiar la estrategia de caché.
