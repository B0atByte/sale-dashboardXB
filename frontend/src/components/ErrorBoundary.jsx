import { Component } from "react";

/**
 * ErrorBoundary — กันทั้งแอป "จอขาว" เมื่อมี component ใด throw ตอน render
 * (เช่น ข้อมูลผิดรูปจากชีต) แสดงข้อความ + ปุ่มโหลดใหม่แทนหน้าว่างเปล่า
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "'LINE Seed Sans TH', system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>
            ระบบสะดุดชั่วคราว
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
            เกิดข้อผิดพลาดในการแสดงผลหน้านี้ ลองโหลดใหม่อีกครั้ง — หากยังเป็นอยู่โปรดแจ้งผู้ดูแลระบบ
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: "none",
              borderRadius: 12,
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              padding: "10px 22px",
              cursor: "pointer",
            }}
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }
}
