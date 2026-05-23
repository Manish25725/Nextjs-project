"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = [
  { label: "Blue", value: "#004ac6" },
  { label: "Violet", value: "#6d28d9" },
  { label: "Rose", value: "#be123c" },
  { label: "Emerald", value: "#047857" },
  { label: "Amber", value: "#b45309" },
  { label: "Cyan", value: "#0e7490" },
];

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  createdAt: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#004ac6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setAvatarColor(data.avatarColor);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");
      setProfile(data);
      setSuccess("Profile updated successfully!");
      await updateSession({ name: data.name });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[40px]">refresh</span>
      </main>
    );
  }

  return (
    <main className="flex-1 p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex text-on-surface-variant font-label-md text-label-md">
        <ol className="inline-flex items-center space-x-1">
          <li>
            <button onClick={() => router.push("/")} className="text-on-background hover:text-primary transition-colors">
              Home
            </button>
          </li>
          <li className="flex items-center">
            <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
            <span className="text-on-background">My Profile</span>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-7 flex flex-col items-center gap-5 h-fit">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-md transition-colors duration-300"
            style={{ backgroundColor: avatarColor }}
          >
            {profile ? getInitials(profile.name) : "?"}
          </div>
          <div className="text-center">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-background">{profile?.name}</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">{profile?.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-primary-container rounded-full text-on-primary-container text-label-sm font-label-sm capitalize">
              <span className="material-symbols-outlined text-[14px]">
                {profile?.role === "admin" ? "admin_panel_settings" : "person"}
              </span>
              {profile?.role}
            </span>
          </div>
          <div className="w-full border-t border-outline-variant/30 pt-4 text-center">
            <p className="text-body-sm text-on-surface-variant">
              Member since{" "}
              <span className="font-medium text-on-background">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-7 flex flex-col gap-6">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-background">Edit Profile</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Update your display name and avatar color</p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-primary-container text-on-primary-container rounded-lg px-4 py-3 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">Display Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">person</span>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-background font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">Email address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-variant/40 border border-outline-variant/50 rounded-lg text-on-surface-variant font-body-md text-body-md cursor-not-allowed"
                />
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">Email cannot be changed.</p>
            </div>

            {/* Avatar Color */}
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-2">Avatar Color</label>
              <div className="flex flex-wrap gap-3">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    id={`color-${c.label.toLowerCase()}`}
                    onClick={() => setAvatarColor(c.value)}
                    title={c.label}
                    className="w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c.value, outline: avatarColor === c.value ? `3px solid ${c.value}` : "none", outlineOffset: "2px" }}
                  >
                    {avatarColor === c.value && (
                      <span className="material-symbols-outlined text-white text-[18px]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 py-2.5 px-4 rounded-lg border border-outline-variant text-on-background hover:bg-surface-variant transition-colors font-label-md text-label-md"
              >
                Cancel
              </button>
              <button
                id="profile-save"
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-on-primary hover:opacity-90 transition-all font-label-md text-label-md font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
