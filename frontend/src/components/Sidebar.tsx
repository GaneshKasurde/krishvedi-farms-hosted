import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Package,
  Users,
  Building2,
  FileText,
  BarChart3,
} from "lucide-react";
import ExportMenu from "./ExportMenu";

const navItems = [
  { to: "/" as const, label: "Upload", icon: Upload },
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/items" as const, label: "Items", icon: Package },
  { to: "/parties" as const, label: "Parties", icon: Users },
  { to: "/income-statement" as const, label: "Income Statement", icon: FileText },
  { to: "/analysis" as const, label: "Analysis", icon: BarChart3 },
];

export default function Sidebar() {
  const matchRoute = useMatchRoute();

  return (
    <aside
      className="w-64 bg-sidebar min-h-screen flex flex-col shrink-0 sticky top-0 h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              Krishvedi
            </h1>
            <p className="text-xs text-white/60">Farms Analysis</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = matchRoute({ to: item.to });
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Export Button */}
      <div className="px-3 py-4 border-t border-white/10">
        <ExportMenu />
      </div>
    </aside>
  );
}
