export interface PortDefinition {
  port: number;
  service: string;
  protocol: 'TCP' | 'UDP';
  description: string;
}

export const BASIC_PORTS: number[] = [
  22,   // SSH
  53,   // DNS
  80,   // HTTP Web
  135,  // MS RPC (Windows)
  139,  // NetBIOS (Windows / Samba)
  443,  // HTTPS Web
  445,  // SMB / CIFS (Windows / NAS)
  631,  // IPP (Network Printers)
  3389, // RDP Remote Desktop
  5000, // UPnP / Synology / AirPlay
  7000, // AirPlay / Apple TV
  8008, // Google Cast / Smart TVs
  8080, // HTTP Alternate / Routers / Apps
  9100, // RAW JetDirect (HP, Epson, Brother Printers)
];

export const PORT_REGISTRY: Record<number, PortDefinition> = {
  21: { port: 21, service: 'FTP', protocol: 'TCP', description: 'File Transfer Protocol' },
  22: { port: 22, service: 'SSH', protocol: 'TCP', description: 'Secure Shell' },
  23: { port: 23, service: 'Telnet', protocol: 'TCP', description: 'Telnet Remote Shell' },
  25: { port: 25, service: 'SMTP', protocol: 'TCP', description: 'Simple Mail Transfer Protocol' },
  53: { port: 53, service: 'DNS', protocol: 'TCP', description: 'Domain Name System' },
  80: { port: 80, service: 'HTTP', protocol: 'TCP', description: 'Hypertext Transfer Protocol' },
  110: { port: 110, service: 'POP3', protocol: 'TCP', description: 'Post Office Protocol v3' },
  135: { port: 135, service: 'MS-RPC', protocol: 'TCP', description: 'Microsoft Remote Procedure Call (Windows)' },
  139: { port: 139, service: 'NetBIOS', protocol: 'TCP', description: 'NetBIOS Session Service' },
  143: { port: 143, service: 'IMAP', protocol: 'TCP', description: 'Internet Message Access Protocol' },
  443: { port: 443, service: 'HTTPS', protocol: 'TCP', description: 'HTTP Secure' },
  445: { port: 445, service: 'SMB', protocol: 'TCP', description: 'Server Message Block / File Sharing' },
  631: { port: 631, service: 'IPP Printing', protocol: 'TCP', description: 'Internet Printing Protocol' },
  1433: { port: 1433, service: 'MS-SQL', protocol: 'TCP', description: 'Microsoft SQL Server' },
  1883: { port: 1883, service: 'MQTT', protocol: 'TCP', description: 'MQTT IoT Smart Home Protocol' },
  2869: { port: 2869, service: 'SSDP / UPNP', protocol: 'TCP', description: 'Windows UPnP Eventing' },
  3000: { port: 3000, service: 'Web App / Node', protocol: 'TCP', description: 'Development / Web App' },
  3306: { port: 3306, service: 'MySQL', protocol: 'TCP', description: 'MySQL Database' },
  3389: { port: 3389, service: 'RDP', protocol: 'TCP', description: 'Remote Desktop Protocol' },
  5000: { port: 5000, service: 'UPnP / DSM', protocol: 'TCP', description: 'Synology DSM / UPnP' },
  5353: { port: 5353, service: 'mDNS', protocol: 'UDP', description: 'Multicast DNS (Bonjour/Avahi)' },
  5432: { port: 5432, service: 'PostgreSQL', protocol: 'TCP', description: 'PostgreSQL Database' },
  5555: { port: 5555, service: 'Android ADB', protocol: 'TCP', description: 'Android Debug Bridge' },
  5900: { port: 5900, service: 'VNC', protocol: 'TCP', description: 'Virtual Network Computing' },
  6379: { port: 6379, service: 'Redis', protocol: 'TCP', description: 'Redis In-Memory Key-Value Store' },
  7000: { port: 7000, service: 'AirPlay', protocol: 'TCP', description: 'Apple AirPlay / Media Streaming' },
  8000: { port: 8000, service: 'HTTP-Alt', protocol: 'TCP', description: 'Alternate Web Server' },
  8006: { port: 8006, service: 'Proxmox VE', protocol: 'TCP', description: 'Proxmox VE Web Console / API' },
  8008: { port: 8008, service: 'Google Cast', protocol: 'TCP', description: 'Chromecast / Smart TV HTTP' },
  8009: { port: 8009, service: 'Google Cast TLS', protocol: 'TCP', description: 'Chromecast / Smart TV Control' },
  8080: { port: 8080, service: 'HTTP-Alt', protocol: 'TCP', description: 'HTTP Alternate Web Server' },
  8123: { port: 8123, service: 'Home Assistant', protocol: 'TCP', description: 'Home Assistant Smart Home' },
  8443: { port: 8443, service: 'HTTPS-Alt', protocol: 'TCP', description: 'HTTPS Alternate Web Server' },
  9000: { port: 9000, service: 'Portainer / App', protocol: 'TCP', description: 'Portainer / Web Applications' },
  9100: { port: 9100, service: 'RAW JetDirect', protocol: 'TCP', description: 'Network Printer Port (HP/Epson/Brother)' },
  32400: { port: 32400, service: 'Plex', protocol: 'TCP', description: 'Plex Media Server' },
};

export const FULL_PORTS: number[] = Object.keys(PORT_REGISTRY).map(Number);

export function getServiceForPort(port: number): string {
  return PORT_REGISTRY[port]?.service || `Unknown (${port})`;
}
