import { requestJson } from "./http.js";
import { getOfflineOpenShift, isOfflineModeActive } from "../lib/offlinePos.js";

export function getOpenShiftOnline({ signal } = {}) {
  return requestJson("/api/shifts/open", { signal });
}

export function getOpenShift({ signal } = {}) {
  if (isOfflineModeActive()) {
    return Promise.resolve(getOfflineOpenShift());
  }
  return getOpenShiftOnline({ signal });
}

export function openShift(payload) {
  if (isOfflineModeActive()) {
    return Promise.reject(new Error("Shift opening is only available while online."));
  }
  return requestJson("/api/shifts/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function closeShift(id, payload) {
  if (isOfflineModeActive()) {
    return Promise.reject(new Error("Sync pending sales before cashing up this shift."));
  }
  return requestJson(`/api/shifts/${id}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listShifts({ from, to, signal } = {}) {
  if (isOfflineModeActive()) {
    return Promise.reject(new Error("Shift history is unavailable offline."));
  }
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return requestJson(qs ? `/api/shifts?${qs}` : "/api/shifts", { signal });
}
