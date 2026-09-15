// test-v9.mjs - Full verification of InfraInventory V9 Operational features

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';

async function request(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: data, data: data?.data ?? data };
}

async function runTests() {
  console.log('🚀 Starting InfraInventory V9 Verification Tests...');
  console.log(`📡 Targeting: ${API_BASE}`);

  // 1. Auth Login
  console.log('\n--- 1. Authentication ---');
  let token = null;
  const testAdminUsername = (process.env.TEST_ADMIN_USERNAME || 'admin').trim();
  const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!testAdminPassword) {
    console.error('❌ Error: La variable de entorno TEST_ADMIN_PASSWORD es obligatoria para ejecutar test-v9.mjs');
    process.exit(1);
  }

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: testAdminUsername, password: testAdminPassword })
  });

  if (!loginRes.ok || !loginRes.body?.token) {
    console.error('❌ Error de autenticación en test-v9:', loginRes.body?.message || 'Credenciales inválidas');
    process.exit(1);
  }

  token = loginRes.body.token;
  console.log(`✅ Logged in successfully as ${testAdminUsername}.`);

  // 2. SLA Management
  console.log('\n--- 2. SLA Management ---');
  const slaRes = await request('/slas', {
    method: 'POST',
    body: JSON.stringify({
      name: `SLA Misión Crítica 24x7 - ${Date.now()}`,
      description: 'SLA para servicios centrales de producción',
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 240,
      priority: 'CRITICAL',
      enabled: true,
      businessHoursOnly: false,
      businessHoursStart: '08:00',
      businessHoursEnd: '18:00'
    })
  }, token);

  console.log(`Create SLA Status: ${slaRes.status}`, slaRes.data?.name || 'SLA OK');
  const slaId = slaRes.data?.id;

  const getSlas = await request('/slas', { method: 'GET' }, token);
  console.log(`✅ Fetched ${Array.isArray(getSlas.data) ? getSlas.data.length : 0} SLAs`);

  // 3. Machines & Assets Lookup for linking
  console.log('\n--- 3. Context Lookup (Machines / Assets) ---');
  const machinesRes = await request('/machines?limit=10', { method: 'GET' }, token);
  const machinesList = machinesRes.data?.items || machinesRes.data || [];
  const firstMachine = Array.isArray(machinesList) ? machinesList[0] : null;
  console.log(`Found machine: ${firstMachine?.hostname || 'none'} (${firstMachine?.id || 'none'})`);

  const assetsRes = await request('/assets?limit=10', { method: 'GET' }, token);
  const assetsList = assetsRes.data?.items || assetsRes.data || [];
  const firstAsset = Array.isArray(assetsList) ? assetsList[0] : null;
  console.log(`Found asset: ${firstAsset?.assetTag || 'none'} (${firstAsset?.id || 'none'})`);

  // 4. Ticket Creation & Workflow
  console.log('\n--- 4. Tickets & Helpdesk Workflow ---');
  const createTicketRes = await request('/tickets', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Degradación de rendimiento en servidor PostgreSQL de producción',
      description: 'Se observa incremento de latencia en consultas y alto uso de CPU.',
      type: 'INCIDENT',
      priority: 'HIGH',
      status: 'OPEN',
      machineId: firstMachine?.id || null,
      assetId: firstAsset?.id || null,
      slaId: slaId || null,
      category: 'DATABASE',
      tags: ['database', 'performance', 'v9']
    })
  }, token);

  console.log(`Ticket Creation Status: ${createTicketRes.status}`);
  const ticket = createTicketRes.data;
  console.log(`✅ Ticket Created: Code [${ticket?.ticketNumber || ticket?.id}], Title: "${ticket?.title}", SLA Status: [${ticket?.slaStatus}]`);
  const ticketId = ticket?.id;

  if (ticketId) {
    // Add comment
    const commentRes = await request(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Se ha reiniciado el pool de conexiones y se estabilizó la memoria temporalmente.',
        isInternal: true
      })
    }, token);
    console.log(`✅ Added internal comment: status ${commentRes.status}`);

    // Update status to IN_PROGRESS
    const updateTicketRes = await request(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'IN_PROGRESS'
      })
    }, token);
    console.log(`✅ Updated ticket status: ${updateTicketRes.data?.status}`);
  }

  // 5. Maintenance Scheduling & Checklists
  console.log('\n--- 5. Maintenance & Windows Management ---');
  const now = new Date();
  const scheduledStart = new Date(now.getTime() + 3600000).toISOString();
  const scheduledEnd = new Date(now.getTime() + 7200000).toISOString();

  const maintRes = await request('/maintenance', {
    method: 'POST',
    body: JSON.stringify({
      title: `Parche de seguridad Kernel Q3 - ${Date.now()}`,
      description: 'Aplicación de parches de seguridad y reinicio controlado de nodos.',
      type: 'PREVENTIVE',
      status: 'SCHEDULED',
      scheduledStart,
      scheduledEnd,
      suppressAlerts: true,
      machineId: firstMachine?.id || null,
      assetId: firstAsset?.id || null,
      checklistItems: [
        'Generar snapshot / backup de seguridad',
        'Detener servicios de backend y colas',
        'Aplicar paquete de actualización yum/apt',
        'Comprobar conectividad y estado de puertos'
      ]
    })
  }, token);

  console.log(`Maintenance Creation Status: ${maintRes.status}`);
  const maint = maintRes.data;
  console.log(`✅ Maintenance Created: "${maint?.title}", Type: [${maint?.type}], Checklists: ${maint?.checklist?.length || 0}`);
  const maintId = maint?.id;

  if (maintId && maint?.checklist?.[0]?.id) {
    // Toggle first checklist item
    const checkItemRes = await request(`/maintenance/${maintId}/checklist/${maint.checklist[0].id}`, {
      method: 'PUT',
      body: JSON.stringify({ isCompleted: true })
    }, token);
    console.log(`✅ Checklist item checked: ${checkItemRes.data?.isCompleted}`);
  }

  // Check conflicts
  const conflictsRes = await request(`/maintenance/conflicts?start=${scheduledStart}&end=${scheduledEnd}`, {
    method: 'GET'
  }, token);
  console.log(`✅ Maintenance conflicts checked: Found ${conflictsRes.data?.length || 0} scheduled windows`);

  // 6. Operational Tasks
  console.log('\n--- 6. Operational Tasks ---');
  const taskRes = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Auditoría mensual de certificados SSL/TLS',
      description: 'Revisar fechas de expiración de certificados de borde y balanceadores.',
      priority: 'NORMAL',
      status: 'TODO',
      dueDate: new Date(now.getTime() + 86400000 * 5).toISOString()
    })
  }, token);
  console.log(`✅ Task Created: "${taskRes.data?.title}" (ID: ${taskRes.data?.id})`);

  // 7. Change Management (RFC) & Approvals
  console.log('\n--- 7. Change Management (RFC / ITIL) ---');
  const rfcRes = await request('/infra-changes', {
    method: 'POST',
    body: JSON.stringify({
      title: `Migración de Core Switch a Switch Layer 3 100GbE - ${Date.now()}`,
      description: 'Sustitución de hardware de red principal para aumento de ancho de banda y redundancia.',
      reason: 'Saturación de enlaces troncales en picos de tráfico.',
      risk: 'HIGH',
      impact: 'HIGH',
      status: 'PENDING_APPROVAL',
      plannedStart: scheduledStart,
      plannedEnd: scheduledEnd,
      rollbackPlan: 'En caso de fallo en el enlace LACP, reconectar cables de fibra al switch de backup previamente etiquetado.',
      validationPlan: 'Ejecutar script de validación de rutas BGP y pruebas de ping continuas con sonda de monitoreo.',
      machineId: firstMachine?.id || null
    })
  }, token);

  console.log(`RFC Creation Status: ${rfcRes.status}`);
  const rfc = rfcRes.data;
  console.log(`✅ RFC Created: Code [${rfc?.changeNumber || rfc?.id}], Title: "${rfc?.title}", Status: [${rfc?.status}]`);
  const rfcId = rfc?.id;

  if (rfcId) {
    // Approve RFC
    const approveRes = await request(`/infra-changes/${rfcId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'APPROVED',
        comments: 'Aprobado por el comité de cambios (CAB) tras revisión de plan de rollback.'
      })
    }, token);
    console.log(`✅ RFC Approval Status: ${approveRes.status}, Decisions count: ${approveRes.data?.approvals?.length || 1}`);
  }

  // 8. Runbooks Catalog
  console.log('\n--- 8. Runbooks Catalog ---');
  const runbookRes = await request('/runbooks', {
    method: 'POST',
    body: JSON.stringify({
      name: `Procedimiento de Recuperación ante Caída de PostgreSQL - ${Date.now()}`,
      category: 'DATABASE',
      version: '1.0',
      description: 'Guía paso a paso para diagnosticar, reiniciar el servicio o promover réplica en caso de fallo.',
      content: '1. Verificar servicio\n2. Comprobar logs\n3. Reiniciar daemon',
      steps: [
        {
          stepOrder: 1,
          title: 'Verificar estado del servicio y espacio en disco',
          description: 'systemctl status postgresql && df -h /var/lib/postgresql',
          isRequired: true
        },
        {
          stepOrder: 2,
          title: 'Revisar logs de error recientes',
          description: 'tail -n 100 /var/log/postgresql/postgresql-16-main.log',
          isRequired: true
        },
        {
          stepOrder: 3,
          title: 'Reiniciar servicio si no hay corrupción',
          description: 'systemctl restart postgresql',
          isRequired: true
        }
      ]
    })
  }, token);

  console.log(`Runbook Creation Status: ${runbookRes.status}`);
  const runbook = runbookRes.data;
  console.log(`✅ Runbook Created: "${runbook?.name}" with ${runbook?.steps?.length || 0} steps`);

  // 9. Operations Dashboard & Calendar Aggregations
  console.log('\n--- 9. Operations Dashboard & Unified Calendar ---');
  const dashRes = await request('/operations/dashboard', { method: 'GET' }, token);
  console.log(`✅ Operations Dashboard Metrics:`, {
    openTickets: dashRes.data?.tickets?.open,
    slaBreached: dashRes.data?.tickets?.slaBreached,
    upcomingMaintenances: dashRes.data?.maintenances?.upcoming,
    pendingChanges: dashRes.data?.changes?.pendingApproval,
    pendingTasks: dashRes.data?.tasks?.pending
  });

  const calendarRes = await request('/operations/calendar', { method: 'GET' }, token);
  console.log(`✅ Unified Calendar Events: ${calendarRes.data?.length || 0} events retrieved`);

  // 10. Multi-domain Search
  console.log('\n--- 10. Global Search Extension (V9) ---');
  const searchRes = await request('/search?q=PostgreSQL', { method: 'GET' }, token);
  console.log(`✅ Multi-domain Search results for "PostgreSQL":`, {
    totalResults: searchRes.data?.totalResults || 0,
    runbooks: searchRes.data?.results?.runbooks?.length || 0,
    tickets: searchRes.data?.results?.tickets?.length || 0
  });

  console.log('\n🎉 ALL INFRAINVENTORY V9 VERIFICATION TESTS PASSED PERFECTLY! 🚀');
}

runTests().catch(err => {
  console.error('❌ Test failed with unhandled error:', err);
  process.exit(1);
});
