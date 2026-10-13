import { BrowserRouter, Route, Routes } from "react-router-dom";
import AIProviders from "./pages/AIProviders";
import Dashboard from "./pages/Dashboard";
import Financas from "./pages/Financas";
import Goals from "./pages/Goals";
import IAPage from "./pages/IAPage";
import ListDetail from "./pages/ListDetail";
import Lists from "./pages/Lists";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Stock from "./pages/Stock";
import TitheSettings from "./pages/TitheSettings";
// import Simulador from "./pages/Simulador";
import Runs from "./pages/Runs";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/financas" element={<Financas />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stock" element={<Stock />} />
        {/* <Route path="/investiments" element={<Simulador />} /> */}
        <Route path="/runs" element={<Runs />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/ia" element={<IAPage />} />
        <Route path="/ai-providers" element={<AIProviders />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/lists/:id" element={<ListDetail />} />
        <Route path="/tithe" element={<TitheSettings />} />

        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
