import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Product, PaginatedResponse } from "../types";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlertQty: "0",
  location: "",
};

export default function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState("");
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ quantity: "", movementType: "IN", reason: "" });
  const [stockError, setStockError] = useState("");

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await api.get("/products", {
        params: { search: search || undefined, lowStock: lowStock || undefined, page, pageSize: 20 },
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lowStock]);

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setError("");
    try {
      const payload: any = {
        name: form.name || undefined,
        sku: form.sku || undefined,
        category: form.category || undefined,
        unitPrice: form.unitPrice !== "" ? parseFloat(form.unitPrice) : undefined,
        currentStock: form.currentStock !== "" ? parseInt(form.currentStock) : 0,
        minStockAlertQty: form.minStockAlertQty !== "" ? parseInt(form.minStockAlertQty) : 0,
        location: form.location || undefined,
      };
      await api.post("/products", payload);
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.map((d: any) => `${d.path}: ${d.message}`).join(", "));
      } else {
        setError(err.response?.data?.error || "Failed to save product");
      }
    }
  }

  function openStockModal(p: Product) {
    setStockModalProduct(p);
    setStockForm({ quantity: "", movementType: "IN", reason: "" });
    setStockError("");
  }

  async function handleStockSave() {
    if (!stockModalProduct) return;
    setStockError("");
    try {
      await api.post(`/products/${stockModalProduct.id}/stock-movements`, {
        quantity: parseInt(stockForm.quantity),
        movementType: stockForm.movementType,
        reason: stockForm.reason,
      });
      setStockModalProduct(null);
      fetchProducts();
    } catch (err: any) {
      setStockError(err.response?.data?.error || "Failed to record stock movement");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchProducts())}
          style={{ width: 240 }}
        />
        <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={lowStock} onChange={(e) => (setLowStock(e.target.checked), setPage(1))} />
          Low stock only
        </label>
        <button className="btn" onClick={() => (setPage(1), fetchProducts())}>
          Search
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Min Alert</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Loading...</td>
              </tr>
            )}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7}>No products found.</td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category || "-"}</td>
                <td>₹{p.unitPrice}</td>
                <td style={{ color: p.currentStock <= p.minStockAlertQty ? "var(--danger)" : undefined }}>
                  {p.currentStock}
                </td>
                <td>{p.minStockAlertQty}</td>
                <td>
                  <button className="btn" onClick={() => openStockModal(p)}>
                    Adjust Stock
                  </button>
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
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Add Product</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>SKU *</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit Price *</label>
                <input
                  type="number"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Opening Stock</label>
                <input
                  type="number"
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Min Stock Alert Qty</label>
                <input
                  type="number"
                  value={form.minStockAlertQty}
                  onChange={(e) => setForm({ ...form, minStockAlertQty: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Location / Warehouse</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            {error && <div className="error-text">{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {stockModalProduct && (
        <div className="modal-overlay" onClick={() => setStockModalProduct(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>Adjust Stock — {stockModalProduct.name}</h2>
            <p style={{ color: "var(--text-muted)", marginTop: -8 }}>
              Current stock: {stockModalProduct.currentStock}
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>Movement Type</label>
                <select
                  value={stockForm.movementType}
                  onChange={(e) => setStockForm({ ...stockForm, movementType: e.target.value })}
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Reason *</label>
              <input
                value={stockForm.reason}
                onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                placeholder="e.g. Purchase order received, damaged goods, stock correction"
              />
            </div>
            {stockError && <div className="error-text">{stockError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleStockSave}>
                Save
              </button>
              <button className="btn" onClick={() => setStockModalProduct(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
