"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Reservation = {
  id: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  inventory: {
    id: string;
    total: number;
    reserved: number;
    product: {
      id: string;
      name: string;
      sku: string;
      category: string;
      imageUrl: string;
    };
    warehouse: {
      id: string;
      name: string;
      location: string;
    };
  };
};

function ReservationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get("id");

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(!!reservationId);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch reservation by ID
  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/reservations?id=${reservationId}`)
      .then(async (res) => {
        if (!res.ok) {
          // Fallback: try fetching all reservations (GET list) 
          // Since we don't have a GET /api/reservations/[id], 
          // we'll try to get it from the list
          throw new Error("Reservation not found");
        }
        return res.json();
      })
      .then((data) => {
        // If the API returns an array, find by id
        if (Array.isArray(data)) {
          const found = data.find((r: Reservation) => r.id === reservationId);
          if (found) setReservation(found);
          else setError("Reservation not found");
        } else {
          setReservation(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reservationId]);

  // Countdown timer
  useEffect(() => {
    if (!reservation || reservation.status !== "PENDING") return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0 && timerRef.current) clearInterval(timerRef.current);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [reservation]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const totalSeconds = 15 * 60; // 15 minutes
  const progressPct = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
  // SVG circle: r=45, circumference ≈ 283
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - progressPct);

  async function handleAction(action: "confirm" | "release") {
    if (!reservation) return;
    setActionLoading(true);
    setActionMsg({ type: "", text: "" });
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setActionMsg({
        type: "success",
        text: action === "confirm" ? "Reservation confirmed successfully!" : "Reservation cancelled.",
      });
      setReservation((prev) => prev ? { ...prev, status: data.status } : prev);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // No reservation ID — show a prompt
  if (!reservationId) {
    return (
      <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-lg flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant">receipt_long</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface text-center">No Reservation Selected</h1>
        <p className="empty-state-text text-body-lg text-on-surface-variant leading-relaxed">
          To view a reservation, click the <strong>Reserve</strong> button on a product from the Dashboard, or navigate here with a reservation ID.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:opacity-90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Go to Dashboard
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">refresh</span>
          <span>Loading reservation...</span>
        </div>
      </main>
    );
  }

  if (error || !reservation) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-[48px] text-error">error</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Could not load reservation</h1>
        <p className="text-body-md text-on-surface-variant">{error || "Reservation not found"}</p>
        <p className="text-body-sm text-on-surface-variant text-center max-w-sm">
          Note: The GET /api/reservations endpoint needs to support fetching by ID. See the implementation note below.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:opacity-90 transition-colors"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const product = reservation.inventory.product;
  const warehouse = reservation.inventory.warehouse;
  const isPending = reservation.status === "PENDING";
  const isExpired = isPending && timeLeft === 0;

  return (
    <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-lg">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label-md font-label-md text-on-surface-variant mb-md">
        <button onClick={() => router.push("/")} className="hover:text-primary transition-colors">Dashboard</button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface">Reservation Checkout</span>
      </div>

      {/* Header */}
      <header className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-xs">
            <h1 className="text-headline-lg font-headline-lg text-on-surface">Reservation Checkout</h1>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              reservation.status === "CONFIRMED"
                ? "bg-primary-container border-primary/30"
                : reservation.status === "RELEASED" || reservation.status === "EXPIRED"
                ? "bg-error-container border-error/30"
                : "bg-surface-container-high border-outline-variant/50"
            }`}>
              {isPending && !isExpired && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
              <span className="text-label-sm font-label-sm text-on-surface uppercase tracking-wider">
                {isExpired ? "Expired" : reservation.status}
              </span>
            </div>
          </div>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            ID: <span className="font-mono text-body-sm">{reservation.id}</span>
          </p>
        </div>
      </header>

      {/* Action Messages */}
      {actionMsg.text && (
        <div className={`mb-lg rounded-xl px-5 py-4 border flex items-center gap-3 ${
          actionMsg.type === "success"
            ? "bg-primary-container text-on-primary-container border-primary/20"
            : "bg-error-container text-on-error-container border-error/20"
        }`}>
          <span className="material-symbols-outlined">
            {actionMsg.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Panel */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          {/* Product Card */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row gap-lg">
            <div className="w-full md:w-1/3 aspect-square rounded-lg bg-surface-container overflow-hidden border border-outline-variant/30 shrink-0">
              {product.imageUrl ? (
                <img alt={product.name} className="w-full h-full object-cover" src={product.imageUrl} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[64px]">inventory_2</span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-headline-md font-headline-md text-on-surface mb-1">{product.name}</h2>
                    <p className="text-body-md font-body-md text-on-surface-variant">{product.category}</p>
                  </div>
                  <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-md text-label-sm font-label-sm font-mono border border-outline-variant/30 whitespace-nowrap">
                    SKU: {product.sku}
                  </span>
                </div>
                <div className="mt-md space-y-sm">
                  <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                    <span className="text-body-sm font-body-sm text-on-surface-variant">Reserved Quantity</span>
                    <span className="text-body-md font-body-md text-on-surface font-medium">{reservation.quantity} unit{reservation.quantity > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                    <span className="text-body-sm font-body-sm text-on-surface-variant">Status</span>
                    <span className="text-body-md font-body-md text-on-surface">{reservation.status}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                    <span className="text-body-sm font-body-sm text-on-surface-variant">Created At</span>
                    <span className="text-body-md font-body-md text-on-surface">
                      {new Date(reservation.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Warehouse Section */}
              <div className="mt-lg bg-surface-container-low rounded-lg p-md border border-outline-variant/50">
                <div className="flex items-center gap-2 mb-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">warehouse</span>
                  <h3 className="text-label-md font-label-md text-on-surface">Warehouse Allocation</h3>
                </div>
                <p className="text-body-sm font-body-sm text-on-surface-variant mb-md">{warehouse.name} — {warehouse.location}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-label-sm font-label-sm">
                    <span className="text-on-surface-variant">Available Stock</span>
                    <span className="text-on-surface font-medium">{reservation.inventory.total - reservation.inventory.reserved} Units</span>
                  </div>
                  <div className="w-full bg-outline-variant/30 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${reservation.inventory.total > 0 ? Math.round((reservation.inventory.reserved / reservation.inventory.total) * 100) : 0}%` }}
                    />
                    <div
                      className="bg-tertiary-container h-full"
                      style={{ width: `${reservation.inventory.total > 0 ? Math.round(((reservation.inventory.total - reservation.inventory.reserved) / reservation.inventory.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Reserved ({reservation.inventory.reserved})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary-container inline-block" /> Unallocated ({reservation.inventory.total - reservation.inventory.reserved})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-md">Activity Timeline</h3>
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/50 before:to-transparent">
              <div className="relative flex items-center gap-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-surface-container-lowest bg-primary text-on-primary absolute left-0 -translate-x-[11px] shadow">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="ml-4 p-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-label-md font-label-md text-on-surface">Reservation Created</h4>
                    <time className="text-label-sm font-label-sm text-on-surface-variant">{new Date(reservation.createdAt).toLocaleTimeString()}</time>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">System initiated reservation block for {reservation.quantity} unit(s).</p>
                </div>
              </div>
              {(reservation.status === "CONFIRMED" || reservation.status === "RELEASED" || reservation.status === "EXPIRED") && (
                <div className="relative flex items-center gap-4">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-surface-container-lowest absolute left-0 -translate-x-[11px] shadow ${
                    reservation.status === "CONFIRMED" ? "bg-primary text-on-primary" : "bg-error text-on-error"
                  }`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {reservation.status === "CONFIRMED" ? "check" : "close"}
                    </span>
                  </div>
                  <div className="ml-4 p-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex-1">
                    <h4 className="text-label-md font-label-md text-on-surface">
                      {reservation.status === "CONFIRMED" ? "Purchase Confirmed" : `Reservation ${reservation.status}`}
                    </h4>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                      {reservation.status === "CONFIRMED" ? "Inventory has been decremented." : "Stock has been returned to available pool."}
                    </p>
                  </div>
                </div>
              )}
              {isPending && !isExpired && (
                <div className="relative flex items-center gap-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-surface-container-lowest bg-surface-container-high absolute left-0 -translate-x-[11px] shadow">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <div className="ml-4 p-md rounded-lg bg-surface border border-primary/20 shadow-sm relative overflow-hidden flex-1">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <h4 className="text-label-md font-label-md text-on-surface font-semibold">Awaiting Confirmation</h4>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Pending user action to confirm or cancel.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 flex flex-col gap-gutter lg:sticky lg:top-[100px]">
          {/* Countdown Timer */}
          {isPending && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">timer</span>
              </div>
              <h3 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-lg z-10">
                {isExpired ? "Hold Expired" : "Hold Expires In"}
              </h3>
              <div className="relative w-48 h-48 flex items-center justify-center z-10">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-outline-variant/30" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="4" />
                  <circle
                    className={`transition-all duration-1000 ease-linear ${isExpired ? "text-error" : "text-primary"}`}
                    cx="50" cy="50" fill="none" r="45" stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeWidth="4"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-display font-display font-bold tracking-tight ${isExpired ? "text-error" : "text-on-surface"}`}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-label-sm font-label-sm text-error flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {isExpired ? "Expired" : "Hold Active"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-md">Reservation Summary</h3>
            <div className="space-y-md">
              <div className="flex justify-between items-center text-body-md font-body-md">
                <span className="text-on-surface-variant">Reserved Quantity</span>
                <span className="text-on-surface font-medium">{reservation.quantity} Unit{reservation.quantity > 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between items-center text-body-md font-body-md">
                <span className="text-on-surface-variant">Warehouse</span>
                <span className="text-on-surface font-medium">{warehouse.name}</span>
              </div>
              <div className="flex justify-between items-center text-body-md font-body-md">
                <span className="text-on-surface-variant">Expiry</span>
                <span className="text-on-surface font-mono text-body-sm">{new Date(reservation.expiresAt).toLocaleString()}</span>
              </div>
              <hr className="border-outline-variant/30 my-md" />
              <div className="flex justify-between items-end">
                <span className="text-body-lg font-body-lg text-on-surface">Status</span>
                <span className="text-headline-lg font-headline-lg text-on-surface font-bold">{isExpired ? "EXPIRED" : reservation.status}</span>
              </div>
            </div>

            {/* Actions */}
            {isPending && !isExpired && (
              <div className="mt-xl flex flex-col gap-sm">
                <button
                  onClick={() => handleAction("confirm")}
                  disabled={actionLoading}
                  className="w-full bg-primary text-on-primary py-3 px-4 rounded-lg text-label-md font-label-md font-bold hover:opacity-90 transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {actionLoading ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Processing...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">check_circle</span> Confirm Purchase</>
                  )}
                </button>
                <button
                  onClick={() => handleAction("release")}
                  disabled={actionLoading}
                  className="w-full bg-transparent text-error border border-error/50 py-3 px-4 rounded-lg text-label-md font-label-md font-bold hover:bg-error-container hover:border-error transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  Cancel Reservation
                </button>
              </div>
            )}

            {(reservation.status === "CONFIRMED" || reservation.status === "RELEASED" || reservation.status === "EXPIRED" || isExpired) && (
              <div className="mt-xl">
                <button
                  onClick={() => router.push("/")}
                  className="w-full bg-primary text-on-primary py-3 px-4 rounded-lg text-label-md font-label-md font-bold hover:opacity-90 transition-colors flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-label-sm font-label-sm text-on-surface-variant mt-sm">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Secure Checkout Process
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">refresh</span>
          <span>Loading...</span>
        </div>
      </main>
    }>
      <ReservationsContent />
    </Suspense>
  );
}
