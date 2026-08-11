import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Challan, Customer, PaginatedResponse, Product } from "../types";

interface LineItem {
  productId: string;
  quantity: string;
}

export default function ChallansPage() {
  const [data, setData] = useState<PaginatedResponse<Challan> | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: "" }]);

  async function fetchChallans() {
    setLoading(true);
    try {
      const res = await api.get("/challans", {
        params: { status: statusFilter || undefined, page, pageSize: 20 },
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChallans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function openCreate() {
    setError("");
    setCustomerId("");
    setItems([{ productId: "", quantity: "" }]);
    const [custRes, prodRes] = await Promise.all([
      api.get("/customers", { params: { pageSize: 100 } }),
      api.get("/products", { params: { pageSize: 100 } }),
    ]);
    setCustomers(custRes.data.items);
    setProducts(prodRes.data.items);
    setShowModal(true);
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { productId: "", quantity: "" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(status: "DRAFT" | "CONFIRMED") {
    setError("");
    const validItems = items
      .filter((it) => it.productId && it.quantity)
      .map((it) => ({ productId: it.productId, quantity: parseInt(it.quantity) }));

    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    if (validItems.length === 0) {
      setError("Add at least one product with quantity");
      return;
    }

    try {
      await api.post("/challans", { customerId, items: validItems, status });
      setShowModal(false);
      fetchChallans();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create challan");
    }
  }

  async function handleStatusChange(challan: Challan, newStatus: "CONFIRMED" | "CANCELLED") {
    try {
      await api.patch(`/challans/${challan.id}/status`, { status: newStatus });
      fetchChallans();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Sales Challans</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Challan
        </button>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => (setStatusFilter(e.target.value), setPage(1))}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Challan #</th>
              <th>Customer</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Loading...</td>
              </tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6}>No challans found.</td>
              </tr>
            )}
            {data?.items.map((c) => (
              <tr key={c.id}>
                <td>{c.challanNumber}</td>
                <td>{c.customer?.name || "-"}</td>
                <td>{c.totalQuantity}</td>
                <td>
                  <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                </td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {c.status === "DRAFT" && (
                    <>
                      <button className="btn btn-primary" onClick={() => handleStatusChange(c, "CONFIRMED")}>
                        Confirm
                      </button>
                      <button className="btn btn-danger" onClick={() => handleStatusChange(c, "CANCELLED")}>
                        Cancel
                      </button>
                    </>
                  )}
                  {c.status === "CONFIRMED" && (
                    <button className="btn btn-danger" onClick={() => handleStatusChange(c, "CANCELLED")}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="pagination">
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              className="btn"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2>New Sales Challan</h2>
            <div className="form-group">
              <label>Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Products</label>
            {items.map((item, i) => (
              <div className="form-row" key={i} style={{ alignItems: "flex-end" }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(i, "productId", e.target.value)}
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.currentStock})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  />
                </div>
                <button
                  className="btn"
                  style={{ marginBottom: 14 }}
                  onClick={() => removeItemRow(i)}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button className="btn" onClick={addItemRow} style={{ marginBottom: 14 }}>
              + Add Product
            </button>

            {error && <div className="error-text">{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => handleCreate("DRAFT")}>
                Save as Draft
              </button>
              <button className="btn btn-primary" onClick={() => handleCreate("CONFIRMED")}>
                Save & Confirm
              </button>
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
