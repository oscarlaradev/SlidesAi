import { SlideData, TextElement } from '../types';

// This file assumes pptxgenjs is loaded from a CDN and available on the window object.
const PptxGenJS = (window as any).PptxGenJS;

// --- Helper Maps ---

const tailwindColorToHex: Record<string, string> = {
    'text-white': 'FFFFFF',
    'text-black': '000000',
    'text-slate-100': 'F1F5F9',
    'text-slate-200': 'E2E8F0',
    'text-slate-300': 'CBD5E1',
    'text-slate-800': '1E293B',
    'text-gray-100': 'F3F4F6',
    'text-gray-200': 'E5E7EB',
    'text-gray-900': '111827',
};

const tailwindFontSizeToPt: Record<string, number> = {
    'text-xs': 9,
    'text-sm': 10.5,
    'text-base': 12,
    'text-lg': 13.5,
    'text-xl': 15,
    'text-2xl': 18,
    'text-3xl': 22.5,
    'text-4xl': 27,
    'text-5xl': 36,
    'text-6xl': 45,
    'text-7xl': 54,
};

type PptxTextStyle = {
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
};

const parseStyling = (classes: string): PptxTextStyle => {
    const style: PptxTextStyle = {};
    const classList = classes.split(/\s+/);

    classList.forEach(cls => {
        if (tailwindColorToHex[cls]) {
            style.color = tailwindColorToHex[cls];
        } else if (tailwindFontSizeToPt[cls]) {
            style.fontSize = tailwindFontSizeToPt[cls];
        } else if (cls === 'font-bold') {
            style.bold = true;
        } else if (cls === 'font-semibold') {
            style.bold = true; // PPTX doesn't have semibold, map to bold
        } else if (cls === 'italic') {
            style.italic = true;
        } else if (cls === 'text-center') {
            style.align = 'center';
        } else if (cls === 'text-right') {
            style.align = 'right';
        } else if (cls === 'text-left') {
            style.align = 'left';
        }
    });
    
    // Default vertical alignment
    style.valign = 'middle';

    return style;
};

export const createPptx = async (slidesData: SlideData[], backgroundImage: string, topic: string, filename: string): Promise<void> => {
    try {
        if (!PptxGenJS) {
            throw new Error('pptxgenjs library is not loaded.');
        }

        const pptx = new PptxGenJS();

        // --- Presentation Properties ---
        pptx.layout = 'LAYOUT_16x9';
        pptx.author = 'AI Presentation Designer';
        pptx.title = topic;

        let hasIcons = false;

        for (const slideData of slidesData) {
            const slide = pptx.addSlide();

            // Add background image to every slide
            slide.addImage({
                data: `data:image/jpeg;base64,${backgroundImage}`,
                x: 0,
                y: 0,
                w: '100%',
                h: '100%',
            });
            
            // Add a semi-transparent overlay to ensure text contrast, matching the web view
            slide.addShape(pptx.shapes.RECTANGLE, {
                x: 0, y: 0, w:'100%', h:'100%',
                fill: { color: '000000', transparency: 70 }
            });
            
            // Add content images
            if (slideData.imageElements) {
                for (const element of slideData.imageElements) {
                    slide.addImage({
                        data: `data:image/jpeg;base64,${element.base64}`,
                        x: `${element.x}%`,
                        y: `${element.y}%`,
                        w: `${element.w}%`,
                        h: `${element.h}%`,
                    });
                }
            }

            if (slideData.iconElements && slideData.iconElements.length > 0) {
                hasIcons = true;
            }

            // Add text elements
            for (const element of slideData.textElements) {
                const styling = parseStyling(element.tailwindClasses);
                
                slide.addText(element.text, {
                    x: `${element.x}%`,
                    y: `${element.y}%`,
                    w: `${element.w}%`,
                    h: `${element.h}%`,
                    ...styling,
                });
            }
            
            // Add chart elements
            if (slideData.chartElements) {
                for (const element of slideData.chartElements) {
                    const chartTypeMap = {
                        bar: PptxGenJS.charts.BAR,
                        line: PptxGenJS.charts.LINE,
                        pie: PptxGenJS.charts.PIE,
                    };
                    const chartType = chartTypeMap[element.chartType];
                    
                    if (chartType) {
                        const chartData = element.data.map(item => ({
                            name: 'Series 1', // A single series for simplicity
                            labels: element.data.map(d => d.label), // All labels
                            values: element.data.map(d => d.value) // All values
                        }));
                        
                        // We only need one entry for the series
                        const singleSeriesChartData = chartData.length > 0 ? [chartData[0]] : [];
                        
                        slide.addChart({
                            type: chartType,
                            data: singleSeriesChartData,
                            x: `${element.x}%`,
                            y: `${element.y}%`,
                            w: `${element.w}%`,
                            h: `${element.h}%`,
                            // Chart styling options to match the theme
                            chartColors: (element.options?.colors || ['22d3ee']).map(c => c.replace('#', '')),
                            dataLabelColor: 'FFFFFF',
                            catAxisLabelColor: 'F1F5F9',
                            valAxisLabelColor: 'F1F5F9',
                            valGridLine: { color: 'F1F5F9', style: 'dash', size: 1 },
                            showLegend: false,
                            showTitle: false,
                        });
                    }
                }
            }

            // Add speaker notes if they exist
            if (slideData.speakerNotes) {
                slide.addNotes(slideData.speakerNotes);
            }
        }

        if (hasIcons) {
            console.warn("PPTX Export Warning: Custom SVG icons are not supported by the export library and will not be included in the downloaded file.");
        }

        const blob = await pptx.write('blob');
        if (!blob) {
            throw new Error("Failed to generate PowerPoint file blob.");
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup after a short delay to ensure download has initiated
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
        }, 100);

    } catch (error) {
        console.error("Error creating PowerPoint file:", error);
        throw new Error("Could not create or download the PowerPoint file. Please check console for details.");
    }
};