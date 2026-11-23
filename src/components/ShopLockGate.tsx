import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { checkInShop, grant, grantLeft, isNative, loadConfig, spendOwnerCode, type Reason } from "@/lib/shopLock";
import { inputCls } from "@/components/calc/ui";

const RECHECK_MS = 60_000;

type Status = { kind: "checking" } | { kind: "open" } | { kind: "locked"; reasons: Reason[] };

/**
 * Keeps the app closed outside the shop. Checked on launch, whenever the app comes back to the
 * foreground and every minute while it is open. The estimate in progress is kept while locked.
 */
export const ShopLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const check = useCallback(async () => {
    const cfg = loadConfig();
    // Not set up yet, or the browser dev server: nothing to enforce.
    if (!cfg?.enabled || !isNative()) return setStatus({ kind: "open" });
    if (grantLeft() > 0) return setStatus({ kind: "open" });
    if (running.current) return;
    running.current = true;
    try {
      const r = await checkInShop(cfg);
      setStatus(r.ok ? { kind: "open" } : { kind: "locked", reasons: r.reasons });
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(check, RECHECK_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [check]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const kind = await spendOwnerCode(code);
    setBusy(false);
    if (!kind) return setError(t("lock.badCode"));
    grant(loadConfig()?.grantHours ?? 2);
    setCode("");
    setStatus({ kind: "open" });
  };

  if (status.kind === "open") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-gradient-to-b from-purple-50 via-white to-pink-50 px-4 py-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-800">
        <Lock className="h-8 w-8" aria-hidden="true" />
      </span>
      {status.kind === "checking" ? (
        <p className="text-[15px] text-gray-700">{t("lock.checking")}</p>
      ) : (
        <>
          <div className="text-center">
            <h1 className="text-xl font-bold text-purple-900">{t("lock.title")}</h1>
            <p className="mt-1 text-sm text-gray-600">{t("lock.subtitle")}</p>
          </div>
          <ul className="w-full max-w-sm list-disc rounded-xl border border-purple-200 bg-white py-3 pl-8 pr-4 text-sm text-gray-800">
            {status.reasons.map((r) => (
              <li key={r}>{t(`lock.reason.${r}`)}</li>
            ))}
          </ul>
          <button type="button" onClick={check} className="flex h-11 items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-4 text-sm font-semibold text-purple-800">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("lock.retry")}
          </button>
          <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-2 rounded-xl border border-purple-200 bg-white p-4">
            <label htmlFor="owner-code" className="text-[13px] font-medium text-purple-800">
              {t("lock.ownerCode")}
            </label>
            <input id="owner-code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("lock.ownerCodePh")} className={inputCls} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <p className="text-xs text-gray-600">{t("lock.ownerHint", { h: loadConfig()?.grantHours ?? 2 })}</p>
            <button type="submit" disabled={busy || !code.trim()} className="h-11 rounded-md bg-purple-800 text-sm font-semibold text-white disabled:opacity-50">
              {t("lock.unlock")}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
