
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
// Fixed: detectObjects and refinePrompt are not exported from geminiService and are unused here
import { generateNanoImage, describeImage } from '../services/geminiService';
// @ts-ignore
import * as htmlToImage from 'html-to-image';

// Import Modular Components
import { StudioHeader } from './studio/StudioHeader';
import { NewsFeed } from './studio/NewsFeed';
import { ResultsPanel } from './studio/ResultsPanel';
import { ComfyCanvas } from './studio/ComfyCanvas';
import { BottomControls } from './studio/BottomControls';

import { ChatMessage, DetectedObject } from '../types';

const PRESET_DATA = {
  Style: [
    { label: "Cinematic", value: "cinematic lighting, movie scene, dramatic atmosphere, color graded" },
    { label: "Studio", value: "professional studio lighting, clean background, 8k resolution, sharp focus" },
    { label: "Neon", value: "cyberpunk style, neon lights, high contrast, futuristic vibe" },
    { label: "Matte", value: "matte finish, soft lighting, pastel colors, minimalist" }
  ],
  Sport: [
    { label: "Soccer", value: "soccer jersey, grass field background, dynamic kicking pose" },
    { label: "Gym", value: "fitness gear, gym environment, dumbbell weights, intense workout" },
    { label: "Running", value: "marathon runner, blurred street background, motion blur, energetic" }
  ]
};

interface BeatstoriaStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage: string | null;
  onApply: (src: string) => void;
  onAddToGallery: (src: string) => void;
  isSmartAssistantActive: boolean;
  toggleSmartAssistant: () => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onLogSmartAction: (action: string) => void;
  onExecuteAiCommand?: (command: any) => void;
  onSendMessage: (text?: string) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  chatAttachments: {file: File, url: string}[];
  setChatAttachments: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  chatSession: React.MutableRefObject<Chat | null>;
}

export const BeatstoriaStudio: React.FC<BeatstoriaStudioProps> = ({ 
    isOpen, onClose, initialImage, onApply, onAddToGallery,
    isSmartAssistantActive, toggleSmartAssistant, chatMessages, setChatMessages,
    onLogSmartAction, onSendMessage, chatInput, setChatInput, isChatLoading, setIsChatLoading,
    chatAttachments, setChatAttachments, chatSession
}) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [nodesToAdd, setNodesToAdd] = useState<string[]>([]);
  const [currentResults, setCurrentResults] = useState<string[]>([]); 
  const [historyResults, setHistoryResults] = useState<string[]>([]); 
  const [promptText, setPromptText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [mode, setMode] = useState("Txt2Img"); 
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(200); // More compact default
  const [rightPanelWidth, setRightPanelWidth] = useState(260); // More compact default
  const [bottomPanelHeight, setBottomPanelHeight] = useState(140); // Slimmer bottom header
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage) {
      setOriginalImage(initialImage);
      handleAnalyze(initialImage);
    }
  }, [initialImage, isOpen]);

  const handleAnalyze = async (img: string) => {
    setIsAnalyzing(true);
    try { 
      const desc = await describeImage(img); 
      setPromptText(desc); 
    } catch (e) {} finally { setIsAnalyzing(false); }
  };

  const handleGenerate = async (overridePrompt?: string, count: number = 4) => {
      const textToUse = overridePrompt || promptText;
      if (!textToUse.trim()) return;
      if (currentResults.length > 0) setHistoryResults(prev => [...currentResults, ...prev]);
      setIsGenerating(true);
      try {
          const inputImages = mode !== "Txt2Img" ? originalImage : null;
          const promises = Array(count).fill(0).map(() => generateNanoImage(textToUse, aspectRatio, inputImages));
          const results = await Promise.all(promises);
          setCurrentResults(results);
          setSelectedResultIndex(0);
      } catch (e) {} finally { setIsGenerating(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans animate-in fade-in duration-500">
        <StudioHeader 
            onClose={onClose} 
            showAiPanel={showAiPanel}
            onToggleAiPanel={() => setShowAiPanel(prev => !prev)}
        />
        
        <div className="flex-1 flex overflow-hidden relative">
            <NewsFeed width={leftPanelWidth} />
            <ComfyCanvas 
                activeTab={activeTab} setActiveTab={setActiveTab}
                originalImage={originalImage} generatedImages={currentResults} 
                isCompareMode={isCompareMode} selectedResultIndex={selectedResultIndex}
                scanResults={[]} isAnalyzing={isAnalyzing} isScanning={false}
                handleUpload={() => {}} fileInputRef={fileInputRef}
                isNodeActive={mode !== "Txt2Img"} nodesToAdd={nodesToAdd} onNodesAdded={() => setNodesToAdd([])}
                promptText={promptText} setPromptText={setPromptText}
                onGenerate={() => handleGenerate(undefined, 4)} isGenerating={isGenerating}
                mode={mode} setMode={setMode}
                onImageUpdate={setOriginalImage}
            />
            <ResultsPanel width={rightPanelWidth} currentImages={currentResults} historyImages={historyResults} onApply={onApply} onUseAsInput={setOriginalImage} onAddToGallery={onAddToGallery} onRemoveBg={() => {}} onDelete={(src, hist) => hist ? setHistoryResults(p => p.filter(i => i !== src)) : setCurrentResults(p => p.filter(i => i !== src))} onAddNode={src => setNodesToAdd(p => [...p, src])} selectedResultIndex={selectedResultIndex} setSelectedResultIndex={setSelectedResultIndex} />
        </div>

        <BottomControls 
            height={bottomPanelHeight} 
            aiPanelWidth={320}
            showAiPanel={showAiPanel}
            chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
            chatAttachments={chatAttachments} isChatLoading={isChatLoading}
            handleSendMessage={() => onSendMessage()} handleNewChat={() => setChatMessages([])}
            handleChatFileUpload={() => {}} removeAttachment={() => {}}
            chatFileRef={null as any} chatScrollRef={null as any} setIsResizing={() => {}}
            promptText={promptText} setPromptText={setPromptText}
            isGenerating={isGenerating} handleGenerate={() => handleGenerate(undefined, 4)}
            handleStopGeneration={() => setIsGenerating(false)}
            showGenerateControl={true} mode={mode} setMode={setMode}
            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
            handleScan={() => {}} isScanning={false} originalImage={originalImage}
            presetsPanelWidth={250} presetData={PRESET_DATA} appendTag={(tag) => setPromptText(p => p ? `${p}, ${tag}` : tag)}
            isCompareMode={isCompareMode} setIsCompareMode={setIsCompareMode} hasGeneratedResults={currentResults.length > 0}
            onRefinePrompt={() => {}} isRefining={false}
            isSmartAssistantActive={isSmartAssistantActive} toggleSmartAssistant={toggleSmartAssistant}
            onCaptureContext={() => {}} 
            groundingSources={[]}
            setChatAttachments={setChatAttachments}
        />
        <input type="file" ref={fileInputRef} onChange={(e) => {
            if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => { if (ev.target?.result) setOriginalImage(ev.target.result as string); };
                reader.readAsDataURL(e.target.files[0]);
            }
        }} className="hidden" accept="image/*" />
    </div>
  );
};
