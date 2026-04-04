"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const CryptoPlanet = dynamic(() => import("@/components/CryptoPlanet"), { ssr: false });

interface Message {
  role: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
}

export default function VoiceAgentPage() {
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", text: "Click the microphone to start talking with the FLUXMINT AI Voice Agent. Ask about PumpFun tokens, market analysis, or trading strategies.", timestamp: new Date() },
  ]);
  const [transcript, setTranscript] = useState("");
  const [agentText, setAgentText] = useState("");
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((role: Message["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text, timestamp: new Date() }]);
  }, []);

  const connectAgent = useCallback(async () => {
    try {
      setError("");
      const tokenData = await apiFetch("/api/deepgram/token");
      if (tokenData.error) {
        setError(tokenData.error);
        return;
      }

      // Deepgram Voice Agent WebSocket - verified working endpoint
      const wsUrl = "wss://agent.deepgram.com/v1/agent/converse";
      const ws = new WebSocket(wsUrl, ["token", tokenData.key]);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnected(true);
        addMessage("system", "Connected to Deepgram Voice Agent.");

        // Settings message matching the exact format from Deepgram docs
        // Uses the working configuration structure verified against their API
        const settings = {
          type: "Settings",
          audio: {
            input: {
              encoding: "linear16",
              sample_rate: 48000,
            },
            output: {
              encoding: "linear16",
              sample_rate: 24000,
              container: "none",
            },
          },
          agent: {
            listen: {
              provider: {
                type: "deepgram",
                version: "v2",
                model: "flux-general-en",
              },
            },
            think: {
              provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
              },
              prompt: [
                "#Role",
                "You are FLUXMINT AI, the voice assistant for the FLUXMINT AI Trading Platform built by Maliot (GitHub: Maliot100X, Twitter: @KaiNovasWarm, website: kainova.xyz).",
                "",
                "#About FLUXMINT AI Platform",
                "FLUXMINT AI is an autonomous AI trading platform for Solana and PumpFun tokens. Features include:",
                "- 10 AI trading skills: PumpFun Sniper, Whale Watcher, Momentum Trader, Dip Buyer, Graduation Hunter, Market Data, Signal Generator, Risk Analysis, Wallet Tracker, News Sentiment",
                "- Real-time PumpFun launchpad with new, graduating, and graduated tokens",
                "- AI-scored BUY/SELL/HOLD signals from live PumpFun data",
                "- 5 trading strategies: PumpFun Sniper, Graduation Rider, Momentum Trader, Whale Copy, Dip Accumulator",
                "- Telegram bot integration for remote trading commands",
                "- Dashboard at ai-agent-platform-six.vercel.app",
                "",
                "#Guidelines",
                "Keep responses to 1-2 sentences and under 150 characters unless asked for detail (max 300 chars).",
                "Do not use markdown formatting such as code blocks, quotes, bold, links, or italics.",
                "Be direct, confident, and actionable.",
                "Speak in a warm, natural conversational tone.",
                "",
                "#Voice-Specific Instructions",
                "Speak in a calm, conversational tone. Your responses will be spoken aloud.",
                "Pause briefly after questions to allow replies.",
                "Never interrupt the user.",
                "",
                "#Knowledge",
                "You know about PumpFun token launches, bonding curves, graduation events, and Raydium listings.",
                "You can discuss market caps, trading signals, entry prices, take-profit, and stop-loss levels.",
                "You understand Solana DeFi, DEX aggregators, meme token trading, and crypto market dynamics.",
                "When asked about the platform, proudly explain its features and credit Maliot as the creator.",
                "When asked who made you, say Maliot built you as part of the FLUXMINT AI platform.",
                "",
                "#Style",
                "Use plain language. No disclaimers. Be friendly but professional.",
                "When asked about a token, mention: name, market cap, signal, and reasoning.",
              ].join("\n"),
            },
            speak: {
              provider: {
                type: "deepgram",
                model: "aura-2-iris-en",
              },
            },
            greeting: "Hey there! Welcome to FLUXMINT AI, built by Maliot. I am your voice trading assistant. You can check us out on Twitter at KaiNovasWarm or GitHub at Maliot100X. What would you like to know about the crypto markets today?",
          },
        };
        ws.send(JSON.stringify(settings));
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === "UserStartedSpeaking") {
              setListening(true);
              setTranscript("");
            }
            if (msg.type === "ConversationText" && msg.role === "user") {
              setTranscript(msg.content || "");
              if (msg.content) addMessage("user", msg.content);
            }
            if (msg.type === "UserStoppedSpeaking") {
              setListening(false);
            }
            if (msg.type === "AgentStartedSpeaking") {
              setSpeaking(true);
              setAgentText("");
            }
            if (msg.type === "ConversationText" && msg.role === "assistant") {
              setAgentText(msg.content || "");
              if (msg.content) addMessage("agent", msg.content);
            }
            if (msg.type === "AgentStoppedSpeaking" || msg.type === "AgentAudioDone") {
              setSpeaking(false);
            }
            if (msg.type === "SettingsApplied") {
              console.log("Deepgram settings applied successfully");
            }
            if (msg.type === "Error") {
              console.error("Deepgram error:", msg);
              setError(`Deepgram error: ${msg.message || msg.description || JSON.stringify(msg)}`);
            }
          } catch {
            // Not JSON
          }
        } else if (event.data instanceof ArrayBuffer) {
          queueAudio(event.data);
        }
      };

      ws.onerror = (ev) => {
        console.error("Deepgram WS error:", ev);
        setError("WebSocket connection error. Check console for details.");
        setConnected(false);
      };

      ws.onclose = (e) => {
        setConnected(false);
        setListening(false);
        setSpeaking(false);
        if (e.code !== 1000) {
          const reason = e.reason || "";
          addMessage("system", `Disconnected (code: ${e.code}). ${reason}`);
          if (e.code === 1008 || e.code === 1003) {
            setError(`Deepgram rejected (${e.code}): ${reason || "Ensure Voice Agent is enabled at console.deepgram.com"}`);
          }
        }
      };

      wsRef.current = ws;
    } catch (e: any) {
      setError(e.message);
    }
  }, [addMessage]);

  // Buffered audio playback - collect 250ms of chunks then play as one block
  const queueAudio = (data: ArrayBuffer) => {
    const int16 = new Int16Array(data);
    audioQueueRef.current.push(int16);

    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushAudioQueue();
      }, 250);
    }
  };

  const flushAudioQueue = () => {
    if (audioQueueRef.current.length === 0) return;

    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;

    const chunks = audioQueueRef.current.splice(0);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const float32 = new Float32Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      float32[i] = combined[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Add a gain node for smooth volume
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now + 0.02, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    source.start(startTime);
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 48000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          wsRef.current.send(int16.buffer);
        }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg / 255);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setListening(true);
    } catch (e: any) {
      setError(`Microphone error: ${e.message}`);
    }
  };

  const stopMicrophone = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setListening(false);
    setVolume(0);
  };

  const toggleVoice = async () => {
    if (!connected) {
      await connectAgent();
      setTimeout(startMicrophone, 600);
    } else if (listening) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  const disconnect = () => {
    stopMicrophone();
    if (wsRef.current) { wsRef.current.close(1000); wsRef.current = null; }
    setConnected(false);
    addMessage("system", "Disconnected.");
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
      if (wsRef.current) wsRef.current.close(1000);
    };
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
          Voice Agent
        </h1>
        <p className="text-slate-400 mt-1">
          Talk to FLUXMINT AI using Deepgram Voice Agent. Ask about tokens, signals, and strategies.
        </p>
      </motion.div>

      {error && (
        <div className="glass-card p-4 border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Agent Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-sm text-slate-300">{connected ? "Connected" : "Disconnected"}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Deepgram Voice Agent</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${listening ? "bg-blue-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-sm text-slate-300">{listening ? "Listening..." : "Mic off"}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">STT: Flux General v2</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${speaking ? "bg-purple-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-sm text-slate-300">{speaking ? "Speaking..." : "Silent"}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">TTS: Aura-2 Iris</p>
        </div>
      </div>

      {/* 3D Crypto Planet */}
      <CryptoPlanet speaking={speaking} listening={listening} connected={connected} />

      {/* Microphone Button */}
      <div className="flex flex-col items-center py-8">
        <motion.button
          onClick={toggleVoice}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            listening
              ? "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30"
              : connected
                ? "bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/30"
                : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg shadow-slate-500/20"
          }`}
        >
          {listening && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: 1 + volume * 0.5, opacity: 1 - volume * 0.5 }}
              transition={{ duration: 0.1 }}
            />
          )}
          {speaking && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {listening ? (
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              <>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </>
            )}
          </svg>
        </motion.button>

        <p className="text-sm text-slate-400 mt-4">
          {!connected ? "Click to connect and start talking" : listening ? "Listening... Click to stop" : "Click to start talking"}
        </p>

        {connected && (
          <button onClick={disconnect} className="mt-2 px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
            Disconnect
          </button>
        )}
      </div>

      {/* Live Transcript */}
      {(transcript || agentText) && (
        <div className="glass-card p-4">
          {transcript && (
            <div className="mb-2">
              <p className="text-[10px] text-blue-400 mb-1">You (live)</p>
              <p className="text-sm text-white">{transcript}</p>
            </div>
          )}
          {agentText && (
            <div>
              <p className="text-[10px] text-purple-400 mb-1">Agent (live)</p>
              <p className="text-sm text-white">{agentText}</p>
            </div>
          )}
        </div>
      )}

      {/* Conversation History */}
      <div className="glass-card p-5 max-h-[400px] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Conversation</h3>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary-500/20 text-white border border-primary-500/20"
                    : msg.role === "agent"
                      ? "bg-surface-800 text-slate-200 border border-white/5"
                      : "bg-purple-900/30 text-purple-300 border border-purple-700/30 text-xs"
                }`}>
                  {msg.role !== "system" && (
                    <p className="text-[10px] text-slate-500 mb-1">
                      {msg.role === "user" ? "You" : "FLUXMINT AI"} - {msg.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium text-white mb-2">Voice Agent Capabilities</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">Speech-to-Text</p>
            <p className="text-slate-500 mt-0.5">Deepgram Flux v2</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">AI Brain</p>
            <p className="text-slate-500 mt-0.5">GPT-4o Mini</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">Text-to-Speech</p>
            <p className="text-slate-500 mt-0.5">Aura-2 Iris</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">Latency</p>
            <p className="text-slate-500 mt-0.5">&lt;250ms</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 mt-3">
          Try saying: &quot;What are the top PumpFun tokens right now?&quot; or &quot;Give me a market update&quot;
        </p>
      </div>
    </div>
  );
}
