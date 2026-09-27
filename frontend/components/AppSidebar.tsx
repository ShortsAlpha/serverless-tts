
import { Mic, Users, FileText } from "lucide-react";

interface AppSidebarProps {
    activeMode: 'SINGLE' | 'MULTI' | 'DOCX';
    onChangeMode: (mode: 'SINGLE' | 'MULTI' | 'DOCX') => void;
}

export default function AppSidebar({ activeMode, onChangeMode }: AppSidebarProps) {
    return (
        <div className="w-20 md:w-64 bg-zinc-950/50 border-r border-zinc-800 flex flex-col items-center md:items-stretch py-6 gap-2 backdrop-blur-xl h-screen fixed left-0 top-0 z-50">
            <div className="px-4 mb-6 flex items-center justify-center md:justify-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="hidden md:block font-bold text-lg text-white tracking-tight">ProVoice</span>
            </div>

            <div className="flex-1 space-y-2 px-3">
                <button
                    onClick={() => onChangeMode('SINGLE')}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all group ${activeMode === 'SINGLE'
                            ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                        }`}
                >
                    <Mic className={`w-5 h-5 ${activeMode === 'SINGLE' ? 'text-indigo-400' : 'group-hover:text-indigo-400 transition-colors'}`} />
                    <span className="hidden md:block font-medium text-sm">Single Speaker</span>
                </button>

                <button
                    onClick={() => onChangeMode('MULTI')}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all group ${activeMode === 'MULTI'
                            ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                        }`}
                >
                    <Users className={`w-5 h-5 ${activeMode === 'MULTI' ? 'text-purple-400' : 'group-hover:text-purple-400 transition-colors'}`} />
                    <span className="hidden md:block font-medium text-sm">Multi-Speaker Studio</span>
                </button>
                
                <button
                    onClick={() => onChangeMode('DOCX')}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all group ${activeMode === 'DOCX'
                            ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                        }`}
                >
                    <FileText className={`w-5 h-5 ${activeMode === 'DOCX' ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'}`} />
                    <span className="hidden md:block font-medium text-sm">DOCX Automator</span>
                </button>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 hidden md:block">
                <div className="text-xs text-zinc-600">
                    Serverless TTS v2.0
                </div>
            </div>
        </div>
    );
}
