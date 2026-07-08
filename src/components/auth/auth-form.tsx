"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": {
    altHref: "/sign-up",
    altLabel: "Sign up",
    altPrompt: "Need an account?",
    submit: "Sign in",
    subtitle: "Welcome back. Enter your credentials to continue.",
    title: "Sign in",
  },
  "sign-up": {
    altHref: "/sign-in",
    altLabel: "Sign in",
    altPrompt: "Already have an account?",
    submit: "Create account",
    subtitle: "Set up your account to start issuing API keys.",
    title: "Create account",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setPending(true);

      const form = new FormData(event.currentTarget);
      const email = String(form.get("email"));
      const password = String(form.get("password"));

      const result =
        mode === "sign-up"
          ? await signUp.email({
              email,
              name: String(form.get("name")),
              password,
            })
          : await signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }

      router.push("/");
      router.refresh();
    },
    [mode, router]
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        {mode === "sign-up" && (
          <div className="space-y-1.5">
            <label className="font-medium text-sm" htmlFor="name">
              Name
            </label>
            <Input autoComplete="name" id="name" name="name" required />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="email">
            Email
          </label>
          <Input
            autoComplete="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="password">
            Password
          </label>
          <Input
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "…" : copy.submit}
        </Button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        {copy.altPrompt}{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={copy.altHref}
        >
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
