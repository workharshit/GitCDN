import React, { useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from "firebase/firestore";
import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  remove as rtdbRemove, 
  onValue as rtdbOnValue 
} from "firebase/database";
import { 
  auth, 
  db, 
  rtdb, 
  handleFirestoreError,
  isFirebaseConfigured,
  clearFirebaseConfig,
  saveFirebaseConfig
} from "./firebase";
import { ImageMetadata, GitCDNSettings, OperationType } from "./types";
import Sidebar from "./components/Sidebar";
import DashboardOverview from "./components/DashboardOverview";
import UploadZone from "./components/UploadZone";
import Gallery from "./components/Gallery";
import SettingsPanel from "./components/SettingsPanel";
import AnalyticsView from "./components/AnalyticsView";
import IntroPage from "./components/IntroPage";
import SecurityCheckScreen from "./components/SecurityCheckScreen";
import { Cloud, Lock, Server, Key, Eye, EyeOff, Save, LogOut, ArrowRight, RefreshCw, AlertCircle, Sparkles, Database } from "lucide-react";

type PageId = "overview" | "upload" | "library" | "analytics" | "settings";

// Map Standard attributes to Operator Mapped Keys for storage
const mapSchemaMetadata = (meta: ImageMetadata, settings: GitCDNSettings) => {
  const customDoc: Record<string, any> = {};
  
  const idKey = settings.keyMappingId || "id";
  const userKey = settings.keyMappingUserId || "uploadedBy";
  const urlKey = settings.keyMappingUrl || "url";
  const nameKey = settings.keyMappingOriginalName || "originalName";
  const pathKey = settings.keyMappingGithubPath || "githubPath";
  const folderKey = settings.keyMappingFolder || "folder";
  const sizeKey = settings.keyMappingSize || "size";
  const widthKey = settings.keyMappingWidth || "width";
  const heightKey = settings.keyMappingHeight || "height";
  const formatKey = settings.keyMappingFormat || "format";
  const timeKey = settings.keyMappingUploadedAt || "uploadedAt";
  const shaKey = settings.keyMappingSha || "sha";
  const tagsKey = settings.keyMappingTags || "tags";

  customDoc[idKey] = meta.id;
  customDoc[userKey] = meta.uploadedBy;
  customDoc[urlKey] = meta.url;
  customDoc[nameKey] = meta.originalName || meta.name;
  customDoc[pathKey] = meta.githubPath;
  customDoc[folderKey] = meta.folder || "uploads";
  customDoc[sizeKey] = meta.size;
  customDoc[widthKey] = meta.width;
  customDoc[heightKey] = meta.height;
  customDoc[formatKey] = meta.format;
  customDoc[timeKey] = meta.uploadedAt;
  
  if (meta.sha) {
    customDoc[shaKey] = meta.sha;
  }
  if (meta.tags) {
    customDoc[tagsKey] = meta.tags;
  }
  
  return customDoc;
};

// Decode Custom stored DB documents back to UI standard templates
const decodeSchemaMetadata = (customDoc: Record<string, any>, settings: GitCDNSettings): ImageMetadata => {
  const idKey = settings.keyMappingId || "id";
  const userKey = settings.keyMappingUserId || "uploadedBy";
  const urlKey = settings.keyMappingUrl || "url";
  const nameKey = settings.keyMappingOriginalName || "originalName";
  const pathKey = settings.keyMappingGithubPath || "githubPath";
  const folderKey = settings.keyMappingFolder || "folder";
  const sizeKey = settings.keyMappingSize || "size";
  const widthKey = settings.keyMappingWidth || "width";
  const heightKey = settings.keyMappingHeight || "height";
  const formatKey = settings.keyMappingFormat || "format";
  const timeKey = settings.keyMappingUploadedAt || "uploadedAt";
  const shaKey = settings.keyMappingSha || "sha";
  const tagsKey = settings.keyMappingTags || "tags";

  return {
    id: customDoc[idKey] || "",
    uploadedBy: customDoc[userKey] || "",
    url: customDoc[urlKey] || "",
    name: customDoc[nameKey] || customDoc[idKey] || "Untitled",
    originalName: customDoc[nameKey] || "Untitled",
    githubPath: customDoc[pathKey] || "",
    folder: customDoc[folderKey] || "uploads",
    size: customDoc[sizeKey] || 0,
    width: customDoc[widthKey] || 800,
    height: customDoc[heightKey] || 600,
    format: customDoc[formatKey] || "webp",
    uploadedAt: customDoc[timeKey] || new Date().toISOString(),
    sha: customDoc[shaKey] || "",
    tags: customDoc[tagsKey] || [],
  };
};

export default function App() {
  const [configured, setConfigured] = useState(isFirebaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  
  // Sandbox and Intro toggles to allow bypassing Firebase constraints completely
  const [isSandboxMode, setIsSandboxMode] = useState(() => {
    return localStorage.getItem("GIT_CDN_SANDBOX_MODE") === "true";
  });
  const [showIntro, setShowIntro] = useState(() => {
    const hasFirebase = !!localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
    if (hasFirebase) return false;
    const sandboxActive = localStorage.getItem("GIT_CDN_SANDBOX_MODE") === "true";
    return !sandboxActive;
  });

  const [pendingSecurityCheck, setPendingSecurityCheck] = useState<{
    type: "firebase-setup" | "sandbox-setup";
    dbType: "local" | "supabase" | "mongodb" | "firestore" | "realtime";
    config?: any;
  } | null>(null);

  const [authLoading, setAuthLoading] = useState(configured && !isSandboxMode);
  const [activePage, setActivePage] = useState<PageId>("overview");

  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Setup Form States pre-loaded dynamically from current localStorage config
  const [setupApiKey, setSetupApiKey] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.apiKey || "";
      }
    } catch {}
    return "";
  });
  const [setupAuthDomain, setSetupAuthDomain] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.authDomain || "";
      }
    } catch {}
    return "";
  });
  const [setupProjectId, setSetupProjectId] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.projectId || "";
      }
    } catch {}
    return "";
  });
  const [setupBucket, setSetupBucket] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.storageBucket || "";
      }
    } catch {}
    return "";
  });
  const [setupSenderId, setSetupSenderId] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.messagingSenderId || "";
      }
    } catch {}
    return "";
  });
  const [setupAppId, setSetupAppId] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.appId || "";
      }
    } catch {}
    return "";
  });
  const [setupDbUrl, setSetupDbUrl] = useState(() => {
    try {
      const stored = localStorage.getItem("GIT_CDN_FIREBASE_CONFIG");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.databaseURL || "";
      }
    } catch {}
    return "";
  });

  const [showSetupApiKey, setShowSetupApiKey] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // App core state
  const [settings, setSettings] = useState<GitCDNSettings | null>(null);
  const [encryptedToken, setEncryptedToken] = useState<string>("");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [folders, setFolders] = useState<string[]>(["uploads"]);
  const [activeFolder, setActiveFolder] = useState<string>("all");

  // Hide Intro automatically if a valid authenticated profile exists
  useEffect(() => {
    if (user) {
      setShowIntro(false);
    }
  }, [user]);

  // Unified auth listener evaluating Firebase Auth + Sandbox Caching Profiles
  useEffect(() => {
    if (isSandboxMode) {
      setUser({
        uid: "sandbox-local-user",
        email: "sandbox-developer@gitcdn.local",
        displayName: "Sandbox Mode Operator"
      } as any);
      setAuthLoading(false);

      const savedSettings = localStorage.getItem(`GIT_CDN_SYSTEM_SETTINGS_sandbox-local-user`);
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch {
          initializeDefaultSettings("sandbox-local-user");
        }
      } else {
        initializeDefaultSettings("sandbox-local-user");
      }
      setSettingsLoading(false);
      return;
    }

    if (!configured || !auth) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        const savedSettings = localStorage.getItem(`GIT_CDN_SYSTEM_SETTINGS_${currentUser.uid}`);
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch {
            initializeDefaultSettings(currentUser.uid);
          }
        } else {
          initializeDefaultSettings(currentUser.uid);
        }
        setSettingsLoading(false);
      } else {
        setSettings(null);
        setImages([]);
      }
    });

    return () => unsubscribe();
  }, [configured, isSandboxMode]);

  // Bypasses Firebase setup automatically and launches the console with preferred target operator
  const handleLaunchSandboxDirectly = (preferredDb: "local" | "supabase" | "mongodb" | "firestore" | "realtime") => {
    localStorage.setItem("GIT_CDN_SANDBOX_MODE", "true");
    setIsSandboxMode(true);
    setShowIntro(false);

    const sandboxUid = "sandbox-local-user";
    const saved = localStorage.getItem(`GIT_CDN_SYSTEM_SETTINGS_sandbox-local-user`);
    let currentSettings: any = {};
    if (saved) {
      try {
        currentSettings = JSON.parse(saved);
      } catch {}
    }

    const updatedSettings: GitCDNSettings = {
      userId: sandboxUid,
      githubToken: currentSettings.githubToken || "",
      githubRepo: currentSettings.githubRepo || "",
      githubOwner: currentSettings.githubOwner || "",
      githubBranch: currentSettings.githubBranch || "main",
      cdnMode: currentSettings.cdnMode || "jsdelivr",
      imageQuality: currentSettings.imageQuality || 80,
      useAiTagging: currentSettings.useAiTagging || false,
      dbType: preferredDb,
      collectionOrPath: preferredDb === "realtime" ? "/uploaded-assets" : "images",
      supabaseUrl: currentSettings.supabaseUrl || "",
      supabaseAnonKey: currentSettings.supabaseAnonKey || "",
      supabaseTable: currentSettings.supabaseTable || "images",
      mongodbUrl: currentSettings.mongodbUrl || "",
      mongodbApiKey: currentSettings.mongodbApiKey || "",
      mongodbDatabase: currentSettings.mongodbDatabase || "gitcdn",
      mongodbCollection: currentSettings.mongodbCollection || "images",
      mongodbDataSource: currentSettings.mongodbDataSource || "Cluster0",
      keyMappingId: currentSettings.keyMappingId || "id",
      keyMappingUserId: currentSettings.keyMappingUserId || "uploadedBy",
      keyMappingUrl: currentSettings.keyMappingUrl || "url",
      keyMappingOriginalName: currentSettings.keyMappingOriginalName || "originalName",
      keyMappingGithubPath: currentSettings.keyMappingGithubPath || "githubPath",
      keyMappingFolder: currentSettings.keyMappingFolder || "folder",
      keyMappingSize: currentSettings.keyMappingSize || "size",
      keyMappingWidth: currentSettings.keyMappingWidth || "width",
      keyMappingHeight: currentSettings.keyMappingHeight || "height",
      keyMappingFormat: currentSettings.keyMappingFormat || "format",
      keyMappingUploadedAt: currentSettings.keyMappingUploadedAt || "uploadedAt",
      keyMappingTags: currentSettings.keyMappingTags || "tags",
      keyMappingSha: currentSettings.keyMappingSha || "sha"
    };

    localStorage.setItem(`GIT_CDN_SYSTEM_SETTINGS_sandbox-local-user`, JSON.stringify(updatedSettings));
    setUser({
      uid: "sandbox-local-user",
      email: "sandbox-developer@gitcdn.local",
      displayName: "Sandbox Mode Operator"
    } as any);
    setAuthLoading(false);
    setSettings(updatedSettings);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLaunchSandbox = (preferredDb: "local" | "supabase" | "mongodb" | "firestore" | "realtime") => {
    setPendingSecurityCheck({
      type: "sandbox-setup",
      dbType: preferredDb,
      config: null
    });
  };

  // Real-time synchronization of images metadata from chosen database
  useEffect(() => {
    if (!user || !settings) return;

    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeRealtime: (() => void) | null = null;

    const dbType = settings.dbType || "firestore";
    const collectionOrPath = settings.collectionOrPath || "images";

    if (dbType === "local") {
      try {
        const cacheKey = `GIT_CDN_LOCAL_IMAGE_CACHE_${user.uid}`;
        const localData = localStorage.getItem(cacheKey);
        const list: ImageMetadata[] = [];
        const detectedFolders = new Set<string>(["uploads"]);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            parsed.forEach((rawItem) => {
              const decoded = decodeSchemaMetadata(rawItem, settings);
              list.push(decoded);
              if (decoded.folder) {
                detectedFolders.add(decoded.folder);
              }
            });
          }
        }
        setImages(list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
        setFolders(Array.from(detectedFolders));
      } catch (err) {
        console.error("Failed to load local database cache:", err);
      }
    } else if (dbType === "supabase" || dbType === "mongodb") {
      fetch("/api/db/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbType,
          config: settings,
          userId: user.uid
        })
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Database error status ${res.status}`);
          return res.json();
        })
        .then((payload) => {
          if (payload.success && Array.isArray(payload.data)) {
            const list: ImageMetadata[] = [];
            const detectedFolders = new Set<string>(["uploads"]);
            payload.data.forEach((rawDoc: any) => {
              const decoded = decodeSchemaMetadata(rawDoc, settings);
              list.push(decoded);
              if (decoded.folder) {
                detectedFolders.add(decoded.folder);
              }
            });
            setImages(list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
            setFolders(Array.from(detectedFolders));
          }
        })
        .catch((err) => {
          console.error("Failed to retrieve server proxy database items:", err);
        });
    } else if (dbType === "realtime") {
      if (!rtdb) {
        console.error("Realtime Database context is not initialized.");
        return;
      }
      const userRefPath = `${collectionOrPath}/${user.uid}`;
      const dbRef = rtdbRef(rtdb, userRefPath);

      unsubscribeRealtime = rtdbOnValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        const list: ImageMetadata[] = [];
        const detectedFolders = new Set<string>(["uploads"]);

        if (val) {
          Object.keys(val).forEach((key) => {
            const mappedObj = decodeSchemaMetadata(val[key], settings);
            list.push(mappedObj);
            if (mappedObj.folder) {
              detectedFolders.add(mappedObj.folder);
            }
          });
        }

        setImages(list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
        setFolders(Array.from(detectedFolders));
      }, (error) => {
        console.error("Realtime Database sync error:", error);
      });
    } else {
      if (!db) {
        console.error("Firestore context is not initialized.");
        return;
      }
      const userKey = settings.keyMappingUserId || "uploadedBy";
      const q = query(collection(db, collectionOrPath), where(userKey, "==", user.uid));
      
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const list: ImageMetadata[] = [];
          const detectedFolders = new Set<string>(["uploads"]);

          snapshot.forEach((docSnap) => {
            const mappedObj = decodeSchemaMetadata(docSnap.data() as any, settings);
            list.push(mappedObj);
            if (mappedObj.folder) {
              detectedFolders.add(mappedObj.folder);
            }
          });
          
          setImages(list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
          setFolders(Array.from(detectedFolders));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, collectionOrPath);
        }
      );
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [user, settings, refreshTrigger]);

  // Handle token encryption securely to prevent client-side exposure in plain URLs
  useEffect(() => {
    const rawToken = settings?.githubToken;
    if (rawToken) {
      fetch("/api/encrypt-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken })
      })
        .then((res) => {
          if (!res.ok) throw new Error("Encryption server error");
          return res.json();
        })
        .then((data) => {
          if (data.encryptedToken) {
            setEncryptedToken(data.encryptedToken);
          }
        })
        .catch((err) => {
          console.error("Critical: Failed to generate signed proxy token node:", err);
        });
    } else {
      setEncryptedToken("");
    }
  }, [settings?.githubToken]);

  const initializeDefaultSettings = (uid: string) => {
    const defaultSettings: GitCDNSettings = {
      userId: uid,
      githubToken: "",
      githubRepo: "",
      githubOwner: "",
      githubBranch: "main",
      cdnMode: "jsdelivr",
      imageQuality: 80,
      useAiTagging: false,
      dbType: "firestore",
      collectionOrPath: "images",
      supabaseUrl: "",
      supabaseAnonKey: "",
      supabaseTable: "images",
      mongodbUrl: "",
      mongodbApiKey: "",
      mongodbDatabase: "gitcdn",
      mongodbCollection: "images",
      mongodbDataSource: "Cluster0",
      keyMappingId: "id",
      keyMappingUserId: "uploadedBy",
      keyMappingUrl: "url",
      keyMappingOriginalName: "originalName",
      keyMappingGithubPath: "githubPath",
      keyMappingFolder: "folder",
      keyMappingSize: "size",
      keyMappingWidth: "width",
      keyMappingHeight: "height",
      keyMappingFormat: "format",
      keyMappingUploadedAt: "uploadedAt",
      keyMappingTags: "tags",
      keyMappingSha: "sha"
    };
    localStorage.setItem(`GIT_CDN_SYSTEM_SETTINGS_${uid}`, JSON.stringify(defaultSettings));
    setSettings(defaultSettings);
  };

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupApiKey || !setupProjectId || !setupAuthDomain) {
      alert("API Key, Project ID, and Auth Domain are required fields.");
      return;
    }
    const config = {
      apiKey: setupApiKey.trim(),
      authDomain: setupAuthDomain.trim(),
      projectId: setupProjectId.trim(),
      storageBucket: setupBucket.trim() || undefined,
      messagingSenderId: setupSenderId.trim() || undefined,
      appId: setupAppId.trim() || undefined,
      databaseURL: setupDbUrl.trim() || undefined
    };
    setPendingSecurityCheck({
      type: "firebase-setup",
      dbType: setupDbUrl.trim() ? "realtime" : "firestore",
      config: config
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setLoginError("Firebase authentication context is uninitialized.");
      return;
    }
    try {
      setSigningIn(true);
      setLoginError("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      let msg = err.message || String(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        msg = "Incorrect Email or Password. Please check with your Firebase Authentication console settings.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Malformed email address structure.";
      }
      setLoginError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (isSandboxMode) {
      localStorage.removeItem("GIT_CDN_SANDBOX_MODE");
      setIsSandboxMode(false);
      setUser(null);
      setSettings(null);
      setShowIntro(true);
      return;
    }
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  const handleSaveSettings = async (updated: GitCDNSettings) => {
    if (!user) return;
    try {
      localStorage.setItem(`GIT_CDN_SYSTEM_SETTINGS_${user.uid}`, JSON.stringify(updated));
      setSettings(updated);
    } catch (err) {
      console.error("Failed to persist browser settings local node:", err);
    }
  };

  const handleCreateFolderDirectly = async (folderName: string) => {
    const cleanFolderName = folderName.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "");
    if (!cleanFolderName) return;

    if (!folders.includes(cleanFolderName)) {
      setFolders([...folders, cleanFolderName]);
    }
  };

  const handleUploadFinished = async (metadata: any) => {
    if (!user || !settings) return;
    
    const imageId = `${metadata.githubPath.replace(/\//g, "-")}_${Date.now()}`.replace(/[^a-zA-Z0-9_\-]/g, "");
    
    const standardMeta: ImageMetadata = {
      id: imageId,
      name: metadata.githubPath.substring(metadata.githubPath.lastIndexOf("/") + 1, metadata.githubPath.lastIndexOf(".")) || metadata.githubPath,
      originalName: metadata.githubPath.substring(metadata.githubPath.lastIndexOf("/") + 1),
      url: metadata.url,
      githubPath: metadata.githubPath,
      folder: metadata.githubPath.split("/")[0] || "uploads",
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      uploadedBy: user.uid,
      uploadedAt: new Date().toISOString(),
      tags: metadata.tags || [],
      sha: metadata.sha
    };

    const customDoc = mapSchemaMetadata(standardMeta, settings);
    const dbType = settings.dbType || "firestore";
    const collectionOrPath = settings.collectionOrPath || "images";

    try {
      if (dbType === "local") {
        const cacheKey = `GIT_CDN_LOCAL_IMAGE_CACHE_${user.uid}`;
        const existingData = localStorage.getItem(cacheKey);
        let items: any[] = [];
        if (existingData) {
          try {
            items = JSON.parse(existingData);
            if (!Array.isArray(items)) items = [];
          } catch {}
        }
        items.push(customDoc);
        localStorage.setItem(cacheKey, JSON.stringify(items));
        setRefreshTrigger((prev) => prev + 1);
      } else if (dbType === "supabase" || dbType === "mongodb") {
        const res = await fetch("/api/db/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbType,
            config: settings,
            userId: user.uid,
            imageId,
            customDoc
          })
        });
        if (!res.ok) {
          const errRes = await res.json();
          throw new Error(errRes.error || "Failed database save proxy request");
        }
        setRefreshTrigger((prev) => prev + 1);
      } else if (dbType === "realtime") {
        if (!rtdb) throw new Error("Realtime Database context is not initialized.");
        const rtdbPath = `${collectionOrPath}/${user.uid}/${imageId}`;
        await rtdbSet(rtdbRef(rtdb, rtdbPath), customDoc);
      } else {
        if (!db) throw new Error("Firestore context is not initialized.");
        await setDoc(doc(db, collectionOrPath, imageId), customDoc);
      }
    } catch (err) {
      console.error("Database upload registry clearance failure:", err);
      alert(`Database write failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeleteImage = async (image: ImageMetadata) => {
    if (!user || !settings) return;

    // 1. Invoke custom backend Express purge API to delete from GitHub
    const queryParams = new URLSearchParams({
      githubToken: settings.githubToken,
      githubOwner: settings.githubOwner,
      githubRepo: settings.githubRepo,
      githubBranch: settings.githubBranch || "main",
      githubPath: image.githubPath,
      sha: image.sha || ""
    });

    const res = await fetch(`/api/image?${queryParams}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const errRes = await res.json();
      throw new Error(errRes.error || "GitHub asset clearance endpoint failed");
    }

    // 2. Clear records from chosen Database target
    const dbType = settings.dbType || "firestore";
    const collectionOrPath = settings.collectionOrPath || "images";

    try {
      if (dbType === "local") {
        const cacheKey = `GIT_CDN_LOCAL_IMAGE_CACHE_${user.uid}`;
        const existingData = localStorage.getItem(cacheKey);
        if (existingData) {
          try {
            let items = JSON.parse(existingData);
            if (Array.isArray(items)) {
              const idKey = settings.keyMappingId || "id";
              items = items.filter((item: any) => item[idKey] !== image.id);
              localStorage.setItem(cacheKey, JSON.stringify(items));
            }
          } catch {}
        }
        setRefreshTrigger((prev) => prev + 1);
      } else if (dbType === "supabase" || dbType === "mongodb") {
        const res2 = await fetch("/api/db/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbType,
            config: settings,
            userId: user.uid,
            imageId: image.id
          })
        });
        if (!res2.ok) {
          const errRes = await res2.json();
          throw new Error(errRes.error || "Failed database deletion proxy request");
        }
        setRefreshTrigger((prev) => prev + 1);
      } else if (dbType === "realtime") {
        if (!rtdb) throw new Error("Realtime Database context is unconfigured.");
        const rtdbPath = `${collectionOrPath}/${user.uid}/${image.id}`;
        await rtdbRemove(rtdbRef(rtdb, rtdbPath));
      } else {
        if (!db) throw new Error("Firestore context is unconfigured.");
        await deleteDoc(doc(db, collectionOrPath, image.id));
      }
    } catch (err) {
      console.error("Database deletion registration failure:", err);
      alert(`Failed to delete record: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const isGithubConfigured = !!(settings?.githubToken && settings?.githubOwner && settings?.githubRepo);

  // 00. Database Security rules check
  if (pendingSecurityCheck) {
    return (
      <SecurityCheckScreen 
        pending={pendingSecurityCheck}
        onCancel={() => setPendingSecurityCheck(null)}
        onConfirm={(isSecured: boolean) => {
          const { type, dbType, config } = pendingSecurityCheck;
          
          if (type === "firebase-setup") {
            // Save Firebase Config
            localStorage.setItem("GIT_CDN_FIREBASE_CONFIG", JSON.stringify(config));
            
            if (isSecured) {
              // Secured -> Go to login screen to enter email/password
              localStorage.removeItem("GIT_CDN_SANDBOX_MODE");
              window.location.reload();
            } else {
              // Public/Test -> Bypass login screen, launch sandbox with Firestore/Realtime DB!
              localStorage.setItem("GIT_CDN_SANDBOX_MODE", "true");
              
              // Preset system settings for public Firestore/Realtime DB
              const sandboxUid = "sandbox-local-user";
              const updatedSettings: GitCDNSettings = {
                userId: sandboxUid,
                githubToken: "",
                githubRepo: "",
                githubOwner: "",
                githubBranch: "main",
                cdnMode: "jsdelivr",
                imageQuality: 80,
                useAiTagging: false,
                dbType: dbType,
                collectionOrPath: dbType === "realtime" ? "/uploaded-assets" : "images",
                supabaseUrl: "",
                supabaseAnonKey: "",
                supabaseTable: "images",
                mongodbUrl: "",
                mongodbApiKey: "",
                mongodbDatabase: "gitcdn",
                mongodbCollection: "images",
                mongodbDataSource: "Cluster0",
                keyMappingId: "id",
                keyMappingUserId: "uploadedBy",
                keyMappingUrl: "url",
                keyMappingOriginalName: "originalName",
                keyMappingGithubPath: "githubPath",
                keyMappingFolder: "folder",
                keyMappingSize: "size",
                keyMappingWidth: "width",
                keyMappingHeight: "height",
                keyMappingFormat: "format",
                keyMappingUploadedAt: "uploadedAt",
                keyMappingTags: "tags",
                keyMappingSha: "sha"
              };
              localStorage.setItem(`GIT_CDN_SYSTEM_SETTINGS_sandbox-local-user`, JSON.stringify(updatedSettings));
              window.location.reload();
            }
          } else {
            // Sandbox flow
            if (isSecured && (dbType === "firestore" || dbType === "realtime")) {
              alert("Since your chosen database is secured with authorization rules, we are redirecting you to configure your custom Firebase Credentials so you can sign in with your admin details or valid login ID to use this console without errors.");
              setPendingSecurityCheck(null);
              setShowIntro(false);
              setConfigured(false); // Opens setup credentials form directly!
            } else {
              handleLaunchSandboxDirectly(dbType);
              setPendingSecurityCheck(null);
            }
          }
        }}
      />
    );
  }

  // 0. Onboarding and Guides Intro Stage
  if (showIntro) {
    return (
      <IntroPage 
        onBypassFirebase={handleLaunchSandbox}
        onGoToFirebaseSetup={() => {
          setShowIntro(false);
          setConfigured(false);
        }}
        onGoToLogin={() => {
          setShowIntro(false);
        }}
        isFirebaseConfigured={configured}
      />
    );
  }

  // 1. Setup Phase: No configuration detected
  if (!configured && !isSandboxMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 selection:bg-blue-500/10 selection:text-blue-800 font-sans">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-2 text-center">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mx-auto border border-blue-105">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-slate-800">Configure Private Firebase</h1>
            <p className="text-slate-400 text-xs px-4">
              Enter details for your custom-owned Firebase node to provision storage logs and auth channels.
            </p>
          </div>

          <form onSubmit={handleSaveSetup} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Web API Key *</label>
              <div className="relative">
                <input
                  type={showSetupApiKey ? "text" : "password"}
                  required
                  placeholder="AIzaSy..."
                  value={setupApiKey}
                  onChange={(e) => setSetupApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSetupApiKey(!showSetupApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
                >
                  {showSetupApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smart-cdn-123"
                  value={setupProjectId}
                  onChange={(e) => setSetupProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auth Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smart-cdn-123.firebaseapp.com"
                  value={setupAuthDomain}
                  onChange={(e) => setSetupAuthDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="e.g. smart-cdn-123.firebasestorage.app"
                  value={setupBucket}
                  onChange={(e) => setSetupBucket(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">App ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1:1234:web:5678"
                  value={setupAppId}
                  onChange={(e) => setSetupAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Messaging Sender ID</label>
                <input
                  type="text"
                  placeholder="e.g. 526617188742"
                  value={setupSenderId}
                  onChange={(e) => setSetupSenderId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Database URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. https://project.firebaseio.com"
                  value={setupDbUrl}
                  onChange={(e) => setSetupDbUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-xs tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-blue-500/20 shadow-lg shadow-blue-600/15"
            >
              <Save className="w-4 h-4" />
              Initialize dynamic setup
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed px-5 font-sans">
            Initializing saves your parameters to local browser cache and automatically compiles the private sandbox dashboard.
          </p>

          <div className="pt-3 border-t border-slate-100 mt-2 text-center">
            <button
              onClick={() => setShowIntro(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-extrabold cursor-pointer flex items-center justify-center gap-1.5 mx-auto font-sans"
            >
              📖 Go Back and Choose Another Database Operator
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading state while authentication completes
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <div className="space-y-4 text-center animate-pulse">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-550 text-xs font-bold font-sans">Authenticating Private Node...</p>
        </div>
      </div>
    );
  }

  // 3. Authentication Sign In Form (Email & Password Only)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 selection:bg-blue-500/10 selection:text-blue-800">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-2 text-center">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mx-auto border border-blue-105">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-slate-850">GitCDN Personal Console</h1>
            <p className="text-slate-450 text-xs leading-relaxed px-2 font-sans">
              Enter your personal email and password to log in. Must be pre-created in your Auth platform.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-xl flex gap-1.5 items-center leading-relaxed font-sans">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. operator@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 font-medium font-sans animate-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-405 hover:text-slate-600 outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-xs tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-blue-500/20 shadow-lg shadow-blue-600/15"
            >
              {signingIn ? "Entering Workspace..." : "Access Console"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Diagnostic Whitelist helper */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2 text-slate-800 leading-relaxed font-sans mt-2 animate-none">
            <span className="font-extrabold flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-amber-800 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Firebase Connection Troubleshooter
            </span>
            <p className="font-sans text-[11px] text-slate-600">
              If your dynamic details were wrong or your host isn't whitelisted, sign-in attempts fail with a <code className="px-1 py-0.5 bg-amber-100 rounded text-amber-900 font-mono text-[9px] font-bold">network-request-failed</code> error.
            </p>
            
            <div className="pt-1.5 space-y-1.5 font-sans">
              <p className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wide">1. Whitelist Active Domain in Firebase Console</p>
              <p className="text-slate-550 text-[11px] leading-relaxed">
                Under Web SDK security policies, your container URL host must be authorized to permit Auth query requests:
              </p>
              <div className="flex items-center justify-between gap-1.5 p-2 bg-white border border-amber-150 rounded-xl font-mono text-[10px] text-slate-700 font-medium select-all">
                <span>{typeof window !== "undefined" ? window.location.hostname : "ais-dev-host"}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(window.location.hostname);
                      alert("Web host domain copied to clipboard!");
                    }
                  }}
                  className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-extrabold text-slate-600 cursor-pointer select-none transition"
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-slate-450 leading-normal italic">
                👉 Paste path: <span className="font-medium text-slate-600">Authentication &gt; Settings &gt; Authorized domains &gt; Add domain</span>
              </p>
            </div>

            <div className="pt-2 border-t border-amber-200/50 space-y-1.5">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="w-full flex items-center justify-between text-left font-extrabold text-slate-700 text-[10px] uppercase tracking-wider cursor-pointer hover:text-blue-700 transition"
              >
                <span>{showDiagnostics ? "Hide Active Saved Config Parameters" : "Inspect Active Config (Check for Typos)"}</span>
                <span className="text-xs">{showDiagnostics ? "▲" : "▼"}</span>
              </button>
              
              {showDiagnostics && (
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 font-mono text-[10px] text-slate-650 leading-relaxed overflow-x-auto">
                  <div>
                    <span className="font-bold text-slate-400">Web API Key:</span>{" "}
                    {setupApiKey ? (
                      <span className="text-slate-800 break-all bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">
                        {setupApiKey.slice(0, 8)}...{setupApiKey.slice(-5)} (Total {setupApiKey.length} ch)
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold">(Not found)</span>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Project ID:</span>{" "}
                    <span className="text-slate-800 bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">{setupProjectId || "(Not found)"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Auth Domain:</span>{" "}
                    <span className="text-slate-800 bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">{setupAuthDomain || "(Not found)"}</span>
                  </div>
                  {setupBucket && (
                    <div>
                      <span className="font-bold text-slate-400">Storage Bucket:</span>{" "}
                      <span className="text-slate-800 bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">{setupBucket}</span>
                    </div>
                  )}
                  {setupAppId && (
                    <div>
                      <span className="font-bold text-slate-400">App ID:</span>{" "}
                      <span className="text-slate-800 bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">{setupAppId}</span>
                    </div>
                  )}
                  {setupDbUrl && (
                    <div>
                      <span className="font-bold text-slate-400">Database URL:</span>{" "}
                      <span className="text-slate-800 bg-white px-1 py-0.5 border border-slate-100 rounded text-[9px]">{setupDbUrl}</span>
                    </div>
                  )}
                  <p className="text-[9px] text-blue-500 italic font-sans pt-1 leading-normal">
                    💡 Spot an error or typo? Click "Edit/Fix Firebase Configuration Details" below to correct them anytime.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Setup reset helper trigger */}
          <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2.5 text-center font-sans">
            <button
              onClick={() => {
                setConfigured(false);
                setShowIntro(false);
              }}
              className="text-xs text-amber-600 hover:text-amber-800 font-extrabold cursor-pointer flex items-center justify-center gap-1.5 font-sans"
            >
              ⚙️ Edit/Fix Firebase Configuration Details
            </button>
            <button
              onClick={() => setShowIntro(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-extrabold cursor-pointer flex items-center justify-center gap-1.5 font-sans"
            >
              📖 Go Back and Choose Another Database Operator
            </button>
            <button
              onClick={() => {
                if (confirm("Reset connection setup? This will clear local browser cache credentials and reset the Firebase initialization setup page.")) {
                  clearFirebaseConfig();
                }
              }}
              className="text-[10px] text-slate-400 hover:text-blue-600 font-semibold cursor-pointer underline decoration-dotted font-sans"
            >
              Reset Firebase Connection Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Console Workspace Render
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-700 font-sans selection:bg-blue-500/10 selection:text-blue-800">
      {/* Sidebar navigation */}
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        userEmail={user.email}
        onSignOut={handleSignOut}
        onClearConfig={clearFirebaseConfig}
        githubConfigured={isGithubConfigured}
      />

      {/* Main viewport area */}
      <main className="flex-1 overflow-y-auto max-h-screen min-w-0">
        {/* Mobile header view banner */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600 fill-current" />
            <span className="font-extrabold text-sm text-slate-850 tracking-tight">GitCDN Console</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (confirm("Clearing dynamic connection configuration?")) {
                  clearFirebaseConfig();
                }
              }}
              title="Reset System Connection"
              className="p-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold tracking-wide"
            >
              Reset Config
            </button>
            <button 
              onClick={handleSignOut}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-650 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Dashboard content routes */}
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Missing git credentials alert warning banner */}
          {!isGithubConfigured && activePage !== "settings" && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="text-left space-y-0.5">
                <p className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Synchronizations Incomplete!
                </p>
                <p className="text-[11px] text-slate-500 font-medium font-sans">
                  Please specify your GitHub PAT and Sync Target Repository on the configurations panel to activate upload workflows.
                </p>
              </div>
              <button
                onClick={() => setActivePage("settings")}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold block rounded-xl transition text-center cursor-pointer text-xs shadow-xs"
              >
                Go to Configurations
              </button>
            </div>
          )}

          {/* Conditional route views rendering */}
          {activePage === "overview" && (
            <DashboardOverview 
              images={images} 
              settings={settings}
              onNavigateToLibrary={() => setActivePage("library")}
              onNavigateToUpload={() => setActivePage("upload")}
              encryptedToken={encryptedToken}
            />
          )}

          {activePage === "upload" && settings && (
            <UploadZone 
              settings={settings} 
              onUploadSuccess={handleUploadFinished}
              folders={folders}
            />
          )}

          {activePage === "library" && (
            <Gallery 
              images={images} 
              folders={folders}
              activeFolder={activeFolder}
              onSelectFolder={setActiveFolder}
              onDeleteImage={handleDeleteImage}
              githubConfigured={isGithubConfigured}
              settings={settings}
              encryptedToken={encryptedToken}
            />
          )}

          {activePage === "analytics" && (
            <AnalyticsView images={images} settings={settings} />
          )}

          {activePage === "settings" && settings && (
            <SettingsPanel 
              settings={settings} 
              onSaveSettings={handleSaveSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}
