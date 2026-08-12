# Tailor Orders

Tablet PWA for a tailor shop front desk: take the customer's measurements and a
reference photo, save the order, print an A4 order sheet for the workshop.

Built as an offline-first web app (React + Vite + IndexedDB) so it runs on both
Android tablets and iPads with no app store, and prints through the tablet's
normal print dialog to any AirPrint / Wi-Fi / USB printer the tablet can see.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve the build locally
```

To use it on the shop tablet, serve `dist/` from any static host (or the shop
PC / a LAN box), open it in Chrome or Safari on the tablet, and use
**Add to Home Screen**. After the first load the app works with the Wi-Fi off —
all data lives on the tablet in IndexedDB.

## Screens

| Route | Screen |
|---|---|
| `/` | Home — New order, Order history, Order status, Analytics |
| `/new` | Order form |
| `/orders` | History: search by name / phone / order ID, filter by status, link to analytics |
| `/orders/:id` | Order sheet preview, Print, Edit, Delete, status change |
| `/orders/:id/edit` | Order form, pre-filled |
| `/status` | Customer-facing lookup by order ID or phone — payment and status only |
| `/analytics` | Charts (lazy-loaded, see below) |
| `/shop` | Shop name and phone for the printed header — reached from **Shop** in the top bar |

### Order status screen

Built to be turned around and shown to the customer: order ID, garment, status
badge, delivery date, price, prepaid, outstanding balance. No measurements, no
notes, no photos.

### Analytics

- Four tiles: orders, revenue, unpaid balance, average order.
- **New orders over time** with 30 / 90 / 365-day ranges. The bucket size follows
  the range — daily, weekly, monthly — so the line stays readable instead of
  turning into a 0-1-2 sawtooth.
- **Season** — orders by calendar month, summed across years; names the busiest month.
- **Revenue, last 12 months.**
- **Garment mix** as a 3D pie built with three.js (drag to spin). 3D distorts
  slice area, so every slice carries a direct percentage label and the card also
  keeps a legend and a data table.
- **Workshop load** — order counts per status.

Chart colours come from a CVD-validated categorical palette (blue, orange, aqua,
yellow, magenta) assigned in fixed order. three.js is code-split: it loads only
when the analytics page is opened, so order entry stays on a ~86 kB gzip bundle.

## What one order holds

Customer name, phone, garment type, **measurement source toggle** (customer body
vs. existing garment), unit (cm / inch), the measurement fields for that garment
type plus any number of custom fields, reference photos, fabric/colour, special
instructions, delivery date, price, prepaid, and status
(New → In progress → Ready → Delivered).

Order IDs are `ORD-YYMMDD-NN`, numbered per day.

## Printing

**Save & print** stores the order, opens the sheet, waits for the photos to
decode, then calls the browser print dialog. The sheet is styled for **A4
portrait, 10 mm margins**; the screen preview is the exact print layout. The
sheet has fields for cut/sewn/checked signatures at the bottom.

No printer driver is compiled in — the tablet's print dialog picks the printer.
That covers AirPrint, Mopria, Google Cloud Print successors, and anything
shared from a PC. If the shop later chooses a **Bluetooth thermal receipt
printer**, that needs a native wrapper (Capacitor + an ESC/POS plugin); the
sheet layout would then be re-cut for 58/80 mm rolls.

## Adjusting measurement fields

`src/lib/garments.ts` — one array per garment type. Add or remove a key there,
then add its label to `m.<key>` in the three dictionaries in `src/lib/i18n.ts`.
Nothing else needs to change; the form, the sheet, and stored orders all follow
that list. Fields not filled in are omitted from the printed sheet.

## Languages

English, Russian, Uzbek (Latin). Switcher lives in the top bar; the choice is
remembered. Add a language by adding a dictionary in `src/lib/i18n.ts` and
listing its code in `LANGS`.

## Repeat customers

Typing a phone number that matches an earlier order offers to pull that
customer's last measurements into the new order.

## Data

Everything is local to the tablet browser profile (IndexedDB, photos stored as
downscaled JPEG blobs, max 1400 px). No server, no account, no internet needed.
There is currently **no cloud backup** — if the tablet is wiped, orders are
gone. Add a sync layer or an export/import file if the shop wants a second copy.

## Not built (from the spec's "future" list)

SMS/WhatsApp notifications, QR code on the sheet, per-tailor assignment.

## Deploying with Docker

The server needs no dependencies of its own — it runs on Node's built-in HTTP
and SQLite modules — so the image is just Node plus the built app.

```bash
docker compose up -d --build
```

The app and its API are then on **http://<server-ip>:4000** — one address for
every tablet.

### What matters when deploying

- **Orders live in the `tailor-data` volume**, mounted at `/data`, never inside
  the image. Rebuilding or redeploying does not touch them.
- **Back up** with `docker run --rm -v tailor-data:/data -v $PWD:/out alpine \
  cp /data/tailor.db /out/` — it is a single SQLite file.
- **Port and database path** are set with `PORT` and `DB_PATH`.
- **There is no authentication.** Anyone who can reach the port can read and
  change every order, so keep it on a private network or put an authenticating
  reverse proxy in front of it before exposing it to the internet.
- **The QR codes on printed slips encode whatever address the app was opened
  from.** Print slips from the deployed address, not from a laptop's
  `localhost`, or customers will scan a link that resolves to nothing.

### Without compose

```bash
docker build -t tailor .
docker run -d --name tailor -p 4000:4000 -v tailor-data:/data --restart unless-stopped tailor
```
