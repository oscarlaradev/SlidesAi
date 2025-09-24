
// A utility to convert an HTML element to a downloadable PNG.
// This version is designed to avoid canvas tainting issues by handling background images explicitly.

const getCssText = (): string => {
  let cssText = '';
  // Add base font styles to ensure they are captured, especially for fonts loaded from Google Fonts.
  cssText += `body { font-family: 'Inter', sans-serif; }`;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        for (const rule of Array.from(sheet.cssRules)) {
          cssText += rule.cssText;
        }
      }
    } catch (e) {
      console.warn("Can't read the css rules of: " + sheet.href, e);
    }
  }
  return cssText;
};

const embedStyles = (svgElement: SVGElement, cssText: string) => {
  const styleElement = document.createElement('style');
  styleElement.setAttribute('type', 'text/css');
  styleElement.innerHTML = cssText;
  svgElement.insertBefore(styleElement, svgElement.firstChild);
};


export const downloadElementAsPng = async (element: HTMLElement, filename: string): Promise<void> => {
  if (!element) {
    throw new Error('Element to download is not available');
  }

  const { width, height } = element.getBoundingClientRect();
  
  // Clone the node to avoid modifying the original element
  const clonedElement = element.cloneNode(true) as HTMLElement;

  // --- Start of fix for tainted canvas ---
  // 1. Get the computed background image style from the original element.
  const originalBackgroundImage = window.getComputedStyle(element).backgroundImage;
  const originalBackgroundSize = window.getComputedStyle(element).backgroundSize;
  
  // 2. Remove the background from the cloned HTML element to handle it separately in the SVG.
  clonedElement.style.backgroundImage = 'none';
  // --- End of fix ---
  
  // Set explicit dimensions on the clone
  clonedElement.style.width = `${width}px`;
  clonedElement.style.height = `${height}px`;
  clonedElement.style.position = 'absolute';
  clonedElement.style.left = '-9999px';
  clonedElement.style.overflow = 'hidden'; // Ensure content doesn't spill
  document.body.appendChild(clonedElement);

  // Convert all textareas to divs for rendering
  const textareas = clonedElement.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const div = document.createElement('div');
    // Copy styles from textarea to div
    div.style.cssText = textarea.style.cssText;
    div.className = textarea.className;
    div.innerHTML = textarea.value.replace(/\n/g, '<br>');
    textarea.parentNode?.replaceChild(div, textarea);
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  
  // --- Start of fix for tainted canvas ---
  // 3. Add the background image directly to the SVG as an <image> element.
  // This is more reliable than relying on CSS background-image in a foreignObject.
  if (originalBackgroundImage && originalBackgroundImage !== 'none') {
    const imageUrlMatch = originalBackgroundImage.match(/url\("?(.*?)"?\)/);
    if (imageUrlMatch && imageUrlMatch[1]) {
      const imageUrl = imageUrlMatch[1];
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', imageUrl);
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      // Try to preserve aspect ratio behavior from 'cover'.
      // 'xMidYMid slice' is the SVG equivalent of 'background-size: cover'.
      if (originalBackgroundSize === 'cover') {
         image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      }
      svg.appendChild(image);
    }
  }
  // --- End of fix ---

  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');
  
  const wrappedHtml = document.createElement('div');
  wrappedHtml.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrappedHtml.style.width = '100%';
  wrappedHtml.style.height = '100%';
  wrappedHtml.appendChild(clonedElement);
  
  foreignObject.appendChild(wrappedHtml);
  svg.appendChild(foreignObject); // This layers the HTML content ON TOP of the background image.
  
  // Capture all CSS and embed it.
  const cssText = getCssText();
  embedStyles(svg, cssText);

  const svgString = new XMLSerializer().serializeToString(svg);
  // Use btoa to handle potential special characters in the SVG string
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2; // Increase resolution for better quality
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
     // Clean up the cloned element that was appended to the body
    if (document.body.contains(clonedElement)) {
        document.body.removeChild(clonedElement);
    }
  };

  img.onerror = (e) => {
     if (document.body.contains(clonedElement)) {
        document.body.removeChild(clonedElement);
    }
      console.error("Failed to load SVG image for PNG conversion.", e);
      throw new Error("Failed to load SVG image for PNG conversion.");
  }

  img.src = svgDataUrl;
};
