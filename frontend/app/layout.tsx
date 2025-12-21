import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gemini TTS - Serverless Audio Generator',
  description: 'Convert text to speech using Google Gemini Pro & Modal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-zinc-950 text-zinc-50 antialiased">{children}</body>
    </html>
  );
}
