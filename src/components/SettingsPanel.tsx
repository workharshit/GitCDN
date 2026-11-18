import React, { useState } from "react";
import { GitCDNSettings } from "../types";
import { Shield, Github, Check, AlertTriangle, RefreshCw, Database, Terminal, Settings } from "lucide-react";

interface SettingsPanelProps {
  settings: GitCDNSettings;
  onSaveSettings: (updated: GitCDNSettings) => Promise<void>;
}

export default function SettingsPanel({ settings, onSaveSettings }: SettingsPanelProps) {
  // GitHub States
  const [token, setToken] = useState(settings.githubToken || "");
  const [repo, setRepo] = useState(settings.githubRepo || "");
  const [owner, setOwner] = useState(settings.githubOwner || "");
  const [branch, setBranch] = useState(settings.githubBranch || "main");
  const [cdnMode, setCdnMode] = useState<"jsdelivr" | "raw">(settings.cdnMode || "jsdelivr");
  const [quality, setQuality] = useState(settings.imageQuality || 80);
  const [useAI, setUseAI] = useState(settings.useAiTagging || false);

  // Dynamic Database States
  const [dbType, setDbType] = useState<"firestore" | "realtime" | "supabase" | "mongodb" | "local">(settings.dbType || "firestore");
  const [collectionOrPath, setCollectionOrPath] = useState(settings.collectionOrPath || "images");

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseUrl || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabaseAnonKey || "");
  const [supabaseTable, setSupabaseTable] = useState(settings.supabaseTable || "images");

  // MongoDB states
  const [mongodbUrl, setMongodbUrl] = useState(settings.mongodbUrl || "");
  const [mongodbApiKey, setMongodbApiKey] = useState(settings.mongodbApiKey || "");
  const [mongodbDatabase, setMongodbDatabase] = useState(settings.mongodbDatabase || "gitcdn");
  const [mongodbCollection, setMongodbCollection] = useState(settings.mongodbCollection || "images");
  const [mongodbDataSource, setMongodbDataSource] = useState(settings.mongodbDataSource || "Cluster0");

  const [showDocModal, setShowDocModal] = useState<string | null>(null);

  // Advanced Schema Mapping Overrides States
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [keyMappingId, setKeyMappingId] = useState(settings.keyMappingId || "id");
  const [keyMappingUserId, setKeyMappingUserId] = useState(settings.keyMappingUserId || "uploadedBy");
  const [keyMappingUrl, setKeyMappingUrl] = useState(settings.keyMappingUrl || "url");
  const [keyMappingOriginalName, setKeyMappingOriginalName] = useState(settings.keyMappingOriginalName || "originalName");
  const [keyMappingGithubPath, setKeyMappingGithubPath] = useState(settings.keyMappingGithubPath || "githubPath");
  const [keyMappingFolder, setKeyMappingFolder] = useState(settings.keyMappingFolder || "folder");
  const [keyMappingSize, setKeyMappingSize] = useState(settings.keyMappingSize || "size");
  const [keyMappingWidth, setKeyMappingWidth] = useState(settings.keyMappingWidth || "width");
  const [keyMappingHeight, setKeyMappingHeight] = useState(settings.keyMappingHeight || "height");
  const [keyMappingFormat, setKeyMappingFormat] = useState(settings.keyMappingFormat || "format");
  const [keyMappingUploadedAt, setKeyMappingUploadedAt] = useState(settings.keyMappingUploadedAt || "uploadedAt");
  const [keyMappingTags, setKeyMappingTags] = useState(settings.keyMappingTags || "tags");
  const [keyMappingSha, setKeyMappingSha] = useState(settings.keyMappingSha || "sha");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Testing GitHub Connection States
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "failed">("idle");
  const [connectionError, setConnectionError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSaveSettings({
        userId: settings.userId,
        githubToken: token.trim(),
        githubRepo: repo.trim(),
        githubOwner: owner.trim(),
        githubBranch: branch.trim() || "main",
        cdnMode,
        imageQuality: Number(quality),
        useAiTagging: useAI,
        dbType,
        collectionOrPath: collectionOrPath.trim() || "images",
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        supabaseTable: supabaseTable.trim() || "images",
        mongodbUrl: mongodbUrl.trim(),
        mongodbApiKey: mongodbApiKey.trim(),
        mongodbDatabase: mongodbDatabase.trim() || "gitcdn",
        mongodbCollection: mongodbCollection.trim() || "images",
        mongodbDataSource: mongodbDataSource.trim() || "Cluster0",
        keyMappingId: keyMappingId.trim() || "id",
        keyMappingUserId: keyMappingUserId.trim() || "uploadedBy",
        keyMappingUrl: keyMappingUrl.trim() || "url",
        keyMappingOriginalName: keyMappingOriginalName.trim() || "originalName",
        keyMappingGithubPath: keyMappingGithubPath.trim() || "githubPath",
        keyMappingFolder: keyMappingFolder.trim() || "folder",
        keyMappingSize: keyMappingSize.trim() || "size",
        keyMappingWidth: keyMappingWidth.trim() || "width",
        keyMappingHeight: keyMappingHeight.trim() || "height",
        keyMappingFormat: keyMappingFormat.trim() || "format",
        keyMappingUploadedAt: keyMappingUploadedAt.trim() || "uploadedAt",
        keyMappingTags: keyMappingTags.trim() || "tags",
        keyMappingSha: keyMappingSha.trim() || "sha",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Settings preservation failed. Please verify configurations form inputs.");
    } finally {
      setSaving(false);
    }
  };

  // Run repository validation checks by contacting GitHub
  const testConnection = async () => {
    if (!token || !owner || !repo) {
      setConnectionStatus("failed");
      setConnectionError("Please populate GitHub credentials before testing connection.");
      return;
    }

    try {
      setTesting(true);
      setConnectionStatus("idle");
      const url = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GitCDN-SaaS-Console"
        }
      });

      if (res.ok) {
        setConnectionStatus("success");
      } else {
        const errText = await res.text();
        let parsedErr = "Mismatched Token permissions or Repository nonexistence.";
        try {
          const jsonErr = JSON.parse(errText);
          parsedErr = jsonErr.message || parsedErr;
        } catch {}
        setConnectionStatus("failed");
        setConnectionError(`GitHub rejection: ${parsedErr}`);
      }
    } catch (err: any) {
      setConnectionStatus("failed");
      setConnectionError(err.message || "Network timeout contacting GitHub API endpoints.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 text-left h-full pb-10">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          System Configurations
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Configure personal client environments, target repository syncs, and database schema mappings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shield advisory info */}
        <div className="p-4 bg-teal-50/55 rounded-2xl border border-teal-100 flex gap-3 text-xs text-slate-650 leading-relaxed items-start shadow-2xs">
          <Shield className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-teal-800">Decentralized Credentials Core</p>
            <p className="mt-0.5 font-sans">
              No central service hosts your configurations. Storage, sync pipelines, and keys are isolated entirely inside your private browser cache and target Firebase collections.
            </p>
          </div>
        </div>

        {/* GitHub Pipeline settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100 font-sans">
            <Github className="w-4 h-4 text-blue-600" />
            GitHub Repository Sync
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Repository Owner (Username)</label>
              <input
                type="text"
                required
                placeholder="e.g. octocat"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Repository Name</label>
              <input
                type="text"
                required
                placeholder="e.g. assets-cdn"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Branch Mapping</label>
              <input
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">CDN Delivery Mode</label>
              <select
                value={cdnMode}
                onChange={(e) => setCdnMode(e.target.value as "jsdelivr" | "raw")}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="jsdelivr">jsdelivr (Hyper Express Edge Delivery)</option>
                <option value="raw">raw.githubusercontent.com (Direct Dev Source)</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                required
                placeholder="ghp_xxx..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-850 outline-none focus:border-blue-500 placeholder-slate-300 font-mono"
              />
              <span className="text-[10px] text-slate-400 block font-normal font-sans">Requires 'repo' scope authorizations to commit image formats.</span>
            </div>
          </div>

          {/* Diagnostics block */}
          <div className="pt-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-850">Sync Check</p>
              <p className="text-[10px] text-slate-400 font-medium">Test handshake configurations against GitHub systems</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {connectionStatus === "success" && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-500 animate-pulse" /> Connection Secure!
                </span>
              )}
              {connectionStatus === "failed" && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1 bg-red-50 border border-red-100 p-1.5 rounded-lg max-w-[240px] truncate" title={connectionError}>
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Handshake failed
                </span>
              )}
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1.5 transition ml-auto md:ml-0 shadow-2xs"
              >
                {testing && <RefreshCw className="w-3 h-3 animate-spin" />}
                Test Integration
              </button>
            </div>
          </div>
        </div>

        {/* Database configuration destination setup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-sans">
              <Database className="w-4 h-4 text-blue-600" />
              Target Database Registry
            </h3>
            
            <button
              type="button"
              onClick={() => setShowDocModal(showDocModal === dbType ? null : dbType)}
              className="text-xs text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1.5 cursor-pointer underline decoration-dotted font-sans select-none"
            >
              📖 View {dbType.toUpperCase()} Connect Guide
            </button>
          </div>

          {/* Setup Guide Step-by-Step Info Panel */}
          {showDocModal && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 text-xs text-slate-700 space-y-4 animate-fade-in font-sans">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 text-sm flex items-center gap-1">
                  💡 Step-by-Step Setup: {showDocModal.toUpperCase()} Mapping
                </span>
                <button
                  type="button"
                  onClick={() => setShowDocModal(null)}
                  className="px-2 py-0.5 bg-white text-slate-500 hover:text-slate-800 rounded border border-slate-200 text-[10px] font-bold"
                >
                  Close Guide
                </button>
              </div>

              {showDocModal === "local" && (
                <div className="space-y-2 text-left">
                  <p className="font-semibold text-slate-800">No database required! Perfect for immediate zero-config testing:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-sans">
                    <li>Select <strong className="text-slate-850">Local Cache & Offline Mode</strong> as your goal target.</li>
                    <li>The system saves standard photographic metadata records inside your secure browser's local sandbox partition.</li>
                    <li>Works fully serverless and protects privacy! Highly recommended for offline tests.</li>
                  </ol>
                </div>
              )}

              {showDocModal === "supabase" && (
                <div className="space-y-3.5 text-left">
                  <p className="font-semibold text-slate-800">Follow these steps to connect your custom Supabase table:</p>
                  <ol className="list-decimal list-inside space-y-2.5 text-slate-600 font-sans">
                    <li>Log in to your <strong className="text-slate-800">Supabase Dashboard</strong> at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">https://supabase.com</a>.</li>
                    <li>Navigate to <strong className="text-slate-800">Project Settings &gt; API</strong> and copy your <strong className="text-indigo-700">Project URL</strong> and <strong className="text-indigo-700">anon public key</strong>.</li>
                    <li>Open the <strong className="text-slate-800">SQL Editor</strong> on Supabase and run this script to instantly create a compliant SQL image repository table:
                      <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed select-all">
{`create table images (
  id text primary key,
  "uploadedBy" text not null,
  url text not null,
  "originalName" text,
  "githubPath" text,
  folder text,
  size int8,
  width int4,
  height int4,
  format text,
  "uploadedAt" text,
  tags jsonb,
  sha text
);`}
                      </pre>
                    </li>
                    <li>Enable Row-Level Security (<strong className="text-slate-800">RLS</strong>) on Supabase, or insert a public/authenticated INSERT &amp; SELECT policy targeting the <code className="font-mono bg-white px-1 py-0.5 rounded border">images</code> table.</li>
                    <li>Fill the input form below with your credentials and save configurations to activate!</li>
                  </ol>
                </div>
              )}

              {showDocModal === "mongodb" && (
                <div className="space-y-3 text-left">
                  <p className="font-semibold text-slate-800">Follow these steps to synchronize metadata with MongoDB Atlas Data API:</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 font-sans">
                    <li>Log in at your account at <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">https://cloud.mongodb.com</a>.</li>
                    <li>Navigate to the <strong className="text-slate-800">Data Services &gt; Data API</strong> section on the left sidebar.</li>
                    <li>Enable the Data API for your target cluster (e.g. <code className="bg-white px-1 py-0.5 border font-mono">Cluster0</code>).</li>
                    <li>Click <strong className="text-slate-800">"Create API Key"</strong>, name it <code className="bg-white px-1 py-0.5 border font-mono">GitCDN-Proxy-SaaS</code>, and copy your API Key.</li>
                    <li>Copy your MongoDB Data API <strong className="text-indigo-700">URL Endpoint</strong> matching your cluster location.</li>
                    <li>Provide your target Database name, Collection name, and Cluster Datasource name in the inputs under selection to initiate real-time logging!</li>
                  </ol>
                </div>
              )}

              {showDocModal === "firestore" && (
                <div className="space-y-1.5 text-left">
                  <p className="font-semibold text-slate-800">Using Google Cloud Firestore integration:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>This console leverages your pre-configured Firebase project settings verified during setup phase.</li>
                    <li>Ensure you have provisioned <strong className="text-slate-800">Cloud Firestore</strong> inside your Firebase Console in Test / Public mapping mode.</li>
                    <li>By default, records are filed inside the Collection specified under Collection ID.</li>
                  </ol>
                </div>
              )}

              {showDocModal === "realtime" && (
                <div className="space-y-1.5 text-left">
                  <p className="font-semibold text-slate-800">Using Firebase Realtime Database integration:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>Logs metadata inside a nested JSON structure at the root paths configured in settings.</li>
                    <li>Ensure your Realtime DB security rules allow read/write operations for authenticated profiles.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Database System Target</label>
              <select
                value={dbType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDbType(val);
                  if (val === "local" || val === "firestore" || val === "realtime") {
                    setCollectionOrPath(val === "realtime" ? "/uploaded-assets" : "images");
                  } else if (val === "supabase") {
                    setCollectionOrPath("images");
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option value="local">Local Cache & Offline Mode (Fully Serverless)</option>
                <option value="firestore">Cloud Firestore (Firebase Documents Base)</option>
                <option value="realtime">Realtime Database (Firebase JSON Tree)</option>
                <option value="supabase">Supabase (PostgreSQL engine via Server Proxy)</option>
                <option value="mongodb">MongoDB Atlas (JSON Documents via Server API)</option>
              </select>
            </div>

            {/* Render collections or paths for Firebase */}
            {(dbType === "firestore" || dbType === "realtime") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  {dbType === "firestore" ? "Firestore Collection ID" : "Realtime Database Root Node Path"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={dbType === "firestore" ? "e.g. images" : "e.g. /uploaded-assets"}
                  value={collectionOrPath}
                  onChange={(e) => setCollectionOrPath(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 font-medium font-sans"
                />
              </div>
            )}

            {/* Offline Local cache Alert banner */}
            {dbType === "local" && (
              <div className="p-4 bg-slate-50 border border-slate-250 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-600 md:col-span-2">
                <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="font-extrabold text-blue-900">Sandbox Key-Value Local Cache Active</p>
                  <p className="mt-0.5 font-sans leading-relaxed text-[11px]">
                    No database integrations configured. Your upload indexes and folder divisions will persist safely in your local browser sandbox context unique to your logged-in profile. Complete privacy.
                  </p>
                </div>
              </div>
            )}

            {/* Supabase customized setup fields */}
            {dbType === "supabase" && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-0.5">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supabase Project URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://xyz.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supabase Table Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. images"
                    value={supabaseTable}
                    onChange={(e) => setSupabaseTable(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supabase Public Anon Key</label>
                  <input
                    type="password"
                    required
                    placeholder="eyJhbGciOi..."
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* MongoDB Atlas Setup Fields */}
            {dbType === "mongodb" && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-purple-50/10 border border-purple-100 rounded-xl space-y-0.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MongoDB Data API Endpoint URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://ap-southeast-1.aws.data.mongodb-api.com/app/data-xyz/endpoint/data/v1"
                    value={mongodbUrl}
                    onChange={(e) => setMongodbUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cluster Datasource Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Cluster0"
                    value={mongodbDataSource}
                    onChange={(e) => setMongodbDataSource(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Database Name</label>
                  <input
                    type="text"
                    required
                    placeholder="gitcdn"
                    value={mongodbDatabase}
                    onChange={(e) => setMongodbDatabase(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Collection Name</label>
                  <input
                    type="text"
                    required
                    placeholder="images"
                    value={mongodbCollection}
                    onChange={(e) => setMongodbCollection(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data API Key</label>
                  <input
                    type="password"
                    required
                    placeholder="API Key secret"
                    value={mongodbApiKey}
                    onChange={(e) => setMongodbApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggle schema overrides collapse */}
          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
              className="text-xs text-blue-600 font-bold hover:text-blue-850 flex items-center gap-1 cursor-pointer select-none"
            >
              <Settings className="w-3.5 h-3.5" />
              {showAdvancedMapping ? "Collapse Advanced DB Schema Mappings" : "Expand Advanced DB Schema Mappings"}
            </button>

            {showAdvancedMapping && (
              <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 font-sans animate-fade-in">
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-slate-850 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-blue-600" />
                    Interactive DB Attributes Mapping
                  </p>
                  <p className="text-[10px] text-slate-450 leading-relaxed">
                    Map standard photo attributes to custom keys matching your pre-existing systems or preference (e.g. mapping standard ID as "upload-id" or standard original name as "image").
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">UID (`id`) key</span>
                    <input
                      type="text"
                      value={keyMappingId}
                      onChange={(e) => setKeyMappingId(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Owner (`uploadedBy`) key</span>
                    <input
                      type="text"
                      value={keyMappingUserId}
                      onChange={(e) => setKeyMappingUserId(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">CDN URI (`url`) key</span>
                    <input
                      type="text"
                      value={keyMappingUrl}
                      onChange={(e) => setKeyMappingUrl(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Name (`originalName`) key</span>
                    <input
                      type="text"
                      value={keyMappingOriginalName}
                      onChange={(e) => setKeyMappingOriginalName(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Git Route (`githubPath`) key</span>
                    <input
                      type="text"
                      value={keyMappingGithubPath}
                      onChange={(e) => setKeyMappingGithubPath(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Category Folder (`folder`)</span>
                    <input
                      type="text"
                      value={keyMappingFolder}
                      onChange={(e) => setKeyMappingFolder(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Bytes Size (`size`) key</span>
                    <input
                      type="text"
                      value={keyMappingSize}
                      onChange={(e) => setKeyMappingSize(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Width (`width`) key</span>
                    <input
                      type="text"
                      value={keyMappingWidth}
                      onChange={(e) => setKeyMappingWidth(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Height (`height`) key</span>
                    <input
                      type="text"
                      value={keyMappingHeight}
                      onChange={(e) => setKeyMappingHeight(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Extension (`format`) key</span>
                    <input
                      type="text"
                      value={keyMappingFormat}
                      onChange={(e) => setKeyMappingFormat(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Timestamp (`uploadedAt`) key</span>
                    <input
                      type="text"
                      value={keyMappingUploadedAt}
                      onChange={(e) => setKeyMappingUploadedAt(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Metadata Tags (`tags`) key</span>
                    <input
                      type="text"
                      value={keyMappingTags}
                      onChange={(e) => setKeyMappingTags(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">SHA Check (`sha`) key</span>
                    <input
                      type="text"
                      value={keyMappingSha}
                      onChange={(e) => setKeyMappingSha(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Image quality adjustments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100 font-sans">
            Optimizations & Calibrations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Default Quality Compression ({quality}%)</label>
              <input
                type="range"
                min="30"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-slate-200 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-left space-y-0.5">
                <p className="text-xs font-bold text-slate-850">Dynamic AI Tagging</p>
                <p className="text-[10px] text-slate-400">Trigger automatic Gemini vision tagging during upload loops</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useAI} 
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow shadow-blue-500/10 cursor-pointer disabled:opacity-50 font-sans"
          >
            {saving ? "Saving System Settings..." : "Keep System Settings"}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs font-extrabold rounded-xl text-center shadow-xs">
            Credentials saved securely in your dynamic personal sandbox environment.
          </div>
        )}
      </form>
    </div>
  );
}
