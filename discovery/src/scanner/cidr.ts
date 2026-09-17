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

export function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    const parts = cidr.trim().split('/');
    if (parts.length !== 2) return false;
    const baseIp = parts[0];
    const mask = parseInt(parts[1], 10);
    if (isNaN(mask) || mask < 0 || mask > 32) return false;

    const netmask = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
    const ipLong = ipToLong(ip);
    const baseLong = ipToLong(baseIp);

    return (ipLong & netmask) === (baseLong & netmask);
  } catch {
    return false;
  }
}

export function parseExcludedIps(excludedList?: string[]): Set<string> {
  const excluded = new Set<string>();
  if (!excludedList || !Array.isArray(excludedList)) return excluded;

  for (const item of excludedList) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    // Range format: 192.168.1.10-192.168.1.20
    if (trimmed.includes('-')) {
      const [startIp, endIp] = trimmed.split('-').map((s) => s.trim());
      if (startIp && endIp) {
        try {
          const startLong = ipToLong(startIp);
          const endLong = ipToLong(endIp);
          if (startLong <= endLong && endLong - startLong <= 256) {
            for (let cur = startLong; cur <= endLong; cur++) {
              excluded.add(longToIp(cur));
            }
          }
        } catch {
          // ignore malformed
        }
      }
    } else if (trimmed.includes('/')) {
      // Subnet CIDR exclusion: e.g. 192.168.1.240/28
      try {
        const { ips } = parseCidr(trimmed);
        for (const ip of ips) excluded.add(ip);
      } catch {
        // ignore
      }
    } else {
      // Single IP
      excluded.add(trimmed);
    }
  }

  return excluded;
}

export function parseCidr(
  cidr: string,
  excludedIps?: string[]
): { network: string; mask: number; ips: string[] } {
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

  const rawIps: string[] = [];

  if (mask === 32) {
    rawIps.push(longToIp(networkLong));
  } else if (mask === 31) {
    rawIps.push(longToIp(networkLong));
    rawIps.push(longToIp(broadcastLong));
  } else {
    // Usable hosts: networkLong + 1 to broadcastLong - 1
    for (let current = networkLong + 1; current < broadcastLong; current++) {
      rawIps.push(longToIp(current));
    }
  }

  // Filter exclusions
  const excludedSet = parseExcludedIps(excludedIps);
  const ips = rawIps.filter((ip) => !excludedSet.has(ip));

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
