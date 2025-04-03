import React, { useState, useCallback } from "react";
import { Weight, PlusCircle, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import Receipt from "./Receipt";

interface Calculations {
  netWeight: string;
  goldPrice: string;
  makingChargesAmount: string;
  otherCharges: string;
  gstAmount: string;
  subtotal: string;
  total: string;
}

const PriceCalculator = () => {
  const [netWeight, setNetWeight] = useState<number | "">("");
  const [goldRate, setGoldRate] = useState<number | "">("");
  const [makingCharges, setMakingCharges] = useState<number | "">("");
  const [makingChargesType, setMakingChargesType] = useState<
    "percentage" | "flat"
  >("percentage"); // Added state for type
  const [otherCharges, setOtherCharges] = useState<number | "">("");
  const [calculations, setCalculations] = useState<Calculations | null>(null);

  const GST_RATE = 3; // GST percentage

  const calculateTotal = useCallback(() => {
    if (netWeight === "" || goldRate === "") {
      return;
    }

    const numMakingCharges = Number(makingCharges || 0);
    const numOtherCharges = Number(otherCharges || 0);

    const goldPrice = Number(netWeight * goldRate);

    // Calculate making charges based on type
    const makingChargesAmount =
      makingChargesType === "percentage"
        ? (goldPrice * numMakingCharges) / 100 // Percentage
        : numMakingCharges; // Flat value

    const subtotal = goldPrice + makingChargesAmount + numOtherCharges;

    const gstAmount = (subtotal * GST_RATE) / 100;

    const total = subtotal + gstAmount;

    setCalculations({
      netWeight: netWeight.toFixed(3),
      goldPrice: Math.round(goldPrice).toFixed(0),
      makingChargesAmount: Math.round(makingChargesAmount).toFixed(0),
      otherCharges: Math.round(numOtherCharges).toFixed(0),
      gstAmount: Math.round(gstAmount).toFixed(0),
      subtotal: Math.round(subtotal).toFixed(0),
      total: Math.round(total).toFixed(0),
    });
  }, [netWeight, goldRate, makingCharges, makingChargesType, otherCharges]);

  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<number | "">>,
    value: string
  ) => {
    if (value === "") {
      setter("");
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setter(numValue);
      }
    }
  };

  const resetForm = () => {
    setNetWeight("");
    setGoldRate("");
    setMakingCharges("");
    setMakingChargesType("percentage"); // Reset type
    setOtherCharges("");
    setCalculations(null);
  };

  return (
    <div className="container mx-auto px-2 max-w-md py-2">
      <div className="space-y-6">
        <Card className="mb-2 p-5 pt=[10px] shadow-lg border-purple-200 bg-gradient-to-br from-white to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-100/20 to-rose-100/30 opacity-50 pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="itemWeight"
                  className="text-purple-800 flex items-center font-medium"
                >
                  <Weight className="h-4 w-4 mr-1 text-purple-600" /> Net Weight
                  (g)
                </Label>
                <Input
                  id="itemWeight"
                  type="number"
                  min="0"
                  step="0.001"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={netWeight}
                  onChange={(e) =>
                    handleInputChange(setNetWeight, e.target.value)
                  }
                  placeholder="Enter weight"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="goldRate"
                  className="text-purple-800 flex items-center font-medium"
                >
                  Gold Rate (per gram)
                </Label>
                <Input
                  id="goldRate"
                  type="number"
                  min="0"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={goldRate}
                  onChange={(e) =>
                    handleInputChange(setGoldRate, e.target.value)
                  }
                  placeholder="Enter Gold rate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="makingCharges"
                  className="text-purple-800 flex items-center font-medium"
                >
                  <PlusCircle className="h-4 w-4 mr-1 text-purple-600" /> Making
                  Charges
                </Label>
                <div className="flex items-center space-x-2">
                  <select
                    className="border border-purple-200 rounded-lg bg-white/80 focus:ring-purple-500 focus:border-purple-500"
                    value={makingChargesType}
                    onChange={(e) =>
                      setMakingChargesType(
                        e.target.value as "percentage" | "flat"
                      )
                    }
                  >
                    <option value="percentage">%</option>
                    <option value="flat">Flat</option>
                  </select>
                  <Input
                    id="makingCharges"
                    type="number"
                    min="0"
                    className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                    value={makingCharges}
                    onChange={(e) =>
                      handleInputChange(setMakingCharges, e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="stoneCharges"
                  className="text-purple-800 font-medium"
                >
                  Other Charges
                </Label>
                <Input
                  id="stoneCharges"
                  type="number"
                  min="0"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={otherCharges}
                  onChange={(e) =>
                    handleInputChange(setOtherCharges, e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-between space-x-2">
              <Button
                onClick={resetForm}
                className="w-full bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-100 hover:border-rose-600 hover:text-rose-600 shadow-md transition-all"
              >
                Reset
              </Button>

              <Button
                onClick={calculateTotal}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 hover:from-purple-600 hover:via-pink-600 hover:to-rose-500 text-white shadow-md"
              >
                Calculate <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {calculations && <Receipt calculations={calculations} />}
      </div>
    </div>
  );
};

export default PriceCalculator;
