// src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";
import { API_URL } from "./api";

const DEPARTMENTS = ["OPD", "Lab", "Pharmacy"];

const getTokenId = (token) =>
  token?.tokenId || token?.id || token?.token || "--";

const getStatusClass = (status) => {
  if (!status) return "status-waiting";
  const key = status.toLowerCase();
  if (key.includes("wait")) return "status-waiting";
  if (["active", "called", "in progress"].includes(key)) return "status-active";
  if (["completed", "done", "served"].includes(key)) return "status-completed";
  return "status-waiting";
};

function App() {
  const [department, setDepartment] = useState("OPD");
  const [priority, setPriority] = useState(false);
  const [token, setToken] = useState(null); // token object from backend
  const [peopleAhead, setPeopleAhead] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- API HELPERS --------------------------------------

  // POST /api/token/create
  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/token/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, priority }),
      });

      if (!res.ok) throw new Error("Failed to generate token");

      const data = await res.json();
      console.log("Token created:", data);

      setToken(data);
      setStatus(data.status || "waiting");
      setPeopleAhead(null);

      // fetch queue once immediately for this token
      fetchQueue(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // GET /api/queue?department=XYZ
  const fetchQueue = async (currentToken = token) => {
    if (!currentToken) return;

    try {
      const res = await fetch(
        `${API_URL}/queue?department=${encodeURIComponent(
          currentToken.department
        )}`
      );
      if (!res.ok) throw new Error("Failed to fetch queue");

      const list = await res.json(); // array of tokens
      console.log("Queue:", list);

      const idx = list.findIndex((t) => t.tokenId === currentToken.tokenId);

      if (idx === -1) {
        // not in waiting list anymore (maybe in-progress or completed)
        setPeopleAhead(null);
        setStatus(currentToken.status || "waiting");
      } else {
        setPeopleAhead(idx); // index in sorted list = people ahead
        setStatus(list[idx].status || "waiting");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll queue every 3 seconds after token is created
  useEffect(() => {
    if (!token) return;

    // immediate call
    fetchQueue(token);

    const id = setInterval(() => {
      fetchQueue(token);
    }, 3000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // derived values for UI
  const tokenId = getTokenId(token);
  const tokenDept = token?.department || department;
  const estimatedWait =
    typeof peopleAhead === "number" ? (peopleAhead + 1) * 3 : null; // ~3 mins per patient

  // ---------- UI -----------------------------------------------

  return (
    <div className="app-shell">
      {/* TOP NAV */}
      <header className="top-nav">
        <div className="nav-left">
          <div className="nav-logo">H</div>
          <div>
            <div className="nav-title">CityCare Hospitals</div>
            <div className="nav-subtitle">Outpatient Queue Management</div>
          </div>
        </div>
        <nav className="nav-links">
          <span className="nav-link active">Patient Check-In</span>
          <span className="nav-link">Departments</span>
          <span className="nav-link">Help Desk</span>
        </nav>
      </header>

      {/* MAIN LAYOUT */}
      <main className="main-layout">
        {/* LEFT: FORM & INFO */}
        <section className="left-panel">
          <div className="hero">
            <h1>Welcome to Self Check-In</h1>
            <p>
              Select your department, generate a token, and track your position
              in the queue.
            </p>

            <div className="hero-badges">
              <div className="hero-badge">
                <span className="badge-dot live"></span>
                Live queue updates every <strong>3 seconds</strong>
              </div>
              <div className="hero-badge">
                <span className="badge-dot safe"></span>
                Priority for <strong>senior citizens & emergencies</strong>
              </div>
            </div>
          </div>

          <form className="form-card" onSubmit={handleGenerateToken}>
            <div className="form-header">
              <h2>Generate your token</h2>
              <span className="form-tag">Step 1 of 2</span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Choose where you want to be seen today.
                </p>
              </div>

              <div className="field">
                <label>Priority</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={priority}
                    onChange={(e) => setPriority(e.target.checked)}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                  <span className="toggle-label">
                    I am a senior citizen / emergency case
                  </span>
                </label>
                <p className="field-hint">
                  Priority tokens may be called earlier when medically needed.
                </p>
              </div>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Token"}
            </button>

            {error && <p className="error">{error}</p>}

            <div className="help-row">
              <span>Need assistance?</span>
              <button
                type="button"
                className="link-button"
                onClick={() =>
                  alert("Please contact the help desk counter for assistance.")
                }
              >
                Speak to our help desk
              </button>
            </div>
          </form>

          <div className="info-strip">
            <div>
              <div className="info-label">Today&apos;s timings</div>
              <div className="info-value">OPD 9:00 AM – 5:00 PM</div>
            </div>
            <div>
              <div className="info-label">Average wait</div>
              <div className="info-value">Approx. 10–20 mins</div>
            </div>
            <div>
              <div className="info-label">Emergency</div>
              <div className="info-value highlight">Dial 108 or visit ER</div>
            </div>
          </div>
        </section>

        {/* RIGHT: TOKEN PANEL */}
        <section className="right-panel">
          <div className="token-card-wrapper">
            <div className="panel-header">
              <h2>Your visit today</h2>
              <p>Keep this screen open while you wait for your turn.</p>
            </div>

            {token ? (
              <div className="token-card">
                <div className="token-main">
                  <div>
                    <div className="token-label">Token ID</div>
                    <div className="token-id">{tokenId}</div>
                  </div>
                  <div className="token-pill">
                    {tokenDept?.toUpperCase() || "OPD"}
                  </div>
                </div>

                <div className="token-meta-row">
                  <div className="meta-block">
                    <span className="meta-label">Status</span>
                    <span
                      className={`status-badge ${getStatusClass(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="meta-block">
                    <span className="meta-label">People ahead</span>
                    <span className="meta-value">
                      {peopleAhead ?? "--"}
                    </span>
                  </div>
                  <div className="meta-block">
                    <span className="meta-label">Estimated wait</span>
                    <span className="meta-value">
                      {estimatedWait ? `${estimatedWait} mins` : "Calculating"}
                    </span>
                  </div>
                </div>

                <div className="progress">
                  <div className="progress-labels">
                    <span>Token created</span>
                    <span>Waiting</span>
                    <span>At counter</span>
                  </div>
                  <div className="progress-bar">
                    <span className="progress-fill" />
                  </div>
                </div>

                <p className="note">
                  Please remain within hospital premises. Watch the display or
                  listen for your token number. If you miss your call, visit the
                  help desk.
                </p>
              </div>
            ) : (
              <div className="token-placeholder">
                <h3>No token generated yet</h3>
                <p>
                  Fill in the form and tap <strong>Generate Token</strong> to
                  receive your token and live queue updates.
                </p>
                <ul>
                  <li>Select your department</li>
                  <li>Mark priority if applicable</li>
                  <li>Keep this page open while you wait</li>
                </ul>
              </div>
            )}
          </div>

          <div className="steps-card">
            <h3>How it works</h3>
            <ol>
              <li>Generate your token using the self check-in form.</li>
              <li>Track your place in the queue in real time.</li>
              <li>
                When your token is called, proceed to the department counter.
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} CityCare Hospitals · All rights reserved
      </footer>
    </div>
  );
}

export default App;
