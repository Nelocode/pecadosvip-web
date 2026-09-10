# Auditoría estática de las entradas Docker — 10 de septiembre de 2026

## Alcance y resultado

Base inspeccionada: `f939b926c64b358a57116335719383d640dd57a0`, rama `main`, remoto `https://github.com/Nelocode/pecadosvip-web.git`. Clon de trabajo exclusivo: `pecadosvip-copia-auditoria-20260910`. Inspección de fuentes, nombres de archivos e instrucciones de construcción; no se abrieron imágenes ni vídeos.

**No se encontró ninguna entrada de la base que el build necesite y que falte en Git o quede excluida por `.dockerignore`.** Se inspeccionaron también dependencias transitivas, CSS importado, catálogos y archivos que el build lee únicamente para calcular su inventario. `.dockerignore` se conserva sin cambios.

Hay dos discrepancias actuales que no son un fallo de archivo ausente: el identificador de procedencia utilizado sin `.git` está desactualizado y `wordpress/.build/` puede entrar en un contexto Docker creado desde un árbol local ya compilado. El incidente CTL-034 corresponde a otro SHA histórico; no demuestra que al SHA auditado le falte `Dockerfile`.

**No se construyó ninguna imagen Docker, no se inició ningún contenedor y no se consultó ni modificó producción.** Esta auditoría no certifica disponibilidad del registro de imágenes, de npm o de apt, compatibilidad del contenedor, arranque de Apache, montaje de volúmenes ni despliegue en EasyPanel.

## Cadena de entradas

Aunque conceptualmente separa compilación y ejecución, el Dockerfile actual declara cuatro etapas: `builder`, `runtime`, `protected-runtime` y `production` (`Dockerfile:1,16,30,44`).

| Consumidor | Entradas comprobadas | Evidencia en fuentes |
| --- | --- | --- |
| Contexto de compilación | `Dockerfile`, `.dockerignore`; contexto en la raíz del repositorio | `Dockerfile:3,7` |
| Instalación npm | `wordpress/package.json` y `wordpress/package-lock.json`, lockfile v3, `esbuild` 0.28.2 en ambos | `Dockerfile:10`; `wordpress/package.json:6,8,13`; `wordpress/package-lock.json:4,11,459` |
| Comando de build | `wordpress/build-native.mjs` e import local `build-inputs.mjs` | `Dockerfile:13`; `wordpress/package.json:8`; `wordpress/build-native.mjs:1,6` |
| Exportador del seed | `wordpress/src/seed.ts`, `wordpress/src/compliance-copy.ts`, imports transitivos en `lib/preview`, `lib/beta`, `lib/content`, `lib/i18n`, `lib/site-config.ts`, `lib/rfc3339.ts` y cuatro catálogos JSON | `wordpress/build-native.mjs:21`; `wordpress/src/seed.ts:1-15`; `lib/i18n/catalog.ts:1-4` |
| Configuración de esbuild | `tsconfig.json` de la raíz, sin `extends`; no ejecuta el type-checker ni requiere los tipos de React/Cloudflare declarados allí para este bundle | `tsconfig.json:2-25`; `wordpress/build-native.mjs:21-22` |
| Fuentes copiadas al producto | Árbol completo `wordpress/theme/pecadosvip/` y `wordpress/plugin/pecadosvip-content/` | `wordpress/build-native.mjs:18-19` |
| Medios locales | 72 archivos: 24 de perfil, 8 de ciudad, 3 decorativos, 1 hero, 34 de catálogo y los 2 iconos de `app/`; nombres y existencia comprobados, sin visualizar contenido | `wordpress/src/seed.ts:17-23`; `lib/beta/beta-media-catalog.ts:95-124`; `wordpress/build-native.mjs:27-39` |
| CSS | `app/globals.css`, `theme.css`, `public-site.css`; transitivos `theme-sections.css`, `theme-responsive.css`, `service-pages.css` | `wordpress/build-native.mjs:47-58`; `app/theme.css:1-2`; `app/public-site.css:1` |
| URL dentro del CSS | El único recurso CSS absoluto observado es `/preview-local-sintetico/decor-media/border-filigree`; su alias se resuelve al catálogo local | `app/public-site.css:826`; `wordpress/build-native.mjs:41,52-55` |
| Inventario de huellas | Todos los archivos de `app`, `lib`, los cuatro catálogos, `wordpress/src`, `wordpress/theme` y `wordpress/plugin`; además Dockerfile, ignore, Compose y ocho archivos auxiliares en la base, nueve tras añadir el helper de cobertura de Tarea 2 | `wordpress/build-inputs.mjs:19-31`; lectura y hash en `:33-38` |
| Copias directas al runtime | Los cuatro archivos de `wordpress/protection/` nombrados por `COPY` están versionados, presentes e incluidos | `Dockerfile:33-36` |
| Copias entre etapas | `wordpress/dist/pecadosvip` y `wordpress/dist/pecadosvip-content` se generan mediante los renombrados del build; no son entradas que deban estar en Git | `wordpress/build-native.mjs:64-68`; `Dockerfile:47-48` |

El inventario es más amplio que el grafo que ejecuta esbuild: aun un archivo PHP auxiliar o un módulo antiguo de `app/` puede ser requisito del hash de entradas. Por eso no bastaba con comprobar `src/seed.ts`. El comprobador encontró 25 módulos transitivos entre el exportador y los scripts del build; el único import de paquete no incorporado en Node es `esbuild`. No se depende de un `node_modules` de la raíz ni se ejecuta el frontend React/Next anterior.

Los archivos `package.ps1`, `artifact-info.mjs`, `verify-native.mjs`, `source-version.json` y `wordpress/docker-compose.yml` están incluidos aunque no se ejecuten dentro de `npm run build`: el inventario los lee. Excluirlos rompería ese paso. El Dockerfile no ejecuta `npm run verify`; la verificación local de la entrega corresponde al integrador.

## Reglas de `.dockerignore`

La regla inicial `**` excluye todo y las negaciones posteriores admiten entradas concretas. Las denegaciones finales vuelven a excluir material sensible incluso bajo directorios admitidos. Esta tabla cubre todas las reglas de exclusión y todos los grupos de excepciones del archivo auditado.

| Reglas / líneas | Efecto y justificación |
| --- | --- |
| `**` — 5 | Excluye por defecto Git, dependencias de la raíz, resultados locales, evidencias, inventarios de clientes, bases de datos, archivos históricos y cualquier carpeta no admitida. Ninguno es entrada necesaria del build WordPress revisado. La ausencia de `.git` tiene el efecto de procedencia descrito más abajo. |
| Excepciones Docker, manifests/configuración de raíz y patch — 7-18 | Se admiten Dockerfile, ignore y `tsconfig.json`, necesarios; package/pnpm/Next/Vite/patch pertenecen al flujo anterior y no son requisito directo del build nativo actual. Mantenerlos es redundante, no una entrada ausente. `next-env.d.ts` es la única excepción literal para un archivo inexistente; no es importado ni leído por el build nativo, por lo que no bloquea. |
| `.openai/hosting.json` — 20-21 | Configuración heredada admitida pero no leída por esta compilación. No se amplió su alcance ni se inspeccionaron credenciales. |
| `app/**`, `lib/**` — 23-26 | Necesarios por los imports y el inventario completo; las denegaciones finales tienen prioridad. |
| `public/**` — 27-29 | Admitido por compatibilidad con el flujo anterior; no lo copia el build nativo actual. No es una exclusión problemática. |
| `wordpress/**` — 30-31 | Incluye expresamente `src/**`, ambos manifests npm, scripts del build, tema, plugin, Compose, procedencia y protección. También permite material no necesario del mismo árbol: no equivale a una lista mínima de entradas. |
| Assets seleccionados y sus directorios — 36-133 | Admiten exactamente las rutas de los 70 archivos del catálogo; los dos iconos entran mediante `app/**`. Masters, alternativas, manifests de medios y otros assets siguen excluidos por la regla inicial. Se contrastaron nombres construidos por las funciones del catálogo con rutas incluidas, existencia local y `git ls-files`. |
| Cuatro scripts anteriores — 135-139 | Admitidos, aunque no son llamados por `wordpress/build-native.mjs`. El resto de `scripts/` permanece excluido; no es necesario para el build nativo revisado. |
| Catálogos `es/en/fr/it.json` — 141-148 | Son imports transitivos reales de `lib/i18n/catalog.ts`. El resto de `compliance/` queda excluido; el build sólo recorre `compliance/multilingual/catalogs`. Actualmente ese directorio contiene los cuatro archivos admitidos. |
| `wordpress/node_modules` y `/**` — 153-154 | Excluyen instalación local y binarios específicos de Windows; npm los instala en la etapa Linux. No deben transportarse desde la máquina. |
| `wordpress/dist` y `/**` — 155-156 | Excluyen producto generado previo; la etapa builder produce ambos destinos de nuevo. |
| `wordpress/output` y `/**` — 157-158 | Excluyen salidas QA, secretos de desarrollo y evidencias; no son entradas de compilación. |
| `wordpress/qa` y `/**` — 159-160 | El Dockerfile de producción no ejecuta las pruebas de Compose ni monta sus fixtures. Excluir QA es compatible con el build. |
| `wordpress/tests` y `/**` — 161-162 | El comando de build no ejecuta estas suites. La exclusión no sustituye su ejecución antes del commit. |
| `**/.env`, `**/.env.*`, `**/.netrc`, `**/.npmrc` — 163-166 | Excluyen configuración local y credenciales. El bundle define `process.env` e `import.meta.env` como `{}` (`build-native.mjs:22`) y el lock usa el registro público; no requiere esos archivos. |
| `**/.ssh`, `**/.ssh/**`, `**/id_ed25519`, `**/id_rsa` — 167-168,170-171 | Excluyen directorios y claves SSH; no son entradas del build. |
| `**/credentials.json`, `**/secrets.json`, `**/service-account*.json`, `**/service_account*.json` — 169,172-174 | Excluyen credenciales de aplicaciones/cuentas; no hay imports ni lecturas necesarias hacia ellas. |
| `**/*.jks`, `**/*.key`, `**/*.keystore`, `**/*.p12`, `**/*.pem`, `**/*.pfx` — 175-180 | Excluyen almacenes de claves, certificados y claves privadas locales. Ninguna entrada detectada tiene esas extensiones. |

La afirmación del comentario inicial de que se excluyen todos los tests y logs es más amplia que las reglas reales: `wordpress/protection/tests/**` sigue admitido y `wordpress/.build/**` también. No afectan a la presencia de entradas, y las copias finales de Docker sólo toman las rutas declaradas; sí pueden inflar el contexto de la etapa builder.

## Discrepancias actuales e histórico

| Estado | Hallazgo | Consecuencia y límite |
| --- | --- | --- |
| Actual, procedencia | `.git` queda fuera. `build-inputs.mjs:13-15` usa entonces `wordpress/source-version.json`, que declara `f12dafcd7b800e16fb36efcc8b85f5e6c9a71dd0` y el repositorio anterior `Nelocode/pecadosvip.git` (`source-version.json:2-3`). | Un build Docker puede generar un manifest con SHA antiguo aunque sus archivos procedan de la revisión actual. No es un fallo por entrada ausente ni permite afirmar qué versión hay en producción. Corregir el mecanismo de procedencia requiere una tarea separada; no se tocó. |
| Actual, contexto local | Falta una denegación de `wordpress/.build/**`, que sí figura en `wordpress/.gitignore`. | Después de un build local, staging y copias previas podrían enviarse al contexto Docker. No son requeridos para construir; un clon Git limpio no los contiene. No se modificó ignore porque no faltaba ninguna entrada imprescindible y el usuario pidió un clon nuevo. |
| Actual, reproducibilidad externa | `node:22-alpine` es una etiqueta móvil, npm ejecuta `install` y apt instala FFmpeg sin versión fijada; la imagen WordPress sí tiene digest. | La integridad de entradas locales no prueba que una futura resolución de paquetes o imagen produzca los mismos bytes. No se cambiaron dependencias ni Dockerfile. |
| Actual, alcance | El build genera sus archivos, pero el Dockerfile no llama al verificador. | Esta auditoría y `npm run verify` local son controles separados; ninguno equivale a una imagen construida. |
| Histórico | CTL-034, `CONTROL_LOG.csv:35`, fecha 2026-08-28: EasyPanel eligió `013307a80242c7961b1f18b2aa4edf0a7adf1ae6`, sin Dockerfile en raíz. | Ese fallo no se reproduce estáticamente en `f939b926…`: el Dockerfile está versionado en raíz. El registro histórico no permite concluir que todos los despliegues posteriores fallaron. No se comprobó el estado actual de EasyPanel. |

## Comprobación reproducible y ejecución real

Desde la raíz del clon, con Node 22.13+ y Git, sin instalar paquetes:

```powershell
node --version
git rev-parse HEAD
git branch --show-current
git ls-files --stage Dockerfile .dockerignore wordpress/src wordpress/package.json wordpress/package-lock.json wordpress/source-version.json
node wordpress/audits/check-docker-inputs-20260910.mjs
```

Node observado: `v24.16.0`; HEAD: `f939b926c64b358a57116335719383d640dd57a0`; rama: `main`. Los archivos pedidos por `git ls-files` aparecieron con modo `100644`; `wordpress/src/` contenía `seed.ts` y `compliance-copy.ts`. Las cuatro copias de protección también estaban versionadas.

El comprobador no escribe archivos, no importa ni ejecuta módulos del proyecto y no invoca esbuild, npm, Docker ni red. Lee el grafo de imports, enumera las plantillas actuales de catálogos, recorre los directorios que el build hashea y compara con `git ls-files`. Su interpretación de ignore admite los patrones presentes en este archivo y rechaza sintaxis nueva no soportada; es un control limitado a estas fuentes, no una implementación completa de Docker/Moby o de TypeScript. Las rutas generadas entre etapas se contrastan con el código que las crea, no con una ejecución de Docker.

Primera ejecución real durante el trabajo paralelo (salida 1):

```json
{
  "mode": "static-source-inspection-no-docker-no-network",
  "head": "f939b926c64b358a57116335719383d640dd57a0",
  "trackedContextFiles": 439,
  "requiredFiles": 253,
  "transitiveModules": 25,
  "catalogAndIconFiles": 72,
  "cssFiles": 6,
  "directRuntimeCopies": 4,
  "nonBuiltinBuildImports": ["esbuild"],
  "packageLockMatches": true,
  "missingExcludedOrUntrackedInputs": [
    "Build reads untracked input: wordpress/plugin/pecadosvip-content/includes/copy-upgrade.php"
  ],
  "localOnlyIncludedCount": 3,
  "localOnlyIncludedBuildStagingCount": 0,
  "fallbackSourceCommit": "f12dafcd7b800e16fb36efcc8b85f5e6c9a71dd0",
  "warnings": [
    "Docker fallback source-version.json does not identify current HEAD.",
    "wordpress/.build is allowed: local staging can enter a local Docker context."
  ]
}
```

El único fallo era el archivo nuevo de la Tarea 1, ya creado por el agente de migración pero todavía sin añadir al índice. Es un resultado útil del control de dependencias locales: demuestra que no confunde «existe aquí» con «viajará en Git». No es una omisión de la base remota. Las otras dos entradas locales admitidas eran archivos de auditoría, no requisitos del build. Los contadores de archivos locales admitidos pueden crecer al construir porque `.build` está admitido.

El integrador repitió el mismo comando después de los commits de las Tareas 1 y 2 y de añadir la Tarea 3 al índice: **salida 0**, con este resultado real (log `output/copia-auditoria-20260910/docker-inputs-before-task3.json`):

```json
{
  "mode": "static-source-inspection-no-docker-no-network",
  "head": "35bbc61ee1718abb4cf847dff47f3d74a44462d3",
  "trackedContextFiles": 445,
  "requiredFiles": 254,
  "transitiveModules": 25,
  "catalogAndIconFiles": 72,
  "cssFiles": 6,
  "directRuntimeCopies": 4,
  "nonBuiltinBuildImports": ["esbuild"],
  "packageLockMatches": true,
  "missingExcludedOrUntrackedInputs": [],
  "localOnlyIncludedCount": 147,
  "localOnlyIncludedBuildStagingCount": 147,
  "fallbackSourceCommit": "f12dafcd7b800e16fb36efcc8b85f5e6c9a71dd0",
  "warnings": [
    "Docker fallback source-version.json does not identify current HEAD.",
    "wordpress/.build is allowed: local staging can enter a local Docker context."
  ]
}
```

Las 254 entradas incluyen ahora el módulo de migración y el helper de cobertura. Los 147 archivos locales admitidos son staging generado; ninguno es requisito de la compilación. Las advertencias se conservan y no equivalen a un fallo por entrada faltante.

Comprobación histórica ejecutada:

```powershell
rg -n 'CTL-034|Dockerfile|EasyPanel' CONTROL_LOG.csv
```

Salida relevante: línea 35 contiene el incidente CTL-034 y el SHA histórico anterior; línea 36 registra el candidato de contenedor del flujo Vinext anterior. No se usó ese registro como prueba del runtime WordPress actual.

## Lo que no se hizo y supuestos

- No se ejecutó Docker, no se validaron etiquetas/digests en registros externos ni se modificó producción: lo prohíbe esta tarea y el usuario indica que Docker no está disponible.
- No se cambió Dockerfile, protección, workflows, política editorial, inventario Legacy, archivos del seed ni dependencias. Los hallazgos de procedencia/contexto se reportan para una decisión posterior.
- No se editaron `wordpress/dist/**` ni resultados generados. No se introdujeron tokens, cookies ni credenciales en los archivos o informes.
- El supuesto necesario es que el futuro contexto Docker sea la raíz de un checkout que incluya los commits entregados, con rutas y mayúsculas tal como están en Git. Elegir otro SHA o subdirectorio en EasyPanel queda fuera de esta inspección.
- El agente auditor no hizo commit, push ni despliegue; el integrador conserva el único turno de Git y entregará el parche por tarea tras ejecutar el verificador del repositorio.

## Conciliación con `main` antes del push autorizado

La auditoría anterior describe la base `f939b926`. Durante el push entraron los commits `862d314` y `1877a41`, que se integran conservando su historial. `1877a41` añade `PECADOSVIP_CONTAINMENT=open` mediante ARG/ENV y cambios de protección y CI; esas modificaciones pertenecen a upstream y no añaden entradas de archivos al build. Las etapas del Dockerfile están ahora en las líneas 1, 16, 33 y 50; las copias de protección, en 39–42; las del producto, en 53–54.

La comprobación repetida sobre la integración mantiene 254 entradas, 25 módulos, 72 archivos de catálogo/iconos, 6 CSS y 4 copias directas, sin entradas ausentes, excluidas o sin versionar. Persisten las advertencias de procedencia antigua y staging `.build` admitido; el número de archivos locales de staging es variable. Este resultado valida entradas, no la política de contención ni una imagen Docker construida. Los cambios de Dockerfile, protección y workflows de upstream se conservan sin modificaciones adicionales.
