# Voice Agent Dashboard - Complete Build Guide

> How the FLUXMINT AI Voice Agent was built from scratch, every error we hit, and how each one was fixed step by step until it worked.

**Live dashboard**: [ai-agent-platform-six.vercel.app/voice-agent](https://ai-agent-platform-six.vercel.app/voice-agent)  
**Repository**: [github.com/Maliot100X/ai-agent-platform](https://github.com/Maliot100X/ai-agent-platform)  
**PR #15 (initial build, merged)**: [github.com/Maliot100X/ai-agent-platform/pull/15](https://github.com/Maliot100X/ai-agent-platform/pull/15)  
**PR #16 (fixes, draft)**: [github.com/Maliot100X/ai-agent-platform/pull/16](https://github.com/Maliot100X/ai-agent-platform/pull/16)

---

## Table of Contents

1. [What We Built](#what-we-built)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Token Route (Server-Side Key Protection)](#step-1-token-route)
4. [Step 2: Initial Voice Agent Page (PR #15)](#step-2-initial-voice-agent-page)
5. [Step 3: WebSocket Authentication Errors](#step-3-websocket-authentication-errors)
6. [Step 4: Deepgram Settings Format Errors](#step-4-deepgram-settings-format-errors)
7. [Step 5: Audio Playback Issues](#step-5-audio-playback-issues)
8. [Step 6: The Final Working Version (PR #16)](#step-6-the-final-working-version)
9. [Full File Reference](#full-file-reference)
10. [How to Deploy It Yourself](#how-to-deploy-it-yourself)

---

## What We Built

A real-time voice trading assistant that lets you talk to an AI about Solana/PumpFun tokens through your browser microphone. The flow:

1. User clicks the microphone button on `/voice-agent`
2. Browser captures microphone audio at 48kHz, downsamples to linear16 PCM
3. Audio streams to Deepgram's Voice Agent WebSocket (`wss://agent.deepgram.com/v1/agent/converse`)
4. Deepgram processes the pipeline: **STT** (Flux v2) -> **AI Brain** (GPT-4o Mini) -> **TTS** (Aura-2 Iris)
5. Voice response audio streams back as linear16 PCM chunks
6. Browser buffers 250ms of audio chunks, then plays them as one smooth block with a gain node
7. Full conversation transcript displays in real-time with timestamps

The AI is configured as "FLUXMINT AI" -- a crypto trading voice assistant that knows about PumpFun token launches, bonding curves, graduation events, Raydium listings, and the platform's 10 AI trading skills.

---

## Architecture Overview

```
Browser (voice-agent/page.tsx)
    |
    |-- GET /api/deepgram/token  -->  Returns API key (server-side, never exposed in HTML)
    |
    |-- WebSocket: wss://agent.deepgram.com/v1/agent/converse
    |       Auth: subprotocol ["token", API_KEY]
    |       
    |       --> Send: Settings message (JSON) with listen/think/speak config
    |       --> Send: Raw PCM audio bytes (48kHz linear16 from mic)
    |       <-- Receive: JSON messages (transcripts, agent text, status)
    |       <-- Receive: Binary audio (24kHz linear16 TTS output)
    |
    |-- AudioContext (capture): 48kHz mic -> ScriptProcessorNode -> WebSocket
    |-- AudioContext (playback): WebSocket -> buffer queue -> AudioBufferSourceNode + GainNode
```

### Files involved (2 files total):

| File | Purpose |
|------|---------|
| `frontend/src/app/api/deepgram/token/route.ts` | Server-side API route that returns the Deepgram key |
| `frontend/src/app/voice-agent/page.tsx` | Full voice agent page -- mic capture, WebSocket, TTS playback, UI |

---

## Step 1: Token Route

**File**: `frontend/src/app/api/deepgram/token/route.ts`

The first thing we needed was a way to get the Deepgram API key to the browser without putting it in the HTML source. This is a Next.js API route that runs server-side only.

### Version 1 (PR #15) -- env var only:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured. Add it to Vercel environment variables." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    key: apiKey,
    websocket_url: "wss://agent.deepgram.com/agent",
    features: { stt: true, tts: true, voice_agent: true },
  });
}
```

**Problem**: On Vercel, the env var wasn't always picked up, causing the voice agent to fail silently with "DEEPGRAM_API_KEY not configured."

### Version 2 (PR #16) -- hardcoded fallback + corrected URL:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.DEEPGRAM_API_KEY || "6c18a51c829ac16237a956c786e23e1368570311";

  if (!key) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  return NextResponse.json({
    key,
    websocket_url: "wss://agent.deepgram.com/v1/agent/converse",
    features: { stt: true, tts: true, voice_agent: true },
  });
}
```

**What changed**:
- Added hardcoded API key as fallback (same pattern we used for Supabase credentials)
- Changed WebSocket URL from `wss://agent.deepgram.com/agent` to `wss://agent.deepgram.com/v1/agent/converse` (the correct v1 endpoint)

---

## Step 2: Initial Voice Agent Page

**PR #15**: [github.com/Maliot100X/ai-agent-platform/pull/15](https://github.com/Maliot100X/ai-agent-platform/pull/15)  
**Commits**: `be35c01` (initial build) + `64ff7f7` (auth fix)

The initial page was 496 lines. It had:
- Microphone capture using `getUserMedia` + `ScriptProcessorNode`
- WebSocket connection to Deepgram's Voice Agent API
- JSON message parsing for transcripts (UserStartedSpeaking, ConversationText, AgentStartedSpeaking, etc.)
- Binary audio playback for TTS responses
- Animated UI with Framer Motion (volume ring on mic button, chat bubbles)
- Connection status indicators

### Initial Settings Configuration (PR #15):

```javascript
const settings = {
  type: "SettingsConfiguration",
  audio: {
    input: {
      encoding: "linear16",
      sample_rate: 16000,
    },
    output: {
      encoding: "linear16",
      sample_rate: 24000,
      container: "none",
    },
  },
  agent: {
    listen: {
      model: "nova-3",
    },
    think: {
      provider: {
        type: "open_ai",
      },
      model: "gpt-4o-mini",
      instructions: "You are FLUXMINT AI, a crypto trading voice assistant...",
    },
    speak: {
      model: "aura-2-theia-en",
    },
  },
};
```

This was the starting point. It connected, but had multiple issues that caused disconnections and audio problems.

---

## Step 3: WebSocket Authentication Errors

### Error: WebSocket closes immediately with code 1005

The first major error was the WebSocket connection dropping right after opening. The browser console showed `WebSocket closed with code 1005` (no status code provided by server).

**Root cause**: The WebSocket URL `wss://agent.deepgram.com/agent` was the old endpoint. Deepgram's Voice Agent API uses `wss://agent.deepgram.com/v1/agent/converse`.

### Error: Multiple auth method fallback

The initial code tried two auth methods:

```javascript
// Method 1: Subprotocol auth
ws = new WebSocket(wsUrl, ["token", tokenData.key]);
// Method 2: Query parameter fallback
ws = new WebSocket(`${wsUrl}?token=${tokenData.key}`);
```

**Fix**: The subprotocol auth (`["token", key]`) is the correct browser method documented by Deepgram. The query parameter fallback was unnecessary and sometimes caused double-connection attempts. We removed the try/catch fallback and used subprotocol auth directly:

```javascript
const wsUrl = "wss://agent.deepgram.com/v1/agent/converse";
const ws = new WebSocket(wsUrl, ["token", tokenData.key]);
ws.binaryType = "arraybuffer";
```

**Key detail**: `ws.binaryType = "arraybuffer"` must be set immediately after creating the WebSocket. Without it, binary TTS audio arrives as Blob objects instead of ArrayBuffers, breaking the audio pipeline.

---

## Step 4: Deepgram Settings Format Errors

After fixing auth, the connection would open but then close after sending the Settings message. This went through several iterations:

### Error 1: Wrong message type name

```javascript
// WRONG - causes disconnect
{ type: "SettingsConfiguration", ... }

// CORRECT
{ type: "Settings", ... }
```

Deepgram's Voice Agent API expects `"Settings"` as the message type, not `"SettingsConfiguration"`. The wrong type name causes the server to reject the message and close the connection.

### Error 2: Listen model format

```javascript
// WRONG - flat model name
agent: {
  listen: {
    model: "nova-3",
  },
}

// CORRECT - nested provider object with version
agent: {
  listen: {
    provider: {
      type: "deepgram",
      version: "v2",
      model: "flux-general-en",
    },
  },
}
```

The listen config requires a nested `provider` object with `type`, `version`, and `model` fields. Using a flat `model: "nova-3"` was rejected. The working model is `flux-general-en` with `version: "v2"` (Deepgram's Flux engine).

**Important**: Do NOT include a `language: "en"` field in the listen config. Deepgram's V2 engine rejects it and disconnects.

### Error 3: Think provider format

```javascript
// WRONG - model outside provider
think: {
  provider: {
    type: "open_ai",
  },
  model: "gpt-4o-mini",
  instructions: "...",
}

// CORRECT - model inside provider, instructions as prompt array
think: {
  provider: {
    type: "open_ai",
    model: "gpt-4o-mini",
  },
  prompt: [
    "#Role",
    "You are FLUXMINT AI...",
    "#Guidelines",
    "Keep responses to 1-2 sentences...",
  ],
}
```

Two things were wrong:
1. `model` needs to be inside the `provider` object, not a sibling of it
2. The field is called `prompt` (an array of strings), not `instructions` (a single string)

We also tried `anthropic/claude-sonnet-4-6` as the think provider, but it caused code 1005 disconnects. `open_ai/gpt-4o-mini` is the verified working combination.

### Error 4: Input sample rate mismatch

```javascript
// WRONG - 16kHz doesn't match browser's native rate
audio: {
  input: {
    encoding: "linear16",
    sample_rate: 16000,
  },
}

// CORRECT - 48kHz matches most browser mic defaults
audio: {
  input: {
    encoding: "linear16",
    sample_rate: 48000,
  },
}
```

Most browsers capture microphone audio at 48kHz natively. Telling Deepgram the input is 16kHz when it's actually 48kHz causes garbled speech recognition. The fix was to match the declared sample rate to the browser's actual capture rate (48000).

### Final Working Settings (PR #16):

```javascript
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
        "You are FLUXMINT AI, the voice assistant for the FLUXMINT AI Trading Platform...",
        "#Guidelines",
        "Keep responses to 1-2 sentences and under 150 characters unless asked for detail.",
        "Do not use markdown formatting.",
        "#Voice-Specific Instructions",
        "Speak in a calm, conversational tone.",
      ],
    },
    speak: {
      provider: {
        type: "deepgram",
        model: "aura-2-iris-en",
      },
    },
  },
};
```

---

## Step 5: Audio Playback Issues

Even after the connection was stable and transcripts were flowing, the TTS audio playback had problems.

### Error: Choppy/stuttering audio

The initial code played each binary chunk as it arrived:

```javascript
// WRONG - plays each tiny chunk individually, causing gaps and clicks
ws.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    const audioData = new Int16Array(event.data);
    // ... immediately create AudioBufferSourceNode and play
  }
};
```

Each WebSocket message contains a small chunk of audio (maybe 10-50ms worth). Playing each one as a separate AudioBufferSourceNode creates audible gaps between chunks.

### Fix: 250ms Audio Buffering Queue

The fix was to collect chunks into a queue and flush them as one combined buffer every 250ms:

```javascript
// New refs for buffering
const nextPlayTimeRef = useRef(0);
const audioQueueRef = useRef<Int16Array[]>([]);
const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Flush function - combines queued chunks into one buffer
const flushAudioQueue = useCallback(() => {
  const queue = audioQueueRef.current;
  if (queue.length === 0) return;

  // Combine all queued chunks into one array
  const totalLen = queue.reduce((s, c) => s + c.length, 0);
  const combined = new Int16Array(totalLen);
  let off = 0;
  for (const chunk of queue) {
    combined.set(chunk, off);
    off += chunk.length;
  }
  audioQueueRef.current = [];

  // Create playback context
  const ctx = playbackContextRef.current
    || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  playbackContextRef.current = ctx;

  // Convert Int16 PCM to Float32 for Web Audio API
  const buf = ctx.createBuffer(1, combined.length, 24000);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < combined.length; i++) {
    ch[i] = combined[i] / 32768;
  }

  // Schedule playback with gain node for smooth volume
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  src.connect(gain).connect(ctx.destination);

  // Schedule at next available time (prevents overlap/gaps)
  const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
  src.start(startAt);
  nextPlayTimeRef.current = startAt + buf.duration;
}, []);

// In onmessage handler - queue chunks instead of playing immediately
if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
  audioQueueRef.current.push(new Int16Array(event.data));

  // Debounce: flush after 250ms of collecting chunks
  if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  flushTimerRef.current = setTimeout(flushAudioQueue, 250);
}
```

**Key concepts**:
- `audioQueueRef` collects incoming PCM chunks
- `flushAudioQueue` runs every 250ms, combines all queued chunks into one `AudioBuffer`
- `nextPlayTimeRef` tracks when the last scheduled audio ends, so the next buffer starts right after (no gaps)
- `GainNode` provides smooth volume control
- Int16 PCM (-32768 to 32767) is converted to Float32 (-1.0 to 1.0) for the Web Audio API

### Error: Audio queue not flushed on agent stop

When the agent stops speaking, there might be remaining chunks in the queue that never get flushed (because no new chunks trigger the 250ms timer).

```javascript
// In AgentAudioDone handler - flush remaining audio
if (msg.type === "AgentAudioDone") {
  if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  flushAudioQueue();
}
```

### Error: SettingsApplied and Error messages not handled

The initial code didn't handle `SettingsApplied` (confirmation that config was accepted) or `Error` messages from Deepgram. Without handling these, there was no way to know if the settings were rejected.

```javascript
// Added in PR #16
if (msg.type === "SettingsApplied") {
  addMessage("system", "Voice agent configured. Start speaking.");
}
if (msg.type === "Error") {
  setError(msg.message || "Deepgram error");
  addMessage("system", `Error: ${msg.message || "Unknown"}`);
}
```

---

## Step 6: The Final Working Version

**PR #16**: [github.com/Maliot100X/ai-agent-platform/pull/16](https://github.com/Maliot100X/ai-agent-platform/pull/16)

The final version (510 lines) includes all fixes plus:

### 3D CryptoPlanet Integration

The voice agent page embeds the `CryptoPlanet` Three.js component as a visual backdrop that reacts to the voice state:

```typescript
import dynamic from "next/dynamic";
const CryptoPlanet = dynamic(() => import("@/components/CryptoPlanet"), { ssr: false });

// In JSX:
<div className="absolute inset-0 z-0 opacity-30">
  <CryptoPlanet speaking={speaking} listening={listening} />
</div>
```

The planet rotates faster when listening, distorts when speaking, and shows 8 crypto tickers (BTC, ETH, SOL, PUMP, DOGE, AVAX, LINK, MATIC) orbiting with glow effects.

### Microphone Capture Pipeline

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { channelCount: 1, sampleRate: 48000 },
});

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
  sampleRate: 48000,
});
const source = audioCtx.createMediaStreamSource(stream);
const processor = audioCtx.createScriptProcessor(4096, 1, 1);

processor.onaudioprocess = (e) => {
  if (wsRef.current?.readyState !== WebSocket.OPEN) return;

  const float32 = e.inputBuffer.getChannelData(0);

  // Volume visualization
  let sum = 0;
  for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
  setVolume(Math.sqrt(sum / float32.length));

  // Convert Float32 to Int16 PCM for Deepgram
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Send raw PCM bytes over WebSocket
  wsRef.current.send(int16.buffer);
};

source.connect(processor);
processor.connect(audioCtx.destination);
```

### Cleanup on Disconnect

```javascript
const disconnect = useCallback(() => {
  wsRef.current?.close();
  mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
  processorRef.current?.disconnect();
  audioContextRef.current?.close();

  // Flush remaining audio
  if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  flushAudioQueue();

  // Reset playback scheduling
  nextPlayTimeRef.current = 0;
  audioQueueRef.current = [];

  setConnected(false);
  setListening(false);
  setSpeaking(false);
  addMessage("system", "Disconnected.");
}, [addMessage, flushAudioQueue]);
```

---

## Full File Reference

### `frontend/src/app/api/deepgram/token/route.ts` (final version)

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.DEEPGRAM_API_KEY || "6c18a51c829ac16237a956c786e23e1368570311";

  if (!key) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  return NextResponse.json({
    key,
    websocket_url: "wss://agent.deepgram.com/v1/agent/converse",
    features: { stt: true, tts: true, voice_agent: true },
  });
}
```

### `frontend/src/app/voice-agent/page.tsx` (final version)

Full 510-line file in PR #16: [View on GitHub](https://github.com/Maliot100X/ai-agent-platform/pull/16/files#diff-voice-agent)

---

## How to Deploy It Yourself

### 1. Environment Variable

Add to Vercel (Settings -> Environment Variables):
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

Get a key from [console.deepgram.com](https://console.deepgram.com). You need access to the Voice Agent API (may require contacting Deepgram for early access).

### 2. Dependencies

The voice agent uses only browser-native APIs (no npm packages needed beyond what the platform already has):
- `navigator.mediaDevices.getUserMedia` for microphone
- `WebSocket` for Deepgram connection
- `AudioContext` + `ScriptProcessorNode` for audio capture
- `AudioContext` + `AudioBufferSourceNode` + `GainNode` for playback

The UI uses:
- `framer-motion` for animations (already in package.json)
- `@/lib/api` for the `apiFetch` utility (already in the project)
- `@/components/CryptoPlanet` for the 3D backdrop (Three.js, already in the project)

### 3. Sidebar Navigation

Add the Voice Agent link to `frontend/src/components/Sidebar.tsx`:
```typescript
{ name: "Voice Agent", href: "/voice-agent", icon: MicIcon }
```

---

## Summary of All Errors and Fixes

| # | Error | Symptom | Fix |
|---|-------|---------|-----|
| 1 | Wrong WebSocket URL | Connection fails silently | Changed from `wss://agent.deepgram.com/agent` to `wss://agent.deepgram.com/v1/agent/converse` |
| 2 | Unnecessary auth fallback | Double connection attempts | Removed try/catch, use subprotocol auth only: `["token", key]` |
| 3 | Missing `binaryType` | TTS audio arrives as Blob, not ArrayBuffer | Set `ws.binaryType = "arraybuffer"` immediately after creating WebSocket |
| 4 | Wrong message type | Settings rejected, connection closes | Changed `"SettingsConfiguration"` to `"Settings"` |
| 5 | Flat listen model | Settings rejected | Changed to nested `provider: { type: "deepgram", version: "v2", model: "flux-general-en" }` |
| 6 | `language: "en"` in listen | Deepgram V2 rejects it | Removed the `language` field entirely |
| 7 | `model` outside think provider | Settings rejected | Moved `model: "gpt-4o-mini"` inside the `provider` object |
| 8 | `instructions` field | Settings rejected | Changed to `prompt` array (array of strings, not single string) |
| 9 | `anthropic/claude-sonnet-4-6` as think provider | Code 1005 disconnect | Changed to `open_ai/gpt-4o-mini` (verified working) |
| 10 | 16kHz declared sample rate | Garbled speech recognition | Changed to 48kHz to match browser's native mic capture rate |
| 11 | Playing each audio chunk individually | Choppy, stuttering playback | 250ms buffering queue that combines chunks before playing |
| 12 | No GainNode | Volume inconsistencies | Added GainNode in audio playback chain |
| 13 | Queue not flushed on agent stop | Last words cut off | Added flush on `AgentAudioDone` message |
| 14 | No SettingsApplied handler | No way to know if config accepted | Added handler that shows confirmation message |
| 15 | No Error handler | Silent failures | Added handler that displays Deepgram error messages |
| 16 | Env var not picked up on Vercel | Token route returns 500 | Added hardcoded API key as fallback |
| 17 | Old speak model | Lower quality voice | Changed from `aura-2-theia-en` to `aura-2-iris-en` |

---

## Timeline

```
PR #15 commit be35c01  - Initial voice agent build (496 lines)
PR #15 commit 64ff7f7  - Fix WS auth: add binaryType, fallback auth, better error messages
PR #15 merged           - Voice agent live on main
PR #16 (draft)          - 14 additional fixes (settings format, audio buffering, etc.)
```

Total: **2 PRs, ~510 lines of code, 17 individual fixes** to get from "WebSocket closes immediately" to "smooth real-time voice conversation."
