import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from './prisma';
import { composePrompt, WORKFLOW_LABELS, enqueueImageJob } from './queue';
import { MASTER_PROMPTS, CHILD_PROMPTS } from './prompts';
import { logger } from './logger';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const uploadsDir = path.join(__dirname, '../uploads');

const WORKFLOWS = [
  { id: 'CATALOG_IMAGE', label: 'Catalog Image', requiresReference: false, bulk: true },
  { id: 'JEWELRY_ON_MODEL', label: 'Jewelry On Model', requiresReference: true, bulk: false },
  { id: 'GEMSTONE_COLOR_CHANGE', label: 'Gemstone Color Change', requiresReference: false, bulk: true },
  { id: 'CUSTOMER_TRY_ON', label: 'Customer Try-On', requiresReference: true, bulk: false },
  { id: 'BACKGROUND_REPLACEMENT', label: 'Background Replacement', requiresReference: false, bulk: false },
  { id: 'LUXURY_ENHANCEMENT', label: 'Luxury Enhancement', requiresReference: false, bulk: false },
  { id: 'CUSTOM_PROMPT', label: 'Custom Prompt', requiresReference: false, bulk: false },
  { id: 'BULK_GENERATION', label: 'Bulk Generation', requiresReference: false, bulk: true },
  { id: 'RATE_TOOLS', label: 'Rate Tools', requiresReference: false, bulk: false },
];

const JEWELRY_TYPES = [
  'Ring',
  'Necklace',
  'Bangles',
  'Bracelet',
  'Earrings (Studs)',
  'Earrings (Drops)',
  'Earrings (Hoops)',
  'Pendant',
  'Watch',
  'Brooch',
  'Anklet',
  'Cufflinks',
  'Multiple Items',
];

/**
 * Model alias → real Gemini API model ID mapping.
 * The user only sees Model 1 / Model 2 / Model 3 in the UI.
 * The actual API model identifiers are never exposed to the frontend.
 */
const MODEL_ALIAS_MAP: Record<string, string> = {
  model_2: 'gemini-3-pro-image-preview',                 // Nano Banana Pro
  model_3: 'gemini-3.1-flash-image-preview',             // Nano Banana 2
};

/** Resolve a user-facing alias (model_2 / model_3) to a real model ID. */
function resolveModelAlias(alias?: string): string {
  if (!alias) return MODEL_ALIAS_MAP['model_2'];
  return MODEL_ALIAS_MAP[alias] ?? MODEL_ALIAS_MAP['model_2'];
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.request(req.method, req.originalUrl, res.statusCode, Date.now() - start, req.body && Object.keys(req.body).length ? { keys: Object.keys(req.body) } : undefined);
  });
  next();
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WEBP images are supported.'));
      return;
    }
    cb(null, true);
  },
});

async function seedDefaults() {
  // ── Seed PromptTemplate table with professional master prompts ──
  const workflowIds = [
    'CATALOG_IMAGE',
    'JEWELRY_ON_MODEL',
    'GEMSTONE_COLOR_CHANGE',
    'CUSTOMER_TRY_ON',
    'BACKGROUND_REPLACEMENT',
    'LUXURY_ENHANCEMENT',
    'CUSTOM_PROMPT',
    'BULK_GENERATION',
  ];

  const workflowNames: Record<string, string> = {
    CATALOG_IMAGE: 'Catalog Image Master',
    JEWELRY_ON_MODEL: 'Jewelry On Model Master',
    GEMSTONE_COLOR_CHANGE: 'Gemstone Color Change Master',
    CUSTOMER_TRY_ON: 'Customer Try-On Master',
    BACKGROUND_REPLACEMENT: 'Background Replacement Master',
    LUXURY_ENHANCEMENT: 'Luxury Enhancement Master',
    CUSTOM_PROMPT: 'Custom Prompt Master',
    BULK_GENERATION: 'Bulk Generation Master',
  };

  for (const wfId of workflowIds) {
    const lib = MASTER_PROMPTS[wfId];
    if (!lib) continue;
    await prisma.promptTemplate.upsert({
      where: { workflow: wfId },
      update: {
        name: workflowNames[wfId] || wfId,
        systemRole: lib.systemRole,
        cameraSettings: lib.cameraSettings,
        environment: lib.environment,
        lightingAndPhysics: lib.lightingAndPhysics,
        preservationLock: lib.preservationLock,
        negativePrompt: lib.negativePrompt,
      },
      create: {
        workflow: wfId,
        name: workflowNames[wfId] || wfId,
        systemRole: lib.systemRole,
        cameraSettings: lib.cameraSettings,
        environment: lib.environment,
        lightingAndPhysics: lib.lightingAndPhysics,
        preservationLock: lib.preservationLock,
        negativePrompt: lib.negativePrompt,
        isActive: true,
      },
    });
  }

  // ── Seed SubjectPrompt table with professional child prompts ──
  const subjectSeeds: { type: string; key: string }[] = [
    { type: 'Ring',              key: 'ring' },
    { type: 'Necklace',         key: 'necklace' },
    { type: 'Bangles',          key: 'bangles' },
    { type: 'Bracelet',         key: 'bracelet' },
    { type: 'Earrings (Studs)', key: 'earrings_studs' },
    { type: 'Earrings (Drops)', key: 'earrings_drops' },
    { type: 'Earrings (Hoops)', key: 'earrings_hoops' },
    { type: 'Pendant',          key: 'pendant' },
    { type: 'Watch',            key: 'watch' },
    { type: 'Brooch',           key: 'brooch' },
    { type: 'Anklet',           key: 'anklet' },
    { type: 'Cufflinks',        key: 'cufflinks' },
    { type: 'Multiple Items',   key: 'multiple_items' },
  ];

  for (const s of subjectSeeds) {
    const lib = CHILD_PROMPTS[s.key];
    if (!lib) continue;
    await prisma.subjectPrompt.upsert({
      where: { jewelryType: s.type },
      update: {
        coreDescription: lib.text,
      },
      create: {
        jewelryType: s.type,
        coreDescription: lib.text,
        isActive: true,
      },
    });
  }


  // ── Provider settings (only create if not present) ──
  await prisma.providerSetting.upsert({
    where: { provider: 'GEMINI' },
    update: {},
    create: {
      provider: 'GEMINI',
      modelName: process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview',
      encryptedApiKey: process.env.GEMINI_API_KEY || null,
      isActive: true,
    },
  });
}

function includeJobRelations() {
  return {
    project: true,
    asset: true,
    stylePreset: true,
    favorite: true,
  };
}

function resolveAssetPaths(body: any) {
  return {
    ...body,
    inputUrl: body.inputUrl ? String(body.inputUrl) : null,
    referenceUrl: body.referenceUrl ? String(body.referenceUrl) : null,
    modelUrl: body.modelUrl ? String(body.modelUrl) : null,
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jewelry-production-api', worker: false });
});

app.get('/api/diagnose', async (_req, res) => {
  const diagnosticResults: any = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    port: process.env.PORT || 4000,
    uploads: { status: 'unknown', path: uploadsDir },
    database: { status: 'unknown', path: path.join(__dirname, '../prisma/dev.db') },
    gemini: { status: 'unknown', hasKey: false, model: process.env.GEMINI_MODEL || 'not set' },
  };

  // 1. Diagnose Uploads Directory
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const testFile = path.join(uploadsDir, '.diagnose-test');
    fs.writeFileSync(testFile, 'test');
    const content = fs.readFileSync(testFile, 'utf8');
    fs.unlinkSync(testFile);
    if (content === 'test') {
      diagnosticResults.uploads.status = 'healthy';
    } else {
      diagnosticResults.uploads.status = 'unhealthy';
      diagnosticResults.uploads.error = 'Read content mismatch';
    }
  } catch (err: any) {
    diagnosticResults.uploads.status = 'unhealthy';
    diagnosticResults.uploads.error = err.message;
  }

  // 2. Diagnose Database
  try {
    // Run a query to verify prisma is connected and tables exist
    await prisma.$queryRaw`SELECT 1`;
    diagnosticResults.database.connection = 'healthy';
    
    // Check if tables are seeded/exist
    const assetCount = await prisma.asset.count().catch((err: any) => {
      throw new Error(`Asset table error: ${err.message}`);
    });
    const jobCount = await prisma.job.count().catch((err: any) => {
      throw new Error(`Job table error: ${err.message}`);
    });
    
    diagnosticResults.database.status = 'healthy';
    diagnosticResults.database.details = { assetCount, jobCount };
  } catch (err: any) {
    diagnosticResults.database.status = 'unhealthy';
    diagnosticResults.database.error = err.message;
    
    // Check if the sqlite file is physically missing or has bad permissions
    const dbPath = path.join(__dirname, '../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      diagnosticResults.database.fileDiagnostics = 'SQLite file dev.db is missing in backend/prisma/ folder. You must run `npx prisma db push` to initialize the database tables.';
    } else {
      try {
        fs.accessSync(dbPath, fs.constants.W_OK);
        diagnosticResults.database.fileDiagnostics = 'SQLite database file is present and writable. The error is likely due to missing database tables or schema mismatch. Run `npx prisma db push --accept-data-loss` in your Hostinger environment.';
      } catch (accessErr: any) {
        diagnosticResults.database.fileDiagnostics = `SQLite database file is present but NOT WRITABLE: ${accessErr.message}. Check folder and file permissions. Try changing the permissions of the "backend/prisma" folder and "dev.db" file to 775 or 777 in Hostinger hPanel File Manager.`;
      }
    }
  }

  // 3. Diagnose Gemini Configuration
  try {
    const key = process.env.GEMINI_API_KEY || '';
    diagnosticResults.gemini.hasKey = !!key;
    if (key) {
      diagnosticResults.gemini.keyPrefix = key.slice(0, 4) + '...' + key.slice(-4);
      diagnosticResults.gemini.status = 'configured';
    } else {
      diagnosticResults.gemini.status = 'missing';
      diagnosticResults.gemini.warning = 'No GEMINI_API_KEY set in .env. Go to Admin Settings inside the app or set it in your Hostinger Environment Variables.';
    }
  } catch (err: any) {
    diagnosticResults.gemini.status = 'error';
    diagnosticResults.gemini.error = err.message;
  }

  // Decide HTTP status based on health
  const isHealthy = diagnosticResults.uploads.status === 'healthy' && diagnosticResults.database.status === 'healthy';
  res.status(isHealthy ? 200 : 500).json(diagnosticResults);
});

app.get('/api/config/options', (_req, res) => {
  res.json({
    jewelryTypes: JEWELRY_TYPES,
    workflows: WORKFLOWS,
    workflowLabels: WORKFLOW_LABELS,
    geminiModels: [
      { id: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro', description: 'State-of-the-art image generation and editing model.' },
      { id: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2', description: 'Pro-level visual intelligence with Flash-speed efficiency and reality-grounded generation capabilities.' },
      { id: 'gemini-2.5-flash-image', label: 'Nano Banana', description: 'Our state-of-the-art image generation and editing model.' },
      { id: 'imagen-4.0-generate-001', label: 'Imagen 4', description: 'Our latest image generation model, with significantly better text rendering and better overall image quality.' },
      { id: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4 Ultra', description: 'Our latest ultra image generation model with high quality rendering.' },
      { id: 'imagen-4.0-fast-generate-001', label: 'Imagen 4 Fast', description: 'Our latest fast image generation model with optimal speed.' },
      { id: 'custom', label: 'Custom Model ID...', description: 'Manually specify a custom Gemini/Imagen model identifier' },
    ],
  });
});

app.post('/api/assets/upload', upload.single('file'), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const asset = await prisma.asset.create({
    data: {
      originalUrl: `/uploads/${req.file.filename}`,
      type: 'ORIGINAL',
    },
  });
  res.json(asset);
});

app.post('/api/assets/bulk-upload', upload.array('files', 30), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }
  const assets = await Promise.all(
    files.map((file) =>
      prisma.asset.create({
        data: { originalUrl: `/uploads/${file.filename}`, type: 'ORIGINAL' },
      })
    )
  );
  res.json(assets);
});

app.post('/api/jobs', async (req, res) => {
  try {
    const body = resolveAssetPaths(req.body);
    const assetId = body.assetId;
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const {
      projectName,
      aspectRatio,
      personGeneration,
      numberOfImages,
      modelAlias,
      stylePresetId,
      metalType,
      gemstoneType,
      gemstoneCut,
      gemstoneTargetColor,
      backgroundStyle,
      lightingStyle,
      ...jobData
    } = body;

    const project = await prisma.project.create({
      data: {
        name: projectName || `${body.jewelryType || 'Jewelry'} ${body.workflow}`,
        workflow: body.workflow,
        jewelryType: body.jewelryType,
      },
    });

    const providerMetadataObj: Record<string, any> = {};
    if (aspectRatio) providerMetadataObj.aspectRatio = aspectRatio;
    if (personGeneration) providerMetadataObj.personGeneration = personGeneration;
    if (numberOfImages) providerMetadataObj.numberOfImages = numberOfImages;
    // Resolve model alias → real model name and store per-job
    providerMetadataObj.modelName = resolveModelAlias(modelAlias);
    const providerMetadata = JSON.stringify(providerMetadataObj);

    const job = await prisma.job.create({
      data: {
        ...jobData,
        assetId,
        projectId: project.id,
        inputUrl: asset.originalUrl,
        providerMetadata,
        status: 'PENDING',
      },
      include: includeJobRelations(),
    });

    await enqueueImageJob(job.id);
    res.json({ job });
  } catch (error) {
    logger.error('Job creation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.post('/api/jobs/bulk', async (req, res) => {
  try {
    const body = resolveAssetPaths(req.body);
    const assetIds = body.assetIds as string[];
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });

    const bulkJobWorkflow = body.workflow === 'BULK_GENERATION' ? 'CATALOG_IMAGE' : body.workflow;
    const batch = await prisma.batch.create({
      data: {
        name: body.batchName || `Batch ${new Date().toISOString()}`,
        workflow: body.workflow,
        jewelryType: body.jewelryType || 'Jewelry',
        totalJobs: assets.length,
        status: 'PROCESSING',
      },
    });

    const {
      projectName,
      aspectRatio,
      personGeneration,
      numberOfImages,
      modelAlias,
      stylePresetId,
      metalType,
      gemstoneType,
      gemstoneCut,
      gemstoneTargetColor,
      backgroundStyle,
      lightingStyle,
      ...jobData
    } = body;

    const project = await prisma.project.create({
      data: {
        name: projectName || `Bulk ${bulkJobWorkflow}`,
        workflow: bulkJobWorkflow,
        jewelryType: body.jewelryType,
      },
    });

    const providerMetadataObj: Record<string, any> = {};
    if (aspectRatio) providerMetadataObj.aspectRatio = aspectRatio;
    if (personGeneration) providerMetadataObj.personGeneration = personGeneration;
    if (numberOfImages) providerMetadataObj.numberOfImages = numberOfImages;
    // Resolve model alias → real model name and store per-job
    providerMetadataObj.modelName = resolveModelAlias(modelAlias);
    const providerMetadata = JSON.stringify(providerMetadataObj);

    const jobs = [];
    for (const asset of assets) {
      const job = await prisma.job.create({
        data: {
          ...jobData,
          workflow: bulkJobWorkflow,
          assetId: asset.id,
          projectId: project.id,
          batchId: batch.id,
          inputUrl: asset.originalUrl,
          providerMetadata,
          status: 'PENDING',
        },
        include: includeJobRelations(),
      });
      jobs.push(job);
      await enqueueImageJob(job.id);
    }

    res.json({ message: 'Bulk batch created', batch, project, jobs });
  } catch (error) {
    logger.error('Bulk job error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to create bulk jobs' });
  }
});

app.get('/api/jobs', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const jobs = await prisma.job.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: includeJobRelations(),
  });
  res.json(jobs);
});

app.get('/api/jobs/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: includeJobRelations(),
  });
  res.json(job);
});

app.post('/api/jobs/:id/regenerate', async (req, res) => {
  try {
    const source = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!source) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    let finalProviderMetadata = source.providerMetadata;
    if (req.body.aspectRatio || req.body.personGeneration || req.body.numberOfImages) {
      let sourceMeta: Record<string, any> = {};
      if (source.providerMetadata) {
        try {
          sourceMeta = JSON.parse(source.providerMetadata);
        } catch (e) {
          // ignore
        }
      }
      if (req.body.aspectRatio) sourceMeta.aspectRatio = req.body.aspectRatio;
      if (req.body.personGeneration) sourceMeta.personGeneration = req.body.personGeneration;
      if (req.body.numberOfImages) sourceMeta.numberOfImages = req.body.numberOfImages;
      finalProviderMetadata = JSON.stringify(sourceMeta);
    }

    const job = await prisma.job.create({
      data: {
        workflow: source.workflow,
        jewelryType: source.jewelryType,
        assetId: source.assetId,
        projectId: source.projectId,
        batchId: source.batchId,
        inputUrl: source.inputUrl,
        referenceUrl: source.referenceUrl,
        modelUrl: source.modelUrl,
        promptText: req.body.promptText != null ? String(req.body.promptText) : source.promptText,
        providerMetadata: finalProviderMetadata,
        status: 'PENDING',
      },
      include: includeJobRelations(),
    });
    await enqueueImageJob(job.id);
    res.json({ message: 'Regeneration started', job });
  } catch (error) {
    logger.error('Regeneration error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to regenerate job' });
  }
});

app.get('/api/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { jobs: { include: includeJobRelations(), orderBy: { createdAt: 'desc' } } },
  });
  res.json(projects);
});

app.get('/api/projects/:id', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { jobs: { include: includeJobRelations(), orderBy: { createdAt: 'desc' } } },
  });
  res.json(project);
});

app.get('/api/style-presets', async (req, res) => {
  const workflow = req.query.workflow as string;
  const presets = await prisma.stylePreset.findMany({
    where: {
      OR: [{ workflow: workflow }, { workflow: null }],
      isActive: true,
    },
  });
  res.json(presets);
});

app.post('/api/style-presets', async (req, res) => {
  const preset = await prisma.stylePreset.create({
    data: {
      name: String(req.body.name),
      workflow: req.body.workflow ? String(req.body.workflow) : null,
      description: req.body.description ? String(req.body.description) : null,
      promptAddon: String(req.body.promptAddon || ''),
    },
  });
  res.json(preset);
});

app.delete('/api/style-presets/:id', async (req, res) => {
  await prisma.stylePreset.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.get('/api/prompt-templates', async (_req, res) => {
  const prompts = await prisma.promptTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  res.json(prompts);
});

app.post('/api/prompt-templates', async (req, res) => {
  const prompt = await prisma.promptTemplate.upsert({
    where: { workflow: String(req.body.workflow) },
    update: {
      name: String(req.body.name),
      systemRole: req.body.systemRole ? String(req.body.systemRole) : undefined,
      cameraSettings: req.body.cameraSettings ? String(req.body.cameraSettings) : undefined,
      environment: req.body.environment ? String(req.body.environment) : undefined,
      lightingAndPhysics: req.body.lightingAndPhysics ? String(req.body.lightingAndPhysics) : undefined,
      preservationLock: req.body.preservationLock ? String(req.body.preservationLock) : undefined,
      negativePrompt: req.body.negativePrompt ? String(req.body.negativePrompt) : undefined,
      isActive: req.body.isActive ?? true,
    },
    create: {
      name: String(req.body.name),
      workflow: String(req.body.workflow),
      systemRole: req.body.systemRole ? String(req.body.systemRole) : null,
      cameraSettings: req.body.cameraSettings ? String(req.body.cameraSettings) : null,
      environment: req.body.environment ? String(req.body.environment) : null,
      lightingAndPhysics: req.body.lightingAndPhysics ? String(req.body.lightingAndPhysics) : null,
      preservationLock: req.body.preservationLock ? String(req.body.preservationLock) : null,
      negativePrompt: req.body.negativePrompt ? String(req.body.negativePrompt) : null,
      isActive: req.body.isActive ?? true,
    },
  });
  res.json(prompt);
});

app.get('/api/subject-prompts', async (_req, res) => {
  const prompts = await prisma.subjectPrompt.findMany({
    orderBy: { jewelryType: 'asc' },
  });
  res.json(prompts);
});

app.post('/api/subject-prompts', async (req, res) => {
  const prompt = await prisma.subjectPrompt.upsert({
    where: { jewelryType: String(req.body.jewelryType) },
    update: {
      coreDescription: req.body.coreDescription ? String(req.body.coreDescription) : undefined,
      anatomyInteraction: req.body.anatomyInteraction ? String(req.body.anatomyInteraction) : undefined,
      physicsAndGravity: req.body.physicsAndGravity ? String(req.body.physicsAndGravity) : undefined,
      placementRules: req.body.placementRules ? String(req.body.placementRules) : undefined,
      isActive: req.body.isActive ?? true,
    },
    create: {
      jewelryType: String(req.body.jewelryType),
      coreDescription: req.body.coreDescription ? String(req.body.coreDescription) : null,
      anatomyInteraction: req.body.anatomyInteraction ? String(req.body.anatomyInteraction) : null,
      physicsAndGravity: req.body.physicsAndGravity ? String(req.body.physicsAndGravity) : null,
      placementRules: req.body.placementRules ? String(req.body.placementRules) : null,
      isActive: req.body.isActive ?? true,
    },
  });
  res.json(prompt);
});

app.delete('/api/subject-prompts/:id', async (req, res) => {
  await prisma.subjectPrompt.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.post('/api/prompt-templates/test', async (req, res) => {
  const prompt = await composePrompt({
    ...req.body,
  });

  res.json({ prompt });
});

app.get('/api/provider-settings', async (_req, res) => {
  const settings = await prisma.providerSetting.findMany();
  res.json(
    settings.map((s: any) => ({
      provider: s.provider,
      modelName: s.modelName,
      hasApiKey: !!s.encryptedApiKey,
      isActive: s.isActive,
    }))
  );
});

app.post('/api/provider-settings/gemini', async (req, res) => {
  const { apiKey, modelName } = req.body;
  const settings = await prisma.providerSetting.upsert({
    where: { provider: 'GEMINI' },
    update: {
      modelName,
      encryptedApiKey: apiKey || undefined,
    },
    create: {
      provider: 'GEMINI',
      modelName,
      encryptedApiKey: apiKey,
      isActive: true,
    },
  });
  res.json({ success: true, modelName: settings.modelName });
});

app.post('/api/provider-settings/gemini/test', async (req, res) => {
  const { apiKey, modelName } = req.body;
  const provider = await prisma.providerSetting.findUnique({ where: { provider: 'GEMINI' } });
  const keyToTest = apiKey || provider?.encryptedApiKey || process.env.GEMINI_API_KEY;

  if (!keyToTest) {
    res.json({ success: false, message: 'No API key provided' });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-1.5-flash'}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keyToTest },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      }
    );
    const data = (await response.json()) as any;
    if (data.error) throw new Error(data.error.message);
    res.json({ success: true, message: 'API key is valid!' });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/admin/metrics', async (_req, res) => {
  const [totalJobs, completedJobs, failedJobs, totalAssets, totalBatches, favorites] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: 'COMPLETED' } }),
    prisma.job.count({ where: { status: 'FAILED' } }),
    prisma.asset.count(),
    prisma.batch.count(),
    prisma.favorite.count(),
  ]);

  const recentFailures = await prisma.job.findMany({
    where: { status: 'FAILED' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, workflow: true, errorMessage: true },
  });

  res.json({
    totalJobs,
    completedJobs,
    failedJobs,
    totalAssets,
    totalBatches,
    favorites,
    successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
    recentFailures,
  });
});

app.get('/api/rates/live', async (_req, res) => {
  try {
    const symbols = ['GC=F', 'SI=F', 'PL=F', 'USDPKR=X'];
    const quotes = await Promise.all(
      symbols.map((sym) =>
        yahooFinance.quote(sym).catch((err: any) => {
          logger.error(`Error fetching quote for ${sym}`, { error: err?.message });
          return null;
        })
      )
    );

    const [gold, silver, platinum, usdpkr] = quotes;
    const exchangeRate = usdpkr?.regularMarketPrice || 278.50;

    const OUNCE_TO_GRAM = 31.1034768;
    const TOLA_TO_GRAM = 11.6638;

    const formatMetalData = (quote: any, name: string) => {
      if (!quote) return null;
      const pricePerOunceUSD = quote.regularMarketPrice;
      const pricePerGramUSD = pricePerOunceUSD / OUNCE_TO_GRAM;
      const pricePerTolaUSD = pricePerGramUSD * TOLA_TO_GRAM;

      return {
        name,
        symbol: quote.symbol,
        currency: 'USD',
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        pricing: {
          usd: {
            perOunce: pricePerOunceUSD,
            perGram: pricePerGramUSD,
            perTola: pricePerTolaUSD,
          },
          pkr: {
            perOunce: pricePerOunceUSD * exchangeRate,
            perGram: pricePerGramUSD * exchangeRate,
            perTola: pricePerTolaUSD * exchangeRate,
          },
        },
      };
    };

    res.json({
      success: true,
      exchangeRate: {
        symbol: 'USDPKR=X',
        rate: exchangeRate,
        change: usdpkr?.regularMarketChange || 0,
        changePercent: usdpkr?.regularMarketChangePercent || 0,
      },
      metals: {
        gold: formatMetalData(gold, 'Gold'),
        silver: formatMetalData(silver, 'Silver'),
        platinum: formatMetalData(platinum, 'Platinum'),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Live rates fetch error', { error: error?.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch live rates' });
  }
});

app.get('/api/rates', async (_req, res) => {
  const rates = await prisma.rateEntry.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(rates);
});

app.post('/api/rates', async (req, res) => {
  const { rateType, metalType, diamondShape, diamondColor, diamondClarity, carat, value, currency, city, notes } = req.body;
  const rate = await prisma.rateEntry.create({
    data: {
      rateType: String(rateType || 'GOLD'),
      metalType: metalType ? String(metalType) : null,
      diamondShape: diamondShape ? String(diamondShape) : null,
      diamondColor: diamondColor ? String(diamondColor) : null,
      diamondClarity: diamondClarity ? String(diamondClarity) : null,
      carat: carat ? String(carat) : null,
      value: typeof value === 'number' ? value : Number(value) || 0,
      currency: String(currency || 'PKR'),
      city: city ? String(city) : null,
      notes: notes ? String(notes) : null,
    },
  });
  res.json(rate);
});

app.delete('/api/rates/:id', async (req, res) => {
  await prisma.rateEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.post('/api/favorites/:jobId', async (req, res) => {
  try {
    const favorite = await prisma.favorite.create({
      data: { jobId: req.params.jobId },
    });
    res.json(favorite);
  } catch (error) {
    logger.error('Favorite creation error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:jobId', async (req, res) => {
  try {
    await prisma.favorite.delete({
      where: { jobId: req.params.jobId },
    });
  } catch {
    // Ignore if not found
  }
  res.json({ success: true });
});

app.get('/api/logs/:type', (req, res) => {
  const type = req.params.type as 'app' | 'error' | 'request';
  if (!['app', 'error', 'request'].includes(type)) {
    res.status(400).json({ error: 'Invalid log type. Use: app, error, request' });
    return;
  }
  const lines = Math.min(Math.max(Number(req.query.lines) || 200, 10), 5000);
  const logs = logger.getLogs(type, lines);
  res.json({ type, lines: logs.length, logs });
});

app.get('/api/logs', (_req, res) => {
  res.json({
    types: [
      { id: 'app', label: 'Application Log', file: 'app.log' },
      { id: 'error', label: 'Error Log', file: 'error.log' },
      { id: 'request', label: 'Request Log', file: 'request.log' },
    ],
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/out');
  app.use(express.static(frontendBuildPath, { extensions: ['html'] }));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Global error handler for uncaught route errors
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err?.message });
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server immediately, and seed defaults in the background
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

seedDefaults().catch((error) => {
  logger.error('Failed to seed defaults', { error: (error as Error).message });
});
