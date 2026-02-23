import{G as w,K as d}from"./index-BkXRUI0v.js";const o=()=>new w({apiKey:""}),A=`
[CONFIG: Photorealistic_Selfie_Generator]
- STYLE_MODIFIER: Ultra-photorealistic RAW smartphone selfie, extreme close-up. Authentic human expression, neutral. Visible skin texture: pores, fine grain, micro-imperfections.
- NEGATIVE_PROMPT: makeup, lipstick, styling, studio lighting, airbrushed, cartoon, 3d render.
`,S=`
[PROTOCOL: MULTI_ANGLE_CONTINUITY]
- OBJECTIVE: Extreme spatial consistency across 16 camera perspectives.
- IDENTITY_LOCK: Keep the subject's structure and material properties identical to Anchor 0.
- ENVIRONMENT_BOND: Maintain exact geometry, lighting, and texture from Anchor B. 
- COHERENCE: Every shot must belong to the same physical 3D space.
`,N=`
[CRITICAL: MULTI_SOURCE_FIDELITY]
- PRIMARY_SUBJECT: Preserve exact anatomy and material properties from Anchor 0.
- ASSET_INTEGRITY: If an environment is present in anchors, CLONE its geometry and texture exactly. 
`,_=`
[PROTOCOL: ELITE_VISUAL_FIDELITY]
- STYLE: Professional high-end cinematography, master color grading, dynamic lighting.
- QUALITY: 8k resolution, sharp detail, high dynamic range.
`,L=`
[PROTOCOL: MATERIAL_SURFACE_INTEGRITY]
- DETAIL: Raw surface texture, visible pores or micro-details, zero artificial smoothing.
`,g=async e=>{if(typeof e=="string"){if(e.startsWith("data:"))return{data:e.split(",")[1],mimeType:e.substring(e.indexOf(":")+1,e.indexOf(";"))};const t=await(await fetch(e)).blob();return new Promise((n,s)=>{const i=new FileReader;i.onloadend=()=>n({data:i.result.split(",")[1],mimeType:t.type}),i.onerror=s,i.readAsDataURL(t)})}else return new Promise((a,t)=>{const n=new FileReader;n.onloadend=()=>a({data:n.result.split(",")[1],mimeType:e.type}),n.onerror=t,n.readAsDataURL(e)})},C=async e=>{try{const a=o(),t=[];for(const s of e){const i=await g(s);t.push({inlineData:i})}return t.push({text:"Describe every technical detail: lighting, material texture, background geometry, and surface properties. Do not assume categories. Use only what is visible."}),(await a.models.generateContent({model:"gemini-3-flash-preview",contents:{parts:t}})).text||""}catch{return""}},T=async(e,a="1:1",t=null,n="Pro",s="")=>{var y,u,I,f;const i=n==="Elite";if(i&&!await window.aistudio.hasSelectedApiKey())throw new Error("PERMISSION_DENIED_KEY_REQUIRED");const m=o(),c=[],r=t?Array.isArray(t)?t.filter(Boolean):[t]:[];let l="";if(r.length>0){l=await C(r);for(const p of r){const h=await g(p);c.push({inlineData:{data:h.data,mimeType:h.mimeType}})}}const E=/selfie|portrait|face|human/i.test(e),R=s!=="";let O=`
    [SYSTEM_GATEWAY: UNIVERSAL_HIGH_FIDELITY_RENDER]
    MATERIAL_CONTEXT: ${l}
    USER_DIRECTIVE: ${e}
    ${s?`CAMERA_SHOT: ${s}`:""}
    ${E?A:""}
    ${R?S:""}
    ${i?_:""}
    ${r.length>0?N:""}
    [MANDATE]
    Strictly follow the material properties in the anchor images. If it is a cosmetic product, render as high-end cosmetic photography. If tech, render as tech photography. NEVER hallucinate cloth or sport textures.
    `;c.push({text:O.trim()});try{const p=await m.models.generateContent({model:i?"gemini-3-pro-image-preview":"gemini-2.5-flash-image",contents:{parts:c},config:{imageConfig:{aspectRatio:a,imageSize:i?"2K":"1K"}}});if((I=(u=(y=p.candidates)==null?void 0:y[0])==null?void 0:u.content)!=null&&I.parts){for(const h of p.candidates[0].content.parts)if(h.inlineData)return`data:image/png;base64,${h.inlineData.data}`}throw new Error("Render Failed")}catch(p){throw(f=p.message)!=null&&f.includes("PERMISSION_DENIED")?new Error("PERMISSION_DENIED_KEY_REQUIRED"):p}},x=async e=>{const a=o(),t=await g(e);return(await a.models.generateContent({model:"gemini-3-flash-preview",contents:{parts:[{inlineData:t},{text:"Provide a raw technical description of materials, surfaces, and lighting."}]}})).text||""},P=async(e,a)=>{const n=await o().models.generateContent({model:"gemini-3-flash-preview",contents:`Generate ${a} cinematic storyboard scenes for: ${e}. Focus on material fidelity. JSON array of strings.`,config:{responseMimeType:"application/json",responseSchema:{type:d.ARRAY,items:{type:d.STRING}}}});return JSON.parse(n.text||"[]")},v=async(e,a)=>{const n=await o().models.generateContent({model:"gemini-3-flash-preview",contents:`Generate ${a}-clip video script: ${e}. JSON array of objects with "prompt".`,config:{responseMimeType:"application/json",responseSchema:{type:d.ARRAY,items:{type:d.OBJECT,properties:{prompt:{type:d.STRING}},required:["prompt"]}}}});return JSON.parse(n.text||"[]")},b=async(e,a,t)=>{const n=`[INTERACTION_NODE: ${a}] ${t}. Apply absolute identity lock.`;return T(n,"9:16",[e],"Elite")},M=async e=>(await o().models.generateContent({model:"gemini-3-flash-preview",contents:`Enrich this cinematic concept. Focus on material texture and environmental lighting: "${e}".`})).text||e,$=async e=>(await o().models.generateContent({model:"gemini-3-flash-preview",contents:e,config:{systemInstruction:"You are a prompt engineer. Expand the user's brief instruction into a detailed technical prompt."}})).text||e,Y=async(e,a,t="16:9",n)=>{const s=`[SHOT: ${a}] ${e}. Maintain material continuity.`;return T(s,t,n?[n]:null,"Elite")},G=async e=>{const t=await o().models.generateContent({model:"gemini-3-flash-preview",contents:`Suggest 8 diverse cinematic camera angles. current: ${e.join(", ")}. JSON array of strings.`,config:{responseMimeType:"application/json",responseSchema:{type:d.ARRAY,items:{type:d.STRING}}}});return JSON.parse(t.text||"[]")},U=async(e,a)=>{var m,c,r;const t=o(),n=await g(e),s=await g(a),i=await t.models.generateContent({model:"gemini-2.5-flash-image",contents:{parts:[{inlineData:n},{inlineData:s},{text:"Match material texture and natural grain exactly."}]}});if((r=(c=(m=i.candidates)==null?void 0:m[0])==null?void 0:c.content)!=null&&r.parts){for(const l of i.candidates[0].content.parts)if(l.inlineData)return`data:image/png;base64,${l.inlineData.data}`}throw new Error("Healing Failed")},F=async(e,a,t)=>{var c,r,l;const n=o(),s=await g(e),i=await g(a),m=await n.models.generateContent({model:"gemini-2.5-flash-image",contents:{parts:[{inlineData:s},{inlineData:i},{text:`[GEN_FILL] ${t}. Maintain identity and environmental lighting.`}]}});if((l=(r=(c=m.candidates)==null?void 0:c[0])==null?void 0:r.content)!=null&&l.parts){for(const E of m.candidates[0].content.parts)if(E.inlineData)return`data:image/png;base64,${E.inlineData.data}`}throw new Error("Synthesis Failed")};export{_ as E,L as S,F as a,P as b,v as c,x as d,$ as e,C as f,T as g,M as h,Y as i,b as j,U as n,g as p,G as s};
