const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const DEMO_WORKER_ORDER_ID = "SEED-1-218";

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5v-8Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  orders: '<path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-4-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  wallet: '<path d="M3 7a3 3 0 0 1 3-3h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7Z"/><path d="M3 8h16M16 13h5v4h-5a2 2 0 1 1 0-4Z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  star: '<path d="m12 2.8 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9L12 2.8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-8 8-16Z"/><path d="M4 21c2-6 7-10 13-13"/>',
  traffic: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="14" r="4"/>',
  qr: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2v6h-2M15 19h2v2h-2"/>',
  scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M7 12h10"/>',
  building: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 10h.01M15 10h.01"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.4-1.6-.7-2.6-.7-1.5 0-2.7.7-2.7 1.8 0 2.9 5.6 1.3 5.6 4.3 0 1.2-1.2 2-2.9 2-.9 0-2-.3-2.8-.8M12.5 6v12"/>',
  bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
};

const state = {
  route: "splash",
  splashStage: "Loading campus kitchens",
  token: localStorage.getItem("canteenflow_token") || "",
  user: null,
  canteens: [],
  currentCanteenId: Number(localStorage.getItem("canteenflow_canteen")) || null,
  menu: [],
  categories: ["All"],
  category: "All",
  search: "",
  cart: { items: [], itemCount: 0, subtotal: 0, serviceFee: 0, total: 0, canteen: null },
  favouriteIds: new Set(),
  favourites: [],
  orders: [],
  selectedItem: null,
  selectedItemReviews: [],
  selectedOrder: null,
  itemQuantity: 1,
  wallet: null,
  paymentMethod: "wallet",
  authRole: "student",
  authView: "login",
  adminTab: "overview",
  adminSummary: null,
  adminEditing: null,
  workerOrder: null,
  workerScanning: false,
  workerCameraError: "",
  reviewRating: 5,
  processing: false,
  loading: false,
  eventSource: null,
};

let menuRequestId = 0;
let adminRequestId = 0;
const actionLocks = new Set();
let workerCameraStream = null;
let workerScanFrame = 0;

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currency(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function paymentLabel(order) {
  const provider = order?.paymentProvider || order?.paymentMethod;
  return ({ wallet: "Wallet paid", gpay: "Google Pay", phonepe: "PhonePe", counter: "Pay at counter" })[provider] || "Paid online";
}

function initials(name) {
  return String(name || "CF").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runOnce(key, callback) {
  if (actionLocks.has(key)) return undefined;
  actionLocks.add(key);
  try {
    return await callback();
  } finally {
    actionLocks.delete(key);
  }
}

function formatDate(value, options = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.innerHTML = `${icon(tone === "success" ? "check" : "info")}<span>${escapeHtml(message)}</span>`;
  toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function showActionFeedback(title, message, tone = "success") {
  document.querySelector(".action-feedback-layer")?.remove();
  const layer = document.createElement("div");
  layer.className = `action-feedback-layer feedback-${tone}`;
  layer.setAttribute("role", "status");
  layer.innerHTML = `<div class="action-feedback-card"><span class="feedback-check">${icon(tone === "success" ? "check" : "info")}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  document.body.append(layer);
  requestAnimationFrame(() => layer.classList.add("is-visible"));
  setTimeout(() => {
    layer.classList.remove("is-visible");
    setTimeout(() => layer.remove(), 260);
  }, 1650);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Something went wrong");
    error.status = response.status;
    error.details = payload.details;
    if (response.status === 401 && state.user) logout(false);
    throw error;
  }
  return payload;
}

function currentCanteen() {
  return state.canteens.find((canteen) => canteen.id === state.currentCanteenId) || state.canteens[0] || null;
}

function trafficMeta(level) {
  if (level === "high") return { label: "Busy now", className: "high" };
  if (level === "moderate") return { label: "Moderate", className: "moderate" };
  return { label: "Moving fast", className: "low" };
}

function orderStatus(status) {
  const statuses = {
    queued: { label: "In queue", description: "Your order is waiting to be prepared.", step: 1 },
    preparing: { label: "Preparing", description: "The kitchen is making your order now.", step: 2 },
    ready: { label: "Ready to collect", description: "Show the collection QR to the serving worker.", step: 3 },
    completed: { label: "Collected", description: "This order has been completed.", step: 4 },
    cancelled: { label: "Cancelled", description: "This order was cancelled.", step: 0 },
  };
  return statuses[status] || statuses.queued;
}

function stars(rating, compact = false) {
  const rounded = Math.round(Number(rating || 0));
  return `<span class="stars ${compact ? "stars-compact" : ""}">${Array.from({ length: 5 }, (_, index) => icon("star", index < rounded ? "is-filled" : "")).join("")}</span>`;
}

async function hydrate() {
  const data = await api("/api/bootstrap");
  state.user = data.user;
  state.canteens = data.canteens;
  state.cart = data.cart;
  state.favouriteIds = new Set(data.favouriteIds);
  state.orders = data.orders || [];
  if (!state.canteens.some((canteen) => canteen.id === state.currentCanteenId)) {
    state.currentCanteenId = state.canteens[0]?.id || null;
  }
  if (state.currentCanteenId) localStorage.setItem("canteenflow_canteen", String(state.currentCanteenId));
}

async function loadMenu({ quiet = false } = {}) {
  if (!state.currentCanteenId) return;
  const requestId = ++menuRequestId;
  if (!quiet) {
    state.loading = true;
    render();
  }
  try {
    const query = new URLSearchParams({ canteenId: state.currentCanteenId });
    if (state.search.trim()) query.set("search", state.search.trim());
    if (state.category !== "All") query.set("category", state.category);
    const data = await api(`/api/menu?${query}`);
    if (requestId !== menuRequestId) return;
    state.menu = data.items;
    if (!state.search && state.category === "All") state.categories = data.categories;
  } catch (error) {
    if (requestId === menuRequestId) showToast(error.message, "error");
  } finally {
    if (requestId === menuRequestId) {
      state.loading = false;
      render();
    }
  }
}

async function loadItem(itemId) {
  state.route = "item";
  state.selectedItem = null;
  state.selectedItemReviews = [];
  state.itemQuantity = 1;
  render();
  try {
    const data = await api(`/api/menu/${itemId}`);
    state.selectedItem = data.item;
    state.selectedItemReviews = data.reviews;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showToast(error.message, "error");
    navigate("home");
  }
}

async function loadFavourites() {
  state.loading = true;
  render();
  try {
    const data = await api("/api/favourites");
    state.favourites = data.items;
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.loading = false;
    render();
  }
}

async function loadWallet() {
  state.loading = true;
  render();
  try {
    state.wallet = await api("/api/wallet");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.loading = false;
    render();
  }
}

async function loadOrders() {
  try {
    const data = await api("/api/orders");
    state.orders = data.orders;
    if (state.selectedOrder) {
      const refreshedOrder = state.orders.find((order) => order.id === state.selectedOrder.id);
      if (refreshedOrder) state.selectedOrder = { ...refreshedOrder, collectionQrSvg: state.selectedOrder.collectionQrSvg };
    }
  } catch (error) {
    showToast(error.message, "error");
  }
  render();
}

async function loadAdmin({ quiet = false } = {}) {
  if (!state.currentCanteenId) return;
  const requestId = ++adminRequestId;
  if (!quiet) {
    state.loading = true;
    render();
  }
  try {
    const summary = await api(`/api/admin/summary?canteenId=${state.currentCanteenId}`);
    if (requestId !== adminRequestId) return;
    state.adminSummary = summary;
  } catch (error) {
    if (requestId === adminRequestId) showToast(error.message, "error");
  } finally {
    if (requestId === adminRequestId) {
      state.loading = false;
      render();
    }
  }
}

function stopWorkerScanner({ renderView = false } = {}) {
  cancelAnimationFrame(workerScanFrame);
  workerScanFrame = 0;
  workerCameraStream?.getTracks().forEach((track) => track.stop());
  workerCameraStream = null;
  state.workerScanning = false;
  if (renderView) render();
}

async function lookupWorkerOrder(code, { quiet = false } = {}) {
  stopWorkerScanner();
  if (!quiet) {
    state.loading = true;
    render();
  }
  try {
    const data = await api("/api/worker/lookup", { method: "POST", body: JSON.stringify({ code }) });
    state.workerOrder = data.order;
    state.workerCameraError = "";
    return true;
  } catch (error) {
    if (!quiet) showToast(error.message, "error");
    return false;
  } finally {
    state.loading = false;
    render();
  }
}

async function startWorkerScanner() {
  if (state.workerScanning) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    state.workerCameraError = "Camera access is unavailable. Enter the order number below.";
    render();
    return;
  }
  if (!("BarcodeDetector" in window)) {
    state.workerCameraError = "QR camera scanning is not supported in this browser. Enter the order number below.";
    render();
    return;
  }

  state.workerCameraError = "";
  state.workerScanning = true;
  render();
  try {
    workerCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const video = document.querySelector("#worker-camera");
    if (!video || !state.workerScanning) {
      stopWorkerScanner();
      return;
    }
    video.srcObject = workerCameraStream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    let lastDetection = 0;
    const detect = async (timestamp) => {
      if (!state.workerScanning || !workerCameraStream) return;
      if (timestamp - lastDetection > 180 && video.readyState >= 2) {
        lastDetection = timestamp;
        const codes = await detector.detect(video).catch(() => []);
        const code = codes.find((entry) => entry.rawValue)?.rawValue;
        if (code) {
          await lookupWorkerOrder(code);
          return;
        }
      }
      workerScanFrame = requestAnimationFrame(detect);
    };
    workerScanFrame = requestAnimationFrame(detect);
  } catch (error) {
    stopWorkerScanner();
    state.workerCameraError = error.name === "NotAllowedError"
      ? "Camera permission was denied. Enter the order number below."
      : "The camera could not start. Enter the order number below.";
    render();
  }
}

async function toggleWorkerItem(itemId, served) {
  if (!state.workerOrder) return;
  await runOnce(`worker:item:${itemId}`, async () => {
    try {
      const data = await api(`/api/worker/orders/${state.workerOrder.id}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ served }),
      });
      state.workerOrder = data.order;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function completeWorkerOrder() {
  if (!state.workerOrder) return;
  await runOnce(`worker:complete:${state.workerOrder.id}`, async () => {
    try {
      const data = await api(`/api/worker/orders/${state.workerOrder.id}/complete`, { method: "POST" });
      state.workerOrder = data.order;
      render();
      showToast("Handover completed");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function connectLiveEvents() {
  if (!state.token || typeof EventSource === "undefined") return;
  state.eventSource?.close();
  const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(state.token)}`);
  let refreshTimer;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try {
        const canteenData = await api("/api/canteens");
        state.canteens = canteenData.canteens;
        if (state.user?.role === "admin") await loadAdmin({ quiet: true });
        else if (state.user?.role === "worker") {
          if (state.workerOrder && !state.workerScanning) await lookupWorkerOrder(state.workerOrder.collectionCode, { quiet: true });
        } else await loadOrders();
      } catch {
        // The next server event or navigation will retry the live refresh.
      }
    }, 180);
  };
  eventSource.addEventListener("order", refresh);
  eventSource.addEventListener("menu", async () => {
    if (state.user?.role === "admin") await loadAdmin({ quiet: true });
    else if (state.user?.role === "student") await loadMenu({ quiet: true });
  });
  state.eventSource = eventSource;
}

function navigate(route) {
  state.route = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function startAuthenticatedApp({ deferRender = false } = {}) {
  await hydrate();
  connectLiveEvents();
  if (state.user.role === "admin") {
    state.route = deferRender ? "splash" : "admin";
    await loadAdmin({ quiet: deferRender });
    state.route = "admin";
  } else if (state.user.role === "worker") {
    state.route = deferRender ? "splash" : "worker";
    if (!deferRender) render();
    state.route = "worker";
  } else {
    state.route = deferRender ? "splash" : "home";
    await loadMenu({ quiet: deferRender });
    state.route = "home";
  }
}

async function boot() {
  render();
  const splash = (async () => {
    await delay(320);
    state.splashStage = "Checking live queues";
    render();
    await delay(420);
    state.splashStage = "Preparing your menu";
    render();
    await delay(360);
  })();

  if (state.token) {
    try {
      await Promise.all([splash, startAuthenticatedApp({ deferRender: true })]);
      render();
      return;
    } catch {
      localStorage.removeItem("canteenflow_token");
      state.token = "";
      state.user = null;
    }
  }
  await splash;
  state.route = "auth";
  render();
}

function logout(callApi = true) {
  if (callApi && state.token) api("/api/auth/logout", { method: "POST" }).catch(() => {});
  state.eventSource?.close();
  stopWorkerScanner();
  localStorage.removeItem("canteenflow_token");
  state.token = "";
  state.user = null;
  state.canteens = [];
  state.menu = [];
  state.orders = [];
  state.workerOrder = null;
  state.workerCameraError = "";
  state.cart = { items: [], itemCount: 0, subtotal: 0, serviceFee: 0, total: 0, canteen: null };
  state.route = "auth";
  state.authView = "login";
  render();
}

function renderSplash() {
  const stages = ["Loading campus kitchens", "Checking live queues", "Preparing your menu"];
  const stageIndex = Math.max(0, stages.indexOf(state.splashStage));
  const progress = ((stageIndex + 1) / stages.length) * 100;
  return `
    <section class="splash-screen">
      <div class="splash-glow glow-one"></div>
      <div class="splash-glow glow-two"></div>
      <div class="splash-shell">
        <div class="splash-emblem" aria-hidden="true">
          <span class="splash-ring ring-one"></span>
          <span class="splash-ring ring-two"></span>
          <span class="splash-mark"><img src="/assets/cafe-de-move-on-logo.png" alt="" /></span>
        </div>
        <div class="splash-copy">
          <span>NGP Campus Dining</span>
          <h1>Cafe de Move On!</h1>
          <p>Order ahead. Collect on time.</p>
        </div>
        <div class="splash-loader" role="status" aria-live="polite" aria-label="${escapeHtml(state.splashStage)}">
          <div class="splash-status"><span>0${stageIndex + 1}</span>${escapeHtml(state.splashStage)}</div>
          <div class="progress-track"><span style="width:${progress}%"></span></div>
          <div class="splash-steps" aria-hidden="true">${stages.map((_, index) => `<i class="${index < stageIndex ? "is-complete" : index === stageIndex ? "is-active" : ""}"></i>`).join("")}</div>
        </div>
      </div>
    </section>
  `;
}

function renderAppLoader(label = "Loading") {
  return `
    <div class="app-loader" role="status" aria-live="polite">
      <span class="app-loader-orbit"><i></i><span>${icon("leaf")}</span></span>
      <strong>${escapeHtml(label)}</strong>
    </div>
  `;
}

function renderAuth() {
  const isLogin = state.authView === "login";
  const isStudent = state.authRole === "student";
  const isWorker = state.authRole === "worker";
  const isAdmin = state.authRole === "admin";
  const demoEmail = isAdmin ? "admin@ngpit.ac.in" : isWorker ? "worker@ngpit.ac.in" : "student@ngpit.ac.in";
  const demoPassword = isAdmin ? "admin123" : isWorker ? "worker123" : "student123";
  const roleDescription = isAdmin
    ? "Control every canteen, menu, and preparation queue."
    : isWorker ? "Scan collection QR codes and confirm each served product."
      : "Choose a canteen, order food, and show your collection QR.";
  return `
    <section class="auth-page">
      <div class="auth-visual">
        <img src="/assets/foods/rice-and-curry.png" alt="Fresh rice and curry meal" />
        <div class="auth-visual-shade"></div>
        <div class="auth-visual-copy">
          <span class="eyebrow">N.G.P. Institute of Technology</span>
          <h2>Less queue.<br />More lunch.</h2>
        </div>
      </div>
      <div class="auth-panel">
        <div class="brand-lockup">
          <span class="brand-mark brand-logo"><img src="/assets/cafe-de-move-on-logo.png" alt="" /></span>
          <div><strong>Cafe de Move On!</strong><small>Campus canteens</small></div>
        </div>
        <div class="role-switch" aria-label="Account type">
          <button class="${isStudent ? "is-active" : ""}" data-action="auth-role" data-role="student">Student</button>
          <button class="${isWorker ? "is-active" : ""}" data-action="auth-role" data-role="worker">Worker</button>
          <button class="${isAdmin ? "is-active" : ""}" data-action="auth-role" data-role="admin">Admin</button>
        </div>
        <div class="auth-heading">
          <span class="eyebrow">${isAdmin ? "Admin access" : isWorker ? "Worker access" : "Student access"}</span>
          <h1>${isLogin ? "Sign in" : "Create account"}</h1>
          <p>${roleDescription}</p>
        </div>
        <form id="auth-form" class="form-stack">
          ${!isLogin && isStudent ? `
            <label class="input-field"><span>Full name</span><input name="name" autocomplete="name" required minlength="2" placeholder="Demo Student" /></label>
          ` : ""}
          <label class="input-field"><span>College email</span><input name="email" type="email" autocomplete="email" required value="${demoEmail}" /></label>
          ${!isLogin && isStudent ? `
            <label class="input-field"><span>Canteen code</span><input name="institutionCode" required value="ngpit663" /></label>
          ` : ""}
          <label class="input-field"><span>Password</span><input name="password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required minlength="8" value="${demoPassword}" /></label>
          <button class="primary-button" type="submit" ${state.processing ? "disabled" : ""}>
            ${state.processing ? '<span class="button-spinner"></span> Signing in' : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
        ${isWorker ? `
          <div class="worker-demo-order">
            <span>${icon("orders")}</span>
            <div><small>Sample order ID</small><strong>${DEMO_WORKER_ORDER_ID}</strong><p>Use this after signing in to open a sample order.</p></div>
          </div>
        ` : ""}
        ${isStudent ? `
          <button class="auth-link" data-action="auth-view" data-view="${isLogin ? "register" : "login"}">
            ${isLogin ? "New here? Create a student account" : "Already have an account? Sign in"}
          </button>
        ` : ""}
      </div>
    </section>
  `;
}

function customerHeader({ title, back = "home", showWallet = true, showCart = true } = {}) {
  if (title) {
    return `
      <header class="screen-header">
        <button class="icon-button" data-action="navigate" data-route="${back}" aria-label="Go back">${icon("back")}</button>
        <h1>${escapeHtml(title)}</h1>
        <div class="header-actions">
          ${showWallet ? `<button class="icon-button" data-action="open-wallet" aria-label="Wallet">${icon("wallet")}</button>` : ""}
          ${showCart ? cartButton() : ""}
        </div>
      </header>
    `;
  }
  return `
    <header class="home-header">
      <div class="home-brand"><span class="brand-mark brand-logo"><img src="/assets/cafe-de-move-on-logo.png" alt="" /></span><div><strong>Cafe de Move On!</strong><small>Student ordering</small></div></div>
      <div class="header-actions">
        <button class="wallet-chip" data-action="open-wallet">${icon("wallet")}<span>${currency(state.user?.walletBalance)}</span></button>
        ${cartButton()}
      </div>
    </header>
  `;
}

function cartButton() {
  return `
    <button class="icon-button cart-button" data-action="navigate" data-route="cart" aria-label="Cart with ${state.cart.itemCount} items">
      ${icon("cart")}${state.cart.itemCount ? `<span class="cart-count">${state.cart.itemCount}</span>` : ""}
    </button>
  `;
}

function bottomNav(active) {
  const items = [
    ["home", "home", "Home"],
    ["favourites", "heart", "Favourites"],
    ["orders", "orders", "Orders"],
    ["profile", "user", "Profile"],
  ];
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      ${items.map(([route, iconName, label]) => `
        <button class="${active === route ? "is-active" : ""}" data-action="navigate" data-route="${route}" aria-label="${label}" ${active === route ? 'aria-current="page"' : ""}>
          ${icon(iconName)}<span>${label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function customerShell(content, activeNav = "", options = {}) {
  return `
    <div class="app-background">
      <div class="customer-shell ${options.fullBleed ? "is-full-bleed" : ""}">
        <div class="customer-content">${content}</div>
        ${activeNav ? bottomNav(activeNav) : ""}
      </div>
    </div>
  `;
}

function menuCard(item, options = {}) {
  return `
    <article class="menu-card ${!item.isAvailable ? "is-unavailable" : ""}">
      <button class="menu-image-button" data-action="view-item" data-item-id="${item.id}" aria-label="View ${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <span class="food-type ${item.isVeg ? "veg" : "non-veg"}" title="${item.isVeg ? "Vegetarian" : "Non-vegetarian"}"></span>
        ${item.discount ? `<span class="discount-badge">${currency(item.discount)} off</span>` : ""}
      </button>
      <div class="menu-card-body">
        <div class="menu-card-heading">
          <button class="card-title" data-action="view-item" data-item-id="${item.id}">${escapeHtml(item.name)}</button>
          <button class="heart-button ${item.isFavourite || state.favouriteIds.has(item.id) ? "is-active" : ""} ${options.deleteMode ? "is-delete" : ""}" data-action="toggle-favourite" data-item-id="${item.id}" aria-label="${options.deleteMode ? "Delete from favourites" : "Toggle favourite"}">${icon(options.deleteMode ? "trash" : "heart")}</button>
        </div>
        <div class="menu-meta"><span>${icon("star", "is-filled")} ${item.rating.toFixed(1)}</span><span>${item.prepMinutes} min</span></div>
        <div class="menu-card-footer">
          <div class="price"><strong>${currency(item.finalPrice)}</strong>${item.discount ? `<del>${currency(item.price)}</del>` : ""}</div>
          <button class="compact-add" data-action="quick-add" data-item-id="${item.id}" ${!item.isAvailable ? "disabled" : ""}>${item.isAvailable ? `${icon("plus")} Add` : "Sold out"}</button>
        </div>
      </div>
    </article>
  `;
}

function renderHome() {
  const canteen = currentCanteen();
  if (!canteen) return customerShell(renderEmpty("No canteens found", "Your institution has no active canteens yet."));
  const traffic = trafficMeta(canteen.traffic.level);
  return customerShell(`
    <div class="screen-padding home-screen">
      ${customerHeader()}
      <div class="campus-bar"><span>${icon("building")}</span><strong>${escapeHtml(state.user.institutionName)}</strong><span class="live-label"><i></i> Live</span></div>

      <form id="search-form" class="search-bar" role="search">
        ${icon("search")}
        <input id="menu-search" name="search" value="${escapeHtml(state.search)}" placeholder="Search food" autocomplete="off" />
        ${state.search ? `<button type="button" class="clear-search" data-action="clear-search" aria-label="Clear search">${icon("close")}</button>` : ""}
      </form>

      <section class="canteen-section">
        <div class="section-heading compact"><h2>Canteens</h2><span class="item-total">${state.canteens.filter((entry) => entry.isOpen).length} open</span></div>
        <div class="canteen-switcher">
          ${state.canteens.map((entry) => `
            <button class="canteen-pill ${entry.id === canteen.id ? "is-active" : ""}" data-action="switch-canteen" data-canteen-id="${entry.id}" style="--canteen-accent:${escapeHtml(entry.accent)}">
              <span class="canteen-monogram">${escapeHtml(initials(entry.shortName))}</span>
              <span><strong>${escapeHtml(entry.shortName)}</strong><small>${entry.isOpen ? escapeHtml(entry.location) : "Closed"}</small></span>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="queue-banner" style="--canteen-accent:${escapeHtml(canteen.accent)}">
        <div class="queue-copy">
          <span class="traffic-badge traffic-${traffic.className}"><i></i>${traffic.label}</span>
          <h2>${escapeHtml(canteen.shortName)}</h2>
          <p>${escapeHtml(canteen.location)} - ${canteen.traffic.activeOrders} active order${canteen.traffic.activeOrders === 1 ? "" : "s"}</p>
        </div>
        <div class="queue-metrics">
          <div><small>Wait</small><strong>${canteen.traffic.estimatedWaitMinutes ? `${canteen.traffic.estimatedWaitMinutes} min` : "None"}</strong></div>
          <div class="serving-token" aria-label="Now serving queue number ${canteen.servingNumber}"><small>Now serving</small><strong>#${canteen.servingNumber}</strong></div>
        </div>
      </section>

      <section class="menu-section">
        <div class="section-heading"><h2>${state.search ? `Results for "${escapeHtml(state.search)}"` : "Available now"}</h2><span class="item-total">${state.menu.length} items</span></div>
        <div class="category-scroll">
          ${state.categories.map((category) => `<button class="category-chip ${state.category === category ? "is-active" : ""}" data-action="category" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
        </div>
        ${state.loading ? renderMenuSkeleton() : state.menu.length ? `<div class="menu-grid">${state.menu.map(menuCard).join("")}</div>` : renderEmpty("Nothing matched that search", "Try another dish or switch to a different canteen.", "search")}
      </section>
    </div>
  `, "home");
}

function renderMenuSkeleton() {
  return `<div class="menu-grid">${Array.from({ length: 4 }, () => `<div class="menu-card skeleton-card"><span></span><div><i></i><i></i><i></i></div></div>`).join("")}</div>`;
}

function renderEmpty(title, description, iconName = "orders") {
  return `<div class="empty-state"><span>${icon(iconName)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>`;
}

function renderItem() {
  if (!state.selectedItem) {
    return customerShell(`<div class="detail-loading"><span class="large-spinner"></span><p>Loading the dish...</p></div>`, "", { fullBleed: true });
  }
  const item = state.selectedItem;
  const isFavourite = state.favouriteIds.has(item.id) || item.isFavourite;
  return customerShell(`
    <article class="item-detail">
      <div class="detail-hero">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" />
        <div class="detail-overlay"></div>
        <button class="floating-icon left" data-action="navigate" data-route="home" aria-label="Back to menu">${icon("back")}</button>
        <button class="floating-icon right ${isFavourite ? "is-favourite" : ""}" data-action="toggle-favourite" data-item-id="${item.id}" aria-label="Toggle favourite">${icon("heart")}</button>
      </div>
      <div class="detail-body screen-padding">
        <div class="detail-price-row">
          <div class="price large"><strong>${currency(item.finalPrice)}</strong>${item.discount ? `<del>${currency(item.price)}</del>` : ""}</div>
          <span class="food-label ${item.isVeg ? "veg" : "non-veg"}">${icon("leaf")} ${item.isVeg ? "Vegetarian" : "Non-vegetarian"}</span>
        </div>
        <h1>${escapeHtml(item.name)}</h1>
        <div class="rating-line">${stars(item.rating, true)}<strong>${item.rating.toFixed(1)}</strong><span>${item.reviewCount} reviews</span></div>
        <p class="detail-description">${escapeHtml(item.description)}</p>
        <div class="detail-facts">
          <div>${icon("clock")}<span><small>Preparation</small><strong>${item.prepMinutes} minutes</strong></span></div>
          <div>${icon("building")}<span><small>Kitchen</small><strong>${escapeHtml(item.canteenName)}</strong></span></div>
        </div>

        <section class="reviews-preview">
          <div class="section-heading compact"><div><span class="eyebrow">Community</span><h2>What students say</h2></div><button class="text-action" data-action="open-review">Write review</button></div>
          ${state.selectedItemReviews.length ? state.selectedItemReviews.slice(0, 3).map((review) => `
            <article class="review-card">
              <span class="review-avatar">${escapeHtml(initials(review.userName))}</span>
              <div><div class="review-head"><strong>${escapeHtml(review.userName)}</strong>${stars(review.rating, true)}</div><p>${escapeHtml(review.comment)}</p><small>${formatDate(review.createdAt)}</small></div>
            </article>
          `).join("") : `<div class="first-review"><p>No written reviews yet. Be the first to help your campus.</p><button class="secondary-button" data-action="open-review">Write the first review</button></div>`}
        </section>
      </div>
      <div class="detail-action-bar">
        <div class="quantity-control">
          <button data-action="item-quantity" data-delta="-1" aria-label="Decrease quantity">${icon("minus")}</button>
          <strong>${state.itemQuantity}</strong>
          <button data-action="item-quantity" data-delta="1" aria-label="Increase quantity">${icon("plus")}</button>
        </div>
        <button class="primary-button" data-action="add-item-cart" data-item-id="${item.id}" ${!item.isAvailable ? "disabled" : ""}>${icon("cart")} ${item.isAvailable ? `Add - ${currency(item.finalPrice * state.itemQuantity)}` : "Currently unavailable"}</button>
      </div>
    </article>
    ${state.route === "review" ? renderReviewSheet(item) : ""}
  `, "", { fullBleed: true });
}

function renderReviewSheet(item) {
  return `
    <div class="modal-backdrop" data-action="close-review">
      <section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="review-title" data-modal-panel>
        <div class="sheet-handle"></div>
        <button class="sheet-close" data-action="close-review" aria-label="Close">${icon("close")}</button>
        <span class="eyebrow">Your experience</span>
        <h2 id="review-title">Review ${escapeHtml(item.name)}</h2>
        <p>Tap a star, then tell other students what stood out.</p>
        <form id="review-form">
          <div class="review-stars-input" role="radiogroup" aria-label="Rating">
            ${[1, 2, 3, 4, 5].map((rating) => `<button type="button" class="${rating <= state.reviewRating ? "is-active" : ""}" data-action="review-rating" data-rating="${rating}" aria-label="${rating} stars">${icon("star")}</button>`).join("")}
          </div>
          <label class="input-field"><span>Review</span><textarea name="comment" minlength="8" maxlength="500" required placeholder="Fresh, quick, well packed..."></textarea></label>
          <button class="primary-button" type="submit" ${state.processing ? "disabled" : ""}>${state.processing ? '<span class="button-spinner"></span> Submitting' : "Submit review"}</button>
        </form>
      </section>
    </div>
  `;
}

function renderCart() {
  const cart = state.cart;
  return customerShell(`
    <div class="screen-padding standard-screen">
      ${customerHeader({ title: "Your cart", back: "home", showCart: false })}
      ${cart.items.length ? `
        <div class="cart-canteen"><span class="canteen-monogram">${escapeHtml(initials(cart.canteen.shortName))}</span><div><small>Ordering from</small><strong>${escapeHtml(cart.canteen.name)}</strong></div><button data-action="clear-cart">Clear</button></div>
        <div class="cart-list">
          ${cart.items.map((item) => `
            <article class="cart-item">
              <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" />
              <div class="cart-item-copy"><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${currency(item.finalPrice)}</span></div>
              <div class="cart-quantity">
                <button data-action="cart-quantity" data-item-id="${item.id}" data-quantity="${item.quantity - 1}">${item.quantity === 1 ? icon("trash") : icon("minus")}</button>
                <strong>${item.quantity}</strong>
                <button data-action="cart-quantity" data-item-id="${item.id}" data-quantity="${item.quantity + 1}">${icon("plus")}</button>
              </div>
            </article>
          `).join("")}
        </div>
        <section class="bill-card">
          <h2>Bill details</h2>
          <div><span>Item total</span><strong>${currency(cart.subtotal)}</strong></div>
          <div class="bill-total"><span>To pay</span><strong>${currency(cart.total)}</strong></div>
        </section>
        <div class="sticky-page-action"><button class="primary-button" data-action="checkout">Continue to checkout - ${currency(cart.total)}</button></div>
      ` : `
        ${renderEmpty("Your cart is hungry", "Add something fresh from one of your campus canteens.", "cart")}
        <button class="primary-button empty-action" data-action="navigate" data-route="home">Browse the menu</button>
      `}
    </div>
  `);
}

function renderCheckout() {
  const cart = state.cart;
  const hasFunds = Number(state.user.walletBalance) >= cart.total;
  if (!cart.items.length) return renderCart();
  return customerShell(`
    <div class="screen-padding standard-screen checkout-screen">
      ${customerHeader({ title: "Checkout", back: "cart", showWallet: false, showCart: false })}
      <div class="checkout-token-preview"><span class="token-glyph">${icon("qr")}</span><div><strong>Collection QR after payment</strong><small>Your queue number is shown separately and updates live.</small></div></div>
      <section class="checkout-section">
        <div class="section-heading compact"><h2>Payment method</h2></div>
        <button class="payment-choice ${state.paymentMethod === "wallet" ? "is-active" : ""}" data-action="payment-method" data-method="wallet">
          <span class="payment-icon">${icon("wallet")}</span><span><strong>Campus wallet</strong><small>${currency(state.user.walletBalance)} available</small></span><i></i>
        </button>
        <button class="payment-choice ${state.paymentMethod === "gpay" ? "is-active" : ""}" data-action="payment-method" data-method="gpay">
          <span class="payment-icon payment-logo gpay">G</span><span><strong>Google Pay</strong><small>Secure UPI payment</small></span><i></i>
        </button>
        <button class="payment-choice ${state.paymentMethod === "phonepe" ? "is-active" : ""}" data-action="payment-method" data-method="phonepe">
          <span class="payment-icon payment-logo phonepe">Pe</span><span><strong>PhonePe</strong><small>Secure UPI payment</small></span><i></i>
        </button>
        ${state.paymentMethod === "wallet" && !hasFunds ? `<div class="insufficient-note">${icon("info")} You need ${currency(cart.total - state.user.walletBalance)} more. <button data-action="open-wallet">Top up wallet</button></div>` : ""}
      </section>
      <section class="bill-card checkout-bill">
        <div><span>${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} from ${escapeHtml(cart.canteen.shortName)}</span><strong>${currency(cart.subtotal)}</strong></div>
        <div class="bill-total"><span>Total</span><strong>${currency(cart.total)}</strong></div>
      </section>
      <div class="sticky-page-action"><button class="primary-button" data-action="place-order" ${state.processing || (state.paymentMethod === "wallet" && !hasFunds) ? "disabled" : ""}>${state.processing ? '<span class="button-spinner"></span> Confirming order' : `Place order - ${currency(cart.total)}`}</button></div>
    </div>
    ${state.processing ? `<div class="processing-layer"><div class="processing-card" role="status" aria-live="polite"><div class="processing-orbit"><i></i><span>${icon("qr")}</span></div><small>SECURE ORDER</small><h2>Creating collection QR</h2><p>${escapeHtml(cart.canteen.shortName)} is confirming the order.</p><div class="processing-line"><span></span></div></div></div>` : ""}
  `);
}

function orderProgress(order) {
  const status = orderStatus(order.status);
  const steps = [["queued", "Ordered"], ["preparing", "Preparing"], ["ready", "Ready"], ["completed", "Collected"]];
  return `
    <div class="order-progress ${order.status === "cancelled" ? "is-cancelled" : ""}">
      ${steps.map(([key, label], index) => `<div class="${status.step > index ? "is-complete" : status.step === index + 1 ? "is-current" : ""}"><i>${status.step > index ? icon("check") : ""}</i><span>${label}</span></div>`).join("")}
    </div>
  `;
}

function renderCollectionQr(order) {
  if (!order.collectionCode || ["completed", "cancelled"].includes(order.status)) return "";
  return `
    <section class="collection-qr-card">
      <div class="collection-qr-heading"><span>${icon("qr")}</span><div><h2>Collection QR</h2><p>Show this to the worker when the order is ready.</p></div></div>
      <div class="collection-qr-frame">${order.collectionQrSvg || renderAppLoader("Loading QR")}</div>
      <div class="collection-order-number"><small>Order number</small><strong>${escapeHtml(order.orderNumber)}</strong></div>
    </section>
  `;
}

function renderOrderSuccess() {
  const order = state.selectedOrder;
  if (!order) return customerShell(renderEmpty("Order not found", "Open your orders to find the latest status."));
  const meta = orderStatus(order.status);
  const progress = order.status === "queued" ? 28 : order.status === "preparing" ? 56 : order.status === "ready" ? 88 : 100;
  return customerShell(`
    <div class="order-success-screen screen-padding">
      <span class="success-checkmark">${icon("check")}</span>
      <span class="eyebrow">Order confirmed</span>
      <h1>${meta.label}</h1>
      <p>${escapeHtml(meta.description)}</p>
      <div class="live-token-card" style="--progress:${progress * 3.6}deg">
        <div class="token-ring"><div><small>Your queue number</small><strong>#${order.tokenNumber}</strong><span>${order.queueAhead} order${order.queueAhead === 1 ? "" : "s"} ahead</span></div></div>
        <div class="token-live-row"><span><i></i> Live queue</span><strong>Now serving #${order.canteen.servingNumber}</strong></div>
      </div>
      ${orderProgress(order)}
      ${renderCollectionQr(order)}
      <div class="collection-note">${icon("info")} Queue status updates live. The QR is only for collection.</div>
      <button class="primary-button" data-action="open-order" data-order-id="${order.id}">Track this order</button>
      <button class="secondary-button" data-action="navigate" data-route="home">Back to home</button>
    </div>
  `);
}

function orderCard(order, active = false) {
  const meta = orderStatus(order.status);
  return `
    <article class="order-card ${active ? "is-active" : ""}" data-action="open-order" data-order-id="${order.id}">
      <div class="order-card-head"><span class="order-token-small">Queue #${order.tokenNumber}</span><span class="status-pill status-${order.status}">${meta.label}</span></div>
      <h3>${escapeHtml(order.items.map((item) => item.name).join(", "))}</h3>
      <p>${escapeHtml(order.canteen.shortName)} - ${formatDate(order.createdAt)}</p>
      <div class="order-card-bottom"><span>${order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span><strong>${currency(order.total)}</strong>${icon("next")}</div>
    </article>
  `;
}

function renderOrders() {
  const activeOrders = state.orders.filter((order) => ["queued", "preparing", "ready"].includes(order.status));
  const pastOrders = state.orders.filter((order) => !["queued", "preparing", "ready"].includes(order.status));
  return customerShell(`
    <div class="screen-padding standard-screen">
      ${customerHeader({ title: "Your orders", back: "home", showCart: false })}
      ${activeOrders.length ? `
        <section class="orders-section"><div class="section-heading compact"><h2>Active orders</h2><span class="live-label"><i></i> Live</span></div>
        <div class="order-list">${activeOrders.map((order) => orderCard(order, true)).join("")}</div></section>
      ` : `<div class="quiet-banner">${icon("check")} You have no active orders right now.</div>`}
      <section class="orders-section"><div class="section-heading compact"><h2>Order history</h2></div>
        ${pastOrders.length ? `<div class="order-list">${pastOrders.map((order) => orderCard(order)).join("")}</div>` : renderEmpty("No past orders", "Your completed and cancelled orders will appear here.")}
      </section>
    </div>
  `, "orders");
}

function renderOrderDetail() {
  const order = state.selectedOrder;
  if (!order) return renderOrders();
  const meta = orderStatus(order.status);
  return customerShell(`
    <div class="screen-padding standard-screen">
      ${customerHeader({ title: "Order details", back: "orders", showWallet: false, showCart: false })}
      <section class="order-detail-hero status-background-${order.status}">
        <span class="status-pill status-${order.status}">${meta.label}</span>
        <small>Queue number</small><strong>#${order.tokenNumber}</strong>
        <p>${escapeHtml(meta.description)}</p>
      </section>
      ${orderProgress(order)}
      <section class="queue-detail-grid">
        <div><small>Now serving</small><strong>#${order.canteen.servingNumber}</strong></div>
        <div><small>Orders ahead</small><strong>${order.queueAhead}</strong></div>
        <div><small>Order number</small><strong>${escapeHtml(order.orderNumber)}</strong></div>
        <div><small>Payment</small><strong>${paymentLabel(order)}</strong></div>
      </section>
      <section class="order-items-card"><h2>${escapeHtml(order.canteen.name)}</h2>${order.items.map((item) => `<div><span>${item.quantity} x ${escapeHtml(item.name)}</span><strong>${currency(item.price * item.quantity)}</strong></div>`).join("")}<div class="bill-total"><span>Total</span><strong>${currency(order.total)}</strong></div></section>
      ${renderCollectionQr(order)}
      ${order.status === "queued" ? `<button class="danger-text-button" data-action="cancel-order" data-order-id="${order.id}">Cancel this order</button>` : ""}
    </div>
  `);
}

function renderWallet() {
  const wallet = state.wallet;
  return customerShell(`
    <div class="screen-padding standard-screen wallet-screen">
      ${customerHeader({ title: "Wallet", back: "home", showWallet: false, showCart: false })}
      ${state.loading || !wallet ? renderAppLoader("Loading wallet") : `
        <section class="wallet-balance-card">
          <div class="wallet-card-top"><span class="brand-mark inverse">${icon("wallet")}</span><span>CAMPUS WALLET</span></div>
          <small>Available balance</small><strong>${currency(wallet.balance)}</strong>
          <div class="wallet-card-bottom"><span>${escapeHtml(state.user.name)}</span><span>ID ${String(state.user.id).padStart(4, "0")}</span></div>
        </section>
        <section class="reward-card">
          <span class="reward-icon">${icon("coin")}</span><div><small>Reward points</small><strong>${wallet.rewardTokens}</strong><p>Earn 1 point for every INR 50 ordered.</p></div>
          <div class="token-progress"><span style="width:${Math.min(100, wallet.rewardTokens % 100)}%"></span></div>
        </section>
        <section class="topup-section">
          <div class="section-heading compact"><h2>Top up wallet</h2></div>
          <div class="topup-grid">${[100, 250, 500, 1000].map((amount) => `<button data-action="top-up" data-amount="${amount}">+ ${currency(amount)}</button>`).join("")}</div>
        </section>
        <section class="transaction-section">
          <div class="section-heading compact"><h2>Recent activity</h2></div>
          <div class="transaction-list">${wallet.transactions.length ? wallet.transactions.map((transaction) => `
            <div class="transaction-row"><span class="transaction-icon type-${transaction.type}">${icon(transaction.type === "reward" ? "coin" : transaction.type === "debit" ? "orders" : "plus")}</span><div><strong>${escapeHtml(transaction.label)}</strong><small>${formatDate(transaction.createdAt)}</small></div><span class="transaction-amount type-${transaction.type}">${transaction.type === "debit" ? "-" : "+"}${transaction.type === "reward" ? `${transaction.amount} point${transaction.amount === 1 ? "" : "s"}` : currency(transaction.amount)}</span></div>
          `).join("") : `<p class="muted-copy">No wallet activity yet.</p>`}</div>
        </section>
      `}
    </div>
  `);
}

function renderFavourites() {
  return customerShell(`
    <div class="screen-padding standard-screen">
      ${customerHeader({ title: "Favourites", back: "home" })}
      <div class="section-heading"><h2>Saved items</h2><span class="item-total">${state.favourites.length} items</span></div>
      ${state.loading ? renderMenuSkeleton() : state.favourites.length ? `<div class="menu-grid favourites-grid">${state.favourites.map((item) => menuCard(item, { deleteMode: true })).join("")}</div>` : `${renderEmpty("Nothing saved yet", "Tap the heart on any dish to keep it here.", "heart")}<button class="primary-button empty-action" data-action="navigate" data-route="home">Explore the menu</button>`}
    </div>
  `, "favourites");
}

function renderProfile() {
  return customerShell(`
    <div class="screen-padding standard-screen profile-screen">
      ${customerHeader({ title: "About me", back: "home", showWallet: false, showCart: false })}
      <section class="profile-hero"><span class="profile-avatar">${escapeHtml(initials(state.user.name))}</span><h2>${escapeHtml(state.user.name)}</h2><p>${escapeHtml(state.user.email)}</p><span class="role-badge">${state.user.role === "admin" ? "Cafe administrator" : "Student account"}</span></section>
      <section class="profile-section"><div class="section-heading compact"><div><span class="eyebrow">Campus</span><h2>Institution details</h2></div></div>
        <div class="profile-list">
          <div><span>${icon("building")}</span><div><small>Institution</small><strong>${escapeHtml(state.user.institutionName)}</strong></div></div>
          <div><span>${icon("info")}</span><div><small>Canteen code</small><strong>${escapeHtml(state.user.institutionCode)}</strong></div></div>
        </div>
      </section>
      <section class="profile-section"><div class="section-heading compact"><div><span class="eyebrow">Account</span><h2>Quick access</h2></div></div>
        <div class="profile-links">
          <button data-action="open-wallet"><span>${icon("wallet")}</span><div><strong>Campus wallet</strong><small>${currency(state.user.walletBalance)} available</small></div>${icon("next")}</button>
          <button data-action="navigate" data-route="orders"><span>${icon("orders")}</span><div><strong>Your orders</strong><small>Live and previous orders</small></div>${icon("next")}</button>
          <button data-action="navigate" data-route="favourites"><span>${icon("heart")}</span><div><strong>Favourites</strong><small>Your saved menu items</small></div>${icon("next")}</button>
        </div>
      </section>
      <button class="logout-button" data-action="logout">${icon("logout")} Sign out</button>
    </div>
  `, "profile");
}

function workerOrderCard(order) {
  const allServed = order.items.length > 0 && order.items.every((item) => item.isServed);
  const readyForHandover = order.status === "ready";
  const locked = !readyForHandover;
  return `
    <section class="worker-order-card">
      <div class="worker-order-head">
        <div><small>Order number</small><h2>${escapeHtml(order.orderNumber)}</h2></div>
        <span class="status-pill status-${order.status}">${orderStatus(order.status).label}</span>
      </div>
      <div class="worker-order-meta">
        <div><small>Student</small><strong>${escapeHtml(order.customerName)}</strong></div>
        <div><small>Queue number</small><strong>#${order.tokenNumber}</strong></div>
        <div><small>Canteen</small><strong>${escapeHtml(order.canteen.shortName)}</strong></div>
        <div><small>Payment</small><strong>${paymentLabel(order)}</strong></div>
      </div>
      ${!["ready", "completed", "cancelled"].includes(order.status) ? `<div class="worker-alert is-waiting">${icon("clock")} Kitchen preparation is still in progress. The checklist unlocks when this order is ready.</div>` : ""}
      <div class="worker-checklist-head"><div><h3>Products to hand over</h3><p>Check each product only after giving it to the student.</p></div><strong>${order.items.filter((item) => item.isServed).length}/${order.items.length}</strong></div>
      <div class="worker-checklist">
        ${order.items.map((item) => `
          <button class="worker-check-row ${item.isServed ? "is-checked" : ""}" data-action="worker-toggle-item" data-item-id="${item.id}" data-served="${item.isServed ? "false" : "true"}" role="checkbox" aria-checked="${item.isServed}" ${locked ? "disabled" : ""}>
            <span class="worker-check-icon">${item.isServed ? icon("check") : ""}</span>
            <span><strong>${item.quantity} x ${escapeHtml(item.name)}</strong><small>${item.isServed ? "Given to student" : "Not yet served"}</small></span>
          </button>
        `).join("")}
      </div>
      ${order.status === "cancelled" ? `<div class="worker-alert is-error">${icon("info")} This order was cancelled. Do not serve it.</div>` : ""}
      ${order.status === "completed" ? `<div class="worker-alert is-success">${icon("check")} Handover already completed.</div>` : readyForHandover ? `
        <button class="primary-button worker-complete" data-action="worker-complete" ${allServed ? "" : "disabled"}>${icon("check")} Complete handover</button>
      ` : ""}
      <button class="secondary-button" data-action="worker-clear-order">Scan another order</button>
    </section>
  `;
}

function renderWorker() {
  const assignedCanteen = currentCanteen();
  return `
    <div class="worker-app">
      <main class="worker-shell">
        <header class="worker-header">
          <div class="brand-lockup"><span class="brand-mark brand-logo"><img src="/assets/cafe-de-move-on-logo.png" alt="" /></span><div><strong>Cafe de Move On!</strong><small>Worker station</small></div></div>
          <button class="icon-button" data-action="logout" aria-label="Sign out">${icon("logout")}</button>
        </header>
        <div class="worker-canteen-bar"><span>${icon("building")}</span><div><small>Serving at</small><strong>${escapeHtml(assignedCanteen?.name || "Assigned canteen")}</strong></div><i></i></div>
        ${state.workerOrder ? workerOrderCard(state.workerOrder) : `
          <section class="worker-scan-card">
            <div class="worker-scan-copy"><span class="eyebrow">Collection verification</span><h1>Scan student QR</h1><p>Scan the QR shown on the student's order screen.</p></div>
            <div class="worker-camera ${state.workerScanning ? "is-live" : ""}">
              ${state.workerScanning ? `<video id="worker-camera" playsinline muted aria-label="QR scanner camera"></video><span class="worker-scan-frame"><i></i></span>` : `<span class="worker-scan-illustration">${icon("scan")}</span>`}
            </div>
            ${state.workerCameraError ? `<div class="worker-alert is-error">${icon("info")} ${escapeHtml(state.workerCameraError)}</div>` : ""}
            <button class="primary-button" data-action="${state.workerScanning ? "worker-stop-scan" : "worker-start-scan"}">${icon(state.workerScanning ? "close" : "camera")} ${state.workerScanning ? "Stop camera" : "Open QR scanner"}</button>
            <div class="worker-divider"><span>or enter order number</span></div>
            <form id="worker-code-form" class="worker-code-form">
              <label class="input-field"><span>Order number</span><input name="code" autocomplete="off" required value="${DEMO_WORKER_ORDER_ID}" placeholder="ORD-20260711-0001" /></label>
              <button class="secondary-button" type="submit">Find order</button>
            </form>
          </section>
        `}
        ${state.loading ? `<div class="worker-loading-layer">${renderAppLoader("Finding order")}</div>` : ""}
      </main>
    </div>
  `;
}

function adminSidebar() {
  const tabs = [["overview", "dashboard", "Overview"], ["orders", "orders", "Orders"], ["menu", "menu", "Menu items"]];
  return `
    <aside class="admin-sidebar">
      <div class="brand-lockup brand-lockup-light"><span class="brand-mark brand-logo"><img src="/assets/cafe-de-move-on-logo.png" alt="" /></span><div><strong>Cafe de Move On!</strong><small>Cafe administration</small></div></div>
      <nav>${tabs.map(([tab, iconName, label]) => `<button class="${state.adminTab === tab ? "is-active" : ""}" data-action="admin-tab" data-tab="${tab}">${icon(iconName)}<span>${label}</span></button>`).join("")}</nav>
      <div class="admin-user"><span>${escapeHtml(initials(state.user.name))}</span><div><strong>${escapeHtml(state.user.name)}</strong><small>${escapeHtml(state.user.email)}</small></div></div>
      <button class="admin-logout" data-action="logout">${icon("logout")} Sign out</button>
    </aside>
  `;
}

function adminMobileNav() {
  return `<nav class="admin-mobile-nav" aria-label="Admin navigation">${[["overview", "dashboard"], ["orders", "orders"], ["menu", "menu"]].map(([tab, iconName]) => {
    const label = tab === "menu" ? "Menu" : tab[0].toUpperCase() + tab.slice(1);
    return `<button class="${state.adminTab === tab ? "is-active" : ""}" data-action="admin-tab" data-tab="${tab}" aria-label="${label}" ${state.adminTab === tab ? 'aria-current="page"' : ""}>${icon(iconName)}<span>${label}</span></button>`;
  }).join("")}</nav>`;
}

function adminTopbar(summary) {
  return `
    <header class="admin-topbar">
      <div class="admin-title-row">
        <div><span class="eyebrow">${formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</span><h1>${state.adminTab === "overview" ? "Cafe dashboard" : state.adminTab === "orders" ? "Live orders" : "Menu management"}</h1></div>
        <button class="admin-mobile-logout" data-action="logout" aria-label="Sign out">${icon("logout")}</button>
      </div>
      <div class="admin-top-actions">
        <label class="admin-canteen-select"><span>Canteen</span><select id="admin-canteen">${state.canteens.map((canteen) => `<option value="${canteen.id}" ${canteen.id === state.currentCanteenId ? "selected" : ""}>${escapeHtml(canteen.shortName)}</option>`).join("")}</select></label>
        ${state.adminTab === "menu" ? `<button class="primary-button auto-width" data-action="admin-add">${icon("plus")} Add item</button>` : ""}
      </div>
    </header>
  `;
}

function adminMetric(iconName, value, label, note, tone = "green") {
  return `<article class="metric-card"><span class="metric-icon tone-${tone}">${icon(iconName)}</span><div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(note)}</small></div></article>`;
}

function adminOrderRow(order) {
  const nextStatus = order.status === "queued" ? "preparing" : order.status === "preparing" ? "ready" : "";
  const nextLabel = order.status === "queued" ? "Start" : order.status === "preparing" ? "Mark ready" : "";
  return `
    <article class="admin-order-row">
      <span class="admin-token">Queue #${order.tokenNumber}</span>
      <div class="admin-order-copy"><strong>${escapeHtml(order.customerName || "Student")}</strong><span>${escapeHtml(order.items.map((item) => `${item.quantity}x ${item.name}`).join(", "))}</span></div>
      <span class="status-pill status-${order.status}">${orderStatus(order.status).label}</span>
      <strong class="admin-order-total">${currency(order.total)}</strong>
      ${nextStatus ? `<button class="row-action" data-action="admin-order-status" data-order-id="${order.id}" data-status="${nextStatus}">${nextLabel}${icon("next")}</button>` : `<span class="row-time">${order.status === "ready" ? "Awaiting worker scan" : formatDate(order.createdAt)}</span>`}
    </article>
  `;
}

function renderAdminOverview(summary) {
  const traffic = trafficMeta(summary.canteen.traffic.level);
  const completionRate = summary.metrics.todayOrders ? Math.max(0, Math.round(((summary.metrics.todayOrders - summary.metrics.activeOrders) / summary.metrics.todayOrders) * 100)) : 0;
  const queueLoad = Math.min(100, summary.canteen.traffic.activeOrders * 12);
  const revenueGoal = Math.min(100, Math.round(summary.metrics.todayRevenue / 100));
  return `
    <div class="metrics-grid">
      ${adminMetric("orders", summary.metrics.todayOrders, "Orders today", `${summary.metrics.activeOrders} active`, "green")}
      ${adminMetric("wallet", currency(summary.metrics.todayRevenue), "Revenue today", "Paid orders", "blue")}
      ${adminMetric("traffic", summary.canteen.traffic.activeOrders, "Live queue", `${summary.canteen.traffic.estimatedWaitMinutes} min wait`, "orange")}
    </div>
    <section class="admin-panel analytics-panel">
      <div class="admin-panel-head"><div><span class="eyebrow">Live analytics</span><h2>Performance overview</h2></div><span class="live-label"><i></i> Updated now</span></div>
      <div class="analytics-donuts">
        ${[[completionRate, "Orders completed", "#20c55a"], [queueLoad, "Queue capacity", "#f59d2a"], [revenueGoal, "Revenue target", "#2492e1"]].map(([value, label, color]) => `<div class="analytics-stat"><div class="analytics-donut" style="--value:${value * 3.6}deg;--chart-color:${color}"><span>${value}%</span></div><strong>${label}</strong></div>`).join("")}
      </div>
      <div class="revenue-sparkline" aria-label="Today's revenue trend">${[28, 44, 35, 61, 52, 76, Math.max(38, revenueGoal)].map((height, index) => `<i style="--bar:${height}%"><span>${["8", "10", "12", "2", "4", "6", "Now"][index]}</span></i>`).join("")}</div>
    </section>
    <section class="admin-panel queue-control-panel">
      <div class="admin-panel-head"><h2>Queue control</h2><span class="traffic-badge traffic-${traffic.className}"><i></i>${traffic.label}</span></div>
      <div class="queue-control-token"><div><small>Now serving</small><strong>#${summary.canteen.servingNumber}</strong></div><div><small>Active queue</small><strong>${summary.canteen.traffic.activeOrders}</strong></div><div><small>Estimated wait</small><strong>${summary.canteen.traffic.estimatedWaitMinutes} min</strong></div></div>
      <button class="primary-button" data-action="admin-advance">${icon("bolt")} Advance next order</button>
    </section>
    <section class="admin-panel order-table-panel">
      <div class="admin-panel-head"><h2>Active orders</h2><span class="item-total">${summary.activeOrders.length} orders</span></div>
      <div class="admin-order-list">${summary.activeOrders.length ? summary.activeOrders.map(adminOrderRow).join("") : renderEmpty("Queue cleared", "There are no active orders for this canteen.", "check")}</div>
    </section>
  `;
}

function renderAdminOrders(summary) {
  return `
    <section class="admin-panel order-table-panel full-panel">
      <div class="admin-panel-head"><h2>All orders</h2><span class="item-total">${summary.recentOrders.length} total</span></div>
      <div class="admin-order-list">${summary.recentOrders.length ? summary.recentOrders.map(adminOrderRow).join("") : renderEmpty("No orders yet", "New student orders will appear here instantly.")}</div>
    </section>
  `;
}

function renderAdminMenu(summary) {
  return `
    <section class="admin-panel full-panel menu-management-panel">
      <div class="admin-panel-head"><h2>${escapeHtml(summary.canteen.shortName)} menu</h2><span class="item-total">${summary.menu.length} items</span></div>
      <div class="admin-menu-grid">${summary.menu.map((item) => `
        <article class="admin-menu-card ${!item.isAvailable ? "is-off" : ""}">
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" />
          <div class="admin-menu-copy"><span>${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3><p>${currency(item.finalPrice)} - ${item.prepMinutes} min</p></div>
          <label class="toggle-switch" title="Availability"><input type="checkbox" data-action="admin-availability" data-item-id="${item.id}" ${item.isAvailable ? "checked" : ""}/><span></span></label>
          <div class="admin-card-actions"><button data-action="admin-edit" data-item-id="${item.id}">${icon("edit")} Edit</button><button class="danger" data-action="admin-delete" data-item-id="${item.id}">${icon("trash")}</button></div>
        </article>
      `).join("")}</div>
    </section>
  `;
}

function renderAdminModal() {
  if (state.adminEditing === null) return "";
  const item = state.adminEditing || {};
  const isNew = !item.id;
  return `
    <div class="modal-backdrop admin-modal-backdrop" data-action="admin-close-modal">
      <section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title" data-modal-panel>
        <header><div><span class="eyebrow">${isNew ? "New product" : "Update product"}</span><h2 id="item-form-title">${isNew ? "Add menu item" : escapeHtml(item.name)}</h2></div><button data-action="admin-close-modal" aria-label="Close">${icon("close")}</button></header>
        <form id="admin-item-form" class="admin-item-form">
          <div class="image-upload-field">
            <img id="admin-image-preview" src="${escapeHtml(item.imageUrl || "/assets/foods/rice-and-curry.png")}" alt="Item preview" />
            <label>${icon("camera")}<span>Choose a sharp food image<small>PNG, JPEG or WebP - maximum 6 MB</small></span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label>
            <input name="imageUrl" type="hidden" value="${escapeHtml(item.imageUrl || "/assets/foods/rice-and-curry.png")}" />
          </div>
          <div class="form-grid">
            <label class="input-field span-two"><span>Item name</span><input name="name" required value="${escapeHtml(item.name || "")}" placeholder="Chicken Fried Rice" /></label>
            <label class="input-field"><span>Category</span><input name="category" required value="${escapeHtml(item.category || "Meals")}" /></label>
            <label class="input-field"><span>Price (INR)</span><input name="price" type="number" min="1" required value="${item.price || ""}" /></label>
            <label class="input-field"><span>Discount (INR)</span><input name="discount" type="number" min="0" value="${item.discount || 0}" /></label>
            <label class="input-field"><span>Preparation minutes</span><input name="prepMinutes" type="number" min="1" value="${item.prepMinutes || 8}" /></label>
            <label class="input-field span-two"><span>Description</span><textarea name="description" required>${escapeHtml(item.description || "")}</textarea></label>
          </div>
          <div class="check-row"><label><input name="isVeg" type="checkbox" ${item.isVeg ?? true ? "checked" : ""}/> Vegetarian</label><label><input name="isAvailable" type="checkbox" ${item.isAvailable ?? true ? "checked" : ""}/> Available now</label><label><input name="featured" type="checkbox" ${item.featured ? "checked" : ""}/> Featured</label></div>
          <div class="modal-actions">${!isNew ? `<button type="button" class="danger-outline-button" data-action="admin-delete" data-item-id="${item.id}">${icon("trash")} Archive</button>` : ""}<button type="submit" class="primary-button auto-width" ${state.processing ? "disabled" : ""}>${state.processing ? '<span class="button-spinner"></span> Saving' : isNew ? "Add item" : "Save changes"}</button></div>
        </form>
      </section>
    </div>
  `;
}

function renderAdmin() {
  const summary = state.adminSummary;
  return `
    <div class="admin-app">
      ${adminSidebar()}
      <main class="admin-main">
        ${summary ? adminTopbar(summary) : ""}
        <div class="admin-content">${state.loading || !summary ? renderAppLoader("Loading cafe operations") : state.adminTab === "orders" ? renderAdminOrders(summary) : state.adminTab === "menu" ? renderAdminMenu(summary) : renderAdminOverview(summary)}</div>
      </main>
      ${adminMobileNav()}
      ${renderAdminModal()}
    </div>
  `;
}

function render() {
  const views = {
    splash: renderSplash,
    auth: renderAuth,
    home: renderHome,
    item: renderItem,
    review: renderItem,
    cart: renderCart,
    checkout: renderCheckout,
    orderSuccess: renderOrderSuccess,
    orders: renderOrders,
    orderDetail: renderOrderDetail,
    wallet: renderWallet,
    favourites: renderFavourites,
    profile: renderProfile,
    worker: renderWorker,
    admin: renderAdmin,
  };
  app.innerHTML = (views[state.route] || renderHome)();
}

async function setCanteen(canteenId) {
  state.currentCanteenId = Number(canteenId);
  state.search = "";
  state.category = "All";
  localStorage.setItem("canteenflow_canteen", String(state.currentCanteenId));
  if (state.user.role === "admin") await loadAdmin();
  else if (state.user.role === "worker") {
    state.workerOrder = null;
    render();
  } else await loadMenu();
}

async function toggleFavourite(itemId) {
  await runOnce(`favourite:${itemId}`, async () => {
    try {
      const data = await api(`/api/favourites/${itemId}`, { method: "POST" });
      if (data.isFavourite) state.favouriteIds.add(itemId);
      else state.favouriteIds.delete(itemId);
      state.menu = state.menu.map((item) => item.id === itemId ? { ...item, isFavourite: data.isFavourite } : item);
      if (state.selectedItem?.id === itemId) state.selectedItem.isFavourite = data.isFavourite;
      state.favourites = state.favourites.filter((item) => data.isFavourite || item.id !== itemId);
      render();
      showActionFeedback(data.isFavourite ? "Added to favourites" : "Favourite deleted", data.isFavourite ? "Saved to your personal food list." : "The item was removed from your saved list.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function addToCart(itemId, quantity = 1) {
  await runOnce(`cart:add:${itemId}`, async () => {
    try {
      const data = await api("/api/cart/items", { method: "POST", body: JSON.stringify({ itemId, quantity }) });
      state.cart = data.cart;
      render();
      showToast("Added to your cart");
    } catch (error) {
      if (error.details?.code === "CART_CANTEEN_CONFLICT") {
        const replace = window.confirm("Your cart contains items from another canteen. Clear it and start this canteen order?");
        if (replace) {
          const data = await api("/api/cart/items", { method: "POST", body: JSON.stringify({ itemId, quantity, replaceCanteen: true }) });
          state.cart = data.cart;
          render();
          showToast("Cart switched to the selected canteen");
        }
        return;
      }
      showToast(error.message, "error");
    }
  });
}

async function updateCartItem(itemId, quantity) {
  await runOnce(`cart:update:${itemId}`, async () => {
    try {
      const data = await api(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      state.cart = data.cart;
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function openWallet() {
  state.route = "wallet";
  state.wallet = null;
  await loadWallet();
}

async function placeOrder() {
  if (state.processing) return;
  state.processing = true;
  render();
  try {
    const [data] = await Promise.all([
      api("/api/orders", { method: "POST", body: JSON.stringify({ paymentMethod: state.paymentMethod }) }),
      delay(1100),
    ]);
    state.cart = data.cart;
    state.selectedOrder = data.order;
    await hydrate();
    state.route = "orderSuccess";
    showToast(`Order ${data.order.orderNumber} confirmed`);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.processing = false;
    render();
  }
}

async function openOrder(orderId) {
  await runOnce(`order:open:${orderId}`, async () => {
    try {
      const data = await api(`/api/orders/${orderId}`);
      state.selectedOrder = data.order;
      state.route = "orderDetail";
      render();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function cancelOrder(orderId) {
  await runOnce(`order:cancel:${orderId}`, async () => {
    if (!window.confirm("Cancel this queued order? Wallet payments will be refunded.")) return;
    try {
      const data = await api(`/api/orders/${orderId}/cancel`, { method: "POST" });
      state.selectedOrder = data.order;
      await hydrate();
      render();
      showToast("Order cancelled and refund recorded");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function topUp(amount) {
  await runOnce(`wallet:topup:${amount}`, async () => {
    try {
      const data = await api("/api/wallet/top-up", { method: "POST", body: JSON.stringify({ amount }) });
      state.user.walletBalance = data.balance;
      state.user.rewardTokens = data.rewardTokens;
      await loadWallet();
      showToast(`${currency(amount)} added to your wallet`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function updateAdminOrder(orderId, status) {
  await runOnce(`admin:order:${orderId}`, async () => {
    try {
      await api(`/api/admin/orders/${orderId}/status`, { method: "POST", body: JSON.stringify({ status }) });
      await loadAdmin({ quiet: true });
      showToast(`Order marked ${orderStatus(status).label.toLowerCase()}`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function saveAdminItem(form) {
  if (state.processing) return;
  const formData = new FormData(form);
  state.processing = true;
  render();
  try {
    let imageUrl = String(formData.get("imageUrl") || "/assets/foods/rice-and-curry.png");
    const imageFile = formData.get("image");
    if (imageFile instanceof File && imageFile.size) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const uploaded = await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ dataUrl, fileName: imageFile.name }) });
      imageUrl = uploaded.imageUrl;
    }
    const payload = {
      canteenId: state.currentCanteenId,
      name: formData.get("name"),
      category: formData.get("category"),
      price: Number(formData.get("price")),
      discount: Number(formData.get("discount")),
      prepMinutes: Number(formData.get("prepMinutes")),
      description: formData.get("description"),
      imageUrl,
      isVeg: formData.get("isVeg") === "on",
      isAvailable: formData.get("isAvailable") === "on",
      featured: formData.get("featured") === "on",
    };
    const isEditing = Boolean(state.adminEditing?.id);
    if (isEditing) await api(`/api/admin/menu/${state.adminEditing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    else await api("/api/admin/menu", { method: "POST", body: JSON.stringify(payload) });
    const message = isEditing ? "Menu item updated" : "Menu item added";
  state.adminEditing = null;
  state.workerOrder = null;
  state.workerCameraError = "";
    await loadAdmin({ quiet: true });
    showActionFeedback(message, isEditing ? "Your changes are live in the canteen menu." : "The new item is ready in this canteen.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    state.processing = false;
    render();
  }
}

async function archiveAdminItem(itemId) {
  await runOnce(`admin:archive:${itemId}`, async () => {
    if (!window.confirm("Archive this menu item? Existing order records will be kept.")) return;
    try {
      await api(`/api/admin/menu/${itemId}`, { method: "DELETE" });
      state.adminEditing = null;
      await loadAdmin({ quiet: true });
      showActionFeedback("Item deleted", "The item is hidden from students; order history is preserved.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (target.classList.contains("modal-backdrop") && event.target.closest("[data-modal-panel]")) return;
  if (action === "navigate") {
    const route = target.dataset.route;
    if (route === "favourites") {
      state.route = route;
      await loadFavourites();
    } else if (route === "orders") {
      state.route = route;
      await loadOrders();
    } else navigate(route);
  }
  if (action === "auth-role") {
    state.authRole = target.dataset.role;
    state.authView = "login";
    render();
  }
  if (action === "auth-view") {
    state.authView = target.dataset.view;
    render();
  }
  if (action === "switch-canteen") await setCanteen(target.dataset.canteenId);
  if (action === "category") {
    state.category = target.dataset.category;
    await loadMenu();
  }
  if (action === "clear-search") {
    state.search = "";
    await loadMenu();
  }
  if (action === "view-item") await loadItem(Number(target.dataset.itemId));
  if (action === "toggle-favourite") await toggleFavourite(Number(target.dataset.itemId));
  if (action === "quick-add") await addToCart(Number(target.dataset.itemId));
  if (action === "item-quantity") {
    state.itemQuantity = Math.min(20, Math.max(1, state.itemQuantity + Number(target.dataset.delta)));
    render();
  }
  if (action === "add-item-cart") await addToCart(Number(target.dataset.itemId), state.itemQuantity);
  if (action === "open-review") {
    state.route = "review";
    state.reviewRating = 5;
    render();
  }
  if (action === "close-review") {
    state.route = "item";
    render();
  }
  if (action === "review-rating") {
    state.reviewRating = Number(target.dataset.rating);
    render();
  }
  if (action === "cart-quantity") await updateCartItem(Number(target.dataset.itemId), Number(target.dataset.quantity));
  if (action === "clear-cart") {
    if (window.confirm("Clear every item from this cart?")) {
      const data = await api("/api/cart", { method: "DELETE" });
      state.cart = data.cart;
      render();
    }
  }
  if (action === "checkout") {
    state.paymentMethod = "wallet";
    navigate("checkout");
  }
  if (action === "payment-method") {
    state.paymentMethod = target.dataset.method;
    render();
  }
  if (action === "place-order") await placeOrder();
  if (action === "open-order") await openOrder(Number(target.dataset.orderId));
  if (action === "cancel-order") await cancelOrder(Number(target.dataset.orderId));
  if (action === "open-wallet") await openWallet();
  if (action === "top-up") await topUp(Number(target.dataset.amount));
  if (action === "worker-start-scan") await startWorkerScanner();
  if (action === "worker-stop-scan") stopWorkerScanner({ renderView: true });
  if (action === "worker-toggle-item") await toggleWorkerItem(Number(target.dataset.itemId), target.dataset.served === "true");
  if (action === "worker-complete") await completeWorkerOrder();
  if (action === "worker-clear-order") {
    state.workerOrder = null;
    state.workerCameraError = "";
    render();
  }
  if (action === "logout") logout();
  if (action === "admin-tab") {
    state.adminTab = target.dataset.tab;
    render();
  }
  if (action === "admin-add") {
    state.adminEditing = {};
    render();
  }
  if (action === "admin-edit") {
    state.adminEditing = state.adminSummary.menu.find((item) => item.id === Number(target.dataset.itemId)) || {};
    render();
  }
  if (action === "admin-close-modal") {
    state.adminEditing = null;
    render();
  }
  if (action === "admin-delete") await archiveAdminItem(Number(target.dataset.itemId));
  if (action === "admin-order-status") await updateAdminOrder(Number(target.dataset.orderId), target.dataset.status);
  if (action === "admin-advance") {
    await runOnce(`admin:advance:${state.currentCanteenId}`, async () => {
      try {
        const result = await api(`/api/admin/canteens/${state.currentCanteenId}/advance`, { method: "POST" });
        await loadAdmin({ quiet: true });
        showToast(`Order advanced to ${orderStatus(result.status).label}`);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }
});

app.addEventListener("change", async (event) => {
  if (event.target.id === "admin-canteen") await setCanteen(event.target.value);
  if (event.target.matches('[data-action="admin-availability"]')) {
    const itemId = Number(event.target.dataset.itemId);
    const checked = event.target.checked;
    try {
      await runOnce(`admin:availability:${itemId}`, () => api(`/api/admin/menu/${itemId}`, { method: "PATCH", body: JSON.stringify({ isAvailable: checked }) }));
      await loadAdmin({ quiet: true });
      showToast(checked ? "Item is now available" : "Item marked unavailable");
    } catch (error) {
      event.target.checked = !checked;
      showToast(error.message, "error");
    }
  }
  if (event.target.matches('#admin-item-form input[type="file"]')) {
    const file = event.target.files[0];
    if (file) document.querySelector("#admin-image-preview").src = URL.createObjectURL(file);
  }
});

let searchTimer;
app.addEventListener("input", (event) => {
  if (event.target.id !== "menu-search") return;
  state.search = event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadMenu({ quiet: true }), 320);
});

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "worker-code-form") {
    const code = String(new FormData(event.target).get("code") || "").trim();
    if (code) await lookupWorkerOrder(code);
  }
  if (event.target.id === "search-form") {
    state.search = new FormData(event.target).get("search").toString();
    await loadMenu();
  }
  if (event.target.id === "auth-form") {
    const formData = new FormData(event.target);
    state.processing = true;
    render();
    try {
      const path = state.authView === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = Object.fromEntries(formData.entries());
      payload.role = state.authRole;
      const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
      state.token = data.token;
      localStorage.setItem("canteenflow_token", data.token);
      await startAuthenticatedApp();
      showToast(`Welcome, ${data.user.name.split(" ")[0]}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      state.processing = false;
      render();
    }
  }
  if (event.target.id === "review-form") {
    const formData = new FormData(event.target);
    state.processing = true;
    render();
    try {
      await api("/api/reviews", { method: "POST", body: JSON.stringify({ itemId: state.selectedItem.id, rating: state.reviewRating, comment: formData.get("comment") }) });
      const data = await api(`/api/menu/${state.selectedItem.id}`);
      state.selectedItem = data.item;
      state.selectedItemReviews = data.reviews;
      state.route = "item";
      showActionFeedback("Thank you", "Your review is now live for other students.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      state.processing = false;
      render();
    }
  }
  if (event.target.id === "admin-item-form") await saveAdminItem(event.target);
});

boot();
