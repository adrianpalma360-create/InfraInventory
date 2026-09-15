import { PrismaClient, ChangeAction } from '@prisma/client';
import { CreatePortInput, UpdatePortInput } from './ports.schema.js';
import { logChange } from '../../utils/changelog.js';

export class PortsService {
  constructor(private prisma: PrismaClient) {}

  async list(machineId?: string) {
    return this.prisma.port.findMany({
      where: machineId ? { machineId } : undefined,
      include: {
        machine: true,
        service: true,
      },
      orderBy: [{ portNumber: 'asc' }, { protocol: 'asc' }],
    });
  }

  async create(data: CreatePortInput) {
    const existing = await this.prisma.port.findUnique({
      where: {
        machineId_portNumber_protocol: {
          machineId: data.machineId,
          portNumber: data.portNumber,
          protocol: data.protocol,
        },
      },
    });

    if (existing) {
      throw new Error(`Port ${data.portNumber}/${data.protocol} already exists on this machine`);
    }

    const port = await this.prisma.port.create({
      data,
      include: { machine: true, service: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Port',
      entityId: port.id,
      action: ChangeAction.CREATE,
      details: `Added port ${port.portNumber}/${port.protocol} (${port.service?.name || 'Unknown service'}) to ${port.machine.hostname}`,
      machineId: data.machineId,
    });

    return port;
  }

  async update(id: string, data: UpdatePortInput) {
    const port = await this.prisma.port.update({
      where: { id },
      data,
      include: { machine: true, service: true },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'Port',
      entityId: id,
      action: ChangeAction.UPDATE,
      details: `Updated port ${port.portNumber}/${port.protocol} on ${port.machine.hostname}`,
      machineId: port.machineId,
    });

    return port;
  }

  async delete(id: string) {
    const existing = await this.prisma.port.findUnique({
      where: { id },
      include: { machine: true },
    });
    if (!existing) throw new Error('Port not found');

    await logChange({
      prisma: this.prisma,
      entityType: 'Port',
      entityId: id,
      action: ChangeAction.DELETE,
      details: `Removed port ${existing.portNumber}/${existing.protocol} from ${existing.machine.hostname}`,
      machineId: existing.machineId,
    });

    await this.prisma.port.delete({ where: { id } });
    return { success: true, message: 'Port deleted successfully' };
  }
}
