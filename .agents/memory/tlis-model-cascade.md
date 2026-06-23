---
name: TLIS Gemini model cascade
description: Correct model fallback order for billing-enabled Gemini API projects
---

## The rule
MODEL_CASCADE = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

Do NOT include `gemini-2.0-flash-lite` — it returns 404 on billing-enabled projects.

## Why
The API key is on a billing-enabled GCP project. Flash-lite was deprecated/removed on billing projects. The cascade tries each model in order, so the most capable/cheapest-per-token model goes first.

## How to apply
Any time model references change in `artifacts/api-server/src/routes/generate.ts`, verify against this list. The cascade is defined near the top of the file as `MODEL_CASCADE`.
