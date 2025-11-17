import React from 'react';
import { FileTextIcon, ImageIcon, ShapesIcon } from './icons';

interface AddElementMenuProps {
    x: number;
    y: number;
    onSelectType: (type: 'text' | 'image' | 'icon') => void;
}

export const AddElementMenu: React.FC<AddElementMenuProps> = ({ x, y, onSelectType }) => {
    
    const menuStyle: React.CSSProperties = {
        position: 'absolute',
        top: `${y}%`,
        left: `${x}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
    };

    return (
        <div style={menuStyle} className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm p-2 rounded-full border border-slate-600 shadow-2xl animate-fade-in">
            <button onClick={() => onSelectType('text')} className="flex flex-col items-center p-2 rounded-full hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 transition-all group" title="Add Text">
                <FileTextIcon className="w-6 h-6" />
            </button>
            <button onClick={() => onSelectType('image')} className="flex flex-col items-center p-2 rounded-full hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 transition-all" title="Add Image">
                <ImageIcon className="w-6 h-6" />
            </button>
             <button onClick={() => onSelectType('icon')} className="flex flex-col items-center p-2 rounded-full hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 transition-all" title="Add Icon">
                <ShapesIcon className="w-6 h-6" />
            </button>
        </div>
    );
};