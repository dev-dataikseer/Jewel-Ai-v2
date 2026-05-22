"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Activity, 
  AlertCircle, 
  BarChart3, 
  Database, 
  Gem, 
  KeyRound, 
  Layers3, 
  Save, 
  SlidersHorizontal, 
  Sparkles, 
  TestTube2, 
  History, 
  Copy, 
  Check, 
  Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Metrics = {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalAssets: number;
  totalBatches: number;
  favorites: number;
  successRate: number;
  recentFailures: Array<{ id: string; workflow: string; errorMessage?: string | null }>;
};

type Provider = {
  provider: string;
  modelName: string;
  hasApiKey: boolean;
};

type PromptTemplate = {
  id: string;
  name: string;
  workflow: string;
  systemRole?: string | null;
  cameraSettings?: string | null;
  environment?: string | null;
  lightingAndPhysics?: string | null;
  preservationLock?: string | null;
  negativePrompt?: string | null;
  isActive: boolean;
};

type SubjectPrompt = {
  id: string;
  jewelryType: string;
  coreDescription?: string | null;
  isActive: boolean;
};

type StylePreset = {
  id: string;
  name: string;
  workflow?: string | null;
  description?: string | null;
  promptAddon: string;
  isActive: boolean;
};

type RateEntry = {
  id: string;
  rateType: string;
  metalType?: string | null;
  diamondShape?: string | null;
  value: number;
  currency: string;
  city?: string | null;
};

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "api", label: "API Settings", icon: KeyRound },
  { id: "prompts", label: "Prompts & Subjects", icon: SlidersHorizontal },
  { id: "test", label: "Prompt Test", icon: TestTube2 },
  { id: "rates", label: "Spot Rates", icon: Database },
  { id: "quality", label: "Quality Control", icon: AlertCircle },
];

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("overview");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [subjects, setSubjects] = useState<SubjectPrompt[]>([]);
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [geminiKey, setGeminiKey] = useState("");
  // Model alias — user sees Model 1/2/3, never the real API ID
  const [geminiModelAlias, setGeminiModelAlias] = useState<string>("model_2");
  const [copied, setCopied] = useState(false);
  const [selectedJewelryTypes, setSelectedJewelryTypes] = useState<string[]>(["Ring"]);

  const [options, setOptions] = useState<{
    jewelryTypes: string[];
    workflows: { id: string; label: string }[];
    geminiModels?: { id: string; label: string; description?: string }[];
    metalTypes?: string[];
    gemstoneTypes?: string[];
    gemstoneColors?: string[];
    gemstoneCuts?: string[];
    backgroundStyles?: string[];
    lightingStyles?: string[];
  }>({
    jewelryTypes: ["Ring", "Necklace", "Bangles", "Bracelet", "Earrings (Studs)", "Earrings (Drops)", "Earrings (Hoops)", "Pendant", "Watch", "Brooch", "Anklet", "Cufflinks", "Multiple Items"],
    workflows: [
      { id: "CATALOG_IMAGE", label: "Catalog Image" },
      { id: "JEWELRY_ON_MODEL", label: "Jewelry On Model" },
      { id: "GEMSTONE_COLOR_CHANGE", label: "Gemstone Color Change" },
      { id: "CUSTOMER_TRY_ON", label: "Customer Try-On" },
      { id: "BACKGROUND_REPLACEMENT", label: "Background Replacement" },
      { id: "LUXURY_ENHANCEMENT", label: "Luxury Enhancement" },
      { id: "CUSTOM_PROMPT", label: "Custom Prompt" },
      { id: "BULK_GENERATION", label: "Bulk Generation" },
      { id: "RATE_TOOLS", label: "Rate Tools" },
    ],
    geminiModels: [
      { id: 'model_2', label: 'Model 2', description: 'State-of-the-art image generation and editing — best quality.' },
      { id: 'model_3', label: 'Model 3', description: 'Pro-level visual intelligence with Flash-speed efficiency.' },
    ],
    metalTypes: ['18k Yellow Gold', '14k Rose Gold', 'Platinum', 'Sterling Silver', 'Brushed Gold', 'Polished White Gold', '24k Gold'],
    gemstoneTypes: ['Diamond', 'Emerald', 'Sapphire', 'Ruby', 'Moissanite', 'Lab-Grown Diamond', 'None', 'Cubic Zirconia'],
    gemstoneColors: ['White', 'Champagne', 'Yellow', 'Pink', 'Ruby Red', 'Emerald Green', 'Royal Blue', 'Black', 'Teal', 'Lavender'],
    gemstoneCuts: ['Round Brilliant', 'Emerald Cut', 'Oval', 'Pear', 'Cushion', 'Princess', 'Marquise', 'N/A', 'Radiant', 'Heart'],
    backgroundStyles: ['White Seamless', 'Black Reflective', 'Marble', 'Velvet', 'Lifestyle', 'Transparent Look', 'Silk', 'Wooden Counter'],
    lightingStyles: ['Softbox Luxury', 'Studio Product', 'Diffused Macro', 'Cinematic Luxury', 'High-Key Ecommerce', 'Natural Window', 'Moody Shadow'],
  });

  const [promptDraft, setPromptDraft] = useState({
    name: "Master Catalog",
    workflow: "CATALOG_IMAGE",
    systemRole: "Act as a master commercial product photographer and high-end jewelry retoucher.",
    cameraSettings: "High-end macro product photography, shot on a 100mm macro lens, f/11 aperture for edge-to-edge sharpness, crisp focus stacking, high-resolution editorial print quality.",
    environment: "Placed gracefully on a premium, soft cream-colored velvet surface. The surrounding environment is a clean, minimalist, and highly professional luxury studio setting with warm, light neutral tones to beautifully complement and make the jewelry pop.",
    lightingAndPhysics: "Soft, diffused Profoto studio lighting with a large overhead softbox. Authentic ambient occlusion. A highly accurate, dark contact shadow anchors the bottom of the jewelry's band directly into the velvet texture. The metal reflects the softbox light naturally without overexposing.",
    preservationLock: "CRITICAL MANDATE: You must strictly preserve the exact original pixels, geometry, facet cuts, true colors, and scale of the masked jewelry piece. Do not warp the metal band, do not melt or shift the prongs, and do not alter the internal refractions of the gemstones.",
    negativePrompt: "3d render, CGI, digital illustration, plastic texture, artificial AI glow, over-smoothed metal, warped band, distorted facets, melted prongs, floating object, missing contact shadow, unnatural lighting, neon colors, cartoon, painterly effect.",
  });

  const [subjectDraft, setSubjectDraft] = useState({
    jewelryType: "Ring",
    coreDescription: "",
  });

  const [rateDraft, setRateDraft] = useState({
    rateType: "GOLD",
    metalType: "24k Gold",
    diamondShape: "",
    diamondColor: "",
    diamondClarity: "",
    carat: "",
    value: "",
    currency: "PKR",
    city: "",
    notes: "",
  });

  const [testDraft, setTestDraft] = useState({
    workflow: "CATALOG_IMAGE",
    jewelryType: "Ring",
    promptText: "",
    aspectRatio: "1:1",
    personGeneration: "ALLOW_ADULT",
    numberOfImages: 1,
  });

  const [testedPrompt, setTestedPrompt] = useState("");

  const refresh = async () => {
    const endpoints = [
      { key: 'metrics', url: "/admin/metrics" },
      { key: 'providers', url: "/provider-settings" },
      { key: 'prompts', url: "/prompt-templates" },
      { key: 'subjects', url: "/subject-prompts" },
      { key: 'rates', url: "/rates" },
      { key: 'options', url: "/config/options" },
    ];

    try {
      const results = await Promise.allSettled(endpoints.map(e => api.get(e.url)));
      
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          console.error(`Failed to load ${endpoints[i].key}:`, res.reason);
        }
      });

      const getRes = (key: string) => {
        const index = endpoints.findIndex(e => e.key === key);
        const res = results[index];
        return res.status === 'fulfilled' ? res.value : { data: [] };
      };

      const fetchedMetrics = getRes('metrics').data;
      setMetrics(fetchedMetrics);
      setProviders(getRes('providers').data);
      
      const promptsData = getRes('prompts').data;
      setPrompts(promptsData);
      
      setSubjects(getRes('subjects').data);
      setRates(getRes('rates').data);
      
      const optRes = getRes('options');
      if (optRes.data && optRes.data.jewelryTypes) {
        setOptions(optRes.data);
      }

      // Auto-load prompt values corresponding to the selected workflow if available
      const activeWorkflow = promptDraft.workflow || "CATALOG_IMAGE";
      const existingPrompt = promptsData.find((p: PromptTemplate) => p.workflow === activeWorkflow);
      if (existingPrompt) {
        setPromptDraft({
          name: existingPrompt.name || "Master Catalog",
          workflow: existingPrompt.workflow,
          systemRole: existingPrompt.systemRole || "",
          cameraSettings: existingPrompt.cameraSettings || "",
          environment: existingPrompt.environment || "",
          lightingAndPhysics: existingPrompt.lightingAndPhysics || "",
          preservationLock: existingPrompt.preservationLock || "",
          negativePrompt: existingPrompt.negativePrompt || "",
        });
      }

      const gemini = getRes('providers').data.find((provider: Provider) => provider.provider === "GEMINI");
      if (gemini?.modelName) {
        // Map real model ID back to a user-facing alias
        const reverseMap: Record<string, string> = {
          'gemini-3-pro-image-preview': 'model_2',
          'gemini-3.1-flash-image-preview': 'model_3',
        };
        setGeminiModelAlias(reverseMap[gemini.modelName] ?? 'model_2');
      }
    } catch (err) {
      console.error("Critical Admin load error:", err);
      toast.error("Could not load full admin data. Using partial cache.");
    }
  };

  useEffect(() => {
    setMounted(true);
    const timer = window.setTimeout(() => {
      refresh().catch(() => toast.error("Could not load admin data"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Update editor values dynamically when switching workflow dropdown
  const handleWorkflowChangeInEditor = (workflowId: string) => {
    const existing = prompts.find(p => p.workflow === workflowId);
    if (existing) {
      setPromptDraft({
        name: existing.name || `${options.workflows.find(w => w.id === workflowId)?.label || workflowId} Master`,
        workflow: workflowId,
        systemRole: existing.systemRole || "",
        cameraSettings: existing.cameraSettings || "",
        environment: existing.environment || "",
        lightingAndPhysics: existing.lightingAndPhysics || "",
        preservationLock: existing.preservationLock || "",
        negativePrompt: existing.negativePrompt || "",
      });
    } else {
      setPromptDraft({
        name: `${options.workflows.find(w => w.id === workflowId)?.label || workflowId} Master`,
        workflow: workflowId,
        systemRole: "",
        cameraSettings: "",
        environment: "",
        lightingAndPhysics: "",
        preservationLock: "",
        negativePrompt: "",
      });
    }
  };

  /** Resolve a model alias to a real API model ID (must match backend MODEL_ALIAS_MAP) */
  const resolveModelAlias = (alias: string): string => {
    const map: Record<string, string> = {
      model_2: 'gemini-3-pro-image-preview',
      model_3: 'gemini-3.1-flash-image-preview',
    };
    return map[alias] ?? map['model_2'];
  };

  const saveGemini = async () => {
    try {
      const modelToSave = resolveModelAlias(geminiModelAlias);
      await api.post("/provider-settings/gemini", { apiKey: geminiKey || undefined, modelName: modelToSave });
      setGeminiKey("");
      await refresh();
      toast.success("Gemini settings saved successfully");
    } catch { toast.error("Failed to save Gemini settings"); }
  };

  const testGemini = async () => {
    try {
      const modelToSave = resolveModelAlias(geminiModelAlias);
      const res = await api.post("/provider-settings/gemini/test", { apiKey: geminiKey || undefined, modelName: modelToSave });
      if (res.data.success) {
        toast.success(res.data.message || "API connection successful!");
      } else {
        toast.error(res.data.message || "Failed to connect to API");
      }
    } catch { toast.error("Failed to test API key"); }
  };

  const createPrompt = async () => {
    try {
      await api.post("/prompt-templates", promptDraft);
      await refresh();
      toast.success("Master prompt template saved");
    } catch { toast.error("Failed to save master prompt template"); }
  };

  const togglePrompt = async (id: string, current: boolean) => {
    try {
      const target = prompts.find(p => p.id === id);
      if (!target) return;
      await api.post("/prompt-templates", { ...target, isActive: !current });
      await refresh();
      toast.success(`Prompt template ${!current ? 'activated' : 'disabled'}`);
    } catch { toast.error("Failed to toggle prompt"); }
  };

  const createSubject = async () => {
    try {
      if (!subjectDraft.coreDescription) {
        toast.error("Prompt text is required");
        return;
      }
      await api.post("/subject-prompts", subjectDraft);
      setSubjectDraft({ ...subjectDraft, coreDescription: "" });
      await refresh();
      toast.success("Subject prompt configuration saved");
    } catch { toast.error("Failed to save subject prompt"); }
  };

  const deleteSubject = async (id: string) => {
    try {
      await api.delete(`/subject-prompts/${id}`);
      await refresh();
      toast.success("Subject prompt configuration deleted");
    } catch { toast.error("Failed to delete subject prompt"); }
  };



  const createRate = async () => {
    try {
      const raw = String(rateDraft.value ?? "").replace(/,/g, "");
      const numValue = parseFloat(raw);
      if (isNaN(numValue) || numValue <= 0) {
        toast.error("Please enter a valid positive number for the rate value");
        return;
      }
      await api.post("/rates", { ...rateDraft, value: numValue });
      setRateDraft((draft) => ({ ...draft, value: "" }));
      await refresh();
      toast.success("Manual spot rate entry saved");
    } catch { toast.error("Failed to save spot rate"); }
  };

  const deleteRate = async (id: string) => {
    try {
      await api.delete(`/rates/${id}`);
      await refresh();
      toast.success("Spot rate entry deleted");
    } catch { toast.error("Failed to delete spot rate"); }
  };

  const toggleJewelryTypeSelection = (type: string) => {
    let next: string[];
    if (selectedJewelryTypes.includes(type)) {
      next = selectedJewelryTypes.filter(t => t !== type);
      if (next.length === 0) next = ["Ring"];
    } else {
      next = [...selectedJewelryTypes, type];
    }
    setSelectedJewelryTypes(next);
    setTestDraft(prev => ({
      ...prev,
      jewelryType: next.join(", ")
    }));
  };

  const testPrompt = async () => {
    try {
      const payload = {
        workflow: testDraft.workflow,
        jewelryType: testDraft.jewelryType,
        promptText: testDraft.promptText || null,
        aspectRatio: testDraft.aspectRatio,
        personGeneration: testDraft.personGeneration,
        numberOfImages: Number(testDraft.numberOfImages) || 1,
      };

      const res = await api.post("/prompt-templates/test", payload);
      setTestedPrompt(res.data.prompt);
      toast.success("Prompt synthesized and composed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compose test prompt");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(testedPrompt);
    setCopied(true);
    toast.success("Composed JSON prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <Gem className="size-8 animate-pulse text-blue-600" suppressHydrationWarning />
          <p className="text-sm text-slate-500 font-medium animate-pulse" suppressHydrationWarning>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col font-sans">
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-full w-full items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/10">
              <Gem className="size-4.5" />
            </div>
            <div>
              <h1 className="text-[18px] font-mono font-bold text-slate-900 leading-none tracking-[-0.02em]">Jewel AI Studio</h1>
              <p className="text-[10px] font-sans font-bold uppercase tracking-[0.07em] text-slate-450 mt-1">Admin Dashboard</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-655 hover:bg-slate-50 flex items-center">
                <Sparkles className="mr-1.5 size-4 text-blue-600" />Studio
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-655 hover:bg-slate-50 flex items-center">
                <History className="mr-1.5 size-4 text-indigo-650" />History
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* CORE WORKSPACE SECTION */}
      <main className="mx-auto max-w-full w-full px-6 lg:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
          
          {/* COLUMN 1: LEFT SETTINGS TABS SIDEBAR */}
          <aside className="space-y-4 lg:sticky lg:top-22 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pr-1 pb-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="px-1.5 py-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Settings Tabs</span>
              </div>
              <div className="space-y-1">
                {TABS.map((item) => {
                  const Icon = item.icon;
                  const isActive = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-sans tracking-normal transition-all duration-155 ${
                        isActive 
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10 font-semibold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="text-[10px] text-center text-slate-400 font-medium tracking-wider px-2 pt-4 border-t border-slate-200/60 mt-8">
              Production Suite v2.0
            </div>
          </aside>

          {/* COLUMN 2: TAB CONTENT */}
          <section className="space-y-6 lg:min-w-0">
            {tab === "overview" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                  {[
                    ["Total Jobs", metrics?.totalJobs ?? 0, "border-blue-100 bg-blue-50/20 text-blue-700"],
                    ["Completed", metrics?.completedJobs ?? 0, "border-emerald-100 bg-emerald-50/20 text-emerald-700"],
                    ["Failed", metrics?.failedJobs ?? 0, "border-rose-100 bg-rose-50/20 text-rose-700"],
                    ["Assets Used", metrics?.totalAssets ?? 0, "border-violet-100 bg-violet-50/20 text-violet-700"],
                    ["Batches Run", metrics?.totalBatches ?? 0, "border-amber-100 bg-amber-50/20 text-amber-700"],
                    ["Favorites", metrics?.favorites ?? 0, "border-pink-100 bg-pink-50/20 text-pink-700"],
                  ].map(([name, value, style]) => (
                    <Card key={name as string} className="rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-150 hover:shadow-md hover:scale-[1.01]">
                      <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/30">
                        <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-slate-450">{name as string}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[80px]">
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{value as number}</p>
                        <span className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full border font-semibold ${style as string}`}>Live Data</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                    <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Success Rate Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-600">Production Engine Health</p>
                      <p className="text-lg font-bold text-slate-850">{(metrics?.successRate ?? 0).toFixed(1)}%</p>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-650 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${metrics?.successRate ?? 0}%` }} 
                      />
                    </div>
                    <p className="mt-3.5 text-xs text-slate-450 font-medium">
                      {(metrics?.successRate ?? 0) > 85 ? "✓ System status is optimal. Under 15% rate of generation failures." : "⚠ Increased failure rates detected. Review API Settings and Quality Control logs."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "api" && (
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                  <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">AI Studio — Core Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Default AI Model</label>
                      <select
                        value={geminiModelAlias}
                        onChange={(event) => setGeminiModelAlias(event.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm"
                      >
                        {options?.geminiModels?.map((model) => (
                          <option key={model.id} value={model.id}>{model.label}</option>
                        ))}
                      </select>

                      {/* Model description */}
                      <div className="mt-3.5 bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-2">
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {options?.geminiModels?.find(m => m.id === geminiModelAlias)?.description}
                        </p>
                        {/* Priority notice */}
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                          <span className="mt-0.5 shrink-0 size-3.5 rounded-full bg-amber-400/20 border border-amber-300 flex items-center justify-center">
                            <span className="text-[8px] font-black text-amber-600">!</span>
                          </span>
                          <p className="text-[10px] font-mono text-amber-700 leading-relaxed">
                            <strong>Parameter panel overrides this.</strong> If you select a model in the studio generation parameters, that selection takes priority over this default for each individual job.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Gemini/Imagen API Key Credentials</label>
                      <Input
                        value={geminiKey}
                        onChange={(event) => setGeminiKey(event.target.value)}
                        type="password"
                        placeholder={providers.find((p) => p.provider === "GEMINI")?.hasApiKey ? "•••••••••••••••••••• (Saved)" : "Enter your x-goog-api-key here..."}
                        className="h-11 text-xs font-semibold text-slate-700"
                      />
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2.5">
                        Your key is saved in secure credentials space within the local SQLite server, and is decrypted for remote API validation.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <Button onClick={saveGemini} className="h-11 bg-gradient-to-r from-blue-600 to-indigo-650 text-white hover:from-blue-700 hover:to-indigo-755 px-6 text-xs font-bold shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01]">
                      <Save className="mr-2 size-4" />Save API Configuration
                    </Button>
                    <Button onClick={testGemini} variant="outline" className="h-11 text-xs font-bold shadow-sm hover:bg-slate-50 border-slate-200">
                      <Activity className="mr-2 size-4 text-blue-600" />Verify Connection Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {tab === "prompts" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[450px_1fr] items-start">
                  
                  {/* WORKFLOW MASTER PROMPT EDITOR */}
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                      <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Master Production Templates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Template Name</label>
                        <Input 
                          placeholder="e.g. Luxury Catalog Composite" 
                          value={promptDraft.name} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, name: event.target.value })} 
                          className="h-10 text-xs font-semibold text-slate-750" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Target Workflow</label>
                        <select 
                          value={promptDraft.workflow} 
                          onChange={(event) => {
                            const val = event.target.value;
                            handleWorkflowChangeInEditor(val);
                          }} 
                          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-750 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {options?.workflows.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">System Role component</label>
                        <textarea 
                          value={promptDraft.systemRole || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, systemRole: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Camera Settings component</label>
                        <textarea 
                          value={promptDraft.cameraSettings || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, cameraSettings: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Environment component</label>
                        <textarea 
                          value={promptDraft.environment || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, environment: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Lighting & Physics component</label>
                        <textarea 
                          value={promptDraft.lightingAndPhysics || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, lightingAndPhysics: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Preservation Mandate component</label>
                        <textarea 
                          value={promptDraft.preservationLock || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, preservationLock: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Negative Prompt component</label>
                        <textarea 
                          value={promptDraft.negativePrompt || ""} 
                          onChange={(event) => setPromptDraft({ ...promptDraft, negativePrompt: event.target.value })} 
                          className="h-24 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                        />
                      </div>
                      <Button onClick={createPrompt} className="h-11 w-full bg-gradient-to-r from-blue-600 to-indigo-650 text-white hover:from-blue-700 hover:to-indigo-755 text-xs font-bold shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01]">
                        <Save className="mr-2 size-4" />Update Master Prompt Template
                      </Button>
                    </CardContent>
                  </Card>

                  {/* MASTER PROMPTS LIBRARY LIST */}
                  <div className="space-y-6">
                    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                      <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                        <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Master Templates Library</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6 max-h-[960px] overflow-y-auto">
                        {prompts.map((prompt) => (
                          <div key={prompt.id} className="group relative rounded-xl border border-slate-200 p-4 transition-all duration-150 bg-slate-50/40 hover:border-blue-300 hover:bg-white">
                            <div className="flex items-center justify-between">
                              <p className="font-extrabold text-xs text-slate-850">{prompt.name}</p>
                              <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-mono font-bold text-blue-700 uppercase tracking-wider">{prompt.workflow}</span>
                            </div>
                            <div className="mt-3.5 space-y-2 border-l-2 border-slate-200 pl-3 py-1">
                              <p className="text-[11px] leading-relaxed text-slate-500 font-medium line-clamp-2">
                                <strong className="font-bold text-[10px] font-mono uppercase tracking-wider text-slate-600">Role:</strong> {prompt.systemRole || "Default Retoucher"}
                              </p>
                              <p className="text-[11px] leading-relaxed text-slate-500 font-medium line-clamp-2">
                                <strong className="font-bold text-[10px] font-mono uppercase tracking-wider text-slate-600">Camera:</strong> {prompt.cameraSettings}
                              </p>
                            </div>
                            <div className="mt-4 flex gap-2 border-t border-slate-150/40 pt-3">
                              <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold" onClick={() => setPromptDraft({ ...prompt } as any)}>Load to Editor</Button>
                              <Button variant="outline" size="sm" className={`h-8 text-[11px] font-bold ${prompt.isActive ? "text-emerald-650 bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200" : "text-slate-500"}`} onClick={() => togglePrompt(prompt.id, prompt.isActive)}>
                                {prompt.isActive ? "Enabled" : "Disabled"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* SUBJECT PROMPTS AREA */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[450px_1fr] items-start border-t border-slate-200/60 pt-6">
                  
                  {/* SAVE SUBJECT PROMPT CONFIG */}
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                      <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Jewelry Subject Prompts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Target Jewelry Type</label>
                        <select 
                          value={subjectDraft.jewelryType} 
                          onChange={(event) => setSubjectDraft({ ...subjectDraft, jewelryType: event.target.value })} 
                          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {options?.jewelryTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Prompt Text</label>
                        <textarea
                          placeholder="e.g. A luxury ring positioned elegantly in a professional studio alignment that beautifully showcases the center stone..."
                          value={subjectDraft.coreDescription || ""}
                          onChange={(event) => setSubjectDraft({ ...subjectDraft, coreDescription: event.target.value })}
                          className="h-40 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                      <Button onClick={createSubject} className="h-11 w-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-sm transition-all hover:scale-[1.01]">
                        Save Subject Prompt
                      </Button>
                    </CardContent>
                  </Card>

                  {/* SUBJECT PROMPTS LIBRARY */}
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                      <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Subject Prompts Library</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[700px] overflow-y-auto pr-1">
                        {subjects.map((s) => (
                          <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-white hover:shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 mb-3">
                                <p className="text-xs font-extrabold text-slate-800">{s.jewelryType}</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" 
                                  onClick={() => deleteSubject(s.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                              <p className="text-[11px] leading-relaxed text-slate-500 font-medium italic">
                                {s.coreDescription}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-4 h-7 w-full text-[11px] font-bold hover:bg-blue-50 text-blue-600 border border-dashed border-blue-200 hover:border-solid hover:border-blue-300"
                              onClick={() => setSubjectDraft({
                                jewelryType: s.jewelryType,
                                coreDescription: s.coreDescription || "",
                              })}
                            >
                              Edit Subject
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}



            {tab === "test" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_500px] gap-6 items-start animate-fadeIn">
                
                {/* LEFT COLUMN: TEST FORM CONFIG */}
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                    <CardTitle className="text-sm font-semibold text-slate-800 font-mono uppercase tracking-[0.05em]">Simulate Modular JSON Prompt Generation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    
                    {/* WORKFLOW INTENT ROW */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Workflow Intent</label>
                        <select 
                          value={testDraft.workflow} 
                          onChange={(event) => setTestDraft({ ...testDraft, workflow: event.target.value })} 
                          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {options?.workflows.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* INTERACTIVE SUBJECT MULTIPLE TYPE SELECTION */}
                    <div>
                      <label className="mb-2 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">
                        Selected Jewelry Types (badge-toggle for multiple)
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {options?.jewelryTypes.map((type) => {
                          const isSelected = selectedJewelryTypes.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleJewelryTypeSelection(type)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-normal transition-all duration-150 ${
                                isSelected 
                                  ? "bg-blue-600 border-blue-650 text-white shadow-sm scale-[1.02]" 
                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-2 font-mono">
                        COMPILED VALUE: &quot;{testDraft.jewelryType}&quot;
                      </p>
                    </div>

                    {/* GEMINI NATIVE API PARAMETERS SECTION */}
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                      <h3 className="text-xs font-bold font-mono uppercase tracking-[0.05em] text-slate-700">Gemini/Imagen API Native Parameters</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-slate-400">Aspect Ratio</label>
                          <select 
                            value={testDraft.aspectRatio} 
                            onChange={(e) => setTestDraft({ ...testDraft, aspectRatio: e.target.value })} 
                            className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 bg-white"
                          >
                            <option value="1:1">1:1 (Square)</option>
                            <option value="3:4">3:4 (Portrait)</option>
                            <option value="4:3">4:3 (Landscape)</option>
                            <option value="9:16">9:16 (Story)</option>
                            <option value="16:9">16:9 (Widescreen)</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-slate-400">Person Generation</label>
                          <select 
                            value={testDraft.personGeneration} 
                            onChange={(e) => setTestDraft({ ...testDraft, personGeneration: e.target.value })} 
                            className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 bg-white"
                          >
                            <option value="DONT_ALLOW">DONT_ALLOW</option>
                            <option value="ALLOW_ADULT">ALLOW_ADULT</option>
                            <option value="ALLOW_ALL">ALLOW_ALL</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-slate-400">Number of Images</label>
                          <select 
                            value={testDraft.numberOfImages} 
                            onChange={(e) => setTestDraft({ ...testDraft, numberOfImages: Number(e.target.value) || 1 })} 
                            className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 bg-white"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SIMULATE MINIMUM USER PROMPT INSTRUCTION */}
                    <div className="border-t border-slate-100 pt-4">
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Simulate User Minimum Prompt Input</label>
                      <textarea 
                        value={testDraft.promptText} 
                        onChange={(event) => setTestDraft({ ...testDraft, promptText: event.target.value })} 
                        placeholder="e.g. ruby ring on gold velvet with high sparkles..." 
                        className="h-28 w-full rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
                      />
                    </div>
                    
                    <Button onClick={testPrompt} className="h-11 w-full bg-gradient-to-r from-blue-600 to-indigo-650 text-white hover:from-blue-700 hover:to-indigo-755 text-xs font-bold shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01]">
                      Compose Test Prompt
                    </Button>
                  </CardContent>
                </Card>

                {/* RIGHT COLUMN: COMPOSED JSON OUTPUT PREVIEW */}
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden h-full">
                  <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Unified Modular JSON Output</CardTitle>
                    {testedPrompt && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={copyToClipboard}
                        className="h-8 text-xs font-bold flex items-center hover:bg-slate-100 text-blue-650"
                      >
                        {copied ? <Check className="mr-1.5 size-3.5 text-emerald-500" /> : <Copy className="mr-1.5 size-3.5" />}
                        {copied ? "Copied" : "Copy Prompt"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    {testedPrompt ? (
                      <pre className="max-h-[640px] overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                        {testedPrompt}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                        <TestTube2 className="size-10 text-slate-300 animate-bounce mb-3" />
                        <p className="text-xs font-bold uppercase tracking-wider">No composed test prompt generated.</p>
                        <p className="text-[11px] font-medium leading-relaxed max-w-[280px] mt-1 text-slate-400">
                          Configure jewelry properties and input simulated instructions, then click &quot;Compose Test Prompt&quot;.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "rates" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr] items-start animate-fadeIn">
                
                {/* ADD MANUAL SPOT RATE FORM */}
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                    <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Add Manual Spot Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Rate Category</label>
                      <select 
                        value={rateDraft.rateType} 
                        onChange={(event) => setRateDraft({ ...rateDraft, rateType: event.target.value })} 
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                        <option value="DIAMOND">Diamond</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Metal Type Specification</label>
                      <Input 
                        placeholder="e.g. 22k Gold, 18k White Gold, Sterling Silver" 
                        value={rateDraft.metalType} 
                        onChange={(event) => setRateDraft({ ...rateDraft, metalType: event.target.value })} 
                        className="h-10 text-xs font-semibold text-slate-755" 
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Diamond Shape / Specifications</label>
                      <Input 
                        placeholder="e.g. Round Brilliant, G-H VS (Optional)" 
                        value={rateDraft.diamondShape} 
                        onChange={(event) => setRateDraft({ ...rateDraft, diamondShape: event.target.value })} 
                        className="h-10 text-xs font-semibold text-slate-755" 
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">Manual Spot Value (per gram/carat)</label>
                      <Input 
                        placeholder="Rate number value" 
                        value={rateDraft.value} 
                        onChange={(event) => setRateDraft({ ...rateDraft, value: event.target.value })} 
                        className="h-10 text-xs font-semibold text-slate-755" 
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-[0.07em] text-slate-450">City / Location</label>
                      <Input 
                        placeholder="e.g. Karachi, Lahore, International" 
                        value={rateDraft.city} 
                        onChange={(event) => setRateDraft({ ...rateDraft, city: event.target.value })} 
                        className="h-10 text-xs font-semibold text-slate-755" 
                      />
                    </div>
                    <Button onClick={createRate} className="h-11 w-full bg-gradient-to-r from-blue-600 to-indigo-650 text-white hover:from-blue-700 hover:to-indigo-755 text-xs font-bold shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01]">
                      Save Spot Rate Entry
                    </Button>
                  </CardContent>
                </Card>

                {/* SPOT RATES LIBRARY LIST */}
                <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                    <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Current Spot Value Entries</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6 max-h-[700px] overflow-y-auto">
                    {rates.map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/30 p-4 hover:bg-white hover:shadow-md transition-all duration-150">
                        <div>
                          <p className="font-extrabold text-xs text-slate-800">{rate.rateType}</p>
                          <p className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-455 mt-1">
                            {[rate.metalType, rate.diamondShape, rate.city].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-extrabold text-blue-700 text-sm tracking-tight">{rate.currency} {rate.value.toLocaleString()}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                            onClick={() => deleteRate(rate.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "quality" && (
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/40">
                  <CardTitle className="text-sm font-bold text-slate-800 font-mono uppercase tracking-[0.05em]">Recent Production Failures Logs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {metrics?.recentFailures?.length ? metrics.recentFailures.map((failure) => (
                    <div key={failure.id} className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 border-l-4 border-l-rose-500 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-xs text-rose-800 leading-none">{label(failure.workflow)}</p>
                        <p className="text-[10px] font-mono font-bold text-rose-550 mt-1 uppercase">Job Reference ID: {failure.id}</p>
                        <p className="text-xs text-rose-600 mt-2 font-semibold leading-relaxed">{failure.errorMessage}</p>
                      </div>
                      <Link href={`/?jobId=${failure.id}`}>
                        <Button size="sm" className="h-8 text-[11px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-250/60 shrink-0 border border-rose-200">
                          Re-route in Studio
                        </Button>
                      </Link>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                      <AlertCircle className="size-8 text-emerald-500 mb-2 animate-pulse" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">All systems operational</p>
                      <p className="text-[11px] font-medium leading-relaxed max-w-[280px] mt-1 text-slate-400">
                        No recent workflow errors or generation timeouts found in SQLite error buffers.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
