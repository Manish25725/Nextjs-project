"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Inventory = {
  id: string;
  total: number;
  reserved: number;
  warehouse: { id: string; name: string; location: string };
};



type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  totalAvailable: number;
  inventories: Inventory[];
};

type Warehouse = {
  id: string;
  name: string;
  location: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Reservation modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reserveWarehouseId, setReserveWarehouseId] = useState("");
  const [reserveQty, setReserveQty] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState("");
  const [reserveSuccess, setReserveSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prodRes, whRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/warehouses"),
      ]);
      if (!prodRes.ok) throw new Error("Failed to fetch products");
      if (!whRes.ok) throw new Error("Failed to fetch warehouses");
      const [prods, whs] = await Promise.all([prodRes.json(), whRes.json()]);
      setProducts(prods);
      setWarehouses(whs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Analytics ---
  const totalProducts = products.length;
  const totalAvailable = products.reduce((s, p) => s + p.totalAvailable, 0);
  const totalReserved = products.reduce(
    (s, p) => s + p.inventories.reduce((a, inv) => a + inv.reserved, 0),
    0
  );
  const activeWarehouses = warehouses.length;

  // --- Filtering ---
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      searchTerm === "" ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchWarehouse =
      warehouseFilter === "all" ||
      p.inventories.some((inv) => inv.warehouse.id === warehouseFilter);

    const available = p.inventories
      .filter(
        (inv) => warehouseFilter === "all" || inv.warehouse.id === warehouseFilter
      )
      .reduce((a, inv) => a + (inv.total - inv.reserved), 0);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "instock" && available > 10) ||
      (statusFilter === "lowstock" && available > 0 && available <= 10) ||
      (statusFilter === "outofstock" && available === 0);

    return matchSearch && matchWarehouse && matchStatus;
  });

  // --- Reserve Modal ---
  function openReserveModal(product: Product) {
    setSelectedProduct(product);
    setReserveWarehouseId(product.inventories[0]?.warehouse.id || "");
    setReserveQty(1);
    setReserveError("");
    setReserveSuccess("");
    setShowModal(true);
  }

  async function handleReserve() {
    if (!selectedProduct || !reserveWarehouseId || reserveQty < 1) return;
    setReserving(true);
    setReserveError("");
    setReserveSuccess("");
    try {
      const idempotencyKey = `${selectedProduct.id}-${reserveWarehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          warehouseId: reserveWarehouseId,
          quantity: reserveQty,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reservation failed");
      setReserveSuccess(`Reservation created! ID: ${data.id}`);
      fetchData();
      setTimeout(() => {
        setShowModal(false);
        router.push(`/reservations?id=${data.id}`);
      }, 1500);
    } catch (err: any) {
      setReserveError(err.message);
    } finally {
      setReserving(false);
    }
  }

  function getStockStatus(product: Product, warehouseId: string) {
    const invs =
      warehouseId === "all"
        ? product.inventories
        : product.inventories.filter((i) => i.warehouse.id === warehouseId);
    const avail = invs.reduce((a, i) => a + (i.total - i.reserved), 0);
    if (avail > 10) return "instock";
    if (avail > 0) return "lowstock";
    return "outofstock";
  }

  return (
    <main className="flex-1 p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-8">

      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex text-on-surface-variant font-label-md text-label-md mb-2">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <span className="text-on-background">Home</span>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
                  <span className="text-on-background">Inventory Dashboard</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="font-headline-md text-headline-md font-bold text-on-background">ReserveFlow Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/products"
            target="_blank"
            className="px-4 py-2 rounded-lg border border-outline-variant text-on-background hover:bg-surface-variant transition-colors flex items-center gap-2 font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </a>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg border border-outline-variant text-on-background hover:bg-surface-variant transition-colors flex items-center gap-2 font-label-md text-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
          <button
            onClick={() => {
              if (products.length > 0) openReserveModal(products[0]);
            }}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-colors shadow-sm flex items-center gap-2 font-label-md text-label-md font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            Create Reservation
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl px-5 py-4 border border-error/20 flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error} — Check your database connection.</span>
        </div>
      )}

      {/* Analytics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-md text-label-md">Total Products</span>
            <div className="p-1.5 bg-surface-container rounded-md text-primary">
              <span className="material-symbols-outlined text-[20px]">category</span>
            </div>
          </div>
          <div className="font-headline-md text-headline-md text-on-background mt-1">
            {loading ? "—" : totalProducts.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-primary font-label-md text-label-md mt-2">
            <span className="material-symbols-outlined text-[16px]">inventory_2</span>
            <span>Live from database</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-md text-label-md">Available Units</span>
            <div className="p-1.5 bg-surface-container rounded-md text-primary">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
          </div>
          <div className="font-headline-md text-headline-md text-on-background mt-1">
            {loading ? "—" : totalAvailable.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-primary font-label-md text-label-md mt-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Ready to reserve</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-md text-label-md">Reserved Units</span>
            <div className="p-1.5 bg-error-container rounded-md text-error">
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            </div>
          </div>
          <div className="font-headline-md text-headline-md text-on-background mt-1">
            {loading ? "—" : totalReserved.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-error font-label-md text-label-md mt-2">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Currently held</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-md text-label-md">Active Warehouses</span>
            <div className="p-1.5 bg-surface-container rounded-md text-primary">
              <span className="material-symbols-outlined text-[20px]">warehouse</span>
            </div>
          </div>
          <div className="font-headline-md text-headline-md text-on-background mt-1">
            {loading ? "—" : activeWarehouses}
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md mt-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>All operational</span>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-12 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-background placeholder-on-surface-variant focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md transition-shadow"
            placeholder="Search products, SKUs..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-3 flex-wrap md:flex-nowrap">
          <select
            className="bg-surface border border-outline-variant text-on-background text-body-md font-body-md rounded-lg focus:ring-2 focus:ring-primary focus:border-primary block w-full md:w-auto py-2.5 px-3"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            className="bg-surface border border-outline-variant text-on-background text-body-md font-body-md rounded-lg focus:ring-2 focus:ring-primary focus:border-primary block w-full md:w-auto py-2.5 px-3"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="instock">In Stock</option>
            <option value="lowstock">Low Stock</option>
            <option value="outofstock">Out of Stock</option>
          </select>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-on-surface-variant gap-3">
          <span className="material-symbols-outlined animate-spin">refresh</span>
          <span>Loading inventory...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
          <span className="material-symbols-outlined text-[48px]">inventory_2</span>
          <p className="font-headline-sm text-headline-sm">No products found</p>
          <p className="text-body-md">Try adjusting your filters or seed the database.</p>
        </div>
      )}

      {/* Product Grid */}
      {!loading && filteredProducts.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product, warehouseFilter);
            const displayInvs =
              warehouseFilter === "all"
                ? product.inventories
                : product.inventories.filter((i) => i.warehouse.id === warehouseFilter);
            return (
              <div
                key={product.id}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 flex flex-col group hover:border-primary/50 hover:shadow-md transition-all duration-300 relative"
              >
                <div className="h-48 bg-surface-variant relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={product.imageUrl}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[64px]">inventory_2</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="bg-surface/90 backdrop-blur-sm border border-outline-variant/50 text-on-background px-2 py-1 rounded-md font-label-sm text-label-sm uppercase tracking-wider">
                      {product.category || "General"}
                    </span>
                    <span
                      className={`backdrop-blur-sm border px-2 py-1 rounded-md font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1 ${
                        status === "instock"
                          ? "bg-primary-container/90 border-primary/20 text-on-primary-container"
                          : status === "lowstock"
                          ? "bg-secondary-container/90 border-secondary/20 text-on-secondary-container"
                          : "bg-error-container/90 border-error/20 text-on-error-container"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === "instock" ? "bg-primary" : status === "lowstock" ? "bg-secondary" : "bg-error"
                        }`}
                      />
                      {status === "instock" ? "In Stock" : status === "lowstock" ? "Low Stock" : "Out of Stock"}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-background truncate">{product.name}</h3>
                    <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">SKU: {product.sku}</p>
                  </div>
                  <div className="flex flex-col gap-3 mb-6 flex-1">
                    <div className="text-label-sm text-on-surface-variant font-label-sm mb-1 uppercase tracking-wider">Warehouse Breakdown</div>
                    {displayInvs.map((inv) => {
                      const avail = inv.total - inv.reserved;
                      const availPct = inv.total > 0 ? Math.round((avail / inv.total) * 100) : 0;
                      const resvPct = inv.total > 0 ? Math.round((inv.reserved / inv.total) * 100) : 0;
                      return (
                        <div key={inv.id} className="flex flex-col gap-1">
                          <div className="flex justify-between font-label-sm text-label-sm">
                            <span className="text-on-background">{inv.warehouse.name}</span>
                            <div className="flex gap-2">
                              <span className="text-primary font-medium">{avail} Avail</span>
                              <span className="text-on-surface-variant">/</span>
                              <span className="text-error font-medium">{inv.reserved} Resv</span>
                            </div>
                          </div>
                          <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden flex">
                            <div className="bg-primary h-full" style={{ width: `${availPct}%` }} />
                            <div className="bg-error h-full" style={{ width: `${resvPct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-outline-variant/30">
                    <button
                      onClick={() => router.push("/inventory")}
                      className="py-2 px-4 rounded-lg border border-outline-variant text-on-background hover:bg-surface-variant transition-colors font-label-md text-label-md text-center"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openReserveModal(product)}
                      disabled={status === "outofstock"}
                      className="py-2 px-4 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-colors font-label-md text-label-md text-center font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Reservation Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl modal-container p-6 flex flex-col gap-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-background">Create Reservation</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">
                  Select Warehouse
                </label>
                <select
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-on-background font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary"
                  value={reserveWarehouseId}
                  onChange={(e) => setReserveWarehouseId(e.target.value)}
                >
                  {selectedProduct.inventories.map((inv) => {
                    const avail = inv.total - inv.reserved;
                    return (
                      <option key={inv.warehouse.id} value={inv.warehouse.id} disabled={avail <= 0}>
                        {inv.warehouse.name} — {avail} available
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={
                    selectedProduct.inventories.find((i) => i.warehouse.id === reserveWarehouseId)
                      ? (selectedProduct.inventories.find((i) => i.warehouse.id === reserveWarehouseId)!.total -
                          selectedProduct.inventories.find((i) => i.warehouse.id === reserveWarehouseId)!.reserved)
                      : 1
                  }
                  value={reserveQty}
                  onChange={(e) => setReserveQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2.5 text-on-background font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {reserveError && (
              <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {reserveError}
              </div>
            )}
            {reserveSuccess && (
              <div className="bg-primary-container text-on-primary-container rounded-lg px-4 py-3 text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {reserveSuccess}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-outline-variant text-on-background hover:bg-surface-variant transition-colors font-label-md text-label-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReserve}
                disabled={reserving}
                className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-colors font-label-md text-label-md font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {reserving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Reserving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Confirm Reserve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
