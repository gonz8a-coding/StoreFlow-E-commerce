import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { ProductItem } from '../types/product';

const initialFormState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  images: '',
};

const STOCK_FILTER_OPTIONS = [
  { label: 'All products', value: 'all' as const },
  { label: 'In stock', value: 'in_stock' as const },
  { label: 'Low stock', value: 'low_stock' as const },
  { label: 'Out of stock', value: 'out_of_stock' as const },
] as const;

type StockFilterValue = (typeof STOCK_FILTER_OPTIONS)[number]['value'];

type ToastState = {
  visible: boolean;
  message: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function ManageProducts() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterValue>('all');
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [formState, setFormState] = useState(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTitle = selectedProduct ? 'Edit product' : 'Add product';

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/products');
        setProducts(response.data.products ?? []);
      } catch (error) {
        console.error('Failed to load products:', error);
        setError('Unable to fetch products. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'low_stock' || filter === 'in_stock' || filter === 'out_of_stock' || filter === 'all') {
      setStockFilter(filter as StockFilterValue);
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (stockFilter === 'in_stock') {
        return product.stock > 5;
      }

      if (stockFilter === 'low_stock') {
        return product.stock > 0 && product.stock <= 5;
      }

      if (stockFilter === 'out_of_stock') {
        return product.stock === 0;
      }

      return true;
    });
  }, [products, searchQuery, stockFilter]);

  const notify = (message: string) => {
    setToast({ visible: true, message });
    window.setTimeout(() => setToast({ visible: false, message: '' }), 3200);
  };

  const handleOpenPanel = (product: ProductItem | null = null) => {
    setSelectedProduct(product);
    setFormError(null);
    setFormState({
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: product ? (product.price / 100).toFixed(2) : '',
      stock: product ? String(product.stock) : '',
      images: product?.images?.join('\n') ?? '',
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedProduct(null);
    setFormState(initialFormState);
    setFormError(null);
  };

  const handleChange = (field: keyof typeof initialFormState, value: string) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const priceValue = Number(formState.price);
    const stockValue = Number(formState.stock);

    if (!formState.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (Number.isNaN(priceValue) || priceValue < 0) {
      setFormError('Price must be a valid non-negative number.');
      return;
    }

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setFormError('Stock must be a non-negative whole number.');
      return;
    }

    const imageUrls = formState.images
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      price: Math.round(priceValue * 100),
      stock: stockValue,
      images: imageUrls.length ? imageUrls : undefined,
    };

    setIsSaving(true);

    try {
      if (selectedProduct) {
        const response = await api.put(`/products/${selectedProduct.id}`, payload);
        const updated = response.data.product as ProductItem;
        setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        notify('Product updated successfully!');
      } else {
        const response = await api.post('/products', payload);
        setProducts((current) => [response.data.product, ...current]);
        notify('Product created successfully!');
      }
      closePanel();
    } catch (error) {
      console.error('Save product failed:', error);
      setFormError('Unable to save product. Please verify the fields and retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Delete this product? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.delete(`/products/${productId}`);
      setProducts((current) => current.filter((item) => item.id !== productId));
      notify('Product deleted successfully!');
    } catch (error) {
      console.error('Delete product failed:', error);
      setError('Sorry, the product could not be deleted.');
    }
  };

  const getStockLabel = (stock: number) => {
    if (stock === 0) return 'Out of stock';
    if (stock <= 5) return 'Low stock';
    return 'In stock';
  };

  const stockLabelStyle = (stock: number) =>
    stock === 0
      ? 'bg-red-500/10 text-red-200 ring-red-500/20'
      : stock <= 5
      ? 'bg-amber-500/10 text-amber-200 ring-amber-500/20'
      : 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/20';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-lg shadow-cyan-500/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Products</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Manage your catalog</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Create, edit, and delete products for your store. Changes are scoped to the authenticated merchant.
          </p>
        </div>

        <button
          onClick={() => handleOpenPanel(null)}
          className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:bg-cyan-400"
        >
          Add new product
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 shadow-lg shadow-cyan-500/5">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-900/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-[minmax(220px,_1fr)_200px]">
            <label className="block text-sm text-slate-300">
              <span className="sr-only">Search products</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or description"
                className="w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="sr-only">Stock status filter</span>
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as StockFilterValue)}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
              >
                {STOCK_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 shadow-sm shadow-slate-950/20">
            <p className="font-semibold text-white">{filteredProducts.length}</p>
            <p className="text-slate-500">filtered products</p>
          </div>
        </div>

        <div className="grid gap-4 border-b border-white/10 p-6 text-slate-400 sm:grid-cols-[1.5fr_0.9fr_0.7fr_0.5fr]">
          <span className="text-xs uppercase tracking-[0.3em]">Product</span>
          <span className="text-xs uppercase tracking-[0.3em]">Price</span>
          <span className="text-xs uppercase tracking-[0.3em]">Stock</span>
          <span className="text-xs uppercase tracking-[0.3em]">Actions</span>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-300">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-sm text-slate-400">
            No products match your conditions. Adjust your search or stock filter.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredProducts.map((product) => (
              <li
                key={product.id}
                className="grid gap-4 px-6 py-5 text-sm transition duration-200 hover:bg-slate-900/80 sm:grid-cols-[1.5fr_0.9fr_0.7fr_0.5fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{product.name}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${stockLabelStyle(product.stock)}`}
                    >
                      {getStockLabel(product.stock)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-slate-400">{product.description || 'No description provided.'}</p>
                </div>
                <div className="text-slate-200">{formatMoney(product.price)}</div>
                <div className="text-slate-200">{product.stock}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPanel(product)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-100 transition duration-200 hover:border-cyan-400/30 hover:bg-cyan-500/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-200 transition duration-200 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast.visible ? (
        <div className="fixed right-6 top-6 z-50 w-full max-w-xs animate-fadeIn rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold text-cyan-300">Success</p>
          <p className="mt-2 text-sm text-slate-200">{toast.message}</p>
        </div>
      ) : null}

      {isPanelOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/70 p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Product form</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{selectedTitle}</h3>
              </div>
              <button
                onClick={closePanel}
                className="rounded-full bg-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  <span className="text-slate-400">Name</span>
                  <input
                    value={formState.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/70"
                    placeholder="Product name"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-200">
                  <span className="text-slate-400">Price (USD)</span>
                  <input
                    value={formState.price}
                    onChange={(event) => handleChange('price', event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/70"
                    placeholder="e.g. 24.99"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block text-sm text-slate-200">
                  <span className="text-slate-400">Stock</span>
                  <input
                    value={formState.stock}
                    onChange={(event) => handleChange('stock', event.target.value)}
                    type="number"
                    min="0"
                    step="1"
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/70"
                    placeholder="Quantity available"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-200 sm:col-span-2">
                  <span className="text-slate-400">Description</span>
                  <textarea
                    value={formState.description}
                    onChange={(event) => handleChange('description', event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/70"
                    placeholder="Optional product description"
                  />
                </label>

                <label className="block text-sm text-slate-200 sm:col-span-2">
                  <span className="text-slate-400">Image URLs</span>
                  <textarea
                    value={formState.images}
                    onChange={(event) => handleChange('images', event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/70"
                    placeholder="Enter one image URL per line or comma-separated"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Use valid image URLs. The first URL will be shown to customers in the storefront.
                  </p>
                </label>
              </div>

              {formError ? <div className="rounded-3xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : selectedProduct ? 'Update product' : 'Create product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ManageProducts;
