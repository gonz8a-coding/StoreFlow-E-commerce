import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface LoginFormState {
  email: string;
  password: string;
}

interface LoginLocationState {
  authError?: string;
}

const initialState: LoginFormState = {
  email: '',
  password: '',
};

const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function LoginStore() {
  const [form, setForm] = useState<LoginFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;

  const isEmailInvalid = touched.email && !validateEmail(form.email);
  const isPasswordInvalid = touched.password && form.password.trim().length === 0;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) {
      setError(null);
    }
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);
    setLoading(true);

    if (isEmailInvalid || isPasswordInvalid) {
      setError('Please fix the highlighted fields before signing in.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });

      const token = response.data?.token;
      if (!token) {
        throw new Error('Authentication token was not returned by the server.');
      }

      localStorage.setItem('storeflow_token', token);
      localStorage.setItem('storeflow_user_name', response.data?.user?.name ?? 'Merchant');
      localStorage.setItem('storeflow_user_email', response.data?.user?.email ?? '');
      localStorage.setItem('storeflow_store_name', response.data?.store?.storeName ?? '');

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('Login failed:', err);
      const message =
        err && typeof err === 'object' && 'response' in err && typeof (err as any).response?.data?.message === 'string'
          ? (err as any).response.data.message
          : err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950/95 to-slate-900/90 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-10 grid gap-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800/70 ring-1 ring-cyan-400/20">
            <span className="text-3xl font-black text-cyan-300">SF</span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/70">Merchant sign in</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Welcome back to StoreFlow</h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-400">
              Securely log in to access your dashboard, manage inventory, and track store performance.
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
        </div>

        {state?.authError ? (
          <div className="mb-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            {state.authError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block rounded-3xl border bg-slate-950/80 p-4 transition focus-within:border-cyan-400/80">
            <span className="text-sm font-medium text-slate-400">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="you@storeflow.com"
              className={`mt-3 w-full rounded-3xl border px-4 py-4 text-sm text-white outline-none bg-slate-900/90 transition ${
                isEmailInvalid
                  ? 'border-rose-500 text-rose-100 placeholder:text-rose-300 focus:border-rose-400'
                  : 'border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
              }`}
            />
            {isEmailInvalid && <p className="mt-2 text-sm text-rose-300">Enter a valid email address.</p>}
          </label>

          <label className="block rounded-3xl border bg-slate-950/80 p-4 transition focus-within:border-cyan-400/80">
            <span className="text-sm font-medium text-slate-400">Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="••••••••"
              className={`mt-3 w-full rounded-3xl border px-4 py-4 text-sm text-white outline-none bg-slate-900/90 transition ${
                isPasswordInvalid
                  ? 'border-rose-500 text-rose-100 placeholder:text-rose-300 focus:border-rose-400'
                  : 'border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
              }`}
            />
            {isPasswordInvalid && <p className="mt-2 text-sm text-rose-300">Password is required.</p>}
          </label>

          {error ? (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-center shadow-inner shadow-black/20">
          <p className="text-sm text-slate-400">Don't have an account? Click here and start creating your store.</p>
          <Link
            to="/register"
            className="mt-5 inline-flex rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Start creating your store
          </Link>
        </div>
      </div>
    </div>
  );
}
