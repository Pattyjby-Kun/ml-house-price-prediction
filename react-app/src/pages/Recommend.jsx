import { useState } from "react";

const STEPS = [
  {
    num: "01", title: "กำหนดงบประมาณ", icon: "💰",
    desc: "รู้จักความสามารถทางการเงินของตัวเองก่อนเริ่มหาบ้าน",
    tips: [
      "งวดผ่อนต่อเดือนไม่ควรเกิน 30–35% ของรายได้",
      "เตรียมเงินดาวน์อย่างน้อย 10–20% ของราคาบ้าน",
      "บวกค่าใช้จ่ายแฝง: โอน, จดจำนอง, ประกัน ~3–5%",
      "เช็กวงเงินกู้ได้ที่ธนาคารก่อนตัดสินใจ",
    ],
    color: "#00e5a0",
  },
  {
    num: "02", title: "เลือกทำเลที่ใช่", icon: "📍",
    desc: "ทำเลดีมีชัยไปกว่าครึ่ง และส่งผลต่อราคาบ้านโดยตรง",
    tips: [
      "ระยะห่างจาก BTS/MRT ทุก 1 กม. ราคาลดลง ~5–10%",
      "เช็กสภาพแวดล้อม: โรงเรียน, โรงพยาบาล, ห้างใกล้เคียง",
      "ดูผังเมือง — พื้นที่สีแดงราคาสูงกว่าสีเหลือง",
      "ลองขับรถไปทำงานช่วงเช้าก่อนตัดสินใจ",
    ],
    color: "#7b61ff",
  },
  {
    num: "03", title: "เลือกประเภทที่อยู่อาศัย", icon: "🏠",
    desc: "แต่ละประเภทเหมาะกับไลฟ์สไตล์และงบที่แตกต่างกัน",
    tips: [
      "คอนโด — ใกล้รถไฟฟ้า, ดูแลง่าย, เหมาะคนโสด/คู่รัก",
      "ทาวน์โฮม — พื้นที่มากกว่า, เหมาะครอบครัวเล็ก",
      "บ้านเดี่ยว — พื้นที่สูงสุด, ต้องการงบมากกว่า",
      "บ้านมือสอง — ราคาถูกกว่า 20–30% แต่ต้องตรวจสอบ",
    ],
    color: "#ff6b35",
  },
  {
    num: "04", title: "ใช้ AI ประเมินราคา", icon: "🤖",
    desc: "ตรวจสอบว่าราคาที่ขายสมเหตุสมผลหรือแพงเกินจริง",
    tips: [
      "กรอกข้อมูลบ้านในหน้า 'ประเมินราคา' เพื่อดูราคาตลาด",
      "ถ้าราคาขายสูงกว่า AI > 15% ควรต่อราคาหรือหาตัวเลือกอื่น",
      "เปรียบเทียบบ้านหลายหลังในทำเลเดียวกัน",
      "ดูแนวโน้มราคาในหน้า 'ภาพรวมตลาด'",
    ],
    color: "#00e5a0", cta: true,
  },
  {
    num: "05", title: "ตรวจสอบก่อนซื้อ", icon: "🔍",
    desc: "อย่ารีบเซ็นสัญญา ตรวจให้ครบก่อนทุกครั้ง",
    tips: [
      "ตรวจโฉนดที่ดิน — ชื่อเจ้าของตรงกับผู้ขายไหม",
      "เดินดูบ้านจริงหลายรอบ ทั้งกลางวันและกลางคืน",
      "เช็กรอยร้าว, ท่อน้ำ, ระบบไฟฟ้า, หลังคา",
      "จ้างผู้เชี่ยวชาญตรวจบ้าน (Home Inspector) ถ้าเป็นไปได้",
    ],
    color: "#7b61ff",
  },
  {
    num: "06", title: "ยื่นกู้และโอนกรรมสิทธิ์", icon: "📝",
    desc: "ขั้นตอนสุดท้ายก่อนได้บ้านเป็นของตัวเอง",
    tips: [
      "เตรียมเอกสาร: สลิปเงินเดือน, Statement 6 เดือน, บัตรประชาชน",
      "ยื่นกู้หลายธนาคารเพื่อเปรียบเทียบดอกเบี้ย",
      "อ่านสัญญาซื้อขายให้ครบก่อนเซ็น",
      "วันโอน นำเงินดาวน์และค่าธรรมเนียมไปด้วย",
    ],
    color: "#ff6b35",
  },
];

const BUDGET_RANGES = [
  { label: "น้อยกว่า 1 ล้าน",  suggest: "ห้องเช่า / คอนโดมือสองชานเมือง" },
  { label: "1 – 3 ล้าน",       suggest: "คอนโดรอบนอก / ทาวน์โฮมชานเมือง" },
  { label: "3 – 5 ล้าน",       suggest: "คอนโดกลางเมือง / ทาวน์โฮมทำเลดี" },
  { label: "5 – 10 ล้าน",      suggest: "บ้านเดี่ยวรอบนอก / คอนโดใจกลางเมือง" },
  { label: "มากกว่า 10 ล้าน",  suggest: "บ้านเดี่ยว CBD / คอนโด Luxury" },
];

export default function Recommend({ onGoPredict }) {
  const [budget, setBudget]     = useState(null);
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div className="page-header">
        <h1 className="section-title">เริ่มต้น<span>หาบ้าน</span></h1>
        <p className="section-sub">ไม่รู้จะเริ่มจากตรงไหน? เราแนะนำทีละขั้นตอน</p>
      </div>

      {/* Budget Picker */}
      <div className="card" style={{ marginBottom:"2rem" }}>
        <div style={{ fontSize:"0.75rem", letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--text-dim)", fontWeight:500 }}>
          งบประมาณของคุณอยู่ที่ระดับไหน?
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.7rem", marginTop:"1rem" }}>
          {BUDGET_RANGES.map(b => (
            <button key={b.label} onClick={() => setBudget(b)} style={{
              background: budget?.label === b.label ? "rgba(0,229,160,0.12)" : "var(--bg3)",
              border: `1px solid ${budget?.label === b.label ? "var(--accent)" : "var(--border)"}`,
              borderRadius:"10px",
              color: budget?.label === b.label ? "var(--accent)" : "var(--text)",
              fontFamily:"'DM Sans', sans-serif", fontSize:"0.85rem", fontWeight:500,
              padding:"8px 16px", cursor:"pointer", transition:"all 0.2s",
            }}>
              {b.label}
            </button>
          ))}
        </div>
        {budget && (
          <div style={{
            marginTop:"1.2rem", background:"rgba(0,229,160,0.06)",
            border:"1px solid rgba(0,229,160,0.2)", borderRadius:"12px",
            padding:"1rem 1.2rem", animation:"fadeUp 0.3s ease",
          }}>
            <div style={{ fontSize:"0.72rem", letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--accent)", fontWeight:600 }}>
              แนะนำสำหรับงบ {budget.label}
            </div>
            <div style={{ fontSize:"1rem", fontWeight:500, marginTop:"6px" }}>{budget.suggest}</div>
          </div>
        )}
      </div>

      {/* Step Cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        {STEPS.map(step => (
          <div key={step.num} className="card"
            style={{ cursor:"pointer", borderLeft:`3px solid ${step.color}` }}
            onClick={() => setExpanded(expanded === step.num ? null : step.num)}
          >
            <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"2rem", lineHeight:1, color:step.color, minWidth:"40px" }}>
                {step.num}
              </div>
              <div style={{ fontSize:"1.5rem" }}>{step.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:"1rem" }}>{step.title}</div>
                <div style={{ fontSize:"0.82rem", color:"var(--text-dim)", marginTop:"2px" }}>{step.desc}</div>
              </div>
              <div style={{ color:"var(--text-dim)", fontSize:"1.2rem", transition:"transform 0.2s", transform: expanded === step.num ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
            </div>

            {expanded === step.num && (
              <div style={{ marginTop:"1.2rem", paddingTop:"1.2rem", borderTop:"1px solid var(--border)", animation:"fadeUp 0.25s ease" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                  {step.tips.map((tip, i) => (
                    <div key={i} style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
                      <span style={{ color:step.color, marginTop:"2px", flexShrink:0 }}>▸</span>
                      <span style={{ fontSize:"0.88rem", lineHeight:1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
                {step.cta && (
                  <button onClick={e => { e.stopPropagation(); onGoPredict?.(); }}
                    className="btn-predict" style={{ marginTop:"1.2rem", maxWidth:"280px" }}>
                    ลองประเมินราคาเลย →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Don't Do This */}
      <div className="card" style={{ marginTop:"2rem" }}>
        <div style={{ fontSize:"0.75rem", letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--text-dim)", fontWeight:500, marginBottom:"1.2rem" }}>
          สิ่งที่ควรหลีกเลี่ยง ⚠️
        </div>
        <div className="two-col" style={{ marginTop:0 }}>
          {[
            "ซื้อบ้านเพราะกดดันจากนายหน้า",
            "ไม่เช็กโฉนดหรือภาระผูกพัน",
            "ผ่อนเกิน 40% ของรายได้ต่อเดือน",
            "ไม่เดินดูสถานที่จริงก่อนซื้อ",
            "เซ็นสัญญาโดยไม่อ่านรายละเอียด",
            "ไม่เปรียบเทียบราคากับตลาด",
          ].map((t, i) => (
            <div key={i} style={{ display:"flex", gap:"10px", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <span>❌</span>
              <span style={{ fontSize:"0.85rem" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
