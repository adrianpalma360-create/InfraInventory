import { z } from 'zod';

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty').trim(),
  context: z.record(z.any()).optional(), // Optional context passed from current UI view (e.g. current machineId)
});

export const directQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').trim(),
  maxResults: z.number().int().min(1).max(100).default(20),
});

export const analyzeRequestSchema = z.object({
  targetType: z.enum(['MACHINE', 'NETWORK', 'INCIDENT', 'CAPACITY', 'INFRASTRUCTURE', 'COMPARISON']),
  targetId: z.string().optional(),
  targetIds: z.array(z.string()).optional(), // For comparisons
  question: z.string().optional(),
  period: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h'),
});

export const reportRequestSchema = z.object({
  reportType: z.enum(['INFRASTRUCTURE_SUMMARY', 'AVAILABILITY', 'SECURITY_AUDIT', 'CAPACITY_PLANNING', 'HARDWARE_WARRANTY', 'SLA_COMPLIANCE']),
  period: z.enum(['today', '7d', '30d', '90d', 'year']).default('7d'),
  format: z.enum(['JSON', 'MARKDOWN', 'CSV']).default('MARKDOWN'),
});

export const aiConfigSchema = z.object({
  isEnabled: z.boolean().default(true),
  provider: z.enum(['ollama', 'openai', 'custom']).default('ollama'),
  baseUrl: z.string().url().default('http://ollama:11434'),
  model: z.string().min(1).default('llama3:8b'),
  apiKey: z.string().optional().nullable(),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
  maxTokens: z.number().int().min(128).max(16384).default(2048),
  temperature: z.number().min(0).max(1).default(0.1),
  rateLimitPerMinute: z.number().int().min(1).max(600).default(60),
  maxHistoryMessages: z.number().int().min(1).max(50).default(10),
});

export const testConnectionSchema = z.object({
  provider: z.string().default('ollama'),
  baseUrl: z.string().url().default('http://ollama:11434'),
  model: z.string().default('llama3:8b'),
  apiKey: z.string().optional().nullable(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type DirectQueryInput = z.infer<typeof directQuerySchema>;
export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;
export type ReportRequestInput = z.infer<typeof reportRequestSchema>;
export type AIConfigInput = z.infer<typeof aiConfigSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
