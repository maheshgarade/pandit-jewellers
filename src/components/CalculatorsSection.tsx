import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import ExchangeCalculator from "./ExchangeCalculator"; // Exchange tab hidden for now
import { MetalCalculator } from "./calc/MetalCalculator";
import { useLanguage } from "../context/LanguageContext";

const tabCls =
  "h-9 data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white";

/** Gold / Silver tabs. On the Estimate tab ("estimate") the calculators add items straight to the estimate. */
const CalculatorsSection: React.FC<{ target?: "calculator" | "estimate" }> = ({ target = "calculator" }) => {
  const { t } = useLanguage();
  return (
    <div className={`flex flex-col gap-3 ${target === "calculator" ? "container mx-auto max-w-md px-4 py-2" : ""}`}>
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
          <MetalCalculator metal="gold" target={target} />
        </TabsContent>
        <TabsContent value="silver" className="mt-3">
          <MetalCalculator metal="silver" target={target} />
        </TabsContent>
        {/* <TabsContent value="mortgage">
          <ExchangeCalculator />
        </TabsContent> */}
      </Tabs>
    </div>
  );
};

export default CalculatorsSection;
