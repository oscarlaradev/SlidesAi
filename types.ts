export interface TextElement {
  id: string;
  text: string;
  x: number; // Position X as a percentage (0-100)
  y: number; // Position Y as a percentage (0-100)
  w: number; // Width as a percentage (0-100)
  h: number; // Height as a percentage (0-100)
  tailwindClasses: string; // For styling (font size, color, weight, alignment)
}

export interface ImageElement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  base64: string; // The base64 encoded image data
}

export interface SlideData {
  id: string; // Unique identifier for each slide
  slideType: 'title' | 'content';
  textElements: TextElement[];
  imageElements?: ImageElement[]; // Optional array of images
  speakerNotes?: string;
}
