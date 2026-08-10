import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// เสิร์ฟใต้ subpath (เช่น /sales/): เติม base ให้ทุก request "/api/..." อัตโนมัติ ที่จุดเดียว
// (BASE_URL = "/" ตอนอยู่ราก → ไม่ทำอะไร) จึงไม่ต้องแก้ fetch ทีละที่ทั่วแอป
const BASE_URL = import.meta.env.BASE_URL;
if (BASE_URL && BASE_URL !== "/") {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = `${BASE_URL}${input.slice(1)}`; // "/api/x" → "/sales/api/x"
    }
    return nativeFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
