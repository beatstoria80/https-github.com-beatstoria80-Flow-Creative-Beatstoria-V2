import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EditorControls } from './components/editor/EditorControls';
import CanvasPreview from './components/CanvasPreview';
import { BeatstoriaStudio } from './components/BeatstoriaStudio';
import { LandingPage } from './components/LandingPage';
import { NewProjectFlow } from './components/editor/NewProjectFlow';
import { SidebarMenu } from './components/SidebarMenu';
import { DEFAULT_CONFIG, DEFAULT_EFFECTS } from './constants';
import { AppConfig, ChatMessage, ImageLayer, StashAsset } from './types';
import {
    Download, Undo, Redo, Plus, Sparkles, Minus, PanelLeft, Loader2,
    AlignLeft, AlignCenter, AlignRight, ArrowUpFromLine, ArrowDownFromLine,
    ChevronsUpDown, Hand, Maximize, CheckCircle2, FileEdit, Copy, Trash2, Layout,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Grid, Square, LayoutGrid,
    Group, ChevronDown, Image as ImageIcon, FileArchive, Zap, Clipboard, CheckSquare, Layers,
    MousePointer2, Menu, MoreVertical, MoreHorizontal, AlignStartVertical, AlignEndVertical,
    AlignStartHorizontal, AlignEndHorizontal, AlignCenterVertical, AlignCenterHorizontal,
    MoveHorizontal as DistributeH, MoveVertical as DistributeV,
    Bot, X, TriangleAlert, FolderPlus, FolderMinus, Video, MonitorDown, BookOpen,
    Sun, Moon, MonitorPlay, Activity, Tablet, Smartphone, Home, Mic2,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MessageSquare,
    Minimize2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { saveProjectToDB, getAllProjectsFromDB, deleteProjectFromDB, getProjectByIdFromDB, clearAllProjectsFromDB } from './services/storageService';
import { AssistantPanel } from './components/editor/AssistantPanel';
import { NeuralPurgeStudio } from './components/studio/NeuralPurgeStudio';
import { NanoBananaStudio } from './components/studio/NanoBananaStudio';
import { NanoBananaGen } from './components/studio/NanoBananaGen';
import { NeuralRetouchStudio } from './components/studio/NeuralRetouchStudio';
import { TitanFillStudio } from './components/studio/TitanFillStudio';
// Added missing StoryCampaignFlow import
import { StoryCampaignFlow } from './components/studio/StoryCampaignFlow';
import { NeuralTypefaceStudio } from './components/studio/NeuralTypefaceStudio';
import { VeoCineStudio } from './components/studio/VeoCineStudio';
import { NoteLMStudio } from './components/studio/NoteLMStudio';
import { VoiceStudio } from './components/studio/VoiceStudio';
import { SpaceCampaignStudio } from './components/studio/SpaceCampaignStudio';
import { ExportModal } from './components/editor/ExportModal';
import { exportArtboard, downloadBlob } from './services/exportService';
import { Rnd } from 'react-rnd';

const deepCopy = <T,>(obj: T): T => {
    try {
        if (typeof structuredClone === 'function') return structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return JSON.parse(JSON.stringify(obj));
    }
};

const repairConfig = (config: AppConfig): AppConfig => {
    if (!config) return deepCopy(DEFAULT_CONFIG);
    const d = DEFAULT_CONFIG;
    return {
        ...d,
        ...config,
        id: config.id || `page-${Date.now()}`,
        canvas: { ...d.canvas, ...(config.canvas || {}) },
        typography: { ...d.typography, ...(config.typography || {}) },
        additional_texts: Array.isArray(config.additional_texts) ? config.additional_texts : [],
        image_layers: Array.isArray(config.image_layers) ? config.image_layers : [],
        shapes: Array.isArray(config.shapes) ? config.shapes : [],
        layerOrder: Array.isArray(config.layerOrder) ? config.layerOrder : d.layerOrder,
        groups: Array.isArray(config.groups) ? config.groups : []
    };
};

interface HistoryItem {
    src: string;
    source: 'cooked' | 'injected';
    timestamp: number;
}

interface ProjectState {
    pages: AppConfig[];
    activePageIndex: number;
}

interface AppState {
    history: ProjectState[];
    index: number;
}

export const App: React.FC = () => {
    const [showLanding, setShowLanding] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const [currentProjectId, setCurrentProjectId] = useState<string>(() => localStorage.getItem('last_active_project_id') || 'page-default');

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('space_studio_theme') as 'dark' | 'light') || 'light';
    });

    const [appState, setAppState] = useState<AppState>({
        history: [{ pages: [repairConfig(deepCopy(DEFAULT_CONFIG))], activePageIndex: 0 }],
        index: 0
    });

    const [zoom, setZoom] = useState(0.45);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [penToolMode, setPenToolMode] = useState<'select' | 'hand'>('select');
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const [isBackendMenuOpen, setIsBackendMenuOpen] = useState(false);
    const [showNewProjectFlow, setShowNewProjectFlow] = useState(false);
    const [projectLibrary, setProjectLibrary] = useState<any[]>([]);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const isPurgingRef = useRef(false);

    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachments, setChatAttachments] = useState<{ file: File, url: string }[]>([]);

    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isPurgeOpen, setIsPurgeOpen] = useState(false);
    const [isUpscaleOpen, setIsUpscaleOpen] = useState(false);
    const [isGenOpen, setIsGenOpen] = useState(false);
    const [isRetouchOpen, setIsRetouchOpen] = useState(false);
    const [isTitanFillOpen, setIsTitanFillOpen] = useState(false);
    // Added missing isStoryOpen state
    const [isStoryOpen, setIsStoryOpen] = useState(false);
    const [isTypefaceStudioOpen, setIsTypefaceStudioOpen] = useState(false);
    const [isCineOpen, setIsCineOpen] = useState(false);
    const [isNoteLMOpen, setIsNoteLMOpen] = useState(false);
    const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);
    const [isSpaceCampaignOpen, setIsSpaceCampaignOpen] = useState(false);
    const [activeHubContext, setActiveHubContext] = useState<string | null>(null);

    const [genHistory, setGenHistory] = useState<HistoryItem[]>(() => {
        try {
            const saved = localStorage.getItem('beatstoria_session_history');
            if (!saved) return [];
            return JSON.parse(saved);
        } catch (e) { return []; }
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const currentState = useMemo(() => appState.history[appState.index] || appState.history[0], [appState]);
    const activePageConfig = useMemo(() => currentState.pages[currentState.activePageIndex] || repairConfig(deepCopy(DEFAULT_CONFIG)), [currentState]);

    const selectedTextLayer = useMemo(() => {
        if (selectedIds.length === 1) return activePageConfig.additional_texts.find(t => t.id === selectedIds[0]);
        return undefined;
    }, [selectedIds, activePageConfig]);

    useEffect(() => {
        try { localStorage.setItem('beatstoria_session_history', JSON.stringify(genHistory.slice(0, 50))); } catch (e) { }
    }, [genHistory]);

    useEffect(() => {
        localStorage.setItem('space_studio_theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const setConfig = useCallback((value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory: boolean = true) => {
        setAppState(prev => {
            const currentIdx = prev.index;
            const current = prev.history[currentIdx];
            if (!current) return prev;
            const currentConfig = current.pages[current.activePageIndex];
            const newConfig = typeof value === 'function' ? value(currentConfig) : value;
            const newPages = [...current.pages];
            if (newConfig.projectName !== currentConfig.projectName) {
                for (let i = 0; i < newPages.length; i++) {
                    if (i !== current.activePageIndex) newPages[i] = { ...newPages[i], projectName: newConfig.projectName };
                }
            }
            newPages[current.activePageIndex] = newConfig;
            const newState = { ...current, pages: newPages };
            if (saveToHistory) {
                const newHist = prev.history.slice(0, currentIdx + 1);
                newHist.push(deepCopy(newState));
                if (newHist.length > 30) newHist.shift();
                return { history: newHist, index: newHist.length - 1 };
            } else {
                const newHist = [...prev.history];
                newHist[currentIdx] = newState;
                return { ...prev, history: newHist };
            }
        });
    }, []);

    const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 1500); };

    useEffect(() => {
        document.body.classList.remove('is-navigating');
        isPurgingRef.current = false;
        const restore = async () => {
            try {
                const lastId = localStorage.getItem('last_active_project_id');
                if (lastId) {
                    const project = await getProjectByIdFromDB(lastId);
                    if (project) {
                        setCurrentProjectId(project.id);
                        setAppState({ history: [{ pages: project.data.pages.map(repairConfig), activePageIndex: project.data.activePageIndex || 0 }], index: 0 });
                        setShowLanding(false);
                    }
                }
            } catch (e) { } finally { setIsInitializing(false); refreshLibrary(); }
        };
        restore();

        const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); setIsSpacePressed(true); } } };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
        const handleBlur = () => { setIsSpacePressed(false); setIsPanning(false); };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    useEffect(() => {
        const move = (e: MouseEvent) => { if (isPanning) setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y }); };
        const up = () => setIsPanning(false);
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, [isPanning]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || isSpacePressed || penToolMode === 'hand') {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.92 : 1.08;
            setZoom(prev => Math.min(4, Math.max(0.05, prev * delta)));
        }
    };

    const handleUndo = () => {
        if (appState.index > 0) {
            setAppState(prev => ({ ...prev, index: prev.index - 1 }));
            setSelectedIds([]);
        }
    };
    const handleRedo = () => {
        if (appState.index < appState.history.length - 1) {
            setAppState(prev => ({ ...prev, index: prev.index + 1 }));
            setSelectedIds([]);
        }
    };

    const handleStashResult = (src: string) => {
        if (!src) return;
        const newAsset: StashAsset = {
            id: `stash-${Date.now()}`,
            src: src,
            name: `GEN_${Date.now()}`,
            backup: true,
            timestamp: Date.now()
        };

        setConfig(prev => ({
            ...prev,
            stash: [newAsset, ...(prev.stash || [])]
        }), true);
        showToast("ASSET STASHED TO LIBRARY");
    };

    const refreshLibrary = async () => { try { const libs = await getAllProjectsFromDB(); setProjectLibrary(libs); } catch (e) { } };
    const generateUniqueName = (baseName: string) => {
        const upperName = (baseName || "UNTITLED").toUpperCase().trim();
        let finalName = upperName; let counter = 1;
        while (projectLibrary.some(p => p.name === finalName && p.id !== currentProjectId)) { counter++; finalName = `${upperName} V${counter}`; }
        return finalName;
    };

    const handleImportProject = (data: any) => {
        const pagesToImport = data.pages || (data.canvas ? [data] : null);
        if (!pagesToImport) return;
        const newProjectId = `import-${Date.now()}`;
        const uniqueName = generateUniqueName(data.projectName || "Imported Project");
        const importedPages = pagesToImport.map((p: any) => ({ ...repairConfig(p), projectName: uniqueName, id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }));
        setCurrentProjectId(newProjectId);
        setAppState({ history: [{ pages: importedPages, activePageIndex: 0 }], index: 0 });
        saveProjectToDB({ id: newProjectId, name: uniqueName, lastSaved: Date.now(), data: { pages: importedPages, activePageIndex: 0 } }).then(refreshLibrary);
        setShowLanding(false); setIsBackendMenuOpen(false);
        localStorage.setItem('last_active_project_id', newProjectId);
    };

    const handlePurgeAllProjects = async () => {
        isPurgingRef.current = true;
        try { await clearAllProjectsFromDB(); localStorage.removeItem('last_active_project_id'); window.location.reload(); } catch (error) { isPurgingRef.current = false; }
    };

    const handleDeleteProject = async (id: string) => {
        if (id === currentProjectId) {
            isPurgingRef.current = true;
            const blankId = `proj-blank-${Date.now()}`;
            setCurrentProjectId(blankId);
            setAppState({ history: [{ pages: [repairConfig(deepCopy(DEFAULT_CONFIG))], activePageIndex: 0 }], index: 0 });
            localStorage.removeItem('last_active_project_id');
        }
        try { await deleteProjectFromDB(id); await refreshLibrary(); } catch (error) { } finally { if (id === currentProjectId) setTimeout(() => { isPurgingRef.current = false; }, 500); }
    };

    const handleGroupLayers = () => {
        if (selectedIds.length < 2) return;
        const newGroupId = `group-${Date.now()}`;
        setConfig(prev => {
            const next = deepCopy(prev);
            next.groups.push({ id: newGroupId, name: 'GROUP ' + (next.groups.length + 1), layerIds: [...selectedIds], collapsed: false, locked: false, hidden: false });
            return next;
        }, true);
        setSelectedIds([newGroupId]);
    };

    const handleUndoGroup = () => {
        const groupsToUngroup = selectedIds.filter(id => id.startsWith('group-'));
        if (groupsToUngroup.length === 0) return;
        setConfig(prev => { const next = deepCopy(prev); next.groups = next.groups.filter(g => !groupsToUngroup.includes(g.id)); return next; }, true);
        setSelectedIds([]);
    };

    const handleApplyToCanvas = useCallback((src: string) => {
        if (!src) return;
        const img = new Image();
        img.onload = () => {
            const canvasW = activePageConfig.canvas.width; const canvasH = activePageConfig.canvas.height;
            let w = 600; let h = 600 / (img.naturalWidth / img.naturalHeight);
            const newId = `image-${Date.now()}`;
            const newLayer: ImageLayer = { id: newId, src, position_x: (canvasW - w) / 2, position_y: (canvasH - h) / 2, width: w, height: h, rotation: 0, locked: false, hidden: false, opacity: 1, blend_mode: 'normal', effects_enabled: false, effects: { ...DEFAULT_EFFECTS }, border_radius: 0 };
            setConfig(prev => ({ ...prev, image_layers: [...prev.image_layers, newLayer], layerOrder: [...prev.layerOrder, newId] }), true);
            setSelectedIds([newId]);
        };
        img.src = src;
    }, [activePageConfig, setConfig]);

    // URGENT AUTO-SAVE logic
    useEffect(() => {
        if (showLanding || isInitializing || isPurgingRef.current) return;

        const save = async () => {
            if (isPurgingRef.current) return;
            setIsAutoSaving(true);
            const saveId = currentProjectId === 'page-default' ? `proj-session-${Date.now()}` : currentProjectId;
            if (saveId !== currentProjectId) setCurrentProjectId(saveId);
            const projectData = { id: saveId, name: activePageConfig.projectName || "UNTITLED PROJECT", lastSaved: Date.now(), data: currentState };
            try {
                await saveProjectToDB(projectData);
                setLastSaved(new Date());
                localStorage.setItem('last_active_project_id', saveId);
            } catch (e) { } finally { if (!isPurgingRef.current) setIsAutoSaving(false); if (!isBackendMenuOpen && !isPurgingRef.current) refreshLibrary(); }
        };

        const timer = setTimeout(save, 3000);
        return () => clearTimeout(timer);
    }, [currentState, showLanding, isInitializing, currentProjectId]);

    const handleLoadProject = async (id: string) => {
        setIsInitializing(true);
        try {
            const project = await getProjectByIdFromDB(id);
            if (project) {
                setCurrentProjectId(project.id);
                setAppState({ history: [{ pages: project.data.pages.map(repairConfig), activePageIndex: project.data.activePageIndex || 0 }], index: 0 });
                setShowLanding(false); localStorage.setItem('last_active_project_id', id);
            }
        } catch (e) { } finally { setIsInitializing(false); }
    };

    const handleCreateProject = (data?: any) => {
        if (!data) { setShowNewProjectFlow(true); return; }
        const newId = `proj-${Date.now()}`; const uniqueName = generateUniqueName(data.name);
        const newConfig = repairConfig({ ...deepCopy(DEFAULT_CONFIG), id: newId, projectName: uniqueName, canvas: { ...DEFAULT_CONFIG.canvas, width: data.width, height: data.height } });
        setCurrentProjectId(newId);
        setAppState({ history: [{ pages: [newConfig], activePageIndex: 0 }], index: 0 });
        saveProjectToDB({ id: newId, name: uniqueName, lastSaved: Date.now(), data: { pages: [newConfig], activePageIndex: 0 } }).then(refreshLibrary);
        setShowLanding(false); setShowNewProjectFlow(false); setIsBackendMenuOpen(false); localStorage.setItem('last_active_project_id', newId); setIsInitializing(false);
    };

    const setActivePage = (index: number) => { setAppState(prev => { const newHist = [...prev.history]; newHist[prev.index] = { ...newHist[prev.index], activePageIndex: index }; return { ...prev, history: newHist }; }); setSelectedIds([]); };
    // Fixed typo: Changed undefined nHist to newHist in index calculation
    const handleDuplicatePage = (index: number) => { setAppState(prev => { const current = prev.history[prev.index]; const pageToClone = current.pages[index]; const newPage = deepCopy(pageToClone); newPage.id = `page-${Date.now()}`; newPage.name = `${pageToClone.name} COPY`; const newPages = [...current.pages]; newPages.splice(index + 1, 0, newPage); const newState = { ...current, pages: newPages, activePageIndex: index + 1 }; const newHist = [...prev.history.slice(0, prev.index + 1), newState]; return { history: newHist, index: newHist.length - 1 }; }); setSelectedIds([]); };
    const handleAddNewPage = () => { setAppState(prev => { const current = prev.history[prev.index]; const newPage = repairConfig(deepCopy(DEFAULT_CONFIG)); newPage.id = `page-${Date.now()}`; newPage.name = `ARTBOARD ${current.pages.length + 1}`; newPage.projectName = current.pages[0].projectName; const newPages = [...current.pages, newPage]; const newState = { ...current, pages: newPages, activePageIndex: newPages.length - 1 }; const newHist = [...prev.history.slice(0, prev.index + 1), newState]; return { history: newHist, index: newHist.length - 1 }; }); setSelectedIds([]); };
    const handleDeleteRequest = (targetId: string) => { if (currentState.pages.length <= 1) return; if (deleteConfirmId === targetId) { setAppState(prev => { const current = prev.history[prev.index]; const targetIndex = current.pages.findIndex(p => p.id === targetId); if (targetIndex === -1) return prev; const newPages = [...current.pages]; newPages.splice(targetIndex, 1); const nextActiveIndex = Math.min(Math.max(0, current.activePageIndex - (targetIndex <= current.activePageIndex ? 1 : 0)), newPages.length - 1); const newState = { ...current, pages: newPages, activePageIndex: nextActiveIndex }; const newHistoryUpdate = prev.history.slice(0, prev.index + 1); newHistoryUpdate.push(newState); return { history: newHistoryUpdate, index: newHistoryUpdate.length - 1 }; }); setDeleteConfirmId(null); setSelectedIds([]); } else { setDeleteConfirmId(targetId); } };
    const handleRenamePage = (index: number, newName: string) => { setAppState(prev => { const current = prev.history[prev.index]; const newPages = [...current.pages]; newPages[index] = { ...newPages[index], name: newName.toUpperCase() }; const newState = { ...current, pages: newPages }; const newHistoryUpdate = [...prev.history]; newHistoryUpdate[prev.index] = newState; return { ...prev, history: newHistoryUpdate }; }); };

    const handleSelection = (id: string | string[] | null, multi = false) => { if (!id) { setSelectedIds([]); return; } if (Array.isArray(id)) { setSelectedIds(id); return; } setSelectedIds(prev => multi ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id]); };
    const handleAlign = (type: string) => {
        if (selectedIds.length === 0) return;
        setConfig(prev => {
            const next = deepCopy(prev); const canvasW = next.canvas.width; const canvasH = next.canvas.height;
            const allLayers = [...next.image_layers, ...next.additional_texts, ...next.shapes];
            const selectedLayers = allLayers.filter(l => selectedIds.includes(l.id)); if (selectedLayers.length === 0) return next;
            let minX = Math.min(...selectedLayers.map(l => l.position_x)); let maxX = Math.max(...selectedLayers.map(l => l.position_x + l.width)); let minY = Math.min(...selectedLayers.map(l => l.position_y)); let maxY = Math.max(...selectedLayers.map(l => l.position_y + l.height));
            let centerX = minX + (maxX - minX) / 2; let centerY = minY + (maxY - minY) / 2;
            if (type === 'dist-h' || type === 'dist-v') {
                if (selectedLayers.length < 3) return next;
                if (type === 'dist-h') { selectedLayers.sort((a, b) => a.position_x - b.position_x); const gap = (selectedLayers[selectedLayers.length - 1].position_x - selectedLayers[0].position_x) / (selectedLayers.length - 1); selectedLayers.forEach((l, i) => { const node = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id); if (node) node.position_x = selectedLayers[0].position_x + (gap * i); }); }
                else { selectedLayers.sort((a, b) => a.position_y - b.position_y); const gap = (selectedLayers[selectedLayers.length - 1].position_y - selectedLayers[0].position_y) / (selectedLayers.length - 1); selectedLayers.forEach((l, i) => { const node = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id); if (node) node.position_y = selectedLayers[0].position_y + (gap * i); }); }
                return next;
            }
            selectedIds.forEach(id => {
                const l = next.image_layers.find(al => al.id === id) || next.additional_texts.find(al => al.id === id) || next.shapes.find(al => al.id === id); if (!l) return;
                if (selectedIds.length > 1) { if (type === 'left') l.position_x = minX; if (type === 'right') l.position_x = maxX - l.width; if (type === 'top') l.position_y = minY; if (type === 'bottom') l.position_y = maxY - l.height; if (type === 'center') l.position_x = centerX - (l.width / 2); if (type === 'middle') l.position_y = centerY - (l.height / 2); }
                else { if (type === 'left') l.position_x = 0; if (type === 'right') l.position_x = canvasW - l.width; if (type === 'top') l.position_y = 0; if (type === 'bottom') l.position_y = canvasH - l.height; if (type === 'center') l.position_x = (canvasW / 2) - (l.width / 2); if (type === 'middle') l.position_y = (canvasH / 2) - (l.height / 2); }
            }); return next;
        }, true);
    };

    const handleSendMessage = async (text?: string) => {
        const textToSend = text || chatInput; if (!textToSend?.trim()) return;
        setChatMessages(prev => [...prev, { role: 'user', text: textToSend }]); setChatInput(""); setIsChatLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: textToSend, config: { systemInstruction: 'You are the Neural Assistant for Space Studio Universal Creative Platform. Help users with design advice, technical explanations, and creative brainstorming across all artistic disciplines.' } });
            setChatMessages(prev => [...prev, { role: 'model', text: response.text || "" }]);
        } catch (error) { setChatMessages(prev => [...prev, { role: 'model', text: "Link Failed." }]); } finally { setIsChatLoading(false); }
    };

    const handleExportSinglePage = async (pageIndex: number, quality: 'SD' | 'HD' | '4K' | '8K' = 'HD') => {
        const page = currentState.pages[pageIndex]; try { const dataUrl = await exportArtboard(`canvas-export-${page.id}`, page.name, page, { quality, format: 'png' }); downloadBlob(dataUrl, `${page.name.replace(/\s+/g, '_')}_${quality}.png`); } catch (e) { }
    };

    if (isInitializing) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mb-4" size={40} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Restoring Neural Session...</span></div>;

    if (showLanding) return (
        <LandingPage
            onStart={() => setShowLanding(false)}
            onOpenAiStudio={() => { setShowLanding(false); setIsGenOpen(true); }}
            onLoadProject={handleLoadProject}
            onOpenCooking={() => { setShowLanding(false); setIsGenOpen(true); }}
            onOpenTitanFill={() => { setShowLanding(false); setIsTitanFillOpen(true); }}
            onOpenPurgeBg={() => { setShowLanding(false); setIsPurgeOpen(true); }}
            onOpenRetouch={() => { setShowLanding(false); setIsRetouchOpen(true); }}
            onOpenNoteLM={() => { setShowLanding(false); setIsNoteLMOpen(true); }}
            onOpenCineEngine={() => { setShowLanding(false); setIsCineOpen(true); }}
            onOpenTypeface={() => { setShowLanding(false); setIsTypefaceStudioOpen(true); }}
            onOpenVoiceStudio={() => { setShowLanding(false); setIsVoiceStudioOpen(true); }}
            onOpenSpaceCampaign={() => { setShowLanding(false); setIsSpaceCampaignOpen(true); }}
        />
    );

    return (
        <div className={`flex h-screen w-screen relative transition-colors duration-500 overflow-hidden font-sans ${theme === 'dark' ? 'bg-[#050505] text-slate-200' : 'bg-slate-50 text-slate-900'}`} tabIndex={-1}>
            <SidebarMenu
                isOpen={isBackendMenuOpen} onClose={() => setIsBackendMenuOpen(false)} config={activePageConfig} onUpdateConfig={setConfig}
                onNew={handleCreateProject} onImport={handleImportProject} onSave={() => { }} isSaving={isAutoSaving} saveSuccess={false} projectLibrary={projectLibrary} currentProjectId={currentProjectId}
                onLoadProject={handleLoadProject} onDeleteProject={handleDeleteProject} onPurgeAll={handlePurgeAllProjects}
            />
            <NewProjectFlow isOpen={showNewProjectFlow} onClose={() => setShowNewProjectFlow(false)} onConfirm={handleCreateProject} />

            <div
                className={`flex-shrink-0 h-full border-r z-[100] shadow-2xl overflow-hidden transition-[width] duration-300 ease-in-out relative ${isSidebarOpen ? 'w-[340px]' : 'w-0 border-none'} ${theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-slate-200'}`}
            >
                <div className="w-[340px] h-full bg-white dark:bg-black">
                    <EditorControls
                        config={activePageConfig} setConfig={setConfig} selectedId={selectedIds.length === 1 ? selectedIds[0] : null} selectedIds={selectedIds} onSelectLayer={handleSelection}
                        collapsed={false} onExpand={() => setIsSidebarOpen(true)} setZoom={setZoom} onHome={() => setIsBackendMenuOpen(true)} penToolMode={penToolMode as any} setPenToolMode={setPenToolMode as any}
                        isAssistantOpen={isAssistantOpen} onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)} isBackendMenuOpen={isBackendMenuOpen} setIsBackendMenuOpen={setIsBackendMenuOpen} onNewProject={() => setShowNewProjectFlow(true)}
                        isAutoSaving={isAutoSaving} lastSaved={lastSaved}
                        onOpenBgRemover={(src) => { setActiveHubContext(src || null); setIsPurgeOpen(true); }}
                        onOpenNanoUpscaler={(src) => { setActiveHubContext(src || null); setIsUpscaleOpen(true); }}
                        onOpenNanoGen={(src) => { setActiveHubContext(src || null); setIsPurgeOpen(true); }}
                        onOpenRetouch={(src) => { setActiveHubContext(src || null); setIsRetouchOpen(true); }}
                        onOpenTitanFill={(src) => { setActiveHubContext(src || null); setIsTitanFillOpen(true); }}
                        onOpenNoteLM={() => setIsNoteLMOpen(true)}
                        onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
                        onOpenCineEngine={() => setIsCineOpen(true)}
                        onOpenTypefaceStudio={() => setIsTypefaceStudioOpen(true)}
                        onOpenSpaceCampaign={() => setIsSpaceCampaignOpen(true)}
                        onGroup={handleGroupLayers} onUngroup={handleUndoGroup} onMerge={() => { }}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col relative min-w-0">
                <div className={`h-14 border-b flex items-center justify-between px-4 z-50 shadow-sm shrink-0 transition-colors ${theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowLanding(true)} className={`p-2 hover:bg-opacity-10 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:bg-white' : 'text-gray-600 hover:bg-black'}`} title="Return to Landing Page"><Home size={18} /></button>

                        <div className={`h-6 w-px mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <button onClick={handleUndo} disabled={appState.index === 0} className={`p-1.5 rounded disabled:opacity-20 transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}><Undo size={16} /></button>
                        <button onClick={handleRedo} disabled={appState.index === appState.history.length - 1} className={`p-1.5 rounded disabled:opacity-20 transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}><Redo size={16} /></button>
                        <div className={`h-6 w-px mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <div className={`flex items-center gap-1.5 border rounded-xl px-2 py-1 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-slate-100'}`}>
                            <button onClick={() => setZoom(Math.max(0.1, zoom - 0.05))} className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-gray-600 hover:bg-white'}`}><Minus size={14} /></button>
                            <span className={`text-[11px] font-black w-12 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(2, zoom + 0.05))} className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-gray-600 hover:bg-white'}`}><Plus size={14} /></button>
                        </div>
                        <div className={`h-6 w-px mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <button onClick={() => setPenToolMode(penToolMode === 'hand' ? 'select' : 'hand')} className={`p-2 rounded transition-all ${penToolMode === 'hand' ? 'bg-indigo-600 text-white shadow-md' : (theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'hover:bg-gray-100 text-gray-600')}`}><Hand size={18} /></button>
                        <div className={`h-6 w-px mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded transition-all ${isSidebarOpen ? 'bg-indigo-600 text-white shadow-md' : (theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'hover:bg-gray-100 text-gray-600')}`} title="Toggle Sidebar"><PanelLeft size={18} /></button>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                        <div className={`flex items-center gap-1 border p-1 rounded-xl shadow-lg ring-4 ${theme === 'dark' ? 'bg-black border-white/20 ring-white/5' : 'bg-white border-gray-200 ring-gray-50'}`}>
                            <div className="flex items-center"><button onClick={() => handleAlign('left')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignStartVertical size={16} /></button><button onClick={() => handleAlign('center')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignCenterVertical size={16} /></button><button onClick={() => handleAlign('right')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignEndVertical size={16} /></button></div><div className={`h-4 w-px mx-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} /><div className="flex items-center"><button onClick={() => handleAlign('top')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignStartHorizontal size={16} /></button><button onClick={() => handleAlign('middle')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignCenterHorizontal size={16} /></button><button onClick={() => handleAlign('bottom')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><AlignEndHorizontal size={16} /></button></div>
                        </div>

                        <div className={`flex p-0.5 border rounded-full shadow-lg ${theme === 'dark' ? 'bg-black border-white/20' : 'bg-slate-100 border-slate-300'}`}>
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center justify-center p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white text-orange-500 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Sun size={14} fill={theme === 'light' ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center justify-center p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Moon size={14} fill={theme === 'dark' ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsNoteLMOpen(true)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all ${theme === 'dark' ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'}`}><BookOpen size={14} /> NOTE LM</button>
                        <button onClick={() => setIsExportOpen(true)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}><Download size={14} /> EXPORT UHD</button>
                    </div>
                </div>

                <div
                    className={`flex-1 overflow-hidden relative flex items-center justify-center transition-colors duration-500 ${isPanning || penToolMode === 'hand' || isSpacePressed ? 'cursor-grabbing' : 'cursor-default'} ${theme === 'dark' ? 'bg-[#111]' : 'bg-slate-200'}`}
                    onMouseDown={handleMouseDown}
                    onWheel={handleWheel}
                >
                    <div className={`absolute inset-0 opacity-[0.05] transition-opacity duration-1000 ${theme === 'dark' ? 'opacity-5' : 'opacity-10'}`} style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="transition-transform duration-75 flex gap-24 items-center px-40 py-20" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                        {currentState.pages.map((pageConfig, pageIndex) => {
                            const isActive = pageIndex === currentState.activePageIndex;
                            return (
                                <div key={pageConfig.id} className="flex flex-col items-center group/artboard">
                                    <div className={`flex items-center justify-between pb-3 select-none w-full transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-40 group-hover/artboard:opacity-80'}`} style={{ width: pageConfig.canvas.width * zoom }}>
                                        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border shadow-sm transition-all cursor-pointer ${isActive ? (theme === 'dark' ? 'bg-black border-indigo-500 text-white' : 'bg-white border-indigo-200 text-slate-900') : (theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white/60 border-slate-200')}`} onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}>
                                            <Layout size={14} className="text-indigo-500" /><input type="text" value={pageConfig.name} onChange={(e) => handleRenamePage(pageIndex, e.target.value)} onKeyDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className={`bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest outline-none w-24 ${isActive ? (theme === 'dark' ? 'text-white' : 'text-slate-700') : 'text-slate-50'}`} />
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border shadow-sm transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover/artboard:opacity-100'} ${theme === 'dark' ? 'bg-black/90 border-white/10' : 'bg-white/90 border-slate-200'}`} onMouseDown={(e) => { e.stopPropagation(); handleExportSinglePage(pageIndex, 'HD'); }}><button className="flex items-center gap-1.5 px-2 py-1 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"><MonitorDown size={12} /><span className="text-[7px] font-black">1080P</span></button><button onClick={(e) => { e.stopPropagation(); handleDuplicatePage(pageIndex); }} className="p-1.5 text-slate-500 hover:text-indigo-500 rounded-lg"><Copy size={12} /></button><button onClick={(e) => { e.stopPropagation(); handleAddNewPage(); }} className="p-1.5 text-slate-500 hover:text-indigo-500 rounded-lg"><Plus size={12} /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(pageConfig.id); }} className={`p-1.5 rounded-lg transition-all ${deleteConfirmId === pageConfig.id ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:text-red-600'}`}>{deleteConfirmId === pageConfig.id ? <TriangleAlert size={12} /> : <Trash2 size={12} />}</button></div>
                                    </div>
                                    <div className={`relative shadow-2xl rounded-sm transition-all duration-300 ${isActive ? 'ring-2 ring-indigo-500/20' : 'grayscale-[0.5]'}`} style={{ width: pageConfig.canvas.width * zoom, height: pageConfig.canvas.height * zoom }} onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}>
                                        <CanvasPreview
                                            domId={`canvas-export-${pageConfig.id}`}
                                            config={pageConfig}
                                            scale={zoom}
                                            onUpdate={(newConfig, save) => {
                                                setAppState(prev => {
                                                    const current = prev.history[prev.index];
                                                    const nPages = [...current.pages];
                                                    const targetIdx = nPages.findIndex(p => p.id === pageConfig.id);
                                                    if (targetIdx === -1) return prev;
                                                    nPages[targetIdx] = newConfig;
                                                    const nState = { ...current, pages: nPages };
                                                    if (save) {
                                                        const nHist = prev.history.slice(0, prev.index + 1);
                                                        nHist.push(deepCopy(nState));
                                                        return { history: nHist, index: nHist.length - 1 };
                                                    } else {
                                                        const nHist = [...prev.history];
                                                        nHist[prev.index] = nState;
                                                        return { ...prev, history: nHist };
                                                    }
                                                });
                                            }}
                                            selectedIds={isActive ? selectedIds : []}
                                            onSelect={(id, multi) => { if (!isActive) setActivePage(pageIndex); handleSelection(id, multi); }}
                                            readOnly={false}
                                            isActive={isActive}
                                            handToolActive={penToolMode === 'hand' || isSpacePressed}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* FLOATING ACTION AREA BOTTOM LEFT */}
                    <div className="absolute bottom-6 left-6 flex items-center gap-3 z-50">
                        <button
                            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl border active:scale-95 group ${isAssistantOpen ? 'bg-indigo-600 border-indigo-500 text-white' : (theme === 'dark' ? 'bg-black/80 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600')}`}
                            title="Toggle Neural Assistant"
                        >
                            {isAssistantOpen ? <Minimize2 size={24} /> : <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />}
                        </button>
                    </div>

                    <div className={`absolute bottom-6 right-6 flex items-center gap-2 backdrop-blur-md border p-2 rounded-2xl shadow-xl transition-colors ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white/90 border-slate-200'}`}><button onClick={() => setZoom(0.45)} className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}>Fit Canvas</button><button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.45); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Maximize size={16} /></button></div>
                </div>
            </div>

            {isTypefaceStudioOpen && <NeuralTypefaceStudio isOpen={isTypefaceStudioOpen} onClose={() => setIsTypefaceStudioOpen(false)} onApply={handleApplyToCanvas} targetLayer={selectedTextLayer} />}
            {isPurgeOpen && <NeuralPurgeStudio isOpen={isPurgeOpen} onClose={() => setIsPurgeOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} library={activePageConfig.stash} onOpenCooking={() => { setIsPurgeOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsPurgeOpen(false); setIsTitanFillOpen(true); }} onOpenRetouch={() => { setIsPurgeOpen(false); setIsRetouchOpen(true); }} onOpenStory={() => { setIsPurgeOpen(false); setIsStoryOpen(true); }} />}
            {isUpscaleOpen && <NanoBananaStudio isOpen={isUpscaleOpen} onClose={() => setIsUpscaleOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} />}
            {isStoryOpen && <StoryCampaignFlow isOpen={isStoryOpen} onClose={() => setIsStoryOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsStoryOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsStoryOpen(false); setIsTitanFillOpen(true); }} onOpenPurgeBg={() => { setIsStoryOpen(false); setIsPurgeOpen(true); }} onOpenRetouch={() => { setIsStoryOpen(false); setIsRetouchOpen(true); }} />}
            {isGenOpen && <NanoBananaGen isOpen={isGenOpen} onClose={() => setIsGenOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} chatMessages={chatMessages} onSendMessage={handleSendMessage} chatInput={chatInput} setChatInput={setChatInput} isChatLoading={isChatLoading} chatAttachments={chatAttachments} setChatAttachments={setChatAttachments} initialImage={activeHubContext} onOpenPurge={(src) => { setActiveHubContext(src); setIsPurgeOpen(true); }} onOpenRetouch={(src) => { setActiveHubContext(src); setIsRetouchOpen(true); }} onOpenUpscale={(src) => { setActiveHubContext(src); setIsUpscaleOpen(true); }} onOpenTitanFill={(src) => { setActiveHubContext(src); setIsTitanFillOpen(true); }} sessionHistory={genHistory} setSessionHistory={setGenHistory} />}
            {isRetouchOpen && <NeuralRetouchStudio isOpen={isRetouchOpen} onClose={() => setIsRetouchOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsRetouchOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsRetouchOpen(false); setIsTitanFillOpen(true); }} onOpenPurgeBg={() => { setIsRetouchOpen(false); setIsPurgeOpen(true); }} />}
            {isTitanFillOpen && <TitanFillStudio isOpen={isTitanFillOpen} onClose={() => setIsTitanFillOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsTitanFillOpen(false); setIsGenOpen(true); }} onOpenPurgeBg={() => { setIsTitanFillOpen(false); setIsPurgeOpen(true); }} onOpenRetouch={() => { setIsTitanFillOpen(false); setIsRetouchOpen(true); }} />}
            {isCineOpen && <VeoCineStudio isOpen={isCineOpen} onClose={() => setIsCineOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} />}
            {isNoteLMOpen && <NoteLMStudio isOpen={isNoteLMOpen} onClose={() => setIsNoteLMOpen(false)} onOpenCooking={() => { setIsNoteLMOpen(false); setIsGenOpen(true); }} onApplyVisual={handleApplyToCanvas} onOpenVoiceStudio={() => { setIsNoteLMOpen(false); setIsVoiceStudioOpen(true); }} />}
            {isVoiceStudioOpen && <VoiceStudio isOpen={isVoiceStudioOpen} onClose={() => setIsVoiceStudioOpen(false)} />}

            {/* INJECTED COMPONENT */}
            {isSpaceCampaignOpen && (
                <SpaceCampaignStudio
                    isOpen={isSpaceCampaignOpen}
                    onClose={() => setIsSpaceCampaignOpen(false)}
                    onApply={handleApplyToCanvas}
                    // Fix: Passed mandatory onStash prop
                    onStash={handleStashResult}
                    onOpenCooking={() => setIsGenOpen(true)}
                    onOpenNoteLM={() => setIsNoteLMOpen(true)}
                    onOpenVoiceStudio={() => setIsVoiceStudioOpen(true)}
                    onOpenCineEngine={() => setIsCineOpen(true)}
                    onOpenTitanFill={() => setIsTitanFillOpen(true)}
                    onOpenPurgeBg={() => setIsPurgeOpen(true)}
                    onOpenRetouch={() => setIsRetouchOpen(true)}
                    onOpenTypeface={() => setIsTypefaceStudioOpen(true)}
                />
            )}

            {isExportOpen && <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} activePage={activePageConfig} allPages={currentState.pages} />}

            {isAssistantOpen && (
                <Rnd default={{ x: 80, y: window.innerHeight - 520, width: 320, height: 480 }} minWidth={300} minHeight={400} bounds="window" className="z-[2000]" dragHandleClassName="drag-handle" enableUserSelectHack={false}>
                    <div className={`w-full h-full rounded-3xl shadow-2xl border overflow-hidden flex flex-col transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}><div className={`drag-handle h-10 border-b flex items-center justify-between px-4 cursor-move shrink-0 ${theme === 'dark' ? 'bg-black border-white/5' : 'bg-slate-50 border-slate-100'}`}><div className="flex items-center gap-2 pointer-events-none"><Bot size={14} className="text-indigo-50" /><span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Neural Assistant</span></div><button onClick={() => setIsAssistantOpen(false)} className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-400'}`}><X size={14} /></button></div><div className="flex-1 overflow-hidden"><AssistantPanel messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={handleSendMessage} isLoading={isChatLoading} onClear={() => setChatMessages([])} attachments={chatAttachments} setAttachments={setChatAttachments} variant={theme} /></div></div>
                </Rnd>
            )}

            {toastMessage && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[10000] animate-in fade-in slide-in-from-bottom-4 duration-300"><CheckCircle2 size={16} className="text-green-400" /><span className="text-[10px] font-black uppercase tracking-widest">{toastMessage}</span></div>}
        </div>
    );
};