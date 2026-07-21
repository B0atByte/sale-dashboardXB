import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DEFAULTS = {
  gmvField: "lineTotal",
  cacheTtlSeconds: 60,
  refreshIntervalMs: 60000,
  brandTitle: "xBloom Sale Dashboard",
  brandFooter: "© 2026 xBloomXCasalapin",
  showDemo: true,
};

const SettingsContext = createContext({
  settings: DEFAULTS,
  reloadSettings: () => {},
});

/**
 * โหลดตั้งค่าระบบจาก /api/settings แล้วให้คอมโพเนนต์ทั่วแอปใช้ (แบรนด์/ความไว/แหล่งยอดขาย)
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const reloadSettings = useCallback(() => {
    fetch("/api/settings", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object") setSettings({ ...DEFAULTS, ...d });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  return (
    <SettingsContext.Provider value={{ settings, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
