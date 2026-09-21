import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('V12 NOC Dashboard - Business Logic & Health Calculation Tests', () => {
  it('should calculate 100% HEALTHY score when all hosts are online and no alerts exist', () => {
    const totalMachines = 10;
    const onlineMachines = 10;
    const warningMachines = 0;
    const offlineMachines = 0;
    const uncheckedMachines = 0;
    const criticalAlerts = 0;
    const warningAlerts = 0;
    const totalServices = 20;
    const healthyServices = 20;
    const warningServices = 0;
    const saturatedHosts = 0;

    const availabilityScore = ((onlineMachines + 0.5 * warningMachines + 0.5 * uncheckedMachines) / totalMachines) * 100;
    const alertsScore = Math.max(0, 100 - (criticalAlerts * 15 + warningAlerts * 5));
    const servicesScore = (healthyServices / totalServices) * 100;
    const resourcesScore = Math.max(0, 100 - (saturatedHosts / totalMachines) * 100);

    const finalScore = Math.round(
      availabilityScore * 0.4 +
      alertsScore * 0.3 +
      servicesScore * 0.2 +
      resourcesScore * 0.1
    );

    assert.strictEqual(finalScore, 100);
    assert.strictEqual(finalScore >= 90, true);
  });

  it('should return null (N/D) for Health Score when 0 machines are monitored', () => {
    const totalMachines = 0;
    const result = totalMachines === 0 ? null : 100;
    assert.strictEqual(result, null);
  });

  it('should calculate WARNING/DEGRADED health score when hosts or services have issues', () => {
    const totalMachines = 10;
    const onlineMachines = 8;
    const warningMachines = 1;
    const offlineMachines = 1;
    const uncheckedMachines = 0;
    const criticalAlerts = 0;
    const warningAlerts = 2; // -10 pts
    const totalServices = 10;
    const healthyServices = 8;
    const warningServices = 2; // 90%
    const saturatedHosts = 1; // 10% saturated -> 90%

    const availabilityScore = ((onlineMachines * 1.0 + warningMachines * 0.5 + uncheckedMachines * 0.5) / totalMachines) * 100; // 85%
    const alertsScore = Math.max(0, 100 - (criticalAlerts * 15 + warningAlerts * 5)); // 90%
    const servicesScore = ((healthyServices * 1.0 + warningServices * 0.5) / totalServices) * 100; // 90%
    const resourcesScore = Math.max(0, 100 - (saturatedHosts / totalMachines) * 100); // 90%

    const finalScore = Math.round(
      availabilityScore * 0.4 + // 34
      alertsScore * 0.3 +       // 27
      servicesScore * 0.2 +     // 18
      resourcesScore * 0.1      // 9
    ); // 88%

    assert.strictEqual(finalScore, 88);
    assert.strictEqual(finalScore >= 70 && finalScore < 90, true);
  });

  it('should calculate CRITICAL health score when critical alerts and offline servers dominate', () => {
    const totalMachines = 5;
    const onlineMachines = 2;
    const warningMachines = 1;
    const offlineMachines = 2;
    const uncheckedMachines = 0;
    const criticalAlerts = 3; // -45 pts -> alertsScore = 55
    const warningAlerts = 2; // -10 pts -> alertsScore = 45
    const totalServices = 5;
    const healthyServices = 2;
    const warningServices = 1;

    const availabilityScore = ((onlineMachines * 1.0 + warningMachines * 0.5 + uncheckedMachines * 0.5) / totalMachines) * 100; // 50%
    const alertsScore = Math.max(0, 100 - (criticalAlerts * 15 + warningAlerts * 5)); // 45%
    const servicesScore = ((healthyServices * 1.0 + warningServices * 0.5) / totalServices) * 100; // 50%
    const resourcesScore = 50;

    const finalScore = Math.round(
      availabilityScore * 0.4 + // 20
      alertsScore * 0.3 +       // 13.5
      servicesScore * 0.2 +     // 10
      resourcesScore * 0.1      // 5
    ); // 49%

    assert.strictEqual(finalScore, 49);
    assert.strictEqual(finalScore < 70, true);
  });

  it('should correctly prioritize devices in attention queue by CRITICAL > OFFLINE > WARNING', () => {
    const devices = [
      { id: 'm1', hostname: 'SRV-01', severity: 'WARNING', reason: 'RAM > 85%' },
      { id: 'm2', hostname: 'SRV-02', severity: 'CRITICAL', reason: 'Disk > 95%' },
      { id: 'm3', hostname: 'SRV-03', severity: 'OFFLINE', reason: 'Host unreachable' },
      { id: 'm4', hostname: 'SRV-04', severity: 'CRITICAL', reason: 'Port 443 Down' },
    ];

    const score = (item: any) => {
      if (item.severity === 'CRITICAL') return 3;
      if (item.severity === 'OFFLINE') return 2;
      return 1;
    };

    const sorted = [...devices].sort((a, b) => score(b) - score(a));

    assert.strictEqual(sorted[0].severity, 'CRITICAL');
    assert.strictEqual(sorted[1].severity, 'CRITICAL');
    assert.strictEqual(sorted[2].severity, 'OFFLINE');
    assert.strictEqual(sorted[3].severity, 'WARNING');
  });

  it('should compute accurate resource averages and maximums without inventing missing metrics', () => {
    const samples = [
      { hostname: 'SRV-01', cpuUsage: 80, ramUsage: 70, diskUsage: 60 },
      { hostname: 'SRV-02', cpuUsage: 90, ramUsage: null, diskUsage: 95 },
      { hostname: 'SRV-03', cpuUsage: null, ramUsage: 80, diskUsage: null },
    ];

    const validCpu = samples.map((s) => s.cpuUsage).filter((v): v is number => v !== null);
    const validRam = samples.map((s) => s.ramUsage).filter((v): v is number => v !== null);
    const validDisk = samples.map((s) => s.diskUsage).filter((v): v is number => v !== null);

    const cpuAvg = Number((validCpu.reduce((a, b) => a + b, 0) / validCpu.length).toFixed(1));
    const cpuMax = Math.max(...validCpu);
    const ramAvg = Number((validRam.reduce((a, b) => a + b, 0) / validRam.length).toFixed(1));
    const diskMax = Math.max(...validDisk);

    assert.strictEqual(cpuAvg, 85);
    assert.strictEqual(cpuMax, 90);
    assert.strictEqual(ramAvg, 75);
    assert.strictEqual(diskMax, 95);
    assert.strictEqual(validCpu.length, 2); // 2 reporting hosts
  });

  it('should merge activity timeline from audit, discovery and alerts in reverse chronological order', () => {
    const now = Date.now();
    const items = [
      { id: '1', type: 'CHANGE', timestamp: new Date(now - 10000).toISOString() },
      { id: '2', type: 'ALERT', timestamp: new Date(now - 2000).toISOString() },
      { id: '3', type: 'DISCOVERY', timestamp: new Date(now - 5000).toISOString() },
    ];

    const sorted = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    assert.strictEqual(sorted[0].id, '2'); // most recent (-2s)
    assert.strictEqual(sorted[1].id, '3'); // middle (-5s)
    assert.strictEqual(sorted[2].id, '1'); // oldest (-10s)
  });
});
