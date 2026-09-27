
'use client';

import { useState } from 'react';
import { Sparkles, Plus, Trash2, Play, MoreVertical, X, GripVertical } from "lucide-react";
import { VOICES, VoiceOption } from '@/lib/constants';

interface TextBlock {
    id: string;
    text: string;
    voiceId: string;
}

export default function MultiSpeakerMode() {
    const [blocks, setBlocks] = useState<TextBlock[]>([
        { id: 'init-1', text: 'Hello, welcome to the multi-speaker studio.', voiceId: 'en-US-AriaNeural' },
        { id: 'init-2', text: 'Here you can assign different voices to different blocks.', voiceId: 'en-US-GuyNeural' }
    ]);

    const [playingBlockId, setPlayingBlockId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Helper to get voice object
    const getVoice = (id: string) => VOICES.find(v => v.id === id) || VOICES[0];

    const addBlock = () => {
        const newBlock: TextBlock = {
            id: `block-${Date.now()}`,
            text: '',
            voiceId: blocks.length > 0 ? blocks[blocks.length - 1].voiceId : 'en-US-AriaNeural' // Copy last voice or default
        };
        setBlocks([...blocks, newBlock]);
    };

    const removeBlock = (id: string) => {
        if (blocks.length <= 1) return; // Prevent deleting last block
        setBlocks(blocks.filter(b => b.id !== id));
    };

    const updateBlock = (id: string, field: keyof TextBlock, value: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const [activeVoiceSelector, setActiveVoiceSelector] = useState<string | null>(null);

    return (
        <div className="w-full max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Multi-Speaker Studio</h2>
                    <p className="text-zinc-400 mt-1">Design complex dialogues with multiple characters.</p>
                </div>
                <button
                    disabled={isGenerating}
                    className="px-6 py-3 rounded-xl bg-white text-zinc-950 font-bold flex items-center gap-2 hover:bg-zinc-200 hover:scale-[1.02] shadow-xl shadow-white/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Generate Full Audio
                </button>
            </div>

            {/* Blocks Visualizer */}
            <div className="space-y-4">
                {blocks.map((block, index) => {
                    const voice = getVoice(block.voiceId);
                    const isSelectorOpen = activeVoiceSelector === block.id;

                    return (
                        <div key={block.id} className="group relative flex gap-4 items-start animate-in slide-in-from-bottom-2 duration-300">
                            {/* Index / Grip */}
                            <div className="pt-8 text-zinc-600 font-mono text-xs flex flex-col items-center gap-2 w-8 shrink-0">
                                <span className="opacity-50 group-hover:opacity-100 transition-opacity">{(index + 1).toString().padStart(2, '0')}</span>
                                {/* <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-50 cursor-move" /> */}
                            </div>

                            {/* Main Block Card */}
                            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors shadow-lg">

                                {/* Block Header (Voice Selection) */}
                                <div className="bg-zinc-950/50 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">

                                    {/* Voice Trigger */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveVoiceSelector(isSelectorOpen ? null : block.id)}
                                            className="flex items-center gap-3 hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors"
                                        >
                                            <div className={`w-8 h-8 rounded-full ${voice.color} flex items-center justify-center shadow-lg`}>
                                                <span className="text-[10px] font-bold text-white">{voice.name[0]}</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                                    {voice.name}
                                                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{voice.country}</span>
                                                </div>
                                                <div className="text-xs text-zinc-500">{voice.gender} • {voice.style}</div>
                                            </div>
                                        </button>

                                        {/* Voice Selector Dropdown (Absolute) */}
                                        {isSelectorOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveVoiceSelector(null)} />
                                                <div className="absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-20 space-y-1 p-2">
                                                    {VOICES.map(v => (
                                                        <button
                                                            key={v.id}
                                                            onClick={() => {
                                                                updateBlock(block.id, 'voiceId', v.id);
                                                                setActiveVoiceSelector(null);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-zinc-800 transition-colors ${v.id === block.voiceId ? 'bg-zinc-800' : ''}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-full ${v.color} flex items-center justify-center shrink-0`}>
                                                                {activeVoiceSelector === block.id && v.id === block.voiceId && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm text-white font-medium">{v.name}</div>
                                                                <div className="text-[10px] text-zinc-500">{v.gender} • {v.style}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeBlock(block.id)}
                                            disabled={blocks.length <= 1}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Text Area */}
                                <div>
                                    <textarea
                                        value={block.text}
                                        onChange={(e) => updateBlock(block.id, 'text', e.target.value)}
                                        placeholder="Type something..."
                                        className="w-full bg-transparent p-6 text-zinc-300 placeholder:text-zinc-600 focus:outline-none resize-none min-h-[120px]"
                                        rows={3}
                                    />
                                </div>

                                {/* Footer (Char count / Block specific preview) */}
                                <div className="bg-zinc-950/30 px-4 py-2 flex justify-between items-center text-xs text-zinc-600 border-t border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <button className="hover:text-white flex items-center gap-1.5 transition-colors">
                                            <Play className="w-3 h-3" /> Preview Block
                                        </button>
                                    </div>
                                    <span>{block.text.length} chars</span>
                                </div>

                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Add Block Button */}
            <button
                onClick={addBlock}
                className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-zinc-700 hover:bg-zinc-900 transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Add Text Block</span>
            </button>

        </div>
    );
}
