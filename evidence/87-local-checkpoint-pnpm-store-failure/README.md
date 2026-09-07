# Diagnóstico conservado: store de pnpm

La primera captura de evidencia del checkpoint `84ebcb3086d4a99bffe1a42b339d12300c066f03` no llegó a ejecutar lint, tipos, pruebas ni build.

El wrapper de pnpm comparó `node_modules` —instalado desde el store dedicado del proyecto— con su store predeterminado, intentó ejecutar una instalación automática y quedó recreando `node_modules`. El proceso se detuvo de forma dirigida después de aproximadamente 20 minutos, 5,6 GiB de memoria privada y actividad sostenida. `validate.log` conserva la salida exacta.

La recuperación aisló la carpeta incompleta, reconstruyó 478 paquetes desde el store local dedicado y comprobó los binarios de lint/build. Un segundo intento con `verifyDepsBeforeRun=error` falló rápido porque pnpm 11 trató la ausencia del metadato experimental `enableGlobalVirtualStore` como un cambio; `gvs-mismatch.log` conserva esa salida.

`capture-stage-evidence.ps1` quedó corregido para leer y comprobar el store activo desde `node_modules/.modules.yaml`, exigir los binarios locales de lint, tipos y build, y usar `verifyDepsBeforeRun=false`. Así, la captura nunca ejecuta una instalación automática: valida exactamente el `node_modules` ya preparado y falla en la herramienta concreta si su contenido no sirve.

Este registro prueba un fallo del entorno de dependencias anterior a la suite. No es evidencia de un fallo de las 115 pruebas ni del build de la aplicación.
