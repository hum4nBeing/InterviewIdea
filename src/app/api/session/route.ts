import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPromptForPersona, PersonaType } from '@/lib/prompts';
import { createEphemeralWsUrl } from '@/lib/gemini';

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

    // 2. Parse payload (supports refreshOnly for minting a fresh token right before WS connect)
    const body = await request.json().catch(() => ({}));
    const refreshOnly = body?.refreshOnly === true;

    if (refreshOnly) {
      const wsUrl = await createEphemeralWsUrl();
      return NextResponse.json(
        { wsUrl },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const personaType = body?.personaType as PersonaType;
    if (!personaType) {
      return NextResponse.json({ error: 'Missing personaType in request body' }, { status: 400 });
    }

    // 3. Fetch matching system prompt and mint ephemeral WebSocket URL
    const systemPrompt = getPromptForPersona(personaType);
    const wsUrl = await createEphemeralWsUrl();

    return NextResponse.json(
      {
        wsUrl,
        systemPrompt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (error: any) {
    console.error('Session Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
