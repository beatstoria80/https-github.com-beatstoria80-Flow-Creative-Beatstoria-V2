
import React from 'react';
import { Maximize2, MousePointer2, BoxSelect, Upload, Image as ImageIcon, Wand2, Loader2, RefreshCw, ArrowRight } from 'lucide-react';

interface ComfyCanvasProps {
  activeTab: 'image' | 'video';
  setActiveTab: (t: 'image' | 'video') => void;
  originalImage: string | null;
  generatedImages: string[];
  isCompareMode: boolean;
  selectedResultIndex: number;
  scanResults: any[];
  isAnalyzing: boolean;
  isScanning: boolean;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isNodeActive: boolean;
  nodesToAdd: string[];
  onNodesAdded: () => void;
  promptText: string;
  setPromptText: (t: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  mode: string;
  setMode: (m: string) => void;
  onImageUpdate: (src: string) => void;
}

export const ComfyCanvas: React.FC<ComfyCanvasProps> = ({ 
  originalImage, generatedImages, isCompareMode, selectedResultIndex, isGenerating, isAnalyzing, fileInputRef 
}) => {
  return (
    <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
      
      <div className="relative w-full h-full flex items-center justify-center">
        
        {!originalImage && !isGenerating && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-full max-w-lg aspect-video rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-700"
          >
             <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-all duration-500 border border-white/10 group-hover:bg-indigo-600 group-hover:text-white">
                <ImageIcon size={28} />
             </div>
             <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Initialize Visual Node</p>
                <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest">Awaiting production directive...</p>
             </div>
          </div>
        )}

        {(originalImage || isGenerating) && (
          <div className="relative w-full h-full flex items-center justify-center gap-6 transition-all duration-700">
            {/* Input Node - Compact & Larger */}
            <div className="relative flex-1 max-w-xl h-[70vh] rounded-3xl border border-white/10 bg-[#080808] shadow-2xl overflow-hidden group">
               {originalImage ? (
                 <img src={originalImage} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
               )}
               <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                  <span className="text-[7px] font-black uppercase tracking-widest text-white">SOURCE NODE</span>
               </div>
            </div>

            {/* Neural Bridge */}
            <div className="flex flex-col items-center gap-4 z-10 shrink-0">
               <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 ${isGenerating ? 'bg-orange-600 animate-pulse border-orange-400' : 'bg-white/5'}`}>
                  {isGenerating ? <RefreshCw className="animate-spin text-white" size={16} /> : <ArrowRight className="text-slate-600" size={16} />}
               </div>
            </div>

            {/* Output Node - Compact & Larger */}
            <div className="relative flex-1 max-w-xl h-[70vh] rounded-3xl border border-white/10 bg-[#080808] shadow-2xl overflow-hidden group">
               {isGenerating ? (
                 <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-md relative z-20">
                    <Loader2 size={32} className="animate-spin text-orange-500" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-orange-400 animate-pulse">SYNTHESIZING...</span>
                 </div>
               ) : (
                 generatedImages.length > 0 ? (
                   <img src={generatedImages[selectedResultIndex]} className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                      <Wand2 size={40} className="opacity-10 mb-4" />
                      <span className="text-[7px] font-black uppercase tracking-widest opacity-20">Awaiting Signal</span>
                   </div>
                 )
               )}
               <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-white">OUTPUT NODE</span>
                  <div className="w-1 h-1 rounded-full bg-orange-500"></div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
