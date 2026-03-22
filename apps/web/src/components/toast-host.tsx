"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  duplicated: "Modèle dupliqué.",
  saved: "Enregistré.",
  launched: "Run enregistré.",
};

function ToastHostInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const toast = sp.get("toast");
  const toastMsg = sp.get("toastMsg");
  const toastKey = `${toast ?? ""}|${toastMsg ?? ""}`;

  useEffect(() => {
    if (!toast) return;
    let text = MESSAGES[toast] ?? toast;
    if (toastMsg) {
      try {
        text = decodeURIComponent(toastMsg);
      } catch {
        text = toastMsg;
      }
    }
    setOpen({ kind: toast === "error" ? "err" : "ok", text });
    const t = window.setTimeout(() => setOpen(null), 5_000);
    const q = new URLSearchParams(sp.toString());
    q.delete("toast");
    q.delete("toastMsg");
    const next = q.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    return () => clearTimeout(t);
  }, [toastKey, toast, toastMsg, pathname, router, sp]);

  if (!open) return null;
  return (
    <div
      className={`toast-banner ${open.kind === "ok" ? "toast-banner--ok" : "toast-banner--err"}`}
      role="status"
    >
      {open.text}
    </div>
  );
}

export function ToastHost() {
  return (
    <Suspense fallback={null}>
      <ToastHostInner />
    </Suspense>
  );
}
