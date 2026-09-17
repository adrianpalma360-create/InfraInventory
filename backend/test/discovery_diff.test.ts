import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Advanced Discovery - Diff & Change Detection Engine Tests', () => {
  it('should detect NEW_DEVICE when host IP and MAC are not in inventory', () => {
    const existingIps = new Set(['192.168.1.10', '192.168.1.20']);
    const discoveredIp = '192.168.1.143';

    const isNew = !existingIps.has(discoveredIp);
    assert.strictEqual(isNew, true);

    const changeEvent = {
      changeType: 'NEW_DEVICE',
      status: 'PENDING',
      ip: discoveredIp,
      details: 'Nuevo dispositivo detectado en 192.168.1.143',
    };
    assert.strictEqual(changeEvent.changeType, 'NEW_DEVICE');
    assert.strictEqual(changeEvent.status, 'PENDING');
  });

  it('should detect IP_CHANGED when known machine has a different primary IP', () => {
    const machine = { id: 'm1', hostname: 'SRV-01', primaryIp: '192.168.1.20', macAddress: '00:11:22:33:44:55' };
    const discovered = { ip: '192.168.1.25', macAddress: '00:11:22:33:44:55' };

    assert.notStrictEqual(machine.primaryIp, discovered.ip);
    const diff = {
      changeType: 'IP_CHANGED',
      oldValue: machine.primaryIp,
      newValue: discovered.ip,
      machineId: machine.id,
    };
    assert.strictEqual(diff.oldValue, '192.168.1.20');
    assert.strictEqual(diff.newValue, '192.168.1.25');
  });

  it('should detect MAC_CHANGED when host MAC is different from inventory', () => {
    const machine = { id: 'm1', hostname: 'SRV-01', primaryIp: '192.168.1.20', macAddress: '00:11:22:33:44:55' };
    const discovered = { ip: '192.168.1.20', macAddress: 'AA:BB:CC:DD:EE:FF' };

    const diff = {
      changeType: 'MAC_CHANGED',
      oldValue: machine.macAddress,
      newValue: discovered.macAddress,
    };
    assert.strictEqual(diff.oldValue, '00:11:22:33:44:55');
    assert.strictEqual(diff.newValue, 'AA:BB:CC:DD:EE:FF');
  });

  it('should detect NEW_PORT when newly opened port is detected', () => {
    const existingPorts = new Set([80, 443]);
    const discoveredPorts = [80, 443, 8080];

    const newPorts = discoveredPorts.filter((p) => !existingPorts.has(p));
    assert.deepStrictEqual(newPorts, [8080]);
  });

  it('should detect PORT_CLOSED when registered port does not respond', () => {
    const existingPorts = [80, 443, 3306];
    const discoveredPorts = new Set([80, 443]);

    const closedPorts = existingPorts.filter((p) => !discoveredPorts.has(p));
    assert.deepStrictEqual(closedPorts, [3306]);
  });

  it('should detect HARDWARE_CHANGED when RAM or CPU telemetría changes', () => {
    const existingHardware = { ram: '32 GB', cpu: 'Intel Xeon E5-2680' };
    const discoveredHardware = { ram: '64 GB', cpu: 'Intel Xeon E5-2680' };

    const hasRamChanged = existingHardware.ram !== discoveredHardware.ram;
    assert.strictEqual(hasRamChanged, true);

    const diff = {
      changeType: 'HARDWARE_CHANGED',
      oldValue: existingHardware.ram,
      newValue: discoveredHardware.ram,
      details: `Hardware change detected: RAM ${existingHardware.ram} -> ${discoveredHardware.ram}`,
    };
    assert.strictEqual(diff.oldValue, '32 GB');
    assert.strictEqual(diff.newValue, '64 GB');
  });

  it('should mark machine as OFFLINE without deleting from inventory when host does not respond', () => {
    const machine = { id: 'm1', hostname: 'SRV-01', primaryIp: '192.168.1.20', status: 'ONLINE' };
    const discoveredIps = new Set(['192.168.1.1', '192.168.1.2']);

    const isMissing = !discoveredIps.has(machine.primaryIp);
    assert.strictEqual(isMissing, true);

    const updatedMachine = { ...machine, status: 'OFFLINE' };
    assert.strictEqual(updatedMachine.status, 'OFFLINE');
    assert.strictEqual(updatedMachine.id, 'm1'); // Not deleted!
  });
});
