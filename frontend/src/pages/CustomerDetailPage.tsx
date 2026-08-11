import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import type { Customer, FollowUp, Challan } from "../types";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<(Customer & { followUps: FollowUp[]; challans: Challan[] }) | null>(
    null
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote() {
    if (!note.trim()) return;
    await api.post(`/customers/${id}/follow-ups`, { note });
    setNote("");
    load();
  }

  if (loading) return <p>Loading...</p>;
  if (!customer) return <p>Customer not found.</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <Link to="/customers" className="btn">
          Back to Customers
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p>
          <strong>Mobile:</strong> {customer.mobile} &nbsp;|&nbsp; <strong>Email:</strong>{" "}
          {customer.email || "-"}
        </p>
        <p>
          <strong>Business:</strong> {customer.businessName || "-"} &nbsp;|&nbsp; <strong>GST:</strong>{" "}
          {customer.gstNumber || "-"}
        </p>
        <p>
          <strong>Type:</strong> {customer.customerType} &nbsp;|&nbsp;{" "}
          <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
        </p>
        {customer.address && (
          <p>
            <strong>Address:</strong> {customer.address}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Follow-up Notes</h2>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <input
            placeholder="Add a follow-up note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ flex: 1, padding: 8, border: "1px solid var(--border)", borderRadius: 6 }}
          />
          <button className="btn btn-primary" onClick={handleAddNote}>
            Add
          </button>
        </div>
        {customer.followUps.length === 0 && <p style={{ color: "var(--text-muted)" }}>No follow-ups yet.</p>}
        {customer.followUps.map((f) => (
          <div key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div>{f.note}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {new Date(f.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Sales Challans</h2>
        {customer.challans.length === 0 && <p style={{ color: "var(--text-muted)" }}>No challans yet.</p>}
        {customer.challans.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.challans.map((c) => (
                <tr key={c.id}>
                  <td>{c.challanNumber}</td>
                  <td>{c.totalQuantity}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
