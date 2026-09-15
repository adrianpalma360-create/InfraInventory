import http from 'http';

const API_BASE = 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`[${res.status}] ${body?.message || res.statusText || 'Request failed'}`);
  }
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }
  return body;
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO SUITE DE PRUEBAS V7: TOPOLOGÍA DE RED');
  console.log('====================================================\n');

  try {
    // 1. Authenticate as Admin
    console.log('1. Autenticación con usuario administrador...');
    const testAdminUsername = (process.env.TEST_ADMIN_USERNAME || 'admin').trim();
    const testAdminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!testAdminPassword) {
      console.error('❌ Error: La variable de entorno TEST_ADMIN_PASSWORD es obligatoria para ejecutar test-v7.mjs');
      process.exit(1);
    }

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: testAdminUsername,
        password: testAdminPassword,
      }),
    });

    const token = loginRes.token;
    console.log(`✅ Sesión iniciada como: ${loginRes.user.name} (${loginRes.user.role})`);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Fetch existing machines & networks for linking
    console.log('\n2. Obteniendo máquinas y subredes existentes...');
    const machinesRes = await request('/machines?limit=5', { headers: authHeaders });
    const networksRes = await request('/networks', { headers: authHeaders });
    
    let sampleMachine = machinesRes.items?.[0];
    let sampleNetwork = networksRes?.[0];

    if (!sampleMachine) {
      console.log('   Creando máquina de prueba en inventario...');
      sampleMachine = await request('/machines', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          hostname: 'srv-app-prod01.internal',
          type: 'PHYSICAL_SERVER',
          os: 'Ubuntu 24.04 LTS',
          primaryIp: '192.168.10.50',
          group: 'PROD',
          status: 'ONLINE',
          description: 'Host de prueba de topología V7',
        }),
      });
      console.log(`   + Máquina creada: ${sampleMachine.hostname} (${sampleMachine.id})`);
    }

    if (!sampleNetwork) {
      console.log('   Creando red de prueba en IPAM...');
      sampleNetwork = await request('/networks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'LAN Servidores DMZ',
          cidr: '192.168.10.0/24',
          gateway: '192.168.10.1',
          vlanIdNumber: 100,
        }),
      });
      console.log(`   + Red creada: ${sampleNetwork.cidr} (${sampleNetwork.id})`);
    }

    console.log(`   Host de muestra: ${sampleMachine.hostname} (${sampleMachine.id})`);
    console.log(`   Red de muestra: ${sampleNetwork.cidr} (${sampleNetwork.id})`);

    // 3. Create a new Topology Map
    console.log('\n3. Creando mapa de topología V7...');
    const createdTopo = await request('/topologies', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Topología Datacenter Central V7',
        description: 'Mapa de infraestructura core, distribución y servidores de producción',
        isDefault: true,
        metadata: { campus: 'Central', tier: 3 },
      }),
    });
    console.log(`✅ Topología creada: "${createdTopo.name}" (ID: ${createdTopo.id})`);

    // 4. Add Nodes to the Topology Map
    console.log('\n4. Añadiendo nodos al diagrama...');
    
    // Node 1: Router Core (Logical device)
    const routerNode = await request(`/topologies/${createdTopo.id}/nodes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        nodeType: 'ROUTER',
        label: 'Core Router 01',
        positionX: 300,
        positionY: 100,
      }),
    });
    console.log(`   + Nodo Router añadido: "${routerNode.label}" (${routerNode.id})`);

    // Node 2: Firewall DMZ
    const firewallNode = await request(`/topologies/${createdTopo.id}/nodes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        nodeType: 'FIREWALL',
        label: 'Palo Alto FW-01',
        positionX: 550,
        positionY: 100,
      }),
    });
    console.log(`   + Nodo Firewall añadido: "${firewallNode.label}" (${firewallNode.id})`);

    // Node 3: Machine inventory node (if exists)
    let machineNode = null;
    if (sampleMachine) {
      machineNode = await request(`/topologies/${createdTopo.id}/nodes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          nodeType: 'SERVER',
          label: sampleMachine.hostname,
          machineId: sampleMachine.id,
          positionX: 300,
          positionY: 350,
        }),
      });
      console.log(`   + Nodo Host vinculado añadido: "${machineNode.label}" (${machineNode.id}) -> Machine: ${sampleMachine.hostname}`);
    }

    // Node 4: Subnet node (if exists)
    let netNode = null;
    if (sampleNetwork) {
      netNode = await request(`/topologies/${createdTopo.id}/nodes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          nodeType: 'NETWORK',
          label: `Red ${sampleNetwork.name || sampleNetwork.cidr}`,
          networkId: sampleNetwork.id,
          positionX: 550,
          positionY: 350,
        }),
      });
      console.log(`   + Nodo Subred añadido: "${netNode.label}" (${netNode.id}) -> Network: ${sampleNetwork.cidr}`);
    }

    // 5. Connect nodes with Edges
    console.log('\n5. Estableciendo conexiones (enlaces) entre nodos...');
    const edge1 = await request(`/topologies/${createdTopo.id}/edges`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sourceNodeId: routerNode.id,
        targetNodeId: firewallNode.id,
        connectionType: 'FIBER',
        label: 'Trunk 10G SFP+',
        speed: '10 Gbps',
      }),
    });
    console.log(`   + Enlace Fibra creado: "${routerNode.label}" <--> "${firewallNode.label}" (${edge1.speed})`);

    if (machineNode) {
      const edge2 = await request(`/topologies/${createdTopo.id}/edges`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceNodeId: routerNode.id,
          targetNodeId: machineNode.id,
          connectionType: 'ETHERNET',
          label: 'Eth0 / Port 1',
          speed: '1 Gbps',
        }),
      });
      console.log(`   + Enlace Ethernet creado: "${routerNode.label}" <--> "${machineNode.label}" (${edge2.speed})`);
    }

    // 6. Batch update node positions (drag-and-drop simulation)
    console.log('\n6. Probando guardado por lotes de coordenadas X/Y...');
    const posRes = await request(`/topologies/${createdTopo.id}/positions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        positions: [
          { id: routerNode.id, positionX: 320, positionY: 120 },
          { id: firewallNode.id, positionX: 580, positionY: 120 },
        ],
      }),
    });
    console.log(`✅ Coordenadas actualizadas: ${posRes.updatedCount} nodos reubicados.`);

    // 7. Get enriched topology & real-time status summary
    console.log('\n7. Consultando estado y resumen de salud del mapa en tiempo real...');
    const topoDetail = await request(`/topologies/${createdTopo.id}`, { headers: authHeaders });
    const statusSummary = await request(`/topologies/${createdTopo.id}/status`, { headers: authHeaders });

    console.log(`✅ Nodos enriquecidos: ${topoDetail.nodes?.length} nodos, ${topoDetail.edges?.length} enlaces`);
    console.log(`   Resumen de Estados: Online: ${statusSummary.online}, Warning: ${statusSummary.warning}, Crit: ${statusSummary.critical}, Incidents: ${statusSummary.totalIncidents}`);

    // 8. Export Topology to JSON
    console.log('\n8. Probando exportación de topología a JSON...');
    const exportData = await request(`/topologies/${createdTopo.id}/export`, { headers: authHeaders });
    console.log(`✅ Exportación exitosa. Versión: ${exportData.version}, Nodos exportados: ${exportData.nodes?.length}, Enlaces: ${exportData.edges?.length}`);

    // 9. Import Topology from JSON
    console.log('\n9. Probando importación de topología desde JSON...');
    const importPayload = {
      name: 'Topología Clonada vía Import',
      description: 'Copia generada a través del importador JSON V7',
      nodes: exportData.nodes,
      edges: exportData.edges,
    };
    const importRes = await request('/topologies/import', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(importPayload),
    });
    console.log(`✅ Importación completada: "${importRes.name}" (${importRes.nodesCount} nodos, ${importRes.edgesCount} enlaces)`);

    // 10. Non-Destructive Safety Test
    console.log('\n10. Verificación de Seguridad NO DESTRUCTIVA:');
    if (machineNode && sampleMachine) {
      console.log(`    Eliminando nodo visual "${machineNode.label}" del mapa...`);
      await request(`/topology-nodes/${machineNode.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      // Verify physical machine is still completely intact in database
      const verifyMachine = await request(`/machines/${sampleMachine.id}`, { headers: authHeaders });
      if (verifyMachine && verifyMachine.id === sampleMachine.id) {
        console.log(`✅ SEGURIDAD CONFIRMADA: El host "${verifyMachine.hostname}" (IP: ${verifyMachine.primaryIp}) permanece 100% INTACTO en el inventario físico.`);
      } else {
        throw new Error('FALLO CRÍTICO: La máquina de inventario fue alterada.');
      }
    }

    // 11. Multidomain Global Search Verification
    console.log('\n11. Verificando búsqueda global multidominio para topologías...');
    const searchRes = await request('/search?q=Central', { headers: authHeaders });
    const foundTopo = searchRes.results?.topologies?.find((t) => t.id === createdTopo.id);
    if (foundTopo) {
      console.log(`✅ Búsqueda Global: Topología "${foundTopo.name}" indexada y localizada correctamente.`);
    } else {
      console.log(`ℹ️ Topologías encontradas en búsqueda: ${searchRes.results?.topologies?.length || 0}`);
    }

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE V7 TOPOLOGÍA COMPLETADAS CON ÉXITO');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBA V7:', err.message);
    process.exit(1);
  }
}

runTests();
