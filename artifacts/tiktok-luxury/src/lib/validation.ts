// ────────────────────────────────────────────────────────────────────────────
//  Module 10 — Shared zod schemas for client-side input validation.
//
//  These run in the browser before data is sent to Supabase/api-server. They
//  are a UX safety net (catch typos early, consistent error copy) — they do
//  NOT replace server-side/RLS validation, which remains the source of truth.
// ────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const orgOrWorkspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty.")
  .max(120, "Name must be 120 characters or fewer.");

/** Returns the first validation error message, or null if the input is valid. */
export function firstIssueMessage(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid input.";
}
