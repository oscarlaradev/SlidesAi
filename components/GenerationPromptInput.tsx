import React, { useState, useEffect, useRef } from 'react';

interface GenerationPromptInputProps {
    x: number;
    y: number;
    type: 'text' | 'image' | 'icon';
    onGenerate: (prompt: string) => void;
    onCancel: () => void;
}

export const GenerationPromptInput: React.FC<GenerationPromptInputProps> = ({ x, y, type, onGenerate, onCancel }) => {
    const [prompt, setPrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus the input when the component mounts
        inputRef.current?.focus();
    }, []);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };
    
    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${y}%`,
        left: `${x}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 51, // Higher than AddElementMenu
    };

    return (
        <div style={style} className="p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-600 shadow-2xl animate-fade-in">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Describe the ${type} you want...`}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder-slate-400"
                />
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-slate-900 font-bold rounded-full hover:bg-cyan-400 transition-all text-sm">
                    Generate
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-600 text-white font-bold rounded-full hover:bg-slate-500 transition-all text-sm">
                    Cancel
                </button>
            </form>
        </div>
    );
};