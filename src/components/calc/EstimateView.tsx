import React from "react";
import { X } from "lucide-react";
import { Cell, cardCells, Estimate, EstimateItem, estimateDate, itemsHeading, money, PrintLayout, rupees } from "@/lib/receipt";
import type { Metal, ShopDetails } from "@/lib/store";

const mono: React.CSSProperties = { fontFamily: "'Roboto Mono', 'Noto Sans Mono', ui-monospace, monospace" };
const alignCls = { left: "", center: "items-center text-center", right: "items-end text-right" } as const;

const Row: React.FC<{ cells: Cell[]; size: string }> = ({ cells, size }) => (
  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
    {cells.map((c) => (
      <div key={c.label} className={`flex min-w-0 flex-col ${alignCls[c.align]}`}>
        <span className="text-[9px] leading-tight">{c.label}</span>
        <span className={`${size} ${c.bold ? "font-bold" : ""}`}>{c.value}</span>
      </div>
    ))}
  </div>
);

const RemoveBtn: React.FC<{ label: string; onClick: () => void; className?: string }> = ({ label, onClick, className }) => (
  <button type="button" aria-label={label} onClick={onClick} className={`-my-2 flex h-11 w-11 shrink-0 items-center justify-center text-red-600 ${className ?? ""}`}>
    <X className="h-4 w-4" />
  </button>
);

const ItemCard: React.FC<{ it: EstimateItem; no: number; mode: Estimate["mode"]; layout: PrintLayout; onRemove?: () => void }> = ({ it, no, mode, layout, onRemove }) => {
  const { details, summary } = cardCells(it, mode, layout);
  return (
    <div className="flex flex-col gap-[3px] rounded border border-black px-[7px] py-[5px]">
      <div className="flex items-center justify-between gap-1.5">
        <span className="min-w-0 font-bold">
          {no}. {it.name} {it.purity ? <span className="text-[10px] font-normal">{it.purity}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {it.code ? <span className="whitespace-nowrap border border-black px-1 text-[10px] font-bold">{it.code}</span> : null}
          {onRemove ? <RemoveBtn label={`Remove ${no}. ${it.name}`} onClick={onRemove} className="-mr-2" /> : null}
        </span>
      </div>
      {details.map((r, k) => (
        <Row key={k} cells={r} size="text-[10px]" />
      ))}
      <div className="border-t border-dotted border-black pt-[3px]">
        <Row cells={summary} size="text-[11px]" />
      </div>
    </div>
  );
};

/** The estimate on screen, in the same layout as the print (see drawEstimate), with remove buttons. */
export const EstimateView: React.FC<{
  est: Estimate;
  shop: ShopDetails;
  no: number;
  layout: PrintLayout;
  shopDetails: boolean;
  onRemoveItem?: (index: number) => void;
  onRemoveOld?: (metal: Metal) => void;
}> = ({ est, shop, no, layout, shopDetails, onRemoveItem, onRemoveOld }) => {
  const customer = (
    [
      ["Name", est.customer.name],
      ["Mobile", est.customer.number],
      ["Address", est.customer.address],
    ] as const
  ).filter(([, v]) => v);
  const shopLines = shopDetails ? [shop.address, shop.phone && `Ph: ${shop.phone}`, shop.gstin && `GSTIN: ${shop.gstin}`, shop.other].filter(Boolean) : [];
  return (
    <section aria-label={`Estimate No ${no}`} className="mx-auto flex w-full max-w-[360px] flex-col gap-2 bg-white px-3 py-3.5 text-[11px] leading-snug text-black shadow-lg" style={mono}>
      <div className="text-center text-base font-bold tracking-wider">{(shop.name || "").toUpperCase()}</div>
      {shopLines.map((l, i) => (
        <div key={i} className="-mt-1 text-center text-[10px]">
          {l}
        </div>
      ))}
      <div className="border-t border-dashed border-black" />
      <div className="flex justify-between gap-2">
        <span>Estimate No: {no}</span>
        <span>{estimateDate()}</span>
      </div>
      <div className="border-t border-dashed border-black" />
      {customer.length ? (
        <>
          <div className="flex flex-col gap-0.5">
            {customer.map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <span className="w-[52px] shrink-0">{k}</span>
                <span className="min-w-0">: {v}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-black" />
        </>
      ) : null}
      <div className="flex justify-between font-bold">
        <span>
          {itemsHeading(est)} ({est.items.length})
        </span>
        <span>{est.mode === "sell" ? "Totals incl. GST" : ""}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {est.items.map((it, i) => (
          <ItemCard key={i} it={it} no={i + 1} mode={est.mode} layout={layout} onRemove={onRemoveItem ? () => onRemoveItem(i) : undefined} />
        ))}
      </div>
      <div className="mt-1 border-t border-dashed border-black" />
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between font-semibold">
          <span>Items Total ({est.items.length})</span>
          <span>{money(est.itemsTotal)}</span>
        </div>
        {est.less.map((l) => (
          <div key={l.metal} className="flex items-center justify-between gap-1">
            <span className="flex items-center">
              {onRemoveOld ? <RemoveBtn label={`Remove ${l.label.replace("Less: ", "").toLowerCase()}`} onClick={() => onRemoveOld(l.metal)} className="-ml-3" /> : null}
              {l.label}
            </span>
            <span>-{money(l.amount)}</span>
          </div>
        ))}
        {est.roundOff ? (
          <div className="flex justify-between">
            <span>Round Off</span>
            <span>
              {est.roundOff > 0 ? "+" : "-"}
              {money(Math.abs(est.roundOff))}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex justify-between border-y-2 border-black py-1.5 text-[15px] font-bold">
        <span>{est.payLabel}</span>
        <span>{rupees(est.grand)}</span>
      </div>
      {shopDetails && shop.footer ? <div className="text-center text-[10px]">{shop.footer}</div> : null}
    </section>
  );
};
