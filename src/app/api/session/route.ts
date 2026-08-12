import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPromptForPersona, PersonaType } from '@/lib/prompts';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the user session via Supabase
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    // 2. Accept personaType payload
    const body = await request.json();
    const personaType = body.personaType as PersonaType;

    if (!personaType) {
      return NextResponse.json({ error: 'Missing personaType in request body' }, { status: 400 });
    }

    // 3. Fetch matching system prompt
    const systemPrompt = getPromptForPersona(personaType);

    // 4. Retrieve Gemini API Key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ Missing GEMINI_API_KEY');
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // 5. Construct WebSocket URL for Gemini Live Multimodal Bidi API
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;

    return NextResponse.json({
      wsUrl,
      systemPrompt,
    });

  } catch (error: any) {
    console.error('Session Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
