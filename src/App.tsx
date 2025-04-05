import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CustomersPage from "./pages/CustomersPage";
import ShortlistedPage from "./pages/ShortlistedPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/customers" element={<CustomersPage />} />
    <Route path="/shortlisted" element={<ShortlistedPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
