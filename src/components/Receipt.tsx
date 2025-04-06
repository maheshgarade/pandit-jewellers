import React from "react";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { useLanguage } from "../context/LanguageContext";

interface ReceiptProps {
  calculations: {
    netWeight: string;
    goldPrice: string;
    makingChargesAmount: string;
    otherCharges: string;
    gstAmount: string;
    subtotal: string;
    total: string;
  };
}

const Receipt: React.FC<ReceiptProps> = ({ calculations }) => {
  const { t } = useLanguage();
  return (
    <Card className="p-5 pt-[10px] shadow-lg border-purple-200 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 opacity-60 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="text-center mb-[10px]">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
            {t("gold.receipt.title")}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="bg-gradient-to-r from-pink-100 to-rose-100 p-2.5 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-purple-900">
                {t("gold.receipt.weight")}
              </span>
              <span className="text-purple-800">
                {calculations.netWeight} g
              </span>
            </div>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-purple-200 to-pink-200 h-0.5 rounded-full" />

          <div className="space-y-2.5 px-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("gold.receipt.price")}</span>
              <span className="text-purple-700">
                ₹ {calculations.goldPrice}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("gold.receipt.making")}</span>
              <span className="text-purple-700">
                ₹ {calculations.makingChargesAmount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("gold.receipt.stone")}</span>
              <span className="text-purple-700">
                ₹ {calculations.otherCharges}
              </span>
            </div>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-purple-200 to-pink-200 h-0.5 rounded-full" />

          <div className="flex justify-between text-sm px-1">
            <span className="font-medium text-gray-600">
              {t("gold.receipt.subtotal")}
            </span>
            <span className="text-purple-700">₹ {calculations.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm px-1">
            <span className="font-medium text-gray-600">
              {t("gold.receipt.gst")}
            </span>
            <span className="text-purple-700">₹ {calculations.gstAmount}</span>
          </div>

          <Separator className="my-3 bg-gradient-to-r from-purple-200 to-pink-200 h-0.5 rounded-full" />

          <div className="flex justify-between font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 p-3 rounded-md">
            <span className="text-purple-900">{t("gold.receipt.total")}</span>
            <span className="text-purple-900">₹ {calculations.total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Receipt;
