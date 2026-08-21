# Rediseño móvil pastel — mockups de Stitch

Mockups generados con **Google Stitch** vía su MCP (`https://stitch.googleapis.com/mcp`) para el
rediseño *light mode pastel, mobile-first* de la app **Mi Peso** (`apps/app`).

> ⚠️ **Estos HTML son mockups estáticos con datos inventados. No se copian al proyecto.**
> De ellos se extraen tokens y decisiones de diseño, nunca markup literal.

## Identificadores

| Recurso | Id |
|---|---|
| Proyecto Stitch | `projects/3606284679890689992` |
| Design system | `assets/3659436324304764439` (v1) — "Mi Peso — Pastel Sereno (Light, Mobile)" |
| Modelo | `GEMINI_3_1_PRO` |
| Device type | `MOBILE` (390×844) |

### Pantallas

| Archivo | Screen id | Título |
|---|---|---|
| `01-registro.html` / `.png` | `340bbe3d9f714f04b919e81fd85d27de` | Registro de Peso |
| `02-calendario.html` / `.png` | `4632e94260324856bb0462a0b3270bb5` | Calendario de Peso |
| `03-progreso.html` / `.png` | `331f0f61d1bd4fb3a81cd54f6597d8c4` | Progreso de Peso |
| `04-ajustes.html` / `.png` | `16b5af32671c4ffdafa70eabe7e62b8e` | Ajustes de Mi Peso |

## Tokens del design system (la salida que sí se integra)

```
fondo         #FDFCFB   superficie   #FFFFFF   superficie-2 #F6F4F1   borde #EAE6E1
tinta         #2B2A28   tinta-2      #5C574F   tinta-3      #7A756E
acento        #5B76C6   acento-pastel #8FA6DC  acento-suave #EDF1FA
verde  fondo  #DDEEE4   tinta #356E51   punto #7FBF9B
ámbar  fondo  #F7EBD6   tinta #7A5A18   punto #E8C07D
coral  fondo  #F8E3E3   tinta #A34848   punto #E88C8C
sin    fondo  #F0EDE9   tinta #8A857D   punto #DDD8D1

radio tarjeta 16px · radio control 12px · chips 999px
sombra   0 1px 2px rgba(43,42,40,.04), 0 8px 24px -12px rgba(43,42,40,.10)
foco     0 0 0 3px rgba(91,118,198,.28)
tipografía Plus Jakarta Sans · font-variant-numeric: tabular-nums en TODAS las cifras
```

**Regla de contraste:** cada color semántico es un *par*. El pastel es solo fondo; el texto encima
usa siempre la versión tinta (≥4.5:1). Nunca texto blanco ni texto del propio pastel sobre pastel.

## Cómo iterar

```jsonc
// mcp__stitch__edit_screens
{
  "projectId": "3606284679890689992",
  "selectedScreenIds": ["331f0f61d1bd4fb3a81cd54f6597d8c4"],
  "deviceType": "MOBILE",
  "modelId": "GEMINI_3_1_PRO",
  "prompt": "…qué cambiar, en español, siendo explícito con los hex…"
}
```

Para una pantalla nueva: `generate_screen_from_text` con
`designSystem: "assets/3659436324304764439"`, `deviceType: "MOBILE"`, `modelId: "GEMINI_3_1_PRO"`,
prependiendo siempre el bloque común (contexto de producto + header pegajoso + bottom tab bar +
reglas de adaptación móvil) antes de la descripción de la pantalla.

### Incidencias conocidas del MCP

- `generate_screen_from_text` **excede el timeout del transporte** con frecuencia. La generación
  sigue en servidor: no reintentar a ciegas, la pantalla suele existir ya.
- `list_screens` devuelve `{}` aunque el proyecto tenga pantallas. Los ids hay que tomarlos de la
  respuesta de `generate_screen_from_text` / `edit_screens`.
- `edit_screens` sobre `03-progreso` reportó éxito pero **no se propagó al HTML servido**.
- Stitch emitió la clase `opacity-12`, que **no existe en Tailwind** (solo `opacity-10`/`opacity-20`),
  por lo que la banda del rango ideal se renderizó verde sólido saturado. Corregido a mano en
  `03-progreso.html` con `style="opacity:.12"`. El valor correcto del token es **12 %**.
- Las capturas se descargan a mayor resolución añadiendo `=s2400` a la URL de `lh3.googleusercontent.com`.

## Contraste: los valores del design system eran optimistas

El `designMd` afirmaba ratios que **no se cumplían al medirlos en la app real**. Se midió cada par
texto/fondo con `getComputedStyle` en las cuatro pantallas y en los dos temas. Correcciones aplicadas
sobre los tokens propuestos por Stitch:

| Token | Stitch proponía | Integrado | Motivo |
|---|---|---|---|
| `--acento` (light) | `#5B76C6` (decía 4.9:1) | `#4F6AB8` | medido 4.33:1 con blanco → **fallaba AA**; ahora 5.14:1 |
| `--tinta-3` (light) | `#7A756E` (decía 4.9:1) | `#736E67` | medido 4.46:1 sobre `#FDFCFB` y 4.16:1 sobre `#F6F4F1`; ahora 4.93 / 4.60 |
| `--tinta-3` (dark) | — | `#979289` | 4.42:1 sobre `#2A282E`; ahora 4.71:1 |
| botón destructivo | `#E88C8C` + texto blanco | `--peligro-solido: #A34848` | blanco sobre coral ≈2.4:1, **muy por debajo de AA**; ahora 5.87:1 |
| botón primario en dark | acento pastel + texto blanco | `--sobre-acento: #1B2338` | blanco sobre `#A3B6E8` ≈2:1; ahora 7.75:1 |

Lección para futuras iteraciones: los ratios que el modelo escribe en el `designMd` son **afirmaciones,
no mediciones**. Hay que verificarlos sobre la app renderizada antes de dar el tema por bueno.

Capturas de la app ya integrada (390×844, headless Chrome): `integrado/`.

## Qué se integra y qué no

### Sí se integra
1. **Capa de tokens** → `apps/app/src/index.css` (`:root`): paleta pastel, radios, sombras, foco,
   escala tipográfica, `tabular-nums`.
2. **Re-skin de componentes** sobre los **mismos nombres de clase** ya existentes → cero cambios
   en el TSX que los genera.
3. **Markup quirúrgico** donde el diseño móvil lo exige: header pegajoso, "Últimos registros" como
   tarjetas en vez de filas, tab bar con iconos SVG de línea, estados vacíos.
4. La regla del par pastel/tinta para las tres zonas de IMC + "sin registro".

### No se integra
- El HTML/Tailwind de los mockups (usan CDN y clases arbitrarias; el proyecto no usa Tailwind).
- Los datos de las pantallas: **todos inventados**. Los reales salen de SQLite local.
- La pill "Solo en este equipo" es una propuesta del rediseño, no un componente preexistente.
- El estado vacío de Progreso que se pidió en el prompt nunca llegó al mockup servido.
