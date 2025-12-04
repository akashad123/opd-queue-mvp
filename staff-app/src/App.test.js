import React, { useEffect, useRef, useState } from "react";
import "./App.css";

/* interval hook */
function useInterval(cb, delay) {
  const r = useRef();
  useEffect(() => { r.current = cb; }, [cb]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => r.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

function Header() {
  return (
    <header className="hc-header">
      <div className="hc-left">
        <div className="hc-logo">H</div>
        <div>
          <div className="hc-title">CityCare Hospitals</div>
          <div className="hc-sub">Outpatient Queue Management</div>
        </div>
      </div>

      <nav className="hc-nav">
        <a className="nav-link active">Patient Check-In</a>
        <a className="nav-link">Departments</a>
        <a className="nav-link">Help Desk</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-left">
        <h2>Welcome to Self Check-In</h2>
        <p className="muted">Generate your token, track your position in the queue, and relax while we prepare for your visit.</p>
        <div className="hero-badges">
          <span>Live queue updates every <strong>3 seconds</strong></span>
          <span>Priority for senior citizens & emergencies</span>
        </div>
      </div>
      <div className="hero-right">
        <div className="card small-card">
          <div className="card-title">Your visit today</div>
          <div className="muted">No token generated yet</div>
          <p className="tiny muted">Fill the form on the left and tap Generate to receive your token and live updates.</p>
        </div>
      </div>
    </section>
  );
}

function TokenForm({ onGenerate }) {
  const [dept, setDept] = useState("OPD");
  const [priority, setPriority] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // If backend needs body, change accordingly. Example shown:
      await fetch("/api/token/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: dept, priority })
      });
      if (onGenerate) await onGenerate();
    } catch (err) {
      console.error(err);
      alert("Failed to generate token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card token-card" onSubmit={handleGenerate}>
      <div className="card-header">
        <div>
          <div className="card-title">Generate your token</div>
          <div className="muted small">Choose where you want to be seen today.</div>
        </div>
        <div className="step">Step 1 of 2</div>
      </div>

      <div className="form-row">
        <label>Department</label>
        <select value={dept} onChange={e => setDept(e.target.value)}>
          <option>OPD</option>
          <option>Dermatology</option>
          <option>ENT</option>
          <option>Cardiology</option>
        </select>
      </div>

      <div className="form-row row-inline">
        <label>Priority</label>
        <div className="priority">
          <input id="senior" type="checkbox" checked={priority} onChange={() => setPriority(p => !p)} />
          <label htmlFor="senior" className="muted">I am a senior citizen / emergency case</label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Token"}
        </button>
        <a className="link muted" href="#">Speak to our help desk</a>
      </div>

      <div className="card-footer">
        <div className="tiny muted">TODAY'S TIMINGS</div>
        <div className="tiny">OPD 9:00 AM – 5:00 PM</div>
        <div className="tiny muted">AVERAGE WAIT Approx. 10–20 mins</div>
      </div>
    </form>
  );
}

function InfoStack() {
  return (
    <div className="stack">
      <div className="card info-card">
        <div className="card-title">Your visit today</div>
        <div className="muted">No token generated yet</div>
        <ul className="muted tiny">
          <li>Fill in the form on the left and tap Generate</li>
          <li>Mark priority if applicable</li>
          <li>Keep this page open while you wait</li>
        </ul>
      </div>

      <div className="card info-card">
        <div className="card-title">How it works</div>
        <ol className="muted tiny">
          <li>Generate your token using the self check-in form.</li>
          <li>Track your place in the queue in real time.</li>
          <li>When your token is called, proceed to the department counter.</li>
        </ol>
      </div>
    </div>
  );
}

/* Main App */
export default function App() {
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function fetchQueue() {
    setError(null);
    try {
      const r = await fetch("/api/queue");
      if (!r.ok) throw new Error("Bad response");
      const data = await r.json();
      // we don't use data in UI here, but you can pass to child components
      setLastRefresh(new Date());
      return data;
    } catch (err) {
      console.error(err);
      setError("Unable to reach server");
      return [];
    }
  }

  /* auto-refresh every 3s (you can remove if not required) */
  useInterval(() => { fetchQueue(); }, 3000);

  useEffect(() => { fetchQueue(); }, []);

  return (
    <div className="page">
      <Header />
      <main className="main-grid">
        <div className="col-left">
          <Hero />
          <TokenForm onGenerate={fetchQueue} />
        </div>

        <aside className="col-right">
          <InfoStack />
          <div className="card small-card bottom-card">
            <div className="card-title">Last update</div>
            <div className="muted tiny">{lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</div>
            {error && <div className="muted tiny" style={{ color: "#ff6b6b" }}>{error}</div>}
          </div>
        </aside>
      </main>
    </div>
  );
}
