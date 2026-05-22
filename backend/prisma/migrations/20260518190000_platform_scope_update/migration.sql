CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "credits" INTEGER NOT NULL DEFAULT 100,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "teamId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "whiteLabelOn" BOOLEAN NOT NULL DEFAULT false,
  "logoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "workflow" TEXT,
  "jewelryType" TEXT,
  "presetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Batch" (
  "id" TEXT NOT NULL,
  "workflow" TEXT NOT NULL,
  "jewelryType" TEXT NOT NULL,
  "presetId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalJobs" INTEGER NOT NULL DEFAULT 0,
  "completedJobs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "originalUrl" TEXT NOT NULL,
  "processedUrl" TEXT,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "projectId" TEXT,
  "batchId" TEXT,
  "assetId" TEXT,
  "promptTemplateId" TEXT,
  "stylePresetId" TEXT,
  "workflow" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "promptText" TEXT,
  "finalPrompt" TEXT,
  "jewelryType" TEXT,
  "metalType" TEXT,
  "gemstoneType" TEXT,
  "gemstoneCut" TEXT,
  "gemstoneTargetColor" TEXT,
  "settingType" TEXT,
  "backgroundStyle" TEXT,
  "lightingStyle" TEXT,
  "inputUrl" TEXT,
  "referenceUrl" TEXT,
  "modelUrl" TEXT,
  "outputUrl" TEXT,
  "errorMessage" TEXT,
  "provider" TEXT,
  "providerModel" TEXT,
  "providerMetadata" TEXT,
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShareLink" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StylePreset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "workflow" TEXT,
  "description" TEXT,
  "promptAddon" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StylePreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "workflow" TEXT NOT NULL,
  "jewelryType" TEXT,
  "stylePresetId" TEXT,
  "systemPrompt" TEXT NOT NULL,
  "userPromptTemplate" TEXT NOT NULL,
  "negativePrompt" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderSetting" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "encryptedApiKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateEntry" (
  "id" TEXT NOT NULL,
  "rateType" TEXT NOT NULL,
  "metalType" TEXT,
  "diamondShape" TEXT,
  "diamondColor" TEXT,
  "diamondClarity" TEXT,
  "carat" TEXT,
  "value" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "city" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Preset" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "prompt" TEXT NOT NULL,
  "imageUrl" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
  "id" TEXT NOT NULL DEFAULT 'GLOBAL',
  "geminiApiKey" TEXT,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE UNIQUE INDEX "Favorite_jobId_key" ON "Favorite"("jobId");
CREATE UNIQUE INDEX "ProviderSetting_provider_key" ON "ProviderSetting"("provider");

ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "StylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "StylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "PromptTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "StylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "StylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
