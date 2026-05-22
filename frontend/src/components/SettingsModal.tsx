"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Key } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/provider-settings");
        const gemini = res.data.find((p: any) => p.provider === "GEMINI");
        if (gemini?.hasApiKey) {
          setApiKey("********");
        }
      } catch (error) {
        console.error("Failed to fetch settings status", error);
      }
    };
    fetchStatus();
  }, []);

  const saveSettings = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      if (apiKey === "********") {
        onClose();
        return;
      }
      await api.post("/provider-settings/gemini", { apiKey });
      toast.success("Settings saved successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white text-slate-900 border-slate-200 shadow-xl shadow-slate-200/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-slate-900">
            <Key className="w-5 h-5 text-blue-500" />
            API Configurations
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Configure your external services and AI models here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="gemini-key" className="text-slate-700 font-medium">
              Gemini 3 Pro API Key
            </Label>
            <Input
              id="gemini-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-blue-500"
              type={apiKey === "********" ? "text" : "password"}
            />
            <p className="text-xs text-slate-400">
              Your API key is securely stored in the backend database.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20">
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
