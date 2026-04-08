import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import EditionDetailPage from "./pages/EditionDetailPage";
import PersonalizationPage from "./pages/PersonalizationPage";
import PreviewPage from "./pages/PreviewPage";
import ShippingPage from "./pages/ShippingPage";
import OrderCompletePage from "./pages/OrderCompletePage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import StudioPage from "./pages/StudioPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="editions/:editionId" element={<EditionDetailPage />} />
          <Route path="projects/:projectId/personalize" element={<PersonalizationPage />} />
          <Route path="projects/:projectId/preview" element={<PreviewPage />} />
          <Route path="projects/:projectId/shipping" element={<ShippingPage />} />
          <Route path="projects/:projectId/complete" element={<OrderCompletePage />} />
          <Route path="oauth/google/callback" element={<OAuthCallbackPage />} />
          <Route path="studio" element={<StudioPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
