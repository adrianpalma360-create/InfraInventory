export function ipToLong(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.');
}

export function parseCidr(cidr: string): { network: string; mask: number; ips: string[] } {
  const parts = cidr.trim().split('/');
  if (parts.length !== 2) {
    throw new Error(`Invalid CIDR format: ${cidr}. Example: 192.168.1.0/24`);
  }

  const baseIp = parts[0];
  const mask = parseInt(parts[1], 10);

  if (isNaN(mask) || mask < 16 || mask > 32) {
    throw new Error(`CIDR mask must be between /16 and /32. Received: /${mask}`);
  }

  const baseLong = ipToLong(baseIp);
  const netmask = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  const networkLong = (baseLong & netmask) >>> 0;
  const broadcastLong = (networkLong | ~netmask) >>> 0;

  const ips: string[] = [];

  if (mask === 32) {
    ips.push(longToIp(networkLong));
  } else if (mask === 31) {
    ips.push(longToIp(networkLong));
    ips.push(longToIp(broadcastLong));
  } else {
    // Usable hosts: networkLong + 1 to broadcastLong - 1
    for (let current = networkLong + 1; current < broadcastLong; current++) {
      ips.push(longToIp(current));
    }
  }

  // Safety limit: max 1024 hosts per single scan to prevent denial of service
  if (ips.length > 1024) {
    throw new Error(`Target range contains ${ips.length} IPs. Maximum allowed per single scan is 1024.`);
  }

  return {
    network: longToIp(networkLong),
    mask,
    ips,
  };
}
