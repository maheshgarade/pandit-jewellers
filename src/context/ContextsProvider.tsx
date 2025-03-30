import { createContext, ReactNode } from "react";

// Define the shape of your context
interface AppContextType {
  user: string | null;
  theme: string;
}

// Initialize the context with null as the default value
const AppContext = createContext<AppContextType | null>(null);

const ContextsProvider = ({ children }: { children: ReactNode }) => {
  const contextValue: AppContextType = { user: null, theme: "light" };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default ContextsProvider;
export { AppContext };
