"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Dark mode
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("rf-dark-mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved !== null ? saved === "true" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("rf-dark-mode", String(next));
      return next;
    });
  }

  // Settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const user = session?.user as any;
  const initials = user?.name ? getInitials(user.name) : "?";
  const avatarColor = user?.avatarColor ?? "#004ac6";

  const navLinks = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/inventory", label: "Inventory", icon: "inventory_2" },
    { href: "/reservations", label: "Reservations", icon: "shopping_cart" },
    { href: "/warehouses", label: "Warehouses", icon: "warehouse" },
  ];

  // Hide header on auth pages
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <header className="bg-surface-container-lowest text-primary font-body-md text-body-md w-full sticky top-0 z-50 border-b border-outline-variant/30">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 w-full max-w-container-max mx-auto">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">inventory_2</span>
              </div>
              <span className="font-headline-md text-headline-md font-bold text-primary">ReserveFlow</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-md transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-variant/40"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              id="dark-mode-toggle"
              onClick={toggleDark}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant/50 relative"
            >
              <span className={`material-symbols-outlined transition-transform duration-300 ${dark ? "rotate-0" : "rotate-180"}`}>
                {dark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {/* Notifications */}
            <button
              id="notifications-btn"
              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant/50"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                id="settings-btn"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant/50 ${
                  settingsOpen ? "bg-surface-variant/50 text-primary" : ""
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-on-background text-body-md truncate">{user?.name ?? "User"}</p>
                      <p className="text-body-sm text-on-surface-variant truncate">{user?.email ?? ""}</p>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      id="settings-profile-btn"
                      onClick={() => { setSettingsOpen(false); router.push("/profile"); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-on-background hover:bg-surface-variant/50 transition-colors text-body-md text-left"
                    >
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">manage_accounts</span>
                      My Profile
                    </button>

                    <button
                      id="settings-dark-toggle-btn"
                      onClick={() => { toggleDark(); setSettingsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-on-background hover:bg-surface-variant/50 transition-colors text-body-md text-left"
                    >
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                        {dark ? "light_mode" : "dark_mode"}
                      </span>
                      {dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </button>

                    <div className="my-1 border-t border-outline-variant/30" />

                    <button
                      id="settings-signout-btn"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error-container/30 transition-colors text-body-md text-left"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      Change User (Sign Out)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <button
              id="avatar-btn"
              onClick={() => router.push("/profile")}
              title="View Profile"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-outline-variant/30 hover:border-primary/50 transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}
