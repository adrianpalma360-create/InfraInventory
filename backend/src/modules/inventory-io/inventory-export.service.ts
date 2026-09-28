import { PrismaClient, ChangeAction } from '@prisma/client';
import { APP_CONFIG } from '../../config/appConfig.js';
import { logChange } from '../../utils/changelog.js';
import { ExportInventoryInput } from './inventory-io.schema.js';

export class InventoryExportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Safe sanitize against CSV/Excel Formula Injection
   */
  private sanitizeCell(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value).trim();
    // If starts with formula triggers (=, +, -, @, \t, \r), prepend single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // Escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  async exportInventory(filter: ExportInventoryInput, requestedBy: string) {
    const where: any = {};
    if (filter.group) where.group = filter.group;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.locationId) where.locationId = filter.locationId;
    if (filter.os) where.os = { contains: filter.os, mode: 'insensitive' };
    if (filter.tag) {
      where.tags = { some: { tag: { name: filter.tag } } };
    }

    const machines = await this.prisma.machine.findMany({
      where,
      include: {
        location: true,
        vlan: true,
        tags: { include: { tag: true } },
        interfaces: { include: { ipAddresses: true } },
        ports: { include: { service: true } },
      },
      orderBy: { hostname: 'asc' },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let buffer: Buffer;
    let filename = `inventory-export-${timestamp}`;
    let mimeType = 'text/csv';

    switch (filter.format) {
      case 'JSON': {
        const jsonData = machines.map((m) => ({
          hostname: m.hostname,
          type: m.type,
          status: m.status,
          primaryIp: m.primaryIp,
          macAddress: m.macAddress,
          group: m.group,
          os: m.os,
          osVersion: m.osVersion,
          manufacturer: m.manufacturer,
          model: m.model,
          serialNumber: m.serialNumber,
          description: m.description,
          location: m.location?.name || null,
          vlan: m.vlan ? `${m.vlan.vlanId} - ${m.vlan.name}` : null,
          tags: m.tags.map((t) => t.tag.name),
          interfaces: m.interfaces.map((i) => ({
            name: i.name,
            macAddress: i.macAddress,
            ips: i.ipAddresses.map((ip) => ip.address),
          })),
          openPorts: m.ports.filter((p) => p.state === 'OPEN').map((p) => ({
            port: p.portNumber,
            protocol: p.protocol,
            service: p.service?.name || p.description || null,
          })),
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }));

        filename += '.json';
        mimeType = 'application/json';
        buffer = Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8');
        break;
      }

      case 'MIGRATION_JSON': {
        // Full platform export structure (clean, zero credentials)
        const [locations, tags, vlans, networks, services] = await Promise.all([
          this.prisma.location.findMany(),
          this.prisma.tag.findMany(),
          this.prisma.vLAN.findMany(),
          this.prisma.network.findMany(),
          this.prisma.service.findMany(),
        ]);

        const migrationData = {
          format: 'imp-export',
          formatVersion: 1,
          applicationVersion: APP_CONFIG.APP_VERSION,
          exportedAt: new Date().toISOString(),
          exportedBy: requestedBy,
          counts: {
            machines: machines.length,
            locations: locations.length,
            tags: tags.length,
            vlans: vlans.length,
            networks: networks.length,
            services: services.length,
          },
          data: {
            locations,
            tags,
            vlans,
            networks,
            services,
            machines: machines.map((m) => ({
              ...m,
              tags: m.tags.map((t) => t.tag.name),
              interfaces: m.interfaces,
              ports: m.ports,
            })),
          },
        };

        filename += '.migration.json';
        mimeType = 'application/json';
        buffer = Buffer.from(JSON.stringify(migrationData, null, 2), 'utf-8');
        break;
      }

      case 'XLSX': {
        // High-compatibility XML Spreadsheet format (opens directly in MS Excel / LibreOffice with UTF-8 support)
        const rows = machines.map((m) => [
          m.hostname,
          m.type,
          m.status,
          m.primaryIp || '',
          m.macAddress || '',
          m.group || '',
          m.location?.name || '',
          m.vlan?.name || '',
          m.os || '',
          m.osVersion || '',
          m.manufacturer || '',
          m.model || '',
          m.serialNumber || '',
          m.description || '',
          m.tags.map((t) => t.tag.name).join('; '),
          m.ports.filter((p) => p.state === 'OPEN').map((p) => `${p.portNumber}/${p.protocol}`).join(', '),
        ]);

        const headers = [
          'Hostname', 'Tipo', 'Estado', 'IP Principal', 'MAC Address',
          'Grupo', 'Ubicacion', 'VLAN', 'Sistema Operativo', 'Version SO',
          'Fabricante', 'Modelo', 'Numero Serie', 'Descripcion', 'Tags', 'Puertos Abiertos'
        ];

        // XML-based Excel Spreadsheet string
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Inventario">
  <Table>
   <Row>`;
        for (const h of headers) {
          xml += `<Cell><Data ss:Type="String">${this.sanitizeXml(h)}</Data></Cell>`;
        }
        xml += `</Row>\n`;

        for (const r of rows) {
          xml += `   <Row>`;
          for (const cell of r) {
            xml += `<Cell><Data ss:Type="String">${this.sanitizeXml(String(cell))}</Data></Cell>`;
          }
          xml += `</Row>\n`;
        }

        xml += `  </Table>
 </Worksheet>
</Workbook>`;

        filename += '.xls';
        mimeType = 'application/vnd.ms-excel';
        buffer = Buffer.from(xml, 'utf-8');
        break;
      }

      case 'CSV':
      default: {
        const headers = [
          'Hostname', 'Tipo', 'Estado', 'IP Principal', 'MAC Address',
          'Grupo', 'Ubicacion', 'VLAN', 'Sistema Operativo', 'Version SO',
          'Fabricante', 'Modelo', 'Numero Serie', 'Descripcion', 'Tags', 'Puertos Abiertos'
        ];

        const csvLines = [headers.map((h) => this.sanitizeCell(h)).join(',')];

        for (const m of machines) {
          const row = [
            m.hostname,
            m.type,
            m.status,
            m.primaryIp || '',
            m.macAddress || '',
            m.group || '',
            m.location?.name || '',
            m.vlan?.name || '',
            m.os || '',
            m.osVersion || '',
            m.manufacturer || '',
            m.model || '',
            m.serialNumber || '',
            m.description || '',
            m.tags.map((t) => t.tag.name).join('; '),
            m.ports.filter((p) => p.state === 'OPEN').map((p) => `${p.portNumber}/${p.protocol}`).join('; '),
          ];
          csvLines.push(row.map((cell) => this.sanitizeCell(cell)).join(','));
        }

        filename += '.csv';
        mimeType = 'text/csv; charset=utf-8';
        buffer = Buffer.from('\uFEFF' + csvLines.join('\n'), 'utf-8'); // Add UTF-8 BOM for Excel compatibility
        break;
      }
    }

    // Log export operation
    await this.prisma.inventoryExportLog.create({
      data: {
        format: filter.format,
        scope: JSON.stringify(filter),
        recordsCount: machines.length,
        fileSize: BigInt(buffer.length),
        requestedBy,
      },
    });

    await logChange({
      prisma: this.prisma,
      entityType: 'InventoryExport',
      entityId: filename,
      action: ChangeAction.CREATE,
      details: `Exportación de inventario (${filter.format}, ${machines.length} registros) generada por ${requestedBy}`,
      user: requestedBy,
    });

    return {
      buffer,
      filename,
      mimeType,
      recordsCount: machines.length,
    };
  }

  async getExportHistory() {
    const logs = await this.prisma.inventoryExportLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => ({
      ...l,
      fileSize: Number(l.fileSize),
    }));
  }

  private sanitizeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
