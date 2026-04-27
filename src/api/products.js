import { requestJson } from "./http.js";
import { getOfflineProducts, isOfflineModeActive } from "../lib/offlinePos.js";

export function listProductsOnline({ signal } = {}) {
  return requestJson("/api/products", { signal });
}

export function listProducts({ signal } = {}) {
  if (isOfflineModeActive()) {
    return Promise.resolve(getOfflineProducts());
  }
  return listProductsOnline({ signal });
}

export function createProduct(product) {
  return requestJson("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function updateProduct(id, product) {
  return requestJson(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id) {
  return requestJson(`/api/products/${id}`, { method: "DELETE" });
}
