import { useEffect, useMemo, useState } from "react";
import LineChart from "../components/charts/LineChart.jsx";
import { createExpense, listExpenses } from "../api/expenses.js";
import { listProducts } from "../api/products.js";
import { listSales } from "../api/sales.js";

const DASHBOARD_NOW_MS = Date.now();
const DASHBOARD_NOW_DATE = new Date(DASHBOARD_NOW_MS);

function formatCurrency(amount) {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDateTimeParts(isoLike) {
  try {
    const d = new Date(isoLike);
    const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(d);
    const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
    return { date, time };
  } catch {
    return { date: String(isoLike), time: "" };
  }
}

function formatDateTime(isoLike) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoLike));
  } catch {
    return String(isoLike || "-");
  }
}

function todayInputValue() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DashboardPage({ me, offlineRevision = 0 }) {
  const [products, setProducts] = useState(null);
  const [sales, setSales] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [productsError, setProductsError] = useState("");
  const [salesError, setSalesError] = useState("");
  const [expensesError, setExpensesError] = useState("");
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "",
    description: "",
    spentAt: todayInputValue(),
  });

  const isAdmin = String(me?.role || "").toLowerCase() === "admin";

  const totalSales = useMemo(() => {
    if (!Array.isArray(sales)) return 0;
    const ms14d = 14 * 24 * 60 * 60 * 1000;
    return sales.reduce((acc, s) => {
      const t = Date.parse(s.createdAt);
      if (!Number.isFinite(t)) return acc;
      if (DASHBOARD_NOW_MS - t > ms14d) return acc;
      return acc + Number(s.total || 0);
    }, 0);
  }, [sales]);

  const totalExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return 0;
    const ms14d = 14 * 24 * 60 * 60 * 1000;
    return expenses.reduce((acc, item) => {
      const t = Date.parse(item.spentAt);
      if (!Number.isFinite(t)) return acc;
      if (DASHBOARD_NOW_MS - t > ms14d) return acc;
      return acc + Number(item.amount || 0);
    }, 0);
  }, [expenses]);

  const series = useMemo(() => {
    const days = 7;
    const now = DASHBOARD_NOW_DATE;
    const buckets = new Map();

    const pad2 = (n) => String(n).padStart(2, "0");
    for (let i = 0; i < days; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      buckets.set(key, 0);
    }

    if (Array.isArray(sales)) {
      sales.forEach((sale) => {
        const key = String(sale.createdAt || "").slice(0, 10);
        if (!buckets.has(key)) return;
        buckets.set(key, buckets.get(key) + Number(sale.total || 0));
      });
    }

    return [...buckets.entries()].map(([date, value]) => ({
      date,
      value: Math.round(value * 100) / 100,
      label: date.slice(5),
    }));
  }, [sales]);

  const lowStockThreshold = 5;
  const lowStockCount = useMemo(() => {
    if (!Array.isArray(products)) return 0;
    return products.filter((p) => Number(p.stock ?? 0) > 0 && Number(p.stock ?? 0) <= lowStockThreshold).length;
  }, [products]);

  useEffect(() => {
    const controller = new AbortController();

    listProducts({ signal: controller.signal })
      .then((data) => {
        setProductsError("");
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setProductsError(err?.message || "Failed to load products");
        setProducts([]);
      });

    return () => controller.abort();
  }, [offlineRevision]);

  useEffect(() => {
    const controller = new AbortController();

    listSales({ signal: controller.signal })
      .then((data) => {
        setSalesError("");
        setSales(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSalesError(err?.message || "Failed to load sales");
        setSales([]);
      });

    return () => controller.abort();
  }, [offlineRevision]);

  useEffect(() => {
    const controller = new AbortController();

    listExpenses({ limit: 20, signal: controller.signal })
      .then((data) => {
        setExpensesError("");
        setExpenses(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setExpensesError(err?.message || "Failed to load expenses");
        setExpenses([]);
      });

    return () => controller.abort();
  }, [offlineRevision]);

  const submitExpense = async (e) => {
    e.preventDefault();
    setExpensesError("");
    setExpenseBusy(true);

    try {
      const created = await createExpense({
        amount: Number(expenseForm.amount),
        category: expenseForm.category.trim() || null,
        description: expenseForm.description.trim(),
        spentAt: expenseForm.spentAt ? `${expenseForm.spentAt}T12:00:00` : undefined,
      });

      setExpenses((prev) => [created, ...(Array.isArray(prev) ? prev : [])].slice(0, 20));
      setExpenseForm({
        amount: "",
        category: "",
        description: "",
        spentAt: todayInputValue(),
      });
    } catch (err) {
      setExpensesError(err?.message || "Failed to save expense.");
    } finally {
      setExpenseBusy(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>Sales, inventory, and daily expenses in one calm working view.</p>
        </div>
      </div>

      {productsError || salesError || expensesError ? (
        <div className="banner">{productsError || salesError || expensesError}</div>
      ) : null}

      <div className="grid kpis">
        <div className="card col-3">
          <div className="card-header">
            <h3>Total Sales</h3>
          </div>
          <div className="kpi-value">{formatCurrency(totalSales)}</div>
          <p className="kpi-sub">Last 14 days</p>
        </div>

        <div className="card col-3">
          <div className="card-header">
            <h3>Expenses</h3>
          </div>
          <div className="kpi-value">{formatCurrency(totalExpenses)}</div>
          <p className="kpi-sub">Last 14 days</p>
        </div>

        <div className="card col-3">
          <div className="card-header">
            <h3>Total Products</h3>
          </div>
          <div className="kpi-value">{products === null ? "..." : products.length}</div>
          <p className="kpi-sub">Live inventory count</p>
        </div>

        <div className="card col-3">
          <div className="card-header">
            <h3>Low Stock Alert</h3>
          </div>
          <div className="kpi-value">{products === null ? "..." : lowStockCount}</div>
          <p className="kpi-sub">At or below {lowStockThreshold} units</p>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card col-6">
          <div className="card-header">
            <h3>Daily Revenue</h3>
          </div>
          <LineChart series={series} />
        </div>

        <div className="card col-6">
          <div className="card-header">
            <h3>Log Daily Expense</h3>
            <span className="badge">{isAdmin ? "Admin view" : "Staff view"}</span>
          </div>

          <form className="expense-form" onSubmit={submitExpense}>
            <div className="field-row">
              <div className="field" style={{ flex: "0 0 160px" }}>
                <label>Amount</label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="field" style={{ flex: "1 1 180px" }}>
                <label>Category</label>
                <input
                  className="input"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Transport, airtime, supplies..."
                />
              </div>

              <div className="field" style={{ flex: "0 0 180px" }}>
                <label>Date</label>
                <input
                  className="input"
                  type="date"
                  value={expenseForm.spentAt}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, spentAt: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Description</label>
              <input
                className="input"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What was bought or paid for?"
                required
              />
            </div>

            <div className="expense-actions">
              <button className="btn primary" type="submit" disabled={expenseBusy}>
                {expenseBusy ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>

        <div className="card col-6">
          <div className="card-header">
            <h3>Recent Transactions</h3>
          </div>
          <div className="table-wrap scroll-y" aria-label="Recent transactions">
            <table className="table table-plain table-wide">
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Date</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales === null ? (
                  <tr>
                    <td colSpan={5}>Loading sales...</td>
                  </tr>
                ) : sales.length > 0 ? (
                  sales.slice(0, 20).map((sale) => {
                    const dt = formatDateTimeParts(sale.createdAt);
                    return (
                      <tr key={sale.id}>
                        <td>#{sale.id}</td>
                        <td>{sale.customerName || "Walk-in"}</td>
                        <td>{sale.cashierName || "-"}</td>
                        <td>
                          <div className="cell-main">{dt.date}</div>
                          {dt.time ? <div className="cell-sub">{dt.time}</div> : null}
                        </td>
                        <td>{formatCurrency(Number(sale.total || 0))}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>No sales yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card col-12">
          <div className="card-header">
            <h3>Recent Expenses</h3>
            <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
              {Array.isArray(expenses) ? `${expenses.length} entries` : "Loading"}
            </div>
          </div>

          <div className="table-wrap" aria-label="Recent expenses">
            <table className="table table-plain table-wide">
              <thead>
                <tr>
                  <th>Spent By</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses === null ? (
                  <tr>
                    <td colSpan={5}>Loading expenses...</td>
                  </tr>
                ) : expenses.length > 0 ? (
                  expenses.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-main">{item.userName || "-"}</div>
                        <div className="cell-sub">{item.username ? `@${item.username}` : "Staff"}</div>
                      </td>
                      <td>{item.category || "General"}</td>
                      <td>{item.description}</td>
                      <td>{formatDateTime(item.spentAt)}</td>
                      <td>{formatCurrency(item.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No expenses recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
