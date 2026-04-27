import { requestJson } from "./http.js";

export function getReportsOverview({ from, to, signal } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const qs = params.toString();
  return requestJson(qs ? `/api/reports/overview?${qs}` : "/api/reports/overview", { signal });
}
