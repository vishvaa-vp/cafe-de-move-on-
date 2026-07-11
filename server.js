import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import QRCode from "qrcode";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATABASE = process.env.DATABASE_PATH || join(ROOT, "data", "canteenflow.db");
const ACTIVE_ORDER_STATUSES = ["queued", "preparing", "ready"];
const ORDER_STATUSES = [...ACTIVE_ORDER_STATUSES, "completed", "cancelled"];
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password, storedHash) {
  const [salt, storedKey] = String(storedHash || "").split(":");
  if (!salt || !storedKey) return false;
  const suppliedKey = scryptSync(password, salt, 64);
  const expectedKey = Buffer.from(storedKey, "hex");
  return suppliedKey.length === expectedKey.length && timingSafeEqual(suppliedKey, expectedKey);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value) {
  return Boolean(number(value));
}

function createDatabase(databasePath) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      email_domain TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id INTEGER NOT NULL REFERENCES institutions(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'worker', 'admin')),
      wallet_balance INTEGER NOT NULL DEFAULT 0,
      reward_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canteens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id INTEGER NOT NULL REFERENCES institutions(id),
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      token_prefix TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      accent TEXT NOT NULL DEFAULT '#20c55a',
      serving_number INTEGER NOT NULL DEFAULT 0,
      average_service_minutes INTEGER NOT NULL DEFAULT 3,
      is_open INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canteen_id INTEGER NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      discount INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
      image_url TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 4.5,
      review_count INTEGER NOT NULL DEFAULT 0,
      prep_minutes INTEGER NOT NULL DEFAULT 8,
      is_veg INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favourites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 20),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      canteen_id INTEGER NOT NULL REFERENCES canteens(id),
      order_number TEXT UNIQUE,
      collection_code TEXT UNIQUE,
      token_number INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'preparing', 'ready', 'completed', 'cancelled')),
      subtotal INTEGER NOT NULL,
      service_fee INTEGER NOT NULL,
      total INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'counter')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      served_quantity INTEGER NOT NULL DEFAULT 0,
      served_at TEXT,
      served_by INTEGER
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund', 'reward')),
      amount INTEGER NOT NULL,
      label TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_menu_canteen ON menu_items(canteen_id);
    CREATE INDEX IF NOT EXISTS idx_orders_canteen_status ON orders(canteen_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
  `);

  migrateDatabase(db);
  seedDatabase(db);
  seedWorkerAccount(db);
  return db;
}

function insertedId(result) {
  return Number(result.lastInsertRowid);
}

function tableColumns(db, tableName) {
  return new Set(db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name));
}

function migrateDatabase(db) {
  const usersSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql || "";
  if (!usersSql.includes("'worker'")) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(`
        CREATE TABLE users_next (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          institution_id INTEGER NOT NULL REFERENCES institutions(id),
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('student', 'worker', 'admin')),
          wallet_balance INTEGER NOT NULL DEFAULT 0,
          reward_tokens INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_next (id, institution_id, name, email, password_hash, role, wallet_balance, reward_tokens, created_at)
        SELECT id, institution_id, name, email, password_hash, role, wallet_balance, reward_tokens, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_next RENAME TO users;
      `);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }

  const orderColumns = tableColumns(db, "orders");
  if (!orderColumns.has("collection_code")) db.exec("ALTER TABLE orders ADD COLUMN collection_code TEXT");
  if (!orderColumns.has("payment_provider")) db.exec("ALTER TABLE orders ADD COLUMN payment_provider TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_collection_code ON orders(collection_code) WHERE collection_code IS NOT NULL");
  const missingCodes = db.prepare("SELECT id FROM orders WHERE collection_code IS NULL OR collection_code = ''").all();
  const updateCode = db.prepare("UPDATE orders SET collection_code = ? WHERE id = ?");
  missingCodes.forEach((order) => updateCode.run(randomBytes(12).toString("hex").toUpperCase(), order.id));

  const itemColumns = tableColumns(db, "order_items");
  if (!itemColumns.has("served_quantity")) db.exec("ALTER TABLE order_items ADD COLUMN served_quantity INTEGER NOT NULL DEFAULT 0");
  if (!itemColumns.has("served_at")) db.exec("ALTER TABLE order_items ADD COLUMN served_at TEXT");
  if (!itemColumns.has("served_by")) db.exec("ALTER TABLE order_items ADD COLUMN served_by INTEGER");

  db.prepare("UPDATE wallet_transactions SET label = 'Order reward points' WHERE label = 'Order reward tokens'").run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS worker_canteens (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      canteen_id INTEGER NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, canteen_id)
    );
    CREATE INDEX IF NOT EXISTS idx_worker_canteens_canteen ON worker_canteens(canteen_id);
  `);

  const foreignKeyViolations = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyViolations.length) throw new Error("Database migration produced invalid role references");
}

function seedDatabase(db) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM institutions").get().count;
  if (existing) return;

  db.exec("BEGIN IMMEDIATE");
  try {
    const institutionId = insertedId(
      db.prepare("INSERT INTO institutions (name, code, email_domain) VALUES (?, ?, ?)")
        .run("N.G.P. Institute of Technology", "ngpit663", "drngpit.ac.in"),
    );

    const insertUser = db.prepare(`
      INSERT INTO users (institution_id, name, email, password_hash, role, wallet_balance, reward_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const studentId = insertedId(insertUser.run(
      institutionId,
      "Demo Student",
      "student@ngpit.ac.in",
      hashPassword("student123"),
      "student",
      650,
      84,
    ));
    const adminId = insertedId(insertUser.run(
      institutionId,
      "Cafe Administrator",
      "admin@ngpit.ac.in",
      hashPassword("admin123"),
      "admin",
      0,
      0,
    ));
    const queueUsers = [
      ["Aarav Kumar", "aarav@ngpit.ac.in"],
      ["Meera S", "meera@ngpit.ac.in"],
      ["Rahul Dev", "rahul@ngpit.ac.in"],
    ].map(([name, email]) => insertedId(insertUser.run(
      institutionId,
      name,
      email,
      hashPassword("queue123"),
      "student",
      300,
      0,
    )));

    const insertCanteen = db.prepare(`
      INSERT INTO canteens
      (institution_id, name, short_name, token_prefix, location, description, accent, serving_number, average_service_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const centralId = insertedId(insertCanteen.run(
      institutionId,
      "Main Cafeteria",
      "Cafeteria",
      "CF",
      "Academic Block A",
      "Campus favourites, full meals and quick bites.",
      "#20c55a",
      217,
      3,
    ));
    const southId = insertedId(insertCanteen.run(
      institutionId,
      "South Indian Kitchen",
      "South Kitchen",
      "SI",
      "Academic Block C",
      "Fresh dosa, idli and traditional breakfast all day.",
      "#ff8a34",
      83,
      4,
    ));
    const freshId = insertedId(insertCanteen.run(
      institutionId,
      "Fresh Corner",
      "Fresh Corner",
      "FC",
      "Library Walkway",
      "Juices, desserts, snacks and lighter choices.",
      "#1ea7a1",
      41,
      2,
    ));

    const insertMenu = db.prepare(`
      INSERT INTO menu_items
      (canteen_id, name, category, description, price, discount, image_url, rating, review_count, prep_minutes, is_veg, is_available, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const menuSeed = [
      [centralId, "Chicken Fried Rice", "Meals", "Wok-tossed basmati rice with tender chicken, vegetables and house seasoning.", 150, 10, "/assets/foods/chicken-fried-rice.png", 4.7, 92, 12, 0, 1],
      [centralId, "Rice and Curry", "Meals", "Steamed rice with aromatic vegetable curries, greens, dhal and crisp papad.", 150, 0, "/assets/foods/rice-and-curry.png", 4.5, 90, 10, 1, 1],
      [centralId, "Veg Burger and Fries", "Fast food", "Grilled vegetable patty, crunchy slaw and seasoned golden fries.", 130, 0, "/assets/foods/veg-burger-fries.png", 4.4, 48, 9, 1, 1],
      [centralId, "Paneer Kathi Roll", "Fast food", "Smoky paneer, peppers and mint chutney wrapped in a flaky paratha.", 120, 5, "/assets/foods/paneer-roll.png", 4.6, 36, 8, 1, 0],
      [southId, "Masala Dosa", "South Indian", "Crisp dosa filled with spiced potato masala, served with sambar and chutneys.", 90, 0, "/assets/foods/masala-dosa.png", 4.8, 126, 10, 1, 1],
      [southId, "Idli Sambar", "South Indian", "Four cloud-soft idlis with hot sambar and coconut-tomato chutneys.", 70, 0, "/assets/foods/idli-sambar.png", 4.7, 84, 7, 1, 1],
      [southId, "Filter Coffee", "Drinks", "Strong South Indian filter coffee with hot frothy milk.", 35, 0, "/assets/foods/filter-coffee.png", 4.6, 64, 4, 1, 0],
      [southId, "Poori Masala", "South Indian", "Fluffy poori with comforting potato masala and coconut chutney.", 85, 0, "/assets/foods/poori-masala.png", 4.5, 45, 9, 1, 0],
      [freshId, "Chocolate Sundae", "Desserts", "Chocolate ice cream, warm fudge, cocoa crumble and roasted nuts.", 95, 0, "/assets/foods/chocolate-sundae.png", 4.8, 73, 4, 1, 1],
      [freshId, "Cold Drinks", "Drinks", "A chilled campus combo with fruit drink and cola.", 55, 0, "/assets/foods/cold-drinks.png", 4.2, 31, 2, 1, 0],
      [freshId, "Fresh Lime Cooler", "Drinks", "Fresh lime, mint and soda served ice cold with balanced sweetness.", 60, 0, "/assets/foods/lime-cooler.png", 4.7, 52, 3, 1, 1],
      [freshId, "Biscuit and Cake Box", "Snacks", "A shareable box of chocolate biscuits, tea cake and wafer bites.", 80, 0, "/assets/foods/biscuit-cake-box.png", 4.3, 29, 2, 1, 0],
    ];
    const itemIds = menuSeed.map((item) => insertedId(insertMenu.run(...item)));

    db.prepare("INSERT INTO favourites (user_id, item_id) VALUES (?, ?)").run(studentId, itemIds[1]);
    db.prepare("INSERT INTO favourites (user_id, item_id) VALUES (?, ?)").run(studentId, itemIds[4]);
    db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, amount, label)
      VALUES (?, 'credit', 650, 'Campus wallet opening balance')
    `).run(studentId);

    const insertOrder = db.prepare(`
      INSERT INTO orders
      (user_id, canteen_id, order_number, token_number, status, subtotal, service_fee, total, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'counter')
    `);
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, item_id, name, price, quantity)
      VALUES (?, ?, ?, ?, 1)
    `);
    const queuePlan = [
      [centralId, 218, "ready", itemIds[0], "Chicken Fried Rice", 140],
      [centralId, 219, "queued", itemIds[1], "Rice and Curry", 150],
      [centralId, 220, "queued", itemIds[2], "Veg Burger and Fries", 130],
      [southId, 84, "preparing", itemIds[4], "Masala Dosa", 90],
      [southId, 85, "queued", itemIds[5], "Idli Sambar", 70],
      [southId, 86, "queued", itemIds[4], "Masala Dosa", 90],
      [southId, 87, "queued", itemIds[7], "Poori Masala", 85],
      [southId, 88, "queued", itemIds[5], "Idli Sambar", 70],
      [freshId, 42, "preparing", itemIds[10], "Fresh Lime Cooler", 60],
    ];
    queuePlan.forEach(([canteenId, token, status, itemId, name, price], index) => {
      const orderId = insertedId(insertOrder.run(
        queueUsers[index % queueUsers.length],
        canteenId,
        `SEED-${canteenId}-${token}`,
        token,
        status,
        price,
        5,
        price + 5,
      ));
      insertOrderItem.run(orderId, itemId, name, price);
    });

    const insertReview = db.prepare(`
      INSERT INTO reviews (user_id, item_id, rating, comment) VALUES (?, ?, ?, ?)
    `);
    insertReview.run(queueUsers[0], itemIds[1], 5, "Fresh, flavourful and ready before my next class.");
    insertReview.run(queueUsers[1], itemIds[1], 4, "Comforting lunch and a generous portion.");
    insertReview.run(queueUsers[2], itemIds[4], 5, "The dosa stayed crisp and both chutneys were excellent.");

    db.exec("COMMIT");
    void adminId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function seedWorkerAccount(db) {
  const institution = db.prepare("SELECT id FROM institutions WHERE code = 'ngpit663'").get();
  if (!institution) return;
  let worker = db.prepare("SELECT id, role FROM users WHERE email = 'worker@ngpit.ac.in'").get();
  if (!worker) {
    const workerId = insertedId(db.prepare(`
      INSERT INTO users (institution_id, name, email, password_hash, role, wallet_balance, reward_tokens)
      VALUES (?, 'Cafeteria Service', 'worker@ngpit.ac.in', ?, 'worker', 0, 0)
    `).run(institution.id, hashPassword("worker123")));
    worker = { id: workerId };
  } else if (worker.role !== "worker") {
    db.prepare("UPDATE users SET role = 'worker' WHERE id = ?").run(worker.id);
  }
  const canteen = db.prepare("SELECT id FROM canteens WHERE institution_id = ? ORDER BY id LIMIT 1").get(institution.id);
  if (canteen) {
    db.prepare("INSERT OR IGNORE INTO worker_canteens (user_id, canteen_id) VALUES (?, ?)").run(worker.id, canteen.id);
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    institutionId: number(row.institution_id),
    institutionName: row.institution_name,
    institutionCode: row.institution_code,
    walletBalance: number(row.wallet_balance),
    rewardTokens: number(row.reward_tokens),
  };
}

function trafficFor(activeOrders, averageMinutes) {
  const count = number(activeOrders);
  let level = "low";
  if (count >= 6) level = "high";
  else if (count >= 3) level = "moderate";
  return {
    level,
    activeOrders: count,
    estimatedWaitMinutes: count ? Math.max(3, Math.ceil((count * number(averageMinutes, 3)) / 2)) : 0,
  };
}

function getCanteens(db, institutionId) {
  return db.prepare(`
    SELECT c.*,
      SUM(CASE WHEN o.status IN ('queued', 'preparing', 'ready') THEN 1 ELSE 0 END) AS active_orders
    FROM canteens c
    LEFT JOIN orders o ON o.canteen_id = c.id
    WHERE c.institution_id = ?
    GROUP BY c.id
    ORDER BY c.id
  `).all(institutionId).map((row) => ({
    id: number(row.id),
    name: row.name,
    shortName: row.short_name,
    tokenPrefix: row.token_prefix,
    location: row.location,
    description: row.description,
    accent: row.accent,
    servingNumber: number(row.serving_number),
    averageServiceMinutes: number(row.average_service_minutes),
    isOpen: boolean(row.is_open),
    traffic: trafficFor(row.active_orders, row.average_service_minutes),
  }));
}

function getAccessibleCanteens(db, user) {
  const canteens = getCanteens(db, user.institutionId);
  if (user.role !== "worker") return canteens;
  const assignedIds = new Set(db.prepare("SELECT canteen_id FROM worker_canteens WHERE user_id = ?").all(user.id).map((row) => number(row.canteen_id)));
  return canteens.filter((canteen) => assignedIds.has(canteen.id));
}

function mapMenuItem(row) {
  return {
    id: number(row.id),
    canteenId: number(row.canteen_id),
    canteenName: row.canteen_name,
    name: row.name,
    category: row.category,
    description: row.description,
    price: number(row.price),
    discount: number(row.discount),
    finalPrice: Math.max(0, number(row.price) - number(row.discount)),
    imageUrl: row.image_url,
    rating: number(row.rating),
    reviewCount: number(row.review_count),
    prepMinutes: number(row.prep_minutes),
    isVeg: boolean(row.is_veg),
    isAvailable: boolean(row.is_available),
    featured: boolean(row.featured),
    isFavourite: boolean(row.is_favourite),
  };
}

function getMenu(db, userId, { canteenId, search = "", category = "" }) {
  const conditions = ["m.canteen_id = ?"];
  const values = [canteenId];
  if (search.trim()) {
    conditions.push("(LOWER(m.name) LIKE ? OR LOWER(m.category) LIKE ? OR LOWER(m.description) LIKE ?)");
    const query = `%${search.trim().toLowerCase()}%`;
    values.push(query, query, query);
  }
  if (category && category !== "All") {
    conditions.push("m.category = ?");
    values.push(category);
  }
  values.push(userId);
  return db.prepare(`
    SELECT m.*, c.name AS canteen_name,
      EXISTS(SELECT 1 FROM favourites f WHERE f.item_id = m.id AND f.user_id = ?) AS is_favourite
    FROM menu_items m
    JOIN canteens c ON c.id = m.canteen_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY m.is_available DESC, m.featured DESC, m.rating DESC, m.name
  `.replace("? AS is_favourite", "? AS is_favourite")).all(...[...values.slice(0, -1), values.at(-1)]).map(mapMenuItem);
}

function getMenuSafe(db, userId, filters) {
  const conditions = ["m.canteen_id = ?"];
  const values = [filters.canteenId];
  if (filters.search?.trim()) {
    conditions.push("(LOWER(m.name) LIKE ? OR LOWER(m.category) LIKE ? OR LOWER(m.description) LIKE ?)");
    const query = `%${filters.search.trim().toLowerCase()}%`;
    values.push(query, query, query);
  }
  if (filters.category && filters.category !== "All") {
    conditions.push("m.category = ?");
    values.push(filters.category);
  }
  const favouriteUserId = number(userId);
  return db.prepare(`
    SELECT m.*, c.name AS canteen_name,
      EXISTS(SELECT 1 FROM favourites f WHERE f.item_id = m.id AND f.user_id = ?) AS is_favourite
    FROM menu_items m
    JOIN canteens c ON c.id = m.canteen_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY m.is_available DESC, m.featured DESC, m.rating DESC, m.name
  `).all(favouriteUserId, ...values).map(mapMenuItem);
}

function getCart(db, userId) {
  const rows = db.prepare(`
    SELECT ci.quantity, m.*, c.name AS canteen_name, c.short_name AS canteen_short_name,
      c.token_prefix, c.serving_number, c.is_open,
      EXISTS(SELECT 1 FROM favourites f WHERE f.item_id = m.id AND f.user_id = ?) AS is_favourite
    FROM cart_items ci
    JOIN menu_items m ON m.id = ci.item_id
    JOIN canteens c ON c.id = m.canteen_id
    WHERE ci.user_id = ?
    ORDER BY ci.updated_at DESC
  `).all(userId, userId);
  const items = rows.map((row) => ({ ...mapMenuItem(row), quantity: number(row.quantity) }));
  const subtotal = items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
  const serviceFee = 0;
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    serviceFee,
    total: subtotal,
    canteen: rows[0] ? {
      id: number(rows[0].canteen_id),
      name: rows[0].canteen_name,
      shortName: rows[0].canteen_short_name,
      tokenPrefix: rows[0].token_prefix,
      servingNumber: number(rows[0].serving_number),
      isOpen: boolean(rows[0].is_open),
    } : null,
  };
}

function mapOrder(db, row) {
  const items = db.prepare(`
    SELECT id, item_id, name, price, quantity, served_quantity, served_at, served_by
    FROM order_items WHERE order_id = ? ORDER BY id
  `).all(row.id).map((item) => ({
    id: number(item.id),
    itemId: item.item_id == null ? null : number(item.item_id),
    name: item.name,
    price: number(item.price),
    quantity: number(item.quantity),
    servedQuantity: number(item.served_quantity),
    isServed: number(item.served_quantity) >= number(item.quantity),
    servedAt: item.served_at,
    servedBy: item.served_by == null ? null : number(item.served_by),
  }));
  return {
    id: number(row.id),
    orderNumber: row.order_number,
    collectionCode: row.collection_code,
    tokenNumber: number(row.token_number),
    token: `${row.token_prefix}-${row.token_number}`,
    status: row.status,
    subtotal: number(row.subtotal),
    serviceFee: number(row.service_fee),
    total: number(row.total),
    paymentMethod: row.payment_method,
    paymentProvider: row.payment_provider || row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canteen: {
      id: number(row.canteen_id),
      name: row.canteen_name,
      shortName: row.canteen_short_name,
      tokenPrefix: row.token_prefix,
      servingNumber: number(row.serving_number),
      averageServiceMinutes: number(row.average_service_minutes),
    },
    queueAhead: Math.max(0, number(row.token_number) - number(row.serving_number) - 1),
    items,
  };
}

function getOrders(db, userId, limit = 30) {
  return db.prepare(`
    SELECT o.*, c.name AS canteen_name, c.short_name AS canteen_short_name,
      c.token_prefix, c.serving_number, c.average_service_minutes
    FROM orders o
    JOIN canteens c ON c.id = o.canteen_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT ?
  `).all(userId, limit).map((row) => mapOrder(db, row));
}

function getOrderById(db, orderId, user) {
  let accessClause = "AND o.user_id = ?";
  let params = [orderId, user.id];
  if (user.role === "admin") {
    accessClause = "AND c.institution_id = ?";
    params = [orderId, user.institutionId];
  } else if (user.role === "worker") {
    accessClause = "AND EXISTS (SELECT 1 FROM worker_canteens wc WHERE wc.user_id = ? AND wc.canteen_id = o.canteen_id)";
  }
  const row = db.prepare(`
    SELECT o.*, c.name AS canteen_name, c.short_name AS canteen_short_name,
      c.token_prefix, c.serving_number, c.average_service_minutes
    FROM orders o
    JOIN canteens c ON c.id = o.canteen_id
    WHERE o.id = ? ${accessClause}
  `).get(...params);
  if (!row) return null;
  const order = mapOrder(db, row);
  return user.role === "student" && order.collectionCode
    ? { ...order, collectionQrSvg: createCollectionQrSvg(order.collectionCode) }
    : order;
}

function getWorkerOrder(db, orderId, user) {
  const order = getOrderById(db, orderId, user);
  if (!order) return null;
  const customer = db.prepare(`
    SELECT u.name, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?
  `).get(orderId);
  return { ...order, customerName: customer?.name || "Student", customerEmail: customer?.email || "" };
}

function normalizeCollectionCode(value) {
  return String(value || "").trim().replace(/^CFLOW:/i, "").toUpperCase();
}

function createCollectionQrSvg(collectionCode) {
  const qr = QRCode.create(`CFLOW:${collectionCode}`, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  const viewBoxSize = qr.modules.size + quietZone * 2;
  const path = [];
  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (qr.modules.get(row, column)) path.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
    }
  }
  return `<svg class="collection-qr" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" role="img" aria-label="Collection QR code" shape-rendering="crispEdges"><rect width="${viewBoxSize}" height="${viewBoxSize}" rx="2" fill="#fff"/><path d="${path.join("")}" fill="#101713"/></svg>`;
}

function issueSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')").run();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return { token, expiresAt };
}

function authenticatedUser(db, request, url) {
  const bearer = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice(7)
    : "";
  const token = bearer || url.searchParams.get("token") || "";
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.*, i.name AS institution_name, i.code AS institution_code
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN institutions i ON i.id = u.institution_id
    WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
  `).get(token);
  return row ? { ...publicUser(row), sessionToken: token } : null;
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function sendError(response, statusCode, message, details) {
  sendJson(response, statusCode, { error: message, ...(details ? { details } : {}) });
}

async function readJson(request, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Request body is too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 });
  }
}

function requireUser(db, request, response, url, role) {
  const user = authenticatedUser(db, request, url);
  if (!user) {
    sendError(response, 401, "Please sign in to continue");
    return null;
  }
  if (role && user.role !== role) {
    sendError(response, 403, "You do not have permission to perform this action");
    return null;
  }
  return user;
}

function dateCode() {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function createBroadcaster() {
  const clients = new Set();
  return {
    subscribe(response, user) {
      const client = { response, user };
      clients.add(client);
      response.write(`event: connected\ndata: ${JSON.stringify({ at: nowIso() })}\n\n`);
      return () => clients.delete(client);
    },
    publish(event, payload) {
      const serialized = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
      for (const client of clients) {
        try {
          client.response.write(serialized);
        } catch {
          clients.delete(client);
        }
      }
    },
    heartbeat() {
      for (const client of clients) {
        try {
          client.response.write(`: heartbeat ${Date.now()}\n\n`);
        } catch {
          clients.delete(client);
        }
      }
    },
  };
}

function serveStatic(request, response, url) {
  const decoded = decodeURIComponent(url.pathname);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const normalizedPath = normalize(requested).replace(/^([/\\])+/, "");
  const allowed = normalizedPath === "index.html"
    || normalizedPath === "app.js"
    || normalizedPath === "styles.css"
    || normalizedPath.startsWith(`assets${process.platform === "win32" ? "\\" : "/"}`);
  if (!allowed) {
    sendError(response, 404, "Not found");
    return;
  }
  const filePath = resolve(ROOT, normalizedPath);
  if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
    sendError(response, 404, "Not found");
    return;
  }
  const body = readFileSync(filePath);
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": extension === ".html" || extension === ".js" || extension === ".css"
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function updateMenuRating(db, itemId) {
  const rating = db.prepare("SELECT AVG(rating) AS rating, COUNT(*) AS count FROM reviews WHERE item_id = ?").get(itemId);
  db.prepare("UPDATE menu_items SET rating = ?, review_count = ? WHERE id = ?")
    .run(Number(number(rating.rating, 0).toFixed(1)), number(rating.count), itemId);
}

function uploadImage(dataUrl, originalName = "menu-image") {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!match) throw Object.assign(new Error("Use a PNG, JPEG or WebP image"), { statusCode: 400 });
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error("Image must be smaller than 6 MB"), { statusCode: 413 });
  const safeName = originalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "menu-image";
  const digest = createHash("sha1").update(bytes).digest("hex").slice(0, 10);
  const fileName = `${safeName}-${digest}.${extension}`;
  const uploadDir = join(ROOT, "assets", "uploads");
  const fullPath = join(uploadDir, fileName);
  mkdirSync(uploadDir, { recursive: true });
  if (!existsSync(fullPath)) writeFileSync(fullPath, bytes);
  return `/assets/uploads/${fileName}`;
}

export function createCanteenServer(options = {}) {
  const databasePath = options.databasePath || process.env.DATABASE_PATH || DEFAULT_DATABASE;
  const db = createDatabase(databasePath);
  const broadcaster = createBroadcaster();
  const heartbeat = setInterval(() => broadcaster.heartbeat(), 20_000);
  heartbeat.unref();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const method = request.method || "GET";

    try {
      if (url.pathname === "/api/health" && method === "GET") {
        sendJson(response, 200, { status: "ok", service: "cafe-de-move-on", time: nowIso() });
        return;
      }

      if (url.pathname === "/api/auth/register" && method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const institutionCode = String(body.institutionCode || "").trim();
        if (name.length < 2 || !email.includes("@") || password.length < 8 || !institutionCode) {
          sendError(response, 400, "Enter your name, a valid email, the canteen code and a password of at least 8 characters");
          return;
        }
        const institution = db.prepare("SELECT * FROM institutions WHERE LOWER(code) = LOWER(?)").get(institutionCode);
        if (!institution) {
          sendError(response, 404, "That institution code was not found");
          return;
        }
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
          sendError(response, 409, "An account already exists for this email");
          return;
        }
        const userId = insertedId(db.prepare(`
          INSERT INTO users (institution_id, name, email, password_hash, role, wallet_balance, reward_tokens)
          VALUES (?, ?, ?, ?, 'student', 150, 10)
        `).run(institution.id, name, email, hashPassword(password)));
        db.prepare(`
          INSERT INTO wallet_transactions (user_id, type, amount, label)
          VALUES (?, 'credit', 150, 'New student welcome balance')
        `).run(userId);
        const session = issueSession(db, userId);
        const userRow = db.prepare(`
          SELECT u.*, i.name AS institution_name, i.code AS institution_code
          FROM users u JOIN institutions i ON i.id = u.institution_id WHERE u.id = ?
        `).get(userId);
        sendJson(response, 201, { ...session, user: publicUser(userRow) });
        return;
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await readJson(request);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const role = ["student", "worker", "admin"].includes(body.role) ? body.role : "student";
        const row = db.prepare(`
          SELECT u.*, i.name AS institution_name, i.code AS institution_code
          FROM users u JOIN institutions i ON i.id = u.institution_id
          WHERE u.email = ? AND u.role = ?
        `).get(email, role);
        if (!row || !passwordMatches(password, row.password_hash)) {
          sendError(response, 401, "The email or password is incorrect for this account type");
          return;
        }
        const session = issueSession(db, row.id);
        sendJson(response, 200, { ...session, user: publicUser(row) });
        return;
      }

      if (url.pathname === "/api/auth/logout" && method === "POST") {
        const user = requireUser(db, request, response, url);
        if (!user) return;
        db.prepare("DELETE FROM sessions WHERE token = ?").run(user.sessionToken);
        sendJson(response, 200, { ok: true });
        return;
      }

      if (url.pathname === "/api/events" && method === "GET") {
        const user = requireUser(db, request, response, url);
        if (!user) return;
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        const unsubscribe = broadcaster.subscribe(response, user);
        request.on("close", unsubscribe);
        return;
      }

      const user = url.pathname.startsWith("/api/") ? requireUser(db, request, response, url) : null;
      if (url.pathname.startsWith("/api/") && !user) return;

      if (url.pathname === "/api/bootstrap" && method === "GET") {
        const canteens = getAccessibleCanteens(db, user);
        const cart = user.role === "student" ? getCart(db, user.id) : { items: [], itemCount: 0, subtotal: 0, serviceFee: 0, total: 0, canteen: null };
        const favouriteIds = user.role === "student"
          ? db.prepare("SELECT item_id FROM favourites WHERE user_id = ?").all(user.id).map((row) => number(row.item_id))
          : [];
        const orders = user.role === "student" ? getOrders(db, user.id, 12) : [];
        sendJson(response, 200, { user, canteens, cart, favouriteIds, orders });
        return;
      }

      if (url.pathname === "/api/canteens" && method === "GET") {
        sendJson(response, 200, { canteens: getAccessibleCanteens(db, user) });
        return;
      }

      if (url.pathname === "/api/menu" && method === "GET") {
        const canteenId = number(url.searchParams.get("canteenId"));
        const ownedCanteen = db.prepare("SELECT id FROM canteens WHERE id = ? AND institution_id = ?").get(canteenId, user.institutionId);
        if (!ownedCanteen) {
          sendError(response, 404, "Canteen not found");
          return;
        }
        const items = getMenuSafe(db, user.id, {
          canteenId,
          search: url.searchParams.get("search") || "",
          category: url.searchParams.get("category") || "",
        });
        const categories = ["All", ...new Set(items.map((item) => item.category))];
        sendJson(response, 200, { items, categories });
        return;
      }

      const menuMatch = /^\/api\/menu\/(\d+)$/.exec(url.pathname);
      if (menuMatch && method === "GET") {
        const itemId = number(menuMatch[1]);
        const row = db.prepare(`
          SELECT m.*, c.name AS canteen_name,
            EXISTS(SELECT 1 FROM favourites f WHERE f.item_id = m.id AND f.user_id = ?) AS is_favourite
          FROM menu_items m JOIN canteens c ON c.id = m.canteen_id
          WHERE m.id = ? AND c.institution_id = ?
        `).get(user.id, itemId, user.institutionId);
        if (!row) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        const reviews = db.prepare(`
          SELECT r.id, r.rating, r.comment, r.created_at, u.name
          FROM reviews r JOIN users u ON u.id = r.user_id
          WHERE r.item_id = ? ORDER BY r.created_at DESC LIMIT 30
        `).all(itemId).map((review) => ({
          id: number(review.id),
          rating: number(review.rating),
          comment: review.comment,
          createdAt: review.created_at,
          userName: review.name,
        }));
        sendJson(response, 200, { item: mapMenuItem(row), reviews });
        return;
      }

      if (url.pathname === "/api/favourites" && method === "GET") {
        const items = db.prepare(`
          SELECT m.*, c.name AS canteen_name, 1 AS is_favourite
          FROM favourites f
          JOIN menu_items m ON m.id = f.item_id
          JOIN canteens c ON c.id = m.canteen_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `).all(user.id).map(mapMenuItem);
        sendJson(response, 200, { items });
        return;
      }

      const favouriteMatch = /^\/api\/favourites\/(\d+)$/.exec(url.pathname);
      if (favouriteMatch && method === "POST") {
        const itemId = number(favouriteMatch[1]);
        const item = db.prepare(`
          SELECT m.id FROM menu_items m JOIN canteens c ON c.id = m.canteen_id
          WHERE m.id = ? AND c.institution_id = ?
        `).get(itemId, user.institutionId);
        if (!item) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        const existing = db.prepare("SELECT 1 FROM favourites WHERE user_id = ? AND item_id = ?").get(user.id, itemId);
        if (existing) db.prepare("DELETE FROM favourites WHERE user_id = ? AND item_id = ?").run(user.id, itemId);
        else db.prepare("INSERT INTO favourites (user_id, item_id) VALUES (?, ?)").run(user.id, itemId);
        sendJson(response, 200, { itemId, isFavourite: !existing });
        return;
      }

      if (url.pathname === "/api/cart" && method === "GET") {
        sendJson(response, 200, { cart: getCart(db, user.id) });
        return;
      }

      if (url.pathname === "/api/cart/items" && method === "POST") {
        if (user.role !== "student") {
          sendError(response, 403, "Only student accounts can place orders");
          return;
        }
        const body = await readJson(request);
        const itemId = number(body.itemId);
        const quantity = Math.min(20, Math.max(1, number(body.quantity, 1)));
        const item = db.prepare(`
          SELECT m.*, c.is_open, c.institution_id
          FROM menu_items m JOIN canteens c ON c.id = m.canteen_id WHERE m.id = ?
        `).get(itemId);
        if (!item || number(item.institution_id) !== user.institutionId) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        if (!boolean(item.is_available) || !boolean(item.is_open)) {
          sendError(response, 409, "This item is not available right now");
          return;
        }
        const currentCart = getCart(db, user.id);
        if (currentCart.canteen && currentCart.canteen.id !== number(item.canteen_id)) {
          if (!body.replaceCanteen) {
            sendError(response, 409, "Your cart contains items from another canteen", { code: "CART_CANTEEN_CONFLICT" });
            return;
          }
          db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(user.id);
        }
        db.prepare(`
          INSERT INTO cart_items (user_id, item_id, quantity, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, item_id) DO UPDATE SET
            quantity = MIN(20, cart_items.quantity + excluded.quantity), updated_at = excluded.updated_at
        `).run(user.id, itemId, quantity, nowIso());
        sendJson(response, 200, { cart: getCart(db, user.id) });
        return;
      }

      const cartItemMatch = /^\/api\/cart\/items\/(\d+)$/.exec(url.pathname);
      if (cartItemMatch && method === "PATCH") {
        const body = await readJson(request);
        const itemId = number(cartItemMatch[1]);
        const quantity = number(body.quantity);
        if (quantity <= 0) db.prepare("DELETE FROM cart_items WHERE user_id = ? AND item_id = ?").run(user.id, itemId);
        else db.prepare("UPDATE cart_items SET quantity = ?, updated_at = ? WHERE user_id = ? AND item_id = ?")
          .run(Math.min(20, quantity), nowIso(), user.id, itemId);
        sendJson(response, 200, { cart: getCart(db, user.id) });
        return;
      }

      if (cartItemMatch && method === "DELETE") {
        db.prepare("DELETE FROM cart_items WHERE user_id = ? AND item_id = ?").run(user.id, number(cartItemMatch[1]));
        sendJson(response, 200, { cart: getCart(db, user.id) });
        return;
      }

      if (url.pathname === "/api/cart" && method === "DELETE") {
        db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(user.id);
        sendJson(response, 200, { cart: getCart(db, user.id) });
        return;
      }

      if (url.pathname === "/api/wallet" && method === "GET") {
        const current = db.prepare("SELECT wallet_balance, reward_tokens FROM users WHERE id = ?").get(user.id);
        const transactions = db.prepare(`
          SELECT id, type, amount, label, order_id, created_at
          FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 40
        `).all(user.id).map((row) => ({
          id: number(row.id),
          type: row.type,
          amount: number(row.amount),
          label: row.label,
          orderId: row.order_id == null ? null : number(row.order_id),
          createdAt: row.created_at,
        }));
        sendJson(response, 200, {
          balance: number(current.wallet_balance),
          rewardTokens: number(current.reward_tokens),
          transactions,
        });
        return;
      }

      if (url.pathname === "/api/wallet/top-up" && method === "POST") {
        if (user.role !== "student") {
          sendError(response, 403, "Only student wallets can be topped up");
          return;
        }
        const body = await readJson(request);
        const amount = number(body.amount);
        if (![100, 250, 500, 1000].includes(amount)) {
          sendError(response, 400, "Choose a supported top-up amount");
          return;
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(amount, user.id);
          db.prepare(`
            INSERT INTO wallet_transactions (user_id, type, amount, label)
            VALUES (?, 'credit', ?, 'Demo wallet top-up')
          `).run(user.id, amount);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        const current = db.prepare("SELECT wallet_balance, reward_tokens FROM users WHERE id = ?").get(user.id);
        sendJson(response, 200, { balance: number(current.wallet_balance), rewardTokens: number(current.reward_tokens) });
        return;
      }

      if (url.pathname === "/api/orders" && method === "POST") {
        if (user.role !== "student") {
          sendError(response, 403, "Admin accounts cannot place student orders");
          return;
        }
        const body = await readJson(request);
        const paymentProvider = ["wallet", "gpay", "phonepe"].includes(body.paymentMethod) ? body.paymentMethod : "wallet";
        const paymentMethod = paymentProvider === "wallet" ? "wallet" : "counter";
        const cart = getCart(db, user.id);
        if (!cart.items.length || !cart.canteen) {
          sendError(response, 400, "Your cart is empty");
          return;
        }
        if (!cart.canteen.isOpen || cart.items.some((item) => !item.isAvailable)) {
          sendError(response, 409, "One or more cart items are no longer available");
          return;
        }
        const balance = number(db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(user.id).wallet_balance);
        if (paymentMethod === "wallet" && balance < cart.total) {
          sendError(response, 409, "Your wallet balance is too low", { code: "INSUFFICIENT_BALANCE" });
          return;
        }

        let orderId;
        db.exec("BEGIN IMMEDIATE");
        try {
          const tokenRow = db.prepare("SELECT COALESCE(MAX(token_number), 0) AS max_token FROM orders WHERE canteen_id = ?").get(cart.canteen.id);
          const tokenNumber = Math.max(number(tokenRow.max_token), cart.canteen.servingNumber) + 1;
          const collectionCode = randomBytes(12).toString("hex").toUpperCase();
          orderId = insertedId(db.prepare(`
            INSERT INTO orders
            (user_id, canteen_id, collection_code, token_number, status, subtotal, service_fee, total, payment_method, payment_provider)
            VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?)
          `).run(user.id, cart.canteen.id, collectionCode, tokenNumber, cart.subtotal, 0, cart.total, paymentMethod, paymentProvider));
          const orderNumber = `ORD-${dateCode()}-${String(orderId).padStart(4, "0")}`;
          db.prepare("UPDATE orders SET order_number = ? WHERE id = ?").run(orderNumber, orderId);
          const insertOrderItem = db.prepare(`
            INSERT INTO order_items (order_id, item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)
          `);
          cart.items.forEach((item) => insertOrderItem.run(orderId, item.id, item.name, item.finalPrice, item.quantity));
          const earnedTokens = Math.max(1, Math.floor(cart.total / 50));
          if (paymentMethod === "wallet") {
            db.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, reward_tokens = reward_tokens + ? WHERE id = ?")
              .run(cart.total, earnedTokens, user.id);
            db.prepare(`
              INSERT INTO wallet_transactions (user_id, type, amount, label, order_id)
              VALUES (?, 'debit', ?, ?, ?)
            `).run(user.id, cart.total, `Order ${orderNumber}`, orderId);
          } else {
            db.prepare("UPDATE users SET reward_tokens = reward_tokens + ? WHERE id = ?").run(earnedTokens, user.id);
          }
          db.prepare(`
            INSERT INTO wallet_transactions (user_id, type, amount, label, order_id)
            VALUES (?, 'reward', ?, 'Order reward points', ?)
          `).run(user.id, earnedTokens, orderId);
          db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(user.id);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        const order = getOrderById(db, orderId, user);
        broadcaster.publish("order", { action: "created", orderId, canteenId: order.canteen.id, userId: user.id });
        sendJson(response, 201, { order, cart: getCart(db, user.id) });
        return;
      }

      if (url.pathname === "/api/orders" && method === "GET") {
        sendJson(response, 200, { orders: getOrders(db, user.id) });
        return;
      }

      const orderMatch = /^\/api\/orders\/(\d+)$/.exec(url.pathname);
      if (orderMatch && method === "GET") {
        const order = getOrderById(db, number(orderMatch[1]), user);
        if (!order) {
          sendError(response, 404, "Order not found");
          return;
        }
        sendJson(response, 200, { order });
        return;
      }

      const cancelOrderMatch = /^\/api\/orders\/(\d+)\/cancel$/.exec(url.pathname);
      if (cancelOrderMatch && method === "POST") {
        const order = getOrderById(db, number(cancelOrderMatch[1]), user);
        if (!order) {
          sendError(response, 404, "Order not found");
          return;
        }
        if (order.status !== "queued") {
          sendError(response, 409, "Only queued orders can be cancelled");
          return;
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(nowIso(), order.id);
          if (order.paymentMethod === "wallet") {
            db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(order.total, user.id);
            db.prepare(`
              INSERT INTO wallet_transactions (user_id, type, amount, label, order_id)
              VALUES (?, 'refund', ?, ?, ?)
            `).run(user.id, order.total, `Refund for ${order.orderNumber}`, order.id);
          }
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        broadcaster.publish("order", { action: "cancelled", orderId: order.id, canteenId: order.canteen.id, userId: user.id });
        sendJson(response, 200, { order: getOrderById(db, order.id, user) });
        return;
      }

      if (url.pathname === "/api/reviews" && method === "POST") {
        if (user.role !== "student") {
          sendError(response, 403, "Only student accounts can write reviews");
          return;
        }
        const body = await readJson(request);
        const itemId = number(body.itemId);
        const rating = Math.round(number(body.rating));
        const comment = String(body.comment || "").trim();
        if (rating < 1 || rating > 5 || comment.length < 8 || comment.length > 500) {
          sendError(response, 400, "Choose 1 to 5 stars and write at least 8 characters");
          return;
        }
        const hasCompletedOrder = db.prepare(`
          SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.user_id = ? AND oi.item_id = ? AND o.status = 'completed' LIMIT 1
        `).get(user.id, itemId);
        const item = db.prepare("SELECT id FROM menu_items WHERE id = ?").get(itemId);
        if (!item) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        db.prepare(`
          INSERT INTO reviews (user_id, item_id, rating, comment, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, item_id) DO UPDATE SET
            rating = excluded.rating, comment = excluded.comment, updated_at = excluded.updated_at
        `).run(user.id, itemId, rating, comment, nowIso());
        updateMenuRating(db, itemId);
        sendJson(response, 201, { ok: true, verifiedPurchase: Boolean(hasCompletedOrder) });
        return;
      }

      if (url.pathname.startsWith("/api/worker/") && user.role !== "worker") {
        sendError(response, 403, "Worker access is required");
        return;
      }

      if (url.pathname === "/api/worker/lookup" && method === "POST") {
        const body = await readJson(request);
        const code = normalizeCollectionCode(body.code);
        if (!code) {
          sendError(response, 400, "Scan a collection QR or enter an order number");
          return;
        }
        const row = db.prepare(`
          SELECT o.id
          FROM orders o
          JOIN worker_canteens wc ON wc.canteen_id = o.canteen_id
          WHERE wc.user_id = ? AND (UPPER(o.collection_code) = ? OR UPPER(o.order_number) = ?)
          LIMIT 1
        `).get(user.id, code, code);
        const order = row ? getWorkerOrder(db, number(row.id), user) : null;
        if (!order) {
          sendError(response, 404, "This order was not found for your assigned canteen");
          return;
        }
        sendJson(response, 200, { order });
        return;
      }

      const workerItemMatch = /^\/api\/worker\/orders\/(\d+)\/items\/(\d+)$/.exec(url.pathname);
      if (workerItemMatch && method === "PATCH") {
        const orderId = number(workerItemMatch[1]);
        const itemId = number(workerItemMatch[2]);
        const order = getWorkerOrder(db, orderId, user);
        if (!order) {
          sendError(response, 404, "Order not found");
          return;
        }
        if (order.status !== "ready") {
          sendError(response, 409, order.status === "completed" || order.status === "cancelled"
            ? "This order can no longer be changed"
            : "The kitchen must mark this order ready before handover");
          return;
        }
        const item = order.items.find((entry) => entry.id === itemId);
        if (!item) {
          sendError(response, 404, "Order item not found");
          return;
        }
        const body = await readJson(request);
        const servedQuantity = body.served ? item.quantity : 0;
        db.prepare(`
          UPDATE order_items SET served_quantity = ?, served_at = ?, served_by = ? WHERE id = ? AND order_id = ?
        `).run(servedQuantity, body.served ? nowIso() : null, body.served ? user.id : null, itemId, orderId);
        broadcaster.publish("order", { action: "item-served", orderId, canteenId: order.canteen.id });
        sendJson(response, 200, { order: getWorkerOrder(db, orderId, user) });
        return;
      }

      const workerCompleteMatch = /^\/api\/worker\/orders\/(\d+)\/complete$/.exec(url.pathname);
      if (workerCompleteMatch && method === "POST") {
        const orderId = number(workerCompleteMatch[1]);
        const order = getWorkerOrder(db, orderId, user);
        if (!order) {
          sendError(response, 404, "Order not found");
          return;
        }
        if (order.status === "completed") {
          sendJson(response, 200, { order });
          return;
        }
        if (order.status === "cancelled") {
          sendError(response, 409, "Cancelled orders cannot be served");
          return;
        }
        if (order.status !== "ready") {
          sendError(response, 409, "The kitchen must mark this order ready before handover");
          return;
        }
        if (!order.items.length || order.items.some((item) => !item.isServed)) {
          sendError(response, 409, "Check every product before completing the handover");
          return;
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE orders SET status = 'completed', updated_at = ? WHERE id = ?").run(nowIso(), orderId);
          db.prepare("UPDATE canteens SET serving_number = MAX(serving_number, ?) WHERE id = ?")
            .run(order.tokenNumber, order.canteen.id);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        broadcaster.publish("order", { action: "completed", orderId, status: "completed", canteenId: order.canteen.id });
        sendJson(response, 200, { order: getWorkerOrder(db, orderId, user) });
        return;
      }

      if (url.pathname.startsWith("/api/admin/") && user.role !== "admin") {
        sendError(response, 403, "Administrator access is required");
        return;
      }

      if (url.pathname === "/api/admin/summary" && method === "GET") {
        const canteenId = number(url.searchParams.get("canteenId"));
        const canteen = db.prepare("SELECT * FROM canteens WHERE id = ? AND institution_id = ?").get(canteenId, user.institutionId);
        if (!canteen) {
          sendError(response, 404, "Canteen not found");
          return;
        }
        const totals = db.prepare(`
          SELECT
            COUNT(*) AS total_orders,
            SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today_orders,
            SUM(CASE WHEN date(created_at) = date('now') AND status != 'cancelled' THEN total ELSE 0 END) AS today_revenue,
            SUM(CASE WHEN status IN ('queued', 'preparing', 'ready') THEN 1 ELSE 0 END) AS active_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders
          FROM orders WHERE canteen_id = ?
        `).get(canteenId);
        const menuStats = db.prepare(`
          SELECT COUNT(*) AS menu_items, AVG(rating) AS average_rating FROM menu_items WHERE canteen_id = ?
        `).get(canteenId);
        const activeOrders = db.prepare(`
          SELECT o.*, c.name AS canteen_name, c.short_name AS canteen_short_name,
            c.token_prefix, c.serving_number, c.average_service_minutes,
            u.name AS customer_name
          FROM orders o
          JOIN canteens c ON c.id = o.canteen_id
          JOIN users u ON u.id = o.user_id
          WHERE o.canteen_id = ? AND o.status IN ('queued', 'preparing', 'ready')
          ORDER BY o.token_number
        `).all(canteenId).map((row) => ({ ...mapOrder(db, row), customerName: row.customer_name }));
        const recentOrders = db.prepare(`
          SELECT o.*, c.name AS canteen_name, c.short_name AS canteen_short_name,
            c.token_prefix, c.serving_number, c.average_service_minutes,
            u.name AS customer_name
          FROM orders o
          JOIN canteens c ON c.id = o.canteen_id
          JOIN users u ON u.id = o.user_id
          WHERE o.canteen_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 20
        `).all(canteenId).map((row) => ({ ...mapOrder(db, row), customerName: row.customer_name }));
        const menu = getMenuSafe(db, user.id, { canteenId });
        sendJson(response, 200, {
          canteen: {
            ...getCanteens(db, user.institutionId).find((entry) => entry.id === canteenId),
          },
          metrics: {
            totalOrders: number(totals.total_orders),
            todayOrders: number(totals.today_orders),
            todayRevenue: number(totals.today_revenue),
            activeOrders: number(totals.active_orders),
            completedOrders: number(totals.completed_orders),
            menuItems: number(menuStats.menu_items),
            averageRating: Number(number(menuStats.average_rating).toFixed(1)),
          },
          activeOrders,
          recentOrders,
          menu,
        });
        return;
      }

      const adminOrderMatch = /^\/api\/admin\/orders\/(\d+)\/status$/.exec(url.pathname);
      if (adminOrderMatch && method === "POST") {
        const body = await readJson(request);
        const status = String(body.status || "");
        if (!ORDER_STATUSES.includes(status)) {
          sendError(response, 400, "Invalid order status");
          return;
        }
        if (status === "completed") {
          sendError(response, 403, "Complete handovers through the worker QR checklist");
          return;
        }
        const orderId = number(adminOrderMatch[1]);
        const order = getOrderById(db, orderId, user);
        if (!order || !getCanteens(db, user.institutionId).some((entry) => entry.id === order.canteen.id)) {
          sendError(response, 404, "Order not found");
          return;
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), orderId);
          if (status === "cancelled" && order.paymentMethod === "wallet") {
            db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = (SELECT user_id FROM orders WHERE id = ?)")
              .run(order.total, orderId);
            db.prepare(`
              INSERT INTO wallet_transactions (user_id, type, amount, label, order_id)
              VALUES ((SELECT user_id FROM orders WHERE id = ?), 'refund', ?, ?, ?)
            `).run(orderId, order.total, `Refund for ${order.orderNumber}`, orderId);
          }
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        broadcaster.publish("order", { action: "status", orderId, status, canteenId: order.canteen.id });
        sendJson(response, 200, { order: getOrderById(db, orderId, user) });
        return;
      }

      const advanceMatch = /^\/api\/admin\/canteens\/(\d+)\/advance$/.exec(url.pathname);
      if (advanceMatch && method === "POST") {
        const canteenId = number(advanceMatch[1]);
        const canteen = db.prepare("SELECT * FROM canteens WHERE id = ? AND institution_id = ?").get(canteenId, user.institutionId);
        if (!canteen) {
          sendError(response, 404, "Canteen not found");
          return;
        }
        const nextOrder = db.prepare(`
          SELECT * FROM orders WHERE canteen_id = ? AND status IN ('queued', 'preparing')
          ORDER BY token_number LIMIT 1
        `).get(canteenId);
        if (!nextOrder) {
          sendError(response, 409, "No queued orders need preparation. Ready orders wait for worker QR handover");
          return;
        }
        const nextStatus = nextOrder.status === "queued" ? "preparing" : "ready";
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(nextStatus, nowIso(), nextOrder.id);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        broadcaster.publish("order", { action: "advanced", orderId: number(nextOrder.id), status: nextStatus, canteenId });
        sendJson(response, 200, { orderId: number(nextOrder.id), status: nextStatus });
        return;
      }

      if (url.pathname === "/api/admin/upload" && method === "POST") {
        const body = await readJson(request);
        try {
          const imageUrl = options.uploadImage
            ? await options.uploadImage(body.dataUrl, body.fileName)
            : uploadImage(body.dataUrl, body.fileName);
          sendJson(response, 201, { imageUrl });
        } catch (error) {
          sendError(response, error.statusCode || 400, error.message);
        }
        return;
      }

      if (url.pathname === "/api/admin/menu" && method === "POST") {
        const body = await readJson(request);
        const canteenId = number(body.canteenId);
        const canteen = db.prepare("SELECT id FROM canteens WHERE id = ? AND institution_id = ?").get(canteenId, user.institutionId);
        if (!canteen || !String(body.name || "").trim() || number(body.price) <= 0) {
          sendError(response, 400, "Canteen, item name and a valid price are required");
          return;
        }
        const result = db.prepare(`
          INSERT INTO menu_items
          (canteen_id, name, category, description, price, discount, image_url, prep_minutes, is_veg, is_available, featured)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          canteenId,
          String(body.name).trim(),
          String(body.category || "Meals").trim(),
          String(body.description || "Freshly prepared on campus.").trim(),
          Math.round(number(body.price)),
          Math.max(0, Math.round(number(body.discount))),
          String(body.imageUrl || "/assets/foods/rice-and-curry.png"),
          Math.max(1, Math.round(number(body.prepMinutes, 8))),
          body.isVeg ? 1 : 0,
          body.isAvailable === false ? 0 : 1,
          body.featured ? 1 : 0,
        );
        broadcaster.publish("menu", { action: "created", itemId: insertedId(result), canteenId });
        sendJson(response, 201, { itemId: insertedId(result) });
        return;
      }

      const adminMenuMatch = /^\/api\/admin\/menu\/(\d+)$/.exec(url.pathname);
      if (adminMenuMatch && method === "PATCH") {
        const itemId = number(adminMenuMatch[1]);
        const existing = db.prepare(`
          SELECT m.* FROM menu_items m JOIN canteens c ON c.id = m.canteen_id
          WHERE m.id = ? AND c.institution_id = ?
        `).get(itemId, user.institutionId);
        if (!existing) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        const body = await readJson(request);
        db.prepare(`
          UPDATE menu_items SET
            name = ?, category = ?, description = ?, price = ?, discount = ?, image_url = ?,
            prep_minutes = ?, is_veg = ?, is_available = ?, featured = ?
          WHERE id = ?
        `).run(
          String(body.name ?? existing.name).trim(),
          String(body.category ?? existing.category).trim(),
          String(body.description ?? existing.description).trim(),
          Math.max(0, Math.round(number(body.price, existing.price))),
          Math.max(0, Math.round(number(body.discount, existing.discount))),
          String(body.imageUrl ?? existing.image_url),
          Math.max(1, Math.round(number(body.prepMinutes, existing.prep_minutes))),
          body.isVeg == null ? existing.is_veg : body.isVeg ? 1 : 0,
          body.isAvailable == null ? existing.is_available : body.isAvailable ? 1 : 0,
          body.featured == null ? existing.featured : body.featured ? 1 : 0,
          itemId,
        );
        broadcaster.publish("menu", { action: "updated", itemId, canteenId: number(existing.canteen_id) });
        sendJson(response, 200, { ok: true });
        return;
      }

      if (adminMenuMatch && method === "DELETE") {
        const itemId = number(adminMenuMatch[1]);
        const existing = db.prepare(`
          SELECT m.* FROM menu_items m JOIN canteens c ON c.id = m.canteen_id
          WHERE m.id = ? AND c.institution_id = ?
        `).get(itemId, user.institutionId);
        if (!existing) {
          sendError(response, 404, "Menu item not found");
          return;
        }
        db.prepare("UPDATE menu_items SET is_available = 0 WHERE id = ?").run(itemId);
        broadcaster.publish("menu", { action: "archived", itemId, canteenId: number(existing.canteen_id) });
        sendJson(response, 200, { ok: true });
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        sendError(response, 404, "API route not found");
        return;
      }

      if (method !== "GET" && method !== "HEAD") {
        sendError(response, 405, "Method not allowed");
        return;
      }
      serveStatic(request, response, url);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) sendError(response, error.statusCode || 500, error.statusCode ? error.message : "The server could not complete that request");
      else response.end();
    }
  });

  return {
    databasePath,
    db,
    server,
    async start(port = options.port ?? number(process.env.PORT, 3000), host = options.host || process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")) {
      await new Promise((resolveStart, rejectStart) => {
        server.once("error", rejectStart);
        server.listen(port, host, () => {
          server.off("error", rejectStart);
          resolveStart();
        });
      });
      return server.address();
    },
    async close() {
      clearInterval(heartbeat);
      await new Promise((resolveClose) => server.close(resolveClose));
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.close();
    },
  };
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMainModule) {
  const app = createCanteenServer();
  app.start().then((address) => {
    const host = address.address === "::" ? "localhost" : address.address;
    console.log(`Cafe de Move On! is running at http://${host}:${address.port}`);
    console.log("Student: student@ngpit.ac.in / student123");
    console.log("Worker:  worker@ngpit.ac.in / worker123");
    console.log("Admin:   admin@ngpit.ac.in / admin123");
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
