import React, { useState } from "react";
import { ImageMetadata, GitCDNSettings } from "../types";
import { Search, Folder, Copy, Check, Trash2, ExternalLink, Tag, Lock } from "lucide-react";

interface GalleryProps {
  images: ImageMetadata[];
  folders: string[];
  activeFolder: string;
  onSelectFolder: (folder: string) => void;
  onDeleteImage: (image: ImageMetadata) => Promise<void>;
  githubConfigured: boolean;
  settings: GitCDNSettings | null;
  encryptedToken?: string;
}

export default function Gallery({ 
  images, 
  folders, 
  activeFolder, 
  onSelectFolder, 
  onDeleteImage, 
  githubConfigured, 
  settings,
  encryptedToken
}: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (e: React.MouseEvent, img: ImageMetadata) => {
    e.stopPropagation(); // Avoid triggering card modal popup
    if (!githubConfigured) {
      alert("GitHub credentials must be configured first inside settings to authorize asset deletes!");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently purge ${img.name} from the repository and GitHub branch? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(img.id);
      await onDeleteImage(img);
      if (selectedImage?.id === img.id) {
        setSelectedImage(null);
      }
    } catch (err: any) {
      alert(`Delete operation failed: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter images based on selected folder and search query (matches name or tags)
  const filteredImages = images.filter(img => {
    const matchesFolder = activeFolder === "all" || img.folder === activeFolder;
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return matchesFolder;

    const matchesName = img.name.toLowerCase().includes(cleanQuery) || img.originalName.toLowerCase().includes(cleanQuery);
    const matchesTag = img.tags?.some(tag => tag.toLowerCase().includes(cleanQuery)) || false;

    return matchesFolder && (matchesName || matchesTag);
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header and folder tabs combo */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Folder pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectFolder("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${activeFolder === "all" ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-600/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            All Areas ({images.length})
          </button>
          {folders.map(f => {
            const count = images.filter(img => img.folder === f).length;
            return (
              <button
                key={f}
                onClick={() => onSelectFolder(f)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none capitalize ${activeFolder === f ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-600/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search keywords or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 placeholder-slate-400 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Media Grid */}
      {filteredImages.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
          <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No media pointers found</h3>
          <p className="text-slate-500 text-xs mt-1">Refine your query filters or head to the Upload Center to add assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden group hover:border-slate-300 hover:shadow-md transition duration-350 cursor-pointer relative flex flex-col justify-between"
            >
              {/* Blur Hover visual effects + Image wrapper */}
              <div className="aspect-video w-full bg-slate-50 overflow-hidden relative border-b border-slate-100">
                <img
                  src={img.url}
                  alt={img.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  loading="lazy"
                  onError={(e) => {
                    if (settings && (settings.githubToken || encryptedToken)) {
                      const tokenPart = encryptedToken ? `token=${encryptedToken}` : `githubToken=${settings.githubToken}`;
                      const fallbackUrl = `/api/proxy-image?githubOwner=${settings.githubOwner}&githubRepo=${settings.githubRepo}&githubBranch=${settings.githubBranch || "main"}&githubPath=${encodeURIComponent(img.githubPath)}&${tokenPart}`;
                      if (e.currentTarget.src !== fallbackUrl) {
                        e.currentTarget.src = fallbackUrl;
                      }
                    }
                  }}
                />

                {/* Direct copy floating trigger */}
                <div 
                  className="absolute top-3 right-3 flex gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition duration-300 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => copyToClipboard(getRawCdnUrl(img), `${img.id}-cdn`)}
                    className="p-1.5 hover:bg-slate-50 text-slate-550 hover:text-blue-600 rounded transition cursor-pointer"
                    title="Copy Public Raw CDN URL (Returns 404 in browser if repo is Private)"
                  >
                    {copiedId === `${img.id}-cdn` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(img.url, `${img.id}-proxy`)}
                    className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded transition cursor-pointer"
                    title="Copy Secure Authenticated Short Link (Ideal for Private & Public repos)"
                  >
                    {copiedId === `${img.id}-proxy` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, img)}
                    disabled={deletingId === img.id}
                    className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition cursor-pointer"
                    title="Purge Image"
                  >
                    {deletingId === img.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Subtitle tag indicator */}
                {img.folder && (
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-white/90 text-blue-600 border border-slate-200 shadow-sm capitalize">
                    {img.folder}
                  </span>
                )}
              </div>

              {/* Title & Dimension indicators */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-left">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition" title={img.name}>
                    {img.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate" title={img.originalName}>
                    {img.originalName}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-450 pt-2 border-t border-slate-100 font-medium">
                  <span>{img.width} × {img.height} • {img.format.toUpperCase()}</span>
                  <span>{formatSize(img.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Immersive View Details Dialog Overlay Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden grid grid-cols-1 md:grid-cols-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Left Image Screen */}
            <div className="md:col-span-3 bg-slate-55 flex items-center justify-center relative min-h-[250px] md:min-h-[450px] border-r border-slate-100">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                referrerPolicy="no-referrer"
                className="max-h-[50vh] md:max-h-[80vh] w-auto max-w-full object-contain p-4"
                onError={(e) => {
                  if (settings && (settings.githubToken || encryptedToken)) {
                    const tokenPart = encryptedToken ? `token=${encryptedToken}` : `githubToken=${settings.githubToken}`;
                    const fallbackUrl = `/api/proxy-image?githubOwner=${settings.githubOwner}&githubRepo=${settings.githubRepo}&githubBranch=${settings.githubBranch || "main"}&githubPath=${encodeURIComponent(selectedImage.githubPath)}&${tokenPart}`;
                    if (e.currentTarget.src !== fallbackUrl) {
                      e.currentTarget.src = fallbackUrl;
                    }
                  }
                }}
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 px-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Open direct raw CDN URL (returns 404 in browser if repository is Private)"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-550" />
                  Public CDN
                </a>
                <a
                  href={`${window.location.origin}/api/proxy-image?githubOwner=${settings?.githubOwner}&githubRepo=${settings?.githubRepo}&githubBranch=${settings?.githubBranch || "main"}&githubPath=${encodeURIComponent(selectedImage.githubPath)}&${encryptedToken ? `token=${encryptedToken}` : `githubToken=${settings?.githubToken || ""}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-xl border border-amber-200 shadow-sm transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Open secure authenticated proxy link (guaranteed to load)"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Secure View
                </a>
              </div>
            </div>

            {/* Right Information panel */}
            <div className="md:col-span-2 p-6 flex flex-col justify-between bg-slate-50/50 overflow-y-auto">
              <div className="space-y-6">
                {/* Header title */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 pr-4 min-w-0 text-left">
                    <h3 className="text-sm font-extrabold text-slate-800 truncate" title={selectedImage.name}>{selectedImage.name}</h3>
                    <p className="text-[10px] text-slate-400 truncate" title={selectedImage.originalName}>{selectedImage.originalName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1 px-2.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer transition font-bold"
                  >
                    ×
                  </button>
                </div>

                {/* File Properties metadata */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left font-sans">Asset Metadata</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-150 text-left shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Resolution</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedImage.width} × {selectedImage.height}</span>
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-150 text-left shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Optimized size</span>
                      <span className="font-bold text-slate-700 font-mono">{formatSize(selectedImage.size)}</span>
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-150 text-left shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Directory folder</span>
                      <span className="font-bold text-blue-600 font-mono truncate block capitalize">{selectedImage.folder || "uploads"}</span>
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-150 text-left shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-semibold block">Date committed</span>
                      <span className="font-bold text-slate-700 font-mono block truncate">{formatDate(selectedImage.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Gemini AI Auto Tags */}
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div className="space-y-2 text-left">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 font-sans">
                      <Tag className="w-3 h-3 text-blue-500" />
                      Gemini Auto-Catalog Labels
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedImage.tags.map((tag, idx) => (
                        <span key={idx} className="bg-blue-50 border border-blue-100 text-blue-600 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paths and code injections links block */}
                <div className="space-y-4 pt-2 text-left">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Secure Authenticated Proxy URL (Short)
                    </h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">✅ Extremely short and guaranteed to load for both Public and Private repositories.</p>
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex items-center justify-between gap-2 min-w-0 text-slate-705 font-mono text-[10px] truncate select-all shadow-2xs mt-1">
                      <span className="truncate flex-1 font-medium text-slate-750">{selectedImage.url}</span>
                      <button
                        onClick={() => copyToClipboard(selectedImage.url, "modal-url")}
                        className="p-1 px-1.5 bg-white hover:bg-slate-50 text-slate-500 rounded border border-slate-200 transition cursor-pointer"
                        title="Copy Secure Short URL"
                      >
                        {copiedId === "modal-url" ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Public CDN URL (Raw/Direct)</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">⚠️ Direct CDN link. Returns 404 in browser if your GitHub repository is Private.</p>
                    <div className="bg-white p-3 rounded-xl border border-slate-150 flex items-center justify-between gap-2 min-w-0 text-slate-705 font-mono text-[10px] truncate select-all shadow-2xs mt-1">
                      <span className="truncate flex-1 font-medium">{getRawCdnUrl(selectedImage)}</span>
                      <button
                        onClick={() => copyToClipboard(getRawCdnUrl(selectedImage), "modal-cdn-raw")}
                        className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-200 transition cursor-pointer"
                        title="Copy Public CDN URL"
                      >
                        {copiedId === "modal-cdn-raw" ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Backup Secure Proxy URL (Long)
                    </h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">🔄 Stateless fallback link encoding credentials directly in the request path.</p>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 min-w-0 text-slate-705 font-mono text-[10px] truncate select-all shadow-2xs mt-1">
                      <span className="truncate flex-1 font-medium text-slate-600">
                        {`${window.location.origin}/api/proxy-image?githubOwner=${settings?.githubOwner}&githubRepo=${settings?.githubRepo}&githubBranch=${settings?.githubBranch || "main"}&githubPath=${encodeURIComponent(selectedImage.githubPath)}&${encryptedToken ? `token=${encryptedToken}` : `githubToken=${settings?.githubToken || ""}`}`}
                      </span>
                      <button
                        onClick={() => {
                          const tokenPart = encryptedToken ? `token=${encryptedToken}` : `githubToken=${settings?.githubToken || ""}`;
                          const proxyUrl = `${window.location.origin}/api/proxy-image?githubOwner=${settings?.githubOwner}&githubRepo=${settings?.githubRepo}&githubBranch=${settings?.githubBranch || "main"}&githubPath=${encodeURIComponent(selectedImage.githubPath)}&${tokenPart}`;
                          copyToClipboard(proxyUrl, "modal-proxy-url-long");
                        }}
                        className="p-1 px-1.5 bg-white hover:bg-slate-50 text-slate-550 rounded border border-slate-200 transition cursor-pointer"
                        title="Copy Long Backup Secure Link"
                      >
                        {copiedId === "modal-proxy-url-long" ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom footer button arrays */}
              <div className="border-t border-slate-150 pt-6 mt-6 flex justify-between items-center">
                <button
                  onClick={(e) => handleDelete(e, selectedImage)}
                  disabled={deletingId === selectedImage.id}
                  className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-650 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  {deletingId === selectedImage.id ? "Purging GitHub Node..." : "Purge Asset"}
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-250 text-xs font-bold cursor-pointer transition shadow-2xs"
                >
                  Dismiss view
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
