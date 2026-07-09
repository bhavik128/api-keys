"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SyntheticEvent, useCallback } from "react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";
import { signInSchema } from "@/lib/schemas/auth";

export function SignInForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const result = await signIn.email({
        email: value.email,
        password: value.password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Something went wrong. Try again.");
        return;
      }

      toast.success("Signed in.");
      router.push("/");
      router.refresh();
    },
    validators: { onChange: signInSchema },
  });

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      form.handleSubmit();
    },
    [form]
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Welcome back. Enter your credentials to continue.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <form.Field name="email">
              {(field) => (
                <AuthField
                  autoComplete="email"
                  field={field}
                  label="Email"
                  placeholder="you@example.com"
                  type="email"
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <AuthField
                  autoComplete="current-password"
                  field={field}
                  label="Password"
                  type="password"
                />
              )}
            </form.Field>

            <Field>
              <form.Subscribe>
                {(state) => (
                  <Button
                    className="w-full"
                    disabled={!state.canSubmit || state.isSubmitting}
                    type="submit"
                  >
                    {state.isSubmitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Sign in
                  </Button>
                )}
              </form.Subscribe>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-center text-muted-foreground text-sm">
          Need an account?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/sign-up"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
