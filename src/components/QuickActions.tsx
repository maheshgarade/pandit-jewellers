import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
const GAP = 10; // between the button and its menu
const DRAG_THRESHOLD = 10; // px of movement before a press counts as a drag, not a tap

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

  // Tap = the browser's own click (reliable anywhere on the button). Dragging uses pointer events and only
  // takes over once the finger has moved past DRAG_THRESHOLD; the click that follows a drag is ignored.
  const justDragged = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    justDragged.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setOpen(false);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    }
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }));
  };
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    justDragged.current = true;
    setPos((p) => {
      try {
        if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
      } catch {
        /* storage unavailable: position just won't be remembered */
      }
      return p;
    });
  };
  const onClick = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setOpen((o) => !o);
  };

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

  // The menu is placed on its own, after measuring it: above the button when it fits there (else below), lined up
  // with the button's right edge when the button is on the right half (else its left edge), always kept on screen.
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const b = btnRef.current?.getBoundingClientRect();
    const m = menuRef.current?.getBoundingClientRect();
    if (!b || !m) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const above = b.top - GAP - MARGIN;
    const below = vh - b.bottom - GAP - MARGIN;
    let top = above >= m.height || above >= below ? b.top - GAP - m.height : b.bottom + GAP;
    top = Math.min(Math.max(top, MARGIN), vh - m.height - MARGIN);
    let left = b.left + b.width / 2 >= vw / 2 ? b.right - m.width : b.left;
    left = Math.min(Math.max(left, MARGIN), vw - m.width - MARGIN);
    setMenuPos({ left, top });
  }, [open, pos]);

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-gray-900/30" aria-hidden="true" onClick={() => setOpen(false)} /> : null}
      <button
        ref={btnRef}
        type="button"
        aria-label={t("fab.open")}
        aria-expanded={open}
        aria-controls="quick-actions"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
        className={`fixed z-40 flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl active:scale-95 ${
          pos ? "" : "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4"
        }`}
      >
        <Plus className={`h-7 w-7 transition-transform ${open ? "rotate-45" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          ref={menuRef}
          id="quick-actions"
          style={menuPos ? { left: menuPos.left, top: menuPos.top } : { left: 0, top: 0, visibility: "hidden" }}
          className="fixed z-40 flex max-w-[calc(100vw-16px)] flex-col gap-2"
        >
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => go(a.run)}
                className="flex h-12 w-full items-center gap-2 whitespace-nowrap rounded-full bg-white pl-3 pr-5 text-[15px] font-semibold text-purple-900 shadow-lg active:bg-purple-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-800">
                  <a.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
};
