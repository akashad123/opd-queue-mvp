import { useState, useEffect } from "react";
import "./App.css";

const DEPARTMENTS = ["OPD", "Lab", "Pharmacy"];

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
  const [isPriority, setIsPriority] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Poll queue position every 3 seconds after token is created
  useEffect(() => {
    if (!tokenInfo) return;

    const intervalId = setInterval(() => {
      fetchQueuePosition();
    }, 3000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenInfo?.tokenId, department]);

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/token/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          priority: isPriority,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate token. Please try again.");
      }

      const data = await res.json();
      // Expected from backend: { tokenId, department, status, peopleAhead }
      setTokenInfo({
        tokenId: data.tokenId,
        department: data.department || department,
        status: data.status || "Waiting",
        peopleAhead:
          typeof data.peopleAhead === "number" ? data.peopleAhead : null,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueuePosition = async () => {
    if (!tokenInfo?.tokenId) return;

    try {
      const res = await fetch(
        `/api/queue?department=${encodeURIComponent(department)}`
      );

      if (!res.ok) {
        throw new Error("Unable to update queue position");
      }

      const data = await res.json();
      setTokenInfo((prev) =>
        prev
          ? {
              ...prev,
              status: data.status || prev.status,
              peopleAhead:
                typeof data.peopleAhead === "number"
                  ? data.peopleAhead
                  : prev.peopleAhead,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
    }
  };

  const estimatedWait =
    typeof tokenInfo?.peopleAhead === "number"
      ? (tokenInfo.peopleAhead + 1) * 3 // approx 3 minutes per patient
      : null;

  return (
    <div className="app-shell">
      {/* Top Navigation / Branding */}
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

      {/* Main Content */}
      <main className="main-layout">
        {/* Left: Form & Info */}
        <section className="left-panel">
          <div className="hero">
            <h1>Welcome to Self Check-In</h1>
            <p>
              Generate your token, track your position in the queue, and relax
              while we prepare for your visit.
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

              <div className="field priority-field">
                <label>Priority</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={isPriority}
                    onChange={(e) => setIsPriority(e.target.checked)}
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
              {loading ? "Generating token..." : "Generate Token"}
            </button>

            {error && <p className="error">{error}</p>}

            <div className="help-row">
              <span>Need assistance?</span>
              <button
                type="button"
                className="link-button"
                onClick={() => alert("Please contact the help desk counter.")}
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

        {/* Right: Token & Steps */}
        <section className="right-panel">
          <div className="token-card-wrapper">
            <div className="panel-header">
              <h2>Your visit today</h2>
              <p>Keep this screen open while you wait for your turn.</p>
            </div>

            {tokenInfo ? (
              <div className="token-card">
                <div className="token-main">
                  <div>
                    <div className="token-label">Token ID</div>
                    <div className="token-id">{tokenInfo.tokenId}</div>
                  </div>
                  <div className="token-pill">
                    {tokenInfo.department?.toUpperCase() || department}
                  </div>
                </div>

                <div className="token-meta-row">
                  <div className="meta-block">
                    <span className="meta-label">Status</span>
                    <span
                      className={`status-badge ${getStatusClass(
                        tokenInfo.status
                      )}`}
                    >
                      {tokenInfo.status}
                    </span>
                  </div>
                  <div className="meta-block">
                    <span className="meta-label">People ahead</span>
                    <span className="meta-value">
                      {tokenInfo.peopleAhead ?? "--"}
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
                  Fill in the form on the left and tap <strong>Generate</strong>{" "}
                  to receive your token and live queue updates.
                </p>
                <ul>
                  <li>Choose your department</li>
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
