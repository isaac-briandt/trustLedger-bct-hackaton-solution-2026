"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  Menu,
  PackageSearch,
  ShieldCheck,
  Snowflake,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Inventory", href: "/inventory", icon: PackageSearch },
  { label: "Data quality", href: "/data-quality", icon: Activity },
  { label: "Review centre", href: "/review", icon: ClipboardCheck },
  { label: "Audit log", href: "/audit-log", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="flex h-[76px] items-center gap-3 border-b px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Snowflake className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[15px] font-bold tracking-tight">TrustLedger</p>
          <p className="text-xs text-muted-foreground">Cold-chain intelligence</p>
        </div>
      </div>
      <div className="px-4 pt-7">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Workspace
        </p>
        <SidebarNavigation onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Database className="size-3.5 text-primary" aria-hidden="true" />
            Dataset mode
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Synthetic dataset. All flagged units are investigation candidates,
            not disposition decisions.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        {nav}
      </aside>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-card transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex justify-end p-3">
          <button
            aria-label="Close navigation"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        {nav}
      </aside>
      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b bg-background/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Snowflake className="size-4 text-primary" aria-hidden="true" />
              Kenya blood cold-chain monitoring
            </div>
          </div>
          <div className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Read-only prototype
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNavigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Suspense fallback={<NavigationLinks pathname="" onNavigate={onNavigate} />}>
      <ActiveNavigation onNavigate={onNavigate} />
    </Suspense>
  );
}

function ActiveNavigation({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  return <NavigationLinks pathname={pathname} onNavigate={onNavigate} />;
}

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Main navigation">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[17px]" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
