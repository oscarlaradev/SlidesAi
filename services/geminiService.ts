import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, TextElement, ImageElement, ChartElement, IconElement } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export type ThemeOption = 'dark' | 'light' | 'vibrant';

const makeId = (prefix: string = 'id') => `${prefix}_${Math.random().toString(36).substring(2, 11)}`;

const themeImagePrompts: Record<ThemeOption, string> = {
    dark: "abstract, minimalist, and professional, with a dark and elegant aesthetic suitable for a corporate or creative presentation. Think subtle gradients, textures, and perhaps a single, non-distracting focal point. It should evoke a feeling of innovation and clarity.",
    light: "abstract, minimalist, and clean, with a bright and modern aesthetic. Use a light color palette, like whites, soft grays, and a single accent color. The feeling should be open, clear, and professional.",
    vibrant: "abstract, bold, and creative, with a vibrant and energetic aesthetic. Use a colorful palette with dynamic shapes and gradients. The feeling should be innovative, exciting, and memorable."
};

const themeLayoutPrompts: Record<ThemeOption, string> = {
    dark: "The background will be a dark, abstract, photorealistic image. You MUST ensure all text has excellent contrast and readability against a dark background. Use white or very light colors like 'text-slate-100'.",
    light: "The background will be a light, abstract, minimalist image. You MUST ensure all text has excellent contrast and readability against a light background. Use dark text colors like 'text-slate-800' or 'text-gray-900'.",
    vibrant: "The background will be a vibrant, colorful, abstract image. Text color must have strong contrast against a potentially complex background. Choose either very dark or very light text colors (e.g., 'text-white' or 'text-slate-900') to ensure readability."
};

const generateImagePrompt = async (topic: string, theme: ThemeOption): Promise<string> => {
    const themeDescription = themeImagePrompts[theme];
    const prompt = `Create a single, detailed, and sophisticated image generation prompt for a presentation background. The topic is "${topic}". The image should be ${themeDescription} Do not output anything other than the prompt itself.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text.trim();
};

const generateBackgroundImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed.");
    }

    return response.generatedImages[0].image.imageBytes;
};

const generateContentImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '4:3', // Good aspect ratio for content images
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Content image generation failed.");
    }

    return response.generatedImages[0].image.imageBytes;
};

export const generatePresentationOutline = async (topic: string): Promise<string[]> => {
    const prompt = `Create a concise and logical presentation outline for the topic: "${topic}".
    The outline should consist of key points that will become slide titles.
    Include an introduction and a conclusion/Q&A point. A good outline has between 4 and 7 points.
    Provide your response as a JSON object with a single key "outline" which is an array of strings. Do not include markdown.
    Example: { "outline": ["Introduction to Topic", "Key Area 1", "Key Area 2", "Case Study", "Conclusion & Next Steps"] }`;

    const outlineSchema = {
        type: Type.OBJECT,
        properties: {
            outline: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ['outline']
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: outlineSchema
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.outline;
};


const slideLayoutSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique ID for the slide"},
        slideType: {
            type: Type.STRING,
            description: "Either 'title' or 'content'",
        },
        speakerNotes: {
            type: Type.STRING,
            description: "Concise speaker notes (1-3 sentences) for the presenter, explaining key points in more detail. This text will NOT appear on the slide itself."
        },
        textElements: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique ID like 'title-1' or 'body-1'" },
                    text: { type: Type.STRING, description: "Placeholder text relevant to the topic" },
                    x: { type: Type.NUMBER, description: 'Position from left edge as a percentage (e.g., 10 for 10%)' },
                    y: { type: Type.NUMBER, description: 'Position from top edge as a percentage (e.g., 20 for 20%)' },
                    w: { type: Type.NUMBER, description: 'Width of the text box as a percentage (e.g., 80 for 80%)' },
                    h: { type: Type.NUMBER, description: 'Height of the text box as a percentage (e.g., 15 for 15%)' },
                    tailwindClasses: { type: Type.STRING, description: "A combination of Tailwind CSS classes for styling (typography, color). DO NOT include positioning classes. Examples: 'text-4xl font-bold text-white text-center', 'text-lg text-slate-200'" },
                },
                required: ['id', 'text', 'x', 'y', 'w', 'h', 'tailwindClasses'],
            },
        },
        imageElements: {
            type: Type.ARRAY,
            description: "An optional array of images to include on the slide. Only add images to content slides where they enhance the message. Do not add images to title or conclusion slides.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique ID like 'image-1'" },
                    imageGenerationPrompt: { type: Type.STRING, description: "A detailed, DALL-E style prompt to generate a photorealistic image relevant to the slide's content." },
                    x: { type: Type.NUMBER, description: 'Position from left edge as a percentage (e.g., 10 for 10%)' },
                    y: { type: Type.NUMBER, description: 'Position from top edge as a percentage (e.g., 20 for 20%)' },
                    w: { type: Type.NUMBER, description: 'Width of the image as a percentage (e.g., 40 for 40%)' },
                    h: { type: Type.NUMBER, description: 'Height of the image as a percentage (e.g., 50 for 50%)' },
                },
                required: ['id', 'imageGenerationPrompt', 'x', 'y', 'w', 'h'],
            }
        },
    },
    required: ['slideType', 'textElements', 'speakerNotes'],
};

const generateAllSlidesFromOutline = async (topic: string, theme: ThemeOption, outline: string[]): Promise<SlideData[]> => {
    const themeInstruction = themeLayoutPrompts[theme];
    const prompt = `You are an expert presentation designer. Your task is to generate a full presentation deck based on the topic: "${topic}" and the provided outline.

**Outline:**
- ${outline.join('\n- ')}

**Instructions:**
1.  The first outline item should be a **Title Slide**. Title slides should NOT contain images.
2.  For each subsequent point in the outline, create a corresponding **Content Slide** with a heading and informative body text.
3.  **For content slides, if it enhances the message, include one single, relevant, photorealistic image.** Generate a detailed image generation prompt for it. The layout must accommodate both the text and the image gracefully.
4.  The last item in the outline should be a **Concluding Slide** (e.g., "Thank You" or "Q&A"). Concluding slides should NOT contain images.
5.  For each slide, generate concise **speakerNotes**.
6.  ${themeInstruction}

**Output Requirements:**
- Provide your response as a single JSON object, which is an array of slide objects. Do not include markdown.
- The number of slides in the array must exactly match the number of points in the outline.
- Follow the schema for positioning (x, y, w, h as percentages) and styling (tailwindClasses for typography/color only).
- **CRITICAL LAYOUT RULES**:
    1.  **No Overlapping**: Bounding boxes of text and images MUST NOT overlap.
    2.  **Slide Boundaries**: All elements must be fully contained within the slide. Ensure a safe margin of at least 5% from all edges.
    3.  **Sufficient Padding**: Ensure ample empty space for a clean, professional look.
    4.  **Creative Layouts**: Use a variety of professional and visually appealing layouts across the slides. Do not make every slide look the same.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: slideLayoutSchema
            }
        },
    });

    const jsonText = response.text.trim();
    const slidesWithImagePrompts: any[] = JSON.parse(jsonText);

    const slidePromises = slidesWithImagePrompts.map(async (slide) => {
        let finalImageElements: ImageElement[] = [];
        if (slide.imageElements && slide.imageElements.length > 0) {
            const imagePromises = slide.imageElements.map(async (imgEl: any) => {
                const base64 = await generateContentImage(imgEl.imageGenerationPrompt);
                return {
                    id: imgEl.id,
                    x: imgEl.x,
                    y: imgEl.y,
                    w: imgEl.w,
                    h: imgEl.h,
                    base64: base64,
                };
            });
            finalImageElements = await Promise.all(imagePromises);
        }
        
        const finalSlide: SlideData = {
            id: makeId(),
            slideType: 'content', // will be overridden
            textElements: slide.textElements,
            imageElements: finalImageElements,
            speakerNotes: slide.speakerNotes,
        };
        return finalSlide;
    });

    const slides: SlideData[] = await Promise.all(slidePromises);

    // Override slide types based on position
    if (slides.length > 0) {
        slides[0].slideType = 'title';
    }

    return slides;
};


export const generateSingleSlide = async (topic: string, slides: SlideData[], theme: ThemeOption): Promise<SlideData> => {
    const themeInstruction = themeLayoutPrompts[theme];
    const previousSlideContent = slides.length > 0 ? JSON.stringify(slides[slides.length-1].textElements.map(el => el.text)) : 'Esta es la primera diapositiva después del título.';

    const prompt = `Eres un diseñador experto de presentaciones. Tu tarea es generar una única diapositiva de 'contenido' nueva en **español** para una presentación sobre el tema: "${topic}".
Esta nueva diapositiva debe seguir lógicamente a la diapositiva anterior, que contenía el siguiente texto: ${previousSlideContent}.
Crea contenido nuevo y relevante. No repitas información.
También genera **speakerNotes** concisas en **español** para esta nueva diapositiva.
Opcionalmente, incluye una imagen fotorrealista relevante si mejora el contenido.
${themeInstruction}
Proporciona tu respuesta como un único objeto JSON para una diapositiva. No incluyas markdown.
Sigue el esquema para el posicionamiento (x, y, w, h como porcentajes) y el estilo (tailwindClasses solo para tipografía/color).
- **REGLAS CRÍTICAS DE DISEÑO**: Sin superposiciones, mantente dentro de los límites de la diapositiva con un margen del 5%, asegura un relleno suficiente.
Crea un diseño creativo, profesional y despejado.`;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: slideLayoutSchema
        },
    });

    const jsonText = response.text.trim();
    const slideWithImagePrompts: any = JSON.parse(jsonText);
    
    let finalImageElements: ImageElement[] = [];
    if (slideWithImagePrompts.imageElements && slideWithImagePrompts.imageElements.length > 0) {
        const imagePromises = slideWithImagePrompts.imageElements.map(async (imgEl: any) => {
            const base64 = await generateContentImage(imgEl.imageGenerationPrompt);
            return {
                id: imgEl.id,
                x: imgEl.x,
                y: imgEl.y,
                w: imgEl.w,
                h: imgEl.h,
                base64: base64,
            };
        });
        finalImageElements = await Promise.all(imagePromises);
    }

    const newSlide: SlideData = {
        id: makeId(),
        slideType: 'content',
        textElements: slideWithImagePrompts.textElements,
        imageElements: finalImageElements,
        speakerNotes: slideWithImagePrompts.speakerNotes,
    }
    return newSlide;
}


export const regenerateSlideLayout = async (topic: string, existingSlide: SlideData, theme: ThemeOption): Promise<SlideData> => {
    const existingTexts = existingSlide.textElements.map(({ id, text }) => ({ id, text }));
    const existingImages = existingSlide.imageElements?.map(({ id }) => ({ id })) || [];
    const existingCharts = existingSlide.chartElements?.map(({ id }) => ({ id })) || [];
    const existingIcons = existingSlide.iconElements?.map(({ id }) => ({ id })) || [];
    const themeInstruction = themeLayoutPrompts[theme];

    const prompt = `You are an expert presentation designer. Your task is to **redesign the layout** for a single presentation slide on the topic: "${topic}".

**Do NOT change the provided text content, images, icons, or charts.** You must use the exact text provided and account for the number of all elements.
Your goal is to generate new, creative, and professional values for position (x, y, w, h) for ALL elements and styling (tailwindClasses) for text elements.

${themeInstruction}

Here is the content you must place in a new layout:
- Text Elements: ${JSON.stringify(existingTexts)}
- Image Placeholders: ${JSON.stringify(existingImages)}
- Chart Placeholders: ${JSON.stringify(existingCharts)}
- Icon Placeholders: ${JSON.stringify(existingIcons)}

Provide your response as a single JSON object for one slide, following the schema. Do not include markdown formatting.
Omit fields like 'speakerNotes', 'imageGenerationPrompt', 'text', 'svg', 'color', as they should not be changed.
- **CRITICAL LAYOUT RULES**: No overlapping elements, stay within slide boundaries with 5% margin, ensure sufficient padding. Create a visually balanced and professional composition.`;

    const layoutOnlySchema = {
        type: Type.OBJECT,
        properties: {
            slideType: { type: Type.STRING },
            textElements: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        w: { type: Type.NUMBER },
                        h: { type: Type.NUMBER },
                        tailwindClasses: { type: Type.STRING },
                    },
                    required: ['id', 'x', 'y', 'w', 'h', 'tailwindClasses'],
                }
            },
            imageElements: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        w: { type: Type.NUMBER },
                        h: { type: Type.NUMBER },
                    },
                    required: ['id', 'x', 'y', 'w', 'h'],
                }
            },
            chartElements: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        w: { type: Type.NUMBER },
                        h: { type: Type.NUMBER },
                    },
                    required: ['id', 'x', 'y', 'w', 'h'],
                }
            },
            iconElements: {
                 type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        w: { type: Type.NUMBER },
                        h: { type: Type.NUMBER },
                    },
                    required: ['id', 'x', 'y', 'w', 'h'],
                }
            }
        },
        required: ['slideType', 'textElements'],
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: layoutOnlySchema
        },
    });

    const jsonText = response.text.trim();
    const newLayoutData = JSON.parse(jsonText);

    // Reconstruct the slide, preserving all original content and only applying new layout values.
    const regeneratedSlide: SlideData = {
        ...existingSlide,
        slideType: newLayoutData.slideType || existingSlide.slideType,
        textElements: newLayoutData.textElements.map((newEl: any) => {
            const originalEl = existingSlide.textElements.find(e => e.id === newEl.id);
            return {
                ...(originalEl as TextElement),
                ...newEl,
                text: originalEl?.text || '', // Ensure original text is kept
            };
        }),
        imageElements: newLayoutData.imageElements?.map((newImgEl: any) => {
            const originalImgEl = existingSlide.imageElements?.find(e => e.id === newImgEl.id);
            return {
                ...(originalImgEl as ImageElement),
                ...newImgEl,
                base64: originalImgEl?.base64 || '', // Ensure original image data is kept
            };
        }) || existingSlide.imageElements,
        chartElements: newLayoutData.chartElements?.map((newChartEl: any) => {
            const originalChartEl = existingSlide.chartElements?.find(e => e.id === newChartEl.id);
            return {
                ...(originalChartEl as ChartElement),
                ...newChartEl,
            };
        }) || existingSlide.chartElements,
        iconElements: newLayoutData.iconElements?.map((newIconEl: any) => {
            const originalIconEl = existingSlide.iconElements?.find(e => e.id === newIconEl.id);
            return {
                ...(originalIconEl as IconElement),
                ...newIconEl,
            };
        }) || existingSlide.iconElements,
    };

    return regeneratedSlide;
};

export type RefinementType = 'shorten' | 'rephrase' | 'expand';

export const refineText = async (text: string, refinementType: RefinementType, topic: string): Promise<string> => {
    let prompt = '';
    switch (refinementType) {
        case 'shorten':
            prompt = `For a presentation on "${topic}", shorten this text to be more concise and impactful for a slide: "${text}"`;
            break;
        case 'rephrase':
            prompt = `For a presentation on "${topic}", rephrase this text to sound more professional and engaging: "${text}"`;
            break;
        case 'expand':
            prompt = `For a presentation on "${topic}", expand on this point with one or two brief, informative sentences: "${text}"`;
            break;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text.trim();
};

const chartDataSchema = {
    type: Type.OBJECT,
    properties: {
        chartType: { 
            type: Type.STRING,
            description: "The best chart type ('bar', 'line', or 'pie'). If no data is found, this should be 'none'.",
        },
        data: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.NUMBER }
                },
                required: ['label', 'value']
            }
        }
    },
    required: ['chartType', 'data']
};


export const generateChartFromText = async (text: string, topic: string): Promise<Omit<ChartElement, 'id' | 'x' | 'y' | 'w' | 'h'> | null> => {
    const prompt = `Analyze the following text from a presentation about "${topic}".
Text: "${text}"

Your task is to determine if this text contains quantifiable data suitable for a chart (bar, line, or pie).
- If it does, extract the data points (labels and their corresponding numeric values).
- Choose the best chart type to represent this data.
- The data should have at least two points.
- If the text does not contain clear, chartable data with at least two points, set chartType to 'none'.

Return a JSON object following the specified schema.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: chartDataSchema
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (result.chartType === 'none' || !result.data || result.data.length < 2) {
        return null;
    }

    return {
        chartType: result.chartType,
        data: result.data,
        options: {
            colors: ['#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'] // Default cyan theme
        }
    };
};

export const generatePresentation = async (topic: string, theme: ThemeOption, outline: string[]): Promise<{ slides: SlideData[], backgroundImage: string }> => {
    if (!topic) {
        throw new Error("Topic cannot be empty.");
    }
    if (!outline || outline.length === 0) {
        throw new Error("Outline cannot be empty.");
    }
    
    const imagePrompt = await generateImagePrompt(topic, theme);

    const [backgroundImage, slides] = await Promise.all([
        generateBackgroundImage(imagePrompt),
        generateAllSlidesFromOutline(topic, theme, outline)
    ]);

    return { slides, backgroundImage };
};

export const generateTextElement = async (prompt: string, topic: string, theme: ThemeOption): Promise<Omit<TextElement, 'id' | 'x' | 'y' | 'w' | 'h'>> => {
    const themeInstruction = themeLayoutPrompts[theme];
    const genPrompt = `For a presentation on "${topic}", generate a short piece of text (a heading or a few sentences) about: "${prompt}".
    ${themeInstruction}
    Provide your response as a JSON object with two keys: "text" and "tailwindClasses".
    For "tailwindClasses", suggest appropriate typography and color classes, e.g., "text-2xl font-bold text-white".`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING },
            tailwindClasses: { type: Type.STRING }
        },
        required: ['text', 'tailwindClasses']
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: genPrompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema
        }
    });

    return JSON.parse(response.text.trim());
};

export const generateImageElement = async (prompt: string): Promise<Omit<ImageElement, 'id' | 'x' | 'y' | 'w' | 'h'>> => {
    const detailedPrompt = `A photorealistic, professional image for a presentation slide about: ${prompt}. Cinematic lighting, high detail.`
    const base64 = await generateContentImage(detailedPrompt);
    return { base64 };
};


export const generateIconElement = async (prompt: string): Promise<Omit<IconElement, 'id'|'x'|'y'|'w'|'h'|'color'>> => {
    const genPrompt = `Generate a single, clean, modern, single-color, line-art style SVG icon representing the concept: "${prompt}".
    - The SVG MUST use \`currentColor\` for its stroke or fill to allow styling via CSS.
    - It must have a viewBox="0 0 24 24".
    - Do NOT include any XML declaration or comments.
    - Output ONLY the raw <svg>...</svg> string. Do not wrap it in JSON or markdown.

    Example for "email": <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: genPrompt
    });

    const svgText = response.text.trim().replace(/<\?xml.*?\?>/g, ''); // Sanitize just in case

    return { svg: svgText };
};
