import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calculator, Weight, PlusCircle, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import Receipt from "./Receipt";

interface Calculations {
  netGoldWeight: string;
  goldPrice: string;
  makingChargesAmount: string;
  stoneCharges: string;
  gstAmount: string;
  subtotal: string;
  total: string;
  purity: string;
  purityPercentage: number;
}

const PriceCalculator = () => {
  const [itemWeight, setItemWeight] = useState<number | "">("");
  const [stoneWeight, setStoneWeight] = useState<number | "">("");
  const [purity, setPurity] = useState<string>("24K");
  const [goldRate, setGoldRate] = useState<number | "">("");
  const [makingCharges, setMakingCharges] = useState<number | "">(8);
  const [stoneCharges, setStoneCharges] = useState<number | "">("");
  const [calculations, setCalculations] = useState<Calculations | null>(null);

  const purities = useMemo(
    () => ({
      "24K": 99.9,
      "22K": 91.6,
      "18K": 75.0,
    }),
    []
  );

  const GST_RATE = 3; // GST percentage

  const calculateTotal = useCallback(() => {
    if (itemWeight === "" || goldRate === "") {
      return;
    }

    const numItemWeight = Number(itemWeight);
    const numStoneWeight = Number(stoneWeight || 0);
    const numGoldRate = Number(goldRate);
    const numMakingCharges = Number(makingCharges || 0);
    const numStoneCharges = Number(stoneCharges || 0);

    const netGoldWeight = Math.max(0, numItemWeight - numStoneWeight);

    const purityPercentage = purities[purity as keyof typeof purities] / 100;
    const goldPrice = netGoldWeight * numGoldRate * purityPercentage;

    const makingChargesAmount = (goldPrice * numMakingCharges) / 100;

    const subtotal = goldPrice + makingChargesAmount + numStoneCharges;

    const gstAmount = (subtotal * GST_RATE) / 100;

    const total = subtotal + gstAmount;

    setCalculations({
      netGoldWeight: netGoldWeight.toFixed(3),
      goldPrice: goldPrice.toFixed(2),
      makingChargesAmount: makingChargesAmount.toFixed(2),
      stoneCharges: numStoneCharges.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      purity: purity,
      purityPercentage: purities[purity as keyof typeof purities],
    });
  }, [
    itemWeight,
    stoneWeight,
    purity,
    goldRate,
    makingCharges,
    stoneCharges,
    purities,
  ]);

  useEffect(() => {
    if (itemWeight !== "" && goldRate !== "") {
      calculateTotal();
    }
  }, [
    itemWeight,
    stoneWeight,
    purity,
    goldRate,
    makingCharges,
    stoneCharges,
    calculateTotal,
  ]);

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

  return (
    <div className="container mx-auto px-2 max-w-md">
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Calculator className="h-7 w-7 text-purple-500" />
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            Price Calculator
          </h1>
        </div>

        <Card className="p-5 shadow-lg border-purple-200 bg-gradient-to-br from-white to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-100/20 to-rose-100/30 opacity-50 pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="itemWeight"
                  className="text-purple-800 flex items-center font-medium"
                >
                  <Weight className="h-4 w-4 mr-1 text-purple-600" /> Item
                  Weight (g)
                </Label>
                <Input
                  id="itemWeight"
                  type="number"
                  min="0"
                  step="0.001"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={itemWeight}
                  onChange={(e) =>
                    handleInputChange(setItemWeight, e.target.value)
                  }
                  placeholder="Enter weight"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="stoneWeight"
                  className="text-purple-800 flex items-center font-medium"
                >
                  <Weight className="h-4 w-4 mr-1 text-purple-600" /> Stone
                  Weight (g)
                </Label>
                <Input
                  id="stoneWeight"
                  type="number"
                  min="0"
                  step="0.001"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={stoneWeight}
                  onChange={(e) =>
                    handleInputChange(setStoneWeight, e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purity" className="text-purple-800 font-medium">
                Gold Purity
              </Label>
              <Select
                value={purity}
                onValueChange={(value: string) => setPurity(value)}
              >
                <SelectTrigger className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80">
                  <SelectValue placeholder="Select purity" />
                </SelectTrigger>
                <SelectContent className="bg-white border-purple-200">
                  <SelectItem value="24K" className="hover:bg-purple-50">
                    24K - 99.9%
                  </SelectItem>
                  <SelectItem value="22K" className="hover:bg-purple-50">
                    22K - 91.6%
                  </SelectItem>
                  <SelectItem value="18K" className="hover:bg-purple-50">
                    18K - 75.0%
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goldRate" className="text-purple-800 font-medium">
                Gold Rate (per gram)
              </Label>
              <Input
                id="goldRate"
                type="number"
                min="0"
                className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                value={goldRate}
                onChange={(e) => handleInputChange(setGoldRate, e.target.value)}
                placeholder="Enter current gold rate"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="makingCharges"
                  className="text-purple-800 flex items-center font-medium"
                >
                  <PlusCircle className="h-4 w-4 mr-1 text-purple-600" /> Making
                  Charges (%)
                </Label>
                <Input
                  id="makingCharges"
                  type="number"
                  min="0"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={makingCharges}
                  onChange={(e) =>
                    handleInputChange(setMakingCharges, e.target.value)
                  }
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="stoneCharges"
                  className="text-purple-800 font-medium"
                >
                  Stone Charges
                </Label>
                <Input
                  id="stoneCharges"
                  type="number"
                  min="0"
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 bg-white/80"
                  value={stoneCharges}
                  onChange={(e) =>
                    handleInputChange(setStoneCharges, e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <Button
              onClick={calculateTotal}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 hover:from-purple-600 hover:via-pink-600 hover:to-rose-500 text-white shadow-md"
            >
              Calculate <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {calculations && <Receipt calculations={calculations} />}
      </div>
    </div>
  );
};

export default PriceCalculator;
