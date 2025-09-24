import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface DropdownProps {
  buttonContent: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ buttonContent, children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={className}
        >
          {buttonContent}
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {React.Children.map(children, child =>
              React.isValidElement(child) ? React.cloneElement(child, { close: () => setIsOpen(false) } as any) : child
            )}
          </div>
        </div>
      )}
    </div>
  );
};


interface DropdownItemProps {
  children: ReactNode;
  onSelect: () => void;
  close?: () => void; // Injected by Dropdown
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, onSelect, close }) => {
  const handleSelect = () => {
    onSelect();
    if(close) close();
  };
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); handleSelect(); }}
      className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 hover:text-white"
      role="menuitem"
    >
      {children}
    </a>
  );
};