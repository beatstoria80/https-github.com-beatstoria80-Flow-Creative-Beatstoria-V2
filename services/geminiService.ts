import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- NEURAL ARCHITECT: CORE CONFIGS (UNIVERSAL) ---

export const PHOTOREALISTIC_RAW_PROTOCOL = `
[CONFIG: Photorealistic_Selfie_Generator]
- STYLE_MODIFIER: Ultra-photorealistic RAW smartphone selfie, extreme close-up. Authentic human expression, neutral. Visible skin texture: pores, fine grain, micro-imperfections.
- NEGATIVE_PROMPT: makeup, lipstick, styling, studio lighting, airbrushed, cartoon, 3d render.
`;

export const TAYLOR_16_ANGLES_PROTOCOL = `
[PROTOCOL: MULTI_ANGLE_CONTINUITY]
- OBJECTIVE: Extreme spatial consistency across 16 camera perspectives.
- IDENTITY_LOCK: Keep the subject's structure and material properties identical to Anchor 0.
- ENVIRONMENT_BOND: Maintain exact geometry, lighting, and texture from Anchor B. 
- COHERENCE: Every shot must belong to the same physical 3D space.
`;

export const UNIVERSAL_BOND_PROTOCOL = `
[CRITICAL: MULTI_SOURCE_FIDELITY]
- PRIMARY_SUBJECT: Preserve exact anatomy and material properties from Anchor 0.
- ASSET_INTEGRITY: If an environment is present in anchors, CLONE its geometry and texture exactly. 
`;

export const ELITE_VISUAL_PROTOCOL = `
[PROTOCOL: ELITE_VISUAL_FIDELITY]
- STYLE: Professional high-end cinematography, master color grading, dynamic lighting.
- QUALITY: 8k resolution, sharp detail, high dynamic range.
`;

export const SKIN_INTEGRITY_PROTOCOL = `
[PROTOCOL: MATERIAL_SURFACE_INTEGRITY]
- DETAIL: Raw surface texture, visible pores or micro-details, zero artificial smoothing.
`;

export const prepareImageForAi = async (src: string | File): Promise<{ data: string, mimeType: string }> => {
  if (typeof src === 'string') {
    if (src.startsWith('data:')) {
      return { data: src.split(',')[1], mimeType: src.substring(src.indexOf(':') + 1, src.indexOf(';')) };
    }
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: blob.type });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  } else {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: src.type });
        reader.onerror = reject;
        reader.readAsDataURL(src);
    });
  }
};

export const analyzeVisualContext = async (images: string[]): Promise<string> => {
    try {
        const ai = getAI();
        const parts: any[] = [];
        for (const img of images) {
            const p = await prepareImageForAi(img);
            parts.push({ inlineData: p });
        }
        parts.push({ text: "Describe every technical detail: lighting, material texture, background geometry, and surface properties. Do not assume categories. Use only what is visible." });
        // Use gemini-3-flash-preview for text-based analysis of visual parts
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: { parts } 
        });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateNanoImage = async (userPrompt: string, aspectRatio: string = "1:1", referenceImages: any = null, quality: string = "Pro", shotModifier: string = ""): Promise<string> => {
    const isElite = quality === 'Elite';
    
    // Check key selection for elite models
    if (isElite) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            throw new Error("PERMISSION_DENIED_KEY_REQUIRED");
        }
    }

    const ai = getAI();
    const parts: any[] = [];
    const validAnchors = referenceImages ? (Array.isArray(referenceImages) ? referenceImages.filter(Boolean) : [referenceImages]) : [];
    let visualMetadata = "";
    if (validAnchors.length > 0) {
        visualMetadata = await analyzeVisualContext(validAnchors);
        for (const img of validAnchors) {
            const prepared = await prepareImageForAi(img);
            parts.push({ inlineData: { data: prepared.data, mimeType: prepared.mimeType } });
        }
    }
    const isSelfie = /selfie|portrait|face|human/i.test(userPrompt);
    const isTaylor = shotModifier !== "";
    let finalPrompt = `
    [SYSTEM_GATEWAY: UNIVERSAL_HIGH_FIDELITY_RENDER]
    MATERIAL_CONTEXT: ${visualMetadata}
    USER_DIRECTIVE: ${userPrompt}
    ${shotModifier ? `CAMERA_SHOT: ${shotModifier}` : ''}
    ${isSelfie ? PHOTOREALISTIC_RAW_PROTOCOL : ''}
    ${isTaylor ? TAYLOR_16_ANGLES_PROTOCOL : ''}
    ${isElite ? ELITE_VISUAL_PROTOCOL : ''}
    ${validAnchors.length > 0 ? UNIVERSAL_BOND_PROTOCOL : ''}
    [MANDATE]
    Strictly follow the material properties in the anchor images. If it is a cosmetic product, render as high-end cosmetic photography. If tech, render as tech photography. NEVER hallucinate cloth or sport textures.
    `;
    parts.push({ text: finalPrompt.trim() });
    
    try {
        const response = await ai.models.generateContent({
            model: isElite ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: isElite ? "2K" : "1K" } }
        });
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Render Failed");
    } catch (err: any) {
        if (err.message?.includes("PERMISSION_DENIED")) {
            throw new Error("PERMISSION_DENIED_KEY_REQUIRED");
        }
        throw err;
    }
};

export const describeImage = async (img: string) => {
    const ai = getAI();
    const p = await prepareImageForAi(img);
    // Use gemini-3-flash-preview for text description tasks
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts: [ { inlineData: p }, { text: "Provide a raw technical description of materials, surfaces, and lighting." } ] } 
    });
    return r.text || "";
};

export const generateStoryScenes = async (c: string, n: number) => {
    const ai = getAI();
    // Use gemini-3-flash-preview for text-based storyboard generation
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Generate ${n} cinematic storyboard scenes for: ${c}. Focus on material fidelity. JSON array of strings.`,
        config: { 
          responseMimeType: "application/json", 
          // @ts-ignore
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } 
        }
    });
    return JSON.parse(r.text || "[]");
};

export const generateVideoScript = async (story: string, n: number) => {
    const ai = getAI();
    // Use gemini-3-flash-preview for text-based script generation
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Generate ${n}-clip video script: ${story}. JSON array of objects with "prompt".`,
        config: { 
            responseMimeType: "application/json",
            // @ts-ignore
            responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING } }, required: ["prompt"] } }
        }
    });
    return JSON.parse(r.text || "[]");
};

export const generatePodcastScene = async (f: string, t: string, d: string) => {
    const prompt = `[INTERACTION_NODE: ${t}] ${d}. Apply absolute identity lock.`;
    return generateNanoImage(prompt, "9:16", [f], "Elite");
};

export const enrichCinematicPrompt = async (c: string) => {
    const ai = getAI();
    // Use gemini-3-flash-preview for prompt enrichment
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Enrich this cinematic concept. Focus on material texture and environmental lighting: "${c}".` 
    });
    return r.text || c;
};

export const expandPrompt = async (p: string) => {
    const ai = getAI();
    // Use gemini-3-flash-preview for text-based expansion
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: p, 
        config: { systemInstruction: "You are a prompt engineer. Expand the user's brief instruction into a detailed technical prompt." } 
    });
    return r.text || p;
};

export const generateCinematicBatch = async (p: string, m: string, ar: string = "16:9", a?: string) => {
    const prompt = `[SHOT: ${m}] ${p}. Maintain material continuity.`;
    return generateNanoImage(prompt, ar, a ? [a] : null, "Elite");
};

export const suggestExpansionAngles = async (e: string[]) => {
    const ai = getAI();
    // Use gemini-3-flash-preview for text-based brainstorming
    const r = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: `Suggest 8 diverse cinematic camera angles. current: ${e.join(', ')}. JSON array of strings.`,
        config: { 
          responseMimeType: "application/json", 
          // @ts-ignore
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } 
        }
    });
    return JSON.parse(r.text || "[]");
};

export const neuralHeal = async (image: string, mask: string): Promise<string> => {
    const ai = getAI();
    const preparedImg = await prepareImageForAi(image);
    const preparedMask = await prepareImageForAi(mask);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: preparedImg }, { inlineData: preparedMask }, { text: `Match material texture and natural grain exactly.` }] }
    });
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Healing Failed");
};

export const generativeFill = async (image: string, mask: string, prompt: string): Promise<string> => {
    const ai = getAI();
    const preparedImg = await prepareImageForAi(image);
    const preparedMask = await prepareImageForAi(mask);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: preparedImg }, { inlineData: preparedMask }, { text: `[GEN_FILL] ${prompt}. Maintain identity and environmental lighting.` }] }
    });
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Synthesis Failed");
};
