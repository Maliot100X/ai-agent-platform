"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

interface Message {
  role: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
}

/**
 * Deepgram Voice Agent page.
 * Connects to wss://agent.deepgram.com/agent via WebSocket.
 * Streams microphone audio, receives transcription + TTS audio back.
 * The agent is configured as a crypto/PumpFun trading assistant.
 */
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
      // Get API key from server
      const tokenData = await apiFetch("/api/deepgram/token");
      if (tokenData.error) {
        setError(tokenData.error);
        return;
      }

      // Deepgram Voice Agent WebSocket
      // Correct endpoint: wss://agent.deepgram.com/v1/agent/converse
      const wsUrl = "wss://agent.deepgram.com/v1/agent/converse";
      // Browser WebSocket can't set headers, so use subprotocol auth
      const ws = new WebSocket(wsUrl, ["token", tokenData.key]);

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnected(true);
        addMessage("system", "Connected to Deepgram Voice Agent.");

        // Send Settings message matching Deepgram Voice Agent API spec
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
            language: "en",
            listen: {
              provider: {
                type: "deepgram",
                version: "v2",
                model: "nova-3",
              },
            },
            think: {
              provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
              },
              prompt: `#Role
You are FLUXMINT AI, a crypto trading voice assistant specializing in Solana and PumpFun tokens.

#Guidelines
Keep responses to 1-2 sentences and under 150 characters unless asked for detail.
Do not use markdown formatting.
Be direct, confident, and actionable.
Speak in a calm, conversational tone.

#Knowledge
You know about PumpFun token launches, bonding curves, graduation events, and Raydium listings.
You can discuss market caps, trading signals (BUY/SELL/HOLD), entry prices, take-profit, and stop-loss levels.
You understand Solana DeFi, DEX aggregators, and meme token trading.

#Style
Use plain language. No disclaimers. Mirror the user's energy level.
When asked about a token, mention: name, market cap, signal, and reasoning.`,
            },
            speak: {
              provider: {
                type: "deepgram",
                model: "aura-2-theia-en",
              },
            },
            greeting: "Hey, FLUXMINT AI here. What do you want to know about the markets today?",
          },
        };
        ws.send(JSON.stringify(settings));
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);

            // User transcript
            if (msg.type === "UserStartedSpeaking") {
              setListening(true);
              setTranscript("");
            }
            if (msg.type === "ConversationText" && msg.role === "user") {
              setTranscript(msg.content || "");
              if (msg.content) {
                addMessage("user", msg.content);
              }
            }
            if (msg.type === "UserStoppedSpeaking") {
              setListening(false);
            }

            // Agent response
            if (msg.type === "AgentStartedSpeaking") {
              setSpeaking(true);
              setAgentText("");
            }
            if (msg.type === "ConversationText" && msg.role === "assistant") {
              setAgentText(msg.content || "");
              if (msg.content) {
                addMessage("agent", msg.content);
              }
            }
            if (msg.type === "AgentStoppedSpeaking") {
              setSpeaking(false);
            }

            // Agent audio done
            if (msg.type === "AgentAudioDone") {
              setSpeaking(false);
            }
          } catch {
            // Not JSON, ignore
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Audio data from agent TTS - play it
          playAudio(event.data);
        } else if (event.data instanceof Blob) {
          playAudio(event.data);
        }
      };

      ws.onerror = (ev) => {
        console.error("Deepgram WS error:", ev);
        setError("WebSocket connection error. The Deepgram Voice Agent API may require Voice Agent access enabled on your account. Check console for details.");
        setConnected(false);
      };

      ws.onclose = (e) => {
        setConnected(false);
        setListening(false);
        setSpeaking(false);
        const reason = e.reason || (e.code === 1008 ? "Policy violation - API key may lack Voice Agent permissions" : "");
        if (e.code !== 1000) {
          const msg = `Disconnected (code: ${e.code}). ${reason}`;
          addMessage("system", msg);
          if (e.code === 1008 || e.code === 1003 || e.code === 4000) {
            setError(`Deepgram rejected connection (${e.code}): ${reason || "Ensure Voice Agent is enabled on your Deepgram account at console.deepgram.com"}`);
          }
        }
      };

      wsRef.current = ws;
    } catch (e: any) {
      setError(e.message);
    }
  }, [addMessage]);

  const playAudio = async (data: Blob | ArrayBuffer) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

      // Deepgram sends raw linear16 PCM at 24kHz
      const int16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // Audio playback error - silently ignore
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Analyser for volume visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          wsRef.current.send(int16.buffer);
        }

        // Update volume meter
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
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setListening(false);
    setVolume(0);
  };

  const toggleVoice = async () => {
    if (!connected) {
      await connectAgent();
      // Small delay for WS to connect before starting mic
      setTimeout(startMicrophone, 500);
    } else if (listening) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  const disconnect = () => {
    stopMicrophone();
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setConnected(false);
    addMessage("system", "Disconnected.");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
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
          <p className="text-[10px] text-slate-500 mt-1">STT: Nova-3</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${speaking ? "bg-purple-400 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-sm text-slate-300">{speaking ? "Speaking..." : "Silent"}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">TTS: Aura-2 Theia</p>
        </div>
      </div>

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
          {/* Volume ring */}
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
          
          {/* Mic icon */}
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {listening ? (
              // Stop icon
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              // Microphone icon
              <>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </>
            )}
          </svg>
        </motion.button>

        <p className="text-sm text-slate-400 mt-4">
          {!connected
            ? "Click to connect and start talking"
            : listening
              ? "Listening... Click to stop"
              : "Click to start talking"}
        </p>

        {connected && (
          <button
            onClick={disconnect}
            className="mt-2 px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
          >
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
            <p className="text-slate-500 mt-0.5">Deepgram Nova-3</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">AI Brain</p>
            <p className="text-slate-500 mt-0.5">GPT-4o Mini</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3">
            <p className="text-primary-400 font-medium">Text-to-Speech</p>
            <p className="text-slate-500 mt-0.5">Aura-2 Theia</p>
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
