import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import LandingPage from "./pages/LandingPage";
import EditionDetailPage from "./pages/EditionDetailPage";
import ChatPersonalizationPage from "./pages/ChatPersonalizationPage";
import PreviewPage from "./pages/PreviewPage";
import ShippingPage from "./pages/ShippingPage";
import OrderCompletePage from "./pages/OrderCompletePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailPage from "./pages/PaymentFailPage";
import StudioPage from "./pages/StudioPage";
import StudioOrdersPage from "./pages/StudioOrdersPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSettlementsPage from "./pages/AdminSettlementsPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminWebhooksPage from "./pages/AdminWebhooksPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import MyProjectsPage from "./pages/MyProjectsPage";
import { getRouterBasename } from "./lib/appPaths";

export default function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
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
              element={<ChatPersonalizationPage />}
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
          <Route element={<RequireRole role="CREATOR" />}>
            <Route path="studio" element={<Navigate to="/studio/orders" replace />} />
            <Route path="studio/orders" element={<StudioOrdersPage />} />
            <Route path="studio/editions/new" element={<StudioPage />} />
            <Route path="studio/editions/:editionId/edit" element={<StudioPage />} />
          </Route>
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="admin/settlements" element={<AdminSettlementsPage />} />
            <Route path="admin/orders" element={<AdminOrdersPage />} />
            <Route path="admin/webhooks" element={<AdminWebhooksPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
