import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import fs from "fs";

const ENCRYPTION_KEY = process.env.SECURE_PROXY_SECRET || "a-default-32-character-secret-key-gitcdn"; // Must be at least 32 characters
const IV_LENGTH = 16; // AES standard initialization vector length

// Use writeable /tmp path if on Vercel or if the current folder is not writeable
const SHORTLINKS_FILE = process.env.VERCEL || process.env.NODE_ENV === "production"
  ? path.join("/tmp", "shortlinks.json")
  : path.join(process.cwd(), "shortlinks.json");

// Helper in-memory store to prevent disk write restriction 404s on serverless/Vercel
const memoryShortlinks: Record<string, any> = {};

// Helper to load shortlinks
function loadShortlinks(): Record<string, any> {
  const diskLinks: Record<string, any> = {};
  try {
    if (fs.existsSync(SHORTLINKS_FILE)) {
      const data = fs.readFileSync(SHORTLINKS_FILE, "utf8");
      Object.assign(diskLinks, JSON.parse(data));
    }
  } catch (err) {
    console.error("Failed to load shortlinks from file:", err);
  }
  return { ...diskLinks, ...memoryShortlinks };
}

// Helper to save shortlinks
function saveShortlink(code: string, mapping: any) {
  // Always record in warm serverless memory first so it is immediately resolvable
  memoryShortlinks[code] = mapping;
  try {
    const data: Record<string, any> = {};
    if (fs.existsSync(SHORTLINKS_FILE)) {
      try {
        const fileContent = fs.readFileSync(SHORTLINKS_FILE, "utf8");
        Object.assign(data, JSON.parse(fileContent));
      } catch {
        // Safe parse fallback
      }
    }
    data[code] = mapping;
    fs.writeFileSync(SHORTLINKS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to write shortlinks file to local disk, continuing with in-memory persistence:", err);
  }
}

// Helper to fetch image from GitHub reliably
async function fetchImageFromGithub(
  githubOwner: string,
  githubRepo: string,
  githubPath: string,
  token: string,
  githubBranch: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  let contentType = "image/webp";
  const pathStr = githubPath.toLowerCase();
  if (pathStr.endsWith(".png")) contentType = "image/png";
  else if (pathStr.endsWith(".jpg") || pathStr.endsWith(".jpeg")) contentType = "image/jpeg";
  else if (pathStr.endsWith(".gif")) contentType = "image/gif";
  else if (pathStr.endsWith(".svg")) contentType = "image/svg+xml";
  else if (pathStr.endsWith(".ico")) contentType = "image/x-icon";
  else if (pathStr.endsWith(".bmp")) contentType = "image/bmp";

  // Attempt raw githubusercontent link
  const rawUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch || "main"}/${githubPath}`;
  try {
    const response = await fetch(rawUrl, {
      headers: {
        Authorization: `token ${token}`
      }
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer), contentType };
    }
  } catch (err) {
    console.warn("Direct raw fetch failed, trying contents api fallback:", err);
  }

  // Backup fallback using the GitHub contents API (necessary for private repos in some scenarios)
  try {
    const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubPath}?ref=${githubBranch || "main"}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitCDN-SaaS-Server"
      }
    });

    if (apiRes.ok) {
      const data = (await apiRes.json()) as any;
      if (data.content) {
        const cleanB64 = data.content.replace(/[\r\n\s]+/g, "");
        const buffer = Buffer.from(cleanB64, "base64");
        return { buffer, contentType };
      }
    }
  } catch (err) {
    console.error("GitHub contents api fallback failed:", err);
  }

  return null;
}

function encrypt(text: string): string {
  try {
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (err) {
    console.error("Encryption failed:", err);
    return "";
  }
}

function decrypt(text: string): string {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    if (iv.length !== IV_LENGTH) return "";
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, undefined as any, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return "";
  }
}

const app = express();

// Set up generous payload limits for base64 uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini AI Client (Lazy load when API Key is checked)
const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required for AI Tagging");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "GitCDN-Server",
      },
    },
  });
};

  // --- API ROUTES ---

  // --- DATABASE OPERATIONS PROXY ---
  app.post("/api/db/list", async (req, res) => {
    try {
      const { dbType, config, userId } = req.body;
      if (!dbType || !userId || !config) {
        return res.status(400).json({ error: "Missing dbType, userId or database config parameters" });
      }

      if (dbType === "supabase") {
        const { supabaseUrl, supabaseAnonKey, supabaseTable } = config;
        if (!supabaseUrl || !supabaseAnonKey || !supabaseTable) {
          return res.status(400).json({ error: "Incomplete Supabase configuration parameters" });
        }

        const userKey = config.keyMappingUserId || "uploadedBy";
        const targetUrl = `${supabaseUrl}/rest/v1/${supabaseTable}?select=*&${userKey}=eq.${encodeURIComponent(userId)}`;
        
        const response = await fetch(targetUrl, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Supabase Error: ${errText}` });
        }

        const data = await response.json();
        return res.json({ success: true, data });
      } 
      
      if (dbType === "mongodb") {
        const { mongodbUrl, mongodbApiKey, mongodbDatabase, mongodbCollection, mongodbDataSource } = config;
        if (!mongodbUrl || !mongodbApiKey || !mongodbDatabase || !mongodbCollection || !mongodbDataSource) {
          return res.status(400).json({ error: "Incomplete MongoDB Atlas configuration parameters" });
        }

        const userKey = config.keyMappingUserId || "uploadedBy";
        const targetUrl = `${mongodbUrl}/action/find`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "api-key": mongodbApiKey,
            "Content-Type": "application/json",
            "Access-Control-Request-Headers": "*"
          },
          body: JSON.stringify({
            dataSource: mongodbDataSource,
            database: mongodbDatabase,
            collection: mongodbCollection,
            filter: { [userKey]: userId }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `MongoDB Data API Error: ${errText}` });
        }

        const resData = (await response.json()) as any;
        const documents = resData.documents || [];
        return res.json({ success: true, data: documents });
      }

      return res.status(400).json({ error: `Database type '${dbType}' is not managed via server proxy` });
    } catch (err: any) {
      console.error("Database list retrieval proxy failed:", err);
      return res.status(500).json({ error: "Internal server proxy failure during database read operation", message: err.message });
    }
  });

  app.post("/api/db/save", async (req, res) => {
    try {
      const { dbType, config, userId, imageId, customDoc } = req.body;
      if (!dbType || !userId || !config || !imageId || !customDoc) {
        return res.status(400).json({ error: "Missing list save parameters: dbType, userId, config, imageId, or customDoc" });
      }

      if (dbType === "supabase") {
        const { supabaseUrl, supabaseAnonKey, supabaseTable } = config;
        if (!supabaseUrl || !supabaseAnonKey || !supabaseTable) {
          return res.status(400).json({ error: "Incomplete Supabase configuration parameters" });
        }

        const targetUrl = `${supabaseUrl}/rest/v1/${supabaseTable}`;
        
        // Supabase/PostgREST upsert requires Prefer: resolution=merge-duplicates, return=representation
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates, return=representation"
          },
          body: JSON.stringify(customDoc)
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Supabase Error: ${errText}` });
        }

        return res.json({ success: true });
      }

      if (dbType === "mongodb") {
        const { mongodbUrl, mongodbApiKey, mongodbDatabase, mongodbCollection, mongodbDataSource } = config;
        if (!mongodbUrl || !mongodbApiKey || !mongodbDatabase || !mongodbCollection || !mongodbDataSource) {
          return res.status(400).json({ error: "Incomplete MongoDB Atlas configuration parameters" });
        }

        const idKey = config.keyMappingId || "id";
        const targetUrl = `${mongodbUrl}/action/updateOne`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "api-key": mongodbApiKey,
            "Content-Type": "application/json",
            "Access-Control-Request-Headers": "*"
          },
          body: JSON.stringify({
            dataSource: mongodbDataSource,
            database: mongodbDatabase,
            collection: mongodbCollection,
            filter: { [idKey]: imageId },
            update: { $set: customDoc },
            upsert: true
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `MongoDB Data API Error: ${errText}` });
        }

        return res.json({ success: true });
      }

      return res.status(400).json({ error: `Database type '${dbType}' is not managed via server proxy` });
    } catch (err: any) {
      console.error("Database save proxy failed:", err);
      return res.status(500).json({ error: "Internal server proxy failure during database save operation", message: err.message });
    }
  });

  app.post("/api/db/delete", async (req, res) => {
    try {
      const { dbType, config, userId, imageId } = req.body;
      if (!dbType || !userId || !config || !imageId) {
        return res.status(400).json({ error: "Missing delete parameters: dbType, userId, config, or imageId" });
      }

      if (dbType === "supabase") {
        const { supabaseUrl, supabaseAnonKey, supabaseTable } = config;
        if (!supabaseUrl || !supabaseAnonKey || !supabaseTable) {
          return res.status(400).json({ error: "Incomplete Supabase configuration parameters" });
        }

        const idKey = config.keyMappingId || "id";
        const targetUrl = `${supabaseUrl}/rest/v1/${supabaseTable}?${idKey}=eq.${encodeURIComponent(imageId)}`;

        const response = await fetch(targetUrl, {
          method: "DELETE",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
          }
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `Supabase Error: ${errText}` });
        }

        return res.json({ success: true });
      }

      if (dbType === "mongodb") {
        const { mongodbUrl, mongodbApiKey, mongodbDatabase, mongodbCollection, mongodbDataSource } = config;
        if (!mongodbUrl || !mongodbApiKey || !mongodbDatabase || !mongodbCollection || !mongodbDataSource) {
          return res.status(400).json({ error: "Incomplete MongoDB Atlas configuration parameters" });
        }

        const idKey = config.keyMappingId || "id";
        const targetUrl = `${mongodbUrl}/action/deleteOne`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "api-key": mongodbApiKey,
            "Content-Type": "application/json",
            "Access-Control-Request-Headers": "*"
          },
          body: JSON.stringify({
            dataSource: mongodbDataSource,
            database: mongodbDatabase,
            collection: mongodbCollection,
            filter: { [idKey]: imageId }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: `MongoDB Data API Error: ${errText}` });
        }

        return res.json({ success: true });
      }

      return res.status(400).json({ error: `Database type '${dbType}' is not managed via server proxy` });
    } catch (err: any) {
      console.error("Database deletion proxy failed:", err);
      return res.status(500).json({ error: "Internal server proxy failure during database delete operation", message: err.message });
    }
  });

  // Route to safely encrypt a GitHub PAT to protect key exposure
  app.post("/api/encrypt-token", (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Missing token parameter to encrypt" });
      }
      const encrypted = encrypt(token);
      return res.json({ encryptedToken: encrypted });
    } catch (err: any) {
      console.error("Endpoint token encryption failed:", err);
      return res.status(500).json({ error: "Encryption routine failed", message: err.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Upload optimized image to GitHub + Optional AI Tagging
  app.post("/api/upload", async (req, res) => {
    try {
      const {
        name,
        originalName,
        base64Data, // Data URL style: data:image/webp;base64,...
        folder,
        githubToken,
        githubRepo,
        githubOwner,
        githubBranch,
        cdnMode,
        useAiTagging,
        width,
        height,
        size
      } = req.body;

      // Validation
      if (!base64Data) {
        return res.status(400).json({ error: "Missing image data payload" });
      }
      if (!githubToken || !githubRepo || !githubOwner || !githubBranch) {
        return res.status(400).json({ error: "Incomplete GitHub credentials in query" });
      }

      // Strip data URL scheme if exists
      let cleanBase64 = base64Data;
      let detectedMime = "image/webp";

      if (base64Data.includes(";base64,")) {
        const parts = base64Data.split(";base64,");
        detectedMime = parts[0].replace(/^data:/, "");
        cleanBase64 = parts[1];
      }

      // Strip any line breaks, carriage returns or spaces from base64 string
      cleanBase64 = cleanBase64.replace(/[\r\n\s]+/g, "");

      const cleanFolder = (folder || "uploads").replace(/^\/+|\/+$/g, "");
      const finalFileName = `${name}_${Date.now()}.webp`;
      const githubPath = cleanFolder ? `${cleanFolder}/${finalFileName}` : finalFileName;

      // 1. Upload to GitHub via REST API
      const commitMessage = `Upload ${finalFileName} via GitCDN`;
      const githubUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubPath}`;

      const githubRes = await fetch(githubUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "GitCDN-SaaS-Server"
        },
        body: JSON.stringify({
          message: commitMessage,
          content: cleanBase64,
          branch: githubBranch
        })
      });

      if (!githubRes.ok) {
        const errText = await githubRes.text();
        console.error("GitHub upload error response:", errText);
        return res.status(githubRes.status).json({
          error: `GitHub API error: ${githubRes.statusText}`,
          details: errText
        });
      }

      const uploadData = await githubRes.json();

      // 2. Generate CDN url
      // standard is: https://cdn.jsdelivr.net/gh/USERNAME/REPO@branch/path
      const finalCdnUrl = cdnMode === "jsdelivr" 
        ? `https://cdn.jsdelivr.net/gh/${githubOwner}/${githubRepo}@${githubBranch}/${githubPath}`
        : `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/${githubPath}`;

      // 3. Optional AI Tagging using Gemini API
      let tags: string[] = [];
      if (useAiTagging && process.env.GEMINI_API_KEY) {
        try {
          const ai = getGeminiClient();
          const imagePart = {
            inlineData: {
              // Convert inline MIME type if possible
              mimeType: detectedMime,
              data: cleanBase64
            }
          };
          const textPart = {
            text: "Generate a list of 3-5 tags representing the subjects, visual style, or contents of this image. Return them as a comma-separated list of pure lower-case alphanumeric words. (e.g. computer, dashboard, corporate, minimalist). Do not output markdown, lists, numbering, or introductory sentences. Output ONLY the words."
          };

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: { parts: [imagePart, textPart] }
          });

          const resText = aiResponse.text || "";
          tags = resText
            .split(",")
            .map((t: string) => t.trim().toLowerCase())
            .filter((t: string) => t.length > 0);
        } catch (aiErr) {
          console.error("AI Tagging failed:", aiErr);
          // Don't fail the upload if AI Tagging fails
        }
      }

      // Generate unique 7-character shortCode
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let shortCode = "";
      for (let i = 0; i < 7; i++) {
        shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Securely encrypt secret token before local persistence mapping
      const secureToken = encrypt(githubToken);

      // Save shortlink mapping to host database (workspace JSON file)
      saveShortlink(shortCode, {
        githubOwner,
        githubRepo,
        githubBranch: githubBranch || "main",
        githubPath,
        githubToken: secureToken
      });

      // Construct dynamic short URL pointing to this website deployment
      const host = req.headers.host || "localhost:3000";
      const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const finalShortUrl = `${protocol}://${host}/images/${shortCode}`;

      return res.json({
        success: true,
        url: finalShortUrl,
        rawCdnUrl: finalCdnUrl,
        githubPath,
        sha: uploadData.content?.sha || "",
        tags,
        width: width || 800,
        height: height || 600,
        size: size || cleanBase64.length * 0.75, // approximate size if missing
        format: "webp",
        uploadedAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("Server upload API failure:", err);
      return res.status(500).json({ error: "Internal server error inside GitCDN upload engine", message: err.message });
    }
  });

  // Secure proxy route to serve images from private or cached repositories
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const { githubOwner, githubRepo, githubPath, githubToken, githubBranch, token } = req.query;

      let resolvedToken = (githubToken as string) || "";
      if (token && typeof token === "string") {
        resolvedToken = decrypt(token);
      }

      if (!githubOwner || !githubRepo || !githubPath || !resolvedToken) {
        return res.status(400).send("Missing secure proxy parameters or token decryption failed");
      }

      const imageResult = await fetchImageFromGithub(
        githubOwner as string,
        githubRepo as string,
        githubPath as string,
        resolvedToken,
        (githubBranch as string) || "main"
      );

      if (imageResult) {
        res.setHeader("Content-Type", imageResult.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(imageResult.buffer);
      }

      return res.status(404).send("Failed to resolve repository image content");
    } catch (err: any) {
      console.error("Secure proxy image delivery failure:", err);
      return res.status(500).send(err.message || "Internal server error serving secure proxy");
    }
  });

  // Short URL resolution endpoint to serve images perfectly using shortCode
  app.get("/images/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      if (!shortCode || shortCode.length !== 7) {
        return res.status(400).send("Invalid short image reference code shape");
      }

      const mapping = loadShortlinks()[shortCode];
      if (!mapping) {
        return res.status(404).send("Image short link not found or expired from this instance database");
      }

      const { githubOwner, githubRepo, githubBranch, githubPath, githubToken } = mapping;
      if (!githubOwner || !githubRepo || !githubPath || !githubToken) {
        return res.status(500).send("Incomplete short link mapping details");
      }

      // Decrypt token if it is stored in secure encrypted format
      let resolvedToken = githubToken;
      if (githubToken.includes(":")) {
        resolvedToken = decrypt(githubToken);
      }

      const imageResult = await fetchImageFromGithub(
        githubOwner,
        githubRepo,
        githubPath,
        resolvedToken,
        githubBranch || "main"
      );

      if (imageResult) {
        res.setHeader("Content-Type", imageResult.contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(imageResult.buffer);
      }

      return res.status(404).send("Failed to resolve or fetch raw image from git repository");
    } catch (err: any) {
      console.error("Shortlink serving failure:", err);
      return res.status(500).send(err.message || "Internal server error serving shortlink image");
    }
  });

  // Delete from GitHub repository
  app.delete("/api/image", async (req, res) => {
    try {
      const {
        githubToken,
        githubOwner,
        githubRepo,
        githubBranch,
        githubPath,
        sha
      } = req.query;

      if (!githubToken || !githubOwner || !githubRepo || !githubPath) {
        return res.status(400).json({ error: "Missing required GitHub delete query parameters" });
      }

      let currentSha = sha;

      // If SHA of the file was not provided by the client, seek it by querying GitHub content metadata
      if (!currentSha) {
        const metadataUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubPath}?ref=${githubBranch || "main"}`;
        const metadataRes = await fetch(metadataUrl, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitCDN-SaaS-Server"
          }
        });
        if (metadataRes.ok) {
          const fileMeta = await metadataRes.json() as any;
          currentSha = fileMeta.sha;
        } else {
          return res.status(404).json({ error: "Could not find image in repository to obtain SHA check" });
        }
      }

      const deleteUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubPath}`;
      const deleteRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "GitCDN-SaaS-Server"
        },
        body: JSON.stringify({
          message: `Delete ${githubPath} via GitCDN Console`,
          sha: currentSha,
          branch: githubBranch || "main"
        })
      });

      if (!deleteRes.ok) {
        const errText = await deleteRes.text();
        return res.status(deleteRes.status).json({
          error: `Failed to remove asset from GitHub repository: ${deleteRes.statusText}`,
          details: errText
        });
      }

      return res.json({ success: true, message: "Asset successfully purged from GitHub repository" });

    } catch (err: any) {
      console.error("Purging file from repository error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // --- CLIENT SERVING & STANDALONE LISTEN ---
async function startStandaloneServer() {
  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GitCDN Backend Server] running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone server if not imported by a serverless provider like Vercel
if (!process.env.VERCEL) {
  startStandaloneServer();
}

export default app;
