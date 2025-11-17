import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SlideData, ChartElement, TextElement, ImageElement, IconElement, SlideElement } from './types';
import { 
    generatePresentation, generatePresentationOutline, generateSingleSlide, regenerateSlideLayout, refineText, 
    generateChartFromText, RefinementType, ThemeOption, generateTextElement, generateImageElement, generateIconElement 
} from './services/geminiService';
import { Slide } from './components/Slide';
import { AddElementMenu } from './components/AddElementMenu';
import { GenerationPromptInput } from './components/GenerationPromptInput';
import { createPptx } from './utils/pptxgenService';
import { MagicIcon, DownloadIcon, PlusIcon, TrashIcon, RefreshCwIcon, RotateCcwIcon, SparklesIcon, BarChartIcon, ShapesIcon } from './components/icons';


const OutlineReview: React.FC<{
  outline: string[];
  topic: string;
  onRegenerate: () => void;
  onCreate: () => void;
  isRegenerating: boolean;
}> = ({ outline, topic, onRegenerate, onCreate, isRegenerating }) => (
  <div className="text-center max-w-2xl mx-auto animate-fade-in bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
    <SparklesIcon className="w-12 h-12 mx-auto text-cyan-400 mb-4" />
    <h2 className="text-3xl font-bold text-white mb-2">Here's the Plan!</h2>
    <p className="text-slate-300 mb-6">We've drafted an outline for your presentation on "{topic}".</p>
    
    <ul className="text-left space-y-3 bg-slate-900/50 p-6 rounded-lg border border-slate-600 mb-8">
      {outline.map((item, index) => (
        <li key={index} className="flex items-start">
          <span className="bg-cyan-500 text-slate-900 font-bold rounded-full w-6 h-6 text-sm flex items-center justify-center mr-4 mt-1 flex-shrink-0">{index + 1}</span>
          <span className="text-slate-200 text-lg">{item}</span>
        </li>
      ))}
    </ul>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button onClick={onRegenerate} disabled={isRegenerating} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-600 text-white font-bold rounded-full hover:bg-slate-500 focus:outline-none focus:ring-4 focus:ring-gray-400/50 transition-all w-full sm:w-auto disabled:opacity-50">
        <RefreshCwIcon className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
        <span>Regenerate Outline</span>
      </button>
      <button onClick={onCreate} className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-slate-900 font-bold rounded-full hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-300/50 transition-all w-full sm:w-auto">
        <MagicIcon className="w-5 h-5" />
        <span>Create Presentation</span>
      </button>
    </div>
  </div>
);


const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [theme, setTheme] = useState<ThemeOption>('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  
  const [addElementMenu, setAddElementMenu] = useState<{ visible: boolean; x: number; y: number } | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState<{ visible: boolean; x: number; y: number; type: 'text' | 'image' | 'icon' | null }>({ visible: false, x: 0, y: 0, type: null });
  const slideContainerRef = useRef<HTMLDivElement>(null);


  const [generationStep, setGenerationStep] = useState<'topic' | 'outline' | 'slides'>('topic');
  const [outline, setOutline] = useState<string[] | null>(null);

  const activeSlideData = slides ? slides[activeSlideIndex] : null;

  const selectedElement = useMemo(() => {
    if (!activeSlideData || !selectedElementId) return null;
    return [
        ...(activeSlideData.textElements || []),
        ...(activeSlideData.imageElements || []),
        ...(activeSlideData.chartElements || []),
        ...(activeSlideData.iconElements || []),
    ].find(el => el.id === selectedElementId);
  }, [activeSlideData, selectedElementId]);

  const loadingMessages = [
    "Conjuring creative concepts...", "Drafting a compelling narrative...", "Finding the perfect visuals...",
    "Designing a stunning layout...", "Adding the finishing touches...",
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && generationStep === 'slides') {
      let i = 0;
      setLoadingMessage(loadingMessages[i]);
      interval = setInterval(() => { i = (i + 1) % loadingMessages.length; setLoadingMessage(loadingMessages[i]); }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, generationStep]);

  const resetState = () => {
    setSlides(null); setBackgroundImage(null); setActiveSlideIndex(0); setError(null); setTopic('');
    setDownloadFilename(''); setSelectedElementId(null); setSuggestion(null);
    setGenerationStep('topic'); setOutline(null);
  };

  const handleStartOver = () => {
      if (window.confirm("Are you sure you want to start over? All your changes will be lost.")) {
          resetState();
      }
  };
  
  const handleGenerateOutline = async () => {
    if (!topic.trim()) { setError('Please enter a topic to begin.'); return; }
    setIsLoading(true); setError(null); setOutline(null);
    setGenerationStep('outline');
    try {
      const result = await generatePresentationOutline(topic);
      setOutline(result);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while generating the outline.';
      setError(errorMessage);
      setGenerationStep('topic'); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePresentation = async () => {
    if (!topic.trim() || !outline) { return; }
    setIsLoading(true); setError(null); setSlides(null); setBackgroundImage(null); setActiveSlideIndex(0);
    setGenerationStep('slides');
    try {
      const result = await generatePresentation(topic, theme, outline);
      setSlides(result.slides);
      setBackgroundImage(result.backgroundImage);
      setDownloadFilename(`${topic.replace(/\s+/g, '_').toLowerCase()}.pptx`);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setGenerationStep('outline'); // Revert to outline screen on error
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSlide = async () => {
      if (!topic || !slides) return;
      setIsAddingSlide(true); setError(null);
      try {
          const newSlide = await generateSingleSlide(topic, slides, theme);
          setSlides(currentSlides => [...(currentSlides || []), newSlide]);
          setActiveSlideIndex(slides.length);
      } catch (e) {
          console.error("Failed to add slide:", e); setError(e instanceof Error ? `Failed to add slide: ${e.message}` : 'Could not add a new slide.');
      } finally {
          setIsAddingSlide(false);
      }
  };

  const handleRegenerateLayout = async () => {
      if (!activeSlideData) return;
      setIsRegenerating(true); setError(null);
      try {
          const regeneratedSlide = await regenerateSlideLayout(topic, activeSlideData, theme);
          setSlides(slides!.map((slide, index) => index === activeSlideIndex ? regeneratedSlide : slide));
      } catch (e) {
          console.error("Failed to regenerate layout:", e); setError(e instanceof Error ? `Failed to regenerate layout: ${e.message}` : 'Could not regenerate layout.');
      } finally {
          setIsRegenerating(false);
      }
  }

  const handleDeleteSlide = (indexToDelete: number) => {
      if (slides && slides.length <= 1) { setError("You can't delete the last slide."); return; }
      if (activeSlideData?.textElements.some(el => el.id === selectedElementId)) setSelectedElementId(null);
      setSlides(currentSlides => (currentSlides || []).filter((_, index) => index !== indexToDelete));
      if (activeSlideIndex >= indexToDelete) setActiveSlideIndex(prev => Math.max(0, prev - 1));
  }

  const handleDownloadPptx = async () => {
      if (slides && backgroundImage) {
          const filename = (downloadFilename.trim() || "presentation").replace(/\.pptx$/i, '') + '.pptx';
          try {
              await createPptx(slides, backgroundImage, topic, filename);
          } catch(e) {
              console.error("PPTX Download failed:", e);
              setError(e instanceof Error ? `Download failed: ${e.message}` : 'Could not download presentation.');
          }
      }
  };
  
  const handleTextChange = useCallback((slideIndex: number, textElementId: string, newText: string) => {
    setSlides(currentSlides => {
      if (!currentSlides) return null;
      return currentSlides.map((slide, index) => 
        index === slideIndex ? { ...slide, textElements: slide.textElements.map(el =>
            el.id === textElementId ? { ...el, text: newText } : el
        )} : slide
      );
    });
    if (textElementId === selectedElementId) {
        setSuggestion(null); // Clear suggestion if user edits manually
    }
  }, [selectedElementId]);
  
  const handleNotesChange = (newNotes: string) => {
    setSlides(currentSlides => {
        if (!currentSlides) return null;
        return currentSlides.map((slide, index) =>
            index === activeSlideIndex ? { ...slide, speakerNotes: newNotes } : slide
        );
    });
  };

  const handleElementSelect = (id: string | null) => {
    setSelectedElementId(id);
    setSuggestion(null);
    if (id) { // Only hide the add menu if we are selecting an element.
        setAddElementMenu(null);
    }
    setGenerationPrompt({ visible: false, x: 0, y: 0, type: null });
  }

  const handleRefineText = async (refinementType: RefinementType) => {
    if (!selectedElement || !('text' in selectedElement)) return;
    setIsSuggesting(true); setSuggestion(null); setError(null);
    try {
        const result = await refineText(selectedElement.text, refinementType, topic);
        setSuggestion(result);
    } catch(e) {
        console.error("Content suggestion failed:", e);
        setError("Could not get AI suggestion.");
    } finally {
        setIsSuggesting(false);
    }
  };

  const applySuggestion = () => {
    if (suggestion && selectedElementId && selectedElement && 'text' in selectedElement) {
        handleTextChange(activeSlideIndex, selectedElementId, suggestion);
        setSuggestion(null);
    }
  };

  const handleGenerateChart = async () => {
    if (!selectedElement || !('text' in selectedElement)) return;
    const textElement = selectedElement;
    setIsGeneratingChart(true); setError(null);
    try {
        const chartData = await generateChartFromText(textElement.text, topic);
        if (chartData) {
            const newChartElement: ChartElement = {
                id: `chart_${textElement.id}`,
                chartType: chartData.chartType,
                data: chartData.data,
                options: chartData.options,
                x: textElement.x,
                y: textElement.y,
                w: textElement.w,
                h: textElement.h,
            };

            setSlides(currentSlides => {
                if (!currentSlides) return null;
                return currentSlides.map((slide, index) => {
                    if (index !== activeSlideIndex) return slide;
                    const newTextElements = slide.textElements.filter(el => el.id !== textElement.id);
                    const newChartElements = [...(slide.chartElements || []), newChartElement];
                    return { ...slide, textElements: newTextElements, chartElements: newChartElements };
                });
            });
            setSelectedElementId(null);
        } else {
            setError("The selected text doesn't contain data that could be turned into a chart.");
        }
    } catch(e) {
        console.error("Chart generation failed:", e);
        setError("Could not generate a chart from the selected text.");
    } finally {
        setIsGeneratingChart(false);
    }
  };

    const handleElementUpdate = (updatedElement: SlideElement) => {
        setSlides(slides => slides!.map((slide, index) => {
            if (index !== activeSlideIndex) return slide;
            
            const update = (elements: any[] | undefined) =>
                elements?.map(el => el.id === updatedElement.id ? updatedElement : el);

            return {
                ...slide,
                textElements: update(slide.textElements) as TextElement[],
                imageElements: update(slide.imageElements) as ImageElement[],
                chartElements: update(slide.chartElements) as ChartElement[],
                iconElements: update(slide.iconElements) as IconElement[],
            };
        }));
    };
    
    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        setGenerationPrompt({ visible: false, x: 0, y: 0, type: null }); // Close prompt input on canvas click
        const rect = slideContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setAddElementMenu({ visible: true, x, y });
    };

    const handleSelectElementType = (type: 'text' | 'image' | 'icon') => {
        if (!addElementMenu) return;
        setGenerationPrompt({ visible: true, x: addElementMenu.x, y: addElementMenu.y, type });
        setAddElementMenu(null);
    };

    const handleAddElement = async (promptText: string) => {
        const { type, x, y } = generationPrompt;
        if (!type) return;

        setGenerationPrompt({ visible: false, x: 0, y: 0, type: null }); // Hide prompt input
        
        setIsLoading(true);
        setLoadingMessage(`Generating ${type}...`);
        try {
            let newElement: SlideElement | null = null;
            const position = { x: Math.max(0, x - 10), y: Math.max(0, y - 5) }; // Adjust position to top-left of element

            if (type === 'text') {
                const { text, tailwindClasses } = await generateTextElement(promptText, topic, theme);
                newElement = { id: `text_${Date.now()}`, text, tailwindClasses, ...position, w: 30, h: 10 };
            } else if (type === 'image') {
                const { base64 } = await generateImageElement(promptText);
                newElement = { id: `image_${Date.now()}`, base64, ...position, w: 25, h: 30 };
            } else if (type === 'icon') {
                const { svg } = await generateIconElement(promptText);
                newElement = { id: `icon_${Date.now()}`, svg, color: '#FFFFFF', ...position, w: 8, h: 8 };
            }

            if (newElement) {
                const el = newElement; // type guard
                setSlides(slides => slides!.map((slide, index) => {
                    if (index !== activeSlideIndex) return slide;
                    if (el.id.startsWith('text')) return { ...slide, textElements: [...slide.textElements, el as TextElement] };
                    if (el.id.startsWith('image')) return { ...slide, imageElements: [...(slide.imageElements || []), el as ImageElement] };
                    if (el.id.startsWith('icon')) return { ...slide, iconElements: [...(slide.iconElements || []), el as IconElement] };
                    return slide;
                }));
            }
        } catch (e) {
            console.error(`Failed to add ${type}:`, e);
            setError(`Could not generate the ${type}. Please try again.`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

  const handleDragStart = (e: React.DragEvent, index: number) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;
      const newSlides = [...slides!];
      const [draggedItem] = newSlides.splice(draggedIndex, 1);
      newSlides.splice(dropIndex, 0, draggedItem);
      setSlides(newSlides); setActiveSlideIndex(dropIndex); setDraggedIndex(null);
  };

  const renderContent = () => {
    if (isLoading && !activeSlideData) {
      return (
        <div className="text-center transition-opacity duration-500">
          <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400 mx-auto"></div>
          <p className="text-xl text-slate-300 mt-6 font-medium tracking-wide">
            {generationStep === 'outline' ? 'Drafting presentation outline...' : loadingMessage || "Generating..."}
          </p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center p-6 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-lg text-red-200">{error}</p>
              <button onClick={() => { setError(null); if(generationStep === 'slides') return; setGenerationStep('topic'); }} className="mt-4 px-4 py-2 bg-red-700 rounded-full hover:bg-red-600 transition">Try Again</button>
            </div>
        );
    }

    if (generationStep === 'outline' && outline) {
        return (
            <OutlineReview 
                outline={outline}
                topic={topic}
                onRegenerate={handleGenerateOutline}
                onCreate={handleCreatePresentation}
                isRegenerating={isLoading}
            />
        )
    }

    if (generationStep === 'slides' && slides && backgroundImage && activeSlideData) {
      return (
        <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-full max-w-5xl">
             <div className="relative group" ref={slideContainerRef}>
                {(isRegenerating || (isLoading && activeSlideData)) && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-30 rounded-lg"><div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div><p className="text-slate-300 ml-4">{loadingMessage}</p></div>}
                <button onClick={handleRegenerateLayout} disabled={isRegenerating} title="Regenerate Layout" className="absolute top-3 right-3 z-20 flex items-center gap-2 p-2 bg-slate-800/60 text-slate-200 font-bold rounded-full hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-500/50 transition-all duration-300 disabled:opacity-50 opacity-0 group-hover:opacity-100">
                   <RefreshCwIcon className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`}/>
                </button>
                <Slide 
                    slideData={activeSlideData} 
                    backgroundImage={backgroundImage} 
                    onTextChange={handleTextChange} 
                    slideIndex={activeSlideIndex} 
                    selectedElementId={selectedElementId} 
                    onElementSelect={handleElementSelect}
                    onElementUpdate={handleElementUpdate}
                    onCanvasClick={handleCanvasClick}
                />
                {addElementMenu?.visible && (
                   <AddElementMenu 
                        x={addElementMenu.x}
                        y={addElementMenu.y}
                        onSelectType={handleSelectElementType}
                   />
                )}
                {generationPrompt.visible && generationPrompt.type && (
                    <GenerationPromptInput
                        x={generationPrompt.x}
                        y={generationPrompt.y}
                        type={generationPrompt.type}
                        onGenerate={handleAddElement}
                        onCancel={() => setGenerationPrompt({ visible: false, x: 0, y: 0, type: null })}
                    />
                )}
            </div>
            
            <div className="mt-4 space-y-4">
                {/* Properties Panel */}
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-md font-semibold text-slate-300">Properties & AI Tools</h3>
                    </div>
                    {!selectedElementId && <p className="text-sm text-slate-400">Select an element to see its properties or click an empty area to add something new.</p>}
                    {selectedElement && (
                        <div>
                             {'text' in selectedElement && (
                                <>
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <button onClick={() => handleRefineText('shorten')} disabled={isSuggesting || isGeneratingChart} className="px-3 py-1 text-sm bg-slate-700 rounded-full hover:bg-slate-600 transition disabled:opacity-50">Shorten</button>
                                        <button onClick={() => handleRefineText('rephrase')} disabled={isSuggesting || isGeneratingChart} className="px-3 py-1 text-sm bg-slate-700 rounded-full hover:bg-slate-600 transition disabled:opacity-50">Rephrase</button>
                                        <button onClick={() => handleRefineText('expand')} disabled={isSuggesting || isGeneratingChart} className="px-3 py-1 text-sm bg-slate-700 rounded-full hover:bg-slate-600 transition disabled:opacity-50">Expand</button>
                                        <button onClick={handleGenerateChart} disabled={isSuggesting || isGeneratingChart} className="flex items-center gap-1.5 px-3 py-1 text-sm bg-cyan-800/70 text-cyan-200 rounded-full hover:bg-cyan-700 transition disabled:opacity-50">
                                            <BarChartIcon className="w-4 h-4" />
                                            <span>Visualize as Chart</span>
                                        </button>
                                    </div>
                                    {(isSuggesting || isGeneratingChart) && <div className="flex items-center gap-2 text-sm text-slate-400"><div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div><span>{isGeneratingChart ? 'Analyzing data and creating chart...' : 'Generating suggestion...'}</span></div>}
                                    {suggestion && (
                                        <div className="mt-2 p-3 bg-slate-900/50 border border-slate-600 rounded-md animate-fade-in">
                                            <p className="text-slate-200">{suggestion}</p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <button onClick={applySuggestion} className="px-3 py-1 text-sm bg-cyan-600 rounded-full hover:bg-cyan-500 transition">Apply</button>
                                                <button onClick={() => setSuggestion(null)} className="px-3 py-1 text-sm bg-slate-600 rounded-full hover:bg-slate-500 transition">Discard</button>
                                            </div>
                                        </div>
                                     )}
                                </>
                             )}
                             {'svg' in selectedElement && (
                                <div className="flex items-center gap-4">
                                    <label htmlFor="iconColor" className="text-sm font-medium text-slate-300">Icon Color</label>
                                    <input 
                                        type="color" 
                                        id="iconColor"
                                        value={(selectedElement as IconElement).color}
                                        onChange={e => handleElementUpdate({ ...selectedElement, color: e.target.value } as IconElement)}
                                        className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                        style={{'--color': (selectedElement as IconElement).color} as React.CSSProperties}
                                    />
                                </div>
                             )}
                             {('base64' in selectedElement || 'chartType' in selectedElement) && (
                                <p className="text-sm text-slate-400">More editing options for images and charts coming soon!</p>
                             )}
                        </div>
                    )}
                </div>
                {/* Speaker Notes */}
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg">
                    <h3 className="text-md font-semibold text-slate-300 mb-2">Speaker Notes</h3>
                    <textarea
                        value={activeSlideData.speakerNotes || ''}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="AI-generated speaker notes will appear here. You can edit them freely."
                        className="w-full h-24 bg-slate-900/50 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                        aria-label="Speaker notes"
                    />
                </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
             <input type="text" value={downloadFilename} onChange={e => setDownloadFilename(e.target.value)} placeholder="presentation_name.pptx" className="w-full sm:w-auto bg-slate-700/50 border border-slate-600 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder-slate-400" />
             <button onClick={handleDownloadPptx} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 font-bold rounded-full hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-300/50 transition-all duration-300">
                <DownloadIcon className="w-5 h-5"/>
                <span>Download .pptx</span>
             </button>
          </div>

          <div className="w-full max-w-7xl flex items-center justify-center gap-4 py-4 overflow-x-auto">
            {slides.map((slide, index) => (
              <div key={slide.id} className="relative group flex-shrink-0" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnd={() => setDraggedIndex(null)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} >
                  <div onClick={() => { setActiveSlideIndex(index); setSelectedElementId(null); }} className={`w-48 h-[108px] bg-slate-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${activeSlideIndex === index ? 'ring-4 ring-cyan-400' : 'ring-2 ring-transparent hover:ring-cyan-500'} ${draggedIndex === index ? 'opacity-50' : ''}`} >
                     <div className="pointer-events-none w-[1280px] h-[720px] origin-top-left" style={{ transform: `scale(0.15)`}}>
                        <Slide slideData={slide} backgroundImage={backgroundImage} onTextChange={() => {}} slideIndex={index} isThumbnail={true} selectedElementId={null} onElementSelect={() => {}} onElementUpdate={() => {}} onCanvasClick={() => {}} />
                     </div>
                  </div>
                   <button onClick={() => handleDeleteSlide(index)} disabled={slides.length <= 1} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete slide">
                       <TrashIcon className="w-4 h-4" />
                   </button>
              </div>
            ))}
            <button onClick={handleAddSlide} disabled={isAddingSlide} className="w-48 h-[108px] bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700/50 hover:border-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex-shrink-0">
                {isAddingSlide ? <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div> : <><PlusIcon className="w-8 h-8 mb-1" /> Add Slide</>}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center max-w-2xl mx-auto animate-fade-in">
        <MagicIcon className="w-16 h-16 mx-auto text-cyan-400 mb-4" />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">AI Presentation Designer</h1>
        <p className="mt-4 text-lg text-slate-300">
          Transform your ideas into stunning presentations. Just provide a topic, and let our AI craft a unique visual story for you.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black text-white p-4 sm:p-8 flex flex-col items-center">
      <main className="w-full max-w-7xl flex-grow flex flex-col items-center justify-center gap-12">
        {renderContent()}
      </main>
      <footer className="w-full max-w-4xl py-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-grow w-full">
            <input
              type="text" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isLoading && !slides && handleGenerateOutline()}
              placeholder="Enter a presentation topic..." aria-label="Presentation topic input" disabled={isLoading || !!slides}
              className="w-full pl-6 pr-4 sm:pr-40 py-4 text-lg bg-slate-800/50 border border-slate-700 rounded-full focus:ring-2 focus:ring-cyan-400 focus:outline-none transition-all placeholder-slate-500 disabled:opacity-50"
            />
          </div>

           <div className="flex items-center gap-4 w-full sm:w-auto">
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeOption)} disabled={isLoading || !!slides} className="bg-slate-800/50 border border-slate-700 rounded-full px-4 py-4 text-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none transition-all disabled:opacity-50 flex-grow sm:flex-grow-0">
              <option value="dark">Dark & Elegant</option>
              <option value="light">Bright & Modern</option>
              <option value="vibrant">Vibrant & Creative</option>
            </select>
            {slides ? (
                 <button onClick={handleStartOver} className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-600 text-white font-bold rounded-full hover:bg-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-400/50 transition-all transform hover:scale-105">
                     <RotateCcwIcon className="w-5 h-5"/>
                     <span>Start Over</span>
                 </button>
            ) : (
                 <button onClick={handleGenerateOutline} disabled={isLoading} className="flex items-center justify-center gap-2 px-6 py-4 bg-cyan-500 text-slate-900 font-bold rounded-full hover:bg-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-300/50 transition-all transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                     <MagicIcon className="w-5 h-5"/>
                     <span>Generate</span>
                 </button>
            )}
           </div>
        </div>
      </footer>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.7s ease-out forwards; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; }
        input[type="color"] { background-color: var(--color); border-radius: 50%; border: 2px solid white; }
      `}</style>
    </div>
  );
};

export default App;