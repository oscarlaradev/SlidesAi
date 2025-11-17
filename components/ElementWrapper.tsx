import React, { useRef, useEffect } from 'react';
import { SlideElement } from '../types';

interface ElementWrapperProps {
  element: SlideElement;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (element: SlideElement) => void;
  children: React.ReactNode;
  isEditingEnabled: boolean;
}

export const ElementWrapper: React.FC<ElementWrapperProps> = ({ element, isSelected, onSelect, onUpdate, children, isEditingEnabled }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const resizeDirection = useRef('');
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0, mouseX: 0, mouseY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current && !isResizing.current) return;
      e.preventDefault();
      
      const parentRect = ref.current?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const dx = ((e.clientX - startPos.current.mouseX) / parentRect.width) * 100;
      const dy = ((e.clientY - startPos.current.mouseY) / parentRect.height) * 100;

      let newX = startPos.current.x;
      let newY = startPos.current.y;
      let newW = startPos.current.w;
      let newH = startPos.current.h;

      if (isDragging.current) {
        newX = startPos.current.x + dx;
        newY = startPos.current.y + dy;
      } else if (isResizing.current) {
        if (resizeDirection.current.includes('right')) newW = startPos.current.w + dx;
        if (resizeDirection.current.includes('left')) {
            newW = startPos.current.w - dx;
            newX = startPos.current.x + dx;
        }
        if (resizeDirection.current.includes('bottom')) newH = startPos.current.h + dy;
        if (resizeDirection.current.includes('top')) {
            newH = startPos.current.h - dy;
            newY = startPos.current.y + dy;
        }
      }
      
      onUpdate({ ...element, x: newX, y: newY, w: newW, h: newH });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (isDragging.current || isResizing.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [element, onUpdate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditingEnabled || !isSelected) return; // Only allow dragging a selected element
    e.stopPropagation(); // Prevent canvas click from firing when starting a drag
    isDragging.current = true;
    startPos.current = { x: element.x, y: element.y, w: element.w, h: element.h, mouseX: e.clientX, mouseY: e.clientY };
  };
  
  const handleResizeHandleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (!isEditingEnabled) return;
    isResizing.current = true;
    resizeDirection.current = direction;
    startPos.current = { x: element.x, y: element.y, w: element.w, h: element.h, mouseX: e.clientX, mouseY: e.clientY };
  }

  const resizeHandles = [
      { direction: 'top-left', cursor: 'nwse-resize' },
      { direction: 'top', cursor: 'ns-resize' },
      { direction: 'top-right', cursor: 'nesw-resize' },
      { direction: 'left', cursor: 'ew-resize' },
      { direction: 'right', cursor: 'ew-resize' },
      { direction: 'bottom-left', cursor: 'nesw-resize' },
      { direction: 'bottom', cursor: 'ns-resize' },
      { direction: 'bottom-right', cursor: 'nwse-resize' },
  ];

  return (
    <div
      ref={ref}
      className={`absolute ${isEditingEnabled ? (isSelected ? 'cursor-move' : 'cursor-pointer') : ''} `}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.w}%`,
        height: `${element.h}%`,
        zIndex: isSelected ? 20 : 10,
      }}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
    >
        <div className={`w-full h-full relative ${isSelected ? 'outline outline-2 outline-cyan-400' : ''}`}>
            {children}
            {isSelected && isEditingEnabled && resizeHandles.map(handle => (
                 <div
                    key={handle.direction}
                    className={`absolute w-3 h-3 bg-cyan-400 border border-slate-900 rounded-full -m-1.5`}
                    style={{
                        cursor: handle.cursor,
                        ...getHandlePosition(handle.direction),
                    }}
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, handle.direction)}
                />
            ))}
        </div>
    </div>
  );
};

const getHandlePosition = (direction: string) => {
    const pos = {};
    if (direction.includes('top')) pos['top'] = 0;
    if (direction.includes('bottom')) pos['bottom'] = 0;
    if (direction.includes('left')) pos['left'] = 0;
    if (direction.includes('right')) pos['right'] = 0;
    if (direction === 'top' || direction === 'bottom') pos['left'] = '50%';
    if (direction === 'left' || direction === 'right') pos['top'] = '50%';
    return pos;
};