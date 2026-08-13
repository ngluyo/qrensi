"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2, ChevronRight } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "idle" | "unsupported" | "working" | "on" | "error";

export function NotifToggle() {
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("Pengingat & notifikasi anomali");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      setMsg("Perangkat/browser tidak mendukung notifikasi.");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setState("on");
          setMsg("Notifikasi aktif di perangkat ini.");
        }
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setState("working");
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error("VAPID key belum diset");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("error");
        setMsg("Izin notifikasi ditolak.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("subscribe gagal");
      setState("on");
      setMsg("Notifikasi aktif di perangkat ini.");
    } catch {
      setState("error");
      setMsg("Gagal mengaktifkan. Notifikasi butuh HTTPS (produksi).");
    }
  }

  const disabled = state === "working" || state === "on" || state === "unsupported";

  return (
    <button
      onClick={enable}
      disabled={disabled}
      className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-[var(--shadow-sm)] disabled:opacity-90"
    >
      <div className={`grid size-10 place-items-center rounded-xl ${state === "on" ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"}`}>
        {state === "working" ? <Loader2 className="size-5 animate-spin" /> : state === "on" ? <BellRing className="size-5" /> : <Bell className="size-5" />}
      </div>
      <div className="flex-1">
        <div className="font-semibold">Notifikasi</div>
        <div className="text-xs text-muted">{msg}</div>
      </div>
      {state !== "on" && state !== "unsupported" && <ChevronRight className="size-5 text-muted" />}
    </button>
  );
}
