import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Predictor from "./pages/Predictor";
import Recommend from "./pages/Recommend";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("recommend");

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-text">HOMEVAL<span className="brand-ai">AI</span></span>
        </div>
        <div className="nav-links">
          <button className={`nav-btn ${page === "recommend" ? "active" : ""}`} onClick={() => setPage("recommend")}>
            เริ่มต้นหาบ้าน
          </button>
          <button className={`nav-btn ${page === "predictor" ? "active" : ""}`} onClick={() => setPage("predictor")}>
            ประเมินราคา
          </button>
          <button className={`nav-btn ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
            ภาพรวมตลาด
          </button>
        </div>
      </nav>

      <main className="main-content">
        {page === "recommend"  && <Recommend onGoPredict={() => setPage("predictor")} />}
        {page === "predictor"  && <Predictor />}
        {page === "dashboard"  && <Dashboard />}
      </main>
    </div>
  );
}
