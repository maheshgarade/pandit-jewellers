import React from "react";
import { Card } from "@/components/ui/card";

const ExchangeCalculator: React.FC = () => {
  return (
    <Card className="p-5 shadow-lg border-purple-200 bg-gradient-to-br from-white to-purple-50 relative overflow-hidden mt-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 opacity-60 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            Exchange Calculator
            <br /> (Coming Soon)
          </h1>
        </div>
        <p className="text-center text-gray-600">
          Our Exchange calculator is currently under development. Please check
          back soon for this feature!
        </p>
      </div>
    </Card>
  );
};

export default ExchangeCalculator;
