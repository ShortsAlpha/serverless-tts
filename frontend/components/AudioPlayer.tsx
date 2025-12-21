import React, { useRef, useEffect } from 'react';
import { Download } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(() => { });
        }
    }, [src]);

    return (
        <div className="flex items-center gap-3 w-full">
            <audio
                ref={audioRef}
                controls
                className="flex-grow h-8 rounded opacity-80 hover:opacity-100 transition-opacity invert hue-rotate-180"
                src={src}
            />
        </div>
    );
}
