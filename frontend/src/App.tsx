import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { SearchProvider } from './context/SearchContext.js';
import { MetricsWsProvider } from './context/MetricsWsContext.js';
import { Layout } from './components/layout/Layout.js';
import { NavigationTab } from './components/layout/Sidebar.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';

import { DashboardPage } from './pages/DashboardPage.js';
import { GraphsPage } from './pages/GraphsPage.js';
import { MachinesPage } from './pages/MachinesPage.js';
import { MachineDetailPage } from './pages/MachineDetailPage.js';
import { NetworksPage } from './pages/NetworksPage.js';
import { IPsPage } from './pages/IPsPage.js';
import { PortsPage } from './pages/PortsPage.js';
import { ServicesPage } from './pages/ServicesPage.js';
import { LocationsPage } from './pages/LocationsPage.js';
import { GroupsPage } from './pages/GroupsPage.js';
import { IpamPage } from './pages/IpamPage.js';
import { TagsPage } from './pages/TagsPage.js';
import { TopologyPage } from './pages/TopologyPage.js';
import { AssetsPage } from './pages/AssetsPage.js';
import { OperationsPage } from './pages/OperationsPage.js';
import { MonitoringPage } from './pages/MonitoringPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { ChangesPage } from './pages/ChangesPage.js';
import { DiscoveryPage } from './pages/DiscoveryPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AboutPage } from './pages/AboutPage.js';
import { AiAssistantPage } from './pages/AiAssistantPage.js';
import { AutomationPage } from './pages/AutomationPage.js';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isAddMachineTriggered, setIsAddMachineTriggered] = useState(false);

  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    setSelectedMachineId(null);
  };

  const handleOpenMachineDetail = (id: string) => {
    setSelectedMachineId(id);
  };

  const handleBackToMachines = () => {
    setSelectedMachineId(null);
  };

  const handleOpenAddMachine = () => {
    setSelectedMachineId(null);
    setCurrentTab('machines');
    setIsAddMachineTriggered(true);
  };

  const getBreadcrumbs = () => {
    if (selectedMachineId) {
      return ['Inventario de Máquinas', 'Ficha Técnica de Host'];
    }
    return undefined;
  };

  return (
    <ProtectedRoute>
      <Layout
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
        breadcrumbs={getBreadcrumbs()}
      >
        {selectedMachineId ? (
          <MachineDetailPage machineId={selectedMachineId} onBack={handleBackToMachines} />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigateToMachines={() => handleSelectTab('machines')}
                onNavigateToMachineDetail={handleOpenMachineDetail}
                onNavigateToChanges={() => handleSelectTab('changes')}
                onNavigateToDiscovery={() => handleSelectTab('discovery')}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
                onNavigateToGroups={() => handleSelectTab('groups')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToIPs={() => handleSelectTab('ips')}
                onNavigateToIpam={() => handleSelectTab('ipam')}
                onNavigateToTags={() => handleSelectTab('tags')}
                onNavigateToLocations={() => handleSelectTab('locations')}
                onNavigateToTopology={() => handleSelectTab('topology')}
                onNavigateToAssets={() => handleSelectTab('assets')}
                onOpenAddMachine={handleOpenAddMachine}
              />
            )}

            {/* ⚡ Automatización & Workflows */}
            {(currentTab === 'automation' || currentTab === 'automation-dashboard') && (
              <AutomationPage
                initialTab="dashboard"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-workflows' && (
              <AutomationPage
                initialTab="workflows"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-runs' && (
              <AutomationPage
                initialTab="runs"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-actions' && (
              <AutomationPage
                initialTab="actions"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-approvals' && (
              <AutomationPage
                initialTab="approvals"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-agents' && (
              <AutomationPage
                initialTab="agents"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}
            {currentTab === 'automation-policies' && (
              <AutomationPage
                initialTab="policies"
                onNavigateToMachine={handleOpenMachineDetail}
              />
            )}

            {/* 🤖 InfraInventory AI */}
            {(currentTab === 'ai' || currentTab === 'ai-assistant') && (
              <AiAssistantPage
                initialTab="chat"
                onNavigateToMachine={handleOpenMachineDetail}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToTickets={() => handleSelectTab('tickets')}
              />
            )}
            {currentTab === 'ai-diagnostics' && (
              <AiAssistantPage
                initialTab="diagnostics"
                onNavigateToMachine={handleOpenMachineDetail}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToTickets={() => handleSelectTab('tickets')}
              />
            )}
            {currentTab === 'ai-reports' && (
              <AiAssistantPage
                initialTab="reports"
                onNavigateToMachine={handleOpenMachineDetail}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToTickets={() => handleSelectTab('tickets')}
              />
            )}
            {currentTab === 'ai-dashboard' && (
              <AiAssistantPage
                initialTab="dashboard"
                onNavigateToMachine={handleOpenMachineDetail}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToTickets={() => handleSelectTab('tickets')}
              />
            )}
            {currentTab === 'ai-settings' && (
              <AiAssistantPage
                initialTab="settings"
                onNavigateToMachine={handleOpenMachineDetail}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToTickets={() => handleSelectTab('tickets')}
              />
            )}

            {/* 📦 Inventario & IPAM */}
            {currentTab === 'machines' && (
              <MachinesPage
                onSelectMachine={handleOpenMachineDetail}
                isAddModalOpenInitially={isAddMachineTriggered}
                onCloseAddModal={() => setIsAddMachineTriggered(false)}
              />
            )}
            {currentTab === 'networks' && <NetworksPage />}
            {currentTab === 'ipam' && (
              <IpamPage
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToVlans={() => handleSelectTab('ipam-vlans')}
                onNavigateToLocations={() => handleSelectTab('locations')}
              />
            )}
            {currentTab === 'ipam-vlans' && <NetworksPage />}
            {currentTab === 'ips' && <IPsPage onSelectMachine={handleOpenMachineDetail} />}
            {currentTab === 'ports' && <PortsPage />}
            {currentTab === 'services' && <ServicesPage />}
            {currentTab === 'locations' && <LocationsPage onSelectMachine={handleOpenMachineDetail} />}
            {currentTab === 'tags' && <TagsPage onSelectMachine={handleOpenMachineDetail} />}
            {currentTab === 'topology' && (
              <TopologyPage
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToIpam={() => handleSelectTab('ipam')}
                onNavigateToMonitoring={() => handleSelectTab('monitoring-status')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
              />
            )}

            {/* 🏢 Activos IT */}
            {currentTab === 'assets' && (
              <AssetsPage initialSubTab="dashboard" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-dashboard' && (
              <AssetsPage initialSubTab="dashboard" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-inventory' && (
              <AssetsPage initialSubTab="inventory" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-warranties' && (
              <AssetsPage initialSubTab="warranties" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-licenses' && (
              <AssetsPage initialSubTab="licenses" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-suppliers' && (
              <AssetsPage initialSubTab="suppliers" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-purchases' && (
              <AssetsPage initialSubTab="purchases" onSelectMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'assets-racks' && (
              <AssetsPage initialSubTab="racks" onSelectMachine={handleOpenMachineDetail} />
            )}

            {/* 🛠️ Gestión Operativa & Service Desk */}
            {(currentTab === 'operations' || currentTab === 'operations-dashboard') && (
              <OperationsPage initialTab="operations-dashboard" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'tickets' && (
              <OperationsPage initialTab="tickets" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'maintenance' && (
              <OperationsPage initialTab="maintenance" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'infra-changes' && (
              <OperationsPage initialTab="changes" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'tasks' && (
              <OperationsPage initialTab="tasks" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'slas' && (
              <OperationsPage initialTab="slas" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'runbooks' && (
              <OperationsPage initialTab="runbooks" onNavigateToMachine={handleOpenMachineDetail} />
            )}
            {currentTab === 'calendar' && (
              <OperationsPage initialTab="calendar" onNavigateToMachine={handleOpenMachineDetail} />
            )}

            {/* 🗂️ Grupos */}
            {currentTab === 'groups' && (
              <GroupsPage
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
              />
            )}

            {/* 📡 Discovery */}
            {currentTab === 'discovery' && <DiscoveryPage />}

            {/* 📊 Monitorización */}
            {currentTab === 'monitoring-status' && (
              <MonitoringPage
                initialSubTab="status"
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
              />
            )}
            {currentTab === 'monitoring-ports' && (
              <MonitoringPage
                initialSubTab="ports"
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
              />
            )}
            {currentTab === 'monitoring-services' && (
              <MonitoringPage
                initialSubTab="services"
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
              />
            )}
            {currentTab === 'monitoring-problems' && (
              <MonitoringPage
                initialSubTab="problems"
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
                onNavigateToAlerts={() => handleSelectTab('alerts')}
              />
            )}

            {/* 📈 Gráficos */}
            {currentTab === 'graphs' && <GraphsPage />}

            {/* 🔄 Cambios */}
            {currentTab === 'changes' && <ChangesPage />}

            {/* 🔔 Alertas */}
            {currentTab === 'alerts' && (
              <AlertsPage
                onSelectMachine={handleOpenMachineDetail}
                onNavigateToGraphs={() => handleSelectTab('graphs')}
              />
            )}

            {/* 👥 Usuarios, Perfil, Configuración & Acerca de */}
            {currentTab === 'users' && <UsersPage />}
            {currentTab === 'profile' && <ProfilePage />}
            {currentTab === 'settings' && <SettingsPage />}
            {currentTab === 'about' && (
              <AboutPage
                onNavigateToDashboard={() => handleSelectTab('dashboard')}
                onNavigateToSettings={() => handleSelectTab('settings')}
              />
            )}
          </>
        )}
      </Layout>
    </ProtectedRoute>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SearchProvider>
          <MetricsWsProvider>
            <AppContent />
          </MetricsWsProvider>
        </SearchProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
