export interface ProductSKU {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  netRevenue: number;
  netRevenueFormatted: string;
  volumeWeight: number; // percentage 0-100
  marginStatus: number; // percentage e.g. 48.2
  statusColor: string;
  skuCode: string;
  region: string;
}

export interface RegionData {
  rank: string;
  name: string;
  revenue: string;
  percentage: number;
  colorClass: string;
}

export interface CountryRevenue {
  country: string;
  revenue: string;
  revenueNum: number;
  percentage: number;
  colorClass: string;
}

export interface CategoryRevenue {
  category: string;
  description: string;
  revenue: string;
  revenueNum: number;
  growth: string;
}

export interface QuarterlyTarget {
  quarter: string;
  percentage: number;
  attainmentLabel: string;
  actualVsTarget: string;
  isForecast?: boolean;
}

export interface SchemaColumn {
  name: string;
  type: string;
  category: 'Calculated' | 'Dimension' | 'Metric';
  description: string;
  dataType: string;
}

export const TOP_PRODUCTS: ProductSKU[] = [
  {
    id: 'prod-1',
    name: 'Industrial Robotic Arm X-400',
    category: 'Robotics & Automation',
    unitsSold: 4820,
    netRevenue: 24100000,
    netRevenueFormatted: '$24.1M',
    volumeWeight: 88,
    marginStatus: 48.2,
    statusColor: 'bg-primary',
    skuCode: 'SKU-ROB-400X',
    region: 'North America',
  },
  {
    id: 'prod-2',
    name: 'Heavy Forklift H-90 Tier-4',
    category: 'Material Handling & Storage',
    unitsSold: 1940,
    netRevenue: 19400000,
    netRevenueFormatted: '$19.4M',
    volumeWeight: 72,
    marginStatus: 41.0,
    statusColor: 'bg-secondary',
    skuCode: 'SKU-FLT-H90T4',
    region: 'EMEA',
  },
  {
    id: 'prod-3',
    name: 'Automated Sorting System Pro',
    category: 'Robotics & Automation',
    unitsSold: 820,
    netRevenue: 16400000,
    netRevenueFormatted: '$16.4M',
    volumeWeight: 58,
    marginStatus: 45.7,
    statusColor: 'bg-[#747878]',
    skuCode: 'SKU-SRT-PRO9',
    region: 'APAC',
  },
  {
    id: 'prod-4',
    name: 'Safety Sensor Matrix 4 Enterprise',
    category: 'Safety & Compliance',
    unitsSold: 32400,
    netRevenue: 11800000,
    netRevenueFormatted: '$11.8M',
    volumeWeight: 44,
    marginStatus: 38.4,
    statusColor: 'bg-[#c4c7c7]',
    skuCode: 'SKU-SNS-M4ENT',
    region: 'North America',
  },
  {
    id: 'prod-5',
    name: 'Pneumatic Torque System PTX',
    category: 'Tools & Maintenance',
    unitsSold: 14200,
    netRevenue: 8600000,
    netRevenueFormatted: '$8.6M',
    volumeWeight: 32,
    marginStatus: 36.1,
    statusColor: 'bg-[#c4c7c7]',
    skuCode: 'SKU-TRQ-PTX88',
    region: 'Latin America',
  },
  {
    id: 'prod-6',
    name: 'Autonomous Guided Vehicle AGV-12',
    category: 'Material Handling & Storage',
    unitsSold: 640,
    netRevenue: 7850000,
    netRevenueFormatted: '$7.8M',
    volumeWeight: 28,
    marginStatus: 43.5,
    statusColor: 'bg-[#747878]',
    skuCode: 'SKU-AGV-12B',
    region: 'EMEA',
  },
  {
    id: 'prod-7',
    name: 'Hydraulic Press HP-500 Electric',
    category: 'Heavy Machinery',
    unitsSold: 410,
    netRevenue: 6920000,
    netRevenueFormatted: '$6.9M',
    volumeWeight: 24,
    marginStatus: 34.8,
    statusColor: 'bg-[#5e5e5e]',
    skuCode: 'SKU-PRS-HP500',
    region: 'North America',
  },
];

export const REGIONAL_MARKET_SHARE: RegionData[] = [
  {
    rank: '#1',
    name: 'North America',
    revenue: '$82.4M',
    percentage: 44.7,
    colorClass: 'bg-[#1a1c1b]',
  },
  {
    rank: '#2',
    name: 'Europe (EMEA)',
    revenue: '$54.1M',
    percentage: 29.4,
    colorClass: 'bg-[#5e5e5e]',
  },
  {
    rank: '#3',
    name: 'Asia-Pacific',
    revenue: '$32.8M',
    percentage: 17.8,
    colorClass: 'bg-[#747878]',
  },
  {
    rank: '#4',
    name: 'Latin America',
    revenue: '$14.9M',
    percentage: 8.1,
    colorClass: 'bg-[#c4c7c7]',
  },
];

export const TOP_REVENUE_COUNTRIES: CountryRevenue[] = [
  { country: 'United States', revenue: '$68.0M', revenueNum: 68.0, percentage: 85, colorClass: 'bg-[#1a1c1b]' },
  { country: 'Germany', revenue: '$28.0M', revenueNum: 28.0, percentage: 48, colorClass: 'bg-[#5e5e5e]' },
  { country: 'United Kingdom', revenue: '$18.0M', revenueNum: 18.0, percentage: 32, colorClass: 'bg-[#747878]' },
  { country: 'Japan', revenue: '$16.0M', revenueNum: 16.0, percentage: 28, colorClass: 'bg-[#747878]' },
  { country: 'Canada', revenue: '$14.0M', revenueNum: 14.0, percentage: 24, colorClass: 'bg-[#c4c7c7]' },
];

export const PRODUCT_CATEGORIES: CategoryRevenue[] = [
  {
    category: 'Material Handling & Storage',
    description: 'Industrial standard fleet',
    revenue: '$58.2M',
    revenueNum: 58.2,
    growth: '+14%',
  },
  {
    category: 'Heavy Machinery',
    description: 'Hydraulic & electric rigs',
    revenue: '$46.8M',
    revenueNum: 46.8,
    growth: '+8%',
  },
  {
    category: 'Robotics & Automation',
    description: 'Autonomous cell hardware',
    revenue: '$41.5M',
    revenueNum: 41.5,
    growth: '+29%',
  },
  {
    category: 'Safety & Compliance',
    description: 'Sensors, interlocks, monitoring',
    revenue: '$22.4M',
    revenueNum: 22.4,
    growth: '+18%',
  },
  {
    category: 'Tools & Maintenance',
    description: 'Operational maintenance consumables',
    revenue: '$15.3M',
    revenueNum: 15.3,
    growth: '+6%',
  },
];

export const QUARTERLY_TARGETS: QuarterlyTarget[] = [
  {
    quarter: '2025 Q1',
    percentage: 102.5,
    attainmentLabel: '102.5%',
    actualVsTarget: '$43.1M / $42.0M',
  },
  {
    quarter: '2025 Q2',
    percentage: 104.2,
    attainmentLabel: '104.2%',
    actualVsTarget: '$46.9M / $45.0M',
  },
  {
    quarter: '2025 Q3',
    percentage: 101.8,
    attainmentLabel: '101.8%',
    actualVsTarget: '$48.9M / $48.0M',
  },
  {
    quarter: '2025 Q4 (In Progress)',
    percentage: 92.4,
    attainmentLabel: '92.4% Run',
    actualVsTarget: '$45.3M / $49.0M',
    isForecast: true,
  },
];

export const SCHEMA_COLUMNS: SchemaColumn[] = [
  {
    name: 'NetRevenueUSD',
    type: 'NUM',
    category: 'Calculated',
    dataType: 'DECIMAL(18,2)',
    description: 'Primary aggregated monetization metric realized in accounting currency',
  },
  {
    name: 'GrossMarginUSD',
    type: 'NUM',
    category: 'Calculated',
    dataType: 'DECIMAL(18,2)',
    description: 'Net Revenue minus Unit Cost base',
  },
  {
    name: 'GrossMarginPercent',
    type: 'PCT',
    category: 'Calculated',
    dataType: 'DECIMAL(5,4)',
    description: 'Margin ratio computed per row partition',
  },
  {
    name: 'DiscountPercent',
    type: 'PCT',
    category: 'Calculated',
    dataType: 'DECIMAL(5,4)',
    description: 'Negotiated discount applied to master SKU list price',
  },
  {
    name: 'Quantity',
    type: 'INT',
    category: 'Metric',
    dataType: 'INTEGER',
    description: 'Physical units sold or booked under confirmed sales order',
  },
  {
    name: 'UnitCostUSD',
    type: 'NUM',
    category: 'Metric',
    dataType: 'DECIMAL(18,2)',
    description: 'Standard bill-of-materials manufacturing cost in USD',
  },
  {
    name: 'Region',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(30)',
    description: 'Global operating theater: North America, EMEA, APAC, Latin America',
  },
  {
    name: 'Country',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(50)',
    description: 'Sovereign billing territory ISO country code',
  },
  {
    name: 'Category',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(60)',
    description: 'Core industrial cluster group (e.g. Robotics, Machinery)',
  },
  {
    name: 'Product',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(100)',
    description: 'Material Master product descriptor string',
  },
  {
    name: 'SalesQuarter',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'VARCHAR(8)',
    description: 'Fiscal period cohort (e.g., 2025-Q1, 2024-Q3)',
  },
  {
    name: 'MonthLabel',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'VARCHAR(12)',
    description: 'Calendar month label (e.g., Jan 24, Oct 24, Dec 25)',
  },
  {
    name: 'CustomerSegment',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(50)',
    description: 'Enterprise, Mid-Market, SMB, Public Sector tier classification',
  },
  {
    name: 'ContractDurationMonths',
    type: 'INT',
    category: 'Dimension',
    dataType: 'INTEGER',
    description: 'Commitment term in months (12 - 60)',
  },
  {
    name: 'DistributionChannel',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'NVARCHAR(40)',
    description: 'Direct Enterprise, Value-Added Reseller (VAR), OEM Partner, Digital',
  },
  {
    name: 'PaymentTerms',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'VARCHAR(20)',
    description: 'Net 30, Net 60, Net 90, Milestone Advance',
  },
  {
    name: 'TaxRatePercent',
    type: 'PCT',
    category: 'Metric',
    dataType: 'DECIMAL(5,4)',
    description: 'Local sovereign jurisdiction VAT or Sales Tax rate',
  },
  {
    name: 'LandedFreightUSD',
    type: 'NUM',
    category: 'Metric',
    dataType: 'DECIMAL(14,2)',
    description: 'Maritime, air freight, or intermodal logistics allocation',
  },
  {
    name: 'OrderNumber',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'VARCHAR(32)',
    description: 'SAP S/4HANA Sales Order Document UUID',
  },
  {
    name: 'SalesDate',
    type: 'DIM',
    category: 'Dimension',
    dataType: 'DATE',
    description: 'Ledger realization posting timestamp',
  },
];

export const SAMPLE_RECORDS = [
  {
    orderNumber: 'ORD-2024-8841',
    salesDate: '2024-10-14',
    region: 'North America',
    category: 'Enterprise Cloud Suite',
    netRevenue: '$48,250.00',
    grossMarginPercent: '38.4%',
  },
  {
    orderNumber: 'ORD-2024-8842',
    salesDate: '2024-10-14',
    region: 'EMEA',
    category: 'AI Core Copilot Seats',
    netRevenue: '$12,400.00',
    grossMarginPercent: '62.1%',
  },
  {
    orderNumber: 'ORD-2024-8843',
    salesDate: '2024-10-15',
    region: 'APAC',
    category: 'HANA DB Vectors Add-on',
    netRevenue: '$96,000.00',
    grossMarginPercent: '44.8%',
  },
  {
    orderNumber: 'ORD-2024-8844',
    salesDate: '2024-10-15',
    region: 'North America',
    category: 'Managed Integration Bridge',
    netRevenue: '$18,900.00',
    grossMarginPercent: '51.2%',
  },
  {
    orderNumber: 'ORD-2024-8845',
    salesDate: '2024-10-16',
    region: 'Latin America',
    category: 'Consulting Enablement Sprint',
    netRevenue: '$34,500.00',
    grossMarginPercent: '29.0%',
  },
];

export const SQL_QUERY_RESULTS = [
  {
    category: 'Material Handling',
    netRevenue: 58240110,
    grossMargin: 18636835,
    avgMarginPct: 32.0,
    attainment: 94,
    colorClass: 'bg-[#1a1c1b]',
  },
  {
    category: 'Heavy Machinery',
    netRevenue: 46810400,
    grossMargin: 13574016,
    avgMarginPct: 29.0,
    attainment: 78,
    colorClass: 'bg-[#5e5e5e]',
  },
  {
    category: 'Robotics & Automation',
    netRevenue: 41520900,
    grossMargin: 15944025,
    avgMarginPct: 38.4,
    attainment: 86,
    colorClass: 'bg-[#1c1b1b]',
  },
  {
    category: 'Safety & Compliance',
    netRevenue: 22410200,
    grossMargin: 7843570,
    avgMarginPct: 35.0,
    attainment: 52,
    colorClass: 'bg-[#747878]',
  },
  {
    category: 'Industrial Tools',
    netRevenue: 15290000,
    grossMargin: 4128300,
    avgMarginPct: 27.0,
    attainment: 39,
    colorClass: 'bg-[#c4c7c7]',
  },
];
