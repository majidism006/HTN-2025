'use client';

import { useState } from 'react';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { parseRequest } from '@/lib/parsing';
import { SchedulingConstraints } from '@/lib/types';

interface VoiceRecorderProps {
  onParseComplete: (constraints: SchedulingConstraints, summary: string, assumptions: string[]) => void;
  onError: (error: string) => void;
}

export default function VoiceRecorder({ onParseComplete, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks([]);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // For now, we'll simulate voice processing with a text input
      // In a real implementation, this would send audio to VAPI
      const mockTranscript = "Schedule a 2-hour study session tomorrow evening with John and Sarah at the library";
      
      // Parse the transcript
      const parsed = parseRequest(mockTranscript);
      onParseComplete(parsed.constraints, parsed.normalizedSummary, parsed.assumptions);
      setTranscript(mockTranscript);
    } catch (error) {
      console.error('Error processing audio:', error);
      onError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const parsed = parseRequest(transcript);
      onParseComplete(parsed.constraints, parsed.normalizedSummary, parsed.assumptions);
    } catch (error) {
      console.error('Error parsing text:', error);
      onError('Failed to parse request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card-gradient">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold gradient-text">Voice Scheduler</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <span>AI Powered</span>
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="transcript" className="block text-sm font-semibold text-gray-700 mb-3">
            Describe your meeting (or use voice input):
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="e.g., 'Schedule a 2-hour study session tomorrow evening with John and Sarah at the library'"
            className="input-field resize-none"
            rows={4}
          />
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              isRecording
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? (
              <>
                <MicOff className="h-5 w-5" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span>Start Recording</span>
              </>
            )}
          </button>

          <button
            onClick={handleTextSubmit}
            disabled={!transcript.trim() || isProcessing}
            className="btn-primary flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                <span>Parse Request</span>
              </>
            )}
          </button>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center space-x-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">Recording... Speak now!</span>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>
        )}

        {/* Example prompts */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Try these examples:</h4>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setTranscript("Schedule a 2-hour study session tomorrow evening with John and Sarah at the library")}
              className="text-left text-sm text-gray-600 hover:text-blue-600 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              "Schedule a 2-hour study session tomorrow evening with John and Sarah at the library"
            </button>
            <button
              onClick={() => setTranscript("Book 90 minutes next week with the team for project planning")}
              className="text-left text-sm text-gray-600 hover:text-blue-600 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              "Book 90 minutes next week with the team for project planning"
            </button>
            <button
              onClick={() => setTranscript("Find time for a 1-hour workout session this afternoon")}
              className="text-left text-sm text-gray-600 hover:text-blue-600 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              "Find time for a 1-hour workout session this afternoon"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
