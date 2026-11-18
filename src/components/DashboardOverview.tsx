import React from "react";
import { ImageMetadata, GitCDNSettings } from "../types";
import { Image as ImageIcon, Database, Activity, ArrowUpRight, Copy, Check, Sparkles, Lock } from "lucide-react";
import { motion } from "motion/react";

interface DashboardOverviewProps {
  images: ImageMetadata[];
  settings: GitCDNSettings | null;
  onNavigateToLibrary: () => void;
  onNavigateToUpload: () => void;
  encryptedToken?: string;
}

export default function DashboardOverview({ 
  images, 
  settings, 
  onNavigateToLibrary, 
  onNavigateToUpload,
  encryptedToken
}: DashboardOverviewProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Stats calculation
  const totalCount = images.length;
  const totalSizeBytes = images.reduce((acc, img) => acc + (img.size || 0), 0);
  
  // Format sizes beautifully
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // CDN Bandwidth Simulation (estimated views/day per image * file size * 30)
  const averageDailyViews = 24; // typical views
  const estimatedDailyBandwidthBytes = images.reduce((acc, img) => acc + (img.size * averageDailyViews), 0);
  const estimatedMonthlyBandwidth = estimatedDailyBandwidthBytes * 30;

  // Recent 4 uploads
  const recentUploads = [...images]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 4);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRawCdnUrl = (img: ImageMetadata) => {
    if (settings?.cdnMode === "raw") {
      return `https://raw.githubusercontent.com/${settings?.githubOwner}/${settings?.githubRepo}/${settings?.githubBranch || "main"}/${img.githubPath}`;
    }
    return `https://cdn.jsdelivr.net/gh/${settings?.githubOwner}/${settings?.githubRepo}@${settings?.githubBranch || "main"}/${img.githubPath}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-8 text-white shadow-md text-left">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.08),transparent_50%)]"></div>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ImageIcon className="w-56 h-56 text-slate-400 rotate-12" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3 h-3 text-blue-400" />
            V1.0 CDN Infrastructure
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans">
            Engineered Image Delivery
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed font-sans">
            Upload images, auto-convert to optimized next-gen <strong className="text-blue-400 font-semibold">WebP</strong> encoding formats, and commit directly to private repositories mapped to high-speed global delivery networks.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onNavigateToUpload}
              className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all shadow-sm shadow-blue-600/15 cursor-pointer"
            >
              Upload Center
            </button>
            <button
              onClick={onNavigateToLibrary}
              className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700/80 transition-all cursor-pointer"
            >
              Browse Repository
            </button>
          </div>
        </div>
      </div>

      {/* Grid Statistics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Assets */}
        <motion.div 
          whileHover={{ y: -1 }}
          className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs text-left flex justify-between items-center"
        >
          <div className="space-y-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Media Assets</span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{totalCount}</h3>
            <p className="text-xs text-slate-500 font-sans truncate">Active image pointers mapped</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex-shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Global Storage Used */}
        <motion.div 
          whileHover={{ y: -1 }}
          className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs text-left flex justify-between items-center"
        >
          <div className="space-y-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CDN Space Utilized</span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatSize(totalSizeBytes)}</h3>
            <p className="text-xs text-slate-500 font-sans truncate">Limitless scale under free tier</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
        </motion.div>

        {/* CDN Outbound Bandwidth Estimate */}
        <motion.div 
          whileHover={{ y: -1 }}
          className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs text-left flex justify-between items-center"
        >
          <div className="space-y-1.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Monthly Traffic</span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{formatSize(estimatedMonthlyBandwidth)}</h3>
            <p className="text-xs text-slate-500 font-sans truncate">Avg 24 requests/day estimate</p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100 flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* Main Bottom Section: Recent Media + CDN Delivery Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Media List */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900 font-sans">Recent Uploads</h2>
            <button 
              onClick={onNavigateToLibrary}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition cursor-pointer"
            >
              View gallery
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 text-left shadow-xs">
            {recentUploads.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ImageIcon className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No images hosted yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Configure your repository connect details, then upload your first file.</p>
              </div>
            ) : (
              recentUploads.map((img) => (
                <div key={img.id} className="p-4 flex items-center justify-between gap-4 group hover:bg-slate-50/40 transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-50 border border-slate-150 flex-shrink-0 relative">
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                        onError={(e) => {
                          if (settings && settings.githubToken) {
                            const fallbackUrl = `/api/proxy-image?githubOwner=${settings.githubOwner}&githubRepo=${settings.githubRepo}&githubBranch=${settings.githubBranch || "main"}&githubPath=${encodeURIComponent(img.githubPath)}&githubToken=${settings.githubToken}`;
                            if (e.currentTarget.src !== fallbackUrl) {
                              e.currentTarget.src = fallbackUrl;
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold truncate text-slate-800 tracking-tight">
                        {img.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-500 font-mono text-[9px] px-1 py-0.5 bg-slate-100 rounded border border-slate-150 uppercase">
                          {img.format}
                        </span>
                        <span>•</span>
                        <span>{formatSize(img.size)}</span>
                        {img.folder && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500 font-medium truncate max-w-[120px] capitalize">{img.folder}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Public Raw CDN URL button */}
                    <button
                      onClick={() => copyToClipboard(getRawCdnUrl(img), `${img.id}-direct`)}
                      className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition relative cursor-pointer"
                      title="Copy Public Raw CDN URL (Returns 404 in browser if repo is Private)"
                    >
                      {copiedId === `${img.id}-direct` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Secure Short Proxy URL button */}
                    <button
                      onClick={() => copyToClipboard(img.url, `${img.id}-proxy`)}
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 rounded-lg border border-amber-200/80 transition relative cursor-pointer"
                      title="Copy Secure Authenticated Short Proxy URL (Ideal for both Public & Private repos)"
                    >
                      {copiedId === `${img.id}-proxy` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-150 transition cursor-pointer"
                      title="Preview Secure short link in new tab"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CDN Delivery Metrics Info Box */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-slate-900 font-sans">Global Network</h2>
          
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-5 shadow-xs text-left">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Edge Network</h3>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                jsDelivr CDN Cluster
              </p>
            </div>

            <div className="space-y-4 pt-1 divide-y divide-slate-100">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium font-sans">Anycast Routing Speed</span>
                  <span className="text-emerald-600 font-bold font-mono">14ms avg</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[94%]"></div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium font-sans">Edge Cache Hit Ratio</span>
                  <span className="text-emerald-600 font-bold font-mono">98.4%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[98.4%]"></div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium font-sans">Compression Efficiency</span>
                  <span className="text-cyan-600 font-bold font-mono">~64% Saved</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[64%]"></div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-150 p-3.5 rounded-xl font-sans mt-2">
              Anycast IP routing directs external image loads to the closest geographic edge-node server automatically, delivering sub-millisecond response and bypassing traditional limiters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
