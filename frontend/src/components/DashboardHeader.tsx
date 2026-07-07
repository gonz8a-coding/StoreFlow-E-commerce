import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTH_STORAGE_KEYS = ['storeflow_token', 'storeflow_user_name', 'storeflow_user_email', 'storeflow_store_name'] as const;

function getStoredMerchantName(): string {
  return localStorage.getItem('storeflow_user_name') || 'Merchant';
}

function getStoredMerchantEmail(): string {
  return localStorage.getItem('storeflow_user_email') || '';
}

function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export default function DashboardHeader() {
  const navigate = useNavigate();
  const merchantName = useMemo(() => getStoredMerchantName(), []);
  const merchantEmail = useMemo(() => getStoredMerchantEmail(), []);

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/login', {
      replace: true,
      state: {
        authError: 'You have been logged out successfully.',
      },
    });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-surface2 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Merchant dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back, {merchantName}</h1>
          {merchantEmail ? <p className="mt-2 text-sm text-slate-400">Signed in as {merchantEmail}</p> : null}
          <p className="mt-2 text-sm text-slate-400">Manage your store, view revenue, and keep inventory decisions in one place.</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
