import { getStore } from "@netlify/blobs";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createCanteenServer } from "../../server.js";

const DATABASE_KEY = "canteen.db";
const databaseStore = getStore({ name: "cafe-de-move-on-database", consistency: "strong" });
const imageStore = getStore({ name: "cafe-de-move-on-images", consistency: "strong" });

function cleanTemporaryDatabase(path) {
  for (const suffix of ["", "-shm", "-wal"]) {
    const target = `${path}${suffix}`;
    if (existsSync(target)) unlinkSync(target);
  }
}

async function persistImage(dataUrl, originalName = "menu-image") {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!match) throw Object.assign(new Error("Use a PNG, JPEG or WebP image"), { statusCode: 400 });
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error("Image must be smaller than 6 MB"), { statusCode: 413 });
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const safeName = String(originalName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "menu-image";
  const digest = createHash("sha1").update(bytes).digest("hex").slice(0, 10);
  const key = `${safeName}-${digest}.${extension}`;
  await imageStore.set(key, new Blob([bytes], { type: `image/${match[1]}` }));
  return `/api/uploads/${key}`;
}

export default async function handler(request) {
  const incomingUrl = new URL(request.url);
  const uploadMatch = /^\/api\/uploads\/([a-z0-9-]+\.(?:png|jpg|webp))$/.exec(incomingUrl.pathname);
  if (uploadMatch && request.method === "GET") {
    const image = await imageStore.get(uploadMatch[1], { type: "arrayBuffer" });
    if (!image) return new Response("Image not found", { status: 404 });
    const extension = uploadMatch[1].split(".").pop();
    return new Response(image, { headers: { "content-type": extension === "jpg" ? "image/jpeg" : `image/${extension}`, "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (incomingUrl.pathname === "/api/events") return new Response(null, { status: 204 });

  const databasePath = `/tmp/cafe-de-move-on-${randomUUID()}.db`;
  const savedDatabase = await databaseStore.get(DATABASE_KEY, { type: "arrayBuffer" });
  if (savedDatabase) writeFileSync(databasePath, Buffer.from(savedDatabase));

  const application = createCanteenServer({ databasePath, uploadImage: persistImage });
  try {
    const address = await application.start(0, "127.0.0.1");
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    const upstream = await fetch(`http://127.0.0.1:${address.port}${incomingUrl.pathname}${incomingUrl.search}`, { method: request.method, headers, body, redirect: "manual" });
    const responseBody = await upstream.arrayBuffer();
    await application.close();
    await databaseStore.set(DATABASE_KEY, new Blob([readFileSync(databasePath)], { type: "application/vnd.sqlite3" }));
    cleanTemporaryDatabase(databasePath);
    return new Response(responseBody, { status: upstream.status, headers: upstream.headers });
  } catch (error) {
    await application.close().catch(() => {});
    cleanTemporaryDatabase(databasePath);
    console.error(error);
    return Response.json({ error: error.statusCode ? error.message : "The Netlify backend could not complete this request" }, { status: error.statusCode || 500 });
  }
}

export const config = { path: "/api/*" };
