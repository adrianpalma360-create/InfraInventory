import { PORT_REGISTRY, getServiceForPort } from './ports.js';
import { DiscoveredPortInfo } from './types.js';

export interface DetectedService {
  port: number;
  protocol: 'TCP' | 'UDP';
  name: string;
  category: string;
  banner?: string;
}

/**
 * Categorize open ports into structured services
 */
export function categorizeServices(ports: DiscoveredPortInfo[]): DetectedService[] {
  return ports.map((p) => {
    const reg = PORT_REGISTRY[p.portNumber];
    let category = 'Other';

    if ([80, 443, 8000, 8080, 8443, 3000].includes(p.portNumber)) category = 'Web';
    else if ([22, 23, 3389, 5900, 5985, 5986].includes(p.portNumber)) category = 'Remote Management';
    else if ([1433, 3306, 5432, 6379].includes(p.portNumber)) category = 'Database';
    else if ([135, 139, 445, 5000].includes(p.portNumber)) category = 'File Sharing / RPC';
    else if ([53, 67, 68, 161, 5353].includes(p.portNumber)) category = 'Network Core / DNS / SNMP';
    else if ([631, 9100].includes(p.portNumber)) category = 'Printing';
    else if ([554, 8008, 8009, 32400].includes(p.portNumber)) category = 'Media & Streaming';
    else if ([1883, 8123].includes(p.portNumber)) category = 'IoT & Automation';
    else if ([8006, 9000, 9443].includes(p.portNumber)) category = 'Virtualization & Containers';

    return {
      port: p.portNumber,
      protocol: p.protocol,
      name: reg?.service || p.serviceName || `TCP-${p.portNumber}`,
      category,
      banner: p.banner,
    };
  });
}
