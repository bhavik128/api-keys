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
import { signUp } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/schemas/auth";

export function SignUpForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: "", name: "", password: "" },
    onSubmit: async ({ value }) => {
      const result = await signUp.email({
        email: value.email,
        name: value.name,
        password: value.password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Something went wrong. Try again.");
        return;
      }

      toast.success("Account created.");
      router.push("/");
      router.refresh();
    },
    validators: { onChange: signUpSchema },
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
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>
          Set up your account to start issuing API keys.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <AuthField autoComplete="name" field={field} label="Name" />
              )}
            </form.Field>

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
                  autoComplete="new-password"
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
                    Create account
                  </Button>
                )}
              </form.Subscribe>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-center text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
