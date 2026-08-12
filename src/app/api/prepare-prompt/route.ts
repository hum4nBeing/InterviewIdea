import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parsePdfBuffer } from '@/lib/cvParser';
import { fetchGitHubContext } from '@/lib/github';

// Simple in-memory rate limiter (limits per user.id)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT = 5; // Max 5 interviews per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate Limiting Check
    const now = Date.now();
    const userRateData = rateLimitMap.get(user.id) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    if (now > userRateData.resetTime) {
      userRateData.count = 1;
      userRateData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      userRateData.count++;
      if (userRateData.count > RATE_LIMIT) {
        return NextResponse.json({ error: 'Too many requests. Please wait a minute before generating another interview.' }, { status: 429 });
      }
    }
    rateLimitMap.set(user.id, userRateData);

    // Create an authenticated client to bypass RLS failures on insert
    const { createClient } = require('@supabase/supabase-js');
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const formData = await request.formData();
    const devMode = formData.get('devMode') === 'true';
    const cvFile = formData.get('cv') as File | null;
    const githubUsername = formData.get('githubUsername') as string | null;
    const targetRole = formData.get('targetRole') as string | null;

    if (devMode) {
      const generatedPrompt = `You are a mock AI interviewer. Test the user on basic concepts. Keep the interview very short.`;
      
      const { data: interviewData, error: insertError } = await authSupabase
        .from('interviews')
        .insert({ 
          user_id: user.id, 
          persona_type: (targetRole || 'dev-mode').toLowerCase().replace(/\s+/g, '-'), 
          status: 'in_progress',
          target_role: targetRole || 'Dev Mode',
          cv_text: 'Dev Mode Mock CV',
          github_username: null,
          generated_prompt: generatedPrompt
        })
        .select('id')
        .single();
        
      if (insertError) throw new Error(insertError.message);

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

      return NextResponse.json({
        interviewId: interviewData.id,
        systemPrompt: generatedPrompt,
        wsUrl
      });
    }

    if (!cvFile || !targetRole) {
      return NextResponse.json({ error: 'CV and targetRole are required' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (cvFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Resume file size must be under 5MB to prevent memory exhaustion.' }, { status: 400 });
    }

    // Parse CV
    const arrayBuffer = await cvFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cvText = await parsePdfBuffer(buffer);

    // Fetch GitHub Context
    let githubContext = 'No GitHub profile provided.';
    if (githubUsername) {
      githubContext = await fetchGitHubContext(githubUsername);
    }

    // Call Gemini for Prompt Synthesis
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    const metaPrompt = `You are a strict, highly technical senior engineering manager. Your task is to generate a SYSTEM INSTRUCTION (Prompt) for an AI Interviewer who will be interviewing a candidate for the role of "${targetRole}".

Here is the candidate's CV text:
<cv>
${cvText}
</cv>

Here is the candidate's GitHub profile context:
<github>
${githubContext}
</github>

Generate the system instruction for the AI Interviewer. 
The system instruction MUST heavily scrutinize their specific listed projects and experiences. If they list React, ask about React internals. If their GitHub shows a specific project, ask them to explain a challenging technical implementation from it.
If the candidate's GitHub or CV indicates competitive programming or algorithmic C++ experience, the AI MUST test them on string construction algorithms and specifically check if they can catch recursive state-management bugs (e.g., passing a 'last3' pointer instead of 'last2' during state propagation).

CRITICAL INTERVIEW STRUCTURE RULE: The AI MUST explicitly structure the interview in phases. 
Phase 1: The AI MUST first greet the candidate by name, warmly welcome them, and ask them to briefly introduce themselves, their background, and their education. 
Phase 2: Only after establishing this behavioral baseline and hearing their introduction should the AI transition into the rigorous technical grilling.

The AI interviewer must be concise and engaging.
Output ONLY the raw text for the system instruction, no markdown blocks, no intro or outro.`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: metaPrompt }] }]
      })
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini synthesis failed: ${await geminiRes.text()}`);
    }

    const geminiData = await geminiRes.json();
    const generatedPrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to synthesize prompt.';

    // Save to Supabase using the authenticated client
    const { data: interviewData, error: insertError } = await authSupabase
      .from('interviews')
      .insert({ 
        user_id: user.id, 
        persona_type: targetRole.toLowerCase().replace(/\s+/g, '-'), 
        status: 'in_progress',
        target_role: targetRole,
        cv_text: cvText,
        github_username: githubUsername,
        generated_prompt: generatedPrompt
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

    return NextResponse.json({
      interviewId: interviewData.id,
      systemPrompt: generatedPrompt,
      wsUrl
    });

  } catch (error: any) {
    console.error("prepare-prompt error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
