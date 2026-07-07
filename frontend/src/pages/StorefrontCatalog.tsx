import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { api } from '../services/api';
import CartDrawer, { type CartItem } from '../components/CartDrawer';
import { ProductItem } from '../types/product';

interface StorefrontResponse {
  store: {
    id: string;
    name: string;
    slug: string;
  };
  products: ProductItem[];
}

type StockStatus = 'In stock' | 'Low stock' | 'Out of stock';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return 'Out of stock';
  if (stock <= 5) return 'Low stock';
  return 'In stock';
}

function StorefrontCatalog() {
  const { slug } = useParams<{ slug: string }>();
  const [storeName, setStoreName] = useState<string>('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let mounted = true;
    async function loadStorefront() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const response = await api.get<StorefrontResponse>(`/public/stores/${slug}/products`);
        if (!mounted) return;

        setStoreName(response.data.store.name);
        setProducts(response.data.products);
      } catch (err: unknown) {
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 404) {
          setNotFound(true);
        } else if (axiosError.isAxiosError) {
          setError(axiosError.message || 'Unable to load storefront.');
        } else {
          setError('Unable to load storefront.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStorefront();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const totalProducts = products.length;
  const inStockCount = useMemo(() => products.filter((product) => product.stock > 5).length, [products]);
  const lowStockCount = useMemo(() => products.filter((product) => product.stock > 0 && product.stock <= 5).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((product) => product.stock === 0).length, [products]);
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  );
  const cartProductIds = useMemo(() => new Set(cartItems.map((item) => item.product.id)), [cartItems]);
  const isEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()),
    [customerEmail]
  );
  const merchantOwnerName = storeName ? `${storeName} Collective` : 'Your Merchant';
  const merchantOwnerTitle = 'Founder & Curator';
  const merchantOwnerBio = 'A curated experience built for modern shoppers who want confident purchases and fast fulfillment.';

  const handleAddToCart = (product: ProductItem) => {
    setCartItems((current) => {
      const existingItem = current.find((item) => item.product.id === product.id);
      if (existingItem) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setDrawerOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCartItems((current) =>
      current
        .map((item) => (item.product.id === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050914] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="animate-pulse rounded-3xl bg-slate-900/80 p-8 shadow-2xl shadow-black/30"></div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-3xl bg-slate-900/80 p-6 shadow-lg shadow-black/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050914] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-950/80 p-10 text-center shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Store not found</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Oops, this storefront doesn&apos;t exist.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            The store slug you are looking for is invalid or the merchant has not published their storefront yet.
          </p>
          <div className="mt-8 inline-flex rounded-3xl bg-white/5 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20">
            <span>Try a different storefront URL</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050914] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-4xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Public storefront</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{storeName}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Browse the latest products, book inventory, and discover premium offers directly from the storefront.
              </p>

              <div className="mt-8 rounded-4xl border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Merchant profile</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{merchantOwnerName}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{merchantOwnerTitle}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/90 px-4 py-3 text-sm text-slate-200 ring-1 ring-white/10">
                    {merchantOwnerBio}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Products</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalProducts}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">In stock</p>
                <p className="mt-3 text-3xl font-semibold text-white">{inStockCount}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Low stock</p>
                <p className="mt-3 text-3xl font-semibold text-white">{lowStockCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-6 rounded-4xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Catalog</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Product grid</h2>
              </div>
              <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                {outOfStockCount} out of stock
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const status = getStockStatus(product.stock);
                const primaryImage = product.images?.[0]?.trim();
                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-4xl border border-white/10 bg-slate-900/90 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/20 hover:bg-slate-900"
                  >
                    {primaryImage ? (
                      <div className="overflow-hidden rounded-4xl bg-slate-950/90 transition duration-500 group-hover:scale-[1.01]">
                        <img
                          src={primaryImage}
                          alt={`${product.name} product image`}
                          className="h-48 w-full object-cover transition duration-500 hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-4xl bg-slate-900/80 p-6 text-center text-slate-500">
                        <p className="mt-16 text-sm">No product image available</p>
                      </div>
                    )}

                    <div className="mt-6 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-400 line-clamp-3">
                          {product.description || 'No description available.'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'In stock'
                            ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20'
                            : status === 'Low stock'
                              ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20'
                              : 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/20'
                          }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <p className="text-3xl font-semibold text-white">{formatCurrency(product.price)}</p>
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{product.stock} pcs</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {cartProductIds.has(product.id) ? 'Add another' : 'Add to cart'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6 rounded-4xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Checkout ready</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Create a memorable storefront experience</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Customers see your catalog instantly. Make sure stock levels are updated and premium offers are featured.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Inventory snapshot</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Items in stock</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{inStockCount}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Low stock items</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lowStockCount}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Out of stock</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{outOfStockCount}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <CartDrawer
        open={drawerOpen}
        storeSlug={slug ?? ''}
        items={cartItems}
        subtotal={cartSubtotal}
        customerEmail={customerEmail}
        isEmailValid={isEmailValid}
        onClose={() => setDrawerOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onCustomerEmailChange={setCustomerEmail}
        onCheckoutSuccess={() => {
          setCartItems([]);
          setCustomerEmail('');
          setDrawerOpen(false);
        }}
      />
    </main>
  );
}

export default StorefrontCatalog;
