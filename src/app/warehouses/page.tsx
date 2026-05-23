"use client";
import React, { useEffect, useState, useCallback } from "react";

type InventoryItem = {
  id: string;
  total: number;
  reserved: number;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
};

type Warehouse = {
  id: string;
  name: string;
  location: string;
  inventories: InventoryItem[];
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      const data = await res.json();
      setWarehouses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Derived stats
  const totalInventory = warehouses.reduce(
    (s, w) => s + w.inventories.reduce((a, i) => a + i.total, 0),
    0
  );
  const totalReserved = warehouses.reduce(
    (s, w) => s + w.inventories.reduce((a, i) => a + i.reserved, 0),
    0
  );
  const lowStockAlerts = warehouses.reduce(
    (s, w) =>
      s + w.inventories.filter((i) => i.total - i.reserved <= 10 && i.total - i.reserved > 0).length,
    0
  );

  // Capacity % per warehouse (reserved / total)
  function getCapacityPct(w: Warehouse) {
    const total = w.inventories.reduce((a, i) => a + i.total, 0);
    const used = w.inventories.reduce((a, i) => a + i.reserved, 0);
    return total > 0 ? Math.round((used / total) * 100) : 0;
  }

  function getCapacityColor(pct: number) {
    if (pct >= 80) return { bar: "bg-error", badge: "bg-error-container text-on-error-container", label: "High Load" };
    if (pct >= 50) return { bar: "bg-secondary", badge: "bg-secondary-container text-on-secondary-container", label: "Moderate" };
    return { bar: "bg-primary", badge: "bg-surface-container-low text-primary", label: "Operational" };
  }

  // All inventory rows for the table (flattened)
  const allInventory = warehouses.flatMap((w) =>
    w.inventories.map((inv) => ({ ...inv, warehouseName: w.name }))
  );

  const filteredInventory = allInventory.filter(
    (i) =>
      search === "" ||
      i.product.name.toLowerCase().includes(search.toLowerCase()) ||
      i.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.warehouseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Page Content */}
      <div className="p-margin-mobile md:p-margin-desktop flex-1 space-y-xl max-w-container-max mx-auto w-full">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Warehouse Operations</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Monitor inventory allocation and warehouse stock distribution in real time.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/api/warehouses"
              target="_blank"
              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </a>
            <button
              onClick={fetchWarehouses}
              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              Sync
            </button>
            <button className="px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Warehouse
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl px-5 py-4 border border-error/20 flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span>{error} — Check your database connection.</span>
          </div>
        )}

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Total Warehouses</span>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">warehouse</span>
              </div>
            </div>
            <div className="font-display text-display text-on-surface">{loading ? "—" : warehouses.length}</div>
            <div className="font-body-sm text-body-sm text-secondary mt-2">
              <span className="text-primary">Active</span> in the system
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Total Inventory</span>
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
            </div>
            <div className="font-display text-display text-on-surface">{loading ? "—" : totalInventory.toLocaleString()}</div>
            <div className="font-body-sm text-body-sm text-secondary mt-2">
              <span className="material-symbols-outlined text-[14px] align-middle text-primary">trending_up</span>
              <span className="text-primary"> Live</span> from database
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Reserved Stock</span>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
            </div>
            <div className="font-display text-display text-on-surface">{loading ? "—" : totalReserved.toLocaleString()}</div>
            <div className="font-body-sm text-body-sm text-secondary mt-2">Allocated for dispatch</div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Low Stock Alerts</span>
              <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-on-error-container">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
            </div>
            <div className="font-display text-display text-on-surface">{loading ? "—" : lowStockAlerts}</div>
            <div className="font-body-sm text-body-sm text-error mt-2">Requires attention</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-on-surface-variant gap-3">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            <span>Loading warehouses...</span>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            {/* Main Data Area */}
            <div className="lg:col-span-2 space-y-lg">
              {/* Warehouse Distribution Grid */}
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Warehouse Distribution</h2>
                {warehouses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[48px]">warehouse</span>
                    <p>No warehouses found. Seed the database!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {warehouses.map((w) => {
                      const pct = getCapacityPct(w);
                      const colors = getCapacityColor(pct);
                      const totalUnits = w.inventories.reduce((a, i) => a + i.total, 0);
                      return (
                        <div key={w.id} className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-md shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-label-md text-label-md text-on-surface font-bold">{w.name}</h3>
                              <p className="font-body-sm text-body-sm text-secondary">{w.location}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-label-sm rounded-full flex items-center gap-1 ${colors.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${colors.bar}`} />
                              {colors.label}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-on-surface-variant font-body-sm">Reserved / Total</span>
                              <span className="text-on-surface font-label-md">{pct}% ({totalUnits} units)</span>
                            </div>
                            <div className="w-full bg-surface-container-highest rounded-full h-2">
                              <div className={`${colors.bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-on-surface-variant font-body-sm text-body-sm pt-1">
                              {w.inventories.length} product line{w.inventories.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventory Table */}
              <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-md py-4 border-b border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-surface-bright">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Inventory Overview</h2>
                  <div className="relative w-full md:w-64">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                    <input
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface focus:ring-2 focus:ring-primary font-body-sm text-body-sm"
                      placeholder="Search products, SKUs, warehouses..."
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/30">
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">SKU</th>
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Warehouse</th>
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Total</th>
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Available</th>
                        <th className="px-4 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
                      {filteredInventory.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                            {search ? "No results found." : "No inventory data. Seed the database!"}
                          </td>
                        </tr>
                      )}
                      {filteredInventory.map((i) => {
                        const avail = i.total - i.reserved;
                        const statusLabel = avail > 10 ? "Healthy" : avail > 0 ? "Low Stock" : "Out of Stock";
                        const statusClass =
                          avail > 10
                            ? "bg-surface-container-high text-primary"
                            : avail > 0
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-error-container text-on-error-container";
                        return (
                          <tr key={i.id} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="px-4 py-3 text-on-surface font-medium">{i.product.name}</td>
                            <td className="px-4 py-3 text-secondary font-mono text-xs">{i.product.sku}</td>
                            <td className="px-4 py-3 text-secondary">{i.warehouseName}</td>
                            <td className="px-4 py-3 text-right font-medium">{i.total}</td>
                            <td className="px-4 py-3 text-right font-medium">{avail}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Activity Feed Sidebar */}
            <div className="space-y-lg">
              <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-lg shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Warehouse Summary</h2>
                </div>
                {warehouses.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant text-center py-4">No data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {warehouses.map((w) => {
                      const pct = getCapacityPct(w);
                      const colors = getCapacityColor(pct);
                      const avail = w.inventories.reduce((a, i) => a + (i.total - i.reserved), 0);
                      return (
                        <div key={w.id} className="p-3 rounded-xl border border-outline-variant/30 bg-surface flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.badge}`}>
                                <span className="material-symbols-outlined text-[16px]">warehouse</span>
                              </div>
                              <div>
                                <div className="font-label-md text-label-md text-on-surface">{w.name}</div>
                                <div className="font-body-sm text-[10px] text-secondary">{w.location}</div>
                              </div>
                            </div>
                            <span className="font-label-sm text-label-sm text-primary font-bold">{pct}%</span>
                          </div>
                          <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                            <div className={`${colors.bar} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex justify-between text-[11px] text-on-surface-variant font-label-sm">
                            <span>{avail} available</span>
                            <span>{w.inventories.reduce((a, i) => a + i.reserved, 0)} reserved</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-outline-variant/30">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Quick Actions</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={fetchWarehouses}
                      className="w-full py-2 text-primary text-sm font-label-md hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-outline-variant/30 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      Sync Warehouse Data
                    </button>
                    <a
                      href="/api/cron/release-expired"
                      target="_blank"
                      className="w-full py-2 text-secondary text-sm font-label-md hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-outline-variant/30 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">timer_off</span>
                      Release Expired Holds
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
