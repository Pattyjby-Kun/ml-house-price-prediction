import { useState } from "react";

const API = "http://127.0.0.1:8000";

const LOCATIONS = [
  { idx: 0, name: "ชานเมือง",  example: "มีนบุรี, หนองจอก" },
  { idx: 1, name: "รอบนอก",    example: "ลาดกระบัง, บางขุนเทียน" },
  { idx: 2, name: "กลางเมือง", example: "บางนา, อ่อนนุช" },
  { idx: 3, name: "ใจกลาง",    example: "พระโขนง, ทองหล่อ" },
  { idx: 4, name: "CBD",        example: "สีลม, สาทร, อโศก" },
];

const DEFAULT_FORM = {
  area: 120, bedrooms: 3, bathrooms: 2,
  house_age: 5, distance_bts: 1.5,
  floor: 10, parking: 1, location_idx: 2,
};

export default function Predictor() {
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const predict = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area:         parseFloat(form.area),
          bedrooms:     parseInt(form.bedrooms),
          bathrooms:    parseInt(form.bathrooms),
          house_age:    parseFloat(form.house_age),
          distance_bts: parseFloat(form.distance_bts),
          floor:        parseInt(form.floor),
          parking:      parseInt(form.parking),
          location_idx: parseInt(form.location_idx),
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="section-title">ประเมิน<span>ราคาบ้าน</span></h1>
        <p className="section-sub">กรอกข้อมูลบ้านเพื่อให้ AI วิเคราะห์ราคาตลาด</p>
      </div>

      <div className="card">
        {/* Location Selector */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize:"0.75rem", letterSpacing:"1px", textTransform:"uppercase", color:"var(--text-dim)", fontWeight:500 }}>
            ทำเลที่ตั้ง
          </label>
          <div className="locations-grid" style={{ marginTop:"0.8rem" }}>
            {LOCATIONS.map(l => (
              <div
                key={l.idx}
                className={`loc-card ${form.location_idx === l.idx ? "selected" : ""}`}
                onClick={() => set("location_idx", l.idx)}
              >
                <div className="loc-idx">{l.idx}</div>
                <div className="loc-name">{l.name}</div>
                <div className="loc-example">{l.example}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Form Fields */}
        <div className="form-grid">
          <div className="field">
            <label>พื้นที่ใช้สอย (ตร.ม.)</label>
            <input type="number" value={form.area}
              onChange={e => set("area", e.target.value)} min={20} />
          </div>
          <div className="field">
            <label>ห้องนอน</label>
            <input type="number" value={form.bedrooms}
              onChange={e => set("bedrooms", e.target.value)} min={1} max={10} />
          </div>
          <div className="field">
            <label>ห้องน้ำ</label>
            <input type="number" value={form.bathrooms}
              onChange={e => set("bathrooms", e.target.value)} min={1} max={10} />
          </div>
          <div className="field">
            <label>อายุบ้าน (ปี)</label>
            <input type="number" value={form.house_age}
              onChange={e => set("house_age", e.target.value)} min={0} max={50} />
          </div>
          <div className="field">
            <label>ระยะ BTS/MRT (กม.)</label>
            <input type="number" value={form.distance_bts}
              onChange={e => set("distance_bts", e.target.value)} min={0.1} step={0.1} />
          </div>
          <div className="field">
            <label>ชั้น</label>
            <input type="number" value={form.floor}
              onChange={e => set("floor", e.target.value)} min={1} max={80} />
          </div>
          <div className="field">
            <label>ที่จอดรถ</label>
            <select value={form.parking} onChange={e => set("parking", e.target.value)}>
              <option value={0}>ไม่มี</option>
              <option value={1}>1 คัน</option>
              <option value={2}>2 คัน+</option>
            </select>
          </div>
        </div>

        <button className="btn-predict" onClick={predict} disabled={loading}>
          {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์ราคา AI"}
        </button>

        {error && <div className="error-box">❌ {error} — ตรวจสอบว่า FastAPI รันอยู่ที่ port 8000</div>}
      </div>

      {/* Result */}
      {result && (
        <div className="result-card">
          <div className="result-label">ราคาประเมินโดย AI</div>
          <div className="result-price">{result.price_formatted}</div>
          <div className="result-note">{result.confidence_note}</div>
          <div className="result-tags">
            <span className="tag">พื้นที่ {form.area} ตร.ม.</span>
            <span className="tag">{form.bedrooms} ห้องนอน</span>
            <span className="tag">{form.bathrooms} ห้องน้ำ</span>
            <span className="tag">ทำเล: {LOCATIONS[form.location_idx]?.name}</span>
            <span className="tag">BTS {form.distance_bts} กม.</span>
          </div>
        </div>
      )}
    </div>
  );
}
