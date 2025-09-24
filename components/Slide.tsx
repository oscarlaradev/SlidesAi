import React from 'react';
import { SlideData } from '../types';
import { EditableText } from './EditableText';

interface SlideProps {
  slideData: SlideData;
  backgroundImage: string;
  onTextChange: (slideIndex: number, textElementId: string, newText: string) => void;
  slideIndex: number;
  selectedElementId: string | null;
  onElementSelect: (id: string) => void;
  isThumbnail?: boolean;
}

export const Slide: React.FC<SlideProps> = ({ slideData, backgroundImage, onTextChange, slideIndex, selectedElementId, onElementSelect, isThumbnail = false }) => {
  const handleChange = (textElementId: string, newText: string) => {
    onTextChange(slideIndex, textElementId, newText);
  };
  
  return (
    <div
      className={`aspect-video w-full bg-slate-800 rounded-lg shadow-2xl overflow-hidden relative bg-cover bg-center transition-all duration-500`}
      style={{ backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className={`relative w-full h-full p-8 md:p-12 lg:p-16`}>
        {slideData.textElements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.w}%`,
                height: `${element.h}%`,
            }}
          >
            <EditableText
              id={element.id}
              initialText={element.text}
              className={`${element.tailwindClasses} w-full h-full`}
              onTextChange={handleChange}
              onSelect={onElementSelect}
              isSelected={!isThumbnail && element.id === selectedElementId}
              isEditingEnabled={!isThumbnail}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

Slide.displayName = 'Slide';