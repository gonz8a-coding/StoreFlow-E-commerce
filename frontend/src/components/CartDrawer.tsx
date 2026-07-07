import { useState } from 'react';
import { api } from '../services/api';
import { ProductItem } from '../types/product';

type CartItem = {
  product: ProductItem;
  quantity: number;
};

interface CartDrawerProps {
  open: boolean;
  storeSlug: string;
  items: CartItem[];
  subtotal: number;
  customerEmail: string;
  isEmailValid: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCustomerEmailChange: (email: string) => void;
  onCheckoutSuccess: () => void;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function CartDrawer({
  open,
  storeSlug,
  items,
  subtotal,
  customerEmail,
  isEmailValid,
  onClose,
  onUpdateQuantity,
  onCustomerEmailChange,
  onCheckoutSuccess,
}: CartDrawerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) {
      setLocalError('Add at least one product to your cart before checkout.');
      return;
    }

    if (!isEmailValid) {
      setLocalError('Please enter a valid email address before checking out.');
      return;
    }

    if (!storeSlug) {
      setLocalError('Missing store information.');
      return;
    }

    setIsProcessing(true);
    setLocalError(null);

    try {
      const response = await api.post<{ checkoutUrl: string }>('/checkout/session', {
        storeSlug,
        customerEmail: customerEmail.trim(),
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });

      if (!response.data.checkoutUrl) {
        throw new Error('Did not receive a valid checkout URL from the server.');
      }

      onCheckoutSuccess();
      window.location.href = response.data.checkoutUrl;
    } catch (err: unknown) {
      const axiosError = err as any;
      if (axiosError?.isAxiosError) {
        setLocalError(
          (axiosError.response?.data as { message?: string })?.message ?? axiosError.message ?? 'Unable to start checkout.'
        );
      } else if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Unable to start checkout.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 transition duration-300 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-slate-950 shadow-2xl transition duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Shopping cart</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Your order</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/80 p-8 text-center text-slate-400">
                Your cart is empty. Add a product to begin checkout.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="rounded-3xl border border-white/10 bg-slate-900/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{item.product.name}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400 line-clamp-2">
                          {item.product.description || 'No description available.'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white">{formatCurrency(item.product.price)}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-300">
                      <div className="flex items-center rounded-full bg-slate-900 px-2 py-1 ring-1 ring-white/10">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.product.name}`}
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="rounded-full px-3 py-2 text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:text-slate-500"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="mx-3 min-w-[2rem] text-center font-semibold text-white">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.product.name}`}
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="rounded-full px-3 py-2 text-slate-300 transition hover:bg-white/5"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-semibold text-slate-200">{formatCurrency(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-6 py-5">
            <div className="space-y-3">
              <label htmlFor="checkout-email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="checkout-email"
                type="email"
                value={customerEmail}
                onChange={(event) => onCustomerEmailChange(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                required
              />
              {!isEmailValid && customerEmail.length > 0 ? (
                <p className="text-sm text-rose-300">Enter a valid email address to proceed.</p>
              ) : (
                <p className="text-sm text-slate-500">We’ll send your order confirmation to this email.</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span className="text-xl font-semibold text-white">{formatCurrency(subtotal)}</span>
            </div>

            {localError ? (
              <div className="mt-4 rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {localError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={items.length === 0 || isProcessing || !isEmailValid}
              className="mt-5 w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Redirecting…' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export type { CartItem };
