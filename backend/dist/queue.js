"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_LABELS = void 0;
exports.composePrompt = composePrompt;
exports.processJobLocal = processJobLocal;
exports.enqueueImageJob = enqueueImageJob;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const genai_1 = require("@google/genai");
const mime_1 = __importDefault(require("mime"));
const logger_1 = require("./logger");
const prisma_1 = __importDefault(require("./prisma"));
const prompts_1 = require("./prompts");
const UPLOADS_DIR = path_1.default.join(__dirname, '../uploads');
exports.WORKFLOW_LABELS = {
    CATALOG_IMAGE: 'Catalog Image',
    JEWELRY_ON_MODEL: 'Jewelry On Model',
    GEMSTONE_COLOR_CHANGE: 'Gemstone Color Change',
    CUSTOMER_TRY_ON: 'Customer Try-On',
    BACKGROUND_REPLACEMENT: 'Background Replacement',
    LUXURY_ENHANCEMENT: 'Luxury Enhancement',
    CUSTOM_PROMPT: 'Custom Prompt',
    BULK_GENERATION: 'Bulk Generation',
    RATE_TOOLS: 'Rate Tools',
};
async function composePrompt(input) {
    const wf = input.workflow || 'CATALOG_IMAGE';
    // ── 1. Load master template: DB row first, professional library fallback ──
    const dbMaster = await prisma_1.default.promptTemplate.findUnique({ where: { workflow: wf } });
    const libMaster = prompts_1.MASTER_PROMPTS[wf] || prompts_1.MASTER_PROMPTS['CATALOG_IMAGE'];
    const systemRole = dbMaster?.systemRole || libMaster.systemRole;
    const cameraSettings = dbMaster?.cameraSettings || libMaster.cameraSettings;
    const environment = dbMaster?.environment || libMaster.environment;
    const lightingAndPhysics = dbMaster?.lightingAndPhysics || libMaster.lightingAndPhysics;
    const preservationLock = dbMaster?.preservationLock || libMaster.preservationLock;
    const negativePrompt = dbMaster?.negativePrompt || libMaster.negativePrompt;
    // ── 2. Resolve jewelry types and build per-type subject map (simple strings) ─
    const types = input.jewelryType
        ? input.jewelryType.split(',').map((t) => t.trim()).filter(Boolean)
        : ['Ring'];
    // subject map: { slug: "plain text description" } — matches user's exact JSON spec
    const subjectMap = {};
    for (const t of types) {
        const key = (0, prompts_1.getChildPromptKey)(t, wf);
        // DB SubjectPrompt row takes priority (admin-editable)
        const dbChild = await prisma_1.default.subjectPrompt.findUnique({ where: { jewelryType: t } });
        if (dbChild?.coreDescription) {
            subjectMap[key] = dbChild.coreDescription;
        }
        else {
            const libChild = prompts_1.CHILD_PROMPTS[key];
            subjectMap[key] = libChild?.text || `A premium luxury ${t.toLowerCase()} in a professional studio composition.`;
        }
    }
    // If multiple types selected, also include the multi-set description
    if (types.length > 1 && !subjectMap['multiple_items']) {
        const libMulti = prompts_1.CHILD_PROMPTS['multiple_items'];
        subjectMap['multiple_items'] = libMulti?.text || 'A curated luxury jewelry set arranged harmoniously, with each piece spaced and aligned beautifully to allow natural contact shadows.';
    }
    // ── 3. Workflow intent label ───────────────────────────────────────────────
    const intent = prompts_1.WORKFLOW_INTENTS[wf] || `${wf.toLowerCase()}_production_intent`;
    // ── 4. Build the final compiled prompt text sent to the API ───────────────
    // Order: systemRole → cameraSettings → subject descriptions → [user_instruction] → environment → lighting → preservation
    const compiledParts = [
        systemRole,
        cameraSettings,
        ...Object.values(subjectMap), // plain strings — no more .subject_description
        ...(input.promptText ? [input.promptText] : []),
        environment,
        lightingAndPhysics,
        preservationLock,
    ].filter(Boolean);
    const finalCompiledPrompt = `${compiledParts.join(' ').trim()}. Avoid and exclude: ${negativePrompt}`;
    // ── 5. Assemble the structured JSON prompt document ───────────────────────
    const jsonPrompt = {
        generation_profile: {
            intent,
            target_aesthetic: 'photorealistic_luxury',
        },
        prompt_components: {
            system_role: systemRole,
            camera_settings: cameraSettings,
            subject: subjectMap,
            ...(input.promptText ? { user_instruction: input.promptText } : {}),
            environment,
            lighting_and_physics: lightingAndPhysics,
            preservation_lock: preservationLock,
        },
        negative_prompt: negativePrompt,
        final_compiled_prompt: finalCompiledPrompt,
    };
    return JSON.stringify(jsonPrompt, null, 2);
}
async function getGeminiSettings() {
    const provider = await prisma_1.default.providerSetting.findUnique({ where: { provider: 'GEMINI' } });
    const legacySettings = await prisma_1.default.settings.findUnique({ where: { id: 'GLOBAL' } });
    return {
        apiKey: provider?.encryptedApiKey || legacySettings?.geminiApiKey || process.env.GEMINI_API_KEY,
        modelName: provider?.modelName || process.env.GEMINI_MODEL || 'nano-banana-pro-preview',
    };
}
function uploadUrlToPath(url) {
    if (!url || !url.startsWith('/uploads/'))
        return null;
    return path_1.default.join(UPLOADS_DIR, path_1.default.basename(url));
}
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
async function imagePartForSdk(url) {
    const filePath = uploadUrlToPath(url);
    if (!filePath)
        return null;
    const stat = await promises_1.default.stat(filePath).catch(() => null);
    if (!stat || stat.size > MAX_IMAGE_SIZE_BYTES) {
        logger_1.logger.warn(`Skipping oversized image`, { filePath, size: stat?.size || 0 });
        return null;
    }
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeType = mime_1.default.getType(ext) || 'image/jpeg';
    const data = await promises_1.default.readFile(filePath);
    return {
        inlineData: {
            data: data.toString('base64'),
            mimeType,
        },
    };
}
const FETCH_TIMEOUT_MS = 120_000;
async function callGeminiImageViaSdk(params) {
    const ai = new genai_1.GoogleGenAI({ apiKey: params.apiKey });
    const parts = [
        { text: params.prompt },
    ];
    for (const url of params.imageUrls) {
        const part = await imagePartForSdk(url);
        if (part)
            parts.push(part);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await ai.models.generateContent({
            model: params.modelName,
            config: {
                imageConfig: {
                    aspectRatio: params.aspectRatio || '1:1',
                    imageSize: '1K',
                },
                responseModalities: ['IMAGE', 'TEXT'],
            },
            contents: [{ role: 'user', parts }],
        });
        let imageBuffer = null;
        let fullText = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                }
                if (part.text) {
                    fullText += part.text;
                }
            }
        }
        if (!imageBuffer) {
            throw new Error(fullText.trim() || 'Gemini did not return image data.');
        }
        return { imageBuffer, usage: null };
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function callImagenImageViaSdk(params) {
    const ai = new genai_1.GoogleGenAI({ apiKey: params.apiKey });
    let aspect = '1:1';
    if (params.aspectRatio) {
        const validAspects = ['1:1', '3:4', '4:3', '9:16', '16:9'];
        if (validAspects.includes(params.aspectRatio)) {
            aspect = params.aspectRatio;
        }
    }
    const model = params.modelName.startsWith('models/') ? params.modelName : `models/${params.modelName}`;
    const response = await ai.models.generateImages({
        model,
        prompt: params.prompt,
        config: {
            numberOfImages: 1,
            personGeneration: 'ALLOW_ADULT',
            aspectRatio: aspect,
            imageSize: '1K',
        },
    });
    if (!response?.generatedImages || response.generatedImages.length === 0) {
        throw new Error('No images generated by Imagen.');
    }
    const base64 = response.generatedImages[0]?.image?.imageBytes;
    if (!base64) {
        throw new Error('Imagen did not return image bytes.');
    }
    return {
        imageBuffer: Buffer.from(base64, 'base64'),
        usage: null,
    };
}
async function callGeminiImageViaRest(params) {
    const parts = [{ text: params.prompt }];
    for (const url of params.imageUrls) {
        const filePath = uploadUrlToPath(url);
        if (!filePath)
            continue;
        const stat = await promises_1.default.stat(filePath).catch(() => null);
        if (!stat || stat.size > MAX_IMAGE_SIZE_BYTES)
            continue;
        const ext = path_1.default.extname(filePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        const data = await promises_1.default.readFile(filePath);
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: data.toString('base64'),
            },
        });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.modelName}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': params.apiKey,
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                    imageConfig: {
                        aspectRatio: params.aspectRatio || '1:1',
                    }
                },
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Gemini request failed (${response.status}): ${body.slice(0, 500)}`);
        }
        const result = (await response.json());
        const outputPart = result.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data || part.inline_data?.data);
        const base64 = outputPart?.inlineData?.data || outputPart?.inline_data?.data;
        if (!base64) {
            const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join(' ');
            throw new Error(text || 'Gemini did not return image data.');
        }
        return {
            imageBuffer: Buffer.from(base64, 'base64'),
            usage: result.usageMetadata || null,
        };
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function processJobLocal(jobId, queueJobId) {
    logger_1.logger.info(`Starting job`, { jobId });
    try {
        await prisma_1.default.job.update({
            where: { id: jobId },
            data: { status: 'PROCESSING', errorMessage: null },
        });
    }
    catch (err) {
        logger_1.logger.error(`Failed to set job to PROCESSING`, { jobId, error: err.message });
        return;
    }
    try {
        const settings = await getGeminiSettings();
        if (!settings.apiKey) {
            throw new Error("Gemini API key is not configured. Please add your key in the Admin Dashboard.");
        }
        let result;
        const jobData = await prisma_1.default.job.findUnique({
            where: { id: jobId },
            include: { stylePreset: true },
        });
        if (!jobData)
            throw new Error('Job not found');
        let aspectRatio = '1:1';
        let personGeneration = 'ALLOW_ADULT';
        let numberOfImages = 1;
        if (jobData.providerMetadata) {
            try {
                const meta = JSON.parse(jobData.providerMetadata);
                if (meta.aspectRatio)
                    aspectRatio = meta.aspectRatio;
                if (meta.personGeneration)
                    personGeneration = meta.personGeneration;
                if (meta.numberOfImages)
                    numberOfImages = Number(meta.numberOfImages) || 1;
                // Per-job model override: if the job has a resolved modelName stored in metadata,
                // use it instead of the global provider setting (allows per-generation model selection)
                if (meta.modelName) {
                    logger_1.logger.info(`Using per-job model override`, { jobId, model: meta.modelName });
                    settings.modelName = meta.modelName;
                }
            }
            catch (e) {
                // ignore malformed metadata
            }
        }
        logger_1.logger.info(`Composing prompt`, { jobId });
        const finalPrompt = await composePrompt({
            ...jobData,
            aspectRatio,
            personGeneration,
            numberOfImages,
        });
        const isImagenModel = settings.modelName.startsWith('imagen-') || settings.modelName.includes('imagen-4.0') || settings.modelName.includes('imagen-');
        if (isImagenModel) {
            logger_1.logger.info(`Routing to Imagen 4 text-to-image pipeline`, { jobId, model: settings.modelName });
            result = await callImagenImageViaSdk({
                apiKey: settings.apiKey,
                modelName: settings.modelName,
                prompt: finalPrompt,
                aspectRatio,
            });
        }
        else {
            logger_1.logger.info(`Routing to Gemini multimodal pipeline`, { jobId, model: settings.modelName });
            try {
                result = await callGeminiImageViaSdk({
                    apiKey: settings.apiKey,
                    modelName: settings.modelName,
                    prompt: finalPrompt,
                    imageUrls: [jobData.inputUrl, jobData.referenceUrl, jobData.modelUrl],
                    aspectRatio,
                });
            }
            catch (sdkErr) {
                logger_1.logger.warn(`SDK call failed, falling back to REST API`, { jobId, error: sdkErr.message });
                result = await callGeminiImageViaRest({
                    apiKey: settings.apiKey,
                    modelName: settings.modelName,
                    prompt: finalPrompt,
                    imageUrls: [jobData.inputUrl, jobData.referenceUrl, jobData.modelUrl],
                    aspectRatio,
                });
            }
        }
        await promises_1.default.mkdir(UPLOADS_DIR, { recursive: true });
        const outputFilename = `generated_${jobId}.png`;
        await promises_1.default.writeFile(path_1.default.join(UPLOADS_DIR, outputFilename), result.imageBuffer);
        await prisma_1.default.job.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                outputUrl: `/uploads/${outputFilename}`,
                finalPrompt,
                provider: 'GEMINI',
                providerModel: settings.modelName,
                providerMetadata: JSON.stringify({ queueJobId: queueJobId || null, usage: result.usage }),
                creditsUsed: 5,
            },
        });
        logger_1.logger.info(`Job completed successfully`, { jobId });
        const batchId = jobData.batchId;
        if (batchId) {
            await prisma_1.default.$transaction(async (tx) => {
                const batch = await tx.batch.findUnique({ where: { id: batchId } });
                if (!batch)
                    return;
                const newCompleted = await tx.job.count({ where: { batchId, status: 'COMPLETED' } });
                const newFailed = await tx.job.count({ where: { batchId, status: 'FAILED' } });
                await tx.batch.update({
                    where: { id: batchId },
                    data: {
                        completedJobs: newCompleted,
                        status: newCompleted + newFailed >= batch.totalJobs ? 'COMPLETED' : 'PROCESSING',
                    },
                });
            });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown processing error';
        logger_1.logger.error(`Job failed`, { jobId, error: message });
        try {
            await prisma_1.default.job.update({
                where: { id: jobId },
                data: { status: 'FAILED', errorMessage: message },
            });
        }
        catch (dbErr) {
            logger_1.logger.error(`Failed to update job status to FAILED`, { jobId, error: dbErr.message });
        }
    }
}
// Replaced BullMQ enqueue with in-memory execution.
// This supports the "zero containers" Dockerless setup.
async function enqueueImageJob(jobId) {
    logger_1.logger.info(`Queuing job in-memory (Dockerless Mode)`, { jobId });
    // Start job processing asynchronously immediately
    setImmediate(async () => {
        try {
            await processJobLocal(jobId);
        }
        catch (err) {
            logger_1.logger.error(`Error processing job in-memory`, { jobId, error: err.message });
        }
    });
}
