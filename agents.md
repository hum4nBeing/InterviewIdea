# Antigravity Execution Plan: AI Interviewer Project

## Project Overview
You are an autonomous coding agent building a real-time AI Interviewer. The system will use Next.js (App Router) and Supabase, bypassing traditional backend bottlenecks by using an Ephemeral Token WebRTC pattern to stream audio directly from the browser to the Voice AI provider.

## Tech Stack Requirements
- **Frontend:** Next.js (App Router), React, TailwindCSS, Shadcn UI
- **Backend:** Next.js Serverless API Routes
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security)
- **Real-Time Audio:** WebRTC, `navigator.mediaDevices.getUserMedia`

## Enterprise Coding Standards & Rules
To ensure the codebase is scalable, maintainable, and enterprise-ready, you must strictly adhere to the following practices:
- **Modular Architecture:** Do not write everything in one single file. Divide the program into smaller, more easily handled sections and modules. Break the code into reusable, self-contained components.
- **Separation of Concerns:** Keep configuration files, complex business logic, UI components, and API routes strictly separated in their respective directories (e.g., `components/`, `lib/`, `app/api/`).
- **Single Responsibility:** Keep functions short and ensure they focus on a single task. Avoid deep nesting.
- **DRY & KISS Principles:** Do not repeat yourself; if logic is duplicated, extract it into a reusable function or module. Choose the simplest solution that solves the problem (Keep It Simple, Stupid).
- **Meaningful Naming Conventions:** Choose relevant, descriptive, and meaningful names for all variables, functions, and classes.

## Execution Phases

### Phase 1: Supabase Setup & Schema Integration
1. Initialize the Supabase client in `lib/supabase.ts`.
2. Generate SQL migrations for the following tables:
   - `interviews`: `id` (uuid), `user_id` (uuid, auth fk), `persona_type` (text), `status` (text), `final_score` (int).
   - `transcripts`: `id` (uuid), `interview_id` (uuid, fk), `role` (text: 'user' | 'ai'), `content` (text), `created_at` (timestamp).
3. Enforce Row Level Security (RLS) so users can only read/write their own interview rows.

### Phase 2: WebRTC Ephemeral Token Route
1. Create a serverless route at `app/api/session/route.ts`.
2. **Logic Flow:**
   - Authenticate the user session via Supabase.
   - Accept a `personaType` payload.
   - Fetch the matching system prompt (from Phase 4).
   - Request an Ephemeral Token from the Voice AI API (e.g., OpenAI/Gemini) using the injected prompt.
   - Return the token to the client.

### Phase 3: Frontend WebRTC Implementation
1. Create `components/InterviewRoom.tsx`.
2. **Implementation Details:**
   - On mount, request microphone access.
   - Fetch the Ephemeral Token from `/api/session`.
   - Initialize a `RTCPeerConnection` to the Voice API.
   - Listen to the WebRTC data channel for live transcript events and update local React state.
   - Create an "End Interview" trigger that bulk-inserts the transcript state into the Supabase `transcripts` table.

### Phase 4: Persona System Prompts (Seed Data)
Create a `lib/prompts.ts` file containing these exact persona instructions to be injected during Phase 2:
- **Full-Stack:** Focus on Next.js, WebRTC signaling states, and managing Supabase real-time subscriptions.
- **Algorithmic C++:** Focus on competitive programming logic. Actively test the user on recursive state management, specifically checking if they introduce bugs like incorrectly passing older state variables (e.g., using a `last3` pointer instead of `last2`). 
- **Computational Engineering:** Focus on numerical analysis. Evaluate the user on fluid dynamics expressions, strictly verifying if they correctly calculate specific diffusivity constants (e.g., the Schmidt number at exactly 1.8616 * 10^-5).

### Phase 5: Automated Evaluation Engine
1. Create `app/api/evaluate/route.ts`.
2. **Logic Flow:**
   - Triggered after the WebRTC connection closes.
   - Fetch the full text from the `transcripts` table.
   - Send the transcript to a text-based LLM with strict instructions to output a JSON rubric.
   - Update the `interviews` table with the final score and feedback.

## Agent Instructions
Execute these phases sequentially. Do not proceed to the WebRTC frontend (Phase 3) until the Supabase schema and token generation route (Phases 1 & 2) are fully functional.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
