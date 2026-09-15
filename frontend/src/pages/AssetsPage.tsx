import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Asset,
  AssetType,
  AssetStatus,
  AssetStats,
  HardwareComponentType,
  DiskHealthStatus,
  Warranty,
  WarrantyType,
  License,
  LicenseType,
  Supplier,
  Purchase,
  Location,
  Machine,
  RackView,
} from '../types/index.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../context/ToastContext.js';
import { Can } from '../context/AuthContext.js';
import {
  Laptop,
  ShieldCheck,
  Key,
  Building2,
  ShoppingCart,
  Layers,
  Plus,
  Search,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Cpu,
  HardDrive,
  AlertTriangle,
  Clock,
  DollarSign,
  UserCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export type AssetsSubTab =
  | 'dashboard'
  | 'inventory'
  | 'warranties'
  | 'licenses'
  | 'suppliers'
  | 'purchases'
  | 'racks';

interface AssetsPageProps {
  initialSubTab?: AssetsSubTab;
  onSelectMachine?: (id: string) => void;
  onNavigateToLocations?: () => void;
}

export const AssetsPage: React.FC<AssetsPageProps> = ({
  initialSubTab = 'dashboard',
  onSelectMachine,
  onNavigateToLocations: _onNavigateToLocations,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AssetsSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);

  const [formAssetTag, setFormAssetTag] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AssetType>('SERVER');
  const [formStatus, setFormStatus] = useState<AssetStatus>('IN_USE');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formAssignedUser, setFormAssignedUser] = useState('');
  const [formAssignedDepartment, setFormAssignedDepartment] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formRackUnit, setFormRackUnit] = useState<string>('');
  const [formRackHeightU, setFormRackHeightU] = useState('1');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formMachineId, setFormMachineId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);

  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [hwType, setHwType] = useState<HardwareComponentType>('CPU');
  const [hwModel, setHwModel] = useState('');
  const [hwManufacturer, setHwManufacturer] = useState('');
  const [hwCapacity, setHwCapacity] = useState('');
  const [hwSlot, setHwSlot] = useState('');
  const [hwDiskHealth, setHwDiskHealth] = useState<DiskHealthStatus>('GOOD');
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supWebsite, setSupWebsite] = useState('');
  const [isSubmittingSup, setIsSubmittingSup] = useState(false);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purOrderNumber, setPurOrderNumber] = useState('');
  const [purDate, setPurDate] = useState(new Date().toISOString().split('T')[0]);
  const [purSupplierId, setPurSupplierId] = useState('');
  const [purInvoiceNumber, setPurInvoiceNumber] = useState('');
  const [purTotalCost, setPurTotalCost] = useState('');
  const [purStatus, setPurStatus] = useState('COMPLETED');
  const [purNotes, setPurNotes] = useState('');
  const [isSubmittingPur, setIsSubmittingPur] = useState(false);

  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [warAssetId, setWarAssetId] = useState('');
  const [warSupplierId, setWarSupplierId] = useState('');
  const [warType, setWarType] = useState<WarrantyType>('MANUFACTURER');
  const [warProvider, setWarProvider] = useState('');
  const [warContractNumber, setWarContractNumber] = useState('');
  const [warStartDate, setWarStartDate] = useState('');
  const [warEndDate, setWarEndDate] = useState('');
  const [warSupportTier, setWarSupportTier] = useState('');
  const [warNotes, setWarNotes] = useState('');
  const [isSubmittingWar, setIsSubmittingWar] = useState(false);

  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [licName, setLicName] = useState('');
  const [licPublisher, setLicPublisher] = useState('');
  const [licVersion, setLicVersion] = useState('');
  const [licType, setLicType] = useState<LicenseType>('PERPETUAL');
  const [licKey, setLicKey] = useState('');
  const [licTotalSeats, setLicTotalSeats] = useState('1');
  const [licIsUnlimited, setLicIsUnlimited] = useState(false);
  const [licExpirationDate, setLicExpirationDate] = useState('');
  const [licCost, setLicCost] = useState('');
  const [licSupplierId, setLicSupplierId] = useState('');
  const [isSubmittingLic, setIsSubmittingLic] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLicenseForAssign, setSelectedLicenseForAssign] = useState<License | null>(null);
  const [assignUser, setAssignUser] = useState('');
  const [assignMachineId, setAssignMachineId] = useState('');
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [revealingLicId, setRevealingLicId] = useState<string | null>(null);

  const [selectedRackLocationId, setSelectedRackLocationId] = useState<string>('');
  const [rackViewData, setRackViewData] = useState<RackView | null>(null);
  const [isLoadingRack, setIsLoadingRack] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        statsData,
        assetsData,
        warrantiesData,
        licensesData,
        suppliersData,
        purchasesData,
        locationsData,
        machinesData,
      ] = await Promise.all([
        api.getAssetStats().catch(() => null),
        api.getAssets({ limit: 100 }).catch(() => ({ items: [] })),
        api.getWarranties({ limit: 100 }).catch(() => ({ items: [] })),
        api.getLicenses({ limit: 100 }).catch(() => ({ items: [] })),
        api.getSuppliers({ limit: 100 }).catch(() => ({ items: [] })),
        api.getPurchases({ limit: 100 }).catch(() => ({ items: [] })),
        api.getLocations().catch(() => []),
        api.getMachines({ limit: 200 }).catch(() => ({ items: [] })),
      ]);

      setStats(statsData);
      setAssets(assetsData.items || []);
      setWarranties(warrantiesData.items || []);
      setLicenses(licensesData.items || []);
      setSuppliers(suppliersData.items || []);
      setPurchases(purchasesData.items || []);
      setLocations(locationsData || []);
      setMachines(machinesData.items || []);

      const rackLoc = (locationsData || []).find((l: Location) => l.type === 'RACK' || l.rack);
      if (rackLoc && !selectedRackLocationId) {
        setSelectedRackLocationId(rackLoc.id);
      }
    } catch (err: any) {
      toast.error('Error al cargar datos de activos IT', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'racks' && selectedRackLocationId) {
      loadRackView(selectedRackLocationId);
    }
  }, [activeTab, selectedRackLocationId]);

  const loadRackView = async (locId: string) => {
    setIsLoadingRack(true);
    try {
      const data = await api.getRackView(locId);
      setRackViewData(data);
    } catch (err: any) {
      toast.error('Error al cargar elevación de rack', err.message);
    } finally {
      setIsLoadingRack(false);
    }
  };

  const handleOpenCreateAsset = () => {
    setEditingAsset(null);
    setFormAssetTag(`AST-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormType('SERVER');
    setFormStatus('IN_USE');
    setFormManufacturer('');
    setFormModel('');
    setFormSerialNumber('');
    setFormAssignedUser('');
    setFormAssignedDepartment('');
    setFormLocationId('');
    setFormRackUnit('');
    setFormRackHeightU('1');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormPurchaseCost('');
    setFormSupplierId('');
    setFormMachineId('');
    setFormNotes('');
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setFormAssetTag(asset.assetTag);
    setFormName(asset.name);
    setFormType(asset.type);
    setFormStatus(asset.status);
    setFormManufacturer(asset.manufacturer || '');
    setFormModel(asset.model || '');
    setFormSerialNumber(asset.serialNumber || '');
    setFormAssignedUser(asset.assignedUser || '');
    setFormAssignedDepartment(asset.assignedDepartment || '');
    setFormLocationId(asset.locationId || '');
    setFormRackUnit(asset.rackUnit ? String(asset.rackUnit) : '');
    setFormRackHeightU(asset.rackHeightU ? String(asset.rackHeightU) : '1');
    setFormPurchaseDate(asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '');
    setFormPurchaseCost(asset.purchaseCost !== null && asset.purchaseCost !== undefined ? String(asset.purchaseCost) : '');
    setFormSupplierId(asset.supplierId || '');
    setFormMachineId(asset.machineId || '');
    setFormNotes(asset.notes || '');
    setIsAssetModalOpen(true);
  };

  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetTag.trim() || !formName.trim()) {
      toast.error('Campos requeridos', 'Etiqueta de Activo y Nombre son obligatorios');
      return;
    }

    setIsSubmittingAsset(true);
    try {
      const payload: Partial<Asset> = {
        assetTag: formAssetTag.trim(),
        name: formName.trim(),
        type: formType,
        status: formStatus,
        manufacturer: formManufacturer.trim() || null,
        model: formModel.trim() || null,
        serialNumber: formSerialNumber.trim() || null,
        assignedUser: formAssignedUser.trim() || null,
        assignedDepartment: formAssignedDepartment.trim() || null,
        locationId: formLocationId || null,
        rackUnit: formRackUnit ? parseInt(formRackUnit, 10) : null,
        rackHeightU: formRackHeightU ? parseInt(formRackHeightU, 10) : 1,
        purchaseDate: formPurchaseDate ? new Date(formPurchaseDate).toISOString() : null,
        purchaseCost: formPurchaseCost ? parseFloat(formPurchaseCost) : null,
        supplierId: formSupplierId || null,
        machineId: formMachineId || null,
        notes: formNotes.trim() || null,
      };

      if (editingAsset) {
        await api.updateAsset(editingAsset.id, payload);
        toast.success('Activo actualizado', `El activo ${formAssetTag} se ha guardado.`);
      } else {
        await api.createAsset(payload);
        toast.success('Activo registrado', `El activo ${formAssetTag} fue creado.`);
      }
      setIsAssetModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar activo', err.message);
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const handleOpenAddHardware = (asset: Asset) => {
    setSelectedAssetDetail(asset);
    setHwType('CPU');
    setHwModel('');
    setHwManufacturer('');
    setHwCapacity('');
    setHwSlot('');
    setHwDiskHealth('GOOD');
    setIsHardwareModalOpen(true);
  };

  const handleAddHardwareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetDetail) return;
    setIsSubmittingHw(true);
    try {
      await api.addAssetHardware(selectedAssetDetail.id, {
        type: hwType,
        model: hwModel.trim() || null,
        manufacturer: hwManufacturer.trim() || null,
        capacity: hwCapacity.trim() || null,
        slot: hwSlot.trim() || null,
        diskHealth: hwType === 'DISK' ? hwDiskHealth : null,
      });
      toast.success('Componente añadido', `Se agregó componente ${hwType} al activo.`);
      setIsHardwareModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al añadir componente', err.message);
    } finally {
      setIsSubmittingHw(false);
    }
  };

  const handleDeleteHardware = async (assetId: string, hwId: string) => {
    try {
      await api.deleteAssetHardware(assetId, hwId);
      toast.success('Componente eliminado', 'El hardware se ha retirado del activo.');
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar componente', err.message);
    }
  };

  const handleRevealLicenseKey = async (licId: string) => {
    setRevealingLicId(licId);
    try {
      const res = await api.revealLicenseKey(licId);
      setRevealedKeys((prev) => ({ ...prev, [licId]: res.licenseKey }));
      toast.success('Clave revelada', 'Clave de licencia descifrada y mostrada temporalmente.');
    } catch (err: any) {
      toast.error('Acceso denegado', err.message || 'No tienes permisos para ver la clave');
    } finally {
      setRevealingLicId(null);
    }
  };

  const handleOpenAssignModal = (license: License) => {
    setSelectedLicenseForAssign(license);
    setAssignUser('');
    setAssignMachineId('');
    setAssignAssetId('');
    setAssignNotes('');
    setIsAssignModalOpen(true);
  };

  const handleAssignSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseForAssign) return;
    setIsSubmittingAssign(true);
    try {
      await api.assignLicenseSeat(selectedLicenseForAssign.id, {
        assignedUser: assignUser.trim() || undefined,
        machineId: assignMachineId || undefined,
        assetId: assignAssetId || undefined,
        notes: assignNotes.trim() || undefined,
      });
      toast.success('Puesto asignado', `Licencia asignada exitosamente.`);
      setIsAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al asignar puesto', err.message);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveSeat = async (licenseId: string, assignmentId: string) => {
    try {
      await api.removeLicenseSeat(licenseId, assignmentId);
      toast.success('Puesto liberado', 'La asignación de licencia se ha revocado.');
      loadData();
    } catch (err: any) {
      toast.error('Error al revocar puesto', err.message);
    }
  };

  const handleOpenCreateSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupContact('');
    setSupEmail('');
    setSupPhone('');
    setSupWebsite('');
    setIsSupplierModalOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    setIsSubmittingSup(true);
    try {
      const payload = {
        name: supName.trim(),
        contactName: supContact.trim() || null,
        email: supEmail.trim() || null,
        phone: supPhone.trim() || null,
        website: supWebsite.trim() || null,
      };
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, payload);
        toast.success('Proveedor actualizado', `Proveedor ${supName} modificado.`);
      } else {
        await api.createSupplier(payload);
        toast.success('Proveedor registrado', `Proveedor ${supName} agregado.`);
      }
      setIsSupplierModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar proveedor', err.message);
    } finally {
      setIsSubmittingSup(false);
    }
  };

  const handleOpenCreatePurchase = () => {
    setEditingPurchase(null);
    setPurOrderNumber(`PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setPurDate(new Date().toISOString().split('T')[0]);
    setPurSupplierId('');
    setPurInvoiceNumber('');
    setPurTotalCost('');
    setPurStatus('COMPLETED');
    setPurNotes('');
    setIsPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purOrderNumber.trim()) return;
    setIsSubmittingPur(true);
    try {
      const payload = {
        orderNumber: purOrderNumber.trim(),
        purchaseDate: new Date(purDate).toISOString(),
        supplierId: purSupplierId || null,
        invoiceNumber: purInvoiceNumber.trim() || null,
        totalCost: purTotalCost ? parseFloat(purTotalCost) : 0,
        currency: 'EUR',
        status: purStatus,
        notes: purNotes.trim() || null,
      };
      if (editingPurchase) {
        await api.updatePurchase(editingPurchase.id, payload);
        toast.success('Compra actualizada', `Orden ${purOrderNumber} actualizada.`);
      } else {
        await api.createPurchase(payload);
        toast.success('Compra registrada', `Orden ${purOrderNumber} guardada.`);
      }
      setIsPurchaseModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar compra', err.message);
    } finally {
      setIsSubmittingPur(false);
    }
  };

  const handleOpenCreateWarranty = () => {
    setEditingWarranty(null);
    setWarAssetId('');
    setWarSupplierId('');
    setWarType('MANUFACTURER');
    setWarProvider('');
    setWarContractNumber('');
    const now = new Date();
    setWarStartDate(now.toISOString().split('T')[0]);
    const nextYear = new Date(now);
    nextYear.setFullYear(now.getFullYear() + 3);
    setWarEndDate(nextYear.toISOString().split('T')[0]);
    setWarSupportTier('24x7 4h Response');
    setWarNotes('');
    setIsWarrantyModalOpen(true);
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warProvider.trim() || !warStartDate || !warEndDate) return;
    setIsSubmittingWar(true);
    try {
      const payload = {
        assetId: warAssetId || null,
        supplierId: warSupplierId || null,
        warrantyType: warType,
        provider: warProvider.trim(),
        contractNumber: warContractNumber.trim() || null,
        startDate: new Date(warStartDate).toISOString(),
        endDate: new Date(warEndDate).toISOString(),
        supportTier: warSupportTier.trim() || null,
        notes: warNotes.trim() || null,
      };
      if (editingWarranty) {
        await api.updateWarranty(editingWarranty.id, payload);
        toast.success('Garantía actualizada', `Contrato ${warContractNumber} guardado.`);
      } else {
        await api.createWarranty(payload);
        toast.success('Garantía registrada', `Garantía de ${warProvider} registrada.`);
      }
      setIsWarrantyModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar garantía', err.message);
    } finally {
      setIsSubmittingWar(false);
    }
  };

  const handleOpenCreateLicense = () => {
    setEditingLicense(null);
    setLicName('');
    setLicPublisher('');
    setLicVersion('');
    setLicType('SUBSCRIPTION');
    setLicKey('');
    setLicTotalSeats('10');
    setLicIsUnlimited(false);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setLicExpirationDate(nextYear.toISOString().split('T')[0]);
    setLicCost('');
    setLicSupplierId('');
    setIsLicenseModalOpen(true);
  };

  const handleSubmitLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licName.trim() || !licPublisher.trim()) return;
    setIsSubmittingLic(true);
    try {
      const payload = {
        name: licName.trim(),
        publisher: licPublisher.trim(),
        version: licVersion.trim() || null,
        licenseType: licType,
        licenseKey: licKey.trim() || null,
        totalSeats: licIsUnlimited ? 0 : parseInt(licTotalSeats, 10) || 1,
        isUnlimited: licIsUnlimited,
        expirationDate: licExpirationDate ? new Date(licExpirationDate).toISOString() : null,
        cost: licCost ? parseFloat(licCost) : null,
        currency: 'EUR',
        supplierId: licSupplierId || null,
      };
      if (editingLicense) {
        await api.updateLicense(editingLicense.id, payload);
        toast.success('Licencia actualizada', `Licencia ${licName} guardada.`);
      } else {
        await api.createLicense(payload);
        toast.success('Licencia creada', `Licencia ${licName} registrada.`);
      }
      setIsLicenseModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Error al guardar licencia', err.message);
    } finally {
      setIsSubmittingLic(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'asset') {
        await api.deleteAsset(deleteTarget.id);
        toast.success('Activo eliminado', `Activo ${deleteTarget.name} eliminado.`);
      } else if (deleteTarget.type === 'warranty') {
        await api.deleteWarranty(deleteTarget.id);
        toast.success('Garantía eliminada', 'Garantía eliminada del inventario.');
      } else if (deleteTarget.type === 'license') {
        await api.deleteLicense(deleteTarget.id);
        toast.success('Licencia eliminada', 'Licencia eliminada.');
      } else if (deleteTarget.type === 'supplier') {
        await api.deleteSupplier(deleteTarget.id);
        toast.success('Proveedor eliminado', 'Proveedor eliminado.');
      } else if (deleteTarget.type === 'purchase') {
        await api.deletePurchase(deleteTarget.id);
        toast.success('Compra eliminada', 'Registro de compra eliminado.');
      }
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al eliminar', err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportAssetsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `InfraInventory_Assets_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exportación completa', 'Archivo CSV de inventario descargado.');
    } catch (err: any) {
      toast.error('Error al exportar CSV', err.message);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      toast.error('Contenido vacío', 'Pega el texto CSV a importar.');
      return;
    }
    setIsImporting(true);
    try {
      const res = await api.importAssetsCsv(csvContent);
      toast.success(
        'Importación finalizada',
        `Se importaron ${res.count} activos. ${res.errorsCount > 0 ? `Errores: ${res.errorsCount}` : ''}`
      );
      setIsImportModalOpen(false);
      setCsvContent('');
      loadData();
    } catch (err: any) {
      toast.error('Error en la importación CSV', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredAssets = assets.filter((ast) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        ast.assetTag.toLowerCase().includes(q) ||
        ast.name.toLowerCase().includes(q) ||
        (ast.manufacturer && ast.manufacturer.toLowerCase().includes(q)) ||
        (ast.model && ast.model.toLowerCase().includes(q)) ||
        (ast.serialNumber && ast.serialNumber.toLowerCase().includes(q)) ||
        (ast.assignedUser && ast.assignedUser.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (typeFilter && ast.type !== typeFilter) return false;
    if (statusFilter && ast.status !== statusFilter) return false;
    if (locationFilter && ast.locationId !== locationFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0F141B] p-5 rounded-xl border border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30 font-mono uppercase">
              Activos IT & Hardware
            </span>
            <span className="text-xs text-[#64748B] font-mono">InfraInventory NOC</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] mt-1 flex items-center gap-2">
            <Laptop className="w-6 h-6 text-[#06B6D4]" />
            Gestión de Activos IT & Garantías
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Inventario de hardware físico, ciclo de vida, trazabilidad contable, licencias y visualización de racks 42U.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="w-3.5 h-3.5 text-[#06B6D4]" />
            Exportar CSV
          </Button>

          <Can permission="ASSET_IMPORT">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCsvContent('');
                setIsImportModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              Importar CSV
            </Button>
          </Can>

          <Can permission="ASSET_CREATE">
            <Button size="sm" onClick={handleOpenCreateAsset} className="gap-1.5 bg-[#06B6D4] hover:bg-[#06B6D4]/80 text-[#0B0F14] font-bold">
              <Plus className="w-4 h-4" />
              Nuevo Activo
            </Button>
          </Can>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#252D38] gap-1 overflow-x-auto custom-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'dashboard'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#06B6D4]" />
          <span>Dashboard & Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'inventory'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Laptop className="w-4 h-4 text-blue-400" />
          <span>Inventario de Activos ({assets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warranties')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'warranties'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Garantías ({warranties.length})</span>
          {stats?.warrantiesSummary?.expiring30Days ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
              {stats.warrantiesSummary.expiring30Days}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'licenses'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Key className="w-4 h-4 text-purple-400" />
          <span>Licencias Software ({licenses.length})</span>
          {stats?.licensesSummary?.overallocated ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-400 font-bold animate-pulse">
              {stats.licensesSummary.overallocated}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Building2 className="w-4 h-4 text-orange-400" />
          <span>Proveedores ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'purchases'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-teal-400" />
          <span>Compras & Facturas ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('racks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'racks'
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#151B23]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#151B23]/50'
          }`}
        >
          <Layers className="w-4 h-4 text-yellow-400" />
          <span>Vista de Racks (42U)</span>
        </button>
      </div>

      {/* SUB-TAB 1: DASHBOARD / ESTADÍSTICAS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#0F141B] border-[#252D38]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-medium">Total Activos IT</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] mt-2 font-mono">
                {stats?.totalAssets ?? assets.length}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
                <span>En uso: {stats?.byStatus?.IN_USE ?? 0}</span>
                <span>&bull;</span>
                <span>En stock: {stats?.byStatus?.IN_STOCK ?? 0}</span>
              </div>
            </Card>

            <Card className="p-4 bg-[#0F141B] border-[#252D38]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-medium">Inversión Total (Hardware)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.totalCost || 0)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Valor residual est.: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.totalCurrentValue || 0)}
              </div>
            </Card>

            <Card className="p-4 bg-[#0F141B] border-[#252D38]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-medium">Garantías Activas</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-[#06B6D4] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] mt-2 font-mono">
                {stats?.warrantiesSummary?.active ?? warranties.length}
              </div>
              <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{stats?.warrantiesSummary?.expiring30Days ?? 0} vencen en &lt; 30 días</span>
              </div>
            </Card>

            <Card className="p-4 bg-[#0F141B] border-[#252D38]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-medium">Licencias de Software</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#F1F5F9] mt-2 font-mono">
                {stats?.licensesSummary?.usedSeats ?? 0} / {stats?.licensesSummary?.totalSeats ?? 0}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
                <span>Puestos asignados</span>
                {stats?.licensesSummary?.overallocated ? (
                  <span className="text-red-400 font-bold">({stats.licensesSummary.overallocated} sobreasignadas!)</span>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 bg-[#0F141B] border-[#252D38]">
              <h3 className="text-sm font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#06B6D4]" />
                Distribución por Tipo de Activo
              </h3>
              <div className="space-y-3">
                {stats?.byType && Object.keys(stats.byType).length > 0 ? (
                  Object.entries(stats.byType).map(([type, count]) => {
                    const pct = Math.round((count / (stats.totalAssets || 1)) * 100);
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#94A3B8]">{type}</span>
                          <span className="text-[#F1F5F9] font-semibold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#151B23] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-[#06B6D4] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-[#64748B] py-6 text-center">No hay activos registrados todavía.</div>
                )}
              </div>
            </Card>

            <Card className="p-5 bg-[#0F141B] border-[#252D38]">
              <h3 className="text-sm font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Coste por Ubicación
              </h3>
              <div className="space-y-3">
                {stats?.byLocation && stats.byLocation.length > 0 ? (
                  stats.byLocation.map((loc) => (
                    <div key={loc.locationName} className="flex items-center justify-between p-2.5 rounded-lg bg-[#151B23]/60 border border-[#252D38]/60">
                      <div>
                        <div className="text-xs font-semibold text-[#F1F5F9]">{loc.locationName}</div>
                        <div className="text-[11px] text-[#64748B]">{loc.count} activos</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(loc.totalCost)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#64748B] py-6 text-center">Sin datos de ubicaciones.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVENTARIO DE ACTIVOS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Buscar por etiqueta (AST-XXXX), nombre, fabricante, serie, usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">Todos los tipos</option>
              <option value="SERVER">Servidor</option>
              <option value="WORKSTATION">Estación</option>
              <option value="LAPTOP">Portátil</option>
              <option value="SWITCH">Switch</option>
              <option value="ROUTER">Router</option>
              <option value="FIREWALL">Firewall</option>
              <option value="STORAGE">Almacenamiento (NAS/SAN)</option>
              <option value="UPS">UPS / SAI</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">Todos los estados</option>
              <option value="IN_USE">En uso</option>
              <option value="IN_STOCK">En stock</option>
              <option value="IN_REPAIR">En reparación</option>
              <option value="DECOMMISSIONED">Retirado</option>
              <option value="RESERVED">Reservado</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">Todas las ubicaciones</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#0F141B] rounded-xl border border-[#252D38] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#151B23] text-[#94A3B8] border-b border-[#252D38]">
                    <th className="p-3 font-semibold">Etiqueta / Activo</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold">Fabricante / Modelo</th>
                    <th className="p-3 font-semibold">Ubicación / Rack</th>
                    <th className="p-3 font-semibold">Host Técnico</th>
                    <th className="p-3 font-semibold">Hardware</th>
                    <th className="p-3 font-semibold">Coste Compra</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#06B6D4]" />
                          Cargando inventario de activos...
                        </div>
                      </td>
                    </tr>
                  ) : filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs text-[#64748B]">
                        No se encontraron activos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((ast) => (
                      <tr key={ast.id} className="hover:bg-[#151B23]/40 transition-colors">
                        <td className="p-3">
                          <div className="font-mono font-bold text-[#06B6D4]">{ast.assetTag}</div>
                          <div className="text-[#F1F5F9] font-medium">{ast.name}</div>
                          {ast.serialNumber && (
                            <div className="text-[10px] text-[#64748B] font-mono">S/N: {ast.serialNumber}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#252D38] text-[#94A3B8]">
                            {ast.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              ast.status === 'IN_USE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : ast.status === 'IN_STOCK'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : ast.status === 'IN_REPAIR'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {ast.status}
                          </span>
                        </td>
                        <td className="p-3 text-[#94A3B8]">
                          <div>{ast.manufacturer || '—'}</div>
                          <div className="text-[11px] text-[#64748B]">{ast.model || ''}</div>
                        </td>
                        <td className="p-3 text-[#94A3B8]">
                          <div>{ast.location?.name || '—'}</div>
                          {ast.rackUnit && (
                            <div className="text-[10px] font-mono text-yellow-400 font-semibold">
                              U{ast.rackUnit} ({ast.rackHeightU || 1}U)
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {ast.machine ? (
                            <button
                              onClick={() => onSelectMachine && onSelectMachine(ast.machine!.id)}
                              className="text-left font-mono text-[#06B6D4] hover:underline flex items-center gap-1"
                            >
                              <span>{ast.machine.hostname}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[#64748B] italic">No vinculado</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-[#F1F5F9]">
                              {ast.hardware?.length ?? ast._count?.hardware ?? 0} comps
                            </span>
                            <Can permission="ASSET_UPDATE">
                              <button
                                onClick={() => handleOpenAddHardware(ast)}
                                title="Añadir/ver componente de hardware"
                                className="p-1 rounded bg-[#252D38] hover:bg-[#323D4D] text-[#06B6D4]"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </Can>
                          </div>
                          {ast.hardware && ast.hardware.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ast.hardware.slice(0, 3).map((h) => (
                                <span key={h.id} className="text-[9px] px-1 rounded bg-[#151B23] text-[#94A3B8] border border-[#252D38]">
                                  {h.type} {h.capacity || ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[#F1F5F9]">
                          {ast.purchaseCost !== null && ast.purchaseCost !== undefined
                            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: ast.currency || 'EUR' }).format(ast.purchaseCost)
                            : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Can permission="ASSET_UPDATE">
                              <button
                                onClick={() => handleOpenEditAsset(ast)}
                                className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-[#06B6D4]"
                                title="Editar activo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </Can>
                            <Can permission="ASSET_DELETE">
                              <button
                                onClick={() => setDeleteTarget({ type: 'asset', id: ast.id, name: ast.assetTag })}
                                className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-red-400"
                                title="Eliminar activo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GARANTÍAS */}
      {activeTab === 'warranties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="text-xs text-[#94A3B8]">
              Control y avisos de expiración de soporte técnico del fabricante y contratos de mantenimiento.
            </div>
            <Can permission="WARRANTY_MANAGE">
              <Button size="sm" onClick={handleOpenCreateWarranty} className="gap-1.5 bg-[#06B6D4] text-[#0B0F14] font-bold">
                <Plus className="w-4 h-4" />
                Nueva Garantía
              </Button>
            </Can>
          </div>

          <div className="bg-[#0F141B] rounded-xl border border-[#252D38] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#151B23] text-[#94A3B8] border-b border-[#252D38]">
                    <th className="p-3 font-semibold">Proveedor / Contrato</th>
                    <th className="p-3 font-semibold">Activo Asociado</th>
                    <th className="p-3 font-semibold">Tipo Garantía</th>
                    <th className="p-3 font-semibold">Nivel Soporte (SLA)</th>
                    <th className="p-3 font-semibold">Fecha Inicio</th>
                    <th className="p-3 font-semibold">Fecha Vencimiento</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252D38]/60">
                  {warranties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-[#64748B]">
                        No hay contratos de garantía registrados.
                      </td>
                    </tr>
                  ) : (
                    warranties.map((war) => (
                      <tr key={war.id} className="hover:bg-[#151B23]/40 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-[#F1F5F9]">{war.provider}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">
                            {war.contractNumber || 'Sin contrato ref'}
                          </div>
                        </td>
                        <td className="p-3">
                          {war.asset ? (
                            <div>
                              <span className="font-mono text-[#06B6D4] font-bold">{war.asset.assetTag}</span>
                              <div className="text-[11px] text-[#94A3B8]">{war.asset.name}</div>
                            </div>
                          ) : (
                            <span className="text-[#64748B] italic">Garantía global</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#252D38] text-[#94A3B8]">
                            {war.warrantyType}
                          </span>
                        </td>
                        <td className="p-3 text-[#94A3B8]">{war.supportTier || 'Estándar'}</td>
                        <td className="p-3 font-mono text-[#94A3B8]">{war.startDate.split('T')[0]}</td>
                        <td className="p-3 font-mono text-[#F1F5F9] font-semibold">{war.endDate.split('T')[0]}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              war.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : war.status === 'EXPIRING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {war.status === 'ACTIVE' ? 'ACTIVA' : war.status === 'EXPIRING' ? 'POR VENCER' : 'VENCIDA'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Can permission="WARRANTY_MANAGE">
                            <button
                              onClick={() => setDeleteTarget({ type: 'warranty', id: war.id, name: war.provider })}
                              className="p-1.5 rounded hover:bg-[#252D38] text-[#94A3B8] hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Can>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LICENCIAS DE SOFTWARE */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="text-xs text-[#94A3B8]">
              Gestión de licencias, asignación de puestos a máquinas/usuarios y descifrado seguro AES-256 de claves.
            </div>
            <Can permission="LICENSE_MANAGE">
              <Button size="sm" onClick={handleOpenCreateLicense} className="gap-1.5 bg-[#06B6D4] text-[#0B0F14] font-bold">
                <Plus className="w-4 h-4" />
                Nueva Licencia
              </Button>
            </Can>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {licenses.map((lic) => {
              const used = lic.usedSeats ?? 0;
              const total = lic.totalSeats ?? 1;
              const pct = lic.isUnlimited ? 0 : Math.min(100, Math.round((used / total) * 100));
              const isOver = !lic.isUnlimited && used > total;

              return (
                <Card key={lic.id} className="p-4 bg-[#0F141B] border-[#252D38] space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-mono text-[#06B6D4] font-bold">{lic.publisher}</div>
                      <h4 className="text-sm font-bold text-[#F1F5F9]">{lic.name} {lic.version || ''}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#252D38] text-[#94A3B8]">
                      {lic.licenseType}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#151B23] border border-[#252D38] flex items-center justify-between">
                    <div className="font-mono text-xs text-[#94A3B8]">
                      <span className="text-[10px] text-[#64748B] block uppercase tracking-wider">Clave de Licencia</span>
                      <span className="text-[#F1F5F9]">
                        {revealedKeys[lic.id] ? revealedKeys[lic.id] : lic.licenseKey || '••••-••••-••••-••••'}
                      </span>
                    </div>

                    <Can permission="LICENSE_REVEAL">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevealLicenseKey(lic.id)}
                        disabled={revealingLicId === lic.id}
                        className="h-7 text-xs gap-1 border-[#252D38] hover:border-[#06B6D4]"
                      >
                        {revealedKeys[lic.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#06B6D4]" />}
                        <span>{revealedKeys[lic.id] ? 'Ocultar' : 'Revelar'}</span>
                      </Button>
                    </Can>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#94A3B8]">
                        Puestos en uso: {used} {lic.isUnlimited ? '(Ilimitados)' : `/ ${total}`}
                      </span>
                      <span className={isOver ? 'text-red-400 font-bold' : 'text-[#06B6D4]'}>
                        {lic.isUnlimited ? '∞' : `${pct}%`}
                      </span>
                    </div>
                    {!lic.isUnlimited && (
                      <div className="w-full h-2 bg-[#151B23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOver ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-[#06B6D4]'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                    {isOver && (
                      <div className="text-[11px] text-red-400 font-bold flex items-center gap-1 pt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        <span>¡Sobreasignación detectada! Se requieren puestos adicionales.</span>
                      </div>
                    )}
                  </div>

                  {lic.assignments && lic.assignments.length > 0 && (
                    <div className="border-t border-[#252D38] pt-2 space-y-1">
                      <div className="text-[10px] text-[#64748B] uppercase font-mono">Asignaciones recientes:</div>
                      <div className="flex flex-wrap gap-1">
                        {lic.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#151B23] text-[#94A3B8] border border-[#252D38]"
                          >
                            <span>{a.assignedUser || a.machine?.hostname || a.asset?.assetTag || 'Asignado'}</span>
                            <Can permission="LICENSE_MANAGE">
                              <button
                                onClick={() => handleRemoveSeat(lic.id, a.id)}
                                className="hover:text-red-400 ml-0.5"
                                title="Liberar puesto"
                              >
                                &times;
                              </button>
                            </Can>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#252D38]/60">
                    <Can permission="LICENSE_MANAGE">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAssignModal(lic)}
                        className="text-xs h-7 gap-1"
                      >
                        <UserCheck className="w-3 h-3 text-[#06B6D4]" />
                        Asignar Puesto
                      </Button>
                    </Can>

                    <Can permission="LICENSE_MANAGE">
                      <button
                        onClick={() => setDeleteTarget({ type: 'license', id: lic.id, name: lic.name })}
                        className="p-1 text-[#64748B] hover:text-red-400"
                        title="Eliminar licencia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Can>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PROVEEDORES */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="text-xs text-[#94A3B8]">
              Directorio de fabricantes, distribuidores de hardware y partners de licenciamiento.
            </div>
            <Can permission="SUPPLIER_MANAGE">
              <Button size="sm" onClick={handleOpenCreateSupplier} className="gap-1.5 bg-[#06B6D4] text-[#0B0F14] font-bold">
                <Plus className="w-4 h-4" />
                Nuevo Proveedor
              </Button>
            </Can>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <Card key={sup.id} className="p-4 bg-[#0F141B] border-[#252D38] space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-[#F1F5F9]">{sup.name}</h4>
                  <Can permission="SUPPLIER_MANAGE">
                    <button
                      onClick={() => setDeleteTarget({ type: 'supplier', id: sup.id, name: sup.name })}
                      className="text-[#64748B] hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Can>
                </div>
                {sup.contactName && <div className="text-xs text-[#94A3B8]">Contacto: {sup.contactName}</div>}
                {sup.email && <div className="text-xs text-[#06B6D4] font-mono">{sup.email}</div>}
                {sup.phone && <div className="text-xs text-[#94A3B8]">{sup.phone}</div>}
                {sup.website && (
                  <a
                    href={sup.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 pt-1"
                  >
                    <span>{sup.website}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: COMPRAS & FACTURAS */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="text-xs text-[#94A3B8]">
              Trazabilidad económica, número de factura y correlación con activos adquiridos.
            </div>
            <Can permission="PURCHASE_MANAGE">
              <Button size="sm" onClick={handleOpenCreatePurchase} className="gap-1.5 bg-[#06B6D4] text-[#0B0F14] font-bold">
                <Plus className="w-4 h-4" />
                Registrar Compra
              </Button>
            </Can>
          </div>

          <div className="bg-[#0F141B] rounded-xl border border-[#252D38] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#151B23] text-[#94A3B8] border-b border-[#252D38]">
                  <th className="p-3 font-semibold">Orden de Compra</th>
                  <th className="p-3 font-semibold">Proveedor</th>
                  <th className="p-3 font-semibold">Factura Nº</th>
                  <th className="p-3 font-semibold">Fecha</th>
                  <th className="p-3 font-semibold">Importe Total</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D38]/60">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-[#151B23]/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#06B6D4]">{pur.orderNumber}</td>
                    <td className="p-3 text-[#F1F5F9]">{pur.supplier?.name || '—'}</td>
                    <td className="p-3 font-mono text-[#94A3B8]">{pur.invoiceNumber || '—'}</td>
                    <td className="p-3 font-mono text-[#94A3B8]">{pur.purchaseDate.split('T')[0]}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: pur.currency || 'EUR' }).format(pur.totalCost)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {pur.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Can permission="PURCHASE_MANAGE">
                        <button
                          onClick={() => setDeleteTarget({ type: 'purchase', id: pur.id, name: pur.orderNumber })}
                          className="p-1 text-[#64748B] hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: VISTA DE RACKS (42U) */}
      {activeTab === 'racks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F141B] p-3.5 rounded-xl border border-[#252D38]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-400" />
              <div>
                <h4 className="text-xs font-bold text-[#F1F5F9]">Elevación Visual de Armario Rack</h4>
                <p className="text-[11px] text-[#64748B]">Selecciona una ubicación de tipo RACK para ver la distribución de unidades U1 a U42.</p>
              </div>
            </div>

            <select
              value={selectedRackLocationId}
              onChange={(e) => setSelectedRackLocationId(e.target.value)}
              className="bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-1.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="">-- Seleccionar Rack --</option>
              {locations
                .filter((l) => l.type === 'RACK' || l.rack)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.building ? `(${loc.building} - ${loc.room || ''})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {selectedRackLocationId ? (
            <div className="bg-[#0F141B] p-6 rounded-xl border border-[#252D38] flex flex-col items-center">
              {isLoadingRack ? (
                <div className="py-12 text-center text-xs text-[#64748B] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#06B6D4]" />
                  Cargando elevación del rack...
                </div>
              ) : rackViewData ? (
                <div className="w-full max-w-2xl space-y-4">
                  <div className="flex items-center justify-between bg-[#151B23] p-3 rounded-lg border border-[#252D38]">
                    <div>
                      <div className="text-sm font-bold text-[#F1F5F9]">{rackViewData.rackLocation.name}</div>
                      <div className="text-xs text-[#94A3B8]">
                        Ocupación: {rackViewData.occupiedUnits} / {rackViewData.totalUnits} U (
                        {Math.round((rackViewData.occupiedUnits / rackViewData.totalUnits) * 100)}%)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                      <span className="text-[10px] text-[#94A3B8]">Ocupado</span>
                      <span className="w-3 h-3 rounded bg-[#151B23] border border-[#252D38] ml-2" />
                      <span className="text-[10px] text-[#64748B]">Libre</span>
                    </div>
                  </div>

                  <div className="bg-[#0B0F14] p-3 rounded-xl border-4 border-[#252D38] shadow-2xl space-y-1">
                    {Array.from({ length: 42 }, (_, i) => 42 - i).map((u) => {
                      const slot = rackViewData.units.find((s) => s.unit === u);
                      const isOcc = slot && slot.isOccupied;
                      const ast = slot?.asset;

                      return (
                        <div
                          key={u}
                          className={`flex items-center gap-2 h-7 px-2 rounded text-xs font-mono transition-all ${
                            isOcc
                              ? 'bg-gradient-to-r from-[#151B23] to-[#1E293B] border border-[#06B6D4]/40 shadow-sm text-[#F1F5F9]'
                              : 'bg-[#151B23]/30 border border-[#252D38]/40 text-[#64748B] hover:bg-[#151B23]/60'
                          }`}
                        >
                          <span className="w-8 text-[11px] font-bold text-[#64748B] select-none text-right pr-2 border-r border-[#252D38]">
                            U{u < 10 ? `0${u}` : u}
                          </span>

                          {isOcc && ast ? (
                            <div className="flex-1 flex items-center justify-between overflow-hidden">
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold text-[#06B6D4] truncate">{ast.assetTag}</span>
                                <span className="text-white truncate">{ast.name}</span>
                                <span className="text-[10px] text-[#94A3B8] font-sans truncate">
                                  ({ast.manufacturer || ''} {ast.model || ''})
                                </span>
                              </div>
                              {ast.machine && (
                                <button
                                  onClick={() => onSelectMachine && onSelectMachine(ast.machine!.id)}
                                  className="text-[10px] text-[#22C55E] hover:underline flex items-center gap-1 font-mono flex-shrink-0"
                                >
                                  <span>{ast.machine.hostname}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#475569] italic">-- Ranura libre --</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-[#0F141B] p-12 text-center rounded-xl border border-[#252D38] text-xs text-[#64748B]">
              Selecciona un rack del menú superior para ver su elevación física.
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT ASSET */}
      {isAssetModalOpen && (
        <Modal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          title={editingAsset ? `Editar Activo ${editingAsset.assetTag}` : 'Registrar Nuevo Activo IT'}
        >
          <form onSubmit={handleSubmitAsset} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Etiqueta de Activo *</label>
                <Input
                  value={formAssetTag}
                  onChange={(e) => setFormAssetTag(e.target.value)}
                  placeholder="AST-1001"
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Nombre del Activo *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Servidor Virtualización 01"
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Tipo de Activo</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AssetType)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="SERVER">Servidor</option>
                  <option value="WORKSTATION">Estación de Trabajo</option>
                  <option value="LAPTOP">Portátil</option>
                  <option value="SWITCH">Switch de Red</option>
                  <option value="ROUTER">Router</option>
                  <option value="FIREWALL">Firewall</option>
                  <option value="STORAGE">Almacenamiento (NAS/SAN)</option>
                  <option value="PRINTER">Impresora</option>
                  <option value="UPS">SAI / UPS</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Estado</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AssetStatus)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="IN_USE">En uso</option>
                  <option value="IN_STOCK">En stock (almacén)</option>
                  <option value="IN_REPAIR">En reparación</option>
                  <option value="DECOMMISSIONED">Retirado / Obsoleto</option>
                  <option value="RESERVED">Reservado</option>
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fabricante</label>
                <Input
                  value={formManufacturer}
                  onChange={(e) => setFormManufacturer(e.target.value)}
                  placeholder="Dell, HP, Cisco, Lenovo..."
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Modelo</label>
                <Input
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="PowerEdge R740, ProLiant DL380..."
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Número de Serie (S/N)</label>
                <Input
                  value={formSerialNumber}
                  onChange={(e) => setFormSerialNumber(e.target.value)}
                  placeholder="SN-987654321"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Usuario Asignado</label>
                <Input
                  value={formAssignedUser}
                  onChange={(e) => setFormAssignedUser(e.target.value)}
                  placeholder="Nombre o correo del empleado"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Ubicación</label>
                <select
                  value={formLocationId}
                  onChange={(e) => setFormLocationId(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="">-- Sin ubicación asignada --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.type ? `(${loc.type})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Posición en Rack (Unidad U)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="42"
                    value={formRackUnit}
                    onChange={(e) => setFormRackUnit(e.target.value)}
                    placeholder="U (1..42)"
                  />
                  <select
                    value={formRackHeightU}
                    onChange={(e) => setFormRackHeightU(e.target.value)}
                    className="bg-[#151B23] border border-[#252D38] rounded-lg px-2 text-xs text-[#F1F5F9]"
                  >
                    <option value="1">1U</option>
                    <option value="2">2U</option>
                    <option value="3">3U</option>
                    <option value="4">4U</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Vincular con Host Técnico (Machine)</label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="">-- No vincular a ningún host --</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.hostname} ({m.primaryIp || 'Sin IP'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Coste de Compra (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formPurchaseCost}
                  onChange={(e) => setFormPurchaseCost(e.target.value)}
                  placeholder="2450.00"
                />
              </div>
            </div>

            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Notas / Observaciones</label>
              <textarea
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Detalles sobre garantía extendida, contrato de soporte, etc."
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg p-2.5 text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsAssetModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingAsset} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingAsset ? 'Guardando...' : editingAsset ? 'Guardar Cambios' : 'Crear Activo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD HARDWARE COMPONENT */}
      {isHardwareModalOpen && selectedAssetDetail && (
        <Modal
          isOpen={isHardwareModalOpen}
          onClose={() => setIsHardwareModalOpen(false)}
          title={`Componentes de Hardware - ${selectedAssetDetail.assetTag}`}
        >
          <div className="space-y-4 text-xs">
            {selectedAssetDetail.hardware && selectedAssetDetail.hardware.length > 0 && (
              <div className="space-y-2 border-b border-[#252D38] pb-3">
                <h5 className="font-semibold text-[#94A3B8]">Componentes instalados:</h5>
                <div className="space-y-1">
                  {selectedAssetDetail.hardware.map((hw) => (
                    <div
                      key={hw.id}
                      className="flex items-center justify-between p-2 rounded bg-[#151B23] border border-[#252D38]"
                    >
                      <div className="flex items-center gap-2">
                        {hw.type === 'DISK' ? (
                          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Cpu className="w-3.5 h-3.5 text-[#06B6D4]" />
                        )}
                        <span className="font-bold text-[#F1F5F9]">{hw.type}:</span>
                        <span className="text-[#94A3B8]">
                          {hw.manufacturer || ''} {hw.model || ''} {hw.capacity ? `(${hw.capacity})` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteHardware(selectedAssetDetail.id, hw.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddHardwareSubmit} className="space-y-3">
              <h5 className="font-semibold text-[#F1F5F9]">Añadir nuevo componente:</h5>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1">Tipo de Componente</label>
                  <select
                    value={hwType}
                    onChange={(e) => setHwType(e.target.value as HardwareComponentType)}
                    className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-2.5 py-1.5 text-xs text-[#F1F5F9]"
                  >
                    <option value="CPU">Procesador (CPU)</option>
                    <option value="RAM">Memoria RAM</option>
                    <option value="DISK">Disco / Almacenamiento</option>
                    <option value="NIC">Tarjeta de Red (NIC)</option>
                    <option value="GPU">Tarjeta Gráfica (GPU)</option>
                    <option value="POWER_SUPPLY">Fuente de Alimentación</option>
                    <option value="CONTROLLER">Controladora RAID</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Capacidad / Tamaño</label>
                  <Input
                    value={hwCapacity}
                    onChange={(e) => setHwCapacity(e.target.value)}
                    placeholder="32 GB, 2 TB SSD, 10 Gbps..."
                  />
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Modelo</label>
                  <Input
                    value={hwModel}
                    onChange={(e) => setHwModel(e.target.value)}
                    placeholder="Xeon Silver 4210, Samsung 980 Pro..."
                  />
                </div>

                <div>
                  <label className="text-[#94A3B8] block mb-1">Fabricante</label>
                  <Input
                    value={hwManufacturer}
                    onChange={(e) => setHwManufacturer(e.target.value)}
                    placeholder="Intel, Kingston, Seagate..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsHardwareModalOpen(false)}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={isSubmittingHw} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                  {isSubmittingHw ? 'Añadiendo...' : 'Añadir Componente'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* MODAL: ASSIGN LICENSE SEAT */}
      {isAssignModalOpen && selectedLicenseForAssign && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title={`Asignar Puesto - ${selectedLicenseForAssign.name}`}
        >
          <form onSubmit={handleAssignSeatSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Usuario Asignado</label>
              <Input
                value={assignUser}
                onChange={(e) => setAssignUser(e.target.value)}
                placeholder="Nombre o email del empleado (ej. adrian.palma@empresa.com)"
              />
            </div>

            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">O Vincular con Máquina Host</label>
              <select
                value={assignMachineId}
                onChange={(e) => setAssignMachineId(e.target.value)}
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
              >
                <option value="">-- Sin máquina asignada --</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.hostname} ({m.primaryIp || 'Sin IP'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Notas / Razón de asignación</label>
              <Input
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Puesto de desarrollo, departamento NOC, etc."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingAssign} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingAssign ? 'Asignando...' : 'Confirmar Asignación'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE / EDIT SUPPLIER */}
      {isSupplierModalOpen && (
        <Modal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          title={editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
        >
          <form onSubmit={handleSubmitSupplier} className="space-y-4 text-xs">
            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Nombre del Proveedor *</label>
              <Input
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Dell Technologies España, Microsoft, Cisco Systems..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Persona de Contacto</label>
                <Input
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Email Comercial / Soporte</label>
                <Input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="soporte@proveedor.com"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Teléfono</label>
                <Input
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="+34 91 123 4567"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Portal Web / URL</label>
                <Input
                  value={supWebsite}
                  onChange={(e) => setSupWebsite(e.target.value)}
                  placeholder="https://www.dell.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsSupplierModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingSup} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingSup ? 'Guardando...' : 'Guardar Proveedor'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE / EDIT PURCHASE */}
      {isPurchaseModalOpen && (
        <Modal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          title={editingPurchase ? 'Editar Compra' : 'Registrar Nueva Compra / Factura'}
        >
          <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Nº Orden de Compra *</label>
                <Input
                  value={purOrderNumber}
                  onChange={(e) => setPurOrderNumber(e.target.value)}
                  placeholder="PO-2026-001"
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fecha de Compra</label>
                <Input
                  type="date"
                  value={purDate}
                  onChange={(e) => setPurDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Proveedor</label>
                <select
                  value={purSupplierId}
                  onChange={(e) => setPurSupplierId(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="">-- Sin proveedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Número de Factura</label>
                <Input
                  value={purInvoiceNumber}
                  onChange={(e) => setPurInvoiceNumber(e.target.value)}
                  placeholder="FAC-2026-987"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Importe Total (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={purTotalCost}
                  onChange={(e) => setPurTotalCost(e.target.value)}
                  placeholder="5600.00"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Estado</label>
                <select
                  value={purStatus}
                  onChange={(e) => setPurStatus(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="COMPLETED">Completada / Pagada</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Notas / Concepto</label>
              <textarea
                rows={2}
                value={purNotes}
                onChange={(e) => setPurNotes(e.target.value)}
                placeholder="Adquisición de servidores para renovación del rack datacenter..."
                className="w-full bg-[#151B23] border border-[#252D38] rounded-lg p-2.5 text-xs text-[#F1F5F9]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsPurchaseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingPur} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingPur ? 'Guardando...' : 'Guardar Compra'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE / EDIT WARRANTY */}
      {isWarrantyModalOpen && (
        <Modal
          isOpen={isWarrantyModalOpen}
          onClose={() => setIsWarrantyModalOpen(false)}
          title={editingWarranty ? 'Editar Garantía' : 'Registrar Contrato de Garantía'}
        >
          <form onSubmit={handleSubmitWarranty} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Proveedor / Emisor *</label>
                <Input
                  value={warProvider}
                  onChange={(e) => setWarProvider(e.target.value)}
                  placeholder="Dell ProSupport, HP CarePack, AppleCare..."
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Tipo de Garantía</label>
                <select
                  value={warType}
                  onChange={(e) => setWarType(e.target.value as WarrantyType)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="MANUFACTURER">Fabricante (Estándar)</option>
                  <option value="EXTENDED">Garantía Extendida</option>
                  <option value="ON_SITE">In Situ (On-Site NBD / 4h)</option>
                  <option value="REPLACEMENT">Sustitución Inmediata</option>
                  <option value="SUPPORT_ONLY">Soporte Telefónico/Remoto</option>
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Activo IT Asociado</label>
                <select
                  value={warAssetId}
                  onChange={(e) => setWarAssetId(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="">-- Sin activo específico (Garantía Global) --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetTag} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Nº Contrato / ID Garantía</label>
                <Input
                  value={warContractNumber}
                  onChange={(e) => setWarContractNumber(e.target.value)}
                  placeholder="CNT-DELL-2026-99"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fecha de Inicio</label>
                <Input
                  type="date"
                  value={warStartDate}
                  onChange={(e) => setWarStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fecha de Vencimiento</label>
                <Input
                  type="date"
                  value={warEndDate}
                  onChange={(e) => setWarEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[#94A3B8] block mb-1 font-semibold">Nivel de Soporte y SLA</label>
              <Input
                value={warSupportTier}
                onChange={(e) => setWarSupportTier(e.target.value)}
                placeholder="24x7 Respuesta en 4h, NBD Siguiente día laborable..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsWarrantyModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingWar} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingWar ? 'Guardando...' : 'Guardar Garantía'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE / EDIT LICENSE */}
      {isLicenseModalOpen && (
        <Modal
          isOpen={isLicenseModalOpen}
          onClose={() => setIsLicenseModalOpen(false)}
          title={editingLicense ? 'Editar Licencia' : 'Registrar Nueva Licencia de Software'}
        >
          <form onSubmit={handleSubmitLicense} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Nombre del Software *</label>
                <Input
                  value={licName}
                  onChange={(e) => setLicName(e.target.value)}
                  placeholder="Windows Server 2025 Datacenter, VMware vSphere..."
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fabricante / Editorial *</label>
                <Input
                  value={licPublisher}
                  onChange={(e) => setLicPublisher(e.target.value)}
                  placeholder="Microsoft, VMware, Veeam, JetBrains..."
                  required
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Tipo de Licenciamiento</label>
                <select
                  value={licType}
                  onChange={(e) => setLicType(e.target.value as LicenseType)}
                  className="w-full bg-[#151B23] border border-[#252D38] rounded-lg px-3 py-2 text-xs text-[#F1F5F9]"
                >
                  <option value="SUBSCRIPTION">Suscripción Anual/Mensual</option>
                  <option value="PERPETUAL">Perpetua</option>
                  <option value="PER_USER">Por Usuario (Named User)</option>
                  <option value="PER_DEVICE">Por Dispositivo / Máquina</option>
                  <option value="PER_CORE">Por Socket / Core</option>
                  <option value="SITE">Licencia de Sitio / Enterprise</option>
                  <option value="OPEN_SOURCE">Open Source / Libre</option>
                </select>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Clave de Licencia (Será cifrada)</label>
                <Input
                  value={licKey}
                  onChange={(e) => setLicKey(e.target.value)}
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Número de Puestos / Asientos</label>
                <Input
                  type="number"
                  min="1"
                  value={licTotalSeats}
                  onChange={(e) => setLicTotalSeats(e.target.value)}
                  disabled={licIsUnlimited}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="chkUnlimited"
                  checked={licIsUnlimited}
                  onChange={(e) => setLicIsUnlimited(e.target.checked)}
                  className="rounded border-[#252D38] bg-[#151B23] text-[#06B6D4]"
                />
                <label htmlFor="chkUnlimited" className="text-[#F1F5F9] font-medium">Puestos Ilimitados (Site)</label>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Fecha de Expiración</label>
                <Input
                  type="date"
                  value={licExpirationDate}
                  onChange={(e) => setLicExpirationDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-semibold">Coste Total (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={licCost}
                  onChange={(e) => setLicCost(e.target.value)}
                  placeholder="1200.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsLicenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingLic} className="bg-[#06B6D4] text-[#0B0F14] font-bold">
                {isSubmittingLic ? 'Guardando...' : 'Guardar Licencia'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: IMPORT CSV */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Importar Activos IT desde CSV"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#94A3B8]">
              Pega el contenido CSV respetando los encabezados estándar:
              <br />
              <code className="font-mono text-[10px] text-[#06B6D4] block mt-1 bg-[#151B23] p-1.5 rounded">
                AssetTag,Name,Type,Status,Manufacturer,Model,SerialNumber,AssignedUser,Location,PurchaseCost
              </code>
            </p>

            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="AST-001,Server-Web,SERVER,IN_USE,Dell,PowerEdge,SN1234,Adrian,Datacenter,3500"
              className="w-full bg-[#151B23] border border-[#252D38] rounded-lg p-3 font-mono text-xs text-[#F1F5F9] focus:outline-none focus:border-[#06B6D4]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[#252D38]">
              <Button variant="outline" type="button" onClick={() => setIsImportModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImportCsv}
                disabled={isImporting || !csvContent.trim()}
                className="bg-[#06B6D4] text-[#0B0F14] font-bold"
              >
                {isImporting ? 'Importando...' : 'Ejecutar Importación'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Confirmar Eliminación"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#F1F5F9]">
              ¿Estás seguro de que deseas eliminar este registro ({deleteTarget.name})?
            </p>
            <p className="text-[11px] text-[#64748B]">
              Esta acción es permanente para el activo IT. Los datos de la máquina host técnica seguirán intactos.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#252D38]">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white font-bold">
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
