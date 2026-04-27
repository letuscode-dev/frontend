const OFFLINE_POS_KEY = "tone:offline-pos:v1";
export const OFFLINE_POS_EVENT = "tone:offline:changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readState() {
  if (!canUseStorage()) return { offlineModeActive: false, snapshot: null, queue: [], actor: null };
  try {
    const raw = window.localStorage.getItem(OFFLINE_POS_KEY);
    if (!raw) return { offlineModeActive: false, snapshot: null, queue: [], actor: null };
    const parsed = JSON.parse(raw);
    return {
      offlineModeActive: Boolean(parsed?.offlineModeActive),
      snapshot: parsed?.snapshot && typeof parsed.snapshot === "object" ? parsed.snapshot : null,
      queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
      actor: parsed?.actor && typeof parsed.actor === "object" ? parsed.actor : null,
      lastSyncAt: parsed?.lastSyncAt || null,
      lastSyncError: parsed?.lastSyncError || "",
    };
  } catch {
    return { offlineModeActive: false, snapshot: null, queue: [], actor: null };
  }
}

function writeState(next) {
  if (!canUseStorage()) return next;
  window.localStorage.setItem(OFFLINE_POS_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_POS_EVENT, { detail: getOfflineMeta() }));
  } catch {
    // ignore
  }
  return next;
}

function toMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function normalizeDateLike(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => ({
    id: Number(p.id),
    name: String(p.name || ""),
    price: Number(p.price ?? 0),
    costPrice: Number(p.costPrice ?? p.cost_price ?? 0),
    stock: Number(p.stock ?? 0),
  }));
}

function normalizeSales(sales) {
  if (!Array.isArray(sales)) return [];
  return sales.map((sale) => ({
    id: sale.id,
    customerName: sale.customerName || null,
    subtotal: Number(sale.subtotal ?? 0),
    total: Number(sale.total ?? 0),
    createdAt: normalizeDateLike(sale.createdAt) || new Date().toISOString(),
    cashierId: sale.cashierId ?? sale.cashier?.id ?? null,
    cashierName: sale.cashierName ?? sale.cashier?.name ?? "",
    itemsCount: Number(sale.itemsCount ?? sale.items?.length ?? 0),
    items: Array.isArray(sale.items)
      ? sale.items.map((it) => ({
          productId: Number(it.productId),
          name: String(it.name || ""),
          qty: Number(it.qty ?? 0),
          unitPrice: Number(it.unitPrice ?? 0),
          unitCost: Number(it.unitCost ?? 0),
          lineTotal: Number(it.lineTotal ?? 0),
        }))
      : null,
    offlinePending: Boolean(sale.offlinePending),
  }));
}

function normalizeShift(shift) {
  if (!shift || typeof shift !== "object") return null;
  return {
    id: shift.id ?? null,
    cashierId: shift.cashierId ?? null,
    openedAt: normalizeDateLike(shift.openedAt) || new Date().toISOString(),
    closedAt: normalizeDateLike(shift.closedAt),
    openingFloat: Number(shift.openingFloat ?? 0),
    closingCash: shift.closingCash == null ? null : Number(shift.closingCash),
    salesTotal: Number(shift.salesTotal ?? 0),
    expectedCash: Number(shift.expectedCash ?? 0),
    variance: shift.variance == null ? null : Number(shift.variance),
  };
}

function sortSalesNewestFirst(sales) {
  return [...sales].sort((a, b) => {
    const ta = Date.parse(a.createdAt || 0) || 0;
    const tb = Date.parse(b.createdAt || 0) || 0;
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  });
}

function mergedSales(snapshot, queue) {
  const base = Array.isArray(snapshot?.sales) ? snapshot.sales : [];
  const pending = Array.isArray(queue) ? queue.map((q) => q.sale) : [];
  return sortSalesNewestFirst([...pending, ...base]);
}

function filterSales(sales, { from, to, limit } = {}) {
  let next = [...sales];
  if (from) {
    const fromMs = Date.parse(from);
    if (Number.isFinite(fromMs)) next = next.filter((sale) => (Date.parse(sale.createdAt || 0) || 0) >= fromMs);
  }
  if (to) {
    const toMs = Date.parse(`${to}T23:59:59`);
    if (Number.isFinite(toMs)) next = next.filter((sale) => (Date.parse(sale.createdAt || 0) || 0) <= toMs);
  }
  if (limit != null && String(limit).trim() !== "") {
    const parsed = Number.parseInt(String(limit), 10);
    if (Number.isFinite(parsed) && parsed > 0) next = next.slice(0, parsed);
  }
  return next;
}

export function getOfflineMeta() {
  const state = readState();
  return {
    offlineModeActive: Boolean(state.offlineModeActive),
    hasSnapshot: Boolean(state.snapshot),
    pendingCount: Array.isArray(state.queue) ? state.queue.length : 0,
    downloadedAt: state.snapshot?.downloadedAt || null,
    lastSyncAt: state.lastSyncAt || null,
    lastSyncError: state.lastSyncError || "",
    actorName: state.actor?.name || "",
  };
}

export function isOfflineModeActive() {
  return Boolean(readState().offlineModeActive);
}

export function hasOfflineSnapshot() {
  return Boolean(readState().snapshot);
}

export function setOfflineActor(user) {
  const state = readState();
  const actor =
    user && typeof user === "object"
      ? {
          id: user.id ?? null,
          name: String(user.name || ""),
          username: String(user.username || ""),
          role: String(user.role || ""),
          canDiscount: Boolean(user.canDiscount),
        }
      : null;
  writeState({ ...state, actor });
}

export function clearOfflineActor() {
  const state = readState();
  writeState({ ...state, actor: null, offlineModeActive: false });
}

export function saveOfflineSnapshot({ products, sales, openShift, actor }) {
  const state = readState();
  const snapshot = {
    downloadedAt: new Date().toISOString(),
    products: normalizeProducts(products),
    sales: normalizeSales(sales),
    openShift: normalizeShift(openShift),
  };

  return writeState({
    ...state,
    snapshot,
    actor:
      actor && typeof actor === "object"
        ? {
            id: actor.id ?? null,
            name: String(actor.name || ""),
            username: String(actor.username || ""),
            role: String(actor.role || ""),
            canDiscount: Boolean(actor.canDiscount),
          }
        : state.actor,
    lastSyncError: "",
  });
}

export function setOfflineModeActive(active) {
  const state = readState();
  if (active && !state.snapshot) {
    throw new Error("Download offline data first.");
  }
  return writeState({ ...state, offlineModeActive: Boolean(active) });
}

export function clearOfflineSyncError() {
  const state = readState();
  return writeState({ ...state, lastSyncError: "" });
}

export function markOfflineSyncResult({ lastSyncAt = null, lastSyncError = "" } = {}) {
  const state = readState();
  return writeState({
    ...state,
    lastSyncAt: lastSyncAt || state.lastSyncAt || null,
    lastSyncError: String(lastSyncError || ""),
  });
}

export function getOfflineProducts() {
  const state = readState();
  return normalizeProducts(state.snapshot?.products || []);
}

export function getOfflineSales(options = {}) {
  const state = readState();
  return filterSales(mergedSales(state.snapshot, state.queue), options);
}

export function getOfflineSaleById(id) {
  const state = readState();
  const targetId = String(id);
  const sales = mergedSales(state.snapshot, state.queue);
  const sale = sales.find((it) => String(it.id) === targetId);
  if (!sale) throw new Error("Sale not found in offline data.");
  if (!Array.isArray(sale.items)) {
    throw new Error("This receipt was not downloaded for offline use.");
  }
  return {
    ...sale,
    items: sale.items,
  };
}

export function getOfflineOpenShift() {
  const state = readState();
  const shift = normalizeShift(state.snapshot?.openShift);
  if (!shift) return null;
  const pendingSales = Array.isArray(state.queue) ? state.queue.map((q) => q.sale) : [];
  const extraTotal = pendingSales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
  const salesTotal = toMoney(Number(shift.salesTotal || 0) + extraTotal);
  return {
    ...shift,
    salesTotal,
    expectedCash: toMoney(Number(shift.openingFloat || 0) + salesTotal),
  };
}

export function queueOfflineSale(payload) {
  const state = readState();
  if (!state.snapshot) throw new Error("Download offline data first.");
  if (!state.offlineModeActive) throw new Error("Offline mode is not active.");

  const actor = state.actor;
  if (!actor?.id) throw new Error("Offline user session is missing. Sign in again before using offline mode.");

  const products = normalizeProducts(state.snapshot.products || []);
  const productMap = new Map(products.map((p) => [Number(p.id), p]));
  const itemsInput = Array.isArray(payload?.items) ? payload.items : [];
  if (itemsInput.length === 0) throw new Error("Sale items are required.");

  const computedItems = [];
  let subtotal = 0;

  for (const raw of itemsInput) {
    const productId = Number(raw?.productId);
    const qty = Number.parseInt(String(raw?.qty), 10);
    if (!Number.isFinite(productId) || !Number.isFinite(qty) || qty <= 0) {
      throw new Error("Valid sale items are required.");
    }

    const product = productMap.get(productId);
    if (!product) throw new Error(`Product ${productId} not found in offline stock.`);

    const available = Number(product.stock ?? 0);
    if (available < qty) {
      throw new Error(`Insufficient stock for "${product.name}" (have ${available}, need ${qty}).`);
    }

    const baseUnitPrice = toMoney(product.price);
    const unitPrice = raw?.unitPrice == null ? baseUnitPrice : toMoney(raw.unitPrice);
    if (unitPrice > baseUnitPrice) {
      throw new Error(`Discount price cannot be higher than the product price for "${product.name}".`);
    }
    if (unitPrice < baseUnitPrice && !(String(actor.role) === "admin" || actor.canDiscount)) {
      throw new Error("Discount permission required for this cashier.");
    }

    const lineTotal = toMoney(unitPrice * qty);
    subtotal = toMoney(subtotal + lineTotal);
    computedItems.push({
      productId,
      name: product.name,
      qty,
      unitPrice,
      unitCost: toMoney(product.costPrice),
      lineTotal,
    });
  }

  const createdAt = new Date().toISOString();
  const clientSaleId = `offline-${actor.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sale = {
    id: clientSaleId,
    clientSaleId,
    customerName: String(payload?.customerName || "").trim() || null,
    subtotal,
    total: subtotal,
    createdAt,
    cashierId: actor.id,
    cashierName: actor.name || actor.username || "",
    cashier: { id: actor.id, name: actor.name || actor.username || "", role: actor.role || "" },
    itemsCount: computedItems.length,
    items: computedItems,
    offlinePending: true,
  };

  const nextProducts = products.map((product) => {
    const matched = computedItems.find((item) => item.productId === product.id);
    if (!matched) return product;
    return { ...product, stock: Math.max(0, Number(product.stock || 0) - Number(matched.qty || 0)) };
  });

  const queueItem = {
    clientSaleId,
    payload: {
      clientSaleId,
      createdAt,
      customerName: sale.customerName,
      items: computedItems.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        ...(it.unitPrice !== toMoney(productMap.get(it.productId)?.price) ? { unitPrice: it.unitPrice } : null),
      })),
    },
    sale,
  };

  writeState({
    ...state,
    snapshot: {
      ...state.snapshot,
      products: nextProducts,
    },
    queue: [queueItem, ...(Array.isArray(state.queue) ? state.queue : [])],
  });

  return sale;
}

export function getPendingOfflineSales() {
  const state = readState();
  return Array.isArray(state.queue) ? [...state.queue] : [];
}

export function clearPendingOfflineSales() {
  const state = readState();
  return writeState({ ...state, queue: [] });
}

export function replaceOfflineSnapshotAfterSync({ products, sales, openShift }) {
  const state = readState();
  return writeState({
    ...state,
    snapshot: {
      downloadedAt: new Date().toISOString(),
      products: normalizeProducts(products),
      sales: normalizeSales(sales),
      openShift: normalizeShift(openShift),
    },
    queue: [],
    offlineModeActive: false,
    lastSyncAt: new Date().toISOString(),
    lastSyncError: "",
  });
}
