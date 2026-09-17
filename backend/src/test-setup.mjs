import assert from 'assert';

const BASE_URL = 'http://localhost:4000/api';

async function runSetupTestSuite() {
  console.log('====================================================');
  console.log('🧪 VERIFICACIÓN DEL SISTEMA DE SETUP / PRIMERA INSTALACIÓN');
  console.log('====================================================\n');

  // 1. Check GET /api/setup/status
  console.log('1. Verificando endpoint GET /api/setup/status...');
  const statusRes = await fetch(`${BASE_URL}/setup/status`);
  const statusData = await statusRes.json();
  console.log('   Resultado estado setup:', statusData);
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusData.success, true);
  assert.strictEqual(statusData.isConfigured, true);
  assert.strictEqual(statusData.status, 'CONFIGURED');
  console.log('   ✅ Detección de instalación existente correcta (CONFIGURED)\n');

  // 2. Check Security Lock on POST /api/setup/initialize
  console.log('2. Verificando bloqueo de seguridad en /api/setup/initialize...');
  const testAttemptPassword = process.env.TEST_ADMIN_PASSWORD || `TestAttempt_${Math.random().toString(36).slice(2)}!A1`;
  const initRes = await fetch(`${BASE_URL}/setup/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Attacker',
      username: 'attacker',
      email: 'attacker@example.com',
      password: testAttemptPassword,
    }),
  });
  const initData = await initRes.json();
  console.log('   Resultado intento de inicialización posterior:', initData);
  assert.strictEqual(initRes.status, 400);
  assert.strictEqual(initData.success, false);
  assert.ok(initData.message.includes('ya está configurado'));
  console.log('   ✅ Protección de seguridad en backend confirmada (400 Bad Request)\n');

  // 3. Check About Metadata
  console.log('3. Verificando /api/about (Versión y créditos intactos)...');
  const aboutRes = await fetch(`${BASE_URL}/about`);
  const aboutData = await aboutRes.json();
  console.log('   About:', aboutData.data);
  assert.ok(/^\d+\.\d+\.\d+/.test(aboutData.data.version), `Versión SemVer válida esperada (recibido: ${aboutData.data.version})`);
  assert.strictEqual(aboutData.data.author, 'Adrian Palma');
  console.log(`   ✅ Metadatos institucionales y versión ${aboutData.data.version} intactos\n`);

  console.log('====================================================');
  console.log('🎉 TODAS LAS VERIFICACIONES DE SETUP PASARON AL 100%');
  console.log('====================================================');
}

runSetupTestSuite().catch((err) => {
  console.error('❌ Error en test suite de setup:', err);
  process.exit(1);
});
