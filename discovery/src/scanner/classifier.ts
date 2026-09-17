import { DeviceType, DiscoveredPortInfo, SnmpDiscoveryResult } from './types.js';

export interface ClassificationEvidence {
  ports: DiscoveredPortInfo[];
  macAddress?: string;
  vendor?: string;
  hostname?: string;
  snmp?: SnmpDiscoveryResult;
  banners?: string[];
  osGuess?: string;
}

export interface ClassificationResult {
  deviceType: DeviceType;
  reason: string;
  osGuess?: string;
}

/**
 * Evidence-based Device Classifier
 */
export function classifyDevice(evidence: ClassificationEvidence): ClassificationResult {
  const openPortNumbers = new Set(evidence.ports.map((p) => p.portNumber));
  const banners = (evidence.banners || []).concat(
    evidence.ports.map((p) => p.banner).filter((b): b is string => Boolean(b))
  );
  const combinedBanners = banners.join(' ').toLowerCase();
  const vendorLower = (evidence.vendor || '').toLowerCase();
  const hostnameLower = (evidence.hostname || '').toLowerCase();
  const sysDescrLower = (evidence.snmp?.sysDescr || '').toLowerCase();

  // 1. Virtualization Host (Proxmox VE, VMware ESXi, Hyper-V)
  if (
    openPortNumbers.has(8006) ||
    combinedBanners.includes('proxmox') ||
    sysDescrLower.includes('proxmox') ||
    hostnameLower.includes('pve') ||
    hostnameLower.includes('proxmox')
  ) {
    return {
      deviceType: 'Virtualization Host',
      reason: 'Proxmox VE web console (port 8006) or Proxmox signature detected',
      osGuess: 'Debian / Proxmox VE',
    };
  }

  if (
    (openPortNumbers.has(902) && openPortNumbers.has(443)) ||
    combinedBanners.includes('esxi') ||
    sysDescrLower.includes('vmware esxi')
  ) {
    return {
      deviceType: 'Virtualization Host',
      reason: 'VMware ESXi host ports (902/443) or banner detected',
      osGuess: 'VMware ESXi',
    };
  }

  // 2. Docker Host
  if (
    (openPortNumbers.has(9000) || openPortNumbers.has(9443)) &&
    (combinedBanners.includes('portainer') || hostnameLower.includes('docker') || hostnameLower.includes('portainer'))
  ) {
    return {
      deviceType: 'Docker Host',
      reason: 'Portainer container management interface (port 9000/9443) detected',
      osGuess: 'Linux (Docker Engine)',
    };
  }

  // 3. Printers
  if (
    openPortNumbers.has(9100) ||
    openPortNumbers.has(631) ||
    vendorLower.includes('brother') ||
    vendorLower.includes('canon') ||
    vendorLower.includes('epson') ||
    vendorLower.includes('xerox') ||
    combinedBanners.includes('jetdirect') ||
    combinedBanners.includes('printer') ||
    sysDescrLower.includes('printer')
  ) {
    return {
      deviceType: 'Printer',
      reason: 'JetDirect/IPP printing port (9100/631) or printer vendor/banner detected',
      osGuess: 'Embedded Print Server OS',
    };
  }

  // 4. Firewalls
  if (
    vendorLower.includes('fortinet') ||
    combinedBanners.includes('fortigate') ||
    combinedBanners.includes('pfsense') ||
    combinedBanners.includes('opnsense') ||
    combinedBanners.includes('sonicwall') ||
    sysDescrLower.includes('fortigate') ||
    sysDescrLower.includes('pfsense') ||
    hostnameLower.includes('fw-') ||
    hostnameLower.includes('firewall')
  ) {
    return {
      deviceType: 'Firewall',
      reason: 'Dedicated firewall vendor (Fortinet/pfSense/OPNsense) or banner signature',
      osGuess: 'Firewall OS (FortiOS/FreeBSD)',
    };
  }

  // 5. Switches
  if (
    sysDescrLower.includes('catalyst') ||
    sysDescrLower.includes('procurve') ||
    sysDescrLower.includes('switch') ||
    combinedBanners.includes('switch') ||
    hostnameLower.includes('sw-') ||
    hostnameLower.includes('switch')
  ) {
    return {
      deviceType: 'Switch',
      reason: 'Network switch signature in SNMP/sysDescr or switch naming scheme',
      osGuess: 'Switch Operating System',
    };
  }

  // 6. Routers
  if (
    vendorLower.includes('mikrotik') ||
    sysDescrLower.includes('routeros') ||
    combinedBanners.includes('routeros') ||
    combinedBanners.includes('openwrt') ||
    sysDescrLower.includes('cisco ios') ||
    hostnameLower.includes('router') ||
    hostnameLower.includes('rtr-') ||
    (openPortNumbers.has(53) && (openPortNumbers.has(80) || openPortNumbers.has(443)) && openPortNumbers.has(22))
  ) {
    return {
      deviceType: 'Router',
      reason: 'RouterOS/Cisco IOS/OpenWrt signature or gateway services identified',
      osGuess: 'Router OS / Firmware',
    };
  }

  // 7. Access Points
  if (
    vendorLower.includes('ubiquiti') &&
    (hostnameLower.includes('uap') || hostnameLower.includes('ap') || combinedBanners.includes('unifi'))
  ) {
    return {
      deviceType: 'Access Point',
      reason: 'Ubiquiti UniFi Access Point signature',
      osGuess: 'UniFi OS / Embedded Linux',
    };
  }

  // 8. NAS (Network Attached Storage)
  if (
    openPortNumbers.has(5000) ||
    vendorLower.includes('synology') ||
    vendorLower.includes('qnap') ||
    combinedBanners.includes('synology') ||
    combinedBanners.includes('qnap') ||
    combinedBanners.includes('truenas') ||
    sysDescrLower.includes('dsm') ||
    hostnameLower.includes('nas')
  ) {
    return {
      deviceType: 'NAS',
      reason: 'Synology DSM (port 5000) / QNAP QTS / TrueNAS storage interface detected',
      osGuess: vendorLower.includes('synology') ? 'Synology DSM' : 'Embedded Storage OS',
    };
  }

  // 9. IP Cameras & Surveillance
  if (
    openPortNumbers.has(554) ||
    vendorLower.includes('hikvision') ||
    vendorLower.includes('dahua') ||
    vendorLower.includes('axis') ||
    combinedBanners.includes('rtsp') ||
    hostnameLower.includes('cam')
  ) {
    return {
      deviceType: 'Camera',
      reason: 'RTSP streaming port (554) or camera manufacturer signature detected',
      osGuess: 'Camera Firmware',
    };
  }

  // 10. IoT & Smart Home Devices
  if (
    openPortNumbers.has(1883) ||
    openPortNumbers.has(8123) ||
    openPortNumbers.has(8008) ||
    openPortNumbers.has(8009) ||
    vendorLower.includes('raspberry pi')
  ) {
    return {
      deviceType: 'IoT',
      reason: 'MQTT (1883), Home Assistant (8123), Google Cast, or IoT controller detected',
      osGuess: 'IoT / Embedded Linux',
    };
  }

  // 11. Servers (Enterprise Linux / Windows Server)
  if (
    (openPortNumbers.has(22) && (openPortNumbers.has(80) || openPortNumbers.has(443) || openPortNumbers.has(3306) || openPortNumbers.has(5432))) ||
    (openPortNumbers.has(135) && openPortNumbers.has(445) && (openPortNumbers.has(3389) || openPortNumbers.has(1433))) ||
    vendorLower.includes('dell') ||
    vendorLower.includes('hewlett packard enterprise') ||
    combinedBanners.includes('apache') ||
    combinedBanners.includes('nginx') ||
    combinedBanners.includes('microsoft-iis') ||
    hostnameLower.includes('srv-') ||
    hostnameLower.includes('server')
  ) {
    const isWindows = openPortNumbers.has(135) || openPortNumbers.has(445) || combinedBanners.includes('microsoft');
    return {
      deviceType: 'Server',
      reason: 'Server services (SSH/Web/Database/RPC/IIS) or enterprise server hardware detected',
      osGuess: isWindows ? 'Windows Server' : 'Linux Server',
    };
  }

  // 12. Workstations / PCs
  if (
    openPortNumbers.has(3389) ||
    openPortNumbers.has(135) ||
    openPortNumbers.has(139) ||
    openPortNumbers.has(445) ||
    vendorLower.includes('apple')
  ) {
    const isApple = vendorLower.includes('apple');
    return {
      deviceType: 'Workstation',
      reason: 'Workstation networking protocols (RDP, SMB, NetBIOS, Apple)',
      osGuess: isApple ? 'macOS' : 'Windows 10/11 Desktop',
    };
  }

  // 13. Unknown (Insufficient evidence)
  return {
    deviceType: 'Unknown',
    reason: 'Insufficient network signatures to determine device type reliably',
    osGuess: undefined,
  };
}
