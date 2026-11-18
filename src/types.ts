export interface ImageMetadata {
  id: string;
  name: string;
  originalName: string;
  url: string;
  githubPath: string;
  folder: string;
  size: number;
  width: number;
  height: number;
  format: string;
  uploadedBy: string;
  uploadedAt: string; // ISO String
  tags?: string[];
  sha?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string; // ISO String
}

export interface GitCDNSettings {
  userId: string;
  githubToken: string;
  githubRepo: string;
  githubOwner: string;
  githubBranch: string;
  cdnMode: "jsdelivr" | "raw";
  imageQuality: number;
  useAiTagging: boolean;
  dbType?: "firestore" | "realtime" | "supabase" | "mongodb" | "local";
  collectionOrPath?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseTable?: string;
  mongodbUrl?: string;
  mongodbApiKey?: string;
  mongodbDatabase?: string;
  mongodbCollection?: string;
  mongodbDataSource?: string;
  keyMappingId?: string;
  keyMappingUserId?: string;
  keyMappingUrl?: string;
  keyMappingOriginalName?: string;
  keyMappingGithubPath?: string;
  keyMappingFolder?: string;
  keyMappingSize?: string;
  keyMappingWidth?: string;
  keyMappingHeight?: string;
  keyMappingFormat?: string;
  keyMappingUploadedAt?: string;
  keyMappingTags?: string;
  keyMappingSha?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
