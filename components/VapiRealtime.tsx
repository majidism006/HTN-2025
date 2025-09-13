"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { SchedulingConstraints } from '@/lib/types';
import { parseRequest } from '@/lib/parsing';

type Props = {
  onParseComplete: (constraints: SchedulingConstraints, summary: string, assumptions: string[]) => void;
  onError: (error: string) => void;
};

export default function VapiRealtime({ onParseComplete, onError }: Props) {
  const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '';

  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const accumRef = useRef<string>('');

  const connect = useCallback(async () => {
    if (!PUBLIC_KEY) {
      onError('Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY. Add your Vapi public key to .env');
      return;
    }
    try {
      // Ask server to create a Vapi websocket call and give us the transport URL
      const callRes = await fetch('/api/vapi/ws-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!callRes.ok) {
        const t = await callRes.text();
        throw new Error(`Failed to create Vapi call: ${t}`);
      }
      const callData = await callRes.json();
      const wsUrl = callData?.wsUrl as string;
      if (!wsUrl) throw new Error('No websocketCallUrl from server');

      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Connected');
        // Send an initial config message (shape may vary by Vapi account)
        // Some transports work without an explicit init message; keep minimal handshake
      };

      ws.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (data) {
            // Heuristics for transcript fields
            const t = data.transcript || data.text || data.final || data.partial || '';
            if (typeof t === 'string' && t.trim()) {
              // If event marks final, accumulate; else show partial
              if (data.final || data.type === 'final' || data.isFinal) {
                accumRef.current += (accumRef.current ? ' ' : '') + t.trim();
                setTranscript(accumRef.current);
              } else {
                setTranscript(`${accumRef.current}${accumRef.current ? ' ' : ''}${t}`);
              }
            }
          }
        } catch {
          // non-JSON message; ignore
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);
        setStatus('Disconnected');
      };

      ws.onerror = () => {
        onError('Vapi Realtime connection error');
      };

      wsRef.current = ws;
    } catch (e) {
      onError('Failed to connect to Vapi Realtime');
    }
  }, [PUBLIC_KEY, onError]);

  const startStreaming = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect();
      // let onopen handler run first
      await new Promise((r) => setTimeout(r, 300));
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      (processorRef as any).current = processor;

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const input = event.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
        }
        try {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(int16.buffer);
          }
        } catch {}
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsStreaming(true);
      setStatus('Streaming');
    } catch (e) {
      onError('Microphone access denied. Please allow microphone access.');
    }
  }, [connect, onError]);

  const stopStreaming = useCallback(async () => {
    try {
      if (processorRef.current) (processorRef.current as any).disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioCtxRef.current) await audioCtxRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    } catch {}
    setIsStreaming(false);
    setStatus('Connected');
  }, []);

  const disconnect = useCallback(async () => {
    await stopStreaming();
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    setIsConnected(false);
    setStatus('Disconnected');
  }, [stopStreaming]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  const finalizeAndParse = useCallback(async () => {
    const text = transcript.trim() || accumRef.current.trim();
    if (!text) return;
    // Prefer server AI parser, fallback to regex
    try {
      const pr = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (pr.ok) {
        const data = await pr.json();
        if (data?.parsed) {
          onParseComplete(data.parsed.constraints, data.parsed.normalizedSummary, data.parsed.assumptions || []);
          return;
        }
      }
      const parsed = parseRequest(text);
      onParseComplete(parsed.constraints, parsed.normalizedSummary, parsed.assumptions);
    } catch {
      const parsed = parseRequest(text);
      onParseComplete(parsed.constraints, parsed.normalizedSummary, parsed.assumptions);
    }
  }, [onParseComplete, transcript]);

  return (
    <div className="card-gradient">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold gradient-text">Realtime Voice (Vapi)</h3>
        <span className="text-xs text-gray-500">{status}</span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        {!isConnected ? (
          <button className="btn-secondary" onClick={connect}>Connect</button>
        ) : isStreaming ? (
          <button className="btn-secondary" onClick={stopStreaming}><MicOff className="h-4 w-4 mr-2" />Stop</button>
        ) : (
          <button className="btn-primary" onClick={startStreaming}><Mic className="h-4 w-4 mr-2" />Start</button>
        )}
        {isConnected && (
          <button className="bg-white/70 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/90" onClick={disconnect}>Disconnect</button>
        )}
        <button className="bg-white/70 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/90" onClick={finalizeAndParse}>Parse Transcript</button>
      </div>
      <textarea className="input-field w-full min-h-[120px]" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Live transcript will appear here…" />
      {!PUBLIC_KEY && (
        <p className="mt-3 text-sm text-red-600">NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set. Add your Vapi public key to .env.</p>
      )}
    </div>
  );
}
