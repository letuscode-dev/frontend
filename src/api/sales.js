import { requestJson } from "./http.js";
import {
  getOfflineSaleById,
  getOfflineSales,
  isOfflineModeActive,
  queueOfflineSale,
} from "../lib/offlinePos.js";

export function listSalesOnline({ from, to, limit, signal } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", String(from));
  if (to) params.set("to", String(to));
  if (limit != null && String(limit).trim() !== "") params.set("limit", String(limit));
  const qs = params.toString();
  return requestJson(`/api/sales${qs ? `?${qs}` : ""}`, { signal });
}

export function listSales({ from, to, limit, signal } = {}) {
  if (isOfflineModeActive()) {
    return Promise.resolve(getOfflineSales({ from, to, limit }));
  }
  return listSalesOnline({ from, to, limit, signal });
}

export function getSaleById(id, { signal } = {}) {
  if (isOfflineModeActive()) {
    try {
      return Promise.resolve(getOfflineSaleById(id));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return requestJson(`/api/sales/${id}`, { signal });
}

export function createSale(payload) {
  if (isOfflineModeActive()) {
    try {
      return Promise.resolve(queueOfflineSale(payload));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return requestJson("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createSaleOnline(payload) {
  return requestJson("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateSale(id, payload) {
  return requestJson(`/api/sales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteSale(id) {
  return requestJson(`/api/sales/${id}`, {
    method: "DELETE",
  });
}
