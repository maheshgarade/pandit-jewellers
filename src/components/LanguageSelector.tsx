import React, { useState } from "react";
import { Check, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Language, useLanguage } from "../context/LanguageContext";

/** Each language shown in its own script, with the other language's name underneath. */
const LANGUAGES: { code: Language; name: string; sub: string; badge: string }[] = [
  { code: "en", name: "English", sub: "इंग्रजी", badge: "A" },
  { code: "mr", name: "मराठी", sub: "Marathi", badge: "म" },
];

/** Globe button in the header: opens a centred modal to pick the app language. */
const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const pick = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label="Language / भाषा" className="flex h-11 w-11 items-center justify-center text-white transition-colors hover:text-amber-200">
        <Globe className="h-5 w-5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-0 rounded-2xl border-purple-100 bg-white p-0 shadow-2xl">
        <div className="flex flex-col items-center gap-2 rounded-t-2xl bg-gradient-to-r from-purple-800 to-purple-900 px-6 pb-5 pt-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-amber-300">
            <Globe className="h-6 w-6" aria-hidden="true" />
          </span>
          <DialogTitle className="text-lg font-bold text-white">Language / भाषा</DialogTitle>
          <DialogDescription className="text-sm text-purple-100">Choose the app language · ॲपची भाषा निवडा</DialogDescription>
        </div>
        <div role="radiogroup" aria-label="Language / भाषा" className="flex flex-col gap-3 p-4">
          {LANGUAGES.map((l) => {
            const on = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={on}
                lang={l.code}
                onClick={() => pick(l.code)}
                className={`flex min-h-16 w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  on ? "border-purple-700 bg-purple-50" : "border-gray-200 bg-white active:bg-purple-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${on ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-800"}`}
                >
                  {l.badge}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[17px] font-semibold text-gray-900">{l.name}</span>
                  <span className="text-[13px] text-gray-500">{l.sub}</span>
                </span>
                {on ? <Check className="h-6 w-6 shrink-0 text-purple-700" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguageSelector;
