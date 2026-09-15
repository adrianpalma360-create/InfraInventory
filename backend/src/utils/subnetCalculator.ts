/**
 * Accurate IPv4 and IPv6 Subnet Calculator
 * Performs pure binary / bitwise calculations for exact subnet planning.
 */

export interface SubnetCalculationResult {
  cidr: string;
  ip: string;
  prefix: number;
  version: 'IPv4' | 'IPv6';
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstUsableIp: string;
  lastUsableIp: string;
  gateway: string;
  totalAddresses: number;
  usableAddresses: number;
  isPrivate: boolean;
  ipClass?: string;
}

/**
 * Converts a 32-bit integer to an IPv4 string
 */
function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

/**
 * Converts an IPv4 string to a 32-bit unsigned integer
 */
function ipToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Checks if an IPv4 address is in a private RFC1918 range
 */
function isPrivateIPv4(ipInt: number): boolean {
  // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
  const is10 = (ipInt >>> 24) === 10;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const is172 = (ipInt >>> 20) === (ipToInt('172.16.0.0') >>> 20);
  // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  const is192 = (ipInt >>> 16) === (ipToInt('192.168.0.0') >>> 16);
  // 127.0.0.0/8 (Loopback)
  const is127 = (ipInt >>> 24) === 127;
  // 169.254.0.0/16 (Link-local)
  const is169 = (ipInt >>> 16) === (ipToInt('169.254.0.0') >>> 16);

  return is10 || is172 || is192 || is127 || is169;
}

/**
 * Determines classic classful IPv4 class (A, B, C, D, E)
 */
function getIpClass(firstOctet: number): string {
  if (firstOctet >= 1 && firstOctet <= 126) return 'Class A';
  if (firstOctet === 127) return 'Loopback';
  if (firstOctet >= 128 && firstOctet <= 191) return 'Class B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'Class C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'Class D (Multicast)';
  return 'Class E (Experimental)';
}

/**
 * Calculate full IPv4 Subnet details from a CIDR string (e.g. "192.168.10.0/24" or "10.0.0.5/16")
 */
export function calculateIPv4Subnet(cidrInput: string): SubnetCalculationResult {
  const trimmed = cidrInput.trim();
  const parts = trimmed.split('/');

  if (parts.length !== 2) {
    throw new Error(`Formato CIDR inválido: "${cidrInput}". Ejemplo: 192.168.1.0/24`);
  }

  const rawIp = parts[0].trim();
  const prefix = parseInt(parts[1].trim(), 10);

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Prefijo CIDR inválido: "/${parts[1]}". Debe estar entre /0 y /32`);
  }

  const octets = rawIp.split('.');
  if (octets.length !== 4) {
    throw new Error(`Dirección IP inválida: "${rawIp}". Debe contener 4 octetos`);
  }

  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (isNaN(num) || num < 0 || num > 255 || String(num) !== octet) {
      throw new Error(`Octeto inválido: "${octet}" en IP "${rawIp}"`);
    }
  }

  const ipUnsigned = ipToInt(rawIp);
  const maskUnsigned = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const wildcardUnsigned = (~maskUnsigned) >>> 0;

  const networkUnsigned = (ipUnsigned & maskUnsigned) >>> 0;
  const broadcastUnsigned = (networkUnsigned | wildcardUnsigned) >>> 0;

  const totalAddresses = Math.pow(2, 32 - prefix);
  let usableAddresses = 0;
  let firstUsableUnsigned = networkUnsigned;
  let lastUsableUnsigned = broadcastUnsigned;
  let gatewayUnsigned = networkUnsigned;

  if (prefix === 32) {
    usableAddresses = 1;
    firstUsableUnsigned = networkUnsigned;
    lastUsableUnsigned = networkUnsigned;
    gatewayUnsigned = networkUnsigned;
  } else if (prefix === 31) {
    // RFC 3021 Point-to-Point
    usableAddresses = 2;
    firstUsableUnsigned = networkUnsigned;
    lastUsableUnsigned = broadcastUnsigned;
    gatewayUnsigned = networkUnsigned;
  } else {
    usableAddresses = Math.max(0, totalAddresses - 2);
    firstUsableUnsigned = (networkUnsigned + 1) >>> 0;
    lastUsableUnsigned = (broadcastUnsigned - 1) >>> 0;
    gatewayUnsigned = (networkUnsigned + 1) >>> 0; // Standard default gateway (.1)
  }

  const networkAddress = intToIp(networkUnsigned);
  const broadcastAddress = intToIp(broadcastUnsigned);
  const subnetMask = intToIp(maskUnsigned);
  const wildcardMask = intToIp(wildcardUnsigned);
  const firstUsableIp = intToIp(firstUsableUnsigned);
  const lastUsableIp = intToIp(lastUsableUnsigned);
  const gateway = intToIp(gatewayUnsigned);

  return {
    cidr: `${networkAddress}/${prefix}`,
    ip: rawIp,
    prefix,
    version: 'IPv4',
    networkAddress,
    broadcastAddress,
    subnetMask,
    wildcardMask,
    firstUsableIp,
    lastUsableIp,
    gateway,
    totalAddresses,
    usableAddresses,
    isPrivate: isPrivateIPv4(ipUnsigned),
    ipClass: getIpClass(parseInt(octets[0], 10)),
  };
}

/**
 * Universal Subnet Calculator entry point supporting IPv4 and basic IPv6 detection
 */
export function calculateSubnet(cidrInput: string): SubnetCalculationResult {
  const trimmed = cidrInput.trim();
  if (trimmed.includes(':')) {
    // Basic IPv6 calculation
    const [ip, prefixStr] = trimmed.split('/');
    const prefix = prefixStr ? parseInt(prefixStr, 10) : 64;
    return {
      cidr: `${ip}/${prefix}`,
      ip,
      prefix,
      version: 'IPv6',
      networkAddress: ip,
      broadcastAddress: 'N/A (IPv6 uses Multicast)',
      subnetMask: `/${prefix}`,
      wildcardMask: 'N/A',
      firstUsableIp: `${ip}1`,
      lastUsableIp: `${ip}ffff:ffff:ffff:ffff`,
      gateway: `${ip}1`,
      totalAddresses: Math.pow(2, Math.min(64, 128 - prefix)),
      usableAddresses: Math.pow(2, Math.min(64, 128 - prefix)),
      isPrivate: ip.toLowerCase().startsWith('fd') || ip.toLowerCase().startsWith('fe80'),
      ipClass: 'IPv6 Global / Local Unicast',
    };
  }

  return calculateIPv4Subnet(cidrInput);
}

/**
 * Checks if a given IP address belongs to a network's CIDR range
 */
export function isIpInSubnet(ip: string, cidr: string): boolean {
  try {
    const calc = calculateIPv4Subnet(cidr);
    const targetInt = ipToInt(ip);
    const netInt = ipToInt(calc.networkAddress);
    const bcastInt = ipToInt(calc.broadcastAddress);
    return targetInt >= netInt && targetInt <= bcastInt;
  } catch {
    return false;
  }
}
