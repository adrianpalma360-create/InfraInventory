import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyDevice } from '../src/scanner/classifier.js';
import { parseCidr, parseExcludedIps, isIpInCidr } from '../src/scanner/cidr.js';
import { identifyVendor, identifyVendorFromMac } from '../src/scanner/vendor.js';
import { encodeOid, parseVendorAndModelFromSysDescr } from '../src/scanner/snmp.js';
import { categorizeServices } from '../src/scanner/services.js';
import { getServiceForPort, BASIC_PORTS, FULL_PORTS } from '../src/scanner/ports.js';
import { normalizeMac } from '../src/scanner/arp.js';

describe('Advanced Network Discovery - Unit Tests', () => {
  describe('1. Evidence-based Device Classifier', () => {
    it('should classify Proxmox VE host as Virtualization Host', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 8006, protocol: 'TCP', state: 'OPEN', banner: 'Proxmox VE' }],
        hostname: 'pve-node-01',
      });
      assert.strictEqual(result.deviceType, 'Virtualization Host');
      assert.ok(result.reason.includes('Proxmox'));
    });

    it('should classify VMware ESXi host as Virtualization Host', () => {
      const result = classifyDevice({
        ports: [
          { portNumber: 902, protocol: 'TCP', state: 'OPEN' },
          { portNumber: 443, protocol: 'TCP', state: 'OPEN', banner: 'VMware ESXi' },
        ],
      });
      assert.strictEqual(result.deviceType, 'Virtualization Host');
    });

    it('should classify Docker Host with Portainer as Docker Host', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 9000, protocol: 'TCP', state: 'OPEN', banner: 'Portainer CE' }],
        hostname: 'docker-host-01',
      });
      assert.strictEqual(result.deviceType, 'Docker Host');
    });

    it('should classify Network Printer by JetDirect/IPP ports and vendor', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 9100, protocol: 'TCP', state: 'OPEN', serviceName: 'RAW JetDirect' }],
        vendor: 'HP Inc.',
        hostname: 'printer-finance',
      });
      assert.strictEqual(result.deviceType, 'Printer');
    });

    it('should classify Router from RouterOS/Cisco signatures', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 22, protocol: 'TCP', state: 'OPEN' }, { portNumber: 53, protocol: 'TCP', state: 'OPEN' }],
        vendor: 'MikroTik',
        banners: ['MikroTik RouterOS v7.14'],
      });
      assert.strictEqual(result.deviceType, 'Router');
    });

    it('should classify Firewall from Fortinet / pfSense signatures', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 443, protocol: 'TCP', state: 'OPEN', banner: 'FortiGate-60F' }],
        vendor: 'Fortinet',
        hostname: 'fw-edge-01',
      });
      assert.strictEqual(result.deviceType, 'Firewall');
    });

    it('should classify Network Switch from SNMP sysDescr and Cisco Catalyst signature', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 22, protocol: 'TCP', state: 'OPEN' }],
        snmp: {
          available: true,
          sysDescr: 'Cisco IOS Software, C2960X Software, Catalyst L2 Switch',
          interfaces: [],
        },
        hostname: 'sw-core-01',
      });
      assert.strictEqual(result.deviceType, 'Switch');
    });

    it('should classify Access Point from UniFi signature', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 22, protocol: 'TCP', state: 'OPEN' }],
        vendor: 'Ubiquiti Networks',
        hostname: 'uap-ac-pro-floor2',
        banners: ['UniFi AP'],
      });
      assert.strictEqual(result.deviceType, 'Access Point');
    });

    it('should classify NAS from Synology DSM port 5000 and vendor', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 5000, protocol: 'TCP', state: 'OPEN', serviceName: 'Synology DSM' }],
        vendor: 'Synology',
      });
      assert.strictEqual(result.deviceType, 'NAS');
    });

    it('should classify IP Camera from RTSP port 554 and Hikvision vendor', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 554, protocol: 'TCP', state: 'OPEN', serviceName: 'RTSP' }],
        vendor: 'Hikvision',
      });
      assert.strictEqual(result.deviceType, 'Camera');
    });

    it('should classify IoT device from MQTT and Home Assistant ports', () => {
      const result = classifyDevice({
        ports: [{ portNumber: 1883, protocol: 'TCP', state: 'OPEN', serviceName: 'MQTT' }],
      });
      assert.strictEqual(result.deviceType, 'IoT');
    });

    it('should classify Enterprise Linux Server', () => {
      const result = classifyDevice({
        ports: [
          { portNumber: 22, protocol: 'TCP', state: 'OPEN', serviceName: 'SSH' },
          { portNumber: 3306, protocol: 'TCP', state: 'OPEN', serviceName: 'MySQL' },
          { portNumber: 80, protocol: 'TCP', state: 'OPEN', banner: 'nginx/1.24.0 (Ubuntu)' },
        ],
        vendor: 'Dell',
        hostname: 'srv-db-prod',
      });
      assert.strictEqual(result.deviceType, 'Server');
    });

    it('should classify as Unknown when evidence is insufficient without inventing data', () => {
      const result = classifyDevice({
        ports: [],
      });
      assert.strictEqual(result.deviceType, 'Unknown');
    });
  });

  describe('2. CIDR & Exclusion Range Parsing', () => {
    it('should correctly parse /24 CIDR network into 254 usable host IPs', () => {
      const { ips, network, mask } = parseCidr('192.168.1.0/24');
      assert.strictEqual(network, '192.168.1.0');
      assert.strictEqual(mask, 24);
      assert.strictEqual(ips.length, 254);
      assert.strictEqual(ips[0], '192.168.1.1');
      assert.strictEqual(ips[ips.length - 1], '192.168.1.254');
    });

    it('should exclude specified IPs from scan range', () => {
      const { ips } = parseCidr('192.168.1.0/24', ['192.168.1.1', '192.168.1.254']);
      assert.strictEqual(ips.length, 252);
      assert.ok(!ips.includes('192.168.1.1'));
      assert.ok(!ips.includes('192.168.1.254'));
    });

    it('should exclude IP ranges (start-end format)', () => {
      const { ips } = parseCidr('192.168.1.0/24', ['192.168.1.10-192.168.1.20']);
      assert.strictEqual(ips.length, 254 - 11);
      assert.ok(!ips.includes('192.168.1.10'));
      assert.ok(!ips.includes('192.168.1.15'));
      assert.ok(!ips.includes('192.168.1.20'));
      assert.ok(ips.includes('192.168.1.21'));
    });

    it('should accurately test if IP is in CIDR subnet', () => {
      assert.strictEqual(isIpInCidr('192.168.1.50', '192.168.1.0/24'), true);
      assert.strictEqual(isIpInCidr('10.0.0.1', '192.168.1.0/24'), false);
    });
  });

  describe('3. Vendor Identification & MAC OUI Database', () => {
    it('should identify Dell from MAC prefix', () => {
      const vendor = identifyVendorFromMac('00:06:5B:11:22:33');
      assert.strictEqual(vendor, 'Dell');
    });

    it('should identify Cisco Systems from MAC prefix', () => {
      const vendor = identifyVendorFromMac('00:00:0C:AA:BB:CC');
      assert.strictEqual(vendor, 'Cisco Systems');
    });

    it('should identify Synology from MAC prefix', () => {
      const vendor = identifyVendorFromMac('00:11:32:01:02:03');
      assert.strictEqual(vendor, 'Synology');
    });

    it('should normalize MAC address formats', () => {
      assert.strictEqual(normalizeMac('00-11-32-01-02-03'), '00:11:32:01:02:03');
      assert.strictEqual(normalizeMac('0011.3201.0203'), '00:11:32:01:02:03');
      assert.strictEqual(normalizeMac('invalid'), undefined);
    });
  });

  describe('4. SNMP Parsing & OID Encoding', () => {
    it('should encode MIB OID to valid ASN.1 BER byte buffer', () => {
      const buf = encodeOid('1.3.6.1.2.1.1.1.0');
      assert.ok(buf.length > 0);
      assert.strictEqual(buf[0], 0x06); // ASN.1 OID tag
    });

    it('should extract vendor and model from sysDescr strings', () => {
      const res1 = parseVendorAndModelFromSysDescr('Cisco IOS Software, C2960X Software');
      assert.strictEqual(res1.vendor, 'Cisco Systems');

      const res2 = parseVendorAndModelFromSysDescr('RouterOS v7.12 on MikroTik RB4011');
      assert.strictEqual(res2.vendor, 'MikroTik');

      const res3 = parseVendorAndModelFromSysDescr('Linux 5.15.0-88-generic #98-Ubuntu SMP');
      assert.strictEqual(res3.vendor, 'Linux');

      const res4 = parseVendorAndModelFromSysDescr('Hardware: Intel64 Family 6 - Windows Server 2022');
      assert.strictEqual(res4.vendor, 'Microsoft');
      assert.strictEqual(res4.model, 'Windows Server 2022');
    });
  });

  describe('5. Ports & Services Categorization', () => {
    it('should provide service names for registered ports', () => {
      assert.strictEqual(getServiceForPort(22), 'SSH');
      assert.strictEqual(getServiceForPort(8006), 'Proxmox VE');
      assert.strictEqual(getServiceForPort(9100), 'RAW JetDirect');
      assert.strictEqual(getServiceForPort(3389), 'RDP');
    });

    it('should contain expected basic and full port counts', () => {
      assert.ok(BASIC_PORTS.length >= 12);
      assert.ok(FULL_PORTS.length >= 30);
    });

    it('should categorize detected open ports into structured service groups', () => {
      const services = categorizeServices([
        { portNumber: 80, protocol: 'TCP', state: 'OPEN' },
        { portNumber: 22, protocol: 'TCP', state: 'OPEN' },
        { portNumber: 3306, protocol: 'TCP', state: 'OPEN' },
        { portNumber: 8006, protocol: 'TCP', state: 'OPEN' },
      ]);
      assert.strictEqual(services.length, 4);
      assert.strictEqual(services[0].category, 'Web');
      assert.strictEqual(services[1].category, 'Remote Management');
      assert.strictEqual(services[2].category, 'Database');
      assert.strictEqual(services[3].category, 'Virtualization & Containers');
    });
  });
});
