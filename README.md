# Cafe de Move On!

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

## Production deployment

This application needs a persistent Node server and SQLite disk, so it cannot be deployed as a static-only Netlify site. The included `render.yaml` creates a Render web service, runs `pnpm start`, checks `/api/health`, and stores the database on a persistent disk.

1. Open the Render dashboard and choose **New > Blueprint**.
2. Connect the `vishvaa-vp/cafe-de-move-on-` GitHub repository.
3. Select the `main` branch and apply the Blueprint.
4. Open the generated Render URL after the health check becomes live.

The persistent disk requires Render's Starter plan. Without a disk, SQLite data can reset after a restart or redeploy.
