import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import ExchangeCalculator from "./ExchangeCalculator"; // Exchange tab hidden for now
import { MetalCalculator } from "./calc/MetalCalculator";
import { EstimatePanel } from "./calc/EstimatePanel";
import { useLanguage } from "../context/LanguageContext";

const tabCls =
  "h-9 data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white";

const CalculatorsSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto max-w-md px-4 py-2">
      <Tabs defaultValue="gold" className="w-full">
        {/* Exchange tab hidden for now: restore with grid-cols-3 and the trigger/content below. */}
        <TabsList className="grid h-11 w-full grid-cols-2 bg-gradient-to-r from-purple-100 to-pink-100">
          <TabsTrigger value="gold" className={tabCls}>
            {t("calculators.gold")}
          </TabsTrigger>
          <TabsTrigger value="silver" className={tabCls}>
            {t("calculators.silver")}
          </TabsTrigger>
          {/* <TabsTrigger value="mortgage" className={tabCls}>
            {t("calculators.mortgage")}
          </TabsTrigger> */}
        </TabsList>
        <TabsContent value="gold" className="mt-3">
          <MetalCalculator metal="gold" />
        </TabsContent>
        <TabsContent value="silver" className="mt-3">
          <MetalCalculator metal="silver" />
        </TabsContent>
        {/* <TabsContent value="mortgage">
          <ExchangeCalculator />
        </TabsContent> */}
      </Tabs>
      {/* One estimate for both tabs: Gold and Silver items, and old gold / silver to deduct. */}
      <EstimatePanel />
    </div>
  );
};

export default CalculatorsSection;
