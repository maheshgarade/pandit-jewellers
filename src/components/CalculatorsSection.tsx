import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GoldCalculator from "./GoldCalculator";
import SilverCalculator from "./SilverCalculator";
import ExchangeCalculator from "./ExchangeCalculator";
import { useLanguage } from "../context/LanguageContext";

const CalculatorsSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto px-4 py-2">
      <Tabs defaultValue="gold" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-100 to-pink-100">
          <TabsTrigger
            value="gold"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            {t("calculators.gold")}
          </TabsTrigger>
          <TabsTrigger
            value="silver"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            {t("calculators.silver")}
          </TabsTrigger>
          <TabsTrigger
            value="mortgage"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            {t("calculators.mortgage")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gold">
          <GoldCalculator />
        </TabsContent>
        <TabsContent value="silver">
          <SilverCalculator />
        </TabsContent>
        <TabsContent value="mortgage">
          <ExchangeCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalculatorsSection;
