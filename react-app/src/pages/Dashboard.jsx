import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

function fmt(n) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n;
}

export default function Dashboard() {
  const [stats,  setStats]  = useState(null);
  const [trends, setTrends] = useState([]);
  const [model,  setModel]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/market/stats`).then(r => r.json()),
      fetch(`${API}/market/trends`).then(r => r.json()),
      fetch(`${API}/model/info`).then(r => r.json()),
    ]).then(([s, t, m]) => {
      setStats(s); setTrends(t.trends); setModel(m);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding:"4rem", textAlign:"center", color:"var(--text-dim)" }}>
      <span className="loading-dot" /> กำลังโหลดข้อมูล...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="section-title">ภาพรวม<span>ตลาด</span></h1>
        <p className="section-sub">ข้อมูลราคาอสังหาริมทรัพย์และสถิติ AI Model</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">ราคาเฉลี่ย</div>
            <div className="stat-value">฿{fmt(stats.avg_price)}</div>
            <div className="stat-unit">บาท</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ราคาต่ำสุด</div>
            <div className="stat-value">฿{fmt(stats.min_price)}</div>
            <div className="stat-unit">บาท</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ราคาสูงสุด</div>
            <div className="stat-value">฿{fmt(stats.max_price)}</div>
            <div className="stat-unit">บาท</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">จำนวนรายการ</div>
            <div className="stat-value">{stats.total_listings.toLocaleString()}</div>
            <div className="stat-unit">หลัง</div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Trends */}
        {trends.length > 0 && (
          <div className="card">
            <div style={{ fontSize:"0.75rem", letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--text-dim)", fontWeight:500 }}>
              แนวโน้มราคาเฉลี่ย
            </div>
            <table className="trend-table">
              <thead>
                <tr>
                  <th>ไตรมาส</th>
                  <th>ราคาเฉลี่ย</th>
                  <th>เปลี่ยนแปลง</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t, i) => {
                  const prev  = i > 0 ? trends[i-1].avg_price : null;
                  const delta = prev ? ((t.avg_price - prev) / prev * 100).toFixed(1) : null;
                  return (
                    <tr key={t.quarter}>
                      <td>{t.quarter}</td>
                      <td>฿{t.avg_price.toLocaleString()}</td>
                      <td style={{ color: delta > 0 ? "var(--accent)" : "var(--text-dim)" }}>
                        {delta ? `${delta > 0 ? "+" : ""}${delta}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Model Info */}
        {model && (
          <div className="card">
            <div style={{ fontSize:"0.75rem", letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--text-dim)", fontWeight:500 }}>
              AI Model Info
            </div>
            <div style={{ marginTop:"1.2rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
              {[
                { label:"Model",    value: model.model_type },
                { label:"Tuning",   value: model.tuning },
                { label:"R² Score", value: model.metrics.R2 },
                { label:"MAE",      value: `฿${Number(model.metrics.MAE).toLocaleString()}` },
                { label:"MAPE",     value: model.metrics.MAPE },
                { label:"Train Samples", value: model.training_samples?.toLocaleString() },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border)", paddingBottom:"0.8rem" }}>
                  <span style={{ fontSize:"0.8rem", color:"var(--text-dim)", letterSpacing:"0.5px" }}>{row.label}</span>
                  <span style={{ fontFamily:"'DM Mono', monospace", fontSize:"0.88rem", color:"var(--accent)" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:"1.5rem" }}>
              <div style={{ fontSize:"0.72rem", letterSpacing:"1px", textTransform:"uppercase", color:"var(--text-dim)", marginBottom:"0.8rem" }}>Features ที่ใช้</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {model.features?.map(f => (
                  <span key={f} className="tag">{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
