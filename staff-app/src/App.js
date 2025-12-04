import React, { useEffect, useRef, useState } from "react";
import "./App.css";

/**
 * Staff Dashboard - Full ready-to-paste file
 *
 * Endpoints used:
 * GET  /api/queue?department=<dept>
 * POST /api/token/next         body: { department }
 * POST /api/token/update       body: { id, status }
 *
 * Notes:
 * - Backend should accept 'department' query/body for counter-specific behavior.
 * - Status values used: waiting, calling, inprogress, completed, noshow
 */

/* interval hook */
function useInterval(callback, delay) {
  const savedRef = useRef();
  useEffect(() => { savedRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/* Status badge */
function StatusBadge({ status }) {
  const s = (status || "waiting").toLowerCase();
  const classes = {
    waiting: "badge waiting",
    calling: "badge calling",
    inprogress: "badge inprogress",
    completed: "badge completed",
    noshow: "badge noshow",
  }[s] || "badge waiting";
  return <span className={classes}>{s.toUpperCase()}</span>;
}

export default function App() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState("OPD");

  // Adjust to your site's counters
  const departments = ["Registration", "OPD", "Lab", "Pharmacy"];

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/queue${department ? `?department=${encodeURIComponent(department)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("loadQueue error:", e);
      setError("Failed to fetch queue");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  // auto-refresh every 3 seconds
  useInterval(() => { if (autoRefresh) loadQueue(); }, 3000);

  // call next — send department so backend can choose correctly
  async function callNext() {
    setError(null);
    try {
      const res = await fetch("/api/token/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      await loadQueue();
    } catch (e) {
      console.error("callNext error:", e);
      setError("Failed to call next");
    }
  }

  // update token status
  async function updateStatus(id, status) {
    if (!id) return;
    // confirm for noshow or completed if you want
    if (status === "noshow") {
      if (!window.confirm("Mark this token as No-show?")) return;
    }
    setError(null);

    // optimistic UI update: reflect change locally before fetch
    setQueue(prev => prev.map(t => t.id === id ? { ...t, status } : t));

    try {
      const res = await fetch("/api/token/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      await loadQueue();
    } catch (e) {
      console.error("updateStatus error:", e);
      setError("Failed to update token");
      // rollback by reloading
      await loadQueue();
    }
  }

  // Client-side display sorting: priority first (if token.priority truthy), then calling/inprogress
  const displayQueue = [...queue].sort((a, b) => {
    const pa = a.priority ? 1 : 0;
    const pb = b.priority ? 1 : 0;
    if (pa !== pb) return pb - pa; // priority first

    const statusRank = { calling: 3, inprogress: 2, waiting: 1, completed: 0, noshow: 0 };
    const sa = statusRank[(a.status || "waiting")] ?? 0;
    const sb = statusRank[(b.status || "waiting")] ?? 0;
    return sb - sa;
  });

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="head-left">
          <div className="logo">H</div>
          <div>
            <h2 className="title">CityCare Hospitals</h2>
            <p className="subtitle">Staff Queue Management</p>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-item active">Staff Dashboard</div>
        </nav>
      </header>

      {/* Main card */}
      <div className="card big-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <h2 className="section-title">Live Queue Management</h2>
            <p className="muted">Monitor patients, call next, and manage statuses in real time.</p>
          </div>

          {/* Department selection */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="muted" style={{ marginRight: 6 }}>Counter</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #eef2f7", background: "#fff" }}
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* toolbar */}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn small grey" onClick={() => setAutoRefresh(v => !v)}>
            Auto Refresh: {autoRefresh ? "ON" : "OFF"}
          </button>

          <button className="btn small grey" onClick={loadQueue} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button className="btn primary small" onClick={callNext}>Call Next</button>
        </div>

        {error && <p className="error">{error}</p>}

        {/* queue table */}
        <table className="queue-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Token</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {displayQueue.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty">No tokens in queue</td>
              </tr>
            ) : (
              displayQueue.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>{t.priority ? <strong>HIGH</strong> : "Normal"}</td>
                  <td><StatusBadge status={t.status || "waiting"} /></td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="btn grey small" onClick={() => updateStatus(t.id, "inprogress")}>In-progress</button>
                    <button className="btn green small" onClick={() => updateStatus(t.id, "completed")}>Complete</button>
                    <button className="btn red small" onClick={() => updateStatus(t.id, "noshow")}>No-show</button>
                    <button className="btn blue small" onClick={() => updateStatus(t.id, "calling")}>Call</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
