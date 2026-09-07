# Prompts de imágenes derivadas — v1

Este registro documenta las portadas y galerías candidatas de los seis perfiles ficticios adultos del preview local. Las 24 imágenes fueron generadas con la herramienta integrada `image_gen` el 28 de agosto de 2026 UTC. No representan personas, disponibilidad ni servicios reales, y no autorizan publicación.

## Matriz generada

Cada perfil contiene una portada y tres imágenes de galería, todas verticales 3:4:

- `cover`: tarjeta editorial, encuadre de cabeza a medio muslo.
- `gallery-01`: retrato cercano de pecho hacia arriba.
- `gallery-02`: retrato sentado de cabeza a rodillas.
- `gallery-03`: retrato de pie de cabeza a media pantorrilla o cuerpo casi completo.

Estado de esta versión: `synthetic_confirmed=YES`, `human_review=PENDING` y `legal_review=PENDING`. El preflight visual de IA no sustituye la aprobación humana ni la revisión legal.

La primera generación `alicia-gallery-02-v01.png` quedó en 1085×1450 y fue descartada por no cumplir 3:4 exacto. Se conserva como evidencia versionada; `alicia-gallery-02-v02.png` es la candidata activa y sí mide 1086×1448.

## Referencia de identidad obligatoria

Para cada ejecución debe adjuntarse únicamente la maestra del mismo perfil:

| Perfil | Referencia única |
| --- | --- |
| Valeria | `valeria/master/valeria-master-v01.png` |
| Sofía | `sofia/master/sofia-master-v01.jpg` |
| Lucía | `lucia/master/lucia-master-v01.png` |
| Julia | `julia/master/julia-master-v01.png` |
| Mia | `mia/master/mia-master-v01.png` |
| Alicia | `alicia/master/alicia-master-v01.jpg` |

No deben adjuntarse referencias de otras personas, otras maestras ni composiciones de marca que contengan rostros. En Gemini/Nano Banana 2, cargar primero una sola maestra y luego aplicar el prompt correspondiente sustituyendo `{profile_slug}`.

## Portada

```text
Use case: identity-preserve. Create a vertical profile-card cover for the fictional adult synthetic profile "{profile_slug}". The supplied master portrait is the sole identity reference. Preserve the exact same adult woman's facial identity, apparent age, skin tone and texture, eye shape and color, nose, lips, jawline, hairline, hair color and texture, and natural body proportions. Do not blend or replace her identity. Produce a pseudorealistic premium editorial portrait in exact vertical 3:4 composition, framed from head to mid-thigh, face in the upper third, calm confident expression and a new natural pose. Anonymous upscale boutique-hotel interior with charcoal-black surfaces, warm amber side light, dark wood and restrained brushed-brass accents. Elegant fully opaque black wardrobe with a modest neckline and minimal refined gold accessories. Natural pores and realistic photographic detail, cinematic but plausible light. She is unmistakably an adult. Non-explicit, no nudity, no lingerie, no transparent fabric, no suggestive pose, no text, no logo, no watermark, no signature, no other people, no duplicated features, no extra limbs or fingers, no distorted hands. Change only pose, framing, background and minor wardrobe details; keep the identity fixed.
```

## Galería 01 — retrato cercano

```text
Use case: identity-preserve. Create gallery image 01 for the fictional adult synthetic profile "{profile_slug}". The supplied master portrait is the sole identity reference. Preserve the exact same adult woman's facial identity, apparent age, skin tone and texture, eye shape and color, nose, lips, jawline, hairline, hair color and texture, and natural body proportions. Do not blend or replace her identity. Produce a pseudorealistic premium editorial chest-up portrait in exact vertical 3:4 composition, gaze slightly off camera, calm confident expression, shoulders relaxed. Place her in an anonymous upscale boutique-hotel interior with charcoal-black background, subtle amber side light and restrained brushed-brass bokeh. Use an elegant fully opaque black outfit with a high or modest neckline and minimal refined gold accessories. Natural pores and realistic photographic detail; 85 mm lens feeling, shallow depth of field, cinematic but plausible light. She is unmistakably an adult. Non-explicit, no nudity, no lingerie, no transparent fabric, no suggestive pose, no text, no logo, no watermark, no signature, no other people, no duplicated features, no extra limbs or fingers, no distorted hands. This must be a new pose and framing, not a copy of the master.
```

## Galería 02 — sentada

```text
Use case: identity-preserve. Create gallery image 02 for the fictional adult synthetic profile "{profile_slug}". The supplied master portrait is the sole identity reference. Preserve the exact same adult woman's facial identity, apparent age, skin tone and texture, eye shape and color, nose, lips, jawline, hairline, hair color and texture, and natural body proportions. Do not blend or replace her identity. Produce a pseudorealistic premium editorial portrait in exact vertical 3:4 composition, seated naturally in a dark charcoal lounge chair, framed from head to knees, torso turned slightly three-quarter toward camera, calm confident expression. Both hands should be naturally visible and anatomically plausible, one resting loosely on the chair arm and the other on her knee, with five realistic fingers per visible hand. Anonymous upscale boutique-hotel lounge, black stone, dark wood, warm amber lamp and restrained brushed-brass accents. Elegant fully opaque black tailored outfit with a modest neckline and subtle refined gold accessory; non-transparent fabric. Natural pores and photographic detail, 50 mm lens feeling, cinematic but plausible lighting. She is unmistakably an adult. Non-explicit, no nudity, no lingerie, no transparent fabric, no suggestive pose, no text, no logo, no watermark, no signature, no other people, no duplicated features, no extra limbs or fingers, no distorted hands. This must be a new pose and framing, not a copy of the master or other variants.
```

## Galería 03 — de pie

```text
Use case: identity-preserve. Create gallery image 03 for the fictional adult synthetic profile "{profile_slug}". The supplied master portrait is the sole identity reference. Preserve the exact same adult woman's facial identity, apparent age, skin tone and texture, eye shape and color, nose, lips, jawline, hairline, hair color and texture, and natural body proportions. Do not blend or replace her identity. Produce a pseudorealistic premium editorial portrait in exact vertical 3:4 composition, standing in a relaxed three-quarter pose, framed head to mid-calf, calm confident expression, gaze toward camera. Place one hand naturally at her side and the other resting lightly on a dark stone console; every visible hand must be anatomically plausible with five realistic fingers. Anonymous upscale boutique-hotel corridor with charcoal wall panels, dark wood, soft amber architectural light and restrained brushed-brass lines. Elegant fully opaque black tailored midi dress or trouser suit with a modest neckline, non-transparent fabric and subtle refined gold accessory. Natural pores and photographic detail, 50 mm lens feeling, cinematic but plausible lighting. She is unmistakably an adult. Non-explicit, no nudity, no lingerie, no transparent fabric, no suggestive pose, no text, no logo, no watermark, no signature, no other people, no duplicated features, no extra limbs or fingers, no distorted hands. This must be a new pose and framing, not a copy of the master or other variants.
```

## Criterios de aceptación

Antes de promover cualquier archivo a `public/`, verificar por perfil:

1. Mismo rostro, edad aparente, tono de piel, cabello y proporciones que la maestra.
2. Persona inequívocamente adulta y vestuario opaco, no explícito.
3. Anatomía y manos plausibles, sin duplicaciones ni artefactos.
4. Sin texto, logotipos, marcas, lugares identificables ni otras personas.
5. Proporción exacta 3:4 y archivo íntegro.
6. Aprobación humana documentada; la revisión legal permanece como gate separado.

Hasta superar esos gates, conservar las imágenes únicamente como candidatos versionados en `assets/` y dejar `public_path` vacío en `ASSET_MANIFEST.csv`.
