# Mi Hoja de Vida

Este repositorio es el código fuente de mi hoja de vida, la cual se encuentra desplegada en [SANMOSSA](sanmossa.org).

## Fuente de datos

El archivo que se debe actualizar para modificar la información del resumen es:

- `data/resume.json`

Ese archivo es la fuente principal de los datos. A partir de `data/resume.json` se genera `data/resume.yaml`, que luego se usa para producir la versión exportable del CV con RenderCV.

En consecuencia:

- para cambiar valores, textos, experiencia, habilidades o cualquier otro dato, se debe editar `data/resume.json`
- `data/resume.yaml` no debe tratarse como la fuente principal de verdad
