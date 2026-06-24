"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await login({ username, password });
      saveSession(session);
      router.push("/dashboard");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-md border border-line bg-surface p-6 shadow-panel">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Bubbleworks</h1>
          <p className="mt-1 text-sm text-muted">Laundry Management</p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="focus-ring h-11 w-full rounded-md border border-line px-3"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring h-11 w-full rounded-md border border-line px-3"
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger">{error}</div> : null}
          <button
            type="submit"
            disabled={loading}
            className="focus-ring h-11 w-full rounded-md bg-brand px-4 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in" : "Sign In"}
          </button>
        </div>
      </form>
    </main>
  );
}
