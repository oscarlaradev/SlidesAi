import { GoogleGenAI, Type } from "@google/genai";
import { SlideData, TextElement } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export type ThemeOption = 'dark' | 'light' | 'vibrant';

const makeId = () => `slide_${Math.random().toString(36).substring(2, 11)}`;

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
        textElements: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: {
                        type: Type.STRING,
                        description: "A unique ID like 'title-1' or 'body-1'",
                    },
                    text: {
                        type: Type.STRING,
                        description: "Placeholder text relevant to the topic",
                    },
                    x: { type: Type.NUMBER, description: 'Position from left edge as a percentage (e.g., 10 for 10%)' },
                    y: { type: Type.NUMBER, description: 'Position from top edge as a percentage (e.g., 20 for 20%)' },
                    w: { type: Type.NUMBER, description: 'Width of the text box as a percentage (e.g., 80 for 80%)' },
                    h: { type: Type.NUMBER, description: 'Height of the text box as a percentage (e.g., 15 for 15%)' },
                    tailwindClasses: {
                        type: Type.STRING,
                        description: "A combination of Tailwind CSS classes for styling (typography, color). DO NOT include positioning classes (top, left, w-, h-). Examples: 'text-4xl font-bold text-white text-center', 'text-lg text-slate-200'",
                    },
                },
                    required: ['id', 'text', 'x', 'y', 'w', 'h', 'tailwindClasses'],
            },
        },
    },
    required: ['slideType', 'textElements'],
};

const generateAllSlidesFromOutline = async (topic: string, theme: ThemeOption, outline: string[]): Promise<SlideData[]> => {
    const themeInstruction = themeLayoutPrompts[theme];
    const prompt = `You are an expert presentation designer. Your task is to generate a full presentation deck based on the topic: "${topic}" and the provided outline.

**Outline:**
- ${outline.join('\n- ')}

**Instructions:**
1.  The first outline item should be a **Title Slide** for the presentation topic.
2.  For each subsequent point in the outline, create a corresponding **Content Slide** with a heading and informative body text.
3.  The last item in the outline should be a **Concluding Slide** (e.g., "Thank You" or "Q&A").
4.  ${themeInstruction}

**Output Requirements:**
- Provide your response as a single JSON object, which is an array of slide objects. Do not include markdown.
- The number of slides in the array must exactly match the number of points in the outline.
- Follow the schema for positioning (x, y, w, h as percentages) and styling (tailwindClasses for typography/color only).
- **CRITICAL LAYOUT RULES**:
    1.  **No Overlapping**: Bounding boxes MUST NOT overlap.
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
    const slides: SlideData[] = JSON.parse(jsonText);

    // Override slide types based on position, and assign unique IDs
    if (slides.length > 0) {
        slides[0].slideType = 'title';
        slides.forEach((slide, index) => {
            slide.id = makeId();
            if (index > 0) {
                slide.slideType = 'content';
            }
        });
    }

    return slides;
};


export const generateSingleSlide = async (topic: string, slides: SlideData[], theme: ThemeOption): Promise<SlideData> => {
    const themeInstruction = themeLayoutPrompts[theme];
    const previousSlideContent = slides.length > 0 ? JSON.stringify(slides[slides.length-1].textElements.map(el => el.text)) : 'This is the first slide after the title.';

    const prompt = `You are an expert presentation designer. Generate a single new 'content' slide for a presentation on the topic: "${topic}".
This new slide should logically follow the previous slide, which contained the following text: ${previousSlideContent}.
Create new, relevant content. Don't just repeat information.
${themeInstruction}
Provide your response as a single JSON object for one slide. Do not include markdown.
Follow the schema for positioning (x, y, w, h as percentages) and styling (tailwindClasses for typography/color only).
- **CRITICAL LAYOUT RULES**: No overlapping, stay within slide boundaries with 5% margin, ensure sufficient padding.
Create a creative, professional, and uncluttered layout.`;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: slideLayoutSchema
        },
    });

    const jsonText = response.text.trim();
    const newSlide: SlideData = JSON.parse(jsonText);
    newSlide.id = makeId(); // Assign unique ID
    newSlide.slideType = 'content';
    return newSlide;
}


export const regenerateSlideLayout = async (topic: string, existingSlide: SlideData, theme: ThemeOption): Promise<SlideData> => {
    const existingTexts = existingSlide.textElements.map(({ id, text }) => ({ id, text }));
    const themeInstruction = themeLayoutPrompts[theme];

    const prompt = `You are an expert presentation designer. Your task is to **redesign the layout** for a single presentation slide on the topic: "${topic}".

**Do NOT change the provided text content.** You must use the exact text provided for each element.
Your goal is to generate new, creative, and professional values for position (x, y, w, h) and styling (tailwindClasses).

${themeInstruction}

Here is the text content you must use:
${JSON.stringify(existingTexts)}

Provide your response as a single JSON object for one slide, following the schema. Do not include markdown formatting.
- **CRITICAL LAYOUT RULES**: No overlapping, stay within slide boundaries with 5% margin, ensure sufficient padding.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: slideLayoutSchema
        },
    });

    const jsonText = response.text.trim();
    const newLayout: SlideData = JSON.parse(jsonText);

    // CRITICAL: Ensure the original text and IDs are preserved.
    const originalTextsMap = new Map(existingSlide.textElements.map(el => [el.id, el.text]));
    newLayout.textElements.forEach(el => {
        if (originalTextsMap.has(el.id)) {
            el.text = originalTextsMap.get(el.id)!;
        }
    });

    newLayout.id = existingSlide.id; // Preserve original slide ID
    newLayout.slideType = existingSlide.slideType; // Preserve slide type

    return newLayout;
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
