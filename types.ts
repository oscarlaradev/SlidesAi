export interface TextElement {
  id: string;
  text: string;
  x: number; // Position X as a percentage (0-100)
  y: number; // Position Y as a percentage (0-100)
  w: number; // Width as a percentage (0-100)
  h: number; // Height as a percentage (0-100)
  tailwindClasses: string; // For styling (font size, color, weight, alignment)
}

export interface SlideData {
  id: string; // Unique identifier for each slide
  slideType: 'title' | 'content';
  textElements: TextElement[];
  speakerNotes?: string;
}
