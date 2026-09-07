# Especificación de medición — PecadosVip Web

Estado: diseño técnico no operativo. No hay proveedor seleccionado, credenciales, CMP, consentimiento aprobado ni autorización para recopilar datos.

## Principios

- Analítica deshabilitada por defecto.
- Ningún script no esencial se carga mientras el consentimiento sea desconocido o denegado.
- Retirar consentimiento detiene nuevos eventos no esenciales y ofrece el mecanismo de revocación definido por el proveedor.
- No enviar nombres de perfiles, IDs internos, edad, medidas, URLs de medios, mensajes, teléfono, correo, dirección, ubicación exacta ni referencias de evidencia.
- No usar contenido de perfiles o contacto para audiencias, publicidad comportamental o enriquecimiento.
- Documentar finalidad, base jurídica, proveedor, transferencias, retención, acceso y eliminación antes de activar.

La implementación final deberá alinearse con la [guía de cookies de la AEPD](https://www.aepd.es/recurso-multimedia/guia-sobre-el-uso-de-las-cookies) y ser revisada por el responsable legal.

## Estados de consentimiento

| Estado | Comportamiento |
|---|---|
| `unknown` | Solo funcionamiento esencial; cero analítica |
| `denied` | Cero analítica; conservar solo la preferencia técnica mínima autorizada |
| `granted` | Activar únicamente el proveedor y finalidades aprobados |
| `withdrawn` | Detener eventos posteriores y ejecutar el procedimiento documentado de revocación |

`analyticsEnabled` y `consentState` son gates técnicos; solo el estado explícito `granted` permite construir un evento. No sustituyen el consentimiento real del visitante ni la configuración legal.

## Taxonomía mínima de eventos

| Evento | Momento | Propiedades permitidas |
|---|---|---|
| `view_city` | Render de una ciudad publicable | `city_slug`, `locale` |
| `view_profile_list` | Render del catálogo publicable | `city_slug`, `result_bucket`, `page` |
| `filter_profiles` | Aplicación de filtros válidos | nombres de filtros, no sus valores sensibles; `result_bucket` |
| `view_profile` | Render de una ficha publicable | `city_slug`; no se emite identificador de perfil |
| `contact_intent` | Clic en un canal aprobado | `channel`, `surface`, `city_slug` |
| `contact_submit` | Envío aceptado por el endpoint | `surface`, `city_slug`; nunca campos del formulario |
| `contact_error` | Fallo visible del envío | código técnico allowlist, sin payload ni stack |

Los cambios de consentimiento permanecen en el registro esencial del CMP y no se emiten como eventos de analítica.

`result_bucket` usa rangos (`0`, `1–5`, `6–20`, `21+`) para evitar telemetría granular. El contrato actual omite por completo IDs de perfil.

## Conversión y calidad

Funnel principal: `view_city → view_profile_list → view_profile → contact_intent → contact_submit`.

Indicadores permitidos tras aprobación:

- Tasa de listado a ficha.
- Tasa de ficha a intención de contacto.
- Tasa de envío técnico aceptado, sin atribuir contratación o ingreso.
- Errores de contacto por código allowlist.
- Rendimiento web agregado por ruta, sin datos personales.

No se inferirá una reserva, venta o prestación real a partir de un clic o un envío técnico.

## Integración y seguridad

1. El CMP resuelve consentimiento antes de cargar el SDK.
2. `buildAnalyticsEvent` aplica una allowlist runtime de eventos y propiedades antes de cualquier SDK.
3. Producción rechaza propiedades desconocidas y valores fuera de catálogo.
4. Logs operativos y analítica se mantienen separados.
5. Formularios eliminan contenido y datos de contacto de telemetría, URLs y mensajes de error.
6. Se define CSP, endpoint regional, retención mínima, roles de acceso y DPA antes de activar.
7. Preview, admin, health checks y tráfico automatizado se excluyen de métricas de negocio.

## Criterios de aceptación

- Con consentimiento `unknown`, `denied` o `withdrawn`, una captura de red demuestra cero solicitudes no esenciales.
- Con `granted`, solo aparecen eventos y propiedades allowlist.
- Pruebas automatizadas impiden enviar PII, contenido de perfil o payloads de contacto.
- El cambio y la revocación de consentimiento funcionan por teclado y móvil.
- La política visible coincide con proveedor, finalidades, retención y transferencias configuradas.
- Luis y el responsable legal aprueban por escrito proveedor, finalidades y activación.
