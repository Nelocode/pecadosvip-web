# Diagnóstico conservado: audit bloqueado por el sandbox

Esta captura sí ejecutó correctamente `pnpm run validate` sobre el commit `b9d67186f7bc14503398796df85a23eab1978386`: lint, TypeScript, 115/115 pruebas y build terminaron con código 0. `validate.log` conserva la salida completa.

El segundo comando, `pnpm audit --prod --audit-level=moderate`, no pudo consultar el endpoint de advisories de npm por `EACCES` dentro del sandbox y terminó después de sus reintentos. `pnpm-audit-production.log` conserva la salida exacta. Esto es `NOT_TESTED` para esa llamada, no evidencia de una vulnerabilidad ni un resultado limpio.

La captura final se repite con acceso de red aprobado y queda separada de este diagnóstico.
