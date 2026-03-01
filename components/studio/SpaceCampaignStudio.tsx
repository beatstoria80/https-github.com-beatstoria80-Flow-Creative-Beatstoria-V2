
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Zap, Monitor, Sparkles, Box, Palette, Layers,
    Plus, Trash2, Loader2, Image as ImageIcon, Download,
    RefreshCw, Activity, BoxSelect, Layout, Square,
    Maximize2, Archive, Send, Target, Fingerprint,
    Minimize2, MousePointer2, ZoomIn, ZoomOut, CheckCircle2,
    MonitorCheck, Rotate3d, Film, LayoutGrid, CornerRightDown,
    PlusCircle, Map, Crosshair, Tag, SunMedium, Aperture,
    Focus as FocusIcon, Radio, ChevronDown, AlertTriangle,
    File as FileIcon, Info, Edit3, Check, ShieldCheck, Lock, Shield
} from 'lucide-react';
import { Rnd } from 'react-rnd';
import { generateNanoImage, analyzeVisualContext, getAI } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

// --- CONSTANTS ---
const STD_W = 340;
const GEN_W = 440;

const NEURAL_TAGS = [
    { category: 'PENCAHAYAAN', icon: <SunMedium size={10} />, tags: ['High-Contrast Studio', 'Soft Natural Light', 'Neon Pulse', 'Golden Hour Glow', 'Dramatic Rim Light'], color: 'text-amber-600 border-amber-200 bg-amber-50/50' },
    { category: 'ARAH SENI', icon: <Palette size={10} />, tags: ['Minimalist Editorial', 'Cyber-Noir Fusion', 'Hyper-Realistic Pores', 'Matte Texture', 'Vivid Cinematic'], color: 'text-indigo-600 border-indigo-200 bg-indigo-50/50' },
    { category: 'KAMERA', icon: <Aperture size={10} />, tags: ['85mm Prime Lens', 'Low Angle Power Shot', 'Dutch Angle Depth', 'Wide Anamorphic', 'Extreme Macro Detail'], color: 'text-emerald-600 border-emerald-200 bg-emerald-50/50' }
];

const getSmartPath = (x1: number, y1: number, x2: number, y2: number, isNeural = false) => {
    if (isNeural) {
        const dy = y2 - y1;
        const cp1y = y1 + dy * 0.7;
        const cp2y = y2 - dy * 0.3;
        return `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
    }
    const dx = Math.abs(x2 - x1);
    const horizontalOffset = Math.max(dx * 0.4, 50);
    return `M ${x1} ${y1} C ${x1 + horizontalOffset} ${y1}, ${x2 - horizontalOffset} ${y2}, ${x2} ${y2}`;
};

type NodeType = 'input' | 'generator' | 'identity' | 'style' | 'result';

interface Annotation {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
}

interface Node {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    data: {
        label: string;
        value: string;
        tags?: string;
        annotations?: Annotation[];
        image?: string;
        fileName?: string;
        fileSize?: string;
        aspectRatio?: number;
        color: string;
        iconId: string;
        settings?: {
            quality: 'Pro' | 'Elite';
            ratio: string;
            batch: number;
        };
    };
}

interface Connection {
    id: string;
    source: string;
    target: string;
}

export const SpaceCampaignStudio: React.FC<{ isOpen: boolean; onClose: () => void; onApply: (s: string) => void; onStash: (s: string) => void; isOnline?: boolean; }> = ({ isOpen, onClose, onApply, onStash, isOnline = true }) => {
    const [projectName, setProjectName] = useState("NEW NEURAL CAMPAIGN");
    const [nodes, setNodes] = useState<Node[]>([
        { id: 'v1', type: 'identity', x: 100, y: 150, data: { label: 'VISUAL ANCHOR', value: '', tags: 'product utama', annotations: [], color: 'text-indigo-600', iconId: 'fingerprint' } },
        { id: 'n1', type: 'input', x: 500, y: 100, data: { label: 'MAIN SUBJECT', value: '', color: 'text-blue-600', iconId: 'box-select' } },
        {
            id: 'output', type: 'generator', x: 1000, y: 180, data: {
                label: 'VISUAL ENGINE CORE',
                value: '',
                color: 'text-orange-600',
                iconId: 'zap',
                settings: { quality: 'Pro', ratio: '1:1', batch: 1 }
            }
        }
    ]);

    const [edges, setEdges] = useState<Connection[]>([
        { id: 'e1', source: 'v1', target: 'output' },
        { id: 'e2', source: 'n1', target: 'output' }
    ]);

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.85);
    const [isAiMinimized, setIsAiMinimized] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiCommand, setAiCommand] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [neuralDirectives, setNeuralDirectives] = useState<any[]>([]);
    const [deployedDirectiveIds, setDeployedDirectiveIds] = useState<Set<string>>(new Set());
    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
    const [isConnectingNeural, setIsConnectingNeural] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [lineCoords, setLineCoords] = useState<Record<string, any>>({});
    const [pulsingNodeId, setPulsingNodeId] = useState<string | null>(null);
    const [activeAnnotationNodeId, setActiveAnnotationNodeId] = useState<string | null>(null);
    const [hoveredResultId, setHoveredResultId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeAnchorNodeId = useRef<string | null>(null);
    const annotContainerRef = useRef<HTMLDivElement>(null);

    const updateLinePositions = useCallback(() => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const hubPort = document.getElementById('ai-hub-master-port');

        const newCoords: Record<string, any> = {};
        edges.forEach(edge => {
            const isNeural = edge.target === 'ai-core';
            const sourcePortId = `port-out-${edge.source}-${isNeural ? 'neural' : 'std'}`;
            const sourceEl = document.getElementById(sourcePortId);
            let targetEl = isNeural ? hubPort : document.getElementById(`port-in-${edge.target}`);

            if (sourceEl && targetEl) {
                const r1 = sourceEl.getBoundingClientRect();
                const r2 = targetEl.getBoundingClientRect();
                newCoords[edge.id] = {
                    x1: (r1.left + r1.width / 2) - canvasRect.left,
                    y1: (r1.top + r1.height / 2) - canvasRect.top,
                    x2: (r2.left + r2.width / 2) - canvasRect.left,
                    y2: (r2.top + r2.height / 2) - canvasRect.top,
                    isNeural
                };
            }
        });
        setLineCoords(newCoords);
    }, [edges]);

    useEffect(() => {
        let frameId: number;
        const loop = () => { updateLinePositions(); frameId = requestAnimationFrame(loop); };
        if (isOpen) frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [isOpen, updateLinePositions]);

    const handleZoom = (delta: number) => setZoom(prev => Math.min(3, Math.max(0.2, prev + delta)));

    const getCanvasCoordinates = (clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 || e.button === 1) {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.node-container') || target.closest('.floating-preview')) return;
            const startX = e.clientX - pan.x;
            const startY = e.clientY - pan.y;
            const move = (me: MouseEvent) => setPan({ x: me.clientX - startX, y: me.clientY - startY });
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        }
    };

    const handleNodeDrag = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        const node = nodes.find(n => n.id === id)!;
        const offX = coords.x - node.x;
        const offY = coords.y - node.y;
        const move = (me: MouseEvent) => {
            const c = getCanvasCoordinates(me.clientX, me.clientY);
            setNodes(prev => prev.map(n => n.id === id ? { ...n, x: c.x - offX, y: c.y - offY } : n));
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    const startConnection = (e: React.MouseEvent, id: string, isNeural: boolean) => {
        e.stopPropagation();
        setConnectingSourceId(id);
        setIsConnectingNeural(isNeural);
        const move = (me: MouseEvent) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) setMousePos({ x: me.clientX - rect.left, y: me.clientY - rect.top });
        };
        const up = () => { setConnectingSourceId(null); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    const completeConnection = (targetId: string) => {
        if (connectingSourceId && connectingSourceId !== targetId) {
            setEdges(prev => {
                if (prev.some(e => e.source === connectingSourceId && e.target === targetId)) return prev;
                return [...prev, { id: `e-${Date.now()}`, source: connectingSourceId, target: targetId }];
            });
        }
        setConnectingSourceId(null);
    };

    const deleteEdge = (id: string) => setEdges(prev => prev.filter(e => e.id !== id));

    const spawnNode = (type: NodeType) => {
        const id = `${type}-${Date.now()}`;
        const rect = canvasRef.current?.getBoundingClientRect();
        const cx = rect ? (rect.width / 2 - pan.x) / zoom - 150 : 500;
        const cy = rect ? (rect.height / 2 - pan.y) / zoom - 100 : 300;

        const newNode: Node = {
            id, type, x: cx, y: cy,
            data: {
                label: type === 'identity' ? 'VISUAL ANCHOR' : type === 'input' ? 'MAIN SUBJECT' : type === 'style' ? 'ART DIRECTION' : 'ENGINE CORE',
                value: '', color: type === 'identity' ? 'text-indigo-600' : type === 'input' ? 'text-blue-600' : type === 'style' ? 'text-purple-600' : 'text-orange-600',
                iconId: type === 'identity' ? 'fingerprint' : type === 'input' ? 'box-select' : type === 'style' ? 'palette' : 'zap',
                annotations: type === 'identity' ? [] : undefined,
                settings: type === 'generator' ? { quality: 'Pro', ratio: '1:1', batch: 1 } : undefined
            }
        };
        setNodes(prev => [...prev, newNode]);
    };

    // --- NEURAL DNA ARCHITECT: CORE PRODUCTION ENGINE (REVISED FOR POSE & IDENTITY) ---
    const executeProduction = async (overridePrompt?: string, overrideBatch?: number, isVariation = false) => {
        if (!isOnline) {
            setError("ONLINE CONNECTION REQUIRED FOR SYNTHESIS");
            return;
        }
        const generatorNode = nodes.find(n => n.type === 'generator');
        if (!generatorNode || isGenerating) return;

        const settings = generatorNode.data.settings || { quality: 'Pro', ratio: '1:1', batch: 1 };
        const batchToGen = overrideBatch || settings.batch;

        setIsGenerating(true);
        setError(null);
        try {
            const connectedEdges = edges.filter(e => e.target === generatorNode.id);
            const connectedNodes = connectedEdges.map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

            const anchors = connectedNodes.filter(n => n?.type === 'identity' && n.data.image);
            const subjects = connectedNodes.filter(n => n?.type === 'input').map(n => n!.data.value);
            const styles = connectedNodes.filter(n => n?.type === 'style').map(n => n!.data.value);

            let finalRatio = settings.ratio;
            let resWidth = 1080;
            let resHeight = 1080;
            let numericRatio = 1;

            if (finalRatio === '16:9') { resWidth = 1920; resHeight = 1080; numericRatio = 16 / 9; }
            else if (finalRatio === '9:16') { resWidth = 1080; resHeight = 1920; numericRatio = 9 / 16; }
            else if (finalRatio === '3:4') { resWidth = 1080; resHeight = 1440; numericRatio = 3 / 4; }
            else if (finalRatio === '4:3') { resWidth = 1440; resHeight = 1080; numericRatio = 4 / 3; }

            // --- ENHANCED NEURAL DNA ARCHITECT LOGIC ---
            const anchorDirectives = anchors.map((a, index) => {
                const isIdentityAnchor = (a?.data.tags || "").toLowerCase().includes("product utama") || (a?.data.annotations || []).some(ann => ann.label.toLowerCase().includes("face") || ann.label.toLowerCase().includes("model") || ann.label.toLowerCase().includes("muka"));

                // Mandatory Product Attributes (e.g., Color, Material) from tags
                const specificMandates = (a?.data.tags || "").split(',').map(t => t.trim()).filter(Boolean);
                const mandatePrompt = specificMandates.length > 0 ? `[SPECIFIC_MANDATES: ${specificMandates.join(', ')}]` : '';

                const lockProtocol = isIdentityAnchor
                    ? `[SURGICAL_IDENTITY_LOCK: MANDATORY. Clone anatomical features 1:1. ${mandatePrompt} ${isVariation ? 'Reject hallucinations from previous attempts.' : ''}]`
                    : `[STYLE_REFERENCE: ${mandatePrompt}]`;

                const annots = a?.data.annotations && a.data.annotations.length > 0
                    ? `[FOCUS_IMMUTABLE_ZONES: ${a.data.annotations.map(an => an.label).join(', ')}]`
                    : '';

                return `[ANCHOR_${index + 1}]: ${lockProtocol} ${annots}`;
            }).join('. ');

            let anchorVisualAnalysis = "";
            if (anchors.length > 0) anchorVisualAnalysis = await analyzeVisualContext(anchors.map(a => a!.data.image!));

            const subjectText = subjects.join(", ") || "A professional subject";

            // --- UNIVERSAL ANATOMICAL ENVIRONMENT BONDING (POSE LOGIC) ---
            // Dynamically detects if there is an interaction with the environment in the prompt
            const envKeywords = ["kursi", "chair", "bench", "meja", "table", "wall", "floor", "ground", "bersandar", "leaning", "sitting", "berdiri", "standing"];
            const hasEnvInteraction = envKeywords.some(k => subjectText.toLowerCase().includes(k));

            const poseProtocol = hasEnvInteraction
                ? `[UNIVERSAL_ANATOMICAL_BONDING: Priority Directive. Physically align the subject's joints (knees, feet, hands) with the surface geometry and occlusion of environment objects mentioned: "${subjectText}". Ensure weight distribution is realistic.]`
                : '';

            const styleText = styles.join(", ") || "master-grade cinematic art direction";
            const visualProtocol = settings.quality === 'Elite'
                ? "[PROTOCOL: QUANTUM_UHD_2K] Maximum fidelity render."
                : "[PROTOCOL: STUDIO_RAW] Clean professional capture.";

            const finalPrompt = overridePrompt || `
        [OBJECTIVE]: Synthesize a perfectly consistent visual.
        [PRIMARY_SUBJECT]: ${subjectText}. 
        [AESTHETIC_DIRECTION]: ${styleText}. 
        
        ${poseProtocol}
        
        [NEURAL DNA CONTEXT]:
        ${anchorDirectives}
        
        [ANCHOR_PIXEL_DATA]:
        ${anchorVisualAnalysis}
        
        [SYSTEM_GATEWAY]: ${visualProtocol}
        [MANDATE]: PIXEL_TRUTH over TEXT. Reject all hallucinations deviating from anchors or physical environment logic.
        `.trim();

            const batchResults: string[] = [];
            for (let i = 0; i < batchToGen; i++) {
                const res = await generateNanoImage(finalPrompt, finalRatio, anchors.map(a => a!.data.image!), settings.quality);
                batchResults.push(res);
            }

            const newNodes: Node[] = [];
            const newEdges: Connection[] = [];

            batchResults.forEach((img, i) => {
                const resId = `res-${Date.now()}-${i}`;
                newNodes.push({
                    id: resId, type: 'result', x: generatorNode.x + 500, y: generatorNode.y + (i * (STD_W / numericRatio + 120)) - ((batchResults.length - 1) * 130),
                    data: {
                        label: isVariation ? 'NEURAL VARIATION' : 'SYNTHESIS RESULT',
                        value: finalPrompt,
                        image: img,
                        fileName: `SYNTHESIS_${i + 1}.png`,
                        fileSize: `${resWidth}x${resHeight}`,
                        aspectRatio: numericRatio,
                        color: isVariation ? 'text-indigo-600' : 'text-emerald-600',
                        iconId: 'check-circle'
                    }
                });
                newEdges.push({ id: `link-${resId}`, source: generatorNode.id, target: resId });
            });

            setNodes(prev => [...prev, ...newNodes]);
            setEdges(prev => [...prev, ...newEdges]);
        } catch (e: any) {
            console.error(e);
            setError("Gagal mensintesis gambar. Cek API Key atau kuota.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateVariation = (sourceResultNode: Node) => {
        const variationPrompt = `
      [MODE: NEURAL SHIFT - DRIFT SHIELD ACTIVE] 
      [PIXEL_FREEZE]: Maintain EXACT identity and anatomical pose structure from original Visual Anchors.
      [DIRECTIVE]: Introduce variations only in subtle atmospheric lighting or background depth.
      Original Reference: ${sourceResultNode.data.value}
      `.trim();
        executeProduction(variationPrompt, 2, true);
    };

    const handleNeuralSynthesis = async () => {
        if (!isOnline) {
            setError("ONLINE CONNECTION REQUIRED FOR NEURAL HUB");
            return;
        }
        if (!aiCommand.trim() || isAiLoading) return;
        setIsAiLoading(true);
        setError(null);
        try {
            const ai = getAI();
            const connectedNodes = edges.filter(e => e.target === 'ai-core').map(e => nodes.find(n => n.id === e.source)).filter(Boolean);

            // MAPPING ID ASLI KANVAS UNTUK MENCEGAH HALUSINASI ID (Seperti "REAM" atau "N-RANDOM")
            const nodeDataStr = connectedNodes.map((n, i) => {
                const hasIdentityAnnot = (n!.data.annotations || []).some(a => /face|muka|identity/i.test(a.label));
                return `[NODE_${i + 1}]: ID: ${n!.id}, TYPE: ${n!.type}, LABEL: ${n!.data.label}, CONTENT: "${n!.data.value}", TAGS: "${n!.data.tags || ''}", IDENTITY_LOCKED: ${hasIdentityAnnot}`;
            }).join('\n');

            const systemPrompt = `
        [SYSTEM: NEURAL_DNA_INTEGRATOR]
        Anda adalah Senior Creative Director AI. Tugas Anda adalah memberikan instruksi teknis kepada engine render untuk mensintesis visual yang KONSISTEN.
        
        DATA AKTIF DARI KANVAS (ID NODE ASLI):
        ${nodeDataStr}
        
        PERINTAH PENGGUNA: "${aiCommand}" 
        
        LOGIKA KERJA KRITIS:
        1. Gunakan ID node yang tertulis di atas (misal: 'n1', 'v1'). JANGAN menciptakan ID baru.
        2. "Main Subject" selalu merujuk pada node tipe 'input' (biasanya 'n1').
        3. Berikan saran technical prompt yang mendukung pose kompleks apa pun dengan instruksi "anatomical bonding" terhadap objek lingkungan.
        4. Jika user ingin warna spesifik (misal: "baju merah"), pastikan itu tertulis di output content.
        5. WAJIB: Gunakan Bahasa Indonesia yang profesional untuk field "explanation".
        
        OUTPUT WAJIB: JSON array berisi objek { "id": string, "nodeId": string, "explanation": string, "content": string }.
        `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: systemPrompt,
                config: { responseMimeType: "application/json" }
            });
            const parsedDirectives = JSON.parse(response.text || "[]");
            setNeuralDirectives(parsedDirectives);
            setIsAiMinimized(false);
        } catch (e: any) {
            console.error(e);
            setError("Koneksi Neural Hub terputus.");
        } finally { setIsAiLoading(false); }
    };

    const handleDeployToNode = (dir: any) => {
        // FALLBACK LOGIC: Jika AI berhalusinasi ID, coba cari node 'input' (Main Subject) terdekat
        let targetId = dir.nodeId;
        const nodeExists = nodes.some(n => n.id === targetId);

        if (!nodeExists) {
            const inputNode = nodes.find(n => n.type === 'input');
            if (inputNode) targetId = inputNode.id;
        }

        setNodes(prev => prev.map(n => n.id === targetId ? { ...n, data: { ...n.data, value: dir.content } } : n));
        setDeployedDirectiveIds(prev => new Set(prev).add(dir.id || `${targetId}-${dir.content.slice(0, 10)}`));
        setPulsingNodeId(targetId);
        setTimeout(() => setPulsingNodeId(null), 1000);
    };

    const handleUploadClick = (nodeId: string) => { activeAnchorNodeId.current = nodeId; fileInputRef.current?.click(); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0];
        if (!file || !activeAnchorNodeId.current) return;
        const fileName = file.name;
        if (fileName.toLowerCase().endsWith(".heic") || fileName.toLowerCase().endsWith(".heif")) {
            try {
                // @ts-ignore
                if (window.heic2any) {
                    // @ts-ignore
                    const convertedBlob = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
                    const actualBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    file = new File([actualBlob], fileName.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
                }
            } catch (err) { console.error(err); }
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => setNodes(prev => prev.map(n => n.id === activeAnchorNodeId.current ? { ...n, data: { ...n.data, image: src, fileName: fileName, fileSize: `${img.naturalWidth}x${img.naturalHeight}`, aspectRatio: img.naturalWidth / img.naturalHeight } } : n));
            img.src = src;
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = (nodeId: string) => setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, image: undefined, fileName: undefined, fileSize: undefined, aspectRatio: undefined, annotations: [] } } : n));
    const addAnnotation = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.data.image) return;
        const newAnnot: Annotation = { id: `annot-${Date.now()}`, x: 25, y: 25, w: 20, h: 20, label: 'DNA_CORE' };
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, annotations: [...(n.data.annotations || []), newAnnot] } } : n));
    };
    const updateAnnotation = (nodeId: string, annotId: string, updates: Partial<Annotation>) => setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, annotations: (n.data.annotations || []).map(a => a.id === annotId ? { ...a, ...updates } : a) } } : n));
    const removeAnnotation = (nodeId: string, annotId: string) => setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, annotations: (n.data.annotations || []).filter(a => a.id !== annotId) } } : n));

    return (
        <div className="fixed inset-0 z-[6000] flex flex-col bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
            <style>{`
        @keyframes neural-flow { to { stroke-dashoffset: -20; } }
        .neural-line { stroke-dasharray: 8, 4; animation: neural-flow 0.6s linear infinite; }
        .custom-rnd-handle { width: 14px !important; height: 14px !important; background: white !important; border: 2px solid #6366f1 !important; border-radius: 50% !important; box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important; z-index: 100 !important; transition: transform 0.2s ease; }
        .custom-rnd-handle:hover { transform: scale(1.3); }
        .handle-nw { top: -7px !important; left: -7px !important; cursor: nw-resize; }
        .handle-ne { top: -7px !important; right: -7px !important; cursor: ne-resize; }
        .handle-sw { bottom: -7px !important; left: -7px !important; cursor: sw-resize; }
        .handle-se { bottom: -7px !important; right: -7px !important; cursor: se-resize; }
        .handle-n { top: -7px !important; left: 50% !important; transform: translateX(-50%); cursor: n-resize; }
        .handle-s { bottom: -7px !important; left: 50% !important; transform: translateX(-50%); cursor: s-resize; }
        .handle-e { right: -7px !important; top: 50% !important; transform: translateY(-50%); cursor: e-resize; }
        .handle-w { left: -7px !important; top: 50% !important; transform: translateY(-50%); cursor: w-resize; }
        .edge-path { cursor: pointer; transition: stroke-width 0.2s; }
        .edge-path:hover { stroke-width: 6 !important; stroke: #f43f5e !important; }
      `}</style>

            {/* HEADER */}
            <div className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0 z-[7000] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Activity size={16} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{projectName}</span>
                </div>
                <div className="flex items-center gap-4">
                    {error && (
                        <div className="px-4 py-1.5 bg-red-50 border border-red-100 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle size={12} className="text-red-500" />
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{error}</span>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-red-500 hover:text-white rounded-full text-slate-400 transition-all"><X size={24} /></button>
                </div>
            </div>

            <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-slate-50 cursor-default" onMouseDown={handleMouseDown}>
                {/* FLOATING TOOLS */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[9000] flex flex-col gap-3 p-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl">
                    <button onClick={() => spawnNode('identity')} className="toolbox-item relative p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 group"><Fingerprint size={20} /><div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 whitespace-nowrap z-[10000]">Visual Anchor</div></button>
                    <button onClick={() => spawnNode('input')} className="toolbox-item relative p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90 group"><BoxSelect size={20} /><div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 whitespace-nowrap z-[10000]">Main Subject</div></button>
                    <button onClick={() => spawnNode('style')} className="toolbox-item relative p-3 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-sm active:scale-90 group"><Palette size={20} /><div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 whitespace-nowrap z-[10000]">Art Direction</div></button>
                    <button onClick={() => spawnNode('generator')} className="toolbox-item relative p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-90 group"><Zap size={20} /><div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 whitespace-nowrap z-[10000]">Visual Engine</div></button>
                    <div className="h-px bg-slate-100 mx-2" />
                    <button onClick={() => setPan({ x: 0, y: 0 })} className="toolbox-item relative p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-2xl transition-all active:scale-90 group"><RefreshCw size={18} /><div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 whitespace-nowrap z-[10000]">Reset View</div></button>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[10]">
                    {Object.entries(lineCoords).map(([id, c]: any) => (
                        <g key={id} className="pointer-events-auto">
                            <path d={getSmartPath(c.x1, c.y1, c.x2, c.y2, c.isNeural)} stroke={c.isNeural ? "#a855f7" : "#6366f1"} strokeWidth={c.isNeural ? "4" : "3"} fill="none" className={`edge-path opacity-40 ${c.isNeural ? 'neural-line' : ''}`} onClick={() => deleteEdge(id)} />
                            <circle cx={c.x1} cy={c.y1} r="4" fill={c.isNeural ? "#a855f7" : "#6366f1"} /><circle cx={c.x2} cy={c.y2} r="4" fill={c.isNeural ? "#a855f7" : "#6366f1"} />
                        </g>
                    ))}
                    {connectingSourceId && (
                        <path d={getSmartPath((document.getElementById(`port-out-${connectingSourceId}-${isConnectingNeural ? 'neural' : 'std'}`)?.getBoundingClientRect().left || 0) + 10 - (canvasRef.current?.getBoundingClientRect().left || 0), (document.getElementById(`port-out-${connectingSourceId}-${isConnectingNeural ? 'neural' : 'std'}`)?.getBoundingClientRect().top || 0) + 10 - (canvasRef.current?.getBoundingClientRect().top || 0), mousePos.x, mousePos.y, isConnectingNeural)} stroke={isConnectingNeural ? "#a855f7" : "#6366f1"} strokeWidth="2" strokeDasharray="5,5" fill="none" />
                    )}
                </svg>

                <div className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left z-[20]" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}>
                    {nodes.map(node => (
                        <div key={node.id} className={`node-container absolute bg-white border border-slate-200 rounded-[2.5rem] pointer-events-auto flex flex-col shadow-xl transition-all duration-300 ${pulsingNodeId === node.id ? 'ring-4 ring-indigo-500 scale-105' : ''}`} style={{ left: node.x, top: node.y, width: node.type === 'generator' ? GEN_W : STD_W, minHeight: node.type === 'result' ? (STD_W / (node.data.aspectRatio || 1)) + 100 : 200 }}>
                            <div onMouseDown={e => handleNodeDrag(node.id, e)} className="h-12 px-6 flex items-center justify-between border-b border-slate-50 cursor-grab shrink-0">
                                <div className={`flex items-center gap-2.5 ${node.data.color} min-w-0 flex-1`}>
                                    {node.type === 'generator' ? <Zap size={14} fill="currentColor" /> : node.type === 'identity' ? <Fingerprint size={14} /> : node.type === 'style' ? <Palette size={14} /> : <BoxSelect size={14} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{node.data.label} <span className="opacity-30 ml-1 text-[7px]">#{node.id.slice(-2)}</span></span>
                                    {node.data.image && (<div className="flex items-center gap-2 ml-3 border-l border-slate-200 pl-3 overflow-hidden"> {node.data.fileName && (<span className="text-[7px] font-light text-slate-400 uppercase tracking-wider truncate max-w-[80px]" title={node.data.fileName}>{node.data.fileName}</span>)} {node.data.fileSize && (<span className="text-[7px] font-light text-slate-400 uppercase tracking-widest shrink-0">{node.data.fileSize}</span>)} </div>)}
                                </div>
                                <button onClick={() => setNodes(p => p.filter(n => n.id !== node.id))} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors ml-2"><Trash2 size={12} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                {node.type === 'generator' ? (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                            <div className="flex flex-col gap-1"> <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">Quality</span> <select value={node.data.settings?.quality} onChange={e => setNodes(p => p.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, quality: e.target.value as any } } } : n))} className="bg-white border border-slate-200 rounded-lg p-1.5 text-[8px] font-black uppercase outline-none focus:ring-1 focus:ring-orange-500/20"> <option value="Pro">PRO (FAST)</option> <option value="Elite">ELITE (2K)</option> </select> </div>
                                            <div className="flex flex-col gap-1"> <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">Ratio</span> <select value={node.data.settings?.ratio} onChange={e => setNodes(p => p.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, ratio: e.target.value } } } : n))} className="bg-white border border-slate-200 rounded-lg p-1.5 text-[8px] font-black uppercase outline-none focus:ring-1 focus:ring-orange-500/20"> <option value="1:1">1:1 SQ</option> <option value="16:9">16:9 WD</option> <option value="9:16">9:16 MB</option> <option value="3:4">3:4 PT</option> </select> </div>
                                            <div className="flex flex-col gap-1"> <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">Batch</span> <select value={node.data.settings?.batch} onChange={e => setNodes(p => p.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, batch: parseInt(e.target.value) } } } : n))} className="bg-white border border-slate-200 rounded-lg p-1.5 text-[8px] font-black uppercase outline-none focus:ring-1 focus:ring-orange-500/20"> <option value="1">1X</option> <option value="2">2X</option> <option value="4">4X</option> </select> </div>
                                        </div>
                                        <button onClick={() => executeProduction()} disabled={isGenerating} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-orange-500 transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"> {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} fill="white" />} INITIALIZE SYNTHESIS </button>
                                    </div>
                                ) : node.type === 'identity' || node.type === 'result' ? (
                                    <div className="space-y-4">
                                        <div className={`relative rounded-[1.8rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all overflow-hidden group/img ${node.data.image ? 'border-indigo-500/30 bg-black' : 'aspect-video border-slate-100 bg-slate-50 hover:border-indigo-400'}`} style={node.data.image && node.data.aspectRatio ? { aspectRatio: `${node.data.aspectRatio}` } : {}} onMouseEnter={() => node.type === 'result' && setHoveredResultId(node.id)} onMouseLeave={() => node.type === 'result' && setHoveredResultId(null)}>
                                            {node.data.image ? (
                                                <>
                                                    <img src={node.data.image} className="w-full h-full object-contain" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] z-30">
                                                        {node.type === 'result' && (<div className="flex gap-2 scale-90 group-hover/img:scale-100 transition-transform duration-500"> <button onClick={() => onApply(node.data.image!)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 active:scale-90 transition-all">Apply Node</button> <button onClick={() => handleGenerateVariation(node)} className="p-2.5 bg-orange-600 text-white rounded-xl shadow-xl hover:bg-orange-500 active:scale-90 transition-all" title="Batch 2 Variation (DRIFT SHIELD ON)"><RefreshCw size={14} /></button> </div>)}
                                                        <div className="flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity delay-100 duration-500"> <button onClick={() => handleUploadClick(node.id)} className="p-2.5 bg-white/10 hover:bg-white text-white hover:text-indigo-600 rounded-xl transition-all" title="Ubah Gambar"><Edit3 size={16} /></button> <button onClick={() => handleClearImage(node.id)} className="p-2.5 bg-red-600/20 hover:bg-red-600 text-white rounded-xl transition-all" title="Hapus Gambar Saja"><Trash2 size={16} /></button> <button onClick={() => onStash(node.data.image!)} className="p-2.5 bg-white/10 hover:bg-white text-white hover:text-indigo-600 rounded-xl transition-all" title="Archive"><Archive size={16} /></button> <button onClick={() => downloadBlob(node.data.image!, `prod_export.png`)} className="p-2.5 bg-white/10 hover:bg-white text-white hover:text-indigo-600 rounded-xl transition-all" title="Export"><Download size={16} /></button> </div>
                                                    </div>
                                                    {(node.data.annotations || []).map(annot => (<div key={annot.id} className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none" style={{ left: `${annot.x}%`, top: `${annot.y}%`, width: `${annot.w}%`, height: `${annot.h}%` }}> <div className="absolute top-0 left-0 -translate-y-full bg-red-600 text-white text-[6px] font-bold px-1 py-0.5 rounded-t-sm uppercase tracking-widest">{annot.label}</div> </div>))}
                                                    {hoveredResultId === node.id && (<div className="fixed floating-preview z-[500] pointer-events-none animate-in fade-in zoom-in-95 duration-500" style={{ left: node.x + (STD_W / zoom) + 40, top: node.y, width: 500 / zoom, maxWidth: '600px' }}> <div className="bg-[#050505] rounded-[3rem] border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col ring-8 ring-indigo-600/5"> <img src={node.data.image} className="w-full h-full object-contain" /> <div className="absolute bottom-6 right-8 flex items-center gap-2"> <div className="px-3 py-1 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest rounded-lg shadow-xl">Precision Vision</div> </div> </div> </div>)}
                                                </>
                                            ) : (<div onClick={() => handleUploadClick(node.id)} className="w-full h-full flex flex-col items-center justify-center cursor-pointer"> <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm group-hover:scale-110 group-hover:text-indigo-500 transition-all"><ImageIcon size={20} /></div> <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-2">Inject Visual Data</span> </div>)}
                                        </div>
                                        {node.type === 'identity' && (
                                            <div className="flex gap-2">
                                                <div className={`flex-1 flex items-center gap-2 border rounded-2xl p-2 px-4 shadow-inner group/tag transition-all ${node.data.tags?.toLowerCase().includes('product utama') || (node.data.annotations || []).some(a => /face|muka|identity/i.test(a.label)) ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                                                    <Tag size={12} className={node.data.tags?.toLowerCase().includes('product utama') || (node.data.annotations || []).some(a => /face|muka|identity/i.test(a.label)) ? 'text-orange-500' : 'text-slate-400'} />
                                                    <input value={node.data.tags || ''} onChange={e => setNodes(p => p.map(n => n.id === node.id ? { ...n, data: { ...n.data, tags: e.target.value } } : n))} placeholder="Tags & Konteks..." className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-600 py-1 placeholder:text-slate-300" />
                                                    {(node.data.tags?.toLowerCase().includes('product utama') || (node.data.annotations || []).some(a => /face|muka|identity/i.test(a.label))) && (<div className="flex items-center gap-1 bg-orange-600 text-white px-2 py-0.5 rounded-full shadow-lg animate-pulse" title="IDENTITY LOCK"> <Lock size={8} strokeWidth={4} /> <span className="text-[6px] font-black uppercase">ALPHA</span> </div>)}
                                                </div>
                                                <button onClick={() => setActiveAnnotationNodeId(node.id)} disabled={!node.data.image} className={`w-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${node.data.image ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-50 text-slate-200 border border-slate-100'}`} title="Precision Annotation"><Target size={18} /></button>
                                            </div>
                                        )}
                                    </div>
                                ) : (<textarea value={node.data.value} onChange={e => setNodes(p => p.map(n => n.id === node.id ? { ...n, data: { ...n.data, value: e.target.value } } : n))} placeholder="Neural directive..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[11px] font-medium text-slate-700 outline-none h-28 resize-none shadow-inner focus:bg-white focus:border-indigo-300 transition-all" />)}
                            </div>

                            {/* PORTS */}
                            {node.type !== 'result' && <div id={`port-out-${node.id}-std`} onMouseDown={e => startConnection(e, node.id, false)} className="absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 border-4 border-white rounded-full cursor-crosshair hover:scale-125 transition-all z-20 shadow-md" />}
                            <div id={`port-out-${node.id}-neural`} onMouseDown={e => startConnection(e, node.id, true)} className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 w-9 h-9 bg-white border-4 border-slate-100 rounded-full flex items-center justify-center cursor-crosshair hover:bg-purple-600 hover:text-white transition-all z-20 group shadow-lg"><Zap size={14} className="text-purple-600 group-hover:text-white" /></div>
                            {node.type !== 'identity' && <div id={`port-in-${node.id}`} onMouseUp={() => completeConnection(node.id)} className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 border-4 border-white rounded-full cursor-crosshair hover:scale-125 transition-all z-20 shadow-md" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* ANNOTATION OVERLAY */}
            {activeAnnotationNodeId && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden border border-slate-100">
                        <div className="h-16 border-b px-8 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><FocusIcon size={22} /></div><div className="flex flex-col"><span className="text-sm font-black uppercase tracking-widest text-slate-800">Anotasi Area</span><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Definisikan obyek primer</span></div></div>
                            <button onClick={() => setActiveAnnotationNodeId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 bg-slate-50 flex items-center justify-center p-12 overflow-hidden relative">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                <div ref={annotContainerRef} className="relative shadow-2xl border-4 border-white rounded-sm bg-black group/editor flex items-center justify-center">
                                    <img src={nodes.find(n => n.id === activeAnnotationNodeId)?.data.image} className="max-h-[60vh] max-w-full object-contain select-none pointer-events-none" draggable={false} />
                                    <div className="absolute inset-0 overflow-hidden pointer-events-auto">
                                        {(nodes.find(n => n.id === activeAnnotationNodeId)?.data.annotations || []).map(annot => (
                                            <Rnd key={annot.id} bounds="parent" size={{ width: `${annot.w}%`, height: `${annot.h}%` }} position={{ x: (annot.x / 100) * (annotContainerRef.current?.offsetWidth || 1), y: (annot.y / 100) * (annotContainerRef.current?.offsetHeight || 1) }} onDragStop={(e, d) => { const container = annotContainerRef.current; if (!container) return; updateAnnotation(activeAnnotationNodeId!, annot.id, { x: (d.x / container.offsetWidth) * 100, y: (d.y / container.offsetHeight) * 100 }); }} onResizeStop={(e, dir, ref, delta, pos) => { const container = annotContainerRef.current; if (!container) return; updateAnnotation(activeAnnotationNodeId!, annot.id, { w: (ref.offsetWidth / container.offsetWidth) * 100, h: (ref.offsetHeight / container.offsetHeight) * 100, x: (pos.x / container.offsetWidth) * 100, y: (pos.y / container.offsetWidth) * 100 }); }} resizeHandleClasses={{ topLeft: 'custom-rnd-handle handle-nw', topRight: 'custom-rnd-handle handle-ne', bottomLeft: 'custom-rnd-handle handle-sw', bottomRight: 'custom-rnd-handle handle-se', top: 'custom-rnd-handle handle-n', bottom: 'custom-rnd-handle handle-s', left: 'custom-rnd-handle handle-w', right: 'custom-rnd-handle handle-e' }} className="border-2 border-indigo-500 bg-indigo-500/10 cursor-move group/annot z-[50]">
                                                <div className="absolute top-0 left-0 -translate-y-full bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-t-lg whitespace-nowrap uppercase tracking-widest shadow-lg flex items-center gap-2 pointer-events-none">{annot.label}</div>
                                                <button onClick={(e) => { e.stopPropagation(); removeAnnotation(activeAnnotationNodeId!, annot.id); }} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/annot:opacity-100 transition-opacity shadow-lg"><X size={10} strokeWidth={4} /></button>
                                                <div className="absolute bottom-0 right-0 p-0.5 text-indigo-500 opacity-40 group-hover/annot:opacity-100 transition-opacity"><CornerRightDown size={12} /></div>
                                            </Rnd>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="w-80 border-l bg-white flex flex-col p-6 space-y-6 overflow-y-auto studio-scrollbar shrink-0">
                                <button onClick={() => addAnnotation(activeAnnotationNodeId!)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500 shadow-xl active:scale-95 transition-all"><PlusCircle size={18} /> Node Region Baru</button>
                                <div className="h-px bg-slate-100" />
                                <div className="space-y-4">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Map size={14} className="text-indigo-500" /> Region Aktif</span>
                                    <div className="space-y-2">
                                        {(nodes.find(n => n.id === activeAnnotationNodeId)?.data.annotations || []).map((annot, idx) => (
                                            <div key={annot.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 group shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-center"><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Region {idx + 1}</span><button onClick={() => removeAnnotation(activeAnnotationNodeId!, annot.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button></div>
                                                <div className="flex flex-col gap-1.5"><span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">Label</span><input value={annot.label} onChange={(e) => updateAnnotation(activeAnnotationNodeId!, annot.id, { label: e.target.value.toUpperCase() })} placeholder="e.g. Produk..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none" /></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-auto pt-6 border-t"><button onClick={() => setActiveAnnotationNodeId(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl">Konfirmasi Registry</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEURAL HUB */}
            <div className="fixed inset-x-0 bottom-6 pointer-events-none flex justify-center z-[9000]">
                <div className={`pointer-events-auto transition-all duration-700 bg-white/90 backdrop-blur-3xl border border-indigo-100 shadow-2xl relative ${isAiMinimized ? 'h-16 w-80 rounded-full px-8' : 'w-full max-w-4xl rounded-[2.5rem] flex flex-col'}`}>
                    <div id="ai-hub-master-port" onMouseUp={() => completeConnection('ai-core')} className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center cursor-crosshair hover:scale-125 transition-all z-[100] ${connectingSourceId ? 'animate-pulse scale-110' : ''}`}><div className={`w-2 h-2 rounded-full bg-white ${edges.some(e => e.target === 'ai-core') ? 'animate-ping' : ''}`} /></div>
                    {isAiMinimized ? (
                        <div className="flex items-center w-full h-full cursor-pointer justify-between" onClick={() => setIsAiMinimized(false)}>
                            <div className="flex items-center gap-4"><Radio size={14} className={edges.some(e => e.target === 'ai-core') ? 'text-purple-600 animate-pulse' : 'text-slate-400'} /><span className="text-[10px] font-black uppercase tracking-[0.4em]">NEURAL HUB ({neuralDirectives.length})</span></div>
                            <ChevronDown size={14} className="text-slate-300" />
                        </div>
                    ) : (
                        <div className="flex flex-col h-[500px] animate-in slide-in-from-bottom-8">
                            <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest">Neural DNA Synthesis</span><button onClick={() => setIsAiMinimized(true)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Minimize2 size={18} /></button></div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="w-1/3 border-r border-slate-50 p-6 space-y-4 overflow-y-auto studio-scrollbar">{NEURAL_TAGS.map(cat => (<div key={cat.category} className="space-y-2"><span className="text-[8px] font-black text-slate-400 uppercase">{cat.category}</span><div className="flex flex-wrap gap-1.5">{cat.tags.map(t => (<button key={t} onClick={() => setAiCommand(prev => prev + ' ' + t)} className={`px-2 py-1 rounded-lg border text-[7px] font-bold uppercase transition-all hover:bg-slate-900 hover:text-white ${cat.color}`}>{t}</button>))}</div></div>))}</div>
                                <div className="flex-1 flex flex-col bg-white">
                                    <div className="flex-1 p-6 overflow-y-auto studio-scrollbar space-y-4">
                                        {neuralDirectives.map((d, i) => {
                                            const isDeployed = deployedDirectiveIds.has(d.id || `${d.nodeId}-${d.content.slice(0, 10)}`);
                                            return (
                                                <div key={i} className={`p-5 bg-white rounded-3xl border shadow-xl group transition-all hover:border-indigo-200 ${isDeployed ? 'border-green-100 bg-green-50/10' : 'border-slate-100'}`}>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">SYNTHESIS NODE: {d.nodeId.toUpperCase()}</span>
                                                        <button onClick={() => handleDeployToNode(d)} className={`text-[8px] font-black px-3 py-1 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${isDeployed ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                                            {isDeployed ? <RefreshCw size={10} /> : <Check size={10} />} {isDeployed ? 'DEPLOY ULANG' : 'DEPLOY'}
                                                        </button>
                                                    </div>
                                                    <p className="text-[12px] font-bold text-slate-800 leading-relaxed mb-4">{d.explanation}</p>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative group/code overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-2 opacity-10"><Target size={24} className="text-slate-900" /></div>
                                                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic relative z-10">"{d.content}"</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                                        <div className="flex items-center gap-3 bg-white border border-indigo-100 rounded-2xl p-1.5 shadow-xl focus-within:border-indigo-400 transition-all"><input value={aiCommand} onChange={e => setAiCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNeuralSynthesis()} placeholder="Enter strategic design command..." className="flex-1 bg-transparent border-none text-xs font-bold px-4 focus:ring-0 outline-none h-10 placeholder:text-slate-300" /><button onClick={handleNeuralSynthesis} disabled={isAiLoading || !aiCommand.trim()} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 shadow-lg active:scale-90 transition-all">{isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            {/* ZOOM HUD */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white/95 backdrop-blur-xl p-2 rounded-2xl border border-slate-200 shadow-2xl z-[9000]">
                <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"><ZoomOut size={16} /></button>
                <span className="text-[10px] font-black w-10 text-center text-indigo-600 font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"><ZoomIn size={16} /></button>
            </div>
        </div>
    );
};
