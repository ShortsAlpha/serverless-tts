
'use client';

import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import SingleSpeakerMode from '@/components/SingleSpeakerMode';
import MultiSpeakerMode from '@/components/MultiSpeakerMode';
import DocxAutomator from '@/components/DocxAutomator';

export default function Home() {
  const [activeMode, setActiveMode] = useState<'SINGLE' | 'MULTI' | 'DOCX'>('SINGLE');

  return (
    <main className="min-h-screen bg-zinc-950 flex font-sans text-zinc-100">
      {/* Sidebar */}
      <AppSidebar activeMode={activeMode} onChangeMode={setActiveMode} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 relative min-h-screen overflow-x-hidden">
        {/* Background Decor - Global for consistency */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 fixed">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 p-6 min-h-screen flex flex-col">
          {activeMode === 'SINGLE' && <SingleSpeakerMode />}
          {activeMode === 'MULTI' && <MultiSpeakerMode />}
          {activeMode === 'DOCX' && <DocxAutomator />}
        </div>
      </div>
    </main>
  );
}
