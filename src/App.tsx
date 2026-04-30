import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SystemStatus from "./pages/SystemStatus.tsx";

const App = () => (
  <>
    <Toaster position="top-center" richColors closeButton />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/status" element={<SystemStatus />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
