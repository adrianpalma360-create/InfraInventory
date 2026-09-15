import assert from 'assert';

const BACKEND_URL = 'http://localhost:4000';

async function main() {
  console.log('====================================================');
  console.log('🚀 INICIANDO TEST SUITE AUTOMATIZADA INFRAINVENTORY V11');
  console.log('====================================================\n');

  // 1. Health & About Metadata
  console.log('1. Verificando Health & Metadata V11...');
  const healthRes = await fetch(`${BACKEND_URL}/health`);
  const healthJson = await healthRes.json();
  assert.strictEqual(healthRes.status, 200, 'Healthcheck falló');
  assert.strictEqual(healthJson.status, 'healthy');
  console.log('   ✅ Healthcheck OK:', healthJson);

  const aboutRes = await fetch(`${BACKEND_URL}/api/about`);
  const aboutJson = await aboutRes.json();
  assert.strictEqual(aboutRes.status, 200);
  assert.strictEqual(aboutJson.data.version, '11.0.0', 'La versión de la API debe ser 11.0.0');
  assert.strictEqual(aboutJson.data.author, 'Adrian Palma', 'El autor debe ser Adrian Palma');
  console.log('   ✅ About Metadata OK: Version', aboutJson.data.version, '| Author:', aboutJson.data.author);

  // 2. Auth Login (Admin & Operador)...
  console.log('\n2. Autenticación de Usuarios (Admin & Operador)...');
  const testAdminUsername = (process.env.TEST_ADMIN_USERNAME || 'admin').trim();
  const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!testAdminPassword) {
    console.error('❌ Error: La variable de entorno TEST_ADMIN_PASSWORD es obligatoria para ejecutar test-v11.mjs');
    process.exit(1);
  }

  const adminLoginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testAdminUsername, password: testAdminPassword }),
  });
  const adminLogin = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200, 'Login Admin falló');
  const adminToken = adminLogin.token || adminLogin.data?.token;
  const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
  console.log('   ✅ Login Admin exitoso');

  // 3. Stats & Dashboard
  console.log('\n3. Verificando Endpoint de Estadísticas de Automatización V11...');
  const statsRes = await fetch(`${BACKEND_URL}/api/automation/stats`, { headers: adminHeaders });
  const statsJson = await statsRes.json();
  assert.strictEqual(statsRes.status, 200);
  assert.strictEqual(statsJson.success, true);
  console.log('   ✅ Stats V11 OK:', statsJson.data);

  // 4. Catálogo de Acciones
  console.log('\n4. Consultando Catálogo de Acciones Parametrizadas & Allowlist...');
  const actionsRes = await fetch(`${BACKEND_URL}/api/automation/actions`, { headers: adminHeaders });
  const actionsJson = await actionsRes.json();
  assert.strictEqual(actionsRes.status, 200);
  assert.strictEqual(actionsJson.success, true);
  assert.ok(actionsJson.data.builtIns.length >= 8, 'Debe haber al menos 8 acciones built-in registradas');
  console.log(`   ✅ Acciones registradas: ${actionsJson.data.builtIns.length} built-in actions`);

  // 5. Workflows CRUD, Versioning & Dry-Run
  console.log('\n5. Creación de Workflow de Prueba, Versionado y Ejecución Dry-Run...');
  const createWfRes = await fetch(`${BACKEND_URL}/api/automation/workflows`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Workflow de Prueba Automatizada V11',
      description: 'Workflow de diagnóstico de red y recursos para validación continua',
      category: 'DIAGNOSTIC',
      targetType: 'MACHINE',
      concurrencyLimit: 2,
      timeoutTotalSec: 60,
      circuitBreakerThreshold: 3,
      steps: [
        { order: 1, actionName: 'ping_check', label: 'Ping ICMP Inicial', parameters: { count: 3 } },
        { order: 2, actionName: 'system_info', label: 'Métricas de CPU y Memoria', parameters: {} },
      ],
    }),
  });
  const createWf = await createWfRes.json();
  assert.strictEqual(createWfRes.status, 201);
  const wfId = createWf.data.id;
  console.log('   ✅ Workflow creado con ID:', wfId, 'Version:', createWf.data.versions[0]?.versionNumber || createWf.data.versions[0]?.version);

  // Ejecución Dry-Run
  console.log('   Ejecutando Simulación Segura (Dry-Run)...');
  const dryRunRes = await fetch(`${BACKEND_URL}/api/automation/workflows/${wfId}/execute`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      targetType: 'MACHINE',
      targetIdentifier: '127.0.0.1',
      isDryRun: true,
      reason: 'Validación de simulación V11',
    }),
  });
  const dryRunJson = await dryRunRes.json();
  assert.strictEqual(dryRunRes.status, 200);
  assert.strictEqual(dryRunJson.data.isDryRun, true);
  assert.strictEqual(dryRunJson.data.execution.status, 'SUCCESS');
  console.log('   ✅ Dry-Run exitoso con simulación de impacto sin escritura');

  // 6. Principio de Cuatro Ojos (Four-Eyes Principle)
  console.log('\n6. Validando Principio de Cuatro Ojos (Four-Eyes Approval Enforce)...');
  const appReqRes = await fetch(`${BACKEND_URL}/api/automation/approvals`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      actionName: 'Reinicio Crítico de Servidor',
      targetType: 'MACHINE',
      targetIdentifier: 'srv-db-01',
      riskLevel: 'CRITICAL',
      reason: 'Mantenimiento de kernel urgente',
    }),
  });
  const appReq = await appReqRes.json();
  assert.strictEqual(appReqRes.status, 201);
  const approvalId = appReq.data.id;
  console.log('   ✅ Solicitud de aprobación creada con ID:', approvalId);

  // Intentar auto-aprobar (debe ser RECHAZADO por Four-Eyes)
  const selfApproveRes = await fetch(`${BACKEND_URL}/api/automation/approvals/${approvalId}/decide`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ decision: 'APPROVE' }),
  });
  assert.strictEqual(selfApproveRes.status, 403, 'El creador no debe poder auto-aprobar acciones críticas');
  console.log('   ✅ Protección Four-Eyes confirmada: Auto-aprobación rechazada con código 403');

  // 7. Agente: Registro, Heartbeat & Revocación
  console.log('\n7. Registrando Agente de Infraestructura & Verificando Heartbeat...');
  const regAgentRes = await fetch(`${BACKEND_URL}/api/agents/register`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      hostname: 'srv-agent-node-01',
      osType: 'LINUX',
      ipAddress: '10.0.0.99',
    }),
  });
  const regAgent = await regAgentRes.json();
  assert.strictEqual(regAgentRes.status, 201);
  const { agent, token } = regAgent.data;
  console.log('   ✅ Agente registrado con ID:', agent.id);

  // Enviar Heartbeat
  const hbRes = await fetch(`${BACKEND_URL}/api/agents/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent.id,
      token,
      cpuUsage: 14.5,
      ramUsage: 48.2,
      diskUsage: 62.0,
      uptimeSeconds: 86400,
    }),
  });
  const hbJson = await hbRes.json();
  assert.strictEqual(hbRes.status, 200);
  assert.strictEqual(hbJson.data.status, 'OK');
  console.log('   ✅ Heartbeat de telemetría procesado con éxito');

  // 8. Integridad de Modelos V1-V10 (Zero Regresiones)
  console.log('\n8. Verificando Cero Regresiones en Módulos V1-V10...');
  const machinesRes = await fetch(`${BACKEND_URL}/api/machines`, { headers: adminHeaders });
  assert.strictEqual(machinesRes.status, 200);
  const assetsRes = await fetch(`${BACKEND_URL}/api/assets`, { headers: adminHeaders });
  assert.strictEqual(assetsRes.status, 200);
  const ticketsRes = await fetch(`${BACKEND_URL}/api/tickets`, { headers: adminHeaders });
  assert.strictEqual(ticketsRes.status, 200);
  const aiStatsRes = await fetch(`${BACKEND_URL}/api/ai/dashboard`, { headers: adminHeaders });
  assert.strictEqual(aiStatsRes.status, 200);
  console.log('   ✅ Módulos V1-V10 intactos y respondiendo con código 200');

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE INFRAINVENTORY V11 PASARON AL 100%');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ Error en test suite:', err);
  process.exit(1);
});
