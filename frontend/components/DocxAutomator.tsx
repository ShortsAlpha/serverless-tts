'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, Download, AlertCircle } from 'lucide-react';

export default function DocxAutomator() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.endsWith('.docx')) {
                setFile(droppedFile);
            } else {
                setError("Please upload a valid .docx file.");
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith('.docx')) {
                setFile(selectedFile);
            } else {
                setError("Please upload a valid .docx file.");
            }
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        
        setIsProcessing(true);
        setError(null);
        setDownloadUrl(null);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            // Using absolute URL or relative depending on setup. 
            // The existing backend runs on modal. Let's use the local dev proxy or direct URL.
            // For now, let's assume it's running locally on 8000 or proxied via Next.js
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://yadaumur127--serverless-tts-generate-speech.modal.run";
            
            const response = await fetch(`${BACKEND_URL}/process_docx`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to process document");
            }
            
            // It returns a ZIP file stream
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setDownloadUrl(url);
            
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">DOCX Automator</h2>
                <p className="text-zinc-400">Upload a DOCX course file to automatically extract spoken scripts into MP3s and save images.</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-xl">
                
                {/* Upload Zone */}
                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
                        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
                        ${file ? 'border-green-500/50 bg-green-500/5' : ''}
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".docx" 
                        className="hidden" 
                    />
                    
                    {file ? (
                        <>
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-1">{file.name}</h3>
                            <p className="text-zinc-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mb-4">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-1">Upload DOCX File</h3>
                            <p className="text-zinc-400 text-sm mb-4">Drag and drop or click to browse</p>
                        </>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-end">
                    {downloadUrl ? (
                        <a 
                            href={downloadUrl} 
                            download="course_assets.zip"
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            Download ZIP
                        </a>
                    ) : (
                        <button
                            onClick={handleProcess}
                            disabled={!file || isProcessing}
                            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                                ${!file || isProcessing 
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                }
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Generate Audio & Images
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
