import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface RegisterFormState {
  ownerName: string;
  email: string;
  password: string;
  storeName: string;
}

const initialState: RegisterFormState = {
  ownerName: '',
  email: '',
  password: '',
  storeName: '',
};

export default function RegisterStore() {
  const [form, setForm] = useState<RegisterFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        storeName: form.storeName,
      });

      const token = response.data?.token;
      if (!token) {
        throw new Error('Unable to retrieve authentication token from server.');
      }

      localStorage.setItem('storeflow_token', token);
      localStorage.setItem('storeflow_user_name', response.data?.user?.name ?? 'Merchant');
      localStorage.setItem('storeflow_user_email', response.data?.user?.email ?? '');
      localStorage.setItem('storeflow_store_name', response.data?.store?.storeName ?? '');
      setSuccess('Store registration completed successfully. Redirecting to dashboard…');

      window.location.assign('/dashboard');
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const errorMessage =
        err && typeof err === 'object' && 'response' in err && typeof (err as any).response?.data?.message === 'string'
          ? (err as any).response.data.message
          : err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-surface2/95 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">StoreFlow Onboarding</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Create your store in seconds</h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-400">
            Launch your multi-tenant storefront with secure authentication, tenant isolation, and a polished merchant dashboard.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block rounded-3xl border border-white/10 bg-surface p-4">
              <span className="text-sm text-slate-300">Owner name</span>
              <input
                name="ownerName"
                value={form.ownerName}
                onChange={handleChange}
                required
                className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Jordan Smith"
              />
            </label>
            <label className="block rounded-3xl border border-white/10 bg-surface p-4">
              <span className="text-sm text-slate-300">Store name</span>
              <input
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                required
                className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Starline Boutique"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block rounded-3xl border border-white/10 bg-surface p-4">
              <span className="text-sm text-slate-300">Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="owner@storeflow.com"
              />
            </label>
            <label className="block rounded-3xl border border-white/10 bg-surface p-4">
              <span className="text-sm text-slate-300">Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </label>
          </div>

          {error && <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>}
          {success && <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-accent px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-accent2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating your store…' : 'Create Store'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/10 bg-surface p-5 text-slate-400">
          <p className="text-sm leading-6">
            After registering, you will be redirected to your merchant dashboard and your JWT token will be stored securely in local storage for authenticated API access.
          </p>
        </div>
      </div>
    </div>
  );
}
