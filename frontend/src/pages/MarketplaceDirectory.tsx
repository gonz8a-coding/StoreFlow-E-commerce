import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface StoreSummary {
  id: string;
  store_name: string;
  store_slug: string;
  created_at: string;
}

function MarketplaceDirectory() {
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadStores() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ stores: StoreSummary[] }>('/public/stores');
        if (mounted) {
          setStores(response.data.stores);
        }
      } catch (err) {
        if (mounted) {
          setError('Unable to load the marketplace directory. Please try again later.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStores();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredStores = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return stores;
    }
    return stores.filter((store) => {
      return (
        store.store_name.toLowerCase().includes(normalized) ||
        store.store_slug.toLowerCase().includes(normalized)
      );
    });
  }, [searchTerm, stores]);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-10 rounded-[32px] border border-white/10 bg-slate-950/40 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/75">StoreFlow Marketplace</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Discover curated storefronts in one premium hub.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Browse merchant shops, filter instantly, and jump directly into each storefront experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Merchant Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 animate-pulse"
              >
                Create Your Store
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-12 rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/95 to-slate-900/80 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-300">
                Global store search
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Search every storefront by name or slug.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Type to filter merchants instantly, then click through to explore a curated catalog.
              </p>
            </div>

            <div className="relative rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-xl shadow-black/20">
              <label htmlFor="store-search" className="sr-only">
                Search stores
              </label>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-inner shadow-black/20">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="store-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search stores by name or slug..."
                  className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Instant client-side filtering for a fast discovery experience.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[32px] bg-slate-900/70 p-6 shadow-lg shadow-black/20"
                />
              ))
            : filteredStores.map((store) => (
                <article
                  key={store.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/95 to-slate-900/85 p-6 shadow-2xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-300/15">
                        <span className="text-2xl font-semibold uppercase tracking-[0.18em]">
                          {store.store_name.charAt(0)}
                        </span>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                        Featured
                      </span>
                    </div>

                    <h3 className="mt-6 text-2xl font-semibold text-white">{store.store_name}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                      Curated products from a premium merchant ready for shoppers who want confidence and speed.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Store slug</p>
                      <p className="mt-1 text-sm text-slate-300">{store.store_slug}</p>
                    </div>
                    <Link
                      to={`/store/${store.store_slug}`}
                      className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Explore Catalog
                    </Link>
                  </div>
                </article>
              ))}
        </section>

        {!loading && filteredStores.length === 0 ? (
          <section className="mt-16 rounded-[32px] border border-dashed border-white/10 bg-slate-950/80 p-12 text-center text-slate-300 shadow-2xl shadow-black/20">
            <h2 className="text-3xl font-semibold text-white">No stores found</h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm leading-7 text-slate-400">
              We couldn’t find any stores matching your search. Try a broader search term or visit the merchant registration page to add a new storefront.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Create a store
              </Link>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/30"
              >
                Reset search term
              </button>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-[32px] border border-rose-500/20 bg-rose-500/10 p-8 text-center text-rose-100 shadow-lg shadow-rose-500/10">
            <p className="text-sm">{error}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default MarketplaceDirectory;
