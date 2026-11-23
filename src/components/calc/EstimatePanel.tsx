import React, { useState } from "react";
import { EMPTY_ESTIMATE, EstimateState, useStore } from "@/lib/store";
import { buildEstimate, drawEstimate, rupees } from "@/lib/receipt";
import { recordEstimate } from "@/lib/customers";
import { useLanguage } from "@/context/LanguageContext";
import { EstimateView } from "./EstimateView";
import { ResultActions } from "./ResultActions";
import { Modal, resetBtnCls } from "./ui";

/** The estimate being built, as it prints, with Print / Share / WhatsApp / Download and New estimate. */
export const EstimatePanel: React.FC = () => {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [confirmNew, setConfirmNew] = useState(false);
  const e = state.estimate;
  if (!e.items.length && !e.old.length) return null;

  const est = buildEstimate(e, state.roundOff);
  const no = e.no ?? state.billSeq;
  const edit = (fn: (x: EstimateState) => EstimateState) => update((s) => ({ ...s, estimate: fn(s.estimate) }));

  return (
    <section aria-labelledby="estimate-title" className="mt-4 flex flex-col gap-3">
      <h2 id="estimate-title" className="text-lg font-bold text-purple-900">
        {t("estimate.title")}
      </h2>
      <EstimateView
        est={est}
        shop={state.shop}
        no={no}
        layout={state.layout}
        shopDetails={state.printShopDetails}
        onRemoveItem={(i) =>
          edit((x) => (est.mode === "sell" ? { ...x, items: x.items.filter((_, k) => k !== i) } : { ...x, old: x.old.filter((_, k) => k !== i) }))
        }
        onRemoveOld={(m) => edit((x) => ({ ...x, old: x.old.filter((o) => o.metal !== m) }))}
      />
      <ResultActions
        render={(n) => drawEstimate(est, state.shop, state.paper, n, state.layout, state.printShopDetails)}
        shareText={`${state.shop.name} - ${t("estimate.title")} ${no}: ${rupees(est.grand)}`}
        no={e.no}
        // The first print / share numbers the estimate, saves its customer and keeps it in their history.
        onNumbered={(n) => update((s) => recordEstimate({ ...s, estimate: { ...s.estimate, no: n } }))}
      />
      <button type="button" onClick={() => setConfirmNew(true)} className={resetBtnCls}>
        {t("estimate.new")}
      </button>

      {confirmNew ? (
        <Modal
          title={t("estimate.new")}
          onClose={() => setConfirmNew(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmNew(false)} className="h-12 rounded-lg border border-gray-300 text-[15px] text-gray-700">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // A numbered estimate is kept in the history as it ended, then cleared.
                  update((s) => ({ ...recordEstimate(s), estimate: EMPTY_ESTIMATE }));
                  setConfirmNew(false);
                }}
                className="h-12 rounded-lg bg-rose-600 text-[15px] font-semibold text-white"
              >
                {t("estimate.clear")}
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-gray-700">{t("estimate.newConfirm")}</p>
        </Modal>
      ) : null}
    </section>
  );
};
