/**
 * Common type definitions for the WallWhale
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { PrismaClient } from "@prisma/client";

// Base response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
  statusCode: number;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication types
export interface AuthenticatedRequest extends FastifyRequest {
  user?: UserPayload;
  apiKey?: ApiKeyPayload;
}

export interface UserPayload {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
}

export interface ApiKeyPayload {
  keyId: string;
  ownerId: string;
  scopes: string[];
  rateLimit?: number;
  quotaDaily?: number;
  quotaMonthly?: number;
  maxConcurrent?: number;
  maxRuntimeSeconds?: number;
}

// Download types
export interface DownloadJobRequest {
  urlOrId: string;
  accountName: string;
  saveRoot?: string;
}

export interface DownloadJobResponse {
  id: string;
  pubfileId: string;
  status: JobStatus;
  accountName: string;
  saveRoot: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  zipPath?: string;
}

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELED";

// Steam account types
export interface SteamAccountData {
  name: string;
  username: string;
  password: string;
  displayName?: string;
  status: "ACTIVE" | "BANNED" | "INACTIVE";
}

// Health check types
export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface DetailedStatus extends HealthStatus {
  services: Record<string, ServiceStatus>;
  metrics: SystemMetrics;
}

export interface ServiceStatus {
  status: "ok" | "degraded" | "down";
  lastChecked: string;
  responseTime?: number;
  error?: string;
}

export interface SystemMetrics {
  uptime: number;
  memory: MemoryMetrics;
  cpu: NodeJS.CpuUsage;
  activeConnections?: number;
  totalRequests?: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  rss: number;
  external?: number;
}

// Audit types
export interface AuditLogEntry {
  action: string;
  userId?: string;
  apiKeyId?: string;
  ip?: string;
  route?: string;
  method?: string;
  status?: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Configuration types
export interface ServerConfig {
  app: AppConfig;
  server: ServerConfig;
  security: SecurityConfig;
  features: FeatureConfig;
  limits: LimitConfig;
}

export interface AppConfig {
  name: string;
  version: string;
  environment: string;
  description?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  apiKeySalt: string;
  bcryptRounds: number;
  corsOrigins: string | string[];
  ipAllowList?: string[];
  ipDenyList?: string[];
}

export interface FeatureConfig {
  metrics: boolean;
  healthChecks: boolean;
  documentation: boolean;
  autoCleanup: boolean;
  tls: boolean;
}

export interface LimitConfig {
  globalConcurrency: number;
  perKeyConcurrency: number;
  rateLimit: RateLimitConfig;
  requestTimeout: number;
  maxUploadSize: string;
}

export interface RateLimitConfig {
  window: number;
  max: number;
  skipFailedRequests: boolean;
}

// Utility types
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Database extensions
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// Environment variable augmentation
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "test" | "staging" | "production";
      PORT: string;
      HOST: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      API_KEY_SALT: string;
      STEAM_ACCOUNTS: string;
      SAVE_ROOT: string;
      DEPOTDOWNLOADER_PATH: string;
      TLS_ENABLE: string;
      TLS_KEY_PATH?: string;
      TLS_CERT_PATH?: string;
    }
  }
}

export {};
