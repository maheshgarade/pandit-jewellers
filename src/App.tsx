import { Navigate, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CustomersPage from "./pages/CustomersPage";
import EstimatePage from "./pages/EstimatePage";
import SettingsPage from "./pages/SettingsPage";
import PrinterPage from "./pages/PrinterPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/customers" element={<CustomersPage />} />
    <Route path="/estimate" element={<EstimatePage />} />
    {/* Shortlisted became Estimate. */}
    <Route path="/shortlisted" element={<Navigate to="/estimate" replace />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/settings/printer" element={<PrinterPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
