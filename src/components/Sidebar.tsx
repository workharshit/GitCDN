import React from "react";
import { LayoutGrid, Upload, Images, Settings, BarChart3, LogOut, Disc, Cloud, RefreshCw } from "lucide-react";

type PageId = "overview" | "upload" | "library" | "analytics" | "settings";

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  userEmail?: string | null;
  onSignOut: () => void;
  onClearConfig: () => void;
  githubConfigured: boolean;
}

export default function Sidebar({ activePage, onNavigate, userEmail, onSignOut, onClearConfig, githubConfigured }: SidebarProps) {
  const menuItems = [
    { id: "overview" as PageId, label: "Console Overview", icon: LayoutGrid },
    { id: "upload" as PageId, label: "Upload Center", icon: Upload },
    { id: "library" as PageId, label: "Media Library", icon: Images },
    { id: "analytics" as PageId, label: "Traffic Analytics", icon: BarChart3 },
    { id: "settings" as PageId, label: "Configurations", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between hidden md:flex flex-shrink-0 h-screen sticky top-0 font-sans shadow-2xs">
      <div className="space-y-8">
        {/* Logo Title - Refined */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <Cloud className="w-4.5 h-4.5 fill-current" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black tracking-widest text-slate-900 uppercase">GitCDN</h2>
            <p className="text-[10px] text-blue-600 font-bold tracking-normal">RepoStorage Hub</p>
          </div>
        </div>

        {/* GitHub Pipeline Status Indicator Card */}
        <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/60 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">GitHub Sync</span>
            <span className={`w-2.5 h-2.5 rounded-full ${githubConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          </div>
          <p className="text-xs font-bold text-slate-800 tracking-tight">
            {githubConfigured ? "Sync Live & Active" : "Sync Required"}
          </p>
          <p className="text-[10px] text-slate-500 leading-normal font-medium">
            {githubConfigured ? "Secure edge connection" : "Configurations token missing"}
          </p>
        </div>

        {/* Sidebar Nav links */}
        <nav className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-4 text-left">Console</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer select-none ${isActive ? 'bg-blue-50/80 text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-900'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session Profile Footing */}
      <div className="space-y-4 pt-6 border-t border-slate-100">
        {userEmail && (
          <div className="space-y-0.5 truncate pl-1 text-left">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Operator</p>
            <p className="text-xs text-[#334155] font-semibold truncate" title={userEmail}>{userEmail}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            Purge Session
          </button>

          <button
            onClick={() => {
              if (confirm("Reset current Firebase credentials? This will wipe your connection configuration and refresh.")) {
                onClearConfig();
              }
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl text-[10px] font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            Reset Credentials
          </button>
        </div>
      </div>
    </aside>
  );
}
