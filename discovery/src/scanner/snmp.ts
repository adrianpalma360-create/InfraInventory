import dgram from 'dgram';
import { SnmpConfig, SnmpDiscoveryResult, SnmpInterfaceInfo } from './types.js';

// Standard MIB-II OIDs
export const OID_SYS_DESCR = '1.3.6.1.2.1.1.1.0';
export const OID_SYS_OBJECT_ID = '1.3.6.1.2.1.1.2.0';
export const OID_SYS_UPTIME = '1.3.6.1.2.1.1.3.0';
export const OID_SYS_NAME = '1.3.6.1.2.1.1.5.0';

/**
 * Encode an OID string into ASN.1 BER byte buffer
 */
export function encodeOid(oidStr: string): Buffer {
  const parts = oidStr.split('.').map((p) => parseInt(p, 10));
  if (parts.length < 2) return Buffer.from([0x06, 0x00]);

  const bytes: number[] = [parts[0] * 40 + parts[1]];

  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val < 128) {
      bytes.push(val);
    } else {
      const subBytes: number[] = [];
      subBytes.unshift(val & 0x7f);
      val >>>= 7;
      while (val > 0) {
        subBytes.unshift((val & 0x7f) | 0x80);
        val >>>= 7;
      }
      bytes.push(...subBytes);
    }
  }

  return Buffer.concat([Buffer.from([0x06, bytes.length]), Buffer.from(bytes)]);
}

/**
 * Build an SNMPv2c GetRequest PDU packet
 */
export function buildSnmpGetPacket(community: string, requestId: number, oids: string[]): Buffer {
  const communityBuf = Buffer.from(community, 'utf-8');
  const communityBer = Buffer.concat([Buffer.from([0x04, communityBuf.length]), communityBuf]);
  const versionBer = Buffer.from([0x02, 0x01, 0x01]); // 0x01 = SNMPv2c

  const varbinds: Buffer[] = [];
  for (const oid of oids) {
    const oidBer = encodeOid(oid);
    const nullVal = Buffer.from([0x05, 0x00]); // Null Value
    const varbind = Buffer.concat([
      Buffer.from([0x30, oidBer.length + nullVal.length]),
      oidBer,
      nullVal,
    ]);
    varbinds.push(varbind);
  }

  const varbindListContent = Buffer.concat(varbinds);
  const varbindListBer = Buffer.concat([
    Buffer.from([0x30, varbindListContent.length]),
    varbindListContent,
  ]);

  // Request ID (Integer)
  const reqIdBuf = Buffer.from([
    0x02,
    0x04,
    (requestId >>> 24) & 0xff,
    (requestId >>> 16) & 0xff,
    (requestId >>> 8) & 0xff,
    requestId & 0xff,
  ]);

  const errorStatus = Buffer.from([0x02, 0x01, 0x00]);
  const errorIndex = Buffer.from([0x02, 0x01, 0x00]);

  // GetRequest PDU = 0xA0
  const pduContent = Buffer.concat([reqIdBuf, errorStatus, errorIndex, varbindListBer]);
  const pduBer = Buffer.concat([Buffer.from([0xa0, pduContent.length]), pduContent]);

  // Sequence wrapper = 0x30
  const messageContent = Buffer.concat([versionBer, communityBer, pduBer]);
  return Buffer.concat([Buffer.from([0x30, messageContent.length]), messageContent]);
}

/**
 * Decode ASN.1 BER payload into key strings
 */
export function parseSnmpResponse(buf: Buffer): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const text = buf.toString('latin1');
    // Extract printable strings from the buffer
    const strings = text
      .split(/[\x00-\x1F\x7F-\xFF]+/)
      .filter((s) => s.length >= 2 && !/^[0-9]+$/.test(s));

    if (strings.length > 0) {
      result['raw'] = strings.join(' | ');
    }
  } catch {
    // ignore
  }

  return result;
}

/**
 * Parse Vendor and Model from sysDescr
 */
export function parseVendorAndModelFromSysDescr(sysDescr?: string): { vendor?: string; model?: string } {
  if (!sysDescr) return {};
  const lower = sysDescr.toLowerCase();

  let vendor: string | undefined;
  let model: string | undefined;

  if (lower.includes('cisco')) {
    vendor = 'Cisco Systems';
    const ciscoMatch = sysDescr.match(/Cisco\s+([A-Za-z0-9-]+)/i);
    if (ciscoMatch) model = ciscoMatch[1];
  } else if (lower.includes('mikrotik') || lower.includes('routeros')) {
    vendor = 'MikroTik';
    const mtMatch = sysDescr.match(/RouterOS\s+([A-Za-z0-9.-]+)/i);
    if (mtMatch) model = `RouterOS ${mtMatch[1]}`;
  } else if (lower.includes('fortinet') || lower.includes('fortigate')) {
    vendor = 'Fortinet';
    const fgMatch = sysDescr.match(/FortiGate-([A-Za-z0-9]+)/i);
    if (fgMatch) model = `FortiGate ${fgMatch[1]}`;
  } else if (lower.includes('synology') || lower.includes('dsm')) {
    vendor = 'Synology';
    const synoMatch = sysDescr.match(/DS\d+[A-Za-z+]*/i) || sysDescr.match(/RS\d+[A-Za-z+]*/i);
    if (synoMatch) model = synoMatch[0];
  } else if (lower.includes('qnap')) {
    vendor = 'QNAP';
    const qnapMatch = sysDescr.match(/TS-\d+[A-Za-z0-9]*/i);
    if (qnapMatch) model = qnapMatch[0];
  } else if (lower.includes('linux')) {
    vendor = 'Linux';
    const kernelMatch = sysDescr.match(/Linux\s+([^\s]+)\s+([\d.-]+)/i);
    if (kernelMatch) model = `Kernel ${kernelMatch[2]}`;
  } else if (lower.includes('windows')) {
    vendor = 'Microsoft';
    if (lower.includes('server 2022')) model = 'Windows Server 2022';
    else if (lower.includes('server 2019')) model = 'Windows Server 2019';
    else if (lower.includes('server 2016')) model = 'Windows Server 2016';
    else if (lower.includes('windows 10')) model = 'Windows 10';
    else if (lower.includes('windows 11')) model = 'Windows 11';
    else model = 'Windows OS';
  } else if (lower.includes('hp') || lower.includes('hewlett-packard') || lower.includes('procurve')) {
    vendor = 'HP / Aruba';
    const hpMatch = sysDescr.match(/ProCurve\s+([A-Za-z0-9-]+)/i) || sysDescr.match(/HP\s+([A-Za-z0-9-]+)/i);
    if (hpMatch) model = hpMatch[1];
  } else if (lower.includes('ubiquiti') || lower.includes('unifi') || lower.includes('edgerouter')) {
    vendor = 'Ubiquiti Networks';
    const ubiMatch = sysDescr.match(/UniFi\s+([A-Za-z0-9-]+)/i) || sysDescr.match(/EdgeRouter\s+([A-Za-z0-9-]+)/i);
    if (ubiMatch) model = ubiMatch[1];
  } else if (lower.includes('dell')) {
    vendor = 'Dell';
    const dellMatch = sysDescr.match(/PowerEdge\s+([A-Za-z0-9]+)/i);
    if (dellMatch) model = `PowerEdge ${dellMatch[1]}`;
  }

  return { vendor, model };
}

/**
 * Execute SNMP v2c Discovery on target IP
 */
export async function probeSnmp(
  ip: string,
  config?: Partial<SnmpConfig>
): Promise<SnmpDiscoveryResult> {
  const community = config?.community || 'public';
  const port = config?.port || 161;
  const timeoutMs = config?.timeoutMs || 1000;
  const retries = config?.retries || 1;

  const oids = [OID_SYS_DESCR, OID_SYS_OBJECT_ID, OID_SYS_UPTIME, OID_SYS_NAME];

  return new Promise((resolve) => {
    let resolved = false;
    let attempt = 0;
    const client = dgram.createSocket('udp4');

    const cleanup = () => {
      client.removeAllListeners();
      try {
        client.close();
      } catch {
        // ignore
      }
    };

    let timer: any = null;

    const trySend = () => {
      if (resolved) return;
      attempt++;
      const reqId = Math.floor(Math.random() * 65535) + 1;
      const packet = buildSnmpGetPacket(community, reqId, oids);

      client.send(packet, port, ip, (err) => {
        if (err && !resolved) {
          if (attempt >= retries) {
            resolved = true;
            cleanup();
            resolve({ available: false, interfaces: [], error: err.message });
          }
        }
      });

      timer = setTimeout(() => {
        if (!resolved) {
          if (attempt < retries) {
            trySend();
          } else {
            resolved = true;
            cleanup();
            resolve({ available: false, interfaces: [] });
          }
        }
      }, timeoutMs);
    };

    client.on('message', (msg) => {
      if (!resolved) {
        resolved = true;
        if (timer) clearTimeout(timer);
        cleanup();

        const rawData = parseSnmpResponse(msg);
        const sysDescr = rawData['raw'] || undefined;
        const { vendor, model } = parseVendorAndModelFromSysDescr(sysDescr);

        resolve({
          available: true,
          sysDescr,
          vendor,
          model,
          interfaces: [],
        });
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        if (timer) clearTimeout(timer);
        cleanup();
        resolve({ available: false, interfaces: [], error: err.message });
      }
    });

    trySend();
  });
}
