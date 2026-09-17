/**
 * MAC Address OUI database (IEEE Organizationally Unique Identifiers)
 */
export const OUI_DATABASE: Record<string, string> = {
  // Cisco Systems
  '00:00:0C': 'Cisco Systems',
  '00:01:42': 'Cisco Systems',
  '00:01:43': 'Cisco Systems',
  '00:01:C7': 'Cisco Systems',
  '00:01:C9': 'Cisco Systems',
  '00:02:16': 'Cisco Systems',
  '00:02:4B': 'Cisco Systems',
  '00:08:20': 'Cisco Systems',
  '00:08:21': 'Cisco Systems',
  '00:0C:85': 'Cisco Systems',
  '00:11:20': 'Cisco Systems',
  '00:1E:13': 'Cisco Systems',
  '00:24:14': 'Cisco Systems',
  '50:06:04': 'Cisco Systems',
  'F8:66:F2': 'Cisco Systems',

  // Dell
  '00:06:5B': 'Dell',
  '00:08:74': 'Dell',
  '00:0F:1F': 'Dell',
  '00:11:43': 'Dell',
  '00:13:72': 'Dell',
  '00:14:22': 'Dell',
  '00:18:8B': 'Dell',
  '00:21:9B': 'Dell',
  '00:22:19': 'Dell',
  '18:66:DA': 'Dell',
  '24:B6:FD': 'Dell',
  '54:48:10': 'Dell',
  'B8:2A:72': 'Dell',
  'F8:DB:88': 'Dell',

  // HP / Hewlett Packard Enterprise
  '00:01:E6': 'Hewlett Packard Enterprise',
  '00:08:02': 'Hewlett Packard Enterprise',
  '00:0B:CD': 'Hewlett Packard Enterprise',
  '00:11:85': 'Hewlett Packard Enterprise',
  '00:15:60': 'Hewlett Packard Enterprise',
  '00:16:35': 'Hewlett Packard Enterprise',
  '00:1F:FE': 'Hewlett Packard Enterprise',
  '00:24:81': 'Hewlett Packard Enterprise',
  '3C:D9:2B': 'HP Inc.',
  '70:5A:0F': 'HP Inc.',
  '9C:8E:99': 'HP Inc.',
  'D8:D3:85': 'HP Inc.',

  // Ubiquiti Networks
  '00:15:6D': 'Ubiquiti Networks',
  '00:27:22': 'Ubiquiti Networks',
  '24:A4:3C': 'Ubiquiti Networks',
  '68:D7:9A': 'Ubiquiti Networks',
  '74:83:C2': 'Ubiquiti Networks',
  '78:8A:20': 'Ubiquiti Networks',
  '80:2A:A8': 'Ubiquiti Networks',
  'B4:FB:E4': 'Ubiquiti Networks',
  'DC:9F:DB': 'Ubiquiti Networks',
  'E0:63:DA': 'Ubiquiti Networks',
  'F0:9F:C2': 'Ubiquiti Networks',

  // VMware
  '00:05:69': 'VMware',
  '00:0C:29': 'VMware',
  '00:1C:14': 'VMware',
  '00:50:56': 'VMware',

  // Fortinet
  '00:09:0F': 'Fortinet',
  '70:4C:A5': 'Fortinet',
  '90:6C:AC': 'Fortinet',

  // MikroTik
  '00:0C:42': 'MikroTik',
  '48:8F:5A': 'MikroTik',
  '6C:3B:6B': 'MikroTik',
  'B8:69:F4': 'MikroTik',
  'CC:2D:E0': 'MikroTik',
  'D4:01:C3': 'MikroTik',
  'E4:8D:8C': 'MikroTik',

  // Synology
  '00:11:32': 'Synology',

  // QNAP
  '00:08:9B': 'QNAP Systems',
  '24:5E:BE': 'QNAP Systems',

  // Apple
  '00:03:93': 'Apple',
  '00:0A:95': 'Apple',
  '00:0D:93': 'Apple',
  '00:14:51': 'Apple',
  '00:1C:B3': 'Apple',
  '00:1E:52': 'Apple',
  '00:23:12': 'Apple',
  '3C:07:54': 'Apple',
  '3C:15:C2': 'Apple',
  '40:6C:8F': 'Apple',
  '48:60:5C': 'Apple',
  '70:35:60': 'Apple',
  'A4:83:E7': 'Apple',
  'BC:D1:1F': 'Apple',

  // Intel
  '00:02:B3': 'Intel',
  '00:03:47': 'Intel',
  '00:04:23': 'Intel',
  '00:07:E9': 'Intel',
  '00:0E:0C': 'Intel',
  '00:13:02': 'Intel',
  '00:1B:21': 'Intel',
  '68:05:CA': 'Intel',
  'A4:4C:C8': 'Intel',

  // Raspberry Pi
  'B8:27:EB': 'Raspberry Pi Foundation',
  'DC:A6:32': 'Raspberry Pi Trading',
  'E4:5F:01': 'Raspberry Pi Trading',
  '28:CD:C1': 'Raspberry Pi Trading',

  // TP-Link
  '00:1D:0F': 'TP-Link',
  '14:CC:20': 'TP-Link',
  '50:C7:BF': 'TP-Link',
  'E8:48:B8': 'TP-Link',
  'F4:EC:38': 'TP-Link',

  // Netgear
  '00:09:5B': 'Netgear',
  '00:14:6C': 'Netgear',
  '00:1F:33': 'Netgear',
  '28:C6:8E': 'Netgear',

  // Printers (Canon, Epson, Brother, Xerox)
  '00:00:85': 'Canon',
  '00:1E:8F': 'Canon',
  '00:00:48': 'Epson',
  '00:26:AB': 'Epson',
  '00:80:77': 'Brother Industries',
  '00:1B:A9': 'Brother Industries',
  '00:00:AA': 'Xerox',
  '00:01:6C': 'Xerox',

  // IP Cameras / Surveillance
  '00:40:8C': 'Axis Communications',
  'AC:CC:8E': 'Axis Communications',
  '44:19:B6': 'Hikvision',
  'BC:54:51': 'Hikvision',
  'C8:02:8F': 'Hikvision',
  'E0:50:8B': 'Dahua Technology',
  '38:AF:29': 'Dahua Technology',
};

/**
 * Identify hardware vendor from MAC address OUI
 */
export function identifyVendorFromMac(macAddress?: string): string | undefined {
  if (!macAddress) return undefined;
  const cleaned = macAddress.toUpperCase().replace(/[-.]/g, ':');
  const prefix = cleaned.slice(0, 8); // e.g. "00:11:32"
  return OUI_DATABASE[prefix];
}

/**
 * Identify vendor from available clues (MAC OUI, banners, sysDescr)
 */
export function identifyVendor(
  macAddress?: string,
  snmpVendor?: string,
  banners: string[] = []
): string | undefined {
  if (snmpVendor) return snmpVendor;

  const macVendor = identifyVendorFromMac(macAddress);
  if (macVendor) return macVendor;

  for (const b of banners) {
    const lower = b.toLowerCase();
    if (lower.includes('cisco')) return 'Cisco Systems';
    if (lower.includes('proxmox')) return 'Proxmox Server Solutions';
    if (lower.includes('synology')) return 'Synology';
    if (lower.includes('qnap')) return 'QNAP Systems';
    if (lower.includes('mikrotik') || lower.includes('routeros')) return 'MikroTik';
    if (lower.includes('fortigate') || lower.includes('fortinet')) return 'Fortinet';
    if (lower.includes('dell')) return 'Dell';
    if (lower.includes('hp') || lower.includes('hewlett-packard')) return 'HP';
    if (lower.includes('apache') || lower.includes('nginx')) return 'Linux Server';
    if (lower.includes('microsoft') || lower.includes('iis')) return 'Microsoft';
    if (lower.includes('portainer')) return 'Portainer';
  }

  return undefined;
}
