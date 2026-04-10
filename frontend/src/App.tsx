import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import LandingPage from "./pages/LandingPage";
import EditionDetailPage from "./pages/EditionDetailPage";
import PersonalizationPage from "./pages/PersonalizationPage";
import PreviewPage from "./pages/PreviewPage";
import ShippingPage from "./pages/ShippingPage";
import OrderCompletePage from "./pages/OrderCompletePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailPage from "./pages/PaymentFailPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import StudioPage from "./pages/StudioPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MyProjectsPage from "./pages/MyProjectsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="editions/:editionId" element={<EditionDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route path="me/projects" element={<MyProjectsPage />} />
            <Route
              path="projects/:projectId/personalize"
              element={<PersonalizationPage />}
            />
            <Route path="projects/:projectId/preview" element={<PreviewPage />} />
            <Route path="projects/:projectId/shipping" element={<ShippingPage />} />
            <Route
              path="projects/:projectId/payment/success"
              element={<PaymentSuccessPage />}
            />
            <Route
              path="projects/:projectId/payment/fail"
              element={<PaymentFailPage />}
            />
            <Route
              path="projects/:projectId/complete"
              element={<OrderCompletePage />}
            />
          </Route>
          <Route path="oauth/google/callback" element={<OAuthCallbackPage />} />
          <Route element={<RequireRole role="CREATOR" />}>
            <Route path="studio" element={<StudioPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
