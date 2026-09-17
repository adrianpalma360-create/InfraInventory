import { pingHost } from './icmp.js';
import { lookupArp } from './arp.js';
import { resolveDnsHostname } from './dns.js';
import { scanTcpPorts } from './tcp.js';
import { probeSnmp } from './snmp.js';
import { probeSsh } from './ssh.js';
import { probeWinrm } from './winrm.js';
import { identifyVendor } from './vendor.js';
import { classifyDevice } from './classifier.js';
import {
  DiscoveredHostResult,
  DiscoveryMethodsConfig,
  SnmpConfig,
  RemoteCredentialsConfig,
  DiscoveredPortInfo,
  HostStatus,
} from './types.js';

export interface HostProbeOptions {
  portsToScan: number[];
  timeoutMs?: number;
  methods?: Partial<DiscoveryMethodsConfig>;
  snmp?: Partial<SnmpConfig>;
  credentials?: RemoteCredentialsConfig;
}

/**
 * Probe a single IP using all enabled discovery modules
 */
export async function probeHost(
  ip: string,
  options: HostProbeOptions
): Promise<DiscoveredHostResult | null> {
  const {
    portsToScan,
    timeoutMs = 600,
    methods = {},
    snmp: snmpConfig,
    credentials,
  } = options;

  const enabledMethods: DiscoveryMethodsConfig = {
    icmp: methods.icmp !== false,
    arp: methods.arp !== false,
    tcp: methods.tcp !== false,
    dns: methods.dns !== false,
    snmp: methods.snmp !== false,
    ssh: methods.ssh === true,
    winrm: methods.winrm === true,
  };

  const methodsUsed: string[] = [];
  let minResponseTime = Infinity;

  // 1. Concurrent ICMP Ping & TCP Port Scan
  const promises: [
    Promise<{ isAlive: boolean; responseTimeMs?: number }>,
    Promise<DiscoveredPortInfo[]>
  ] = [
    enabledMethods.icmp
      ? (methodsUsed.push('ICMP'), pingHost(ip, Math.max(timeoutMs, 600)))
      : Promise.resolve({ isAlive: false }),
    enabledMethods.tcp && portsToScan.length > 0
      ? (methodsUsed.push('TCP'), scanTcpPorts(ip, portsToScan, timeoutMs))
      : Promise.resolve([]),
  ];

  const [pingResult, openPorts] = await Promise.all(promises);

  if (pingResult.isAlive && pingResult.responseTimeMs) {
    minResponseTime = Math.min(minResponseTime, pingResult.responseTimeMs);
  }

  const isOnline = pingResult.isAlive || openPorts.length > 0;

  if (!isOnline) {
    return null; // Host is offline/unresponsive
  }

  // 2. ARP Discovery
  let macAddress: string | undefined;
  if (enabledMethods.arp) {
    methodsUsed.push('ARP');
    macAddress = await lookupArp(ip, timeoutMs);
  }

  // 3. DNS Reverse Resolution
  let hostname: string | undefined;
  if (enabledMethods.dns) {
    methodsUsed.push('DNS');
    hostname = await resolveDnsHostname(ip, timeoutMs);
  }

  // 4. SNMP Discovery (if port 161 is open or SNMP enabled)
  let snmpResult = undefined;
  if (enabledMethods.snmp) {
    methodsUsed.push('SNMP');
    snmpResult = await probeSnmp(ip, snmpConfig);
    if (snmpResult.available && snmpResult.sysName && !hostname) {
      hostname = snmpResult.sysName;
    }
  }

  // 5. SSH Discovery (if enabled and port 22 open)
  let sshResult = undefined;
  if (enabledMethods.ssh && openPorts.some((p) => p.portNumber === 22)) {
    methodsUsed.push('SSH');
    sshResult = await probeSsh(ip, credentials?.ssh, timeoutMs);
  }

  // 6. WinRM Discovery (if enabled and port 5985/5986 open)
  let winrmResult = undefined;
  if (
    enabledMethods.winrm &&
    openPorts.some((p) => p.portNumber === 5985 || p.portNumber === 5986)
  ) {
    methodsUsed.push('WinRM');
    winrmResult = await probeWinrm(ip, credentials?.winrm, timeoutMs);
  }

  // 7. Vendor Identification
  const banners = openPorts.map((p) => p.banner).filter((b): b is string => Boolean(b));
  const vendor = identifyVendor(macAddress, snmpResult?.vendor, banners);

  // 8. Device Classification
  const classification = classifyDevice({
    ports: openPorts,
    macAddress,
    vendor,
    hostname,
    snmp: snmpResult,
    banners,
    osGuess: snmpResult?.model || sshResult?.os || winrmResult?.windowsVersion,
  });

  return {
    ip,
    macAddress,
    hostname,
    vendor,
    osGuess: classification.osGuess,
    deviceType: classification.deviceType,
    classificationReason: classification.reason,
    status: 'ONLINE' as HostStatus,
    responseTimeMs: minResponseTime !== Infinity ? minResponseTime : undefined,
    ports: openPorts,
    snmp: snmpResult?.available ? snmpResult : undefined,
    ssh: sshResult?.available ? sshResult : undefined,
    winrm: winrmResult?.available ? winrmResult : undefined,
    methodsUsed: Array.from(new Set(methodsUsed)),
  };
}
