import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  Info, 
  ArrowLeft, 
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

interface SecurityCheckScreenProps {
  pending: {
    type: "firebase-setup" | "sandbox-setup";
    dbType: "local" | "supabase" | "mongodb" | "firestore" | "realtime";
    config?: any;
  };
  onCancel: () => void;
  onConfirm: (isSecured: boolean) => void;
}

export default function SecurityCheckScreen({
  pending,
  onCancel,
  onConfirm
}: SecurityCheckScreenProps) {
  const [isSecured, setIsSecured] = useState<boolean>(true);
  const { dbType, type } = pending;

  // Custom metadata based on Selected Operator
  const operatorDetails = {
    local: {
      name: "Local Cache (Offline Sandbox)",
      title: "Local browser database configuration completed",
      requiresSecuredAuth: false,
      desc: "Local Caching uses your browser sandboxed local partition memory. Because this does not write to a public server cloud database, it has no remote security rules or threat posture."
    },
    firestore: {
      name: "Google Cloud Firestore",
      title: "Firestore database connection initialized successfully",
      requiresSecuredAuth: true,
      desc: "Google Cloud Firestore relies on cloud-level Security Rules. If write access is blocked or locked under rules, you must authenticate to write records."
    },
    realtime: {
      name: "Firebase Realtime Database",
      title: "Realtime DB instance node detected",
      requiresSecuredAuth: true,
      desc: "Firebase Realtime DB uses JSON security rules. An unauthenticated write on rules-restricted paths will trigger authentication denials immediately."
    },
    supabase: {
      name: "Supabase PostgreSQL Database",
      title: "Supabase API cluster proxy initialized",
      requiresSecuredAuth: true,
      desc: "Supabase instances are secured with Row Level Security (RLS) on database tables. If active, unauthenticated public requests are rejected."
    },
    mongodb: {
      name: "MongoDB Atlas Cluster",
      title: "MongoDB Atlas Data HTTPS API Node connected",
      requiresSecuredAuth: true,
      desc: "MongoDB Atlas restricts table document operations using HTTPS Data API tokens. Ensure rules define appropriate read/write filters."
    }
  };

  const currentOp = operatorDetails[dbType] || operatorDetails["firestore"];

  return (
    <div id="security-verification-view" className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-blue-500/10 selection:text-blue-800">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
        {/* Subtle decorative security grid background */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-bl-[100px] pointer-events-none border-l border-b border-slate-100"></div>

        {/* Back navigation button */}
        <button
          id="btn-back-to-setup"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-500 hover:text-slate-800 cursor-pointer transition select-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to operator configurations
        </button>

        {/* Main Header */}
        <div className="space-y-2 pt-2">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl w-fit">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-850">Database Connection Confirmed</h1>
            <p className="text-slate-400 text-xs font-sans">
              Configured metadata mapped target: <strong className="text-blue-600 font-extrabold">{currentOp.name}</strong>
            </p>
          </div>
        </div>

        {/* Critical Information Callout Alert */}
        <div className="p-4 bg-blue-50/50 border border-blue-150/80 rounded-2xl text-xs text-blue-800 space-y-1.5 leading-relaxed font-sans">
          <span className="font-extrabold block text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-secondary-500 text-blue-600" /> Connection Security rules verification
          </span>
          <p className="text-slate-600 font-medium font-sans">
            Before compilation, we must declare the validation pathway. Incorrect security modes trigger connection timeouts or system errors when attempting to render listings.
          </p>
        </div>

        {/* The Big Question Area */}
        {dbType !== "local" ? (
          <div className="space-y-4 pt-1">
            <p className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono text-center sm:text-left">
              👉 Does your {dbType === "firestore" || dbType === "realtime" ? "Firestore or Realtime DB" : currentOp.name} use authorization Security Rules?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Yes (Secured) */}
              <button
                id="select-security-yes"
                type="button"
                onClick={() => setIsSecured(true)}
                className={`text-left p-5 rounded-2xl border-2 transition duration-200 cursor-pointer ${
                  isSecured
                    ? "border-blue-550 bg-blue-50/20 ring-1 ring-blue-500"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-blue-600 text-white rounded-lg block font-mono text-[10px] font-black uppercase">Yes</span>
                  <CheckCircle2 className={`w-4 h-4 ${isSecured ? "text-blue-600" : "text-transparent"}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mt-3 block font-sans">1. Security Rules Enabled (Recommended)</h4>
                <p className="text-[10px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed font-sans">
                  Choose this if your database locks unauthorized queries. Requires admin/operator authorization coordinates.
                </p>
              </button>

              {/* Option B: No (Public / Test Mode) */}
              <button
                id="select-security-no"
                type="button"
                onClick={() => setIsSecured(false)}
                className={`text-left p-5 rounded-2xl border-2 transition duration-200 cursor-pointer ${
                  !isSecured
                    ? "border-blue-550 bg-blue-50/20 ring-1 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 bg-slate-205 bg-amber-500 text-white rounded-lg block font-mono text-[10px] font-black uppercase">No</span>
                  <CheckCircle2 className={`w-4 h-4 ${!isSecured ? "text-amber-500" : "text-transparent"}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mt-3 block font-sans">2. public read/write (Test Mode)</h4>
                <p className="text-[10px] text-slate-500 mt-1 lines-clamp-3 leading-relaxed font-sans">
                  Choose this if rules are set to public allow read/write. No forced authentication is required to interact with the database.
                </p>
              </button>
            </div>

            {/* Contextual instruction warnings depending on selection */}
            {isSecured ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-2 animate-fadeIn text-left leading-relaxed font-sans mt-3">
                <span className="font-extrabold flex items-center gap-1 uppercase tracking-wider text-[10px] text-amber-800">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Authorized access requirements
                </span>
                <p className="text-amber-850 font-sans leading-relaxed">
                  You have confirmed your database is secured. In the next step, please <strong className="text-amber-900 font-extrabold">sign in with your valid administrator login details or authorized credentials</strong> to prevent <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">"Missing or insufficient permissions"</code> errors.
                </p>
                <p className="text-slate-500 text-[10px] font-sans font-medium">
                  Ensure the configured users has email/password access configured in your operator console database settings.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-teal-50 border border-teal-200 text-teal-850 rounded-2xl text-xs space-y-2 animate-fadeIn text-left mt-3">
                <span className="font-extrabold flex items-center gap-1 uppercase tracking-wider text-[10px] text-teal-850">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Direct Sandbox Bypass Enabled
                </span>
                <p className="text-teal-800 font-sans leading-relaxed">
                  Since your database does not lock write/read requests with custom auth filters, the compilation system will deploy an anonymous guest sandbox. You skip login completely!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-emerald-50/50 border border-emerald-150 rounded-2xl space-y-2 leading-relaxed">
            <span className="font-extrabold uppercase text-[10px] text-emerald-800 tracking-wider flex items-center gap-1 font-mono">
              ⚡ Local Offline Sandbox Active
            </span>
            <p className="text-xs text-slate-650 font-sans">
              Local Browser Offline Cache stores your folders and assets information directly inside your computer's local partition. Because it is local and bypasses remote database operations completely:
            </p>
            <ul className="text-[11px] text-slate-500 space-y-1 sm:space-y-1.5 list-disc list-inside">
              <li>100% Secure, self-contained and confidential.</li>
              <li>No setup delay, no remote network calls.</li>
              <li>Zero config limit of $0/month indefinitely.</li>
            </ul>
          </div>
        )}

        {/* Footer actions block */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">Operator Profile Pathway</p>
            <p className="text-xs font-black text-slate-700 font-sans">
              {dbType === "local" ? "Offline local memory storage" : isSecured ? "Secure Authentication credentials required" : "Public/Direct anonymous workspace query"}
            </p>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              id="btn-cancel-security"
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 transition cursor-pointer select-none text-center"
            >
              Cancel Setup
            </button>
            <button
              id="btn-submit-security"
              type="button"
              onClick={() => onConfirm(dbType === "local" ? false : isSecured)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 select-none text-center"
            >
              {dbType === "local" ? "Activate Sandbox" : isSecured ? "Initialize with Authorized login" : "Access Workspace Directly"}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
