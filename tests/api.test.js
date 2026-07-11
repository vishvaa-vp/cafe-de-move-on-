import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createCanteenServer } from "../server.js";

async function request(baseUrl, path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

test("student QR order is fulfilled through the worker checklist", async (context) => {
  const databasePath = join(tmpdir(), `canteenflow-${process.pid}-${Date.now()}.db`);
  const application = createCanteenServer({ databasePath, port: 0 });
  const address = await application.start(0);
  const baseUrl = `http://127.0.0.1:${address.port}`;

  context.after(async () => {
    await application.close();
    for (const suffix of ["", "-shm", "-wal"]) {
      const path = `${databasePath}${suffix}`;
      if (existsSync(path)) rmSync(path, { force: true });
    }
  });

  const student = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email: "student@ngpit.ac.in", password: "student123", role: "student" },
  });
  const worker = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email: "worker@ngpit.ac.in", password: "worker123", role: "worker" },
  });
  const admin = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email: "admin@ngpit.ac.in", password: "admin123", role: "admin" },
  });

  assert.equal(student.user.role, "student");
  assert.equal(worker.user.role, "worker");
  assert.equal(admin.user.role, "admin");

  const studentBootstrap = await request(baseUrl, "/api/bootstrap", { token: student.token });
  const workerBootstrap = await request(baseUrl, "/api/bootstrap", { token: worker.token });
  const adminBootstrap = await request(baseUrl, "/api/bootstrap", { token: admin.token });
  assert.equal(studentBootstrap.canteens.length, 3);
  assert.equal(workerBootstrap.canteens.length, 1);
  assert.equal(adminBootstrap.canteens.length, 3);

  const canteenId = workerBootstrap.canteens[0].id;
  const menu = await request(baseUrl, `/api/menu?canteenId=${canteenId}`, { token: student.token });
  const item = menu.items.find((entry) => entry.isAvailable);
  assert.ok(item);

  const emptyCart = await request(baseUrl, "/api/cart", { token: student.token });
  assert.equal(emptyCart.cart.serviceFee, 0);

  await request(baseUrl, "/api/cart/items", {
    token: student.token,
    method: "POST",
    body: { itemId: item.id, quantity: 2 },
  });
  const created = await request(baseUrl, "/api/orders", {
    token: student.token,
    method: "POST",
    body: { paymentMethod: "wallet" },
  });
  assert.match(created.order.orderNumber, /^ORD-\d{8}-\d{4}$/);
  assert.match(created.order.collectionCode, /^[A-F0-9]{24}$/);
  assert.match(created.order.collectionQrSvg, /^<svg/);
  assert.equal(created.order.serviceFee, 0);
  assert.equal(created.order.total, created.order.subtotal);
  assert.equal(created.order.paymentProvider, "wallet");

  const scanned = await request(baseUrl, "/api/worker/lookup", {
    token: worker.token,
    method: "POST",
    body: { code: `CFLOW:${created.order.collectionCode}` },
  });
  assert.equal(scanned.order.id, created.order.id);
  assert.equal(scanned.order.items[0].isServed, false);

  await assert.rejects(
    request(baseUrl, `/api/worker/orders/${scanned.order.id}/items/${scanned.order.items[0].id}`, {
      token: worker.token,
      method: "PATCH",
      body: { served: true },
    }),
    (error) => error.status === 409,
  );

  await request(baseUrl, `/api/admin/orders/${created.order.id}/status`, {
    token: admin.token,
    method: "POST",
    body: { status: "preparing" },
  });
  await request(baseUrl, `/api/admin/orders/${created.order.id}/status`, {
    token: admin.token,
    method: "POST",
    body: { status: "ready" },
  });
  const readyToServe = await request(baseUrl, "/api/worker/lookup", {
    token: worker.token,
    method: "POST",
    body: { code: created.order.orderNumber },
  });
  assert.equal(readyToServe.order.status, "ready");

  let fulfilledOrder = readyToServe.order;
  for (const orderItem of readyToServe.order.items) {
    const updated = await request(baseUrl, `/api/worker/orders/${readyToServe.order.id}/items/${orderItem.id}`, {
      token: worker.token,
      method: "PATCH",
      body: { served: true },
    });
    fulfilledOrder = updated.order;
  }
  assert.ok(fulfilledOrder.items.every((orderItem) => orderItem.isServed));

  const completed = await request(baseUrl, `/api/worker/orders/${readyToServe.order.id}/complete`, {
    token: worker.token,
    method: "POST",
  });
  assert.equal(completed.order.status, "completed");

  const refreshed = await request(baseUrl, `/api/orders/${created.order.id}`, { token: student.token });
  assert.equal(refreshed.order.status, "completed");

  await request(baseUrl, "/api/cart/items", {
    token: student.token,
    method: "POST",
    body: { itemId: item.id, quantity: 1 },
  });
  const upiOrder = await request(baseUrl, "/api/orders", {
    token: student.token,
    method: "POST",
    body: { paymentMethod: "gpay" },
  });
  assert.equal(upiOrder.order.paymentProvider, "gpay");
  assert.equal(upiOrder.order.total, upiOrder.order.subtotal);

  await assert.rejects(
    request(baseUrl, `/api/admin/orders/${created.order.id}/status`, {
      token: admin.token,
      method: "POST",
      body: { status: "completed" },
    }),
    (error) => error.status === 403,
  );
});
