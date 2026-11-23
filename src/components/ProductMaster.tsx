import React, { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { DEFAULT_PRODUCTS, newId, ProductCategory } from "@/lib/products";
import { inputCls, Modal, primaryBtnCls } from "@/components/calc/ui";

type Ask =
  | { kind: "addCat" }
  | { kind: "renameCat"; cat: ProductCategory }
  | { kind: "addProduct"; cat: ProductCategory }
  | { kind: "renameProduct"; cat: ProductCategory; id: string; name: string };
type Del = { cat: ProductCategory; id?: string; name: string };

/** Settings › Product master: parent categories and their products. Add, rename, delete. */
export const ProductMaster: React.FC = () => {
  const { state, update } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [del, setDel] = useState<Del | null>(null);
  const [resetting, setResetting] = useState(false);
  const cats = state.products;
  const setCats = (fn: (c: ProductCategory[]) => ProductCategory[]) => update((s) => ({ ...s, products: fn(s.products) }));
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  const save = (text: string) => {
    const name = text.trim();
    if (!name || !ask) return;
    if (ask.kind === "addCat" || ask.kind === "renameCat") {
      if (cats.some((c) => same(c.name, name) && !(ask.kind === "renameCat" && c.id === ask.cat.id))) return toast.error(`${name} is already a category.`);
      if (ask.kind === "addCat") {
        const id = newId();
        setCats((c) => [...c, { id, name, products: [] }]);
        setOpen(id);
      } else setCats((c) => c.map((x) => (x.id === ask.cat.id ? { ...x, name } : x)));
    } else {
      const cat = cats.find((c) => c.id === ask.cat.id);
      if (cat?.products.some((p) => same(p.name, name) && !(ask.kind === "renameProduct" && p.id === ask.id))) return toast.error(`${name} is already in ${cat.name}.`);
      setCats((c) =>
        c.map((x) =>
          x.id !== ask.cat.id
            ? x
            : ask.kind === "addProduct"
              ? { ...x, products: [...x.products, { id: newId(), name }] }
              : { ...x, products: x.products.map((p) => (p.id === ask.id ? { ...p, name } : p)) }
        )
      );
    }
    setAsk(null);
  };

  const iconBtn = "flex h-11 w-10 shrink-0 items-center justify-center";
  return (
    <div className="flex flex-col">
      <ul>
        {cats.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} className="border-b border-purple-100">
              <div className="flex items-center pr-1">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 pl-4 text-left">
                  <ChevronDown className={`h-4 w-4 shrink-0 text-purple-700 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  <span className="truncate text-[15px] font-semibold text-gray-900">{c.name}</span>
                  <span className="shrink-0 text-xs text-gray-600">{c.products.length}</span>
                </button>
                <button type="button" aria-label={`Rename category ${c.name}`} onClick={() => setAsk({ kind: "renameCat", cat: c })} className={`${iconBtn} text-purple-700`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Delete category ${c.name}`} onClick={() => setDel({ cat: c, name: c.name })} className={`${iconBtn} text-red-600`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {isOpen ? (
                <ul className="bg-purple-50/60 pb-2">
                  {c.products.map((p) => (
                    <li key={p.id} className="flex items-center pl-10 pr-1">
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{p.name}</span>
                      <button type="button" aria-label={`Rename ${p.name}`} onClick={() => setAsk({ kind: "renameProduct", cat: c, id: p.id, name: p.name })} className={`${iconBtn} text-purple-700`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setDel({ cat: c, id: p.id, name: p.name })} className={`${iconBtn} text-red-600`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  <li className="pl-10 pr-4 pt-1">
                    <button type="button" onClick={() => setAsk({ kind: "addProduct", cat: c })} className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-purple-800">
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add product to {c.name}
                    </button>
                  </li>
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 p-4">
        <button type="button" onClick={() => setAsk({ kind: "addCat" })} className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-purple-800 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add category
        </button>
        <button type="button" onClick={() => setResetting(true)} className="min-h-11 text-sm font-semibold text-gray-700 underline">
          Restore the original product list
        </button>
      </div>

      {ask ? <NameDialog ask={ask} onClose={() => setAsk(null)} onSave={save} /> : null}

      {del ? (
        <Modal
          title={del.id ? "Delete product" : "Delete category"}
          onClose={() => setDel(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDel(null)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCats((c) => (del.id ? c.map((x) => (x.id === del.cat.id ? { ...x, products: x.products.filter((p) => p.id !== del.id) } : x)) : c.filter((x) => x.id !== del.cat.id)));
                  setDel(null);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                Delete
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">
            Delete <strong>{del.name}</strong>
            {del.id ? ` from ${del.cat.name}` : ` and its ${del.cat.products.length} products`}? Estimates already made keep their item names.
          </p>
        </Modal>
      ) : null}

      {resetting ? (
        <Modal
          title="Restore product list"
          onClose={() => setResetting(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setResetting(false)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  update((s) => ({ ...s, products: DEFAULT_PRODUCTS }));
                  setResetting(false);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                Restore
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">Replace your changes with the original categories and products?</p>
        </Modal>
      ) : null}
    </div>
  );
};

const NameDialog: React.FC<{ ask: Ask; onClose: () => void; onSave: (name: string) => void }> = ({ ask, onClose, onSave }) => {
  const initial = ask.kind === "renameCat" ? ask.cat.name : ask.kind === "renameProduct" ? ask.name : "";
  const [v, setV] = useState(initial);
  const title =
    ask.kind === "addCat" ? "Add category" : ask.kind === "renameCat" ? "Rename category" : ask.kind === "addProduct" ? `Add product to ${ask.cat.name}` : "Rename product";
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
            Cancel
          </button>
          <button type="button" disabled={!v.trim()} onClick={() => onSave(v)} className={`${primaryBtnCls} disabled:opacity-50`}>
            Save
          </button>
        </div>
      }
    >
      <label htmlFor="pm-name" className="text-sm font-medium text-purple-800">
        Name
      </label>
      <input id="pm-name" autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSave(v)} className={inputCls} />
    </Modal>
  );
};
