import { requestJson } from "./http.js";

export function listExpenses({ from, to, limit, signal } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  return requestJson(qs ? `/api/expenses?${qs}` : "/api/expenses", { signal });
}

export function createExpense(payload) {
  return requestJson("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
