import React, { useRef, useState } from "react";
import { Upload, FileImage, CheckCircle, AlertCircle, RefreshCw, Sparkles, Sliders } from "lucide-react";
import { GitCDNSettings } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  folder: string;
  originalSize: number;
  compressedSize?: number;
  status: "queued" | "compressing" | "uploading" | "done" | "failed";
  progress: number;
  error?: string;
  url?: string;
  tags?: string[];
}

interface UploadZoneProps {
  settings: GitCDNSettings;
  onUploadSuccess: (metadata: any) => void;
  folders: string[];
}

export default function UploadZone({ settings, onUploadSuccess, folders }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("uploads");
  const [customFolder, setCustomFolder] = useState<string>("");
  const [quality, setQuality] = useState<number>(settings.imageQuality || 80);
  const [useAI, setUseAI] = useState<boolean>(settings.useAiTagging || false);
  const [maxWidth, setMaxWidth] = useState<number>(1920); // Maximum boundary limit
  const [showConfig, setShowConfig] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (fileList: File[]) => {
    // Filter non-images
    const imageFiles = fileList.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      alert("Only image files are permitted for hosting!");
      return;
    }

    const folderToUse = selectedFolder === "custom" ? (customFolder || "custom") : selectedFolder;

    const newItems: UploadQueueItem[] = imageFiles.map(file => {
      // Remove extensions for clean filenames
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: nameWithoutExt.toLowerCase().replace(/[^a-z0-9_\-]/g, "_"),
        folder: folderToUse,
        originalSize: file.size,
        status: "queued",
        progress: 0,
      };
    });

    setQueue(prev => [...prev, ...newItems]);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // WebP Image Compression via HTML Canvas
  const compressImageToWebP = (file: File, quality: number, maxW: number): Promise<{ base64: string; width: number; height: number; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Resize if exceeding maxWidth
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not construct 2D Context for canvas operations"));
            return;
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed WebP
          const qualityFactor = quality / 100;
          const dataUrl = canvas.toDataURL("image/webp", qualityFactor);
          
          // Compute exact size in bytes
          const base64Clean = dataUrl.split(",")[1];
          const approxSizeBytes = Math.floor(base64Clean.length * 0.75);

          resolve({
            base64: dataUrl,
            width,
            height,
            size: approxSizeBytes
          });
        };
        img.onerror = () => reject(new Error("Failed to load image file into engine"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file buffer"));
      reader.readAsDataURL(file);
    });
  };

  // Perform continuous queue processing
  const processUpload = async (item: UploadQueueItem) => {
    if (!settings.githubToken || !settings.githubRepo || !settings.githubOwner) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "failed", error: "Please configure GitHub properties first inside Settings." } : q));
      return;
    }

    try {
      // 1. Enter compression state
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "compressing", progress: 20 } : q));
      
      const compressed = await compressImageToWebP(item.file, quality, maxWidth);

      // 2. Enter uploading state
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading", progress: 45, compressedSize: compressed.size } : q));

      const payload = {
        name: item.name,
        originalName: item.file.name,
        base64Data: compressed.base64,
        folder: item.folder,
        githubToken: settings.githubToken,
        githubRepo: settings.githubRepo,
        githubOwner: settings.githubOwner,
        githubBranch: settings.githubBranch || "main",
        cdnMode: settings.cdnMode || "jsdelivr",
        useAiTagging: useAI,
        width: compressed.width,
        height: compressed.height,
        size: compressed.size,
      };

      // 3. Post to full-stack intermediate backend
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Upload HTTP error: ${res.status} ${res.statusText}`;
        try {
          const text = await res.text();
          if (text.trim().startsWith("<")) {
            msg = `Routing/Deployment Error (${res.status}): The server returned an HTML page. Please verify your Vercel/serverless API configurations and make sure backend endpoints are active.`;
          } else {
            try {
              const parsed = JSON.parse(text);
              msg = parsed.error || msg;
            } catch {
              msg = text || msg;
            }
          }
        } catch {}
        throw new Error(msg);
      }

      const result = await res.json();

      // Submit metadata to top levels for writing to firestore in App lifecycle
      onUploadSuccess(result);

      // 4. Set successful completion status
      setQueue(prev => prev.map(q => q.id === item.id ? {
        ...q,
        status: "done",
        progress: 100,
        url: result.url,
        tags: result.tags
      } : q));

    } catch (err: any) {
      console.error(err);
      setQueue(prev => prev.map(q => q.id === item.id ? {
        ...q,
        status: "failed",
        progress: 0,
        error: err.message || "Upload process collapsed"
      } : q));
    }
  };

  const startBatchUpload = () => {
    const nextToUpload = queue.filter(item => item.status === "queued" || item.status === "failed");
    nextToUpload.forEach(item => {
      processUpload(item);
    });
  };

  const retryItem = (id: string) => {
    const item = queue.find(q => q.id === id);
    if (item) {
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "queued", progress: 0, error: undefined } : q));
      processUpload({ ...item, status: "queued", progress: 0, error: undefined });
    }
  };

  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const clearDoneItems = () => {
    setQueue(prev => prev.filter(q => q.status !== "done"));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " Bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Upload Center
          </h1>
          <p className="text-sm text-slate-500">Optimize and host images securely via the GitHub Storage pipeline</p>
        </div>

        <div className="flex gap-2">
          {queue.some(q => q.status === "done") && (
            <button
              onClick={clearDoneItems}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition border border-slate-200 cursor-pointer shadow-sm"
            >
              Clear Completed
            </button>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg border border-blue-150 transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            Resize & Optimization
          </button>
        </div>
      </div>

      {/* Advanced Image Optimization Configuration Dropdown */}
      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm text-left"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">WebP Quality ({quality}%)</label>
              <input 
                type="range" 
                min="30" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-500 block font-medium">Lower sizes with balanced structural clarity. Recommended: 80%</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Max Boundary Width ({maxWidth}px)</label>
              <select
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={1080}>1080px (FHD Landscape)</option>
                <option value={1200}>1200px (SaaS App Standard)</option>
                <option value={1920}>1920px (Desktop Fullscreen)</option>
                <option value={2560}>2560px (2K Ultra Quality)</option>
                <option value={10000}>Resize Disabled (Limitless)</option>
              </select>
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">Gemini AI Tagging</p>
                    <p className="text-[10px] text-slate-500">Auto-tag content on upload</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useAI} 
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target Directory & File Grab Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Directory Selector Side panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm text-left">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-sans">Target Directory</label>
          <div className="space-y-2">
            {folders.map(f => (
              <label 
                key={f}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm transition cursor-pointer select-none ${selectedFolder === f ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50 text-slate-500'}`}
              >
                <input 
                  type="radio" 
                  name="uploadFolder" 
                  value={f}
                  checked={selectedFolder === f}
                  onChange={() => setSelectedFolder(f)}
                  className="hidden"
                />
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span className="truncate">{f}</span>
              </label>
            ))}

            <label 
              className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm transition cursor-pointer select-none ${selectedFolder === "custom" ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50 text-slate-500'}`}
            >
              <input 
                type="radio" 
                name="uploadFolder" 
                value="custom"
                checked={selectedFolder === "custom"}
                onChange={() => setSelectedFolder("custom")}
                className="hidden"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>Create directory...</span>
            </label>

            {selectedFolder === "custom" && (
              <input
                type="text"
                placeholder="Directory name (e.g. blog)"
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ""))}
                className="w-full px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            )}
          </div>
        </div>

        {/* Drag n Drop Upload Area */}
        <div className="lg:col-span-3 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed p-10 text-center flex flex-col items-center justify-center min-h-[220px] transition duration-300 cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-white hover:bg-slate-50/40'}`}
            onClick={triggerFileInput}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 border border-blue-100 mb-4 animate-pulse">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-slate-800 text-base font-extrabold">Drag and drop media here</h3>
            <p className="text-slate-400 text-xs mt-1 mb-4">Accepts PNG, JPG, BMP, WebP, SVG and raw images</p>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              className="px-5 py-2 hover:bg-blue-700 bg-blue-600 font-bold text-xs text-slate-100 rounded-lg transition cursor-pointer shadow shadow-blue-500/10"
            >
              Browse Local Drives
            </button>
          </div>
        </div>
      </div>

      {/* Upload Queue Section */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm text-left">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Queue Inventory ({queue.length} files pending)
            </h3>
            {queue.some(q => q.status === "queued" || q.status === "failed") && (
              <button 
                onClick={startBatchUpload}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-750 text-slate-100 rounded-lg text-xs font-bold cursor-pointer transition shadow"
              >
                Incorporate all assets
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {queue.map((item) => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-slate-500 flex-shrink-0">
                    <FileImage className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-800 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <span className="text-[10px] text-slate-450 truncate font-mono font-bold uppercase">({item.folder})</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium">
                      <span>Source: {formatSize(item.originalSize)}</span>
                      {item.compressedSize && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">Optimized WebP: {formatSize(item.compressedSize)} (-{Math.round((1 - (item.compressedSize / item.originalSize)) * 100)}%)</span>
                        </>
                      )}
                    </div>

                    {item.status === "failed" && item.error && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1.5 bg-rose-50/60 p-2 rounded-lg border border-rose-105 select-text max-w-lg leading-normal font-sans">
                        <span className="font-extrabold uppercase text-[9px] tracking-wider text-rose-800 block mb-0.5">Misfire Reason</span>
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar or State indicator */}
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="w-32 hidden md:block">
                    {item.status === "uploading" && (
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.progress}%` }}></div>
                      </div>
                    )}
                    {item.status === "compressing" && (
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `50%` }}></div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "queued" && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                        Queued
                      </span>
                    )}

                    {item.status === "compressing" && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1 animate-pulse">
                        Compressing
                      </span>
                    )}

                    {item.status === "uploading" && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-105 flex items-center gap-1">
                        Uploading
                      </span>
                    )}

                    {item.status === "done" && (
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Complete
                        </span>
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-[9px] text-slate-550 truncate max-w-[124px] mt-0.5 font-medium">Tags: {item.tags.join(", ")}</span>
                        )}
                      </div>
                    )}

                    {item.status === "failed" && (
                      <span 
                        className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 flex items-center gap-1 cursor-help"
                        title={item.error}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-1 ml-2">
                      {(item.status === "queued" || item.status === "failed") && (
                        <button
                          onClick={() => processUpload(item)}
                          className="p-1 hover:bg-slate-100 rounded transition text-blue-600 cursor-pointer"
                          title="Upload asset"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status === "failed" && (
                        <button
                          onClick={() => retryItem(item.id)}
                          className="p-1 hover:bg-slate-100 rounded transition text-amber-600 cursor-pointer"
                          title="Retry"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status !== "uploading" && item.status !== "compressing" && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800 cursor-pointer font-bold"
                          title="Remove from queue"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
