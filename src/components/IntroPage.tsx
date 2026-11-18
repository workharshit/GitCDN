import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Cloud, 
  Lock, 
  Server, 
  Key, 
  Database, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Percent, 
  FolderSync, 
  TrendingUp, 
  Compass, 
  Github, 
  Clock, 
  CheckCircle2, 
  ArrowLeftRight,
  Sparkles,
  Info
} from "lucide-react";

interface IntroPageProps {
  onBypassFirebase: (preferredDb: "local" | "supabase" | "mongodb" | "firestore" | "realtime") => void;
  onGoToFirebaseSetup: () => void;
  onGoToLogin: () => void;
  isFirebaseConfigured: boolean;
}

export default function IntroPage({
  onBypassFirebase,
  onGoToFirebaseSetup,
  onGoToLogin,
  isFirebaseConfigured
}: IntroPageProps) {
  const [selectedDb, setSelectedDb] = useState<"local" | "supabase" | "mongodb" | "firestore" | "realtime">("local");

  const databaseOperators = [
    {
      id: "local" as const,
      name: "Local Cache (Offline)",
      subtitle: "Instant Sandbox Bypassing",
      tag: "Zero Config",
      color: "border-emerald-200 bg-emerald-50 text-emerald-800 focus:ring-emerald-500",
      pillColor: "bg-emerald-100 text-emerald-800",
      desc: "Perfect for testing and lightweight usage. Metadata records are stored securely in your browser's local sandbox partition. No database setup needed."
    },
    {
      id: "supabase" as const,
      name: "Supabase (PostgreSQL)",
      subtitle: "Enterprise Relational DB",
      tag: "Popular",
      color: "border-teal-200 bg-teal-50 text-teal-800 focus:ring-teal-500",
      pillColor: "bg-teal-100 text-teal-800",
      desc: "Connect to your Supabase PostgreSQL cluster securely via our API proxy. Ideal for team operations and custom integrations."
    },
    {
      id: "mongodb" as const,
      name: "MongoDB Atlas",
      subtitle: "Cloud JSON Document DB",
      tag: "Scalable",
      color: "border-purple-200 bg-purple-50 text-purple-800 focus:ring-purple-500",
      pillColor: "bg-purple-100 text-purple-800",
      desc: "Store media registry tags and file sizes inside your global MongoDB clusters using the modern HTTPS Data API Proxy interface."
    },
    {
      id: "firestore" as const,
      name: "Cloud Firestore",
      subtitle: "Google Cloud Document DB",
      tag: "Firebase Native",
      color: "border-orange-200 bg-orange-50 text-orange-850 focus:ring-orange-500",
      pillColor: "bg-orange-100 text-orange-800",
      desc: "Google's real-time document store. Synchronizes assets indices across devices instantly. Requires database creation in your Firebase console."
    },
    {
      id: "realtime" as const,
      name: "Realtime Database",
      subtitle: "Speed Optimized JSON Tree",
      tag: "Firebase Native",
      color: "border-blue-200 bg-blue-50 text-blue-800 focus:ring-blue-500",
      pillColor: "bg-blue-100 text-blue-800",
      desc: "A fast, single-node JSON store that updates listings instantly. Ideal for highly concurrent tracking systems."
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-blue-500/10 selection:text-blue-800 font-sans pb-16">
      {/* Dynamic Floating Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F8FAFC]/80 border-b border-slate-200/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/15">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-sans font-black text-slate-850 text-lg tracking-tight block">GitCDN</span>
              <span className="text-[10px] font-mono text-slate-400 block -mt-1 uppercase tracking-widest">Raw Media Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              Access Operator Console
            </button>
            <button
              onClick={() => onBypassFirebase("local")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-blue-600/10 flex items-center gap-1.5"
            >
              Quick Start <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4">
        <div className="absolute top-20 left-12 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-12 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-slate-850 tracking-tight leading-none font-sans"
          >
            Deploy and Deliver Assets Directly from your <strong className="text-blue-600 underline decoration-wavy decoration-blue-200 underline-offset-4">GitHub Repository</strong>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 25 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed px-4"
          >
            GitCDN turns any GitHub storage target into a blistering-fast, custom-configurable Delivery Network. Upload, crop, compress, auto-convert, index, and organize from any device.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-2 flex flex-wrap justify-center gap-3.5"
          >
            <button
              onClick={() => onBypassFirebase("local")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black transition cursor-pointer shadow-lg shadow-blue-500/10 flex items-center gap-2"
            >
              Start Free (No Signup Required)
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#operator-selection"
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 transition"
            >
              Explore Operator Mappings
            </a>
          </motion.div>
        </div>
      </section>

      {/* Interactive Blueprint Canvas (How it Works) */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] pointer-events-none border-l border-b border-slate-100"></div>
          
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-blue-600 uppercase tracking-widest font-black block">Operational Flow</span>
            <h2 className="text-xl font-extrabold text-slate-800">How GitCDN Achieves 100% Free CDN Scale</h2>
            <p className="text-slate-450 text-xs max-w-xl">
              By separating heavy photographic binaries from lightweight indexing registries, you benefit from enterprise delivery alongside secure ownership.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            {/* Step 1 */}
            <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl relative space-y-3">
              <span className="absolute right-4 top-4 text-xs font-mono font-bold text-slate-350">Step 1</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 font-sans">1. Git Vault Backend</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Your static image files are saved directly to a custom repository using GitHub REST APIs. GitHub handles standard physical warehousing.
                </p>
              </div>
            </div>

            {/* Path connector Icon */}
            <div className="hidden lg:flex justify-center text-slate-300">
              <ArrowLeftRight className="w-6 h-6 animate-pulse" />
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl relative space-y-3">
              <span className="absolute right-4 top-4 text-xs font-mono font-bold text-slate-350">Step 2</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 font-sans">2. Server Optimization</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  GitCDN Secure Proxy intercepts fetch requests. It reads raw binaries, compresses sizes up to 90%, and outputs Next-Gen WebP layouts.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl relative space-y-3">
              <span className="absolute right-4 top-4 text-xs font-mono font-bold text-slate-350">Step 3</span>
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl w-fit">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 font-sans">3. Registry Synchronization</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Lightweight metadata (tags, formats, widths) is synced with your favorite choice of operator (Supabase, MongoDB, or local browser sandbox).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Operator Selection & Setup Guides Section */}
      <section id="operator-selection" className="max-w-6xl mx-auto px-4 pb-20 text-left">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[10px] font-mono text-blue-600 uppercase tracking-widest font-black block">Custom Operators Setup Documentation</span>
          <h2 className="text-2xl font-black text-slate-850">Choose Your Favorite Database</h2>
          <p className="text-slate-500 text-xs max-w-xl mx-auto leading-relaxed">
            GitCDN connects with any platform. Click an operator to view step-by-step connection scripts and launch instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Operator selectors list (Left Card - 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {databaseOperators.map((operator) => {
              const isSelected = selectedDb === operator.id;
              return (
                <button
                  key={operator.id}
                  onClick={() => setSelectedDb(operator.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition duration-200 flex items-start gap-3.5 cursor-pointer relative overflow-hidden group select-none ${
                    isSelected 
                      ? "border-blue-500 bg-white shadow-md shadow-blue-550/5 ring-1 ring-blue-500" 
                      : "border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSelected 
                      ? "bg-blue-600 text-white" 
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700"
                  }`}>
                    {operator.id === "local" && <Clock className="w-4 h-4" />}
                    {operator.id === "supabase" && <ArrowLeftRight className="w-4 h-4" />}
                    {operator.id === "mongodb" && <Database className="w-4 h-4" />}
                    {operator.id === "firestore" && <CheckCircle2 className="w-4 h-4" />}
                    {operator.id === "realtime" && <Zap className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-805">{operator.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold select-none ${operator.pillColor}`}>
                        {operator.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{operator.subtitle}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-sans">{operator.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Setup Guide and Launch Console (Right Card - 7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xs relative">
            <div className="space-y-5 text-slate-755 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-900 text-white font-mono text-[10px] uppercase font-black rounded">
                    {selectedDb.toUpperCase()}
                  </span>
                  <span className="font-extrabold text-slate-800 text-sm">Operator Step-By-Step Guide</span>
                </div>
                <Info className="w-4 h-4 text-slate-300" />
              </div>

              {selectedDb === "local" && (
                <div className="space-y-3.5">
                  <p className="font-extrabold text-emerald-800 text-xs bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 inline-block">
                    ⚡ No Setup Required! Perfect for Quick Trials & Standard Privacy
                  </p>
                  <p className="text-slate-500 leading-relaxed font-sans">
                    LocalStorage configuration maps and indices are stored entirely inside your browser's standard sandbox.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 font-sans tracking-tight">
                    <li>Select <strong className="text-slate-800">Local Cache & Offline Mode</strong>.</li>
                    <li>Perfect for developers who want to avoid provisioning heavy cloud systems.</li>
                    <li>Asset metadata matches your logged-in session securely in private offline caching.</li>
                    <li>Highly secure, sandbox private, completely offline.</li>
                  </ol>
                </div>
              )}

              {selectedDb === "supabase" && (
                <div className="space-y-3.5">
                  <p className="font-bold text-teal-800 text-xs bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 inline-block">
                    Database Schema Migration Script
                  </p>
                  <p className="text-slate-500 leading-relaxed font-sans">
                    Run this schema script inside your Supabase SQL editor to deploy an image registry instantly:
                  </p>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed select-all">
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
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-sans">
                    <li>Copy your **Supabase Project URL** and public **Anon Key**.</li>
                    <li>Fill out key mappings inside settings.</li>
                    <li>Manage SQL databases serverlessly under a unified console dashboard.</li>
                  </ol>
                </div>
              )}

              {selectedDb === "mongodb" && (
                <div className="space-y-3.5">
                  <p className="font-bold text-purple-800 text-xs bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 inline-block">
                    Using MongoDB Atlas JSON API Proxy
                  </p>
                  <p className="text-slate-500 leading-relaxed font-sans">
                    Use the secure MongoDB HTTPS Data API Endpoint structure to write image tags serverlessly:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 font-sans">
                    <li>Go to Atlas Console ➔ Data Services ➔ **Data API** and turn it on.</li>
                    <li>Create an **API Key** named `GitCDN-Token`.</li>
                    <li>Retrieve your Cluster API Url, Database Name and target Collection.</li>
                    <li>Enter details in settings ➔ metadata gets proxied instantly!</li>
                  </ol>
                </div>
              )}

              {selectedDb === "firestore" && (
                <div className="space-y-3.5">
                  <p className="font-bold text-orange-805 text-xs bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 inline-block">
                    Native Firebase Firestore Setups
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Uses high-performance reactive WebSockets directly from the browser:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-sans">
                    <li>Navigate to Google Firebase Console ➔ Create Firestore DB.</li>
                    <li>Configure security rules to allow read/write values.</li>
                    <li>Logs listings under your specified Firestore collection (e.g. `images`).</li>
                  </ol>
                </div>
              )}

              {selectedDb === "realtime" && (
                <div className="space-y-3.5">
                  <p className="font-bold text-blue-800 text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 inline-block">
                    Native Realtime DB Tree
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Ideal for developers who favor ultra-lightweight JSON trees over collection schemas:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Click settings ➔ Choose Realtime Database.</li>
                    <li>Configure credentials root path mapping (e.g. `images/uploads`).</li>
                    <li>Fast instant visual updates.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Launch CTA for Selected Operator */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Currently Selected Target</p>
                <p className="text-xs font-black text-slate-700">Ready for {selectedDb.toUpperCase()} console session</p>
              </div>

              {selectedDb === "firestore" || selectedDb === "realtime" ? (
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={onGoToFirebaseSetup}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm text-center"
                  >
                    Configure Credentials Form
                  </button>
                  <button
                    onClick={() => onBypassFirebase(selectedDb)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer text-center"
                  >
                    Launch Sandbox Sandbox
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onBypassFirebase(selectedDb)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-blue-550/10 flex items-center justify-center gap-1"
                >
                  Launch Operator Console <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="max-w-6xl mx-auto px-4 pb-20 text-left">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[10px] font-mono text-blue-600 uppercase tracking-widest font-black block">Core Capabilities</span>
          <h2 className="text-2xl font-black text-slate-850">Enterprise Features Built For Speed</h2>
          <p className="text-slate-500 text-xs max-w-xl mx-auto leading-relaxed">
            Every feature is optimized for lightweight delivery, secure deployment parameters, and modular flexibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">WebP Auto-Negotiation</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Automatically converts formats (PNG, JPG, SVG) into modern WebP on the fly. Decreases payload weight up to 90%.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Custom Quality Compression</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Fine-tune compression qualities from 1% to 100% inside settings. Let GitCDN balance byte size with visual art quality automatically.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Folder Subdivisions</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Maintain clean structures. Create visual folders inside the dashboard UI to segment catalogs, products, or user profiles.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">AES Token Encryption</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Your private GitHub Personal Access Tokens are encrypted using AES-128 algorithms. Never exposed to browser elements or plain url search params.
              </p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Shortlink Sharing</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Instantly generate 7-character shortened share URLs (`/images/abcd123`) pointing directly to proxied repo images. Ideal for markdown and dev.
              </p>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="bg-white border border-slate-205 rounded-2xl p-6 space-y-3.5">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Real-time Dashboard Analytics</h3>
              <p className="text-[11px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed">
                Visualize active optimizations. Interactive d3 charts display total bytes saved, format percentage summaries, and active repository status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why is Secure and Free Section */}
      <section className="max-w-6xl mx-auto px-4 pb-12 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900 text-slate-300 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="p-2.5 bg-blue-650 text-white rounded-xl w-fit shadow-lg shadow-blue-500/10">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Why is GitCDN Secure?</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Traditional setups expose GitHub developer tokens when pulling private images directly. GitCDN implements a server-integrated AES-128 cryptographic barrier. 
              The private access token is stored safely in database entries, encrypted upon retrieval, and proxy-negotiated on the backend. Your client browser never receives raw auth credentials, providing complete isolation.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> Server-side decryption & headers masking
              </li>
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> CORS headers configured securely on proxy endpoints
              </li>
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> Self-hosted connection patterns
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="p-2.5 bg-emerald-650 text-white rounded-xl w-fit shadow-lg shadow-emerald-500/10">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Why is GitCDN free?</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Unlike commercial media servers that charge for physical disk capacity and outgoing network server traffic, GitCDN is designed to run in a 100% serverless data-proxy configuration.
              All heavy physical assets are warehoused on your target GitHub Repository, and metadata is mapped to free tiers of databases. You run your console proxy for exactly $0/month.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> Leverage 100% free storage limitations of Git repositories
              </li>
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> Zero hardware overheads – client-to-proxy delivery
              </li>
              <li className="flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" /> Completely open-source and customizable
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Quick Setup Modal / Toggle Help */}
      <footer className="text-center py-6 text-[11px] text-slate-400 px-6 font-mono border-t border-slate-200">
        <div>GitCDN Saas Portal v1.0.1 | Licensed under MIT | Run with zero limits</div>
        <div className="mt-1">Persist your custom settings into local browser cache partitions safely.</div>
      </footer>
    </div>
  );
}
