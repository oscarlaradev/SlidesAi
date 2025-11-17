import React, { useState, useRef, useEffect, useCallback } from 'react';

interface EditableTextProps {
  id: string;
  initialText: string;
  className: string;
  onTextChange: (id: string, newText: string) => void;
  isEditingEnabled?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({ id, initialText, className, onTextChange, isEditingEnabled = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    onTextChange(id, text);
  }, [id, onTextChange, text]);
  
  const autoResize = () => {
      if(textareaRef.current){
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [isEditing]);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);
  
  const handleDoubleClick = () => {
      if (isEditingEnabled) {
          setIsEditing(true);
      }
  }

  if (isEditing && isEditingEnabled) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
            setText(e.target.value);
            autoResize();
        }}
        onBlur={handleBlur}
        className={`${className} w-full h-full bg-transparent border border-cyan-400 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none overflow-hidden`}
        style={{
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`${className} ${isEditingEnabled ? 'cursor-text' : ''} w-full h-full`}
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {text || ''}
    </div>
  );
};