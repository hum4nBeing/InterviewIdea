import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter for evaluate
const evalRateLimitMap = new Map<string, { count: number, resetTime: number }>();
const EVAL_RATE_LIMIT = 10; // Max 10 evals per minute
const EVAL_RATE_LIMIT_WINDOW = 60 * 1000;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').trim();
    if (!supabaseUrl.startsWith('http')) supabaseUrl = 'https://placeholder.supabase.co';
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key').trim();

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate Limiting Check
    const now = Date.now();
    const userRateData = evalRateLimitMap.get(user.id) || { count: 0, resetTime: now + EVAL_RATE_LIMIT_WINDOW };
    if (now > userRateData.resetTime) {
      userRateData.count = 1;
      userRateData.resetTime = now + EVAL_RATE_LIMIT_WINDOW;
    } else {
      userRateData.count++;
      if (userRateData.count > EVAL_RATE_LIMIT) {
        return NextResponse.json({ error: 'Too many evaluation requests. Please wait a minute.' }, { status: 429 });
      }
    }
    evalRateLimitMap.set(user.id, userRateData);

    const body = await request.json();
    const { interviewId } = body;

    // Fetch interview details to get target_role and cv_text
    const { data: interview, error: intError } = await supabase
      .from('interviews')
      .select('target_role, cv_text')
      .eq('id', interviewId)
      .single();

    if (intError || !interview) {
      return NextResponse.json({ error: 'Failed to fetch interview details' }, { status: 400 });
    }

    // Fetch transcripts
    const { data: transcripts, error: fetchError } = await supabase
      .from('transcripts')
      .select('role, content')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });

    if (fetchError || !transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 400 });
    }

    const transcriptText = transcripts.map(t => `${t.role}: ${t.content}`).join('\n');

    // Call Gemini 3.5 Flash for Evaluation (Free Tier)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert technical interviewer evaluating a candidate for the role of "${interview.target_role || 'Candidate'}".
                
Candidate CV:
${interview.cv_text || 'No CV provided.'}

Transcript:
${transcriptText}

Evaluate the candidate's performance based on their CV and the transcript. 
If the transcript only contains the AI speaking or if the candidate is silent, you MUST STILL return the exact JSON structure. In this case, give scores of 0 and note the lack of candidate input in the strengths/areas for improvement.

Return the result STRICTLY as a valid JSON object matching this schema, without any markdown formatting, backticks, or intro text:
IMPORTANT: Do NOT include trailing commas. Ensure all quotes within string values are escaped.
{
  "overall_score": number (0-100),
  "competency_scores": [
    { "name": "Communication", "score": number (0-100) },
    { "name": "Technical Depth", "score": number (0-100) },
    { "name": "Problem Solving", "score": number (0-100) }
  ],
  "strengths": [ "string array" ],
  "areas_for_improvement": [ "string array" ]
}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error('Gemini evaluation failed:', errBody);
        throw new Error('Gemini evaluation failed: ' + errBody);
    }
    const aiData = await response.json();
    let rawText = aiData.candidates[0].content.parts[0].text;
    
    // JSON Corrector: Clean up hallucinated formatting and common syntax errors
    const sanitizeJSON = (str: string) => {
      let cleaned = str.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      // Extract just the JSON object if there's leading/trailing text
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
      
      // Fix trailing commas
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      
      // Fix unescaped double quotes inside strings by attempting to remove them (simple heuristic)
      // This is a common hallucination (e.g. "strengths": ["Good "communication" skills"])
      // Since a robust parser is heavy, extracting and cleaning trailing commas solves 90% of issues.
      return cleaned;
    };

    rawText = sanitizeJSON(rawText);
    
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON. Raw response:', rawText);
      // Fallback to a default scorecard so the UI doesn't crash
      result = {
        overall_score: 0,
        competency_scores: [
          { name: "Communication", score: 0 },
          { name: "Technical Depth", score: 0 },
          { name: "Problem Solving", score: 0 }
        ],
        strengths: ["Evaluation Engine Error"],
        areas_for_improvement: ["The AI failed to generate a valid scorecard. Please try again."]
      };
    }

    // Update Interview with score
    await supabase
      .from('interviews')
      .update({ 
        final_score: result.overall_score, 
        feedback_json: result,
        status: 'completed' 
      })
      .eq('id', interviewId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Evaluate Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
