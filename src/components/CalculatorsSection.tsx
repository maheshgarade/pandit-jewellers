import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GoldCalculator from "./GoldCalculator";
import SilverCalculator from "./SilverCalculator";
import MortgageCalculator from "./MortgageCalculator";

const CalculatorsSection: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-1">
      <Tabs defaultValue="gold" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-100 to-pink-100">
          <TabsTrigger
            value="gold"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            Gold
          </TabsTrigger>
          <TabsTrigger
            value="silver"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            Silver
          </TabsTrigger>
          <TabsTrigger
            value="mortgage"
            className="data-[state=active]:bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 data-[state=active]:text-white"
          >
            Mortgage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gold">
          <GoldCalculator />
        </TabsContent>
        <TabsContent value="silver">
          <SilverCalculator />
        </TabsContent>
        <TabsContent value="mortgage">
          <MortgageCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalculatorsSection;
