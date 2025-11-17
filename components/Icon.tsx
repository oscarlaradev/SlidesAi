import React from 'react';
import { IconElement } from '../types';

interface IconProps {
  iconData: IconElement;
}

// Simple SVG sanitizer
const sanitizeSvg = (svgString: string): string => {
  // A basic sanitizer: remove script tags and on... event handlers.
  // For a real-world app, a more robust library like DOMPurify would be better.
  let sanitized = svgString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/g, '');
  return sanitized;
};


export const Icon: React.FC<IconProps> = ({ iconData }) => {
  const { svg, color } = iconData;

  const sanitizedSvg = sanitizeSvg(svg);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ color: color }}
      // It's generally risky, but we are generating the SVG and doing basic sanitization.
      // This is necessary to allow CSS to style the SVG's 'currentColor'.
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  );
};
