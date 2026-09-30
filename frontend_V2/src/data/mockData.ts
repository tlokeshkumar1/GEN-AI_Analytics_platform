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
  { id: 'prod-1', name: 'Industrial Robotic Arm X-400', category: 'Robotics & Automation', unitsSold: 4820, netRevenue: 34222000, netRevenueFormatted: '$34.2M', volumeWeight: 100, marginStatus: 48.2, statusColor: 'bg-[#7C3AED]', skuCode: 'SKU-ROB-400X', region: 'North America' },
  { id: 'prod-2', name: 'Heavy Forklift H-90 Tier-4', category: 'Material Handling & Storage', unitsSold: 1940, netRevenue: 26400000, netRevenueFormatted: '$26.4M', volumeWeight: 77, marginStatus: 41.0, statusColor: 'bg-[#2563EB]', skuCode: 'SKU-FLT-H90T4', region: 'EMEA' },
  { id: 'prod-3', name: 'Automated Sorting System Pro', category: 'Robotics & Automation', unitsSold: 820, netRevenue: 19800000, netRevenueFormatted: '$19.8M', volumeWeight: 58, marginStatus: 45.7, statusColor: 'bg-[#6366F1]', skuCode: 'SKU-SRT-PRO9', region: 'APAC' },
  { id: 'prod-4', name: 'Autonomous Guided Vehicle AGV-12', category: 'Material Handling & Storage', unitsSold: 1240, netRevenue: 16500000, netRevenueFormatted: '$16.5M', volumeWeight: 48, marginStatus: 43.5, statusColor: 'bg-[#4F46E5]', skuCode: 'SKU-AGV-12B', region: 'EMEA' },
  { id: 'prod-5', name: 'Hydraulic Press HP-500 Electric', category: 'Heavy Machinery', unitsSold: 610, netRevenue: 14200000, netRevenueFormatted: '$14.2M', volumeWeight: 42, marginStatus: 34.8, statusColor: 'bg-[#3B82F6]', skuCode: 'SKU-PRS-HP500', region: 'North America' },
  { id: 'prod-6', name: 'Safety Sensor Matrix 4 Enterprise', category: 'Safety & Compliance', unitsSold: 32400, netRevenue: 12800000, netRevenueFormatted: '$12.8M', volumeWeight: 37, marginStatus: 38.4, statusColor: 'bg-[#0F766E]', skuCode: 'SKU-SNS-M4ENT', region: 'North America' },
  { id: 'prod-7', name: 'Pneumatic Torque System PTX', category: 'Tools & Maintenance', unitsSold: 14200, netRevenue: 11600000, netRevenueFormatted: '$11.6M', volumeWeight: 34, marginStatus: 36.1, statusColor: 'bg-[#0891B2]', skuCode: 'SKU-TRQ-PTX88', region: 'Latin America' },
  { id: 'prod-8', name: 'Precision Laser Cutter L-900', category: 'Heavy Machinery', unitsSold: 430, netRevenue: 9800000, netRevenueFormatted: '$9.8M', volumeWeight: 29, marginStatus: 42.0, statusColor: 'bg-[#2563EB]', skuCode: 'SKU-LSR-L900', region: 'EMEA' },
  { id: 'prod-9', name: 'Smart Conveyor Belt SC-50', category: 'Material Handling & Storage', unitsSold: 2890, netRevenue: 8900000, netRevenueFormatted: '$8.9M', volumeWeight: 26, marginStatus: 39.5, statusColor: 'bg-[#6366F1]', skuCode: 'SKU-CNV-SC50', region: 'APAC' },
  { id: 'prod-10', name: 'CNC Milling Workstation M-8', category: 'Heavy Machinery', unitsSold: 380, netRevenue: 8400000, netRevenueFormatted: '$8.4M', volumeWeight: 25, marginStatus: 44.1, statusColor: 'bg-[#7C3AED]', skuCode: 'SKU-CNC-M800', region: 'North America' },
  { id: 'prod-11', name: 'Automated Pallet Wrapper PW-2', category: 'Material Handling & Storage', unitsSold: 750, netRevenue: 7600000, netRevenueFormatted: '$7.6M', volumeWeight: 22, marginStatus: 37.8, statusColor: 'bg-[#0F766E]', skuCode: 'SKU-PLT-PW20', region: 'EMEA' },
  { id: 'prod-12', name: 'Optical Vision Sorting Matrix', category: 'Robotics & Automation', unitsSold: 620, netRevenue: 6900000, netRevenueFormatted: '$6.9M', volumeWeight: 20, marginStatus: 46.2, statusColor: 'bg-[#0891B2]', skuCode: 'SKU-OPT-VSM1', region: 'APAC' },
  { id: 'prod-13', name: 'Electric Reach Truck ER-14', category: 'Material Handling & Storage', unitsSold: 890, netRevenue: 6400000, netRevenueFormatted: '$6.4M', volumeWeight: 19, marginStatus: 40.5, statusColor: 'bg-[#4F46E5]', skuCode: 'SKU-TRK-ER14', region: 'North America' },
  { id: 'prod-14', name: 'Robotic Welding Cell W-300', category: 'Robotics & Automation', unitsSold: 310, netRevenue: 5900000, netRevenueFormatted: '$5.9M', volumeWeight: 17, marginStatus: 48.0, statusColor: 'bg-[#3B82F6]', skuCode: 'SKU-WLD-W300', region: 'EMEA' },
  { id: 'prod-15', name: 'Heavy Stacker Crane SC-200', category: 'Material Handling & Storage', unitsSold: 260, netRevenue: 5400000, netRevenueFormatted: '$5.4M', volumeWeight: 16, marginStatus: 35.6, statusColor: 'bg-[#2563EB]', skuCode: 'SKU-CRN-SC20', region: 'APAC' },
  { id: 'prod-16', name: 'Industrial Dust Collector DC-4', category: 'Safety & Compliance', unitsSold: 1850, netRevenue: 4900000, netRevenueFormatted: '$4.9M', volumeWeight: 14, marginStatus: 39.0, statusColor: 'bg-[#6366F1]', skuCode: 'SKU-DST-DC40', region: 'North America' },
  { id: 'prod-17', name: 'Vibration Analysis Sensor Pack', category: 'Safety & Compliance', unitsSold: 8200, netRevenue: 4500000, netRevenueFormatted: '$4.5M', volumeWeight: 13, marginStatus: 47.1, statusColor: 'bg-[#7C3AED]', skuCode: 'SKU-VIB-SENS', region: 'EMEA' },
  { id: 'prod-18', name: 'Automated Storage AS-RS 100', category: 'Material Handling & Storage', unitsSold: 180, netRevenue: 4200000, netRevenueFormatted: '$4.2M', volumeWeight: 12, marginStatus: 41.8, statusColor: 'bg-[#0F766E]', skuCode: 'SKU-ASRS-100', region: 'North America' },
  { id: 'prod-19', name: 'Electric Scissor Lift SL-40', category: 'Heavy Machinery', unitsSold: 940, netRevenue: 3900000, netRevenueFormatted: '$3.9M', volumeWeight: 11, marginStatus: 38.0, statusColor: 'bg-[#0891B2]', skuCode: 'SKU-LFT-SL40', region: 'Latin America' },
  { id: 'prod-20', name: 'Thermal Imaging Inspection Rig', category: 'Safety & Compliance', unitsSold: 520, netRevenue: 3600000, netRevenueFormatted: '$3.6M', volumeWeight: 10, marginStatus: 43.2, statusColor: 'bg-[#4F46E5]', skuCode: 'SKU-THM-IMG1', region: 'APAC' },
  { id: 'prod-21', name: 'Pneumatic Actuator Fleet PA-8', category: 'Tools & Maintenance', unitsSold: 6400, netRevenue: 3300000, netRevenueFormatted: '$3.3M', volumeWeight: 10, marginStatus: 36.5, statusColor: 'bg-[#3B82F6]', skuCode: 'SKU-ACT-PA80', region: 'North America' },
  { id: 'prod-22', name: 'High-Speed Packaging Bander', category: 'Material Handling & Storage', unitsSold: 710, netRevenue: 3100000, netRevenueFormatted: '$3.1M', volumeWeight: 9, marginStatus: 42.8, statusColor: 'bg-[#2563EB]', skuCode: 'SKU-PKG-HSB1', region: 'EMEA' },
  { id: 'prod-23', name: 'Industrial Battery Power Station', category: 'Tools & Maintenance', unitsSold: 480, netRevenue: 2900000, netRevenueFormatted: '$2.9M', volumeWeight: 8, marginStatus: 40.0, statusColor: 'bg-[#6366F1]', skuCode: 'SKU-PWR-BPS4', region: 'North America' },
  { id: 'prod-24', name: 'Digital Torque Calibrator TC-5', category: 'Tools & Maintenance', unitsSold: 1350, netRevenue: 2700000, netRevenueFormatted: '$2.7M', volumeWeight: 8, marginStatus: 45.0, statusColor: 'bg-[#7C3AED]', skuCode: 'SKU-CAL-TC50', region: 'APAC' },
  { id: 'prod-25', name: 'Ultrasonic Flaw Detector UF-2', category: 'Safety & Compliance', unitsSold: 890, netRevenue: 2500000, netRevenueFormatted: '$2.5M', volumeWeight: 7, marginStatus: 37.0, statusColor: 'bg-[#0F766E]', skuCode: 'SKU-FLW-UF20', region: 'EMEA' },
  { id: 'prod-26', name: 'Automated Guided Tugger AGT-6', category: 'Material Handling & Storage', unitsSold: 420, netRevenue: 2300000, netRevenueFormatted: '$2.3M', volumeWeight: 7, marginStatus: 44.5, statusColor: 'bg-[#0891B2]', skuCode: 'SKU-TUG-AGT6', region: 'North America' },
  { id: 'prod-27', name: 'Modular Roller Table MRT-10', category: 'Material Handling & Storage', unitsSold: 1650, netRevenue: 2100000, netRevenueFormatted: '$2.1M', volumeWeight: 6, marginStatus: 39.2, statusColor: 'bg-[#4F46E5]', skuCode: 'SKU-RLR-MRT1', region: 'APAC' },
  { id: 'prod-28', name: 'Hazardous Gas Monitoring Grid', category: 'Safety & Compliance', unitsSold: 3800, netRevenue: 1950000, netRevenueFormatted: '$1.9M', volumeWeight: 6, marginStatus: 46.0, statusColor: 'bg-[#3B82F6]', skuCode: 'SKU-GAS-MON8', region: 'North America' },
  { id: 'prod-29', name: 'Compact Floor Sweeper FS-30', category: 'Tools & Maintenance', unitsSold: 820, netRevenue: 1800000, netRevenueFormatted: '$1.8M', volumeWeight: 5, marginStatus: 35.0, statusColor: 'bg-[#2563EB]', skuCode: 'SKU-SWP-FS30', region: 'EMEA' },
  { id: 'prod-30', name: 'Safety Light Curtain SLC-100', category: 'Safety & Compliance', unitsSold: 2400, netRevenue: 1650000, netRevenueFormatted: '$1.6M', volumeWeight: 5, marginStatus: 41.5, statusColor: 'bg-[#6366F1]', skuCode: 'SKU-CUR-SLC1', region: 'North America' },
  { id: 'prod-31', name: 'Heavy Duty Baler B-500', category: 'Heavy Machinery', unitsSold: 290, netRevenue: 1500000, netRevenueFormatted: '$1.5M', volumeWeight: 4, marginStatus: 38.8, statusColor: 'bg-[#7C3AED]', skuCode: 'SKU-BAL-B500', region: 'APAC' },
  { id: 'prod-32', name: 'Industrial RFID Portal Reader', category: 'Safety & Compliance', unitsSold: 1100, netRevenue: 1350000, netRevenueFormatted: '$1.3M', volumeWeight: 4, marginStatus: 43.0, statusColor: 'bg-[#0F766E]', skuCode: 'SKU-RFD-PRT2', region: 'EMEA' },
  { id: 'prod-33', name: 'Precision Balancer Matrix', category: 'Tools & Maintenance', unitsSold: 640, netRevenue: 1200000, netRevenueFormatted: '$1.2M', volumeWeight: 3, marginStatus: 36.0, statusColor: 'bg-[#0891B2]', skuCode: 'SKU-BLN-MTX4', region: 'North America' },
  { id: 'prod-34', name: 'Cleanroom Air Filtration Rig', category: 'Safety & Compliance', unitsSold: 350, netRevenue: 1050000, netRevenueFormatted: '$1.0M', volumeWeight: 3, marginStatus: 42.5, statusColor: 'bg-[#4F46E5]', skuCode: 'SKU-AIR-FLT8', region: 'EMEA' },
  { id: 'prod-35', name: 'Wireless IoT Gateway Hub WG-4', category: 'Tools & Maintenance', unitsSold: 4100, netRevenue: 950000, netRevenueFormatted: '$950K', volumeWeight: 3, marginStatus: 47.5, statusColor: 'bg-[#3B82F6]', skuCode: 'SKU-IOT-WG40', region: 'North America' },
];

export const REGIONAL_MARKET_SHARE: RegionData[] = [
  { rank: '#1', name: 'North America', revenue: '$82.4M', percentage: 44.7, colorClass: 'bg-[#2563EB]' },
  { rank: '#2', name: 'Europe (EMEA)', revenue: '$54.1M', percentage: 29.4, colorClass: 'bg-[#4F46E5]' },
  { rank: '#3', name: 'Asia-Pacific', revenue: '$32.8M', percentage: 17.8, colorClass: 'bg-[#0F766E]' },
  { rank: '#4', name: 'Latin America', revenue: '$14.9M', percentage: 8.1, colorClass: 'bg-[#0891B2]' },
];

export const TOP_REVENUE_COUNTRIES: CountryRevenue[] = [
  { country: 'United States', revenue: '$64.2M', revenueNum: 64.2, percentage: 100, colorClass: 'bg-[#2563EB]' },
  { country: 'Germany', revenue: '$38.4M', revenueNum: 38.4, percentage: 60, colorClass: 'bg-[#4F46E5]' },
  { country: 'Japan', revenue: '$26.8M', revenueNum: 26.8, percentage: 42, colorClass: 'bg-[#0F766E]' },
  { country: 'United Kingdom', revenue: '$22.1M', revenueNum: 22.1, percentage: 34, colorClass: 'bg-[#0891B2]' },
  { country: 'Canada', revenue: '$18.2M', revenueNum: 18.2, percentage: 28, colorClass: 'bg-[#059669]' },
  { country: 'France', revenue: '$15.6M', revenueNum: 15.6, percentage: 24, colorClass: 'bg-[#2563EB]' },
  { country: 'Australia', revenue: '$14.1M', revenueNum: 14.1, percentage: 22, colorClass: 'bg-[#4F46E5]' },
  { country: 'Netherlands', revenue: '$12.8M', revenueNum: 12.8, percentage: 20, colorClass: 'bg-[#0F766E]' },
  { country: 'Italy', revenue: '$11.5M', revenueNum: 11.5, percentage: 18, colorClass: 'bg-[#0891B2]' },
  { country: 'Singapore', revenue: '$9.8M', revenueNum: 9.8, percentage: 15, colorClass: 'bg-[#059669]' },
  { country: 'Switzerland', revenue: '$8.9M', revenueNum: 8.9, percentage: 14, colorClass: 'bg-[#2563EB]' },
  { country: 'South Korea', revenue: '$8.2M', revenueNum: 8.2, percentage: 13, colorClass: 'bg-[#4F46E5]' },
  { country: 'Brazil', revenue: '$7.4M', revenueNum: 7.4, percentage: 12, colorClass: 'bg-[#0F766E]' },
  { country: 'Sweden', revenue: '$6.8M', revenueNum: 6.8, percentage: 11, colorClass: 'bg-[#0891B2]' },
  { country: 'Spain', revenue: '$6.1M', revenueNum: 6.1, percentage: 10, colorClass: 'bg-[#059669]' },
  { country: 'India', revenue: '$5.5M', revenueNum: 5.5, percentage: 9, colorClass: 'bg-[#2563EB]' },
  { country: 'Mexico', revenue: '$4.9M', revenueNum: 4.9, percentage: 8, colorClass: 'bg-[#4F46E5]' },
  { country: 'Norway', revenue: '$4.2M', revenueNum: 4.2, percentage: 7, colorClass: 'bg-[#0F766E]' },
];

export const PRODUCT_CATEGORIES: CategoryRevenue[] = [
  { category: 'Material Handling & Storage', description: 'Industrial standard fleet', revenue: '$58.2M', revenueNum: 58.2, growth: '+14%' },
  { category: 'Robotics & Automation', description: 'Autonomous cell hardware', revenue: '$48.9M', revenueNum: 48.9, growth: '+29%' },
  { category: 'Heavy Machinery', description: 'Hydraulic & electric rigs', revenue: '$36.7M', revenueNum: 36.7, growth: '+8%' },
  { category: 'Safety & Compliance', description: 'Sensors, interlocks, monitoring', revenue: '$24.2M', revenueNum: 24.2, growth: '+18%' },
  { category: 'Tools & Maintenance', description: 'Operational maintenance consumables', revenue: '$16.2M', revenueNum: 16.2, growth: '+6%' },
  { category: 'Industrial IoT & Sensors', description: 'Telemetry and edge compute', revenue: '$14.8M', revenueNum: 14.8, growth: '+22%' },
  { category: 'Power & Electrical Fleet', description: 'Industrial substations and batteries', revenue: '$12.6M', revenueNum: 12.6, growth: '+11%' },
  { category: 'Hydraulic Press Systems', description: 'Heavy stamping and forming', revenue: '$10.4M', revenueNum: 10.4, growth: '+5%' },
  { category: 'Logistics & Conveyors', description: 'Intralogistics distribution lanes', revenue: '$8.9M', revenueNum: 8.9, growth: '+15%' },
  { category: 'Precision Instruments', description: 'Metrology and laser calibration', revenue: '$7.5M', revenueNum: 7.5, growth: '+9%' },
  { category: 'Automated Inspection', description: 'Machine vision quality gates', revenue: '$6.2M', revenueNum: 6.2, growth: '+31%' },
  { category: 'Industrial Packaging', description: 'High-throughput wrapping and banding', revenue: '$5.1M', revenueNum: 5.1, growth: '+7%' },
];

export const QUARTERLY_TARGETS: QuarterlyTarget[] = [
  { quarter: '2023 Q1', percentage: 96.2, attainmentLabel: '96.2%', actualVsTarget: '$30.8M / $32.0M' },
  { quarter: '2023 Q2', percentage: 99.7, attainmentLabel: '99.7%', actualVsTarget: '$33.9M / $34.0M' },
  { quarter: '2023 Q3', percentage: 101.4, attainmentLabel: '101.4%', actualVsTarget: '$36.5M / $36.0M' },
  { quarter: '2023 Q4', percentage: 103.5, attainmentLabel: '103.5%', actualVsTarget: '$41.4M / $40.0M' },
  { quarter: '2024 Q1', percentage: 96.5, attainmentLabel: '96.5%', actualVsTarget: '$38.6M / $40.0M' },
  { quarter: '2024 Q2', percentage: 103.3, attainmentLabel: '103.3%', actualVsTarget: '$43.4M / $42.0M' },
  { quarter: '2024 Q3', percentage: 100.2, attainmentLabel: '100.2%', actualVsTarget: '$48.1M / $48.0M' },
  { quarter: '2024 Q4', percentage: 98.4, attainmentLabel: '98.4%', actualVsTarget: '$54.1M / $55.0M' },
  { quarter: '2025 Q1', percentage: 99.8, attainmentLabel: '99.8%', actualVsTarget: '$47.9M / $48.0M' },
  { quarter: '2025 Q2', percentage: 102.7, attainmentLabel: '102.7%', actualVsTarget: '$53.4M / $52.0M' },
  { quarter: '2025 Q3', percentage: 102.5, attainmentLabel: '102.5%', actualVsTarget: '$57.4M / $56.0M' },
  { quarter: '2025 Q4', percentage: 99.7, attainmentLabel: '99.7%', actualVsTarget: '$61.8M / $62.0M', isForecast: true },
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
    colorClass: 'bg-[#2563EB]',
  },
  {
    category: 'Heavy Machinery',
    netRevenue: 46810400,
    grossMargin: 13574016,
    avgMarginPct: 29.0,
    attainment: 78,
    colorClass: 'bg-[#4F46E5]',
  },
  {
    category: 'Robotics & Automation',
    netRevenue: 41520900,
    grossMargin: 15944025,
    avgMarginPct: 38.4,
    attainment: 86,
    colorClass: 'bg-[#7C3AED]',
  },
  {
    category: 'Safety & Compliance',
    netRevenue: 22410200,
    grossMargin: 7843570,
    avgMarginPct: 35.0,
    attainment: 52,
    colorClass: 'bg-[#0F766E]',
  },
  {
    category: 'Industrial Tools',
    netRevenue: 15290000,
    grossMargin: 4128300,
    avgMarginPct: 27.0,
    attainment: 39,
    colorClass: 'bg-[#0891B2]',
  },
];
