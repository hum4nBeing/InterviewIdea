"use client";

import { useState, useEffect } from "react";
import { InterviewRoom } from "@/components/InterviewRoom";
import { InterviewSetup } from "@/components/InterviewSetup";
import { Scorecard, EvaluationJSON } from "@/components/Scorecard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LandingPage } from "@/components/LandingPage";

type AppState = 'home' | 'auth' | 'setup' | 'interview' | 'scorecard';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('home');
  const [session, setSession] = useState<any>(null);

  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationJSON | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAppState(prev => prev === 'auth' ? 'setup' : prev);
      }
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setAppState(prev => prev === 'auth' ? 'setup' : prev);
      } else {
        setAppState('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Check your email for the login link! (Or if email confirmations are off, you can now log in)');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleSetupComplete = (id: string, prompt: string, url: string) => {
    setInterviewId(id);
    setSystemPrompt(prompt);
    setWsUrl(url);
    setAppState('interview');
  };

  const handleInterviewComplete = (evalData: EvaluationJSON) => {
    setEvaluation(evalData);
    setAppState('scorecard');
  };

  const handleReset = () => {
    setAppState('home');
    setInterviewId(null);
    setSystemPrompt(null);
    setWsUrl(null);
    setEvaluation(null);
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-300">Loading...</div>;
  }

  if (appState === 'home') {
    return <LandingPage onStart={() => setAppState(session ? 'setup' : 'auth')} />;
  }

  if (!session || appState === 'auth') {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl p-8 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-zinc-800 space-y-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-center text-white">Sign In</h1>
          <p className="text-sm text-zinc-400 text-center font-medium">Authentication is required to save your interview transcripts.</p>
          <form className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-3 text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-3 text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                required
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button className="flex-1 rounded-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-300 font-bold tracking-wide" onClick={handleLogin}>LOG IN</Button>
              <Button variant="outline" className="flex-1 rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold tracking-wide" onClick={handleSignUp}>SIGN UP</Button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-zinc-950 flex flex-col items-center text-zinc-100">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">InterviewIdea</h1>
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
        </div>

        {appState === 'setup' && (
          <InterviewSetup onComplete={handleSetupComplete} />
        )}

        {appState === 'interview' && interviewId && systemPrompt && wsUrl && (
          <InterviewRoom
            interviewId={interviewId}
            systemPrompt={systemPrompt}
            wsUrl={wsUrl}
            onComplete={handleInterviewComplete}
            onCancel={handleReset}
          />
        )}

        {appState === 'scorecard' && evaluation && (
          <Scorecard evaluation={evaluation} onReset={handleReset} />
        )}
      </div>
    </main>
  );
}
