import { Link } from 'react-router-dom';

export default function CheckoutSuccess() {
  return (
    <main className="min-h-screen bg-[#050914] px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[40px] border border-white/10 bg-slate-950/80 p-10 text-center shadow-2xl shadow-black/30">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-4xl text-emerald-300 ring-1 ring-emerald-500/20">
          ✓
        </div>
        <h1 className="text-4xl font-semibold text-white">Thank you for your purchase!</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
          Your order is being processed and a confirmation email has been sent to the address you provided.
          We appreciate your business and hope you love your new products.
        </p>
        <Link
          to="/"
          className="mt-10 inline-flex rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Back to storefront
        </Link>
      </div>
    </main>
  );
}
