import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { 
  X, Type, Zap, Image as ImageIcon, Download, 
  Loader2, Wand2, Sparkles, CheckCircle2, 
  RefreshCw, Eraser, MoveRight, FileCode, Layers, Box, 
  ToggleRight, ToggleLeft, Scissors, Minimize2, Maximize2, GripHorizontal,
  Ruler, Palette, AlignCenter, AlignLeft, AlignRight, AlignJustify,
  History, Trash2, Check, ChevronDown
} from 'lucide-react';
import { generateNanoImage } from '../../services/geminiService';
import { removeBackgroundLocal, purgeSpecificColor } from '../../services/visionService';
import { TextLayer } from '../../types';

interface NeuralTypefaceStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  targetLayer?: TextLayer; 
}

// INDUSTRY STANDARD PRESETS (Smart Materials)
const MATERIAL_LIBRARY = [
  { 
    label: "Liquid Chrome", 
    class: "from-gray-100 to-gray-300 text-gray-800",
    prompt: "molten chrome liquid metal texture applied to letters, glossy reflection, sharp edges, clean studio look" 
  },
  { 
    label: "Neon Glass", 
    class: "from-blue-100 to-purple-100 text-indigo-600",
    prompt: "glowing neon tubes formed into letters, glass casing, self-illuminated text, clean look" 
  },
  { 
    label: "Holographic", 
    class: "from-indigo-100 via-purple-100 to-pink-100 text-purple-700",
    prompt: "iridescent holographic foil material on text, prism color reflection, metallic foil surface" 
  },
  { 
    label: "Balloon Foil", 
    class: "from-pink-100 to-rose-200 text-rose-700",
    prompt: "inflated metallic balloon lettering, rose gold mylar material, tight creases, high gloss" 
  },
  { 
    label: "Volumetric Fire", 
    class: "from-orange-100 to-red-100 text-orange-700",
    prompt: "letters made of pure fire, burning text content, flame texture on font, self-luminous, no smoke background" 
  },
  { 
    label: "Glitch Data", 
    class: "from-emerald-100 to-teal-100 text-emerald-700",
    prompt: "digital pixelated glitch texture on letters, data mosh effect, matrix code surface, sharp vector edges" 
  },
  { 
    label: "Organic Slime", 
    class: "from-lime-100 to-green-100 text-lime-700",
    prompt: "text made of green slime, dripping gooey texture, wet surface, sharp separation" 
  },
  { 
    label: "Gold Bullion", 
    class: "from-yellow-100 to-amber-100 text-amber-700",
    prompt: "solid gold bar texture, expensive metallic look, chamfered edges, polished surface" 
  }
];

const FONTS = [
  "Poppins Medium", "Poppins Black", "Roboto Medium", "Roboto Light", "Anton",
  "Bebas Neue", "Oswald Medium", "Oswald Light", "Saira Condensed Medium",
  "Saira Condensed Regular", "Montserrat Medium", "Noto Sans Medium",
  "Montserrat Light", "Noto Sans Regular", "Righteous", "Permanent Marker",
  "Merriweather", "Pacifico"
];

export const NeuralTypefaceStudio: React.FC<NeuralTypefaceStudioProps> = ({ isOpen, onClose, onApply, targetLayer }) => {
  const [textInput, setTextInput] = useState("TEXT");
  const [stylePrompt, setStylePrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showFontList, setShowFontList] = useState(false);
  
  // HISTORY STATE
  const [history, setHistory] = useState<string[]>([]);
  
  // Controlled Rnd State
  const [rndState, setRndState] = useState({
    x: window.innerWidth / 2 - 500,
    y: window.innerHeight / 2 - 320,
    width: 1000,
    height: 640
  });
  const [savedHeight, setSavedHeight] = useState(640);
  
  const [detectedRatio, setDetectedRatio] = useState("1:1");
  const [metricInfo, setMetricInfo] = useState("Default Config");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevTargetId = useRef<string | null>(null);
  const prevIsOpen = useRef<boolean>(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowFontList(false); 
    };
    document.addEventListener("mousedown", handleClick); 
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getFontCSS = (fontString: string) => {
    if (!fontString) return { fontFamily: 'Montserrat', fontWeight: 400, label: fontString };
    const parts = fontString.split(' ');
    const lastPart = parts[parts.length - 1];
    const weights: Record<string, number> = {
        'Thin': 100, 'Light': 300, 'Regular': 400, 'Medium': 500,
        'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800, 'Black': 900
    };
    if (weights[lastPart]) return { fontFamily: parts.slice(0, -1).join(' '), fontWeight: weights[lastPart], label: fontString };
    return { fontFamily: fontString, fontWeight: 400, label: fontString };
  };

  const calculateTextMetrics = (text: string, layer: TextLayer | undefined) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return { ratio: "1:1", info: "Canvas Error" };

      const fontSize = layer?.font_size || 200;
      const font = layer?.font || "Inter";
      const letterSpacing = layer?.letter_spacing || 0;
      const lineHeight = layer?.line_height || 1.0;
      
      const fontStr = `900 ${fontSize}px "${font}"`;
      ctx.font = fontStr;
      
      const lines = text.split('\n');
      let maxWidth = 0;
      
      lines.forEach(line => {
          const w = ctx.measureText(line).width + (letterSpacing * line.length);
          if (w > maxWidth) maxWidth = w;
      });

      const totalHeight = (fontSize * lineHeight) * lines.length * 2.0; 
      const realRatio = maxWidth / totalHeight;
      
      let targetRatio = "1:1";
      if (realRatio > 2.0) targetRatio = "16:9";
      else if (realRatio < 0.5) targetRatio = "9:16";
      else targetRatio = "1:1";
      
      return {
          ratio: targetRatio,
          width: maxWidth,
          height: totalHeight,
          info: `${lines.length} Lines • ${Math.round(maxWidth)}x${Math.round(totalHeight)}`
      };
  };

  const renderLayoutReference = (text: string, layer: TextLayer | undefined, ratio: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      let width = 1024;
      let height = 1024;
      if (ratio === '16:9') { height = 576; }
      else if (ratio === '9:16') { width = 576; }
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const lines = text.split('\n');
      const lineCount = lines.length;
      const margin = 100;
      const availableWidth = width - (margin * 2);
      const availableHeight = height - (margin * 2);
      
      const lineHeightRel = layer?.line_height || 1.1;
      const baseSizeByHeight = availableHeight / (lineCount * lineHeightRel);
      const maxCharCount = Math.max(...lines.map(l => l.length));
      const baseSizeByWidth = availableWidth / (maxCharCount * 0.6);
      const fontSize = Math.min(baseSizeByHeight, baseSizeByWidth, 400) * 0.60; 

      const font = layer?.font ? layer.font : "Inter";
      const align = layer?.alignment || 'center';
      
      ctx.font = `900 ${fontSize}px "${font}", sans-serif`; 
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'middle';
      
      let x = width / 2;
      if (align === 'left') { x = margin; ctx.textAlign = 'left'; }
      else if (align === 'right') { x = width - margin; ctx.textAlign = 'right'; }
      else { ctx.textAlign = 'center'; }

      const totalTextBlockHeight = lineCount * (fontSize * lineHeightRel);
      const startY = (height - totalTextBlockHeight) / 2 + (fontSize * lineHeightRel) / 2;

      lines.forEach((line, i) => {
          ctx.fillText(line.toUpperCase(), x, startY + (i * fontSize * lineHeightRel));
      });

      return canvas.toDataURL('image/png');
  };

  useEffect(() => {
      if (isOpen && targetLayer) {
          const hasTargetChanged = targetLayer.id !== prevTargetId.current;
          const hasJustOpened = isOpen && !prevIsOpen.current;
          if (hasTargetChanged || hasJustOpened) {
              setTextInput(targetLayer.text.toUpperCase());
              setIsMinimized(false);
              setRndState(prev => ({ ...prev, height: 600 }));
              prevTargetId.current = targetLayer.id;
          }
      } else {
          prevTargetId.current = null;
      }
      prevIsOpen.current = isOpen;
  }, [isOpen, targetLayer]);

  useEffect(() => {
      const textToMeasure = textInput || (targetLayer?.text || "TEXT");
      const metrics = calculateTextMetrics(textToMeasure, targetLayer);
      setDetectedRatio(metrics.ratio);
      setMetricInfo(metrics.info);
  }, [textInput, targetLayer]);

  const toggleMinimize = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMinimized) {
          setRndState(prev => ({ ...prev, height: savedHeight }));
          setIsMinimized(false);
      } else {
          setSavedHeight(rndState.height);
          setRndState(prev => ({ ...prev, height: 60 }));
          setIsMinimized(true);
      }
  };

  const handleGenerate = async () => {
    if (!textInput.trim() || !stylePrompt.trim()) return;
    setIsProcessing(true);
    setResultImage(null);
    setProgress(0);
    setIsAdded(false);
    try {
      setProcessStep("CONSTRUCTING GEOMETRY MAP...");
      setProgress(10);
      const p = stylePrompt.toLowerCase();
      const isDarkText = p.includes('black') || p.includes('dark') || p.includes('charcoal') || p.includes('obsidian') || p.includes('shadow');
      const bgHex = isDarkText ? '#FFFFFF' : '#000000';
      const bgName = isDarkText ? 'WHITE' : 'BLACK';
      const referenceImage = renderLayoutReference(textInput, targetLayer, detectedRatio);
      setProcessStep("NEURAL TEXTURE SYNTHESIS...");
      setProgress(30);
      const fullPrompt = `
      TASK: TEXTURE MAPPING & 3D RENDERING.
      INPUT: Use the provided image as a STRICT GEOMETRIC BLUEPRINT/MASK.
      GOAL: Render the text "${textInput.toUpperCase().replace(/\n/g, ' ')}" exactly as shown in the blueprint, but made of this material: "${stylePrompt}".
      [STRUCTURAL CONSTRAINTS]
      1. PRESERVE GEOMETRY: Match the blueprint exactly.
      2. SOLID BACKGROUND: Render on a flat, solid ${bgName} background (${bgHex}).
      3. MARGINS: GENERATE effects (fire, liquid, drips, glow, etc.) that extend OUTWARDS from letters.
      [VISUAL STYLE]
      - Material: ${stylePrompt}
      - Quality: Photorealistic 8K, sharp edges, studio lighting.
      `;
      const rawImage = await generateNanoImage(fullPrompt, detectedRatio, referenceImage ? [referenceImage] : null, "Vivid Pop");
      setProgress(60);
      let finalImage = rawImage;
      if (autoRemoveBg) {
          setProcessStep("ALPHA CHANNEL EXTRACTION...");
          try {
              finalImage = await purgeSpecificColor(rawImage, bgHex, 30);
          } catch (bgError) {
              setProcessStep("FALLBACK NEURAL CUT...");
              finalImage = await removeBackgroundLocal(rawImage, (p) => setProgress(60 + (p * 0.4)));
          }
      }
      setResultImage(finalImage);
      setHistory(prev => [finalImage, ...prev]);
      setProgress(100);
    } catch (error) {
      console.error(error);
      alert("Failed to generate typeface.");
    } finally {
      setIsProcessing(false);
      setProcessStep("");
      if (isMinimized) {
          setIsMinimized(false);
          setRndState(prev => ({ ...prev, height: savedHeight }));
      }
    }
  };

  const handleExport = (format: 'png' | 'svg') => {
    if (!resultImage) return;
    const filename = `neural_type_${textInput.replace(/\n/g, '_')}_${Date.now()}`;
    if (format === 'png') {
        downloadBlob(resultImage, `${filename}.png`);
    } else {
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="576"><image href="${resultImage}" width="1024" height="576" /></svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        downloadBlob(url, `${filename}.svg`);
    }
  };

  const currentFont = targetLayer?.font || 'Montserrat Medium';
  const currentFontStyle = getFontCSS(currentFont);

  const downloadBlob = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <Rnd
      size={{ width: rndState.width, height: rndState.height }}
      position={{ x: rndState.x, y: rndState.y }}
      onDragStop={(e, d) => setRndState(prev => ({ ...prev, x: d.x, y: d.y }))}
      onResizeStop={(e, direction, ref, delta, position) => {
          setRndState({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
              ...position
          });
      }}
      minWidth={isMinimized ? 250 : 900}
      minHeight={isMinimized ? 60 : 400}
      bounds="window"
      dragHandleClassName="drag-handle"
      enableResizing={!isMinimized}
      className="z-[5000]"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className={`w-full h-full rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative transition-all duration-300 border border-white/40`}>
        <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl z-0"></div>
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-indigo-200/30 via-purple-200/30 to-pink-200/30 animate-spin-slow pointer-events-none z-0" style={{ filter: 'blur(80px)' }} />
        
        <div className={`h-14 px-6 flex items-center justify-between bg-white/30 backdrop-blur-md drag-handle cursor-move shrink-0 relative z-10 ${isMinimized ? '' : 'border-b border-white/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ${isProcessing ? 'animate-pulse' : ''}`}>
              {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Type size={16} strokeWidth={3} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Neural Typeface</span>
              {!isMinimized && <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Morph Engine Active</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 no-drag" onMouseDown={e => e.stopPropagation()}>
            <button onClick={toggleMinimize} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 text-slate-500 hover:text-slate-800 transition-all">
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-500 hover:text-red-500 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
            <div className="flex-1 flex overflow-hidden relative z-10">
                <div className="w-[340px] border-r border-white/20 flex flex-col p-6 overflow-y-auto custom-scrollbar shrink-0 bg-white/20">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Type size={12} className="text-indigo-500" /> Target Text
                            </label>
                            <textarea 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value.toUpperCase())}
                                placeholder="ENTER WORD..."
                                className="w-full h-24 bg-white/60 border border-white/40 rounded-2xl px-4 py-4 text-xl font-black text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-center tracking-widest uppercase shadow-sm resize-none"
                            />
                        </div>

                        <div className="space-y-2 relative" ref={dropdownRef}>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Ruler size={12} className="text-indigo-500" /> Source Font
                            </label>
                            <button 
                                onClick={() => setShowFontList(!showFontList)} 
                                className="w-full bg-white/60 border border-white/40 rounded-2xl px-4 py-3 text-left flex items-center justify-between hover:border-indigo-400 shadow-sm transition-all group"
                            >
                                <span className="text-[14px] font-black text-slate-800 truncate" style={{ fontFamily: currentFontStyle.fontFamily, fontWeight: currentFontStyle.fontWeight }}>
                                    {currentFontStyle.label}
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-500 transition-transform ${showFontList ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showFontList && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] max-h-[250px] overflow-y-auto p-1.5 flex flex-col gap-1 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {FONTS.map(font => {
                                        const fStyle = getFontCSS(font);
                                        return (
                                            <button 
                                                key={font} 
                                                onClick={() => { setTextInput(textInput); setShowFontList(false); }} 
                                                className={`text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${currentFont === font ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                <span className="text-[14px] font-black leading-none" style={{ fontFamily: fStyle.fontFamily, fontWeight: fStyle.fontWeight }}>{font}</span>
                                                {currentFont === font && <Check size={14} className="text-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Wand2 size={12} className="text-pink-500" /> Material Logic
                            </label>
                            <textarea 
                                value={stylePrompt}
                                onChange={(e) => setStylePrompt(e.target.value)}
                                placeholder="Describe the texture material (e.g., 'Molten gold dripping')..."
                                className="w-full h-20 bg-white/60 border border-white/40 rounded-2xl px-4 py-3 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all resize-none leading-relaxed shadow-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-white/40 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2"><Scissors size={12} className="text-teal-500" /> Auto Alpha Cut</span>
                                <span className="text-[7px] text-slate-400 font-medium ml-5">Smart Instant Chroma</span>
                            </div>
                            <button onClick={() => setAutoRemoveBg(!autoRemoveBg)} className={`transition-colors ${autoRemoveBg ? 'text-teal-500' : 'text-slate-300'}`}>{autoRemoveBg ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}</button>
                        </div>

                        <div className="space-y-3 flex-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Palette size={12} className="text-purple-500" /> Quick Styles</label>
                            <div className="grid grid-cols-2 gap-2">
                                {MATERIAL_LIBRARY.map((style, i) => (
                                    <button key={i} onClick={() => setStylePrompt(style.prompt)} className={`relative overflow-hidden px-3 py-3 rounded-xl text-left transition-all group border border-white/20 hover:border-white/60 active:scale-95 bg-gradient-to-br ${style.class} shadow-sm hover:shadow-md`}><span className="text-[8px] font-black uppercase tracking-wider block drop-shadow-sm truncate">{style.label}</span></button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isProcessing || !textInput || !stylePrompt} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-auto">{isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}{isProcessing ? 'MORPHING...' : 'GENERATE ASSET'}</button>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 relative flex items-center justify-center p-8 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`, backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center gap-6 relative z-10 animate-in fade-in zoom-in duration-500 w-full max-w-[200px]">
                            <div className="relative w-20 h-20"><div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div><div className="absolute inset-0 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-black text-indigo-600">{Math.round(progress)}%</span></div></div>
                            <div className="w-full space-y-2 text-center"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse block">{processStep}</span><div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} /></div></div>
                        </div>
                    ) : resultImage ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500">
                            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden p-4"><img src={resultImage} className="max-w-full max-h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" /></div>
                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-xl relative z-20 shrink-0">
                                <button onClick={() => handleExport('png')} className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-200 hover:border-indigo-200 hover:text-indigo-600"><ImageIcon size={12} /> PNG</button>
                                <div className="w-px h-6 bg-slate-200" />
                                <button onClick={() => { onApply(resultImage); setIsAdded(true); setTimeout(() => setIsAdded(false), 1500); }} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${isAdded ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/30'}`}>{isAdded ? <CheckCircle2 size={12} /> : <MoveRight size={12} />} {isAdded ? 'ADDED' : 'ADD TO CANVAS'}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4 opacity-40 select-none"><div className="w-20 h-20 mx-auto rounded-[2rem] bg-white border-2 border-dashed border-slate-300 flex items-center justify-center shadow-sm"><Type size={36} className="text-slate-400" /></div><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">AI Typeface Generator Ready</p></div>
                    )}
                </div>

                <div className="w-[140px] border-l border-white/20 bg-white/30 backdrop-blur-md flex flex-col shrink-0 overflow-hidden">
                    <div className="p-3 border-b border-white/20 flex items-center justify-between bg-white/40"><div className="flex items-center gap-1.5 text-slate-600"><History size={12} /><span className="text-[9px] font-black uppercase tracking-widest">History</span></div>{history.length > 0 && (<button onClick={() => setHistory([])} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>)}</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {history.map((src, i) => (
                            <div key={i} className={`group relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${resultImage === src ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5 hover:border-indigo-300'}`} onClick={() => setResultImage(src)}><img src={src} className="w-full h-full object-contain bg-slate-100" /><button onClick={(e) => { e.stopPropagation(); setHistory(prev => prev.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><X size={10} /></button></div>
                        ))}
                        {history.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-2"><div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center"><History size={16} /></div><span className="text-[8px] font-black uppercase tracking-widest text-center">No Cache</span></div>)}
                    </div>
                </div>
            </div>
        )}
      </div>
    </Rnd>
  );
};
