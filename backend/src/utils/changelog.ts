import { PrismaClient, ChangeAction } from '@prisma/client';

export interface LogChangeParams {
  prisma: PrismaClient;
  entityType:
    | 'Machine'
    | 'Network'
    | 'VLAN'
    | 'Port'
    | 'Service'
    | 'Location'
    | 'IPAddress'
    | 'NetworkInterface'
    | 'DiscoveryScan'
    | 'DiscoveryChange'
    | 'User'
    | 'Settings'
    | 'Tag'
    | 'Topology'
    | 'TopologyNode'
    | 'TopologyEdge'
    | 'Asset'
    | 'AssetHistory'
    | 'HardwareComponent'
    | 'Warranty'
    | 'Supplier'
    | 'Purchase'
    | 'License'
    | 'Software'
    | 'AssetDocument'
    | 'Ticket'
    | 'TicketComment'
    | 'SLA'
    | 'Maintenance'
    | 'MaintenanceWindow'
    | 'Task'
    | 'Change'
    | 'ChangeApproval'
    | 'Runbook'
    | 'AIConversation'
    | 'AIConfiguration'
    // V11
    | 'AutomationAction'
    | 'Workflow'
    | 'WorkflowVersion'
    | 'WorkflowRun'
    | 'ApprovalRequest'
    | 'AutomationPolicy'
    | 'Agent'
    | 'AIActionProposal';
  entityId: string;
  action: ChangeAction;
  details: string;
  user?: string;
  machineId?: string;
}

export async function logChange(params: LogChangeParams): Promise<void> {
  try {
    await params.prisma.changeLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        details: params.details,
        user: params.user || 'system',
        machineId: params.machineId || (params.entityType === 'Machine' ? params.entityId : undefined),
      },
    });
  } catch (error) {
    console.error('⚠️ Failed to record change log:', error);
  }
}
