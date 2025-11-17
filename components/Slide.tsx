import React from 'react';
import { SlideData, SlideElement } from '../types';
import { EditableText } from './EditableText';
import { Chart } from './Chart';
import { Icon } from './Icon';
import { ElementWrapper } from './ElementWrapper';


interface SlideProps {
  slideData: SlideData;
  backgroundImage: string;
  onTextChange: (slideIndex: number, textElementId: string, newText: string) => void;
  slideIndex: number;
  selectedElementId: string | null;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (element: SlideElement) => void;
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isThumbnail?: boolean;
}

export const Slide: React.FC<SlideProps> = ({ 
    slideData, 
    backgroundImage, 
    onTextChange, 
    slideIndex, 
    selectedElementId, 
    onElementSelect,
    onElementUpdate,
    onCanvasClick,
    isThumbnail = false 
}) => {

  const handleTextChange = (textElementId: string, newText: string) => {
    onTextChange(slideIndex, textElementId, newText);
  };
  
  const handleWrapperClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent canvas click from firing
    onElementSelect(id);
  }
  
  const allElements = [
      ...(slideData.textElements),
      ...(slideData.imageElements || []),
      ...(slideData.chartElements || []),
      ...(slideData.iconElements || []),
  ];

  return (
    <div
      className={`aspect-video w-full bg-slate-800 overflow-hidden relative bg-cover bg-center transition-all duration-500 ${isThumbnail ? 'rounded-lg shadow-2xl' : ''}`}
      style={{ backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})` }}
      onClick={(e) => {
          if(!isThumbnail) {
              onCanvasClick(e);
              onElementSelect(null);
          }
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className={`relative w-full h-full`}>
        {allElements.map((element) => (
          <ElementWrapper
            key={element.id}
            element={element}
            isSelected={!isThumbnail && element.id === selectedElementId}
            onSelect={(e) => handleWrapperClick(e, element.id)}
            onUpdate={onElementUpdate}
            isEditingEnabled={!isThumbnail}
          >
            {'text' in element && (
                 <EditableText
                  id={element.id}
                  initialText={element.text}
                  className={element.tailwindClasses}
                  onTextChange={handleTextChange}
                  isEditingEnabled={!isThumbnail}
                />
            )}
             {'base64' in element && (
                <img
                    src={`data:image/jpeg;base64,${element.base64}`}
                    alt="AI generated image for slide content"
                    className="w-full h-full object-cover rounded-lg shadow-md pointer-events-none"
                />
             )}
             {'chartType' in element && (
                <Chart chartData={element} />
             )}
             {'svg' in element && (
                <Icon iconData={element} />
             )}
          </ElementWrapper>
        ))}
      </div>
    </div>
  );
};

Slide.displayName = 'Slide';