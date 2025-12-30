'use client';

import { useState, useRef } from 'react';
import AudioPlayer from '@/components/AudioPlayer';
import {
  Mic,
  ChevronRight,
  Zap,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Download,
  RotateCcw,
  Play
} from 'lucide-react';

// --- TYPES ---
type Step = 'VOICE' | 'TEXT' | 'RESULT';

interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  style: string;
  country: string;
  color: string;
}

const VOICES: VoiceOption[] = [
  // US English (Most popular/versatile)
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'Female', style: 'Expressive', country: 'US', color: 'bg-indigo-500' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', style: 'Neutral', country: 'US', color: 'bg-blue-500' },
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', style: 'Balanced', country: 'US', color: 'bg-purple-500' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'Male', style: 'Formal', country: 'US', color: 'bg-slate-500' },
  { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'Female', style: 'Warm', country: 'US', color: 'bg-pink-500' },
  { id: 'en-US-EricNeural', name: 'Eric', gender: 'Male', style: 'Dynamic', country: 'US', color: 'bg-cyan-500' }, /* Often used for news/dynamic content */
  { id: 'en-US-RogerNeural', name: 'Roger', gender: 'Male', style: 'Narrative', country: 'US', color: 'bg-amber-600' },
  { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'Male', style: 'Youthful', country: 'US', color: 'bg-emerald-500' },

  // UK English
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'Female', style: 'British', country: 'UK', color: 'bg-red-500' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'Male', style: 'British', country: 'UK', color: 'bg-teal-500' },
  { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'Female', style: 'Proper', country: 'UK', color: 'bg-rose-500' },
  { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'Male', style: 'Classic', country: 'UK', color: 'bg-sky-500' },

  // Australian
  { id: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'Female', style: 'Aussie', country: 'AU', color: 'bg-lime-500' },
  { id: 'en-AU-WilliamNeural', name: 'William', gender: 'Male', style: 'Aussie', country: 'AU', color: 'bg-green-600' },

  // Canada
  { id: 'en-CA-LiamNeural', name: 'Liam', gender: 'Male', style: 'Canadian', country: 'CA', color: 'bg-red-600' },
  { id: 'en-CA-ClaraNeural', name: 'Clara', gender: 'Female', style: 'Canadian', country: 'CA', color: 'bg-orange-500' },

  // Ireland
  { id: 'en-IE-EmilyNeural', name: 'Emily', gender: 'Female', style: 'Irish', country: 'IE', color: 'bg-green-500' },
  { id: 'en-IE-ConnorNeural', name: 'Connor', gender: 'Male', style: 'Irish', country: 'IE', color: 'bg-emerald-600' },

  // Others (Character/Distinctive)
  { id: 'en-US-AnaNeural', name: 'Ana', gender: 'Female', style: 'Child', country: 'US', color: 'bg-fuchsia-400' }, /* Good for younger characters */
  { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'Male', style: 'Clear', country: 'US', color: 'bg-blue-400' },
  { id: 'en-US-BrianNeural', name: 'Brian', gender: 'Male', style: 'Deep', country: 'US', color: 'bg-slate-600' },
  { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'Female', style: 'Standard', country: 'US', color: 'bg-violet-500' },
  { id: 'en-US-AvaNeural', name: 'Ava', gender: 'Female', style: 'Soft', country: 'US', color: 'bg-pink-400' },
];

export default function Home() {
  // State
  const [step, setStep] = useState<Step>('VOICE');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [text, setText] = useState('');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0); // 0 (original) to +50/-50 % ? Let's use 0% default, min -50, max +50
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = 'https://yadaumur00--serverless-tts-generate-speech.modal.run';

  // Preview State
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [isSettingsPreviewLoading, setIsSettingsPreviewLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- HANDLERS ---
  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoice(voice);
    setStep('TEXT');
  };

  const handlePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();

    // Stop if currently playing this voice
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop any other playing voice
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPreviewLoadingId(voice.id);
    setPlayingVoiceId(null);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hello, I am ${voice.name}. This is how I sound.`,
          voice: voice.id,
          rate: '+0%',
          pitch: '+0Hz',
          volume: '+0%'
        }),
      });

      if (!response.ok) throw new Error('Preview Failed');
      const data = await response.json();

      if (data.status === 'success' && data.audio_url) {
        const audio = new Audio(data.audio_url);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        audio.oncanplaythrough = () => {
          // Only start playing if we are still selecting this voice (simple race check)
          if (previewLoadingId === voice.id) {
            setPreviewLoadingId(null);
            setPlayingVoiceId(voice.id);
            audio.play();
          }
        }
        await audio.load(); // Trigger loading
        // If oncanplaythrough doesn't fire fast enough for cached, try play directly
        if (audio.readyState >= 3) {
          setPreviewLoadingId(null);
          setPlayingVoiceId(voice.id);
          audio.play();
        }
      }
    } catch (err) {
      console.error("Preview failed", err);
      setPreviewLoadingId(null);
    }
  };

  const handleSettingsPreview = async () => {
    if (!selectedVoice) return;

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null); // Reset global viewing play state
    setIsSettingsPreviewLoading(true);

    try {
      // Calculate params
      const ratePct = Math.round((speed - 1.0) * 100);
      const rateStr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
      const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;
      const volumeStr = volume >= 0 ? `+${volume}%` : `${volume}%`;

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `This is a preview with your custom settings.`,
          voice: selectedVoice.id,
          rate: rateStr,
          pitch: pitchStr,
          volume: volumeStr
        }),
      });

      if (!response.ok) throw new Error('Preview Failed');
      const data = await response.json();

      if (data.status === 'success' && data.audio_url) {
        const audio = new Audio(data.audio_url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSettingsPreviewLoading(false);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        setIsSettingsPreviewLoading(false);
      }
    } catch (err) {
      console.error("Settings preview failed", err);
      setIsSettingsPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || text.length > 50000) return;
    setLoading(true);
    setError(null);

    try {
      // Calculate rate string: 1.0 -> +0%, 1.5 -> +50%, 0.8 -> -20%
      const ratePct = Math.round((speed - 1.0) * 100);
      const rateStr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;

      // Pitch string: 0 -> +0Hz, -5 -> -5Hz
      const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

      // Volume string
      const volumeStr = volume >= 0 ? `+${volume}%` : `${volume}%`;

      const payload = {
        text,
        voice: selectedVoice?.id || 'en-US-AriaNeural',
        rate: rateStr,
        pitch: pitchStr,
        volume: volumeStr
      };

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Generation Failed');
      const data = await response.json();

      if (data.status === 'success' && data.audio_url) {
        setAudioUrl(data.audio_url);
        setStep('RESULT');
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('VOICE');
    setAudioUrl(null);
    setText('');
    setError(null);
    setSelectedVoice(null);
    setSpeed(1.0);
    setPitch(0);
    setVolume(0);
  };

  // --- RENDER HELPERS ---

  // 1. VOICE SELECTION
  const renderVoiceSelection = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">Select a Voice</h2>
        <p className="text-zinc-400">Choose the perfect tone for your content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VOICES.map((voice) => {
          const isPlaying = playingVoiceId === voice.id;
          const isLoading = previewLoadingId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => handleVoiceSelect(voice)}
              className="group relative overflow-hidden p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 text-left flex items-start gap-4 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <button
                onClick={(e) => handlePreview(e, voice)}
                className={`relative z-10 w-12 h-12 rounded-full ${voice.color} flex items-center justify-center shrink-0 shadow-lg hover:scale-110 transition-transform`}
              >
                {isLoading ? (
                  <Zap className="text-white w-5 h-5 animate-pulse" />
                ) : isPlaying ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <span className="w-1 h-2 bg-white animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-4 bg-white animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-3 bg-white animate-bounce"></span>
                  </div>
                ) : (
                  <Play className="text-white w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{voice.name}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{voice.country}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{voice.gender}</span>
                </div>
              </div>

              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
            </div>
          )
        })}
      </div>
    </div>
  );

  // 2. TEXT INPUT
  const renderTextInput = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 w-full max-w-[1600px] mx-auto px-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setStep('VOICE')} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Voices
        </button>
        <div className="flex items-center gap-2 text-sm text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          <span className={`w-2 h-2 rounded-full ${selectedVoice?.color}`}></span>
          Using voice: <span className="font-bold">{selectedVoice?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Text Area Column - Expanded to 9 columns */}
        <div className="lg:col-span-9 space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
            <div className="relative bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What should I say today?"
                className="w-full flex-grow bg-transparent text-xl font-light text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[300px]"
                autoFocus
              />
              <div className="flex justify-end mt-4">
                <span className={`text-xs ${text.length > 50000 ? 'text-red-500 font-bold' : 'text-zinc-600'}`}>
                  {text.length}/50000 characters
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!text.trim() || loading || text.length > 50000}
            className={`
                    w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                    ${!text.trim() || loading || text.length > 50000
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98]'
              }
                `}
          >
            {loading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                Generating Voice...
              </>
            ) : (
              <>
                Generate Voiceover <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Settings Panel Column - 3 Columns */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-8 sticky top-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" /> Speaking Role
              </h3>

              {/* Speed Control */}
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Speed</span>
                  <span className="text-white font-mono">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div>
              {/* Pitch Control */}
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Pitch (Hz)</span>
                  <span className="text-white font-mono">{pitch > 0 ? `+${pitch}` : pitch}Hz</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div>
              {/* Volume Control */}
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Volume</span>
                  <span className="text-white font-mono">{volume > 0 ? `+${volume}` : volume}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleSettingsPreview}
                disabled={isSettingsPreviewLoading}
                className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isSettingsPreviewLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    Preview Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
          {error}
        </div>
      )}
    </div>
  );

  // 3. RESULT
  const renderResult = () => (
    <div className="text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto">
      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-2xl shadow-green-500/10 mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">Your Audio is Ready!</h2>
        <p className="text-zinc-400">Generated with {selectedVoice?.name} voice.</p>
      </div>

      <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden group">


        <div className="relative z-10 space-y-6">
          {/* Use existing AudioPlayer but allow it to style itself or wrap it */}
          {audioUrl && <AudioPlayer src={audioUrl} />}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium flex items-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Create Another
        </button>

        <button
          onClick={() => {
            if (!audioUrl) return;
            // Use local proxy to bypass CORS and force download
            const filename = `voice_${selectedVoice?.name || 'audio'}_${new Date().getTime()}.mp3`;
            const proxyUrl = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;

            // Create a hidden iframe to trigger the download without opening a new window/tab
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = proxyUrl;
            document.body.appendChild(iframe);

            // Clean up after a delay
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 60000);
          }}
          className="px-6 py-3 rounded-xl bg-white text-zinc-950 font-bold flex items-center gap-2 hover:bg-zinc-200 hover:scale-[1.02] shadow-xl shadow-white/10 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download Audio
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl">


        {/* Content Switcher */}
        {step === 'VOICE' && renderVoiceSelection()}
        {step === 'TEXT' && renderTextInput()}
        {step === 'RESULT' && renderResult()}
      </div>


    </main>
  );
}
