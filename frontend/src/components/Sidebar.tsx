import { NavLink } from 'react-router-dom';

function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-2xl px-5 py-4 text-sm font-semibold transition-colors duration-150 ${
      isActive ? 'bg-white/10 text-white shadow-sm shadow-cyan-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <aside className="flex w-full flex-col justify-between border-b border-white/10 bg-[#050a14] p-6 text-slate-200 lg:min-h-screen lg:border-b-0 lg:border-r lg:w-[280px] lg:flex-shrink-0">
      <div>
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
            SF
          </div>
          <h1 className="text-xl font-semibold text-white">StoreFlow</h1>
          <p className="text-sm text-slate-400">Merchant workspace</p>
        </div>

        <nav className="space-y-2">
          <NavLink to="/dashboard" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
        </nav>
      </div>

      <div className="text-xs text-slate-500">
        <p>Secure merchant portal</p>
        <p className="mt-2">JWT auth + tenant-aware product management</p>
      </div>
    </aside>
  );
}

export default Sidebar;
