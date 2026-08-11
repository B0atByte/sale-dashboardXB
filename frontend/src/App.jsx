import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./i18n";
import { SettingsProvider } from "./settings";
import useAuth from "./hooks/useAuth";
import PasscodeGate from "./components/PasscodeGate";
import SalesPage from "./pages/SalesPage";
import ExecutivePage from "./pages/ExecutivePage";

/**
 * ด่านล็อกอิน: เช็ค session ก่อน ถ้ายังไม่ล็อกอินให้ขึ้นหน้าใส่รหัส
 * ล็อกอินแล้วค่อยเข้าหน้าแดชบอร์ด
 */
function AuthGate() {
  const { checked, authed, user, login, logout } = useAuth();

  // กำลังเช็ค session — โชว์โลโก้ค้างไว้กันจอกระพริบ
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <img
          src={`${import.meta.env.BASE_URL}xbloom-logo.png`}
          alt=""
          className="h-14 w-14 animate-pulse rounded-3xl"
        />
      </div>
    );
  }

  if (!authed) return <PasscodeGate onLogin={login} />;

  // role "executive" (ผู้บริหาร) — เห็นเฉพาะหน้า Executive Summary เท่านั้น
  // (ไม่มี Sidebar / ช่องทางขาย / Admin / Settings) — เข้าเว็บ = เด้งเข้าหน้านี้เลย
  if (user?.role === "executive") {
    return (
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<ExecutivePage onLogout={logout} user={user} />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<SalesPage onLogout={logout} user={user} />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
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
