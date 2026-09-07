# Activación segura de contenido runtime

Estado: adaptador local implementado y cerrado por defecto. No constituye un
despliegue, una aprobación de contenido ni un CMS productivo.

## Fuente predeterminada

Sin configuración, el sitio conserva el snapshot de borrador interno. Una
configuración incompleta, una ruta ausente o insegura, JSON inválido, contenido
sin evidencia o un gate de release fallido también devuelven ese borrador. El
adaptador no completa ni corrige aprobaciones, contactos, derechos, edades,
consentimientos o textos legales.

## Configuración explícita

El adaptador solo inspecciona una fuente cuando se definen rutas absolutas para
una raíz dedicada y una entrada contenida dentro de ella:

```powershell
$env:PECADOSVIP_RUNTIME_CONTENT_ROOT = 'C:\PecadosVipRuntime'
$env:PECADOSVIP_RUNTIME_CONTENT_SOURCE = 'C:\PecadosVipRuntime\release-001.json'
$env:PECADOSVIP_RUNTIME_CONTENT_ACTIVATION = 'false'
```

`PECADOSVIP_RUNTIME_CONTENT_ACTIVATION` acepta exclusivamente `true` o `false`.
Mantenerla en `false` permite verificar una fuente sin publicarla. La raíz no
puede ser la raíz del sistema; la entrada no puede salir de ella, contener
segmentos `..` ni atravesar enlaces simbólicos. Los archivos tienen límites de
tamaño y se comprueban antes, durante y después de la lectura.

## Snapshot activable

Un archivo activable usa el sobre versionado
`pecadosvip.runtime-content-snapshot` v1:

```json
{
  "schema": "pecadosvip.runtime-content-snapshot",
  "version": 1,
  "purpose": "runtime-activation",
  "productionActivation": true,
  "evidence": {
    "releaseId": "IDENTIFICADOR_REAL_DEL_RELEASE",
    "approvedBy": "APROBADOR_REAL",
    "approvedAt": "FECHA_RFC3339_REAL",
    "sourceReference": "REFERENCIA_REAL_DE_APROBACION"
  },
  "snapshot": {
    "cities": [],
    "profiles": [],
    "services": [],
    "settings": {}
  }
}
```

El ejemplo muestra la forma del sobre, no contenido válido: no debe copiarse
con valores de ejemplo. `snapshot` debe ser un `ContentSnapshot` completo. Para
activarlo deben coincidir los dos controles siguientes:

1. el sobre declara `productionActivation: true` y contiene evidencia de
   aprobación no vacía con fecha RFC 3339;
2. el operador define explícitamente
   `PECADOSVIP_RUNTIME_CONTENT_ACTIVATION=true`.

Además, el snapshot debe pasar el esquema estricto, la validación de borrador y
el gate agregado de release: siete ciudades publicadas, al menos ocho perfiles,
origen HTTPS, contacto, analítica, legales y evidencias de aprobación, mayoría
de edad, consentimiento y derechos. Los medios locales de preview o pruebas se
rechazan aunque el validador general acepte una URL relativa.

## Candidato de revisión local

`PECADOSVIP_RUNTIME_CONTENT_SOURCE` también puede apuntar al directorio de un
candidato exportado con `manifest.json` y `payload/content.json`. El adaptador
verifica esquema, tamaño y SHA-256, pero responde
`CANDIDATE_LOCAL_REVIEW_ONLY` y conserva el borrador. Es obligatorio porque el
candidato actual declara `productionActivation: false` y omite deliberadamente
aprobadores y evidencias internas; convertirlo en release exigiría inventar o
eludir esos datos.

## Observabilidad

`getRuntimeContentResolution()` devuelve el snapshot efectivo junto con
`activation`. `getRuntimePublicationState()` expone la misma decisión junto al
gate y el manifiesto. La evidencia observable incluye:

- `status`: `default-draft`, `blocked` o `activated`;
- `reasonCode`: causa estable de la decisión;
- tipo, esquema, ruta y SHA-256 de la fuente cuando pudieron comprobarse;
- evidencia declarada del release para snapshots válidos;
- códigos de validación y bloqueadores de release.

Estas funciones no crean un endpoint público ni registran el contenido. La
observabilidad debe conectarse en infraestructura futura a logs protegidos, sin
exponer rutas locales o referencias de aprobación al navegador.
