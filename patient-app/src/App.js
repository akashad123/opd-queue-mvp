// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * Staff Dashboard - App.js
 *
 * Endpoints (backend):
 * GET  ${API_URL}/queue?department=...
 * POST ${API_URL}/token/next        body: { department }
 * POST ${API_URL}/token/update      body: { id, tokenId, status }
 */

// Backend base: http://localhost:5000/api
export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* Helper to normalize token id field (_id, id, tokenId) */
function tokenIdOf(token) {
  return token?.id ?? token?._id ?? token?.tokenId ?? null;
}

/* Status badge */
function StatusBadge({ status }) {
  const s = (status || "waiting").toLowerCase();
  const map = {
    waiting: "badge waiting",
    calling: "badge calling",
    inprogress: "badge inprogress",
    "in-progress": "badge inprogress",
    completed: "badge completed",
    noshow: "badge noshow",
  };
  return <span className={map[s] || "badge waiting"}>{s.toUpperCase()}</span>;
}

export default function App() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState("OPD");

  const departments = ["Registration", "OPD", "Lab", "Pharmacy"];

  // Load queue once (and when department changes)
  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/queue${
        department ? `?department=${encodeURIComponent(department)}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.queue)
        ? data.queue
        : [];
      setQueue(list);
    } catch (e) {
      console.error("loadQueue:", e);
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
  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(() => {
      fetch(
        `${API_URL}/queue?department=${encodeURIComponent(department)}`
      )
        .then((res) => {
          if (!res.ok) throw new Error(`Server ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data.queue)
            ? data.queue
            : [];
          setQueue(list);
        })
        .catch((err) => {
          console.error("interval fetch error:", err);
          setError("Failed to auto-refresh queue");
        });
    }, 3000);

    return () => clearInterval(id);
  }, [autoRefresh, department]);

  // Call next for current department
  async function callNext() {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/token/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department }),
      });
      if (!res.ok) {
        let txt = "";
        try {
          txt = await res.text();
        } catch (_) {}
        throw new Error(`Server ${res.status} ${txt}`);
      }
      await loadQueue();
    } catch (e) {
      console.error("callNext:", e);
      setError("Failed to call next");
    }
  }

  // Update status (sends both id & tokenId to support either backend)
  async function updateStatus(token, status) {
    const id = tokenIdOf(token);
    if (!id) {
      console.warn("Missing token id:", token);
      setError("Internal: token id missing");
      return;
    }

    if (
      status === "noshow" &&
      !window.confirm("Confirm mark token as No-show?")
    )
      return;

    // optimistic UI update
    setQueue((prev) =>
      prev.map((t) => (tokenIdOf(t) === id ? { ...t, status } : t))
    );

    try {
      const body = { id, tokenId: id, status };
      const res = await fetch(`${API_URL}/token/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let txt = "";
        try {
          txt = await res.text();
        } catch (_) {}
        throw new Error(`Server ${res.status} ${txt}`);
      }
      await loadQueue();
    } catch (e) {
      console.error("updateStatus:", e);
      setError("Failed to update token");
      await loadQueue(); // rollback
    }
  }

  // client-side ordering: priority first, then by status rank
  const displayQueue = [...queue].sort((a, b) => {
    const pa = a.priority ? 1 : 0;
    const pb = b.priority ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const rank = {
      calling: 3,
      inprogress: 2,
      "in-progress": 2,
      waiting: 1,
      completed: 0,
      noshow: 0,
    };
    const sa = rank[a.status || "waiting"] ?? 0;
    const sb = rank[b.status || "waiting"] ?? 0;
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <h2 className="section-title">Live Queue Management</h2>
            <p className="muted">
              Monitor tokens and update statuses in real time.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="muted" style={{ marginRight: 6 }}>
              Counter
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid #eef2f7",
                background: "#fff",
              }}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          <button
            className="btn small grey"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            Auto Refresh: {autoRefresh ? "ON" : "OFF"}
          </button>

          <button
            className="btn small grey"
            onClick={loadQueue}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button className="btn primary small" onClick={callNext}>
            Call Next
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <table className="queue-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>Token</th>
              <th style={{ width: 120 }}>Priority</th>
              <th>Status</th>
              <th style={{ width: 360 }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {displayQueue.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty">
                  No tokens in queue
                </td>
              </tr>
            ) : (
              displayQueue.map((t) => {
                const id = tokenIdOf(t);
                return (
                  <tr key={id || Math.random()}>
                    <td>
                      <strong>#{id}</strong>
                    </td>
                    <td>{t.priority ? <strong>HIGH</strong> : "Normal"}</td>
                    <td>
                      <StatusBadge status={t.status || "waiting"} />
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn grey small"
                        onClick={() => updateStatus(t, "inprogress")}
                      >
                        In-progress
                      </button>
                      <button
                        className="btn green small"
                        onClick={() => updateStatus(t, "completed")}
                      >
                        Complete
                      </button>
                      <button
                        className="btn red small"
                        onClick={() => updateStatus(t, "noshow")}
                      >
                        No-show
                      </button>
                      <button
                        className="btn blue small"
                        onClick={() => updateStatus(t, "calling")}
                      >
                        Call
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
