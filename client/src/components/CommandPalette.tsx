// client/src/components/CommandPalette.tsx
import React, { useEffect, useRef, useState } from "react";

type Cmd = { id: string; label: string; action: () => void };

export default function CommandPalette({ commands }: { commands: Cmd[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      if ((mac && e.metaKey && e.key.toLowerCase() === "k") || (!mac && e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQ("");
  }, [open]);

  const list = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-24 w-[92%] max-w-xl rounded-2xl bg-white shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث أو اكتب أمرًا… / Search or type a command…"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <div className="max-h-72 overflow-auto mt-2">
              {list.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100"
                  onClick={() => {
                    c.action();
                    setOpen(false);
                  }}
                >
                  {c.label}
                </button>
              ))}
              {list.length === 0 && (
                <div className="px-4 py-6 text-slate-500 text-sm">لا نتائج / No results</div>
              )}
            </div>
            <div className="px-4 pb-2 pt-1 text-[11px] text-slate-500">
              اضغط Esc للإغلاق • Press Esc to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
