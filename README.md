# Cafe de Move On!
https://cafede.netlify.app
A responsive full-stack campus canteen system with separate Student, Worker, and Admin workspaces.

## Role flows

- Student: select an institution canteen, browse its menu, pay from the campus wallet or at the counter, follow the live queue, and show a standards-compliant collection QR.
- Worker: scan the student QR or enter the order number, verify every product through a checklist, and complete the handover.
- Admin: switch between all institution canteens, manage menus and availability, monitor traffic, and move orders from queued to preparing to ready.

## Demo accounts

- Student: `student@ngpit.ac.in` / `student123`
- Worker: `worker@ngpit.ac.in` / `worker123`
- Admin: `admin@ngpit.ac.in` / `admin123`

## Run locally

```powershell
pnpm install
pnpm start
```

Open `http://127.0.0.1:3000`. Camera QR scanning requires browser camera permission; manual order-number lookup is always available as a fallback.

## Verify

```powershell
pnpm test
```

The integration test covers student ordering, QR lookup, worker item fulfilment, handover completion, and role permissions.

## Netlify deployment

The included Netlify configuration deploys the frontend, the complete API as a Netlify Function, uploaded menu images in Netlify Blobs, and the SQLite database as a strongly consistent Blob snapshot.

1. In Netlify, open **Project configuration > Build & deploy > Continuous deployment**.
2. Confirm the repository is `vishvaa-vp/cafe-de-move-on-` and the production branch is `main`.
3. Leave the base directory empty. Netlify reads build and function settings from `netlify.toml`.
4. Trigger **Deploys > Trigger deploy > Clear cache and deploy site**.
5. Test `/api/health`, then sign in with one of the demo accounts.

On Netlify, live status uses four-second polling because serverless functions cannot maintain the original long-running event stream. Netlify Blobs works best for low-traffic demos with infrequent overlapping writes; a relational cloud database is recommended before high-volume production use.
