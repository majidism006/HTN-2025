'use client';

import { useState, useCallback, useRef } from 'react';
import { parseRequest } from '@/lib/parsing';

interface Props {
  onParseComplete: (constraints: any, summary: string, assumptions: string[]) => void;
  onError: (error: string) => void;
}

export default function VapiRealtime({ onParseComplete, onError }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [transcript, setTranscript] = useState('');

  const connect = useCallback(async () => {
    // Use browser speech recognition for demo
    console.log('Using browser speech recognition for demo');
    try {
      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        onError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Store recognition instance for cleanup
      (window as any).currentRecognition = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsConnected(true);
        setStatus('Listening...');
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        onError(`Speech recognition error: ${event.error}`);
        setIsConnected(false);
        setStatus('Disconnected');
      };

      recognition.onend = () => {
        setIsConnected(false);
        setStatus('Disconnected');
      };

      recognition.start();
    } catch (error) {
      onError('Failed to start speech recognition. Please try again.');
    }
  }, [onError]);

  const disconnect = useCallback(async () => {
    // Stop browser speech recognition if running
    if ((window as any).currentRecognition) {
      (window as any).currentRecognition.stop();
      (window as any).currentRecognition = null;
    }
    
    setIsConnected(false);
    setStatus('Disconnected');
  }, []);

  const finalizeAndParse = useCallback(async () => {
    const text = transcript.trim();
    if (!text) return;
    
    // Use the parsing function directly
    const parsed = parseRequest(text);
    onParseComplete(parsed.constraints, parsed.normalizedSummary, parsed.assumptions);
  }, [onParseComplete, transcript]);

  return (
    <div className="card-gradient">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Realtime Voice (Browser)</h3>
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
        {!isConnected ? (
          <button className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-700" onClick={connect}>Connect</button>
        ) : (
          <button className="bg-white/70 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/90" onClick={disconnect}>Disconnect</button>
        )}
        <button className="bg-white/70 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/90" onClick={finalizeAndParse}>Parse Transcript</button>
      </div>
      <textarea 
        className="input-field w-full min-h-[120px]" 
        value={transcript} 
        onChange={(e) => setTranscript(e.target.value)} 
        placeholder="Live transcript will appear here…" 
      />
      <p className="mt-3 text-sm text-blue-600">Using browser speech recognition for demo. Works best in Chrome or Edge.</p>
    </div>
  );
}