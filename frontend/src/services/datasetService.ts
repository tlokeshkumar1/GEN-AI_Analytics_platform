import api from './api';
import {
  DatasetItem,
  DatasetRow,
  DatasetDataResult,
  DatasetColumn,
} from '../types/dataset';

// Storage keys for client-side local cache fallback
const DATASETS_STORAGE_KEY = 'neovatic_managed_datasets_v1';
const DATASET_ROWS_STORAGE_PREFIX = 'neovatic_dataset_rows_v1_';

// Environment-safe storage adapter (supports browser localStorage and memory fallback for testing)
const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {}
    delete memoryStorage[key];
  },
};

const DEFAULT_COLUMNS: DatasetColumn[] = [
  { name: 'OrderNumber', type: 'string', description: 'Order identifier (SO/ORD)', required: true },
  { name: 'SalesDate', type: 'date', description: 'Transaction posting date', required: true },
  { name: 'Region', type: 'string', description: 'Operating theatre / region', required: true },
  { name: 'Country', type: 'string', description: 'Country of customer destination', required: true },
  { name: 'Category', type: 'string', description: 'Product classification', required: true },
  { name: 'Product', type: 'string', description: 'SKU or machine descriptor', required: true },
  { name: 'NetRevenueUSD', type: 'number', description: 'Revenue after standard rebates', required: true },
  { name: 'GrossMarginPercent', type: 'percentage', description: 'Realized gross margin percentage', required: true },
  { name: 'Quantity', type: 'number', description: 'Units shipped / scheduled', required: true },
  { name: 'UnitCostUSD', type: 'number', description: 'Standard bill-of-materials cost' },
  { name: 'DistributionChannel', type: 'string', description: 'Channel (Direct, VAR, OEM)' },
  { name: 'CustomerSegment', type: 'string', description: 'Customer tier (Enterprise, Mid-Market, SMB)' },
];

const INITIAL_MOCK_DATASETS: DatasetItem[] = [
  {
    id: 'ds-101',
    name: 'SAC_Sales_Preprocessed.xlsx',
    description: 'Consolidated SAP Analytics Cloud worldwide revenue & margin ledger for FY2024-2025.',
    rowCount: 3412,
    columnCount: 12,
    lastUpdated: 'Today at 10:42 AM',
    format: 'xlsx',
    source: 'SAP Analytics Cloud (SAC Direct Connector)',
    sizeBytes: 1482000,
    status: 'Ready',
    columns: DEFAULT_COLUMNS,
  },
  {
    id: 'ds-102',
    name: 'EMEA_HeavyMachinery_Q3.csv',
    description: 'S/4HANA Sales & Distribution line-item dispatches and raw material surcharges across Germany & DACH.',
    rowCount: 1840,
    columnCount: 12,
    lastUpdated: 'Yesterday at 4:15 PM',
    format: 'csv',
    source: 'SAP S/4HANA Sales & Distribution',
    sizeBytes: 684000,
    status: 'Ready',
    columns: DEFAULT_COLUMNS,
  },
  {
    id: 'ds-103',
    name: 'Robotics_Firmware_Telemetry.parquet',
    description: 'Edge IoT arm telemetry, unit efficiency logs, and recurring auxiliary firmware licensing attach rates.',
    rowCount: 5120,
    columnCount: 12,
    lastUpdated: '3 days ago',
    format: 'parquet',
    source: 'NVIDIA NIM & IoT Edge Ingestion',
    sizeBytes: 2450000,
    status: 'Ready',
    columns: DEFAULT_COLUMNS,
  },
  {
    id: 'ds-104',
    name: 'Global_Logistics_Surcharges_FY24.xlsx',
    description: 'Intermodal freight billing, trans-pacific carrier tariffs, and customs clearance audits.',
    rowCount: 980,
    columnCount: 12,
    lastUpdated: '5 days ago',
    format: 'xlsx',
    source: 'DB Schenker EDI Gateway',
    sizeBytes: 395000,
    status: 'Ready',
    columns: DEFAULT_COLUMNS,
  },
];

const INITIAL_ROWS_DS_101: DatasetRow[] = [
  {
    id: 'row-1',
    OrderNumber: 'SO-106760',
    SalesDate: '2025-01-14',
    Region: 'EMEA',
    Country: 'Germany',
    Category: 'Robotics & Automation',
    Product: 'Industrial Robotic Arm X-400',
    NetRevenueUSD: 240000.0,
    GrossMarginPercent: 48.2,
    Quantity: 4,
    UnitCostUSD: 124320.0,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-2',
    OrderNumber: 'SO-106761',
    SalesDate: '2025-01-14',
    Region: 'North America',
    Country: 'United States',
    Category: 'Material Handling & Storage',
    Product: 'Automated Conveyor Line V3',
    NetRevenueUSD: 148500.0,
    GrossMarginPercent: 42.1,
    Quantity: 2,
    UnitCostUSD: 85981.5,
    DistributionChannel: 'VAR Partner',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-3',
    OrderNumber: 'SO-106762',
    SalesDate: '2025-01-15',
    Region: 'APAC',
    Country: 'Japan',
    Category: 'Safety & Compliance',
    Product: 'Proximity Sensor Matrix MX',
    NetRevenueUSD: 89200.0,
    GrossMarginPercent: 38.6,
    Quantity: 15,
    UnitCostUSD: 54768.8,
    DistributionChannel: 'OEM Reseller',
    CustomerSegment: 'Mid-Market',
  },
  {
    id: 'row-4',
    OrderNumber: 'SO-106763',
    SalesDate: '2025-01-15',
    Region: 'EMEA',
    Country: 'France',
    Category: 'Heavy Machinery',
    Product: 'Hydraulic Press HP-900',
    NetRevenueUSD: 312000.0,
    GrossMarginPercent: 34.2,
    Quantity: 1,
    UnitCostUSD: 205296.0,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-5',
    OrderNumber: 'SO-106764',
    SalesDate: '2025-01-16',
    Region: 'Latin America',
    Country: 'Brazil',
    Category: 'Robotics & Automation',
    Product: 'Firmware Enterprise License Pack',
    NetRevenueUSD: 76800.0,
    GrossMarginPercent: 92.0,
    Quantity: 8,
    UnitCostUSD: 6144.0,
    DistributionChannel: 'Digital SaaS',
    CustomerSegment: 'Mid-Market',
  },
  {
    id: 'row-6',
    OrderNumber: 'SO-106765',
    SalesDate: '2025-01-16',
    Region: 'North America',
    Country: 'Canada',
    Category: 'Tools & Maintenance',
    Product: 'Pneumatic Calibration Kit P9',
    NetRevenueUSD: 34500.0,
    GrossMarginPercent: 41.5,
    Quantity: 5,
    UnitCostUSD: 20182.5,
    DistributionChannel: 'VAR Partner',
    CustomerSegment: 'SMB',
  },
  {
    id: 'row-7',
    OrderNumber: 'SO-106766',
    SalesDate: '2025-01-17',
    Region: 'EMEA',
    Country: 'Italy',
    Category: 'Material Handling & Storage',
    Product: 'Automated Pallet Stacker APS',
    NetRevenueUSD: 112000.0,
    GrossMarginPercent: 39.4,
    Quantity: 2,
    UnitCostUSD: 67872.0,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-8',
    OrderNumber: 'SO-106767',
    SalesDate: '2025-01-17',
    Region: 'APAC',
    Country: 'Singapore',
    Category: 'Safety & Compliance',
    Product: 'Thermal Barrier Sensor Module',
    NetRevenueUSD: 52400.0,
    GrossMarginPercent: 44.8,
    Quantity: 10,
    UnitCostUSD: 28924.8,
    DistributionChannel: 'OEM Reseller',
    CustomerSegment: 'Mid-Market',
  },
  {
    id: 'row-9',
    OrderNumber: 'SO-106768',
    SalesDate: '2025-01-18',
    Region: 'North America',
    Country: 'United States',
    Category: 'Heavy Machinery',
    Product: 'Industrial Excavator Prime Tier-4',
    NetRevenueUSD: 485000.0,
    GrossMarginPercent: 32.8,
    Quantity: 1,
    UnitCostUSD: 325920.0,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-10',
    OrderNumber: 'SO-106769',
    SalesDate: '2025-01-18',
    Region: 'EMEA',
    Country: 'Germany',
    Category: 'Robotics & Automation',
    Product: 'Robotic Welding Arm W-200',
    NetRevenueUSD: 188000.0,
    GrossMarginPercent: 47.6,
    Quantity: 2,
    UnitCostUSD: 98512.0,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'Enterprise',
  },
  {
    id: 'row-11',
    OrderNumber: 'SO-106770',
    SalesDate: '2025-01-19',
    Region: 'APAC',
    Country: 'South Korea',
    Category: 'Robotics & Automation',
    Product: 'Precision Sorting Arm S-120',
    NetRevenueUSD: 135000.0,
    GrossMarginPercent: 46.1,
    Quantity: 3,
    UnitCostUSD: 72765.0,
    DistributionChannel: 'VAR Partner',
    CustomerSegment: 'Mid-Market',
  },
  {
    id: 'row-12',
    OrderNumber: 'SO-106771',
    SalesDate: '2025-01-20',
    Region: 'North America',
    Country: 'United States',
    Category: 'Safety & Compliance',
    Product: 'Emergency Lockout Interlock Array',
    NetRevenueUSD: 41200.0,
    GrossMarginPercent: 43.2,
    Quantity: 6,
    UnitCostUSD: 23401.6,
    DistributionChannel: 'Direct Enterprise',
    CustomerSegment: 'SMB',
  },
];

// LocalStorage helpers to simulate true database persistence
function loadStoredDatasets(): DatasetItem[] {
  try {
    const raw = safeStorage.getItem(DATASETS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse stored datasets:', e);
  }
  safeStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATASETS));
  return INITIAL_MOCK_DATASETS;
}

function saveStoredDatasets(datasets: DatasetItem[]): void {
  try {
    safeStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(datasets));
  } catch (e) {
    console.error('Failed to save datasets:', e);
  }
}

function loadStoredRows(datasetId: string): DatasetRow[] {
  try {
    const raw = safeStorage.getItem(`${DATASET_ROWS_STORAGE_PREFIX}${datasetId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse stored dataset rows:', e);
  }
  // Default mock rows
  const initial = datasetId === 'ds-101' ? INITIAL_ROWS_DS_101 : INITIAL_ROWS_DS_101.map((r, i) => ({
    ...r,
    id: `${datasetId}-row-${i + 1}`,
    OrderNumber: `ORD-${datasetId.slice(-3)}-${1000 + i}`,
  }));
  safeStorage.setItem(`${DATASET_ROWS_STORAGE_PREFIX}${datasetId}`, JSON.stringify(initial));
  return initial;
}

function saveStoredRows(datasetId: string, rows: DatasetRow[]): void {
  try {
    safeStorage.setItem(`${DATASET_ROWS_STORAGE_PREFIX}${datasetId}`, JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save dataset rows:', e);
  }
}

/**
 * 1. Fetch all datasets for current user
 */
export async function getDatasets(): Promise<DatasetItem[]> {
  try {
    // Attempt real backend call
    const response = await api.get<DatasetItem[]>('/datasets');
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend GET /api/datasets once provisioned in SAP BTP/HANA backend
  }
  // Simulated network latency
  await new Promise((resolve) => setTimeout(resolve, 250));
  return loadStoredDatasets();
}

/**
 * 2. Fetch single dataset with paginated, filtered, sorted rows
 */
export async function getDatasetData(
  datasetId: string,
  page: number = 1,
  pageSize: number = 10,
  sortField?: string,
  sortDir: 'asc' | 'desc' = 'asc',
  searchQuery?: string
): Promise<DatasetDataResult> {
  try {
    // Attempt real backend call
    const response = await api.get<DatasetDataResult>(`/datasets/${datasetId}/data`, {
      params: { page, pageSize, sortField, sortDir, search: searchQuery },
    });
    if (response.data && response.data.rows) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend GET /api/datasets/:id/data once provisioned in SAP BTP/HANA backend
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  const allDatasets = loadStoredDatasets();
  const dataset = allDatasets.find((d) => d.id === datasetId) || allDatasets[0];
  let allRows = loadStoredRows(datasetId);

  // Search filter
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    allRows = allRows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(q)
      )
    );
  }

  // Sorting
  if (sortField) {
    allRows = [...allRows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '').toLowerCase();
      const strB = String(valB ?? '').toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const totalRows = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedRows = allRows.slice(startIndex, startIndex + pageSize);

  return {
    dataset,
    rows: paginatedRows,
    totalRows,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 3. Update existing dataset rows
 */
export async function updateDatasetRows(
  datasetId: string,
  updatedRows: DatasetRow[]
): Promise<{ success: boolean; message: string; rowsUpdated: number }> {
  try {
    const response = await api.put(`/datasets/${datasetId}/rows`, { rows: updatedRows });
    if (response.data) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend PUT /api/datasets/:id/rows once provisioned in SAP BTP/HANA backend
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const currentRows = loadStoredRows(datasetId);
  const updatedMap = new Map(updatedRows.map((r) => [r.id, r]));

  const nextRows = currentRows.map((row) => {
    if (updatedMap.has(row.id)) {
      return { ...row, ...updatedMap.get(row.id) };
    }
    return row;
  });

  saveStoredRows(datasetId, nextRows);

  // Update dataset lastUpdated metadata
  const datasets = loadStoredDatasets().map((d) =>
    d.id === datasetId ? { ...d, lastUpdated: 'Just now' } : d
  );
  saveStoredDatasets(datasets);

  return {
    success: true,
    message: `Successfully saved ${updatedRows.length} row(s) in ${datasetId}`,
    rowsUpdated: updatedRows.length,
  };
}

/**
 * 4. Append rows to existing dataset
 */
export async function appendDatasetData(
  datasetId: string,
  payload: { rows: DatasetRow[]; file?: File }
): Promise<{ success: boolean; message: string; rowsAppended: number; totalRows: number }> {
  try {
    const formData = new FormData();
    if (payload.file) {
      formData.append('file', payload.file);
    }
    formData.append('rows', JSON.stringify(payload.rows));
    const response = await api.post(`/datasets/${datasetId}/append`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend POST /api/datasets/:id/append once provisioned in SAP BTP/HANA backend
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  const currentRows = loadStoredRows(datasetId);
  const rowsWithIds = payload.rows.map((row, idx) => ({
    ...row,
    id: row.id || `${datasetId}-appended-${Date.now()}-${idx}`,
  }));

  const nextRows = [...currentRows, ...rowsWithIds];
  saveStoredRows(datasetId, nextRows);

  // Update dataset rowCount and lastUpdated
  const datasets = loadStoredDatasets().map((d) =>
    d.id === datasetId
      ? { ...d, rowCount: nextRows.length, lastUpdated: 'Just now' }
      : d
  );
  saveStoredDatasets(datasets);

  return {
    success: true,
    message: `Appended ${payload.rows.length} rows to dataset`,
    rowsAppended: payload.rows.length,
    totalRows: nextRows.length,
  };
}

/**
 * 5. Delete selected rows from dataset
 */
export async function deleteDatasetRows(
  datasetId: string,
  rowIds: string[]
): Promise<{ success: boolean; message: string; remainingRows: number }> {
  try {
    const response = await api.delete(`/datasets/${datasetId}/rows`, { data: { rowIds } });
    if (response.data) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend DELETE /api/datasets/:id/rows once provisioned in SAP BTP/HANA backend
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const currentRows = loadStoredRows(datasetId);
  const toDelete = new Set(rowIds);
  const nextRows = currentRows.filter((r) => !toDelete.has(r.id));
  saveStoredRows(datasetId, nextRows);

  const datasets = loadStoredDatasets().map((d) =>
    d.id === datasetId
      ? { ...d, rowCount: nextRows.length, lastUpdated: 'Just now' }
      : d
  );
  saveStoredDatasets(datasets);

  return {
    success: true,
    message: `Deleted ${rowIds.length} row(s) from dataset`,
    remainingRows: nextRows.length,
  };
}

/**
 * 6. Delete entire dataset
 */
export async function deleteDataset(
  datasetId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await api.delete(`/datasets/${datasetId}`);
    if (response.data) {
      return response.data;
    }
  } catch {
    // TODO: Connect to backend DELETE /api/datasets/:id once provisioned in SAP BTP/HANA backend
  }

  await new Promise((resolve) => setTimeout(resolve, 350));

  const datasets = loadStoredDatasets().filter((d) => d.id !== datasetId);
  saveStoredDatasets(datasets);
  safeStorage.removeItem(`${DATASET_ROWS_STORAGE_PREFIX}${datasetId}`);

  return {
    success: true,
    message: `Dataset ${datasetId} was completely removed`,
  };
}

/**
 * Check user role permissions for dataset operations
 */
export function getUserPermissions(): {
  canView: boolean;
  canEdit: boolean;
  canAppend: boolean;
  canDelete: boolean;
  role: string;
} {
  try {
    const userJson = safeStorage.getItem('auth_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      const roles: string[] = user.roles || [];
      const roleStr = roles.join(' ').toLowerCase();

      // Read-only roles: e.g. "viewer", "guest", "auditor" without admin/director rights
      const isViewer =
        (roleStr.includes('viewer') || roleStr.includes('guest') || roleStr.includes('readonly')) &&
        !roleStr.includes('admin') &&
        !roleStr.includes('director') &&
        !roleStr.includes('lead');

      return {
        canView: true,
        canEdit: !isViewer,
        canAppend: !isViewer,
        canDelete: !isViewer,
        role: roles[0] || 'Administrator',
      };
    }
  } catch (e) {
    console.error('Error reading user role permissions:', e);
  }

  // Default fallback is full operator permission
  return {
    canView: true,
    canEdit: true,
    canAppend: true,
    canDelete: true,
    role: 'Administrator',
  };
}
