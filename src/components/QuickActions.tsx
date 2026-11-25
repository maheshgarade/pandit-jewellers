import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, FileText, Plus, UserPlus } from "lucide-react";
import { EMPTY_ESTIMATE, useStore } from "@/lib/store";
import { recordEstimate } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Floating + (bottom right, above the tabs): Create estimate, Create customer, Calculate, to jump between
 * screens. "Create estimate" starts a new one only when the current one was already printed / shared.
 * Press and drag the + to move it anywhere; the spot is remembered on this phone.
 */
const POS_KEY = "pj.fabPos";
const SIZE = 56; // h-14 / w-14
const MARGIN = 8;
const DRAG_THRESHOLD = 8; // px of movement before a press counts as a drag, not a tap

type Pos = { x: number; y: number }; // top-left of the button, in viewport px

const clamp = (p: Pos): Pos => ({
  x: Math.min(Math.max(p.x, MARGIN), window.innerWidth - SIZE - MARGIN),
  y: Math.min(Math.max(p.y, MARGIN), window.innerHeight - SIZE - MARGIN),
});

const loadPos = (): Pos | null => {
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? clamp(JSON.parse(raw) as Pos) : null;
  } catch {
    return null;
  }
};

export const QuickActions: React.FC = () => {
  const { t } = useLanguage();
  const { update } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(loadPos); // null = default spot (bottom right, above the tabs)
  const drag = useRef<{ id: number; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
    if (!d.moved) setOpen(false);
    d.moved = true;
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      setPos((p) => {
        try {
          if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          /* storage unavailable: position just won't be remembered */
        }
        return p;
      });
    } else {
      setOpen((o) => !o);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  const actions = [
    {
      label: t("fab.estimate"),
      icon: FileText,
      run: () => {
        update((s) => (s.estimate.no !== null ? { ...recordEstimate(s), estimate: EMPTY_ESTIMATE } : s));
        navigate("/estimate");
      },
    },
    { label: t("fab.customer"), icon: UserPlus, run: () => navigate("/customers?add=1") },
    { label: t("fab.calculate"), icon: Calculator, run: () => navigate("/") },
  ];

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-gray-900/30" aria-hidden="true" onClick={() => setOpen(false)} /> : null}
      <div
        className={`fixed z-40 flex gap-2 ${pos ? "" : "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4"} ${
          pos && pos.y < window.innerHeight / 2 ? "flex-col" : "flex-col-reverse"
        } ${pos && pos.x < window.innerWidth / 2 ? "items-start" : "items-end"}`}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
      >
        <button
          type="button"
          aria-label={t("fab.open")}
          aria-expanded={open}
          aria-controls="quick-actions"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
          onContextMenu={(e) => e.preventDefault()}
          className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl active:scale-95"
        >
          <Plus className={`h-7 w-7 transition-transform ${open ? "rotate-45" : ""}`} aria-hidden="true" />
        </button>
        {open ? (
          <ul id="quick-actions" className="flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.label}>
                <button
                  type="button"
                  onClick={() => go(a.run)}
                  className="flex h-12 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-[15px] font-semibold text-purple-900 shadow-lg active:bg-purple-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-800">
                    <a.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};
