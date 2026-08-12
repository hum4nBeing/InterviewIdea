"use client";

import { useState, useRef } from "react";
import { UploadCloud, Code, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function InterviewSetup({ onComplete }: { onComplete: (interviewId: string, systemPrompt: string, wsUrl: string) => void }) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [github, setGithub] = useState("");
  const [role, setRole] = useState("Full-Stack Engineer");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(".setup-elem",
      { y: 50, opacity: 0, rotateX: 10 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.15, ease: "power3.out" }
    );

    gsap.to(".float-continuous", {
      y: -15, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut"
    });

    gsap.to(".float-continuous-slow", {
      y: 20, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut"
    });
  }, { scope: containerRef });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      setError("Please upload your CV (PDF)");
      return;
    }
    setError("");
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('cv', cvFile);
      if (github) formData.append('githubUsername', github);
      formData.append('targetRole', role);

      const res = await fetch('/api/prepare-prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare interview");

      onComplete(data.interviewId, data.systemPrompt, data.wsUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDevSubmit = async () => {
    setError("");
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('devMode', 'true');
      formData.append('targetRole', role || 'Dev Test');

      const res = await fetch('/api/prepare-prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare interview");

      onComplete(data.interviewId, data.systemPrompt, data.wsUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full min-h-screen relative overflow-hidden flex items-center justify-center -mt-8 perspective-1200">

      {/* Deep Spatial Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-zinc-800/30 rounded-full blur-3xl opacity-20 bg-cyan-500 float-continuous-slow" style={{ transform: 'perspective(1000px) rotateX(60deg) rotateZ(-45deg)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] border border-zinc-800/30 rounded-full blur-3xl opacity-20 bg-violet-600 float-continuous" style={{ transform: 'perspective(1000px) rotateX(60deg) rotateZ(45deg)' }}></div>
      </div>

      <div className="w-full max-w-2xl mx-auto relative z-10">

        <div className="relative bg-zinc-900/40 backdrop-blur-sm border border-zinc-700/30 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] text-zinc-100 rounded-sm transition-transform duration-700 hover:rotate-x-1 hover:-translate-y-2 hover:scale-[1.01]" style={{ transformStyle: 'preserve-3d' }}>

          <div className="mb-10 text-center setup-elem" style={{ transform: 'translateZ(30px)' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-sm border border-zinc-700/50 bg-zinc-800/30 text-xs font-semibold text-zinc-300 uppercase tracking-widest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
              Dashboard
            </div>
            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Interview Setup</h2>
            <p className="text-zinc-400 mt-3 text-lg font-light">Upload your resume and GitHub profile to generate a hyper-personalized technical interview.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* CV Upload */}
            <div className="space-y-3 setup-elem">
              <label className="text-sm font-semibold flex items-center gap-2 text-zinc-300 uppercase tracking-wider">
                <UploadCloud className="w-4 h-4 text-cyan-400" /> Resume (PDF)
              </label>
              <label className={`group flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-sm cursor-pointer transition-all duration-300 shadow-inner ${cvFile ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/50 hover:bg-zinc-900/50'}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6 transition-transform duration-300 group-hover:-translate-y-1">
                  {cvFile ? (
                    <p className="text-sm text-cyan-400 font-bold">{cvFile.name}</p>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 mb-3 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                      <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-zinc-300">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-zinc-600 font-bold tracking-widest">PDF ONLY (MAX. 5MB)</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            {/* Target Role */}
            <div className="space-y-3 setup-elem" style={{ transform: 'translateZ(20px)' }}>
              <label className="text-sm font-semibold flex items-center gap-2 text-zinc-300 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-violet-400" /> Target Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-zinc-950/80 border border-zinc-700/50 rounded-sm p-4 text-zinc-100 focus:outline-none focus:border-cyan-500/50 hover:bg-zinc-900/80 transition-all shadow-inner placeholder:text-zinc-600"
                required
              />
            </div>

            {/* GitHub Username */}
            <div className="space-y-3 setup-elem" style={{ transform: 'translateZ(20px)' }}>
              <label className="text-sm font-semibold flex items-center gap-2 text-zinc-300 uppercase tracking-wider">
                <Code className="w-4 h-4 text-emerald-400" /> GitHub (Optional)
              </label>
              <input
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="e.g. torvalds"
                className="w-full bg-zinc-950/80 border border-zinc-700/50 rounded-sm p-4 text-zinc-100 focus:outline-none focus:border-cyan-500/50 hover:bg-zinc-900/80 transition-all shadow-inner placeholder:text-zinc-600"
              />
            </div>

            {error && <p className="setup-elem text-red-400 text-sm text-center font-bold bg-red-400/10 border border-red-400/20 py-3 rounded-sm shadow-inner" style={{ transform: 'translateZ(20px)' }}>{error}</p>}

            <div className="setup-elem pt-6 flex flex-col sm:flex-row gap-4" style={{ transform: 'translateZ(40px)' }}>
              {process.env.NEXT_PUBLIC_ENV !== 'production' && (
                <Button
                  type="button"
                  onClick={handleDevSubmit}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex-1 h-14 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-sm font-bold uppercase tracking-widest text-sm transition-all"
                >
                  Dev Mode (Skip Setup)
                </Button>
              )}
              <Button
                type="submit"
                disabled={isGenerating}
                className="group relative flex-[2] h-14 overflow-hidden rounded-sm bg-zinc-100 font-bold text-zinc-900 transition-all hover:bg-white active:scale-[0.99] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)] border-0 disabled:opacity-50"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Synthesizing (might take some time)...
                  </span>
                ) : (
                  <span className="flex items-center justify-center uppercase tracking-widest text-sm">
                    Generate & Start
                    <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

