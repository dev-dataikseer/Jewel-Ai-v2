"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  BadgeCheck,
  BarChart3,
  Download,
  Gem,
  Heart,
  History,
  ImagePlus,
  Layers3,
  RefreshCcw,
  Settings,
  Sparkles,
  UploadCloud,
  Wand2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, mediaUrl } from "@/lib/api";

type Asset = {
  id: string;
  originalUrl: string;
};

type StylePreset = {
  id: string;
  name: string;
  description?: string | null;
  promptAddon: string;
};

type Job = {
  id: string;
  workflow: string;
  jewelryType?: string | null;
  status: string;
  inputUrl?: string | null;
  referenceUrl?: string | null;
  outputUrl?: string | null;
  errorMessage?: string | null;
  creditsUsed: number;
  providerMetadata?: string | null;
  createdAt: string;
  favorite?: { id: string } | null;
};

type RateEntry = {
  id: string;
  rateType: string;
  metalType?: string | null;
  diamondShape?: string | null;
  diamondColor?: string | null;
  diamondClarity?: string | null;
  carat?: string | null;
  value: number;
  currency: string;
  city?: string | null;
  updatedAt: string;
};

const WORKFLOWS = [
  { id: "CATALOG_IMAGE", label: "Catalog Image", icon: ImagePlus, bulk: false },
  { id: "JEWELRY_ON_MODEL", label: "Jewelry On Model", icon: Sparkles, bulk: false },
  { id: "GEMSTONE_COLOR_CHANGE", label: "Gemstone Color Change", icon: Gem, bulk: false },
  { id: "CUSTOMER_TRY_ON", label: "Customer Try-On", icon: BadgeCheck, bulk: false },
  { id: "BACKGROUND_REPLACEMENT", label: "Background Replacement", icon: Layers3, bulk: false },
  { id: "LUXURY_ENHANCEMENT", label: "Luxury Enhancement", icon: Wand2, bulk: false },
  { id: "CUSTOM_PROMPT", label: "Custom Prompt", icon: Sparkles, bulk: false },
  { id: "BULK_GENERATION", label: "Bulk Generation", icon: UploadCloud, bulk: true },
  { id: "RATE_TOOLS", label: "Rate Tools", icon: BarChart3, bulk: false },
];

function workflowLabel(id: string) {
  return WORKFLOWS.find((workflow) => workflow.id === id)?.label || id;
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
}: {
  label?: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerId = useMemo(() => `dropdown-${(label || placeholder).replace(/\s+/g, "-")}`, [label, placeholder]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const container = document.getElementById(containerId);
      if (container && !container.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerId]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const removeValue = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
  };

  const toggleAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className="relative w-full" id={containerId}>
      {label && (
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus-within:ring-1 focus-within:ring-blue-500 font-medium text-slate-700 cursor-pointer flex items-center justify-between gap-2 shadow-sm hover:border-slate-300 transition-colors"
      >
        <div className="flex flex-wrap gap-1 items-center flex-1 max-w-[85%]">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          ) : (
            selectedValues.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 transition duration-150 hover:bg-slate-200"
              >
                <span className="truncate max-w-[90px]">{val}</span>
                <button
                  type="button"
                  onClick={(e) => removeValue(e, val)}
                  className="rounded-full hover:bg-slate-350 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  <X className="size-2.5 stroke-[2]" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`size-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/40 z-50 animate-fadeIn">
          {options.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-1.5 pt-1 mb-1 text-[11px] font-bold text-slate-500 tracking-[0.07em]">
              <span>OPTIONS ({options.length})</span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-blue-650 hover:text-blue-800 transition-colors"
              >
                {selectedValues.length === options.length ? "CLEAR ALL" : "SELECT ALL"}
              </button>
            </div>
          )}
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-50 text-blue-700 font-semibold"
                      : "text-slate-655 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <Check className="size-3 text-blue-600 stroke-[2]" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(true);
  const [paramsExpanded, setParamsExpanded] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [workflow, setWorkflow] = useState("CATALOG_IMAGE");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [jewelryTypes, setJewelryTypes] = useState<string[]>(["Ring"]);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [personGeneration, setPersonGeneration] = useState<string>("ALLOW_ADULT");
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [modelAlias, setModelAlias] = useState<string>("model_2");
  const [primaryFiles, setPrimaryFiles] = useState<File[]>([]);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [options, setOptions] = useState<{
    jewelryTypes: string[];
    aspectRatios: string[];
  }>({
    jewelryTypes: ["Ring", "Necklace", "Bangles", "Bracelet", "Earrings (Studs)", "Earrings (Drops)", "Earrings (Hoops)", "Pendant", "Watch", "Brooch", "Anklet", "Cufflinks", "Multiple Items"],
    aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
  });
  const [promptText, setPromptText] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [liveRates, setLiveRates] = useState<any>(null);
  const [isLoadingLiveRates, setIsLoadingLiveRates] = useState(false);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const isBulk = workflow === "BULK_GENERATION";
  const needsReference = workflow === "JEWELRY_ON_MODEL" || workflow === "CUSTOMER_TRY_ON";
  const activeJobs = jobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING");
  
  const allAvailableJobs = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach(j => map.set(j.id, j));
    recentJobs.forEach(j => {
      if (!map.has(j.id)) map.set(j.id, j);
    });
    return Array.from(map.values());
  }, [jobs, recentJobs]);

  const activeJob = useMemo(() => {
    if (activeJobId) {
      return allAvailableJobs.find(j => j.id === activeJobId) || null;
    }
    return null;
  }, [activeJobId, allAvailableJobs]);

  const [primaryPreviews, setPrimaryPreviews] = useState<{ file: File; url: string }[]>([]);
  const [referencePreview, setReferencePreview] = useState("");

  useEffect(() => {
    const urls = primaryFiles.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPrimaryPreviews(urls);
    return () => urls.forEach((item) => URL.revokeObjectURL(item.url));
  }, [primaryFiles]);

  useEffect(() => {
    const url = referenceFile ? URL.createObjectURL(referenceFile) : "";
    setReferencePreview(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [referenceFile]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const jobId = params.get("jobId");
      if (jobId) {
        setActiveJobId(jobId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    api.get("/config/options").then((res) => {
      if (res.data.jewelryTypes) setOptions(prev => ({ ...prev, jewelryTypes: res.data.jewelryTypes }));
      setJewelryTypes(res.data.jewelryTypes?.[0] ? [res.data.jewelryTypes[0]] : ["Ring"]);
    }).catch(() => toast.error("Could not load configuration options"));

    api.get("/jobs", { params: { limit: 8 } }).then((res) => setRecentJobs(res.data)).catch(() => undefined);
    api.get("/rates").then((res) => setRates(res.data)).catch(() => undefined);
    setIsLoadingLiveRates(true);
    api.get("/rates/live")
      .then((res) => setLiveRates(res.data))
      .catch(() => undefined)
      .finally(() => setIsLoadingLiveRates(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      const current = jobsRef.current;
      const active = current.filter((job) => job.status === "PENDING" || job.status === "PROCESSING");
      if (active.length === 0) return;
      try {
        const updated = await Promise.all(active.map((job) => api.get(`/jobs/${job.id}`).then((res) => res.data)));
        setJobs((prev) => prev.map((job) => updated.find((item) => item.id === job.id) || job));
        setRecentJobs((prev) => {
          const merged = [...updated, ...prev.filter((job) => !updated.some((item) => item.id === job.id))];
          return merged.slice(0, 8);
        });
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const primaryDropzone = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: isBulk ? 30 : 1,
    onDrop: (accepted) => setPrimaryFiles(isBulk ? accepted : accepted.slice(0, 1)),
  });

  const referenceDropzone = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    onDrop: (accepted) => setReferenceFile(accepted[0] || null),
  });

  const uploadOne = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/assets/upload", form);
    return res.data as Asset;
  };

  const uploadMany = async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const res = await api.post("/assets/bulk-upload", form);
    return res.data as Asset[];
  };

  const generate = async () => {
    if (workflow === "RATE_TOOLS") return;
    if (primaryFiles.length === 0) {
      toast.error("Upload at least one product image");
      return;
    }
    if (needsReference && !referenceFile) {
      toast.error("Upload a model or customer photo for this workflow");
      return;
    }

    setIsGenerating(true);
    try {
      const referenceAsset = referenceFile ? await uploadOne(referenceFile) : null;
      const payload = {
        workflow,
        jewelryType: jewelryTypes.join(", "),
        promptText,
        aspectRatio,
        personGeneration,
        numberOfImages,
        modelAlias,
        referenceUrl: referenceAsset?.originalUrl,
        modelUrl: referenceAsset?.originalUrl,
      };

      if (isBulk || primaryFiles.length > 1) {
        const assets = await uploadMany(primaryFiles);
        const res = await api.post("/jobs/bulk", {
          ...payload,
          workflow: workflow === "BULK_GENERATION" ? "CATALOG_IMAGE" : workflow,
          assetIds: assets.map((asset) => asset.id),
        });
        setJobs(res.data.jobs);
        if (res.data.jobs?.[0]) setActiveJobId(res.data.jobs[0].id);
        toast.success("Bulk batch started");
      } else {
        const asset = await uploadOne(primaryFiles[0]);
        const res = await api.post("/jobs", { ...payload, assetId: asset.id });
        setJobs([res.data.job]);
        setActiveJobId(res.data.job.id);
        toast.success("Generation started");
      }
    } catch (error: any) {
      let message = "Operation failed";
      if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      toast.error(message.includes("upload") || message.includes("Upload") ? message : `Generation failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFavorite = async (job: Job) => {
    let updated: { id: string } | null;
    if (job.favorite) {
      await api.delete(`/favorites/${job.id}`);
      updated = null;
    } else {
      const res = await api.post(`/favorites/${job.id}`);
      updated = res.data;
    }
    const mapper = (item: Job) => item.id === job.id ? { ...item, favorite: updated } : item;
    setJobs((items) => items.map(mapper));
    setRecentJobs((items) => items.map(mapper));
  };

  const regenerate = async (job: Job) => {
    setRegeneratingIds((prev) => new Set(prev).add(job.id));
    try {
      const res = await api.post(`/jobs/${job.id}/regenerate`, { promptText });
      setJobs((items) => [res.data.job, ...items]);
    } catch {
      toast.error("Regeneration failed");
    } finally {
      setRegeneratingIds((prev) => { const next = new Set(prev); next.delete(job.id); return next; });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <Gem className="size-8 animate-pulse text-blue-600" suppressHydrationWarning />
          <p className="text-sm text-slate-500 font-medium animate-pulse" suppressHydrationWarning>Loading Jewel AI Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-full w-full items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/10">
              <Gem className="size-4.5" />
            </div>
            <div>
              <h1 className="text-[18px] font-heading font-bold text-slate-900 leading-none tracking-[-0.02em]">Jewel AI Studio</h1>
              <p className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mt-1.5">Production Suite</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/history">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-600 hover:bg-slate-50">
                <History className="mr-1.5 size-4" />History
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-600 hover:bg-slate-50">
                <Settings className="mr-1.5 size-4" />Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* CORE WORKSPACE SECTION */}
      <main className="mx-auto max-w-[1600px] w-full px-4 lg:px-6 py-6 flex-1 flex flex-col">
        <div className={`grid grid-cols-1 ${workflow === "RATE_TOOLS" ? "lg:grid-cols-[240px_1fr]" : "lg:grid-cols-[240px_1fr_320px]"} gap-5 items-start`}>
          
          {/* COLUMN 1: LEFT WORKFLOW SIDEBAR */}
          <aside className="space-y-4 lg:sticky lg:top-22 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1 pb-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="px-1.5 py-0.5">
                <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500">Studio Workflows</span>
              </div>
              
              <div className="space-y-1">
                {WORKFLOWS.map((item) => {
                  const Icon = item.icon;
                  const isActive = workflow === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setWorkflow(item.id);
                        setJobs([]);
                        setPrimaryFiles([]);
                        setReferenceFile(null);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-sans tracking-normal transition-all duration-155 ${
                        isActive 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 font-semibold" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <Icon className={`size-3.5 shrink-0 ${isActive ? "text-white" : "text-blue-650"}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Stats (Left Sidebar Bottom) */}
            <div className="space-y-4 pt-4 border-t border-slate-200/60 mt-auto">
              <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="py-2 px-3 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-[11px] font-sans uppercase tracking-[0.07em] text-slate-500 font-bold flex items-center gap-1.5">
                    <BarChart3 className="size-3 text-slate-500" />
                    Session Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 p-2.5">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center">
                    <p className="text-[11px] font-sans text-slate-500 font-bold uppercase tracking-[0.07em]">Total Jobs</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{jobs.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center">
                    <p className="text-[11px] font-sans text-slate-500 font-bold uppercase tracking-[0.07em]">Active</p>
                    <p className={`text-xs font-semibold mt-0.5 ${activeJobs.length > 0 ? "text-blue-600 animate-pulse" : "text-slate-700"}`}>
                      {activeJobs.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="text-[11px] font-sans text-center text-slate-400 font-medium tracking-wider px-2">
                Jewel AI Studio v1.2
              </div>
            </div>
          </aside>

          {/* COLUMN 2: CENTER STUDIO CANVAS */}
          <section className="space-y-5 lg:min-w-0 flex-1">
            
            {/* Header Title reflecting active workflow (Clean, no-border canvas style) */}
            <div className="pb-4">
              <h2 className="text-[20px] font-heading font-semibold text-slate-900 flex items-center gap-2.5 tracking-[-0.01em]">
                <Sparkles className="size-4.5 text-blue-600" />
                {workflowLabel(workflow)} Studio
              </h2>
              <p className="text-[13px] font-sans font-normal text-slate-600 mt-1.5 leading-relaxed max-w-2xl">
                {workflow === "CATALOG_IMAGE" && "Create professional premium e-commerce photography from flat catalog pictures."}
                {workflow === "JEWELRY_ON_MODEL" && "Synthesize flat catalog jewelry onto model portraits with absolute visual accuracy."}
                {workflow === "GEMSTONE_COLOR_CHANGE" && "Instantly alter gemstone color matrices under dynamic studio illumination."}
                {workflow === "CUSTOMER_TRY_ON" && "Map commercial accessories seamlessly onto customer-submitted portraits."}
                {workflow === "BACKGROUND_REPLACEMENT" && "Drape accessory graphics upon custom marble, velvet, silk, or lifestyle surfaces."}
                {workflow === "LUXURY_ENHANCEMENT" && "Apply master-level macro retouches, natural ambient occlusions, and shadows."}
                {workflow === "CUSTOM_PROMPT" && "Unleash custom prompt logic to completely manipulate visual jewelry compositions."}
                {workflow === "BULK_GENERATION" && "Upload up to 30 products concurrently to trigger background rendering threads."}
                {workflow === "RATE_TOOLS" && "Access live global market metals spot rates feed & localized diamond appraisal tables."}
              </p>
            </div>

            {workflow === "RATE_TOOLS" ? (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Live Precious Metals Spot Prices */}
                <Card className="rounded-2xl border-slate-105 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_8px_16px_-6px_rgba(0,0,0,0.03)] overflow-hidden">
                  <CardHeader className="flex flex-col space-y-2 pb-3.5 border-b border-slate-100 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-5">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Live Global Spot Rates Feed</CardTitle>
                      <p className="text-[11px] text-slate-400 mt-0.5">Real-time international market feeds & gram/tola conversions</p>
                    </div>
                    {liveRates && (
                      <div className="self-start rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[10px] font-bold text-blue-700 sm:self-center">
                        Live USD/PKR: {liveRates.exchangeRate.rate.toFixed(2)}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-5">
                    {isLoadingLiveRates && !liveRates ? (
                      <div className="flex h-36 items-center justify-center">
                        <RefreshCcw className="size-6 animate-spin text-blue-600" />
                      </div>
                    ) : liveRates?.metals ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {liveRates.metals && Object.values(liveRates.metals).filter(Boolean).map((metal: any) => {
                          const isUp = metal.regularMarketChangePercent >= 0;
                          const ArrowIcon = isUp ? ArrowUpRight : ArrowDownRight;
                          return (
                            <div key={metal.symbol} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 transition-all hover:border-blue-200 hover:shadow-sm hover:bg-white">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                                <div>
                                  <h3 className="font-extrabold text-slate-800 text-xs">{metal.name}</h3>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{metal.symbol}</p>
                                </div>
                                <div className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isUp ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}>
                                  <ArrowIcon className="size-3" />
                                  {metal.regularMarketChangePercent.toFixed(2)}%
                                </div>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-semibold">Per Troy Ounce</span>
                                  <span className="font-bold text-slate-700">PKR {mounted ? Math.round(metal.pricing.pkr.perOunce).toLocaleString() : Math.round(metal.pricing.pkr.perOunce)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-semibold">Per Gram (Gold/Silver)</span>
                                  <span className="font-medium text-slate-600">PKR {mounted ? Math.round(metal.pricing.pkr.perGram).toLocaleString() : Math.round(metal.pricing.pkr.perGram)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-semibold">Per Tola (11.6638g)</span>
                                  <span className="font-extrabold text-blue-655 text-sm">PKR {mounted ? Math.round(metal.pricing.pkr.perTola).toLocaleString() : Math.round(metal.pricing.pkr.perTola)}</span>
                                </div>
                              </div>
                              
                              <div className="mt-3 border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400 text-right">
                                Int. Spot: ${metal.pricing.usd.perOunce.toFixed(2)} / oz
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid h-24 place-items-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        Precious metals feed temporarily offline.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Manual Rates Lookup */}
                <Card className="rounded-2xl border-slate-100 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_8px_16px_-6px_rgba(0,0,0,0.03)] overflow-hidden">
                  <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-bold text-slate-800">Local Custom Rate Matrices</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    {rates.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {rates.map((rate) => (
                          <div key={rate.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50/40">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-slate-800 text-xs">{rate.rateType}</p>
                              <p className="text-xs font-extrabold text-blue-600">{rate.currency} {mounted ? rate.value.toLocaleString() : rate.value}</p>
                            </div>
                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              {[rate.metalType, rate.diamondShape, rate.carat ? `${rate.carat} Carats` : null].filter(Boolean).join(" • ") || "General Valuation Rate"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid min-h-20 place-items-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-lg">
                        Add rate entries in Admin &gt; Rates lookup to see localized matrices.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeIn">
                
                {/* 50/50 SPLIT MEDIA CANVAS WORKSPACE */}
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_8px_16px_-6px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                                       {/* Left Side: Original Input / Dropzones */}
                    <div className="p-5 flex flex-col justify-between min-h-[380px] lg:min-h-[440px]">
                      {activeJob ? (
                        // Viewing an active generated or loaded job
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3.5">
                            <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500">Original Product Input</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setActiveJobId(null);
                                setPrimaryFiles([]);
                                setReferenceFile(null);
                              }}
                              className="h-7 px-3 text-[12px] font-sans font-semibold text-blue-650 hover:bg-blue-50/55 flex items-center"
                            >
                              <UploadCloud className="mr-1.5 size-3.5" /> New Session
                            </Button>
                          </div>

                          <div className="space-y-3 flex-1 flex flex-col justify-center">
                            {needsReference && activeJob.referenceUrl ? (
                              <div className="grid grid-cols-2 gap-3 flex-1">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mb-1.5">Product</span>
                                  <div className="relative flex-1 rounded-xl border border-slate-100 bg-slate-950 shadow-inner overflow-hidden flex items-center justify-center p-2 h-[220px] lg:h-[280px]">
                                    <img src={mediaUrl(activeJob.inputUrl || "")} alt="Input" className="max-w-full max-h-full w-auto h-auto object-contain rounded" />
                                  </div>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mb-1.5">Model Portrait</span>
                                  <div className="relative flex-1 rounded-xl border border-slate-100 bg-slate-950 shadow-inner overflow-hidden flex items-center justify-center p-2 h-[220px] lg:h-[280px]">
                                    <img src={mediaUrl(activeJob.referenceUrl)} alt="Reference" className="max-w-full max-h-full w-auto h-auto object-contain rounded" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="relative flex-1 rounded-xl border border-slate-100 bg-slate-950 shadow-inner overflow-hidden flex items-center justify-center p-3 h-[220px] lg:h-[280px]">
                                {activeJob.inputUrl ? (
                                  <img src={mediaUrl(activeJob.inputUrl)} alt="Input" className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg" />
                                ) : (
                                  <span className="text-xs text-slate-500 font-semibold">No input image available</span>
                                ) }
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Drafting a new generation (Upload State)
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3.5">
                            <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500">Upload Studio Assets</span>
                          </div>

                          {needsReference ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-stretch">
                              {/* Dropzone 1: Product */}
                              <div className="flex flex-col flex-1">
                                <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mb-1.5">1. Jewelry Item</span>
                                <div 
                                  {...primaryDropzone.getRootProps()} 
                                  className="flex-1 min-h-[160px] cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:border-blue-450 hover:bg-blue-50/10 transition-all flex flex-col justify-center items-center"
                                >
                                  <input {...primaryDropzone.getInputProps()} />
                                  <UploadCloud className="mb-2 size-6 text-blue-600 animate-pulse" />
                                  <p className="font-bold text-slate-800 text-[11px] leading-tight">Upload Product</p>
                                  <p className="text-[9px] text-slate-400 mt-1">JPG, PNG, WEBP</p>
                                </div>
                                {primaryPreviews.length > 0 && (
                                  <div className="mt-2 aspect-square relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 h-16 w-16 mx-auto">
                                    <img src={primaryPreviews[0].url} alt="" className="max-w-full max-h-full object-contain rounded" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Dropzone 2: Model Target */}
                              <div className="flex flex-col flex-1">
                                <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mb-1.5">2. Portrait Target</span>
                                <div 
                                  {...referenceDropzone.getRootProps()} 
                                  className="flex-1 min-h-[160px] cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:border-blue-450 hover:bg-blue-50/10 transition-all flex flex-col justify-center items-center"
                                >
                                  <input {...referenceDropzone.getInputProps()} />
                                  <ImagePlus className="mb-2 size-6 text-blue-600" />
                                  <p className="font-bold text-slate-800 text-[11px] leading-tight">Upload Portrait</p>
                                  <p className="text-[9px] text-slate-400 mt-1">Model/Customer</p>
                                </div>
                                {referencePreview && (
                                  <div className="mt-2 aspect-square relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 h-16 w-16 mx-auto">
                                    <img src={referencePreview} alt="" className="max-w-full max-h-full object-contain rounded" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col justify-center">
                              <div 
                                {...primaryDropzone.getRootProps()} 
                                className="min-h-[220px] cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center hover:border-blue-450 hover:bg-blue-50/10 transition-all flex flex-col justify-center items-center flex-1"
                              >
                                <input {...primaryDropzone.getInputProps()} />
                                <UploadCloud className="mb-2.5 size-8 text-blue-655 animate-pulse" />
                                <p className="font-bold text-slate-800 text-xs">Upload Jewelry Product Image</p>
                                <p className="text-[11px] text-slate-400 mt-1 font-semibold">Supports JPG, PNG, and WEBP (up to {isBulk ? "30 files" : "1 file"})</p>
                              </div>
                              {primaryPreviews.length > 0 && (
                                <div className="mt-3 grid grid-cols-6 gap-2">
                                  {primaryPreviews.slice(0, 6).map((item) => (
                                    <div key={item.url} className="aspect-square relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1">
                                      <img src={item.url} alt="" className="max-w-full max-h-full object-contain rounded" />
                                    </div>
                                  ))}
                                  {primaryPreviews.length > 6 && (
                                    <div className="aspect-square rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-505 shadow-sm">
                                      +{primaryPreviews.length - 6}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Side: Creative Production Output Canvas */}
                    <div className="p-5 flex flex-col justify-between min-h-[380px] lg:min-h-[440px] bg-slate-50/20">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3.5">
                        <span className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500">Processed Studio Output</span>
                        {activeJob && activeJob.status === "COMPLETED" && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => regenerate(activeJob)} 
                              disabled={regeneratingIds.has(activeJob.id)} 
                              className="h-7 px-3 text-[12px] font-sans font-semibold text-slate-600 hover:bg-slate-100 flex items-center"
                            >
                              <RefreshCcw className={`mr-1.5 size-3.5 ${regeneratingIds.has(activeJob.id) ? "animate-spin" : ""}`} />
                              {regeneratingIds.has(activeJob.id) ? "..." : "Retry"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleFavorite(activeJob)} 
                              className="h-7 px-3 text-[12px] font-sans font-semibold text-slate-600 hover:bg-slate-100 flex items-center"
                            >
                              <Heart className={`mr-1.5 size-3.5 ${activeJob.favorite ? "fill-red-500 text-red-500" : "text-slate-500"}`} />
                              {activeJob.favorite ? "Saved" : "Save"}
                            </Button>
                            {activeJob.outputUrl && (
                              <a href={mediaUrl(activeJob.outputUrl)} download target="_blank" rel="noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[12px] font-sans font-semibold text-slate-600 hover:bg-slate-100 flex items-center">
                                  <Download className="mr-1.5 size-3.5" />
                                  Download
                                </Button>
                              </a>
                            )}
                          </div>
                        )}
                      </div>                      {!activeJob ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)]">
                          <Wand2 className="size-8 text-slate-350 mb-2.5 animate-pulse" />
                          <h5 className="font-semibold font-sans text-slate-800 text-[14px]">Studio Standby</h5>
                          <p className="text-[13px] font-sans font-normal text-slate-500 mt-1.5 max-w-[240px] leading-relaxed">
                            Upload jewelry items on the left and click **Generate** on the right to start studio rendering.
                          </p>
                        </div>
                      ) : (
                        <div className="relative flex-1 rounded-xl border border-slate-100 bg-slate-950 shadow-inner overflow-hidden flex items-center justify-center p-3 h-[220px] lg:h-[280px]">
                          {activeJob.status === "COMPLETED" && activeJob.outputUrl ? (
                            <img 
                              src={mediaUrl(activeJob.outputUrl)} 
                              alt="Output" 
                              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg transition-transform duration-350 hover:scale-[1.03]" 
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <RefreshCcw className={`size-8 text-blue-500 ${activeJob.status === "PROCESSING" || activeJob.status === "PENDING" ? "animate-spin" : ""}`} />
                              {(activeJob.status === "PROCESSING" || activeJob.status === "PENDING") && (
                                <span className="text-xs font-bold text-blue-505 animate-pulse">AI is rendering details...</span>
                              )}
                              {activeJob.status === "FAILED" && (
                                <span className="text-xs text-rose-500 font-bold px-4 text-center">{activeJob.errorMessage || "Rendering failed"}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </Card>

                {/* Optional Stretched Instruction Input Bar */}
                <Card className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <CardContent className="p-2.5 flex items-center gap-3 bg-gradient-to-r from-blue-50/5 via-white to-white">
                    <div className="relative flex-1 w-full">
                      <input 
                        type="text"
                        value={promptText} 
                        onChange={(event) => setPromptText(event.target.value)} 
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-4 pr-10 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700" 
                        placeholder="Optional prompt instructions: e.g. add dramatic sparkles, soft warm lighting reflections, black marble table..." 
                      />
                      <Sparkles className="absolute right-3.5 top-3.5 size-3.5 text-blue-550/70" />
                    </div>
                  </CardContent>
                </Card>

                {/* CREATIONS GALLERIES SECTION */}
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] font-sans uppercase tracking-[0.07em] text-slate-500 font-bold flex items-center gap-1.5">
                      <History className="size-3.5 text-slate-400" />
                      Studio Generations & History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    {/* Active Session Gallery (if jobs.length > 0) */}
                    {jobs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-sans uppercase font-bold tracking-[0.07em] text-slate-500">Current Session ({jobs.length})</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                          {jobs.map((job) => {
                            const isViewerActive = activeJobId === job.id;
                            return (
                              <button
                                key={job.id}
                                onClick={() => setActiveJobId(job.id)}
                                className={`relative size-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                  isViewerActive ? "border-blue-600 ring-2 ring-blue-500/10 scale-95" : "border-slate-200 hover:border-slate-355 hover:scale-102"
                                }`}
                              >
                                {job.outputUrl || job.inputUrl ? (
                                  <img src={mediaUrl(job.outputUrl || job.inputUrl)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full bg-slate-100 flex items-center justify-center"><RefreshCcw className="size-3.5 animate-spin text-slate-400" /></div>
                                )}
                                {job.status !== "COMPLETED" && (
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                    <span className="text-[8px] font-extrabold text-white uppercase tracking-wider animate-pulse">{job.status}</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent Historical Gallery (if recentJobs.length > 0) */}
                    {recentJobs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-sans uppercase font-bold tracking-[0.07em] text-slate-500">Creation History ({recentJobs.length})</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                          {recentJobs.map((job) => {
                            const isViewerActive = activeJobId === job.id;
                            return (
                              <button
                                key={job.id}
                                onClick={() => setActiveJobId(job.id)}
                                className={`relative size-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                  isViewerActive ? "border-blue-600 ring-2 ring-blue-500/10 scale-95" : "border-slate-200 hover:border-slate-355 hover:scale-102"
                                }`}
                              >
                                {job.outputUrl || job.inputUrl ? (
                                  <img src={mediaUrl(job.outputUrl || job.inputUrl)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full bg-slate-100 flex items-center justify-center"><RefreshCcw className="size-3.5 animate-spin text-slate-400" /></div>
                                )}
                                {job.status !== "COMPLETED" && (
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                    <span className="text-[8px] font-extrabold text-white uppercase tracking-wider">{job.status}</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {jobs.length === 0 && recentJobs.length === 0 && (
                      <div className="text-center py-4 text-[13px] font-sans font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        No recent creations or session uploads. Ready to begin!
                      </div>
                    )}

                  </CardContent>
                </Card>

              </div>
            )}
          </section>

          {/* COLUMN 3: RIGHT PARAMETER SIDEBAR (Hidden on Rate Tools) */}
          {workflow !== "RATE_TOOLS" && (
            <aside className="space-y-4 lg:sticky lg:top-22 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pl-1 pb-4">
              {/* Parameters Setup Card */}
              <Card className="rounded-xl border-slate-150 bg-white shadow-sm overflow-hidden">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 flex items-center gap-1.5">
                    <Settings className="size-3.5 text-slate-500" />
                    Studio Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <MultiSelectDropdown
                      label="1. Jewelry Type"
                      options={options?.jewelryTypes || []}
                      selectedValues={jewelryTypes}
                      onChange={setJewelryTypes}
                      placeholder="Select Jewelry Type(s)..."
                    />
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-sans font-bold uppercase text-slate-500 tracking-[0.07em]">2. API Configuration</label>
                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aspect Ratio</span>
                        <select 
                          value={aspectRatio} 
                          onChange={(e) => setAspectRatio(e.target.value)} 
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                        >
                          {options?.aspectRatios?.map((ratio) => (
                            <option key={ratio} value={ratio}>Aspect Ratio {ratio}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Person Generation</span>
                        <select 
                          value={personGeneration} 
                          onChange={(e) => setPersonGeneration(e.target.value)} 
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                        >
                          <option value="DONT_ALLOW">DONT_ALLOW</option>
                          <option value="ALLOW_ADULT">ALLOW_ADULT</option>
                          <option value="ALLOW_ALL">ALLOW_ALL</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Number of Images</span>
                        <select 
                          value={numberOfImages} 
                          onChange={(e) => setNumberOfImages(Number(e.target.value) || 1)} 
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                        >
                          <option value={1}>1 Image</option>
                          <option value={2}>2 Images</option>
                          <option value={3}>3 Images</option>
                          <option value={4}>4 Images</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">AI Model</span>
                        <select
                          value={modelAlias}
                          onChange={(e) => setModelAlias(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                        >
                          <option value="model_2">Model 2</option>
                          <option value="model_3">Model 3</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collapsible Guidelines Accordion inside Column 3 */}
              <div className="rounded-xl border border-slate-150 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen(!guidelinesOpen)}
                  className="w-full py-2.5 px-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 hover:bg-slate-50 transition-colors focus:outline-none"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-blue-600" />
                    View Photography Tips
                  </span>
                  {guidelinesOpen ? (
                    <ChevronUp className="size-3.5 text-slate-400 font-bold" />
                  ) : (
                    <ChevronDown className="size-3.5 text-slate-400 font-bold" />
                  )}
                </button>
                {guidelinesOpen && (
                  <div className="p-4 space-y-2.5 text-[13px] font-sans font-normal text-slate-600 bg-white leading-relaxed animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-505">•</span>
                      <span><strong className="font-semibold text-slate-800">Lighting Mapping:</strong> Natural macro reflections matching your parameters will map over the metal dynamically.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-505">•</span>
                      <span><strong className="font-semibold text-slate-800">Original Pixel Lock:</strong> Original facet cuts, geometry, colors, and metal thickness are fully locked from warping.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-505">•</span>
                      <span><strong className="font-semibold text-slate-800">Aesthetic Canvas:</strong> Solid or cluttered photo backings will automatically synthesize to high-end luxury backings.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Master Action Button */}
              <div className="pt-2">
                <Button 
                  onClick={generate} 
                  disabled={isGenerating || activeJobs.length > 0} 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl text-[12px] font-sans font-semibold shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  {isGenerating || activeJobs.length > 0 ? (
                    <RefreshCcw className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  {isGenerating ? "Processing..." : "Generate Studio Output"}
                </Button>
                <p className="text-[9px] text-center text-slate-400 font-semibold mt-2.5 uppercase tracking-wider">
                  Credits per generation: 1 Unit
                </p>
              </div>

            </aside>
          )}

        </div>
      </main>
    </div>
  );
}
