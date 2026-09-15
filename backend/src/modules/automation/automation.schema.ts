import { z } from 'zod';

export const actionRiskLevelEnum = z.enum(['READ_ONLY', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const actionTargetTypeEnum = z.enum(['MACHINE', 'ASSET', 'GROUP', 'TAG', 'LOCATION', 'NETWORK']);
export const workflowRunStatusEnum = z.enum(['QUEUED', 'RUNNING', 'WAITING_APPROVAL', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT', 'PARTIAL']);
export const stepExecutionStatusEnum = z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'TIMEOUT', 'CANCELLED']);
export const approvalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED']);
export const agentStatusEnum = z.enum(['ONLINE', 'OFFLINE', 'WARNING', 'REVOKED']);
export const agentOsTypeEnum = z.enum(['WINDOWS', 'LINUX', 'DARWIN', 'OTHER']);
export const aiProposalStatusEnum = z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXECUTED', 'DISCARDED']);

// 1. Action Schemas
export const createActionSchema = z.object({
  name: z.string().min(2).regex(/^[a-z0-9_-]+$/, 'Action name must be lowercase alphanumeric with dashes or underscores'),
  label: z.string().min(2),
  description: z.string().optional(),
  category: z.string().default('DIAGNOSTIC'),
  riskLevel: actionRiskLevelEnum.default('READ_ONLY'),
  defaultTimeoutSec: z.number().int().min(1).max(3600).default(30),
  defaultRetryCount: z.number().int().min(0).max(5).default(0),
  commandTemplate: z.string().optional(),
  supportedOs: z.array(z.string()).default(['WINDOWS', 'LINUX']),
  parametersSchema: z.record(z.any()).optional(),
  requiresAgent: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const updateActionSchema = createActionSchema.partial();

// 2. Workflow Step Schema
export const workflowStepInputSchema = z.object({
  order: z.number().int().min(1),
  actionName: z.string().min(1),
  label: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  condition: z.enum(['ALWAYS', 'ON_SUCCESS', 'ON_FAILURE']).default('ALWAYS'),
  continueOnError: z.boolean().default(false),
  timeoutSec: z.number().int().min(1).max(3600).default(30),
  retryCount: z.number().int().min(0).max(5).default(0),
  retryIntervalSec: z.number().int().min(1).max(60).default(5),
});

// 3. Workflow Schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  category: z.string().default('GENERAL'),
  enabled: z.boolean().default(true),
  targetType: actionTargetTypeEnum.default('MACHINE'),
  concurrencyLimit: z.number().int().min(1).max(50).default(5),
  timeoutTotalSec: z.number().int().min(10).max(7200).default(600),
  cronSchedule: z.string().optional().nullable(),
  isTemplate: z.boolean().default(false),
  circuitBreakerThreshold: z.number().int().min(1).max(20).default(5),
  steps: z.array(workflowStepInputSchema).min(1, 'El workflow debe tener al menos un paso'),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  enabled: z.boolean().optional(),
  targetType: actionTargetTypeEnum.optional(),
  concurrencyLimit: z.number().int().min(1).max(50).optional(),
  timeoutTotalSec: z.number().int().min(10).max(7200).optional(),
  cronSchedule: z.string().optional().nullable(),
  isTemplate: z.boolean().optional(),
  circuitBreakerThreshold: z.number().int().min(1).max(20).optional(),
  createNewVersion: z.boolean().default(true),
  versionNotes: z.string().optional(),
  steps: z.array(workflowStepInputSchema).optional(),
});

export const executeWorkflowSchema = z.object({
  targetType: actionTargetTypeEnum.default('MACHINE'),
  targetIdentifier: z.string().min(1, 'Target identifier is required'),
  isDryRun: z.boolean().default(false),
  reason: z.string().optional(),
  overrideParameters: z.record(z.any()).optional(),
});

// 4. Approval Schemas
export const createApprovalRequestSchema = z.object({
  actionName: z.string().min(1),
  targetType: actionTargetTypeEnum.default('MACHINE'),
  targetIdentifier: z.string().min(1),
  targetLabel: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  riskLevel: actionRiskLevelEnum.default('MEDIUM'),
  reason: z.string().min(5, 'Reason must be provided (min 5 characters)'),
  evidence: z.record(z.any()).optional(),
  expiresInMinutes: z.number().int().min(5).max(10080).default(1440), // 24 hours default
});

export const decideApprovalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

// 5. Policy Schemas
export const createPolicySchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  groupName: z.string().optional().nullable(),
  maxRiskLevelAllowed: actionRiskLevelEnum.default('MEDIUM'),
  requireApprovalForRisk: actionRiskLevelEnum.default('MEDIUM'),
  enforceFourEyes: z.boolean().default(true),
  allowAutoRemediation: z.boolean().default(false),
  allowRemoteExecution: z.boolean().default(false),
  maintenanceWindowAware: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export const updatePolicySchema = createPolicySchema.partial();

// 6. Agent Schemas
export const registerAgentSchema = z.object({
  hostname: z.string().min(1),
  osType: agentOsTypeEnum.default('LINUX'),
  osVersion: z.string().optional(),
  ipAddress: z.string().optional(),
  agentVersion: z.string().default('1.0.0'),
  capabilities: z.array(z.string()).default(['TELEMETRY', 'HEALTH_CHECK']),
  allowRemoteExecution: z.boolean().default(false),
  machineId: z.string().optional(),
});

export const agentHeartbeatSchema = z.object({
  agentId: z.string().min(1),
  token: z.string().min(1),
  cpuUsage: z.number().min(0).max(100).optional(),
  ramUsage: z.number().min(0).max(100).optional(),
  diskUsage: z.number().min(0).max(100).optional(),
  uptimeSeconds: z.number().int().min(0).optional(),
  activeServicesCount: z.number().int().min(0).optional(),
  activeProcessesCount: z.number().int().min(0).optional(),
  systemPayload: z.record(z.any()).optional(),
});

// 7. AI Action Proposal Schemas
export const createAIProposalSchema = z.object({
  problemDescription: z.string().min(5),
  proposedAction: z.string().min(1),
  targetType: actionTargetTypeEnum.default('MACHINE'),
  targetId: z.string().min(1),
  targetLabel: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  riskLevel: actionRiskLevelEnum.default('MEDIUM'),
  reason: z.string().min(5),
  evidence: z.record(z.any()).optional(),
  suggestedByModel: z.string().default('llama3:8b'),
});

export const decideAIProposalSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'EXECUTE']),
  reason: z.string().optional(),
});
