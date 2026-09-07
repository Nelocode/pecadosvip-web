# Registro VEX local — `image-size` 2.0.2

Fecha de evaluación: 2026-08-28. Alcance: árbol local y artefacto standalone; no es un VEX firmado, un pentest ni una afirmación sobre un despliegue externo.

## Avisos cubiertos

- `GHSA-w3rx-r6r6-pgpr`: bucle infinito en ICNS.
- `GHSA-5p2g-fcmc-qvqq`: bucles infinitos en JXL/HEIF.

El registro SCA clasifica `image-size@2.0.2` como afectado por versión. A 2026-08-28 no existe una publicación corregida `2.0.3` verificable en el registro del paquete; por tanto, el resultado de `pnpm audit` no se reclasifica como «sin vulnerabilidades conocidas».

## Estado por entorno

| Entorno | Estado | Justificación y evidencia |
|---|---|---|
| Build local | `downstream_patched` | `pnpm.patchedDependencies` aplica `patches/image-size@2.0.2.patch`; SHA-256 canónico LF `61d62c28df252b7fa3c09f4631138e794eb407ce80c31bf467d19ff84c09c771`. `.gitattributes` fija `patches/*.patch` a LF y la prueba normaliza una copia de trabajo CRLF antes de validar el digest, evitando diferencias entre Windows y Linux. Las pruebas ejecutan las salidas CJS y ESM con watchdog, cubren ICNS/JXL/HEIF malformados y preservan fixtures válidos. |
| Standalone entregable | `not_affected: component_not_present` | `prepare-standalone.ts` elimina el paquete; la política 3 del validador rechaza `image-size` a cualquier profundidad bajo `node_modules`; el gate verifica el artefacto después del build. |
| Worker/hosting futuro | `needs_review` | Debe reconstruirse desde el lockfile, repetir audit, pruebas, SBOM y validación del artefacto. No se infiere estado de un despliegue no observado. |

## Límites y reapertura

- El parche downstream no cambia el número de versión; los dos advisories seguirán apareciendo en scanners basados solo en versión.
- La captura durable conserva el audit como gate fail-closed: un exit code distinto de cero no se transforma automáticamente en PASS.
- Reabrir ante cambios en `vinext`, `image-size`, el parche, su hash, el preparador standalone, la política del artefacto o la publicación de una versión upstream corregida.
- Antes de publicar: confirmar que `output/release/standalone-artifact-report.json` es `PASS`, `policyVersion` es al menos `3` y no contiene rutas `image-size`.
