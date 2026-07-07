import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import RegisterStore from './pages/RegisterStore';
import LoginStore from './pages/LoginStore';
import CheckoutCancel from './pages/CheckoutCancel';
import CheckoutSuccess from './pages/CheckoutSuccess';
import MerchantDashboard from './components/MerchantDashboard';
import ManageProducts from './pages/ManageProducts';
import StorefrontCatalog from './pages/StorefrontCatalog';
import MarketplaceDirectory from './pages/MarketplaceDirectory';
import Sidebar from './components/Sidebar';

// Helper to keep auth storage cleanup in one place.
function clearAuthStorage() {
  localStorage.removeItem('storeflow_token');
  localStorage.removeItem('storeflow_user_name');
  localStorage.removeItem('storeflow_user_email');
  localStorage.removeItem('storeflow_store_name');
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenValid(token: string) {
  const payload = decodeJwtPayload(token) as { exp?: number } | null;
  if (!payload) {
    return false;
  }
  if (typeof payload.exp === 'number') {
    return payload.exp > Date.now() / 1000;
  }
  return true;
}

function ProtectedRoute() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('storeflow_token') : null;
  const tokenIsValid = token ? isTokenValid(token) : false;

  if (!tokenIsValid) {
    clearAuthStorage();
    return (
      <Navigate
        to="/login"
        replace
        state={{ authError: token ? 'Your session has expired. Please log in again.' : 'Please sign in to continue.' }}
      />
    );
  }

  return <Outlet />;
}

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="bg-[#08101d] p-6 sm:p-8 lg:border-l lg:border-white/5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('storeflow_token') : null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketplaceDirectory />} />
        <Route path="/login" element={<LoginStore />} />
        <Route path="/register" element={<RegisterStore />} />
        <Route path="/store/:slug" element={<StorefrontCatalog />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/checkout/cancel" element={<CheckoutCancel />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<MerchantDashboard />} />
            <Route path="/products" element={<ManageProducts />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
