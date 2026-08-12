"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PersonaType } from '@/lib/prompts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { AudioVisualizer } from './AudioVisualizer';
import { EvaluationJSON } from './Scorecard';

interface TranscriptItem {
  role: 'user' | 'ai';
  content: string;
}

interface InterviewRoomProps {
  interviewId: string;
  systemPrompt: string;
  wsUrl: string;
  onComplete: (evaluation: EvaluationJSON) => void;
  onCancel: () => void;
}

export function InterviewRoom({ interviewId, systemPrompt, wsUrl, onComplete, onCancel }: InterviewRoomProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'evaluating' | 'completed'>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [audioChunksCount, setAudioChunksCount] = useState<number>(0);
  const [debugLog, setDebugLog] = useState<string>("Ready to start");
  const [connectionDropped, setConnectionDropped] = useState<boolean>(false);

  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [aiAnalyser, setAiAnalyser] = useState<AnalyserNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(".room-elem",
      { y: 50, opacity: 0, rotateX: 5 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.15, ease: "power3.out" }
    );

    gsap.to(".float-continuous", {
      y: -10, duration: 3.5, repeat: -1, yoyo: true, ease: "sine.inOut"
    });
  }, { scope: containerRef });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (connectionDropped && status === 'active') {
      setDebugLog("Connection lost. Generating scorecard with available data...");
      endInterview();
      setConnectionDropped(false);
    }
  }, [connectionDropped, status]);

  const startInterview = async () => {
    try {
      setStatus('connecting');
      setDebugLog("Authenticating user...");

      // 1. Check Auth
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // 2. Initialize Web Audio API for PCM playback (24kHz)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      if (!aiAnalyserRef.current) {
        const aiNode = audioCtx.createAnalyser();
        aiNode.fftSize = 256;
        aiNode.connect(audioCtx.destination);
        aiAnalyserRef.current = aiNode;
        setAiAnalyser(aiNode);
      }

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // 4. Setup Gemini Live WebSocket
      setDebugLog("Connecting to Gemini Live WebSocket...");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setDebugLog("WebSocket Connected! Transmitting setup...");
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        // Send Initial Setup Payload matching reference script
        const setupPayload = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Puck"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [
                { text: systemPrompt }
              ]
            }
          }
        };
        ws.send(JSON.stringify(setupPayload));

        // Send initial trigger prompt for greeting
        const initialGreeting = {
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text: "Hello. I am the candidate, and I am ready to begin the interview." }]
              }
            ],
            turnComplete: true
          }
        };
        ws.send(JSON.stringify(initialGreeting));
        setTranscripts([{ role: 'user', content: "Hello. I am the candidate, and I am ready to begin the interview." }]);

        setStatus('active');
        setDebugLog("Interview active - AI introducing...");


        startMicCapture(ws, audioCtx);
      };

      ws.onmessage = async (event) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else {
            data = JSON.parse(event.data);
          }

          const serverContent = data.serverContent || data.server_content;
          if (serverContent?.modelTurn?.parts || serverContent?.model_turn?.parts) {
            const parts = serverContent.modelTurn?.parts || serverContent.model_turn?.parts;
            for (const part of parts) {
              // Play Audio Part
              const inlineData = part.inlineData || part.inline_data;
              if (inlineData && inlineData.data) {
                setAudioChunksCount(prev => prev + 1);
                setDebugLog(`AI Speaking... (Chunk #${audioChunksCount + 1})`);
                playAudioChunk(inlineData.data, audioCtx);
              }
              // Handle text transcript
              if (part.text) {
                setTranscripts(prev => [...prev, { role: 'ai', content: part.text }]);
              }
            }
          }
        } catch (err) {
          console.error("❌ Error parsing message frame from server:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("💥 WebSocket Socket Level Error:", err);
        setDebugLog("WebSocket Socket Error");
      };

      ws.onclose = (e) => {
        console.log(`⚠️ Connection terminated by server. Code: ${e.code} | Reason: ${e.reason}`);
        if (e.code === 1007) {
          setDebugLog("Error 1007: Mic payload rejected by Gemini parser");
        } else if (e.code === 1008) {
          setDebugLog("Error 1008: Check model string or API Key permission");
        } else {
          setDebugLog(`WebSocket Closed (Code ${e.code})`);
        }
        setConnectionDropped(true);
      };

    } catch (error: any) {
      console.error("Failed to start interview:", error);
      alert("Error starting interview: " + (error?.message || "Check the console for details."));
      setDebugLog("Error: " + error?.message);
      setStatus('idle');
    }
  };

  // Capture user mic and stream 16-bit PCM forced to 16000Hz base64 chunks to Gemini
  const startMicCapture = async (ws: WebSocket, audioCtx: AudioContext) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      mediaStreamRef.current = stream;

      // Client-side Speech-to-Text for the User
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const currentTranscript = event.results[event.results.length - 1][0].transcript;
          setTranscripts(prev => [...prev, { role: 'user', content: currentTranscript }]);
        };

        recognition.onerror = (event: any) => console.error("Speech recognition error:", event.error);
        
        speechRecognitionRef.current = recognition;
        recognition.start(); 
      }

      // Force AudioContext to 16000Hz sample rate downsampling
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (inputContext.state === 'suspended') {
        await inputContext.resume();
      }

      const source = inputContext.createMediaStreamSource(stream);

      const micAnalyserNode = inputContext.createAnalyser();
      micAnalyserNode.fftSize = 256;
      source.connect(micAnalyserNode);
      setMicAnalyser(micAnalyserNode);

      // Create a ScriptProcessorNode to intercept audio
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to 16-bit PCM Int16Array
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert PCM Int16Array to Base64 safely
        const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        // Strict 16000Hz MIME type with modern audio block
        const audioPayload = {
          realtimeInput: {
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio
            }
          }
        };

        ws.send(JSON.stringify(audioPayload));
      };

      source.connect(processor);
      // Mute local feedback loop
      const gainNode = inputContext.createGain();
      gainNode.gain.value = 0;
      processor.connect(gainNode);
      gainNode.connect(inputContext.destination);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setDebugLog("Microphone Access Error");
    }
  };

  // Play 24kHz 16-bit PCM audio chunk received from Gemini securely
  const playAudioChunk = async (base64Data: string, audioCtx: AudioContext) => {
    try {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Safe DataView decoding for Int16 Little-Endian PCM
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const numSamples = Math.floor(bytes.byteLength / 2);
      if (numSamples === 0) return;

      const float32Array = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true); // Little endian
        float32Array[i] = int16 / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      if (aiAnalyserRef.current) {
        source.connect(aiAnalyserRef.current);
      } else {
        source.connect(audioCtx.destination);
      }

      const startTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  };

  const endInterview = async () => {
    setStatus('evaluating');
    setDebugLog("Evaluating interview performance...");

    // Close WebSocket & stop mic
    if (wsRef.current) wsRef.current.close();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }

    if (interviewId && transcripts.length > 0) {
      try {
        const transcriptInserts = transcripts.map(t => ({
          interview_id: interviewId,
          role: t.role,
          content: t.content
        }));

        await supabase.from('transcripts').insert(transcriptInserts);

        const evalResponse = await fetch('/api/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ interviewId })
        });
        if (evalResponse.ok) {
          const evalData = await evalResponse.json();
          onComplete(evalData);
        } else {
          const errData = await evalResponse.json().catch(() => ({}));
          console.error("Evaluation API error:", errData);
          setDebugLog(`Error generating scorecard: ${errData.error || 'Unknown error'}`);
          setStatus('completed'); // Still mark as completed so they can go home
          return; // Stop here so we don't say "Interview Completed!"
        }
      } catch (err: any) {
        console.error("Error ending interview", err);
        setDebugLog(`System Error: ${err.message}`);
        setStatus('completed');
        return;
      }
    }

    setStatus('completed');
    setDebugLog("Interview Completed!");
  };

  return (
    <div ref={containerRef} className="w-full min-h-screen -mt-12 flex flex-col items-center justify-center relative perspective-1200 overflow-hidden py-12">

      {/* Deep Spatial Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 opacity-50"></div>
        <div className="absolute top-0 right-1/4 w-[40rem] h-[40rem] bg-cyan-500/10 blur-[100px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 left-1/4 w-[40rem] h-[40rem] bg-violet-600/10 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-5xl mx-auto space-y-8 relative z-10" style={{ transformStyle: 'preserve-3d' }}>

        {status === 'active' && (
          <div className="room-elem relative z-20" style={{ transform: 'translateZ(60px)' }}>
            <AudioVisualizer micAnalyser={micAnalyser} aiAnalyser={aiAnalyser} />
          </div>
        )}

        <div className="room-elem relative w-full bg-zinc-900/30 backdrop-blur-3xl border border-zinc-700/20 text-zinc-100 shadow-[0_40px_100px_rgba(0,0,0,0.7)] rounded-sm overflow-hidden transition-transform duration-700 hover:rotate-x-1" style={{ transform: 'rotateX(5deg) translateZ(0px)', transformStyle: 'preserve-3d' }}>

          {/* Header */}
          <div className="border-b border-zinc-700/30 bg-zinc-800/20 px-8 py-5">
            <div className="text-2xl font-extrabold tracking-tight flex justify-between items-center bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              <span>Interview Session</span>
              <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] ${status === 'active' ? 'bg-emerald-400 shadow-emerald-400/50 animate-pulse' : 'bg-zinc-500'}`} />
                {status}
              </span>
            </div>
          </div>

          <div className="space-y-8 p-8">
            <div className="flex items-center justify-between" style={{ transform: 'translateZ(20px)' }}>
              <div className="text-sm font-semibold tracking-wide text-zinc-400 bg-zinc-950/40 backdrop-blur-md px-5 py-2.5 rounded-sm border border-zinc-700/50 shadow-inner">
                System Log: <span className="text-cyan-400 ml-2">{debugLog}</span>
              </div>

              <div className="flex items-center gap-4">
                {status === 'idle' && (
                  <>
                    <Button variant="outline" onClick={onCancel} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-sm font-bold tracking-wide uppercase">Return to Home</Button>
                    <Button onClick={startInterview} className="bg-cyan-600 hover:bg-cyan-500 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.4)] rounded-sm font-bold tracking-wide uppercase">Start Audio Stream</Button>
                  </>
                )}
                {status === 'active' && (
                  <Button variant="destructive" onClick={endInterview} className="bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] rounded-sm font-bold tracking-wide uppercase">End Interview</Button>
                )}
                {status === 'evaluating' && (
                  <Button disabled className="bg-zinc-800 text-zinc-400 border-0 rounded-sm font-bold tracking-wide uppercase">Evaluating...</Button>
                )}
                {status === 'completed' && (
                  <Button variant="outline" onClick={onCancel} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-sm font-bold tracking-wide uppercase">Return to Home</Button>
                )}
              </div>
            </div>
          </div>

          {/* Transcript Area */}
          <div className="bg-zinc-950/40 backdrop-blur-xl border-t border-zinc-700/30 p-8 h-[550px] overflow-y-auto space-y-8 shadow-[inset_0_20px_40px_rgba(0,0,0,0.4)] relative">
            {status === 'evaluating' && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md">
                <Loader2 className="w-14 h-14 text-cyan-400 animate-spin mb-5 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                <h3 className="text-2xl font-extrabold text-white tracking-wider">Generating Scorecard</h3>
                <p className="text-sm text-cyan-400 mt-2 font-semibold tracking-widest uppercase">Analyzing Technical Responses...</p>
              </div>
            )}

            {transcripts.map((t, i) => (
              <div key={i} className={`float-continuous p-6 rounded-sm max-w-[80%] shadow-[0_20px_40px_rgba(0,0,0,0.4)] border backdrop-blur-2xl ${t.role === 'ai' ? 'bg-zinc-800/50 border-zinc-700/40 mr-auto' : 'bg-cyan-950/50 border-cyan-900/40 ml-auto'}`} style={{ animationDelay: `${i * 0.2}s`, transform: 'translateZ(30px)' }}>
                <div className={`text-[10px] font-bold mb-3 uppercase tracking-widest flex items-center gap-2 ${t.role === 'ai' ? 'text-violet-400' : 'text-cyan-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${t.role === 'ai' ? 'bg-violet-400' : 'bg-cyan-400'}`}></div>
                  {t.role === 'ai' ? 'AI Interviewer' : 'You'}
                </div>
                <div className="text-base text-zinc-100 leading-relaxed font-light tracking-wide">{t.content}</div>
              </div>
            ))}
            {transcripts.length === 0 && status !== 'active' && (
              <div className="text-center text-zinc-500 mt-32 flex flex-col items-center float-continuous">
                <div className="w-20 h-20 mb-6 rounded-full bg-zinc-800/30 flex items-center justify-center border border-zinc-700/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                  <span className="text-3xl opacity-50">🎙️</span>
                </div>
                <p className="text-lg font-light tracking-wide">No transcripts yet. Start the audio stream!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
