"use client";

import type { AnyFieldApi } from "@tanstack/react-form";
import {
  type ChangeEvent,
  type HTMLInputTypeAttribute,
  useCallback,
} from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface AuthFieldProps {
  autoComplete: string;
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
}

export function AuthField({
  autoComplete,
  field,
  label,
  placeholder,
  type = "text",
}: AuthFieldProps) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.target.value);
    },
    [field]
  );

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        aria-invalid={isInvalid}
        autoComplete={autoComplete}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        type={type}
        value={field.state.value}
      />
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}
