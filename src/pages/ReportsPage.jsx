import { useEffect, useMemo, useState } from "react";
import { getReportsOverview } from "../api/reports.js";
import { listShifts } from "../api/shifts.js";
import {
  closeStocktakeSession,
  createStocktakeSession,
  getStocktakeSessionById,
  listStocktakeSessions,
  updateStocktakeCounts,
} from "../api/stocktakes.js";
import Modal from "../components/ui/Modal.jsx";

const LOW_STOCK_THRESHOLD = 5;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toLocalDateInputValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatCurrency(amountRaw) {
  const amount = Number(amountRaw ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDateTime(isoLike) {
  try {
    const d = new Date(isoLike);
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return String(isoLike);
  }
}

function formatPercent(pctRaw) {
  const pct = Number(pctRaw);
  if (!Number.isFinite(pct)) return "-";
  return `${pct.toFixed(2)}%`;
}

function getStatus(stockRaw) {
  const stock = Number(stockRaw ?? 0);
  if (stock <= 0) return { label: "Out of Stock", tone: "danger" };
  if (stock <= LOW_STOCK_THRESHOLD) return { label: "Low Stock", tone: "warn" };
  return { label: "In Stock", tone: "ok" };
}

function isOfflineShiftMessage(message) {
  return /offline/i.test(String(message || ""));
}

export default function ReportsPage({ search, onSearchChange, me }) {
  const isAdmin = useMemo(() => String(me?.role || "").toLowerCase() === "admin", [me]);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toLocalDateInputValue(d);
  });
  const [toDate, setToDate] = useState(() => toLocalDateInputValue(today));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState(null);
  const [sessionsError, setSessionsError] = useState("");
  const [shifts, setShifts] = useState(null);
  const [shiftsError, setShiftsError] = useState("");

  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({ name: "", note: "" });
  const [newSessionError, setNewSessionError] = useState("");
  const [newSessionSaving, setNewSessionSaving] = useState(false);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("");

  const refreshSessions = ({ signal } = {}) => {
    if (!isAdmin) return Promise.resolve([]);

    return listStocktakeSessions({ signal })
      .then((data) => {
        setSessionsError("");
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSessionsError(err?.message || "Failed to load inventory count sessions.");
        setSessions([]);
      });
  };

  const refreshShifts = ({ signal } = {}) => {
    if (!isAdmin) return Promise.resolve([]);

    return listShifts({ signal })
      .then((data) => {
        setShiftsError("");
        setShifts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (isOfflineShiftMessage(err?.message)) {
          setShiftsError("");
          setShifts([]);
          return;
        }
        setShiftsError(err?.message || "Failed to load shifts.");
        setShifts([]);
      });
  };

  useEffect(() => {
    if (!isAdmin) {
      setSessions([]);
      setShifts([]);
      return;
    }

    const controller = new AbortController();
    Promise.all([refreshSessions({ signal: controller.signal }), refreshShifts({ signal: controller.signal })]);
    return () => controller.abort();
  }, [isAdmin]);

  const runOverview = () => {
    if (!isAdmin) {
      setError("Admin access required to open reports.");
      return;
    }

    setError("");
    setLoading(true);

    getReportsOverview({
      from: `${fromDate} 00:00:00`,
      to: `${toDate} 23:59:59`,
    })
      .then((data) => {
        setReport(data);
        setError("");
      })
      .catch((err) => setError(err?.message || "Failed to generate reports."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    runOverview();
  }, [isAdmin]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(report?.products) ? report.products : [];
    const q = String(search || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => String(p.name || "").toLowerCase().includes(q) || String(p.productId || "").toLowerCase().includes(q));
  }, [report, search]);

  const filteredLines = useMemo(() => {
    const list = Array.isArray(report?.lines) ? report.lines : [];
    const q = String(search || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      return (
        String(item.saleId || "").toLowerCase().includes(q) ||
        String(item.cashierName || "").toLowerCase().includes(q) ||
        String(item.customerName || "").toLowerCase().includes(q) ||
        String(item.productName || "").toLowerCase().includes(q)
      );
    });
  }, [report, search]);

  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(report?.expenses) ? report.expenses : [];
    const q = String(search || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      return (
        String(item.userName || "").toLowerCase().includes(q) ||
        String(item.username || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q)
      );
    });
  }, [report, search]);

  const openCreateSession = () => {
    setNewSessionError("");
    setNewSessionForm({
      name: `Inventory Count ${toDate}`,
      note: "",
    });
    setNewSessionOpen(true);
  };

  const createSession = () => {
    setNewSessionError("");
    if (!isAdmin) {
      setNewSessionError("Admin access required.");
      return;
    }

    const name = newSessionForm.name.trim();
    const note = newSessionForm.note.trim() || null;
    if (!name) {
      setNewSessionError("Session name is required.");
      return;
    }

    setNewSessionSaving(true);
    createStocktakeSession({
      name,
      note,
      fromAt: `${fromDate} 00:00:00`,
      toAt: `${toDate} 23:59:59`,
    })
      .then(() => refreshSessions())
      .then(() => setNewSessionOpen(false))
      .catch((err) => setNewSessionError(err?.message || "Failed to create session."))
      .finally(() => setNewSessionSaving(false));
  };

  const openSession = (id) => {
    setSessionError("");
    setSessionModalOpen(true);
    setActiveSession(null);
    setSessionFilter("");

    getStocktakeSessionById(id)
      .then((data) => setActiveSession(data))
      .catch((err) => setSessionError(err?.message || "Failed to load session."));
  };

  const updateCountedStockLocal = (productId, raw) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const items = (prev.items || []).map((item) => {
        if (item.productId !== productId) return item;
        if (raw === "" || raw == null) return { ...item, countedStock: null };
        const parsed = Number.parseInt(String(raw), 10);
        return Number.isFinite(parsed) ? { ...item, countedStock: parsed } : { ...item, countedStock: null };
      });
      return { ...prev, items };
    });
  };

  const saveSessionCounts = () => {
    if (!activeSession?.id) return;

    const items = (activeSession.items || [])
      .filter((item) => item.countedStock != null)
      .map((item) => ({ productId: item.productId, countedStock: item.countedStock }));

    setSessionBusy(true);
    updateStocktakeCounts(activeSession.id, { items })
      .then(() => getStocktakeSessionById(activeSession.id))
      .then((data) => setActiveSession(data))
      .then(() => refreshSessions())
      .catch((err) => setSessionError(err?.message || "Failed to save counts."))
      .finally(() => setSessionBusy(false));
  };

  const closeSession = () => {
    if (!activeSession?.id) return;
    if (!window.confirm("Apply counted stock to inventory and close this session?")) return;

    const items = (activeSession.items || [])
      .filter((item) => item.countedStock != null)
      .map((item) => ({ productId: item.productId, countedStock: item.countedStock }));

    setSessionBusy(true);
    updateStocktakeCounts(activeSession.id, { items })
      .then(() => closeStocktakeSession(activeSession.id, {}))
      .then(() => refreshSessions())
      .then(() => setSessionModalOpen(false))
      .catch((err) => setSessionError(err?.message || "Failed to close session."))
      .finally(() => setSessionBusy(false));
  };

  return (
    <section className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>All Reports</h1>
          <p>Revenue, expenses, cash-up, and inventory counts for the selected range.</p>
        </div>
      </div>

      {error ? <div className="banner" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="grid">
        <div className="card col-12">
          <div className="card-header">
            <h3>Reporting Range</h3>
            <button className="btn primary" type="button" onClick={runOverview} disabled={loading || !isAdmin}>
              {loading ? "Refreshing..." : "Refresh Reports"}
            </button>
          </div>

          <div className="field-row">
            <div className="field" style={{ flex: "0 0 200px" }}>
              <label>From</label>
              <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="field" style={{ flex: "0 0 200px" }}>
              <label>To</label>
              <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="field" style={{ flex: "1 1 260px" }}>
              <label>Filter</label>
              <input
                className="input"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Filter products, expenses, cashiers, receipts..."
              />
            </div>
          </div>
        </div>

        {!isAdmin ? (
          <div className="card col-12">
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              Only admins can open the reporting workspace.
            </p>
          </div>
        ) : null}

        {report ? (
          <>
            <div className="card col-3">
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>Revenue</div>
              <div className="kpi-value">{formatCurrency(report.summary?.total || 0)}</div>
              <p className="kpi-sub">{Number(report.summary?.salesCount || 0).toLocaleString()} sales</p>
            </div>

            <div className="card col-3">
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>Expenses</div>
              <div className="kpi-value">{formatCurrency(report.summary?.totalExpenses || 0)}</div>
              <p className="kpi-sub">{Number(report.summary?.expenseEntries || 0).toLocaleString()} entries</p>
            </div>

            <div className="card col-3">
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>Gross Profit</div>
              <div className="kpi-value">{formatCurrency(report.summary?.grossProfit || 0)}</div>
              <p className="kpi-sub">Revenue minus COGS</p>
            </div>

            <div className="card col-3">
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>Net After Expenses</div>
              <div className="kpi-value">{formatCurrency(report.summary?.netAfterExpenses || 0)}</div>
              <p className="kpi-sub">Gross profit minus expenses</p>
            </div>

            <div className="card col-12">
              <div className="card-header">
                <h3>Expense by Staff</h3>
                <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                  {Array.isArray(report.expensesByUser) ? `${report.expensesByUser.length} people` : "0 people"}
                </div>
              </div>

              <div className="table-wrap" aria-label="Expense by staff">
                <table className="table table-plain table-wide">
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Entries</th>
                      <th>Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(report.expensesByUser) && report.expensesByUser.length > 0 ? (
                      report.expensesByUser.map((item) => (
                        <tr key={item.userId}>
                          <td>
                            <div className="cell-main">{item.userName || "-"}</div>
                            <div className="cell-sub">{item.username ? `@${item.username}` : "Staff"}</div>
                          </td>
                          <td>{Number(item.entriesCount || 0).toLocaleString()}</td>
                          <td>{formatCurrency(item.totalAmount || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No expenses in this range.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card col-12">
              <div className="card-header">
                <h3>Expense Ledger</h3>
                <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                  {filteredExpenses.length} entries
                </div>
              </div>

              <div className="table-wrap" aria-label="Expense ledger">
                <table className="table table-plain table-wide">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Spent By</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((item) => (
                        <tr key={item.id}>
                          <td>{formatDateTime(item.spentAt)}</td>
                          <td>
                            <div className="cell-main">{item.userName || "-"}</div>
                            <div className="cell-sub">{item.username ? `@${item.username}` : "Staff"}</div>
                          </td>
                          <td>{item.category || "General"}</td>
                          <td>{item.description}</td>
                          <td>{formatCurrency(item.amount || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No matching expenses.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card col-12">
              <div className="card-header">
                <h3>Inventory and Sales Breakdown</h3>
                <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                  {filteredProducts.length} products
                </div>
              </div>

              <div className="table-wrap" aria-label="Inventory breakdown">
                <table className="table table-plain table-wide">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Sold</th>
                      <th>Avg Sold Price</th>
                      <th>Avg Cost</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => {
                        const status = getStatus(product.currentStock);
                        const revenue = Number(product.revenue || 0);
                        const cogs = Number(product.cogs || 0);
                        const profit = Number(product.grossProfit ?? revenue - cogs);
                        const marginPct =
                          product.marginPct != null ? Number(product.marginPct) : revenue > 0 ? (profit / revenue) * 100 : null;

                        return (
                          <tr key={product.productId}>
                            <td>
                              <strong style={{ letterSpacing: -0.2 }}>{product.name}</strong>
                              <div className="cell-sub">
                                #{product.productId} Price {formatCurrency(product.currentPrice || 0)} Cost{" "}
                                {formatCurrency(product.currentCost || 0)}
                              </div>
                            </td>
                            <td>{Number(product.qtySold || 0).toLocaleString()}</td>
                            <td>{product.avgUnitPrice == null ? "-" : formatCurrency(product.avgUnitPrice)}</td>
                            <td>{product.avgUnitCost == null ? "-" : formatCurrency(product.avgUnitCost)}</td>
                            <td>
                              <div className="cell-main">{formatCurrency(revenue)}</div>
                              <div className="cell-sub">COGS {formatCurrency(cogs)}</div>
                            </td>
                            <td>
                              <div
                                className="cell-main"
                                style={{ color: profit < 0 ? "var(--danger)" : "var(--ok)" }}
                              >
                                {formatCurrency(profit)}
                              </div>
                              <div className="cell-sub">Margin {formatPercent(marginPct)}</div>
                            </td>
                            <td>{Number(product.currentStock || 0).toLocaleString()}</td>
                            <td>
                              <span className={`badge ${status.tone}`}>{status.label}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8}>No products found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card col-12">
              <div className="card-header">
                <h3>Line Items</h3>
                <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                  Showing {filteredLines.length} lines
                </div>
              </div>

              <div className="table-wrap" aria-label="Line items preview">
                <table className="table table-plain table-wide">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sale</th>
                      <th>Cashier</th>
                      <th>Customer</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Unit Cost</th>
                      <th>Total</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.length > 0 ? (
                      filteredLines.map((item) => (
                        <tr key={`${item.saleId}-${item.productId}-${item.createdAt}-${item.unitPrice}`}>
                          <td>{formatDateTime(item.createdAt)}</td>
                          <td>#{item.saleId}</td>
                          <td>{item.cashierName || "-"}</td>
                          <td>{item.customerName || "Walk-in"}</td>
                          <td>{item.productName}</td>
                          <td>{Number(item.qty || 0).toLocaleString()}</td>
                          <td>{formatCurrency(item.unitPrice || 0)}</td>
                          <td>{formatCurrency(item.unitCost || 0)}</td>
                          <td>{formatCurrency(item.lineTotal || 0)}</td>
                          <td>{formatCurrency(item.lineProfit || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10}>No line items in this range.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div className="card col-12">
          <div className="card-header">
            <h3>Inventory Count Sessions</h3>
            <button className="btn primary" type="button" onClick={openCreateSession} disabled={!isAdmin}>
              New Session
            </button>
          </div>

          {sessionsError ? <div className="banner" style={{ marginBottom: 12 }}>{sessionsError}</div> : null}

          <div className="table-wrap" aria-label="Inventory count sessions">
            <table className="table table-plain table-wide">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Range</th>
                  <th>Counted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions === null ? (
                  <tr>
                    <td colSpan={6}>Loading sessions...</td>
                  </tr>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <strong style={{ letterSpacing: -0.2 }}>{session.name}</strong>
                        <div className="cell-sub">#{session.id}</div>
                      </td>
                      <td>
                        <span className={`badge ${session.status === "closed" ? "ok" : "warn"}`}>{session.status}</span>
                      </td>
                      <td>{session.createdAt ? formatDateTime(session.createdAt) : "-"}</td>
                      <td>
                        {session.fromAt ? String(session.fromAt).slice(0, 10) : "-"} to{" "}
                        {session.toAt ? String(session.toAt).slice(0, 10) : "-"}
                      </td>
                      <td>
                        {Number(session.countedCount || 0).toLocaleString()} / {Number(session.itemsCount || 0).toLocaleString()}
                      </td>
                      <td>
                        <button className="btn" type="button" onClick={() => openSession(session.id)} disabled={!isAdmin}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No sessions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card col-12">
          <div className="card-header">
            <h3>Shifts / Cash-up</h3>
            <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
              Latest activity
            </div>
          </div>

          {shiftsError ? <div className="banner" style={{ marginBottom: 12 }}>{shiftsError}</div> : null}

          <div className="table-wrap" aria-label="Shifts">
            <table className="table table-plain table-wide">
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Cashier</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Sales</th>
                  <th>Expected</th>
                  <th>Closing</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {shifts === null ? (
                  <tr>
                    <td colSpan={8}>Loading shifts...</td>
                  </tr>
                ) : shifts.length > 0 ? (
                  shifts.slice(0, 20).map((shift) => (
                    <tr key={shift.id}>
                      <td>#{shift.id}</td>
                      <td>{shift.cashierName || shift.cashierId || "-"}</td>
                      <td>{shift.openedAt ? formatDateTime(shift.openedAt) : "-"}</td>
                      <td>{shift.closedAt ? formatDateTime(shift.closedAt) : <span className="badge warn">open</span>}</td>
                      <td>{formatCurrency(shift.salesTotal || 0)}</td>
                      <td>{formatCurrency(shift.expectedCash || 0)}</td>
                      <td>{shift.closingCash == null ? "-" : formatCurrency(shift.closingCash)}</td>
                      <td style={{ color: Number(shift.variance || 0) < 0 ? "var(--danger)" : "var(--ok)", fontWeight: 900 }}>
                        {shift.variance == null ? "-" : formatCurrency(shift.variance)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No shift history available for this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={newSessionOpen}
        title="New Inventory Count Session"
        subtitle={`Range: ${fromDate} to ${toDate}`}
        onClose={() => setNewSessionOpen(false)}
      >
        {newSessionError ? <div className="banner" style={{ marginBottom: 12 }}>{newSessionError}</div> : null}

        <div className="field">
          <label>Session Name</label>
          <input
            className="input"
            value={newSessionForm.name}
            onChange={(e) => setNewSessionForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. End of Month Count"
            autoFocus
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Note (optional)</label>
          <input
            className="input"
            value={newSessionForm.note}
            onChange={(e) => setNewSessionForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Who counted, notes, etc."
          />
        </div>

        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={() => setNewSessionOpen(false)} disabled={newSessionSaving}>
            Cancel
          </button>
          <button className="btn primary" type="button" onClick={createSession} disabled={newSessionSaving}>
            {newSessionSaving ? "Creating..." : "Create Session"}
          </button>
        </div>
      </Modal>

      <Modal
        open={sessionModalOpen}
        title={activeSession?.name || "Inventory Count Session"}
        subtitle={activeSession?.id ? `Session #${activeSession.id}` : "Enter physical counts and reconcile inventory"}
        onClose={() => setSessionModalOpen(false)}
      >
        {sessionError ? <div className="banner" style={{ marginBottom: 12 }}>{sessionError}</div> : null}

        {!activeSession ? (
          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Loading session...</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                Status: <strong>{activeSession.status}</strong>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
                Range:{" "}
                <strong>
                  {activeSession.fromAt ? String(activeSession.fromAt).slice(0, 10) : "-"} to{" "}
                  {activeSession.toAt ? String(activeSession.toAt).slice(0, 10) : "-"}
                </strong>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label>Filter Products</label>
              <input
                className="input"
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                placeholder="Type to filter..."
              />
            </div>

            <div className="table-wrap" aria-label="Session counts">
              <table className="table table-plain table-wide">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Expected</th>
                    <th>Counted</th>
                    <th>Variance</th>
                    <th>Current</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeSession.items || [])
                    .filter((item) => {
                      const q = String(sessionFilter || "").trim().toLowerCase();
                      if (!q) return true;
                      return (
                        String(item.productName || "").toLowerCase().includes(q) ||
                        String(item.productId || "").toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 80)
                    .map((item) => {
                      const counted = item.countedStock == null ? "" : String(item.countedStock);
                      const variance =
                        item.countedStock == null ? null : Number(item.countedStock) - Number(item.expectedStock || 0);

                      return (
                        <tr key={item.productId}>
                          <td>
                            <strong style={{ letterSpacing: -0.2 }}>{item.productName}</strong>
                            <div className="cell-sub">#{item.productId}</div>
                          </td>
                          <td>{Number(item.expectedStock || 0).toLocaleString()}</td>
                          <td>
                            {activeSession.status === "closed" ? (
                              item.countedStock == null ? "-" : Number(item.countedStock).toLocaleString()
                            ) : (
                              <input
                                className="input sm"
                                style={{ width: 120 }}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={counted}
                                onChange={(e) => updateCountedStockLocal(item.productId, e.target.value)}
                              />
                            )}
                          </td>
                          <td style={{ fontWeight: 900, color: variance != null && variance < 0 ? "var(--danger)" : "var(--ok)" }}>
                            {variance == null ? "-" : variance.toLocaleString()}
                          </td>
                          <td>{item.currentStock == null ? "-" : Number(item.currentStock).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setSessionModalOpen(false)} disabled={sessionBusy}>
                Close
              </button>
              <button className="btn" type="button" onClick={saveSessionCounts} disabled={sessionBusy || activeSession.status === "closed"}>
                {sessionBusy ? "Saving..." : "Save Counts"}
              </button>
              <button className="btn primary" type="button" onClick={closeSession} disabled={sessionBusy || activeSession.status === "closed"}>
                {sessionBusy ? "Applying..." : "Apply and Close"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
