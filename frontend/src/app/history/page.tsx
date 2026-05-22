"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { 
  Download, 
  Gem, 
  Sparkles, 
  Settings, 
  History, 
  ArrowUpRight,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, mediaUrl } from "@/lib/api";

type Job = {
  id: string;
  workflow: string;
  status: string;
  inputUrl?: string | null;
  outputUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  projectName?: string;
  jewelryType?: string | null;
};

type Project = {
  id: string;
  name: string;
  workflow?: string | null;
  jewelryType?: string | null;
  updatedAt: string;
  jobs: Job[];
};

function label(value?: string | null) {
  return (value || "Workflow")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);

  const refresh = async () => {
    const res = await api.get("/projects");
    setProjects(res.data);
  };

  useEffect(() => {
    setMounted(true);
    const timer = window.setTimeout(() => {
      refresh().catch(() => toast.error("Could not load history"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3" suppressHydrationWarning>
          <Gem className="size-8 animate-pulse text-blue-600" suppressHydrationWarning />
          <p className="text-sm text-slate-500 font-medium animate-pulse" suppressHydrationWarning>Loading Studio History...</p>
        </div>
      </div>
    );
  }

  // Flatten all jobs across all projects, and sort by newest first
  const allCompletedJobs = projects
    .flatMap((p) => p.jobs.map((j) => ({ ...j, projectName: p.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visibleJobs = allCompletedJobs.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-full w-full items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/10">
              <Gem className="size-4.5" />
            </div>
            <div>
              <h1 className="text-[18px] font-heading font-bold text-slate-900 leading-none tracking-[-0.02em]">Jewel AI Studio</h1>
              <p className="text-[11px] font-sans font-bold uppercase tracking-[0.07em] text-slate-500 mt-1.5">Studio Generations</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-600 hover:bg-slate-50 flex items-center">
                <Sparkles className="mr-1.5 size-4" />Studio
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="h-8 text-[13px] font-sans font-semibold text-slate-600 hover:bg-slate-50 flex items-center">
                <Settings className="mr-1.5 size-4" />Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-[1300px] w-full px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Title Section */}
        <div className="mb-8">
          <h2 className="text-[22px] font-heading font-bold text-slate-900 tracking-[-0.02em]">Studio Generations Gallery</h2>
          <p className="text-[13px] font-sans text-slate-500 mt-1 leading-relaxed">
            Browse and download your high-end catalog renders and AI-enhanced jewelry assets. Click **Load Studio** to populate an asset into the active workspace.
          </p>
        </div>

        {allCompletedJobs.length === 0 ? (
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden flex-grow flex items-center justify-center min-h-[300px]">
            <CardContent className="text-center p-6 max-w-sm">
              <History className="size-8 text-slate-300 mx-auto mb-2.5" />
              <p className="font-bold text-slate-600 text-sm">No generations found</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Head back to the Studio to upload your jewelry pictures and generate premium marketing assets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex flex-col justify-between space-y-8">
            
            {/* LIGHTWEIGHT IMAGE GALLERY GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visibleJobs.map((job) => {
                const imageUrl = job.outputUrl || job.inputUrl;
                const formattedDate = new Date(job.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                });

                return (
                  <div 
                    key={job.id} 
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col"
                  >
                    {imageUrl ? (
                      <Image 
                        src={mediaUrl(imageUrl)} 
                        alt="" 
                        fill
                        unoptimized 
                        className="object-contain p-2 select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-500" 
                        draggable={false}
                      />
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-4 text-center">
                        <RefreshCcw className="size-4 animate-spin text-blue-500 mb-1.5" />
                        <span className="text-[10px] font-bold">Rendering...</span>
                      </div>
                    )}
                    
                    {/* Semi-transparent dark overlay on hover */}
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5 text-white z-10">
                      <div className="flex items-start justify-between gap-1">
                        <span className="inline-flex items-center rounded bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-extrabold text-blue-300 border border-blue-400/25 uppercase tracking-wider truncate max-w-[70px]">
                          {label(job.workflow)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formattedDate}</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-100 truncate">{job.projectName}</h4>
                          {job.jewelryType && (
                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{job.jewelryType}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                          {/* Load in Studio */}
                          <Link href={`/?jobId=${job.id}`} className="flex-grow">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-7 w-full text-[9px] font-sans font-bold flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer"
                            >
                              <ArrowUpRight className="size-3" />
                              <span>Load Studio</span>
                            </Button>
                          </Link>
                          
                          {/* Download output */}
                          {job.outputUrl && (
                            <a 
                              href={mediaUrl(job.outputUrl)} 
                              download={`render-${job.id}.png`} 
                              onClick={(e) => e.stopPropagation()} 
                              target="_blank" 
                              rel="noreferrer"
                            >
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="h-7 w-7 p-0 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white border-0 cursor-pointer shrink-0"
                                title="Download AI Render"
                              >
                                <Download className="size-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LOAD MORE PAGINATION TRIGGERS */}
            {allCompletedJobs.length > visibleCount && (
              <div className="pt-4 flex justify-center">
                <Button 
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  variant="outline" 
                  className="h-10 px-6 border-slate-200 hover:bg-slate-100 text-[13px] font-sans font-semibold text-slate-700 bg-white transition-colors"
                >
                  <RefreshCcw className="mr-1.5 size-3.5" />
                  Load More Generations
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
