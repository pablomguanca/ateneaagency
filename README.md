# Atenea Agency — Contexto del proyecto

## Qué es esto
Sitio web oficial de **Atenea Agency**, agencia de marketing digital de Buenos Aires fundada por dos socios que
trabajan en equipo sobre cada proyecto:
- **Carolina**: Community Management, Meta Ads, Google Ads
- **Pablo**: Desarrollo web y programación

**Posicionamiento (importante):** el sitio está enfocado en **real estate** — desarrollos en pozo e
inmobiliarias. No volver al mensaje genérico de "profesionales, pymes y emprendedores": ese fue el
posicionamiento original y quedó atrás.

### Reglas duras de contenido
1. **Sin paquetes ni precios.** Nada de tablas Starter/Estándar/Premium, montos en USD ni rangos. El alcance y la
   inversión se definen después del diagnóstico inicial.
2. **El CTA siempre es el diagnóstico** ("Solicitá tu diagnóstico"), nunca una lista de precios.
   **Terminología:** "diagnóstico" y "auditoría" no son dos ofertas distintas — la auditoría es el trabajo
   (revisar qué hay hoy) y el diagnóstico es el resultado que recibe el cliente. En todo el sitio, la **oferta
   se llama siempre "diagnóstico"**; "auditamos" aparece solo como el paso 2 del método. No mezclarlos como si
   fueran dos etapas que se contratan por separado.
3. **No inventar** clientes, testimonios, casos de éxito, métricas ni datos de contacto. Si falta un dato, va un
   placeholder marcado con `TODO` (ver sección "Pendientes").
4. El diferencial que comunica el sitio no es la lista de servicios sino el **servicio integral**: análisis del
   proyecto → auditoría de la presencia digital → estrategia → acompañamiento de punta a punta.
5. **Las tarjetas de servicio de `index.html` no llevan CTA propio** (nada de "Ver servicio" / "Quiero este
   servicio"). Es a propósito: la oferta es una propuesta integral armada sobre lo que el proyecto necesita, no
   un menú de piezas sueltas para elegir de a una. El llamado a la acción vive a nivel de página (el bloque
   final "Solicitá tu diagnóstico"), no por servicio.

### Servicios que ofrece la agencia
Desarrollo web a medida · Landing pages de captación · Gestión de redes sociales (Instagram, Facebook, TikTok) ·
Campañas de pauta (Meta Ads, Google Ads) · Email marketing y nutrición de leads · Identidad de marca y diseño.
Los tours 360° se tercerizan con profesionales de confianza.

### Clientes y casos: NO publicar
**El sitio no menciona ningún cliente ni caso de éxito, y así debe quedar por ahora.** Existe un cliente real del
rubro (un desarrollo en pozo), pero la relación es demasiado reciente como para presentarla públicamente como
caso, así que **no debe aparecer su nombre, el del desarrollo, la desarrolladora, el barrio ni detalles que lo
identifiquen** en ninguna página. Tampoco inventar otros clientes, testimonios ni métricas.

La especialización en real estate se argumenta por las características del sector (ciclo de decisión largo,
producto que no se puede visitar, brecha digital del rubro), no por casos concretos — ver la sección
"Nuestra especialización" en `nosotros.html`.

---

## Stack
- **HTML5** semántico con aria-labels
- **SASS** (compilado a `css/styles.css`) — nunca editar el CSS directamente
- **JavaScript vanilla** — sin frameworks
- **Google Fonts**: Cormorant Garamond + DM Sans

Compilar SASS:
```bash
sass --watch scss/main.scss css/styles.css
```

---

## Estructura de archivos

```
atenea-agency/
├── index.html
├── servicios.html
├── nosotros.html
├── contacto.html
├── 404.html
├── diagnostico.html        ← landing de campaña (noindex, sin nav)
├── robots.txt
├── sitemap.xml
├── vercel.json             ← config de deploy (headers, redirect www)
├── .vercelignore
├── css/styles.css          ← compilado, no editar
├── scss/
│   ├── main.scss         ← entry point
│   ├── abstracts/
│   │   ├── _variables.scss
│   │   └── _mixins.scss
│   ├── base/
│   │   ├── _reset.scss
│   │   ├── _typography.scss
│   │   └── _animations.scss
│   ├── components/
│   │   ├── _cursor.scss
│   │   ├── _parallax.scss
│   │   ├── _buttons.scss
│   │   ├── _navbar.scss
│   │   ├── _cards.scss
│   │   ├── _whatsapp.scss
│   │   ├── _page-hero.scss
│   │   ├── _split.scss    ← bloque imagen + texto (reutilizado en home, servicios y nosotros)
│   │   ├── _forms.scss    ← inputs, labels y validación (home y contacto)
│   │   └── _process.scss  ← los 4 pasos (reutilizado en home y servicios)
│   ├── layout/
│   │   ├── _hero.scss
│   │   └── _sections.scss
│   └── pages/
│       ├── _nosotros.scss
│       ├── _contacto.scss
│       └── _landing.scss
├── js/
│   └── main.js
└── assets/
    └── img/
        ├── placeholder.svg
        ├── favicon.svg
        └── og-image.svg
```

---

## Paleta de colores

| Variable SASS          | Valor       | Uso                          |
|------------------------|-------------|------------------------------|
| `$color-dark`          | `#06060A`   | Fondo principal              |
| `$color-dark-2`        | `#0E0E18`   | Fondo de servicios strip     |
| `$color-dark-surface`  | `#1A1A2E`   | Superficies alternativas     |
| `$color-gold`          | `#C9A84C`   | Acento principal (dorado)    |
| `$color-gold-bright`   | `#E8C97A`   | Hover de dorado              |
| `$color-ivory`         | `#F0EBE0`   | Texto principal              |
| `$color-ivory-dim`     | `#9E9688`   | Texto secundario / muted     |
| `$color-whatsapp`      | `#25D366`   | Botón WhatsApp               |

---

## Tipografía

- **Títulos / Display**: `Cormorant Garamond` (serif) — pesos 300, 700, 700 italic
- **Cuerpo / UI**: `DM Sans` (sans-serif) — pesos 300, 400, 500

---

## Estándares de código (OBLIGATORIOS)

1. **Mobile-first**: usar `@include m.below-md` para romper hacia abajo; `@include m.md` para escalar hacia arriba
2. **BEM estricto**: `.bloque__elemento--modificador`
3. **Sin comentarios inline** en archivos de entrega final
4. **Separación total**: sin CSS en JS, sin lógica en HTML, sin estilos inline (salvo animaciones SVG)
5. **Sin frameworks CSS**: todo custom en SASS
6. **Cursor none** en body y botones (hay cursor personalizado en JS)
7. **Aria-labels** en todos los elementos interactivos y secciones
8. **Sin `!important`** salvo casos muy excepcionales justificados

---

## Mixins disponibles (abstracts/_mixins.scss)

```scss
@include m.sm          // min-width: 600px
@include m.md          // min-width: 900px
@include m.lg          // min-width: 1024px
@include m.xl          // min-width: 1280px
@include m.below-md    // max-width: 899px
@include m.below-sm    // max-width: 599px
@include m.eyebrow     // label con líneas doradas
@include m.gold-rule   // hr dorado
@include m.gold-border-top
@include m.gold-border-bottom
@include m.hover-underline($color)
@include m.flex-center
@include m.label-text  // uppercase tracking text
```

---

## Clases JS importantes

| Clase       | Descripción                                  |
|-------------|----------------------------------------------|
| `.reveal`   | Scroll reveal — se activa con `.on`          |
| `.stuck`    | Navbar compacta al hacer scroll              |
| `.open`     | Estado abierto del hamburger y mobile menu   |
| `.js-contact-form` | Marca un formulario para que lo maneje main.js |
| `.js-form-status`  | Párrafo donde se escribe la respuesta del envío |
| `.was-validated`   | Se agrega al intentar enviar: recién ahí se marcan en rojo los campos inválidos |

---

## IDs importantes (usados en main.js)

| ID          | Elemento                    |
|-------------|-----------------------------|
| `cursor`    | Punto del cursor            |
| `cursorRing`| Anillo del cursor           |
| `nav`       | Navbar principal            |
| `ham`       | Botón hamburger             |
| `mob`       | Mobile menu                 |
| `layer1`    | Capa parallax lenta         |
| `layer2`    | Capa parallax rápida        |

---

## Páginas

- `index.html` — hero real estate → por qué real estate (la brecha del mercado) → **los 6 servicios con su
  detalle** en stack sticky → cómo trabajamos (4 pasos) → quiénes somos → bloque final con formulario corto
- `servicios.html` — el **enfoque**, no un catálogo: el bloque de servicio integral (con la enumeración de los 6
  frentes) + el proceso de trabajo + CTA
- `nosotros.html` — por qué Atenea, por qué la especialización en real estate, 4 principios, equipo (Carolina y Pablo)
- `contacto.html` — formulario accesible + datos de contacto + WhatsApp
- `404.html` — página de error
- `diagnostico.html` — **landing de campaña** (ver abajo)

### Landings de campaña

`diagnostico.html` es una landing pensada para recibir tráfico **pago** (Meta / Google Ads) cuando la agencia
sale a buscar clientes. Se diferencia del resto del sitio a propósito:

- **Sin navbar ni menú**: un solo objetivo, que dejen los datos. No hay links que fuguen el tráfico salvo el
  ancla al formulario.
- **`noindex, follow`**: no debe indexarse ni competir en Google con la home, que apunta a las mismas
  keywords. Por eso tampoco está en `sitemap.xml`. No bloquearla en `robots.txt`: si Google no puede
  rastrearla, no llega a leer el `noindex`.
- **Formulario arriba de todo**, visible sin scrollear, con un campo menos que el de contacto (el mensaje es
  opcional) para bajar la fricción.

Cuando lancen campañas para un desarrollo de un cliente, la landing correcta es otra —una por proyecto, con la
marca de ese desarrollo—, no esta. Esta es para captar clientes de Atenea.

### Formularios

Hay **dos**, y cumplen funciones distintas a propósito (no son duplicados):

- **Corto**, en el bloque final de `index.html`: nombre, email/teléfono y mensaje. Captura de baja fricción para
  el tráfico que cae en la home, sobre todo el que viene de pauta.
- **Completo**, en `contacto.html`: suma tipo de proyecto y servicio de interés, para quien quiere dar contexto.

Ambos los maneja **el mismo código** en `js/main.js`: la lógica recorre todos los `.js-contact-form`, así que para
sumar otro formulario alcanza con darle esa clase, un `.js-form-status` donde escribir la respuesta y un
`<button type="submit">` con un `<span>` adentro. Hoy validan en el cliente y **simulan** el envío; para
conectarlos a un backend real hay que reemplazar el `setTimeout` por un `fetch` a un endpoint propio, Formspree
o EmailJS.

## Pendientes (buscar `TODO` en el repo)

Todo lo que falta está marcado con un comentario `TODO` en el HTML. Antes de publicar:

- **WhatsApp**: `5491100000000` es un número inventado. Aparece en el enlace flotante de `index`, `servicios`,
  `nosotros` y `contacto`, y en la lista de contacto de `contacto.html`.
- **Email**: `hola@ateneaagency.com.ar` — confirmar que la casilla exista antes de publicarla.
- **Instagram**: en `contacto.html` figura como `TODO: completar`; falta el usuario real y convertirlo en enlace.
- **Imágenes propias**: landing pages e identidad de marca (en `index.html` y `servicios.html`), la foto del
  bloque de especialización y las fotos de Carolina y Pablo (en `nosotros.html`) usan `assets/img/placeholder.svg`.

`assets/img/placeholder.svg` es el placeholder visual de marca (dorado/oscuro). Reemplazar el `src` por la imagen
real cuando esté disponible; las dimensiones y el `object-fit: cover` del contenedor ya están listos.

---

## SEO, favicon y redes sociales

- **Favicon**: `assets/img/logo/favicon.svg` (481 bytes), linkeado con `<link rel="icon">` en las 6 páginas.
  Es un **SVG vectorial** dibujado a mano, no el logo exportado: a 16px (el tamaño real en la pestaña) el casco,
  el degradado y las líneas de circuito del logo se funden en una mancha. Conserva los dos elementos que sí se
  leen en miniatura — la "A" y el nodo central — en dorado `$color-gold` sobre fondo oscuro, para que se
  distinga tanto en pestañas claras como oscuras. **No reemplazar por el logo completo exportado a PNG**: pesaba
  ~600 KB y se veía borroso.
  Pendiente opcional: un `apple-touch-icon` de 180×180 en PNG para el ícono de iOS al agregar a pantalla de
  inicio (requiere exportar un PNG, el SVG no sirve para eso).
- **Open Graph / Twitter Card**: cada página define `og:title`, `og:description`, `og:image`, `og:url`, etc.
  Todas apuntan a `https://ateneaagency.com.ar/` — si el dominio final cambia, buscar y reemplazar
  `ateneaagency.com.ar` en `index.html`, `servicios.html`, `nosotros.html`, `contacto.html`, `sitemap.xml`,
  `robots.txt` y `vercel.json`.
- **og-image**: `assets/img/og-image.svg` (1200×630). Algunas plataformas (WhatsApp, Twitter/X) no siempre
  renderizan bien un SVG como preview — para máxima compatibilidad, exportar ese mismo diseño a PNG/JPG 1200×630
  y actualizar los `og:image`/`twitter:image` de las 5 páginas.
- **robots.txt / sitemap.xml**: en la raíz del proyecto.
- **Datos estructurados (JSON-LD)**: en el `<head>` de las 4 páginas indexables. `index.html` define la entidad
  principal (`ProfessionalService`) con el `@id` `https://ateneaagency.com.ar/#organization`; las otras la
  referencian por ese `@id` en vez de repetirla, así Google entiende que es **una sola** agencia y no cuatro.
  Cada página usa además el tipo que le corresponde: `WebPage` + `ItemList` en servicios, `AboutPage` con los
  socios en nosotros, `ContactPage` en contacto, y todas llevan `BreadcrumbList`.
  `diagnostico.html` y `404.html` no llevan marcado: son `noindex`, no tiene sentido marcarlas.
  **Regla:** el nicho se declara con `audience` y `serviceType`, **no** repitiendo "para inmobiliarias" dentro
  del nombre de cada servicio. Los nombres del marcado deben coincidir con los que se leen en la página; el
  marcado que se despega del contenido visible Google puede ignorarlo o penalizarlo como spam.
- **404.html**: página de error reutilizando el `.page-hero`, con vuelta al inicio y a servicios. Vercel la sirve
  automáticamente para cualquier ruta que no exista.
- **URLs sin `.html` en producción**: `vercel.json` tiene `"cleanUrls": true`. Eso hace que Vercel sirva
  `servicios.html` también en `/servicios` y **redirija (301) `/servicios.html` → `/servicios`**. Los
  `canonical`, `og:url` y el `sitemap.xml` usan la versión limpia, que es la que indexa Google. Es una
  configuración exclusiva de Vercel: si migran a otro hosting, no se traslada sola.

---

## Desarrollo local (Live Server)

**Los links internos del HTML apuntan a `servicios.html`, `nosotros.html`, etc. — con extensión y en ruta
relativa. Es a propósito: así se puede navegar el sitio con Live Server (o abriendo el archivo directo) sin
que tire `Cannot GET /servicios`.** No cambiarlos a `/servicios`: eso rompe la navegación en local.

En producción no se pierde nada, porque `cleanUrls` redirige cada `.html` a su versión limpia. El único costo es
un salto 301 en el primer click interno, y la URL que ve el visitante en la barra sigue siendo `/servicios`.

Si en algún momento se quiere navegar en local con las rutas limpias exactas de producción (sin redirect), la
alternativa es servir la carpeta con:

```bash
npx serve .
```

que resuelve `/servicios` igual que Vercel, aunque no tiene el auto-reload de Live Server.

---

## Deploy en Vercel

Sitio 100% estático (sin backend), así que Vercel lo sirve sin ningún build command: alcanza con importar el
repositorio o arrastrar la carpeta del proyecto.

1. Compilar el SASS final minificado **antes de cada push** (Vercel no compila SASS, solo sirve archivos):
   ```
   sass scss/main.scss css/styles.css --style=compressed --no-source-map
   ```
   `css/styles.css` tiene que quedar commiteado siempre actualizado.
2. Reemplazar los placeholders (WhatsApp, email — ver sección de abajo) antes de publicar.
3. En el dashboard de Vercel: **Add New → Project**, importar el repo (o `vercel` desde la CLI parado en esta
   carpeta). Framework Preset: **Other**. No hace falta configurar Build Command ni Output Directory: al no
   detectar un framework, Vercel sirve el contenido de la raíz del proyecto tal cual.
4. Conectar el dominio: **Project → Settings → Domains**, agregar `ateneaagency.com.ar`. Vercel va a pedir
   apuntar el DNS del dominio (donde lo hayan comprado, ej. Hostinger u otro registrador) hacia Vercel —
   generalmente un registro `A` a `76.76.21.21` y un `CNAME` de `www` a `cname.vercel-dns.com`, pero conviene
   seguir las instrucciones exactas que muestra Vercel al agregar el dominio, porque pueden variar.
5. Agregar también `www.ateneaagency.com.ar` como dominio en el mismo proyecto: la redirección de `www` hacia
   el dominio sin `www` ya está resuelta en `vercel.json`.

`vercel.json` deja configurado: redirección `www` → sin `www`, cabeceras de seguridad básicas y cache largo
para `css/`, `js/` y `assets/` (Vercel ya fuerza HTTPS y comprime todo automáticamente, no hace falta
configurarlo aparte). `.vercelignore` excluye del deploy la carpeta `scss/` y otros archivos que el navegador
nunca necesita.

---

## Número de WhatsApp y email
Reemplazar `5491100000000` (WhatsApp) y `hola@ateneaagency.com.ar` (email de contacto) por los datos reales
cuando estén disponibles. Aparecen en `index.html`, `servicios.html`, `nosotros.html`, `contacto.html` y
`404.html` (WhatsApp) y en `contacto.html` (email).
