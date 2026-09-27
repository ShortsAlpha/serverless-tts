'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react';

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface FileState {
    file: File;
    status: FileStatus;
    error?: string;
    url?: string;
}

export default function DocxAutomator() {
    const [fileStates, setFileStates] = useState<FileState[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const addFiles = (newFiles: FileList | File[]) => {
        const validFiles = Array.from(newFiles).filter(f => f.name.endsWith('.docx'));
        const newStates: FileState[] = validFiles.map(f => ({
            file: f,
            status: 'pending'
        }));
        setFileStates(prev => [...prev, ...newStates]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        // Reset input value so the same files can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const updateFileState = (index: number, updates: Partial<FileState>) => {
        setFileStates(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const processFile = async (fileState: FileState, index: number) => {
        updateFileState(index, { status: 'processing', error: undefined });
        
        const formData = new FormData();
        formData.append('file', fileState.file);
        
        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://yadaumur127--serverless-tts-generate-speech.modal.run";
            
            const response = await fetch(`${BACKEND_URL}/process_docx`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to process document");
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            updateFileState(index, { status: 'done', url });
            
            // Auto download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileState.file.name.replace('.docx', '')}_assets.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (err) {
            updateFileState(index, { status: 'error', error: err instanceof Error ? err.message : "An unexpected error occurred" });
        }
    };

    const handleProcessAll = async () => {
        if (isProcessingBatch) return;
        setIsProcessingBatch(true);
        
        // Find all pending or errored files
        // We need to re-evaluate this array based on latest state if we process sequentially
        // Actually, we can just iterate and process one by one
        let hasPending = true;
        
        while (hasPending) {
            // Read latest state using a functional update pattern or just by reading from a ref,
            // but since handleProcessAll runs and reads from closure, fileStates won't update in this scope.
            // Better to use state updater or a ref.
            
            let nextIndexToProcess = -1;
            setFileStates(current => {
                nextIndexToProcess = current.findIndex(fs => fs.status === 'pending' || fs.status === 'error');
                return current;
            });
            
            if (nextIndexToProcess === -1) {
                hasPending = false;
                break;
            }
            
            // Wait for this specific file to finish
            // To do this properly, we need to pass the file from the current state.
            let fileToProcess = undefined;
            setFileStates(current => {
                fileToProcess = current[nextIndexToProcess];
                return current;
            });
            
            if (fileToProcess) {
                await processFile(fileToProcess, nextIndexToProcess);
            }
        }
        
        setIsProcessingBatch(false);
    };

    const clearDone = () => {
        setFileStates(prev => prev.filter(fs => fs.status !== 'done'));
    };
    
    const clearAll = () => {
        setFileStates([]);
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">DOCX Batch Automator</h2>
                <p className="text-zinc-400">Upload multiple DOCX course files. They will be processed one by one and downloaded automatically.</p>
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 shadow-xl">
                
                {/* Upload Zone */}
                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer mb-6
                        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
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
                        multiple
                        className="hidden" 
                    />
                    
                    <div className="w-16 h-16 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-1">Upload DOCX Files</h3>
                    <p className="text-zinc-400 text-sm mb-4">Drag and drop multiple files or click to browse</p>
                </div>

                {/* File List */}
                {fileStates.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-white">Files in Queue ({fileStates.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={clearDone} className="text-xs text-zinc-400 hover:text-white px-3 py-1 rounded-md hover:bg-zinc-800 transition-colors">Clear Done</button>
                                <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-md hover:bg-red-900/20 transition-colors">Clear All</button>
                            </div>
                        </div>
                        
                        {fileStates.map((fs, idx) => (
                            <div key={`${fs.file.name}-${idx}`} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-white truncate">{fs.file.name}</h4>
                                    <p className="text-xs text-zinc-400">{(fs.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2 min-w-[100px] justify-end">
                                    {fs.status === 'pending' && <span className="text-xs font-medium text-zinc-500 px-2 py-1 rounded-md bg-zinc-800">Pending</span>}
                                    {fs.status === 'processing' && (
                                        <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs font-medium">Processing...</span>
                                        </div>
                                    )}
                                    {fs.status === 'done' && (
                                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-2 py-1 rounded-md">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-xs font-medium">Done</span>
                                        </div>
                                    )}
                                    {fs.status === 'error' && (
                                        <div className="flex flex-col items-end gap-1 text-red-400 max-w-[200px]">
                                            <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-xs font-medium">Error</span>
                                            </div>
                                            <span className="text-[10px] truncate w-full text-right" title={fs.error}>{fs.error}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleProcessAll}
                        disabled={fileStates.length === 0 || isProcessingBatch || !fileStates.some(f => f.status === 'pending' || f.status === 'error')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                            ${fileStates.length === 0 || isProcessingBatch || !fileStates.some(f => f.status === 'pending' || f.status === 'error')
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                            }
                        `}
                    >
                        {isProcessingBatch ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing Batch...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                Start Batch Processing
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
