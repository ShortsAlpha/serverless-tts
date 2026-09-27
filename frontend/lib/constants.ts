
export interface VoiceOption {
    id: string;
    name: string;
    gender: 'Male' | 'Female';
    style: string;
    country: string;
    color: string;
}

export const VOICES: VoiceOption[] = [
    // US English (Most popular/versatile)
    { id: 'en-US-AriaNeural', name: 'Aria', gender: 'Female', style: 'Expressive', country: 'US', color: 'bg-indigo-500' },
    { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', style: 'Neutral', country: 'US', color: 'bg-blue-500' },
    { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', style: 'Balanced', country: 'US', color: 'bg-purple-500' },
    { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'Male', style: 'Formal', country: 'US', color: 'bg-slate-500' },
    { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'Female', style: 'Warm', country: 'US', color: 'bg-pink-500' },
    { id: 'en-US-EricNeural', name: 'Eric', gender: 'Male', style: 'Dynamic', country: 'US', color: 'bg-cyan-500' },
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

    // Others
    { id: 'en-US-AnaNeural', name: 'Ana', gender: 'Female', style: 'Child', country: 'US', color: 'bg-fuchsia-400' },
    { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'Male', style: 'Clear', country: 'US', color: 'bg-blue-400' },
    { id: 'en-US-BrianNeural', name: 'Brian', gender: 'Male', style: 'Deep', country: 'US', color: 'bg-slate-600' },
    { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'Female', style: 'Standard', country: 'US', color: 'bg-violet-500' },
    { id: 'en-US-AvaNeural', name: 'Ava', gender: 'Female', style: 'Soft', country: 'US', color: 'bg-pink-400' },
];
