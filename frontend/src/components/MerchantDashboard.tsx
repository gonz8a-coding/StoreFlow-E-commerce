import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import DashboardHeader from './DashboardHeader';
import { OrderRow, LowStockAlert } from '../types/dashboard';

interface StoreMetrics {
  totalRevenue: number;
  activeInventoryCount: number;
  lowStockWarnings: Array<{ id: string; name: string; stock: number }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getStatusStyles(status: OrderRow['status']) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20';
    case 'SHIPPED':
      return 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20';
    default:
      return 'bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/20';
  }
}

function getUpdateToneStyles(tone: 'info' | 'success' | 'warning') {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';
    case 'warning':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
    default:
      return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100';
  }
}

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      try {
        const response = await api.get('/admin/metrics');
        if (!mounted) return;

        setMetrics(response.data.metrics);
      } catch (err: unknown) {
        console.error('Failed to load metrics:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load merchant metrics.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const response = await api.get('/admin/orders');
        if (!mounted) return;

        setRecentOrders(response.data.orders ?? []);
      } catch (err: unknown) {
        console.error('Failed to load orders:', err);
        if (err instanceof Error) {
          setOrdersError(err.message);
        } else {
          setOrdersError('Unable to load recent orders.');
        }
      } finally {
        if (mounted) {
          setOrdersLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const lowStockCount = metrics?.lowStockWarnings.length ?? 0;
  const hasCriticalBanner = Boolean(metrics && (metrics.activeInventoryCount === 0 || lowStockCount > 0));

  const recentUpdates = useMemo(() => {
    const updates: Array<{ title: string; detail: string; meta?: string; tone: 'info' | 'success' | 'warning' }> = [];

    if (recentOrders.length > 0) {
      recentOrders.slice(0, 3).forEach((order, index) => {
        updates.push({
          title: `${order.customerName} placed order #${index + 1}`,
          detail: `${formatCurrency(order.totalAmount)} • ${order.status}`,
          meta: order.createdAt,
          tone: order.status === 'PAID' ? 'success' : 'info',
        });
      });
    }

    if (lowStockCount > 0) {
      updates.unshift({
        title: `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} need restocking`,
        detail: 'Inventory signals suggest your storefront may run out of stock soon.',
        meta: 'Alert',
        tone: 'warning',
      });
    }

    if (updates.length === 0) {
      updates.push({
        title: 'No recent activity yet',
        detail: 'Orders and stock changes will appear here as customers shop your catalog.',
        tone: 'info',
      });
    }

    return updates;
  }, [recentOrders, lowStockCount]);

  const revenueSummary = useMemo(
    () => [
      { label: 'Revenue', value: metrics ? formatCurrency(metrics.totalRevenue) : 'Loading...' },
      { label: 'Inventory', value: metrics ? metrics.activeInventoryCount.toString() : 'Loading...' },
      { label: 'Low stock', value: metrics ? `${lowStockCount} alerts` : 'Loading...' },
    ],
    [metrics, lowStockCount]
  );

  const lowStockAlerts: LowStockAlert[] = metrics
    ? metrics.lowStockWarnings.map((item) => ({ productName: item.name, stock: item.stock }))
    : [
      { productName: 'Loading product data…', stock: 0 },
      { productName: 'Loading product data…', stock: 0 },
    ];

  const handleRestockNow = () => {
    navigate('/products?filter=low_stock');
  };

  return (
    <section className="space-y-8">
      <DashboardHeader />

      {hasCriticalBanner ? (
        <div className="rounded-3xl border border-amber-500/15 bg-amber-500/10 p-5 text-sm text-amber-100 shadow-inner shadow-amber-500/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold uppercase tracking-[0.35em] text-amber-100">Operational alert</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">
                {metrics?.activeInventoryCount === 0
                  ? 'No active products available. Add inventory to keep your storefront live.'
                  : `${lowStockCount} low-stock ${lowStockCount === 1 ? 'item is' : 'items are'} currently flagged. Review inventory before the next sale.`}
              </p>
            </div>
            {lowStockCount > 0 ? (
              <button
                type="button"
                onClick={handleRestockNow}
                className="inline-flex items-center justify-center rounded-3xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                View low stock
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-surface2 p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Sales performance</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Revenue snapshot</h2>
            </div>
            <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">Live metrics</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {revenueSummary.map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-surface p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-surface p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Inventory Health</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Stock status overview</h3>
              </div>
              <span className="rounded-full bg-slate-800/80 px-3 py-1 text-sm text-slate-300">
                {loading ? 'Loading…' : `${metrics?.activeInventoryCount ?? 0} active items`}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-surface2 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Current inventory</p>
                <p className="mt-3 text-3xl font-semibold text-white">{loading ? 'Loading…' : metrics?.activeInventoryCount ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-surface2 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Low stock alerts</p>
                <p className="mt-3 text-3xl font-semibold text-white">{loading ? 'Loading…' : lowStockCount}</p>
              </div>
            </div>

            {lowStockCount > 0 ? (
              <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-50 shadow-lg shadow-amber-500/10 animate-pulse">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-100">Action Required</p>
                    <p className="mt-2 text-lg font-semibold">Action Required: {lowStockCount} items running low on stock!</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestockNow}
                    className="inline-flex items-center justify-center rounded-3xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Restock now
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-5 text-emerald-100 shadow-sm shadow-emerald-500/10">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-100">Healthy inventory</p>
                <p className="mt-2 text-sm text-slate-200">Inventory is within safe levels. No immediate action required.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-surface2 p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Inventory alert</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Low stock products</h2>
              </div>
              <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm text-amber-200">Action required</span>
            </div>

            <div className="mt-6 space-y-4">
              {lowStockAlerts.map((alert) => (
                <div key={`${alert.productName}-${alert.stock}`} className="flex items-center justify-between rounded-3xl border border-white/10 bg-surface p-4">
                  <div>
                    <p className="text-sm text-slate-400">{alert.productName}</p>
                    <p className="mt-1 text-lg font-semibold text-white">Only {alert.stock} left</p>
                  </div>
                  <span className="rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-300">Low stock</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-surface2 p-6 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Live activity</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Recent updates</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                {ordersLoading ? 'Syncing…' : `${recentOrders.length} events`}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Recent customer orders and inventory signals from your storefront.</p>

            <div className="mt-6 space-y-4">
              {recentUpdates.map((update) => (
                <div key={update.title} className={`rounded-3xl border p-4 ${getUpdateToneStyles(update.tone)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{update.title}</p>
                      <p className="mt-1 text-sm text-slate-200">{update.detail}</p>
                    </div>
                    {update.meta ? (
                      <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-100">
                        {update.meta}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-surface2 p-6 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent orders</h2>
            <p className="mt-1 text-sm text-slate-400">Review the highest-priority order fulfillment pipeline.</p>
          </div>
          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Export report
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full table-auto text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordersLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Loading recent orders…
                  </td>
                </tr>
              ) : ordersError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-rose-200">
                    {ordersError}
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No recent orders yet. Your dashboard will update once purchases are made.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, index) => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-4 py-4 font-medium text-white">#{index + 1}</td>
                    <td className="px-4 py-4">{order.customerName}</td>
                    <td className="px-4 py-4">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400">{order.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

