import { PrismaClient } from '@prisma/client';

export class GlobalSearchService {
  constructor(private prisma: PrismaClient) {}

  async search(query: string) {
    if (!query || query.trim().length === 0) {
      return {
        query: '',
        totalResults: 0,
        results: {
          machines: [],
          ips: [],
          networks: [],
          vlans: [],
          services: [],
          ports: [],
          locations: [],
          tags: [],
          incidents: [],
          topologies: [],
        },
      };
    }

    const term = query.trim();

    const [
      machines,
      ips,
      networks,
      vlans,
      services,
      ports,
      locations,
      tags,
      incidents,
      topologies,
      assets,
      licenses,
      software,
      suppliers,
      purchases,
      tickets,
      maintenances,
      infraChanges,
      runbooks,
    ] = await Promise.all([
      // 1. Machines
      this.prisma.machine.findMany({
        where: {
          OR: [
            { hostname: { contains: term, mode: 'insensitive' } },
            { primaryIp: { contains: term, mode: 'insensitive' } },
            { macAddress: { contains: term, mode: 'insensitive' } },
            { os: { contains: term, mode: 'insensitive' } },
            { group: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          location: true,
          vlan: true,
          tags: { include: { tag: true } },
        },
        take: 10,
      }),

      // 2. IP Addresses (IPAM)
      this.prisma.iPAddress.findMany({
        where: {
          OR: [
            { address: { contains: term, mode: 'insensitive' } },
            { ip: { contains: term, mode: 'insensitive' } },
            { hostname: { contains: term, mode: 'insensitive' } },
            { macAddress: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          machine: true,
          network: true,
          interface: true,
        },
        take: 15,
      }),

      // 3. Networks
      this.prisma.network.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { cidr: { contains: term, mode: 'insensitive' } },
            { gateway: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: { vlan: true, location: true },
        take: 10,
      }),

      // 4. VLANs
      this.prisma.vLAN.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            ...(isNaN(parseInt(term, 10)) ? [] : [{ vlanId: parseInt(term, 10) }]),
          ],
        },
        include: { network: true, location: true },
        take: 10,
      }),

      // 5. Services
      this.prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { protocol: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      // 6. Ports
      this.prisma.port.findMany({
        where: {
          OR: [
            ...(isNaN(parseInt(term, 10)) ? [] : [{ portNumber: parseInt(term, 10) }]),
            { description: { contains: term, mode: 'insensitive' } },
            { service: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        include: { machine: true, service: true },
        take: 10,
      }),

      // 7. Locations
      this.prisma.location.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
            { building: { contains: term, mode: 'insensitive' } },
            { room: { contains: term, mode: 'insensitive' } },
            { rack: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: { parent: true },
        take: 10,
      }),

      // 8. Tags
      this.prisma.tag.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: { _count: { select: { machines: true } } },
        take: 10,
      }),

      // 9. Metric Incidents & Anomalies
      this.prisma.metricAnomaly.findMany({
        where: {
          OR: [
            { message: { contains: term, mode: 'insensitive' } },
            { metricType: { contains: term, mode: 'insensitive' } },
            { machine: { hostname: { contains: term, mode: 'insensitive' } } },
          ],
        },
        include: { machine: true },
        take: 10,
      }),

      // 10. Topologies & Topology Nodes (V7)
      this.prisma.topology.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: { select: { nodes: true, edges: true } },
        },
        take: 10,
      }),

      // 11. Assets (V8)
      this.prisma.asset.findMany({
        where: {
          OR: [
            { assetTag: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
            { serialNumber: { contains: term, mode: 'insensitive' } },
            { model: { contains: term, mode: 'insensitive' } },
            { manufacturer: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          machine: true,
          location: true,
          supplier: true,
        },
        take: 10,
      }),

      // 12. Licenses (V8)
      this.prisma.license.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { vendor: { contains: term, mode: 'insensitive' } },
            { product: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      // 13. Software (V8)
      this.prisma.software.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { vendor: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      // 14. Suppliers (V8)
      this.prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { contact: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { taxId: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),

      // 15. Purchases (V8)
      this.prisma.purchase.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          supplier: true,
        },
        take: 10,
      }),

      // 16. Tickets (V9)
      this.prisma.ticket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          assignee: { select: { name: true } },
          machine: { select: { hostname: true } },
          asset: { select: { assetTag: true } },
        },
        take: 10,
      }),

      // 17. Maintenances (V9)
      this.prisma.maintenance.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          machine: { select: { hostname: true } },
          asset: { select: { assetTag: true } },
        },
        take: 10,
      }),

      // 18. Infra Changes (V9)
      this.prisma.change.findMany({
        where: {
          OR: [
            { changeNumber: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: {
          machine: { select: { hostname: true } },
        },
        take: 10,
      }),

      // 19. Runbooks (V9)
      this.prisma.runbook.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
    ]);

    const totalResults =
      machines.length +
      ips.length +
      networks.length +
      vlans.length +
      services.length +
      ports.length +
      locations.length +
      tags.length +
      incidents.length +
      topologies.length +
      assets.length +
      licenses.length +
      software.length +
      suppliers.length +
      purchases.length +
      tickets.length +
      maintenances.length +
      infraChanges.length +
      runbooks.length;

    return {
      query: term,
      totalResults,
      results: {
        machines,
        ips,
        networks,
        vlans,
        services,
        ports,
        locations,
        tags,
        incidents,
        topologies,
        assets,
        licenses,
        software,
        suppliers,
        purchases,
        tickets,
        maintenances,
        changes: infraChanges,
        runbooks,
      },
    };
  }
}
