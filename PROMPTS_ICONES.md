# Icones de «Gestor de notes» (PWA Android i iOS)

Totes viuen a la carpeta `icons/` (ja no a l'arrel). Ara hi ha **provisionals**: substitueix-los amb els teus mantenint exactament el nom, l'extensió i la mida.

| Fitxer | Mida | Format | Per a què | Notes |
|---|---|---|---|---|
| `icons/icon-512.png` | 512×512 | PNG | Android / instal·lació (`any`) | Fons opac o transparent, motiu centrat |
| `icons/icon-192.png` | 192×192 | PNG | Android / instal·lació (`any`) | Mateix disseny que el 512 |
| `icons/icon-maskable-512.png` | 512×512 | PNG | Android adaptatiu (`maskable`) | Fons a sang fins a les vores; motiu dins el 60% central |
| `icons/icon-maskable-192.png` | 192×192 | PNG | Android adaptatiu | Igual que el maskable 512 |
| `icons/apple-touch-icon.png` | 180×180 | PNG | iPhone/iPad («Afegeix a la pantalla d'inici») | **Sense transparència i sense cantonades arrodonides** (iOS les arrodoneix) |
| `icons/favicon-32.png` | 32×32 | PNG | Pestanya del navegador | Versió molt simple |
| `icons/favicon-16.png` | 16×16 | PNG | Pestanya del navegador | Versió molt simple |
| `favicon.ico` (arrel) | 48×48 | ICO | Navegadors antics | Es queda a l'arrel |

Recomanat: genera **una sola imatge mestra de 1024×1024** i d'ella treu totes les altres (mateix disseny, així sempre coincideixen).

## Estil comú
Paleta de l'app: violeta `#4f2fe0` (principal), violeta fosc `#2d1b8f`, blau `#3b5bdb`, blanc, tocs de groc `#ffc83d`. Estil pla, net i modern, vores suaus. Sense text ni lletres, sense marc, sense ombres exteriors.

## Prompt 1 — imatge mestra «any» (1024×1024)
> App icon for an education grading app called "Gestor de notes". A white graduation cap (mortarboard) with a small golden tassel, with a bold white check mark integrated into the front of the cap, centered on a smooth rounded-square-ready background gradient from vivid violet #4f2fe0 to deep indigo #2d1b8f. Flat modern vector style, soft subtle highlights, clean geometry, generous padding around the symbol (symbol fills about 60% of the canvas), full square canvas 1024x1024, no text, no letters, no border, no drop shadow, no transparency.

→ Redimensiona a `icon-512.png` (512) i `icon-192.png` (192).

## Prompt 2 — versió «maskable» (1024×1024)
> Same app icon as before (white graduation cap with golden tassel and white check mark) but with the violet-to-indigo gradient background extending fully to all four edges of the square, and the symbol much smaller and perfectly centered, occupying only the central 55% of the canvas so nothing important is near the edges. Flat vector style, no text, no border, no shadow, no transparency, 1024x1024.

→ Redimensiona a `icon-maskable-512.png` i `icon-maskable-192.png`.

## Prompt 3 — iOS (`apple-touch-icon.png`, 180×180)
> Same app icon (white graduation cap with golden tassel and white check mark) on a solid full-bleed violet-to-indigo gradient square background, symbol centered occupying about 65% of the canvas, perfectly square corners (no rounded corners), no transparency, no text, flat vector style, 1024x1024.

→ Redimensiona a 180×180.

## Prompt 4 — favicon (`favicon-32.png`, `favicon-16.png`)
> Ultra-simplified favicon: a bold white graduation cap silhouette on a solid violet #4f2fe0 rounded square, very high contrast, only 2 colors, no fine details, no text, 1024x1024.

→ Redimensiona a 32×32 i 16×16 (i, si vols, genera un `favicon.ico` de 48×48 per a l'arrel).

## Com redimensionar (Python)
```bash
pip install pillow
python3 -c "
from PIL import Image
def r(src,out,s): Image.open(src).convert('RGBA').resize((s,s),Image.LANCZOS).save(out)
r('mestra.png','icons/icon-512.png',512); r('mestra.png','icons/icon-192.png',192)
r('maskable.png','icons/icon-maskable-512.png',512); r('maskable.png','icons/icon-maskable-192.png',192)
Image.open('ios.png').convert('RGB').resize((180,180),Image.LANCZOS).save('icons/apple-touch-icon.png')
r('favicon.png','icons/favicon-32.png',32); r('favicon.png','icons/favicon-16.png',16)
"
```
Comprova les maskable a https://maskable.app/editor abans de publicar.

## Què he canviat al projecte
- `manifest.json`: nom «Gestor de notes», color violet, 4 icones (2 `any` + 2 `maskable`, separades perquè Android no les deformi).
- `index.html`: títol, `apple-touch-icon` (180), favicons i color del tema.
- `sw.js`: icones noves a la caché.
- **Cal esborrar de l'arrel** `icon-192.png` i `icon-512.png` (ja no s'usen).
