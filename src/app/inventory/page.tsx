"use client";
import React, { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  totalAvailable: number;
  inventories: {
    id: string;
    total: number;
    reserved: number;
    warehouse: {
      name: string;
      location: string;
    };
  }[];
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        setProducts(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex-1 pt-24 px-margin-mobile md:px-margin-desktop pb-2xl max-w-container-max mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-md mb-xl">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">Inventory</h1>
          <p className="text-body-md text-on-surface-variant">View and manage product stock levels.</p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <button className="px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Sync Stock
          </button>
          <button className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md hover:bg-primary transition-colors shadow-sm flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-lg">
        <div className="flex-1 flex flex-col gap-md">
          <div className="bg-surface-container-lowest p-sm rounded-2xl border border-outline-variant/30 shadow-sm flex flex-wrap items-center justify-between gap-sm">
            <div className="flex items-center gap-sm flex-1 min-w-[200px]">
              <div className="relative w-full max-w-xs">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-outline-variant/50 bg-surface-bright text-on-surface focus:ring-2 focus:ring-primary font-body-sm text-body-sm" placeholder="Filter SKU..." type="text"/>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant/30 font-label-sm text-label-sm text-on-surface-variant">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold">Warehouse</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                    <th className="py-3 px-4 font-semibold text-right">Available</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/20">
                  {loading && (
                    <tr>
                      <td colSpan={7} className="text-center py-8">Loading inventory...</td>
                    </tr>
                  )}
                  {error && (
                    <tr>
                      <td colSpan={7} className="text-center text-error py-8">
                        {error}. Have you connected the Database?
                      </td>
                    </tr>
                  )}
                  {!loading && !error && products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-on-surface-variant">
                        No products found. Seed the database!
                      </td>
                    </tr>
                  )}
                  {products.map((product) =>
                    product.inventories.map((inv) => (
                      <tr key={inv.id} className="hover:bg-surface-bright transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant/30 overflow-hidden flex-shrink-0">
                              <img alt={product.name} className="w-full h-full object-cover" src={product.imageUrl || ""} />
                            </div>
                            <div>
                              <div className="font-medium text-on-surface">{product.name}</div>
                              <div className="text-on-surface-variant text-[12px]">{product.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{product.sku}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{inv.warehouse.name}</td>
                        <td className="py-3 px-4 text-right font-medium">{inv.total}</td>
                        <td className="py-3 px-4 text-right text-on-surface-variant">{inv.reserved}</td>
                        <td className="py-3 px-4 text-right font-medium">{inv.total - inv.reserved}</td>
                        <td className="py-3 px-4">
                          {(inv.total - inv.reserved) > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">In Stock</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold">Out of Stock</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
