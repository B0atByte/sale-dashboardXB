import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./i18n";
import useAuth from "./hooks/useAuth";
import PasscodeGate from "./components/PasscodeGate";
import SalesPage from "./pages/SalesPage";

/**
 * ด่านล็อกอิน: เช็ค session ก่อน ถ้ายังไม่ล็อกอินให้ขึ้นหน้าใส่รหัส
 * ล็อกอินแล้วค่อยเข้าหน้าแดชบอร์ด
 */
function AuthGate() {
  const { checked, authed, login, logout } = useAuth();

  // กำลังเช็ค session — โชว์โลโก้ค้างไว้กันจอกระพริบ
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <img
          src="/xbloom-logo.png"
          alt=""
          className="h-14 w-14 animate-pulse rounded-3xl"
        />
      </div>
    );
  }

  if (!authed) return <PasscodeGate onLogin={login} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sales" replace />} />
        <Route path="/sales" element={<SalesPage onLogout={logout} />} />
        <Route path="*" element={<Navigate to="/sales" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * ห่อทั้งแอปด้วย LanguageProvider (รองรับ 2 ภาษา) แล้วผ่านด่านล็อกอิน
 */
export default function App() {
  return (
    <LanguageProvider>
      <AuthGate />
    </LanguageProvider>
  );
}
