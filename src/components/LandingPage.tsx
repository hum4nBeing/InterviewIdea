"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function LandingPage({ onStart }: { onStart: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Initial entrance animations
    gsap.fromTo(".floating-elem", 
      { y: 100, opacity: 0, rotateX: 20 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.15, ease: "power3.out" }
    );

    // Continuous floating animation
    gsap.to(".float-continuous", {
      y: -15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    gsap.to(".float-continuous-slow", {
      y: 20,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative min-h-screen bg-zinc-950 overflow-hidden flex items-center justify-center font-sans">
      
      {/* Deep Spatial Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950"></div>
        {/* Abstract Isometric Grids */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-zinc-800/30 rounded-full blur-3xl opacity-20 bg-cyan-500 float-continuous-slow" style={{ transform: 'perspective(1000px) rotateX(60deg) rotateZ(-45deg)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] border border-zinc-800/30 rounded-full blur-3xl opacity-20 bg-violet-600 float-continuous" style={{ transform: 'perspective(1000px) rotateX(60deg) rotateZ(45deg)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12 lg:py-0 flex flex-col lg:flex-row items-center gap-16 perspective-1000">
        
        {/* Left Content Area */}
        <div className="flex-1 w-full max-w-2xl text-left space-y-8 z-20">
          <div className="floating-elem space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-md text-xs font-semibold text-zinc-300 uppercase tracking-widest shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Next-Gen Preparation
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-[1.1] drop-shadow-2xl">
              Interview<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">Idea</span>
            </h1>
            <p className="text-lg md:text-2xl text-zinc-400 font-light max-w-lg leading-relaxed">
              AI Powered Interview Training. Face grueling, hyper-realistic technical interviews designed to push you to the limit.
            </p>
          </div>

          <div className="floating-elem pt-4">
            <Button 
              onClick={onStart}
              className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-sm bg-zinc-100 px-8 font-bold text-zinc-900 transition-all hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.2)]"
            >
              <span className="mr-2 uppercase tracking-wider">Start Training</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Button>
          </div>

          {/* Floating feature cards */}
          <div className="floating-elem grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            <div className="float-continuous p-6 rounded-sm bg-zinc-900/40 backdrop-blur-xl border border-zinc-700/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all hover:bg-zinc-800/50 hover:-translate-y-1 cursor-default">
              <div className="w-10 h-10 mb-4 rounded-sm bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-200 mb-2">Dynamic Prompts</h3>
              <p className="text-zinc-500 text-sm">Every interview adapts to your specific resume and GitHub profile.</p>
            </div>
            <div className="float-continuous-slow p-6 rounded-sm bg-zinc-900/40 backdrop-blur-xl border border-zinc-700/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all hover:bg-zinc-800/50 hover:-translate-y-1 cursor-default" style={{ animationDelay: '1s' }}>
              <div className="w-10 h-10 mb-4 rounded-sm bg-violet-500/20 flex items-center justify-center text-violet-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-200 mb-2">WebRTC Audio</h3>
              <p className="text-zinc-500 text-sm">Ultra-low latency live voice interaction utilizing cutting-edge WebRTC.</p>
            </div>
          </div>
        </div>

        {/* Right Content Area - Isometric 3D Image Container */}
        <div className="flex-1 w-full max-w-lg lg:max-w-xl floating-elem relative" style={{ perspective: '1200px' }}>
          <div className="relative w-full aspect-square float-continuous" style={{ transform: 'rotateY(-15deg) rotateX(10deg)', transformStyle: 'preserve-3d' }}>
            {/* Shadow layer */}
            <div className="absolute -inset-4 bg-cyan-500/10 blur-2xl rounded-sm translate-z-[-50px]"></div>
            
            {/* Main glassmorphic image container */}
            <div className="absolute inset-0 rounded-sm overflow-hidden border border-zinc-700/50 bg-zinc-800/30 backdrop-blur-md shadow-[20px_30px_60px_rgba(0,0,0,0.5)]">
              <Image 
                src="/interview_hero.png" 
                alt="AI Powered Interview Training" 
                fill
                className="object-cover object-center opacity-90 transition-transform duration-700 hover:scale-105"
                priority
              />
              {/* Glossy reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
            </div>

            {/* Floating accent elements */}
            <div className="absolute -right-8 top-1/4 w-24 h-24 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-sm shadow-2xl flex flex-col items-center justify-center float-continuous-slow" style={{ transform: 'translateZ(60px)' }}>
               <div className="text-2xl font-bold text-emerald-400">98%</div>
               <div className="text-xs text-zinc-400 font-semibold uppercase">Score</div>
            </div>
            
            <div className="absolute -left-12 bottom-1/3 w-32 p-3 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-sm shadow-2xl float-continuous" style={{ transform: 'translateZ(40px)' }}>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                   <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse"></div>
                 </div>
                 <div className="text-xs font-bold text-zinc-300">Live Feedback Active</div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
