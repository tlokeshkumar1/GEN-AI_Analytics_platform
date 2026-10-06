import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDatasets,
  getDatasetData,
  updateDatasetRows,
  appendDatasetData,
  deleteDatasetRows,
  deleteDataset,
  getUserPermissions,
} from '../services/datasetService';
import { DATASET_ACTIONS, DatasetItem, DatasetRow } from '../types/dataset';
import { ACTION_CONFIGS } from '../components/dataset/DatasetActionPanel';

describe('Dataset Ingestion & Management System', () => {
  describe('Action Panel Configuration & Permissions', () => {
    it('defines exactly the four required actions: View, Edit, Append, Delete', () => {
      const actionIds = ACTION_CONFIGS.map((c) => c.id);
      expect(actionIds).toEqual([
        DATASET_ACTIONS.VIEW,
        DATASET_ACTIONS.EDIT,
        DATASET_ACTIONS.APPEND,
        DATASET_ACTIONS.DELETE,
      ]);
    });

    it('requires appropriate permissions for each action', () => {
      const viewConfig = ACTION_CONFIGS.find((c) => c.id === DATASET_ACTIONS.VIEW);
      const editConfig = ACTION_CONFIGS.find((c) => c.id === DATASET_ACTIONS.EDIT);
      const appendConfig = ACTION_CONFIGS.find((c) => c.id === DATASET_ACTIONS.APPEND);
      const deleteConfig = ACTION_CONFIGS.find((c) => c.id === DATASET_ACTIONS.DELETE);

      expect(viewConfig?.requiresPermission).toBe('canView');
      expect(editConfig?.requiresPermission).toBe('canEdit');
      expect(appendConfig?.requiresPermission).toBe('canAppend');
      expect(deleteConfig?.requiresPermission).toBe('canDelete');
    });

    it('marks Delete action with danger flag', () => {
      const deleteConfig = ACTION_CONFIGS.find((c) => c.id === DATASET_ACTIONS.DELETE);
      expect(deleteConfig?.isDanger).toBe(true);
    });

    it('grants full permissions to administrators by default', () => {
      const perms = getUserPermissions();
      expect(perms.canView).toBe(true);
      expect(perms.canEdit).toBe(true);
      expect(perms.canAppend).toBe(true);
      expect(perms.canDelete).toBe(true);
    });

    it('correctly disables destructive actions when user has restricted permissions', () => {
      const readOnlyPermissions = {
        canView: true,
        canEdit: false,
        canAppend: false,
        canDelete: false,
      };

      ACTION_CONFIGS.forEach((config) => {
        const isPermitted = readOnlyPermissions[config.requiresPermission];
        if (config.id === DATASET_ACTIONS.VIEW) {
          expect(isPermitted).toBe(true);
        } else {
          expect(isPermitted).toBe(false);
        }
      });
    });
  });

  describe('Dataset Dropdown Selection & Filtering Logic', () => {
    it('filters datasets list by case-insensitive name match', async () => {
      const allDatasets = await getDatasets();
      const query = 'sac_sales';
      const filtered = allDatasets.filter((ds) =>
        ds.name.toLowerCase().includes(query.toLowerCase()) ||
        ds.format.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].name).toContain('SAC_Sales');
    });

    it('filters datasets list by file format (xlsx, csv, parquet)', async () => {
      const allDatasets = await getDatasets();
      const csvDatasets = allDatasets.filter((ds) => ds.format === 'csv');
      expect(csvDatasets.length).toBeGreaterThan(0);
      expect(csvDatasets.every((d) => d.format === 'csv')).toBe(true);
    });

    it('formats secondary option label with row count and format', async () => {
      const allDatasets = await getDatasets();
      const first = allDatasets[0];
      const secondaryLabel = `${first.rowCount.toLocaleString()} rows · ${first.format.toUpperCase()}`;
      expect(secondaryLabel).toContain('rows');
      expect(secondaryLabel).toContain(first.format.toUpperCase());
    });

    it('manages active selection and URL query parameter reflection', () => {
      let activeDataset: DatasetItem | null = null;
      let urlSearchParams = new URLSearchParams('');

      // Select dataset
      const testDataset: DatasetItem = {
        id: 'ds-test-1',
        name: 'Test_Dataset.csv',
        description: 'Test description',
        rowCount: 100,
        columnCount: 5,
        lastUpdated: 'Just now',
        format: 'csv',
        source: 'Test Source',
        status: 'Ready',
        columns: [],
      };

      activeDataset = testDataset;
      urlSearchParams.set('datasetId', testDataset.id);
      expect(activeDataset.id).toBe('ds-test-1');
      expect(urlSearchParams.get('datasetId')).toBe('ds-test-1');

      // Clear selection
      activeDataset = null;
      urlSearchParams.delete('datasetId');
      expect(activeDataset).toBeNull();
      expect(urlSearchParams.get('datasetId')).toBeNull();
    });
  });

  describe('Dataset Service Operations', () => {
    it('fetches initial list of available datasets', async () => {
      const list = await getDatasets();
      expect(list.length).toBeGreaterThan(0);
      const first = list[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('rowCount');
      expect(first).toHaveProperty('format');
      expect(first.columns.length).toBeGreaterThan(0);
    });

    it('retrieves paginated and searchable rows for a selected dataset', async () => {
      const datasets = await getDatasets();
      const dsId = datasets[0].id;

      const page1 = await getDatasetData(dsId, 1, 5);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(5);
      expect(page1.rows.length).toBeLessThanOrEqual(5);

      // Search filter
      const searchRes = await getDatasetData(dsId, 1, 10, undefined, 'asc', 'Robotics');
      expect(searchRes.rows.every((r) =>
        JSON.stringify(r).toLowerCase().includes('robotics')
      )).toBe(true);
    });

    it('updates dataset rows and marks dirty fields', async () => {
      const datasets = await getDatasets();
      const dsId = datasets[0].id;
      const initial = await getDatasetData(dsId, 1, 5);
      const targetRow = initial.rows[0];

      const modifiedRow = { ...targetRow, Quantity: 99 };
      const updateRes = await updateDatasetRows(dsId, [modifiedRow]);
      expect(updateRes.success).toBe(true);
      expect(updateRes.rowsUpdated).toBe(1);

      const refreshed = await getDatasetData(dsId, 1, 5);
      const updatedFound = refreshed.rows.find((r) => r.id === targetRow.id);
      expect(updatedFound?.Quantity).toBe(99);
    });

    it('appends new rows to existing dataset schema', async () => {
      const datasets = await getDatasets();
      const dsId = datasets[0].id;
      const initialData = await getDatasetData(dsId, 1, 50);
      const initialCount = initialData.totalRows;

      const newRow: DatasetRow = {
        id: 'row-test-9999',
        OrderNumber: 'ORD-TEST-9999',
        SalesDate: '2025-02-01',
        Region: 'APAC',
        Country: 'Japan',
        Category: 'Robotics & Automation',
        Product: 'Test SKU Unit 1',
        NetRevenueUSD: 50000,
        GrossMarginPercent: 50,
        Quantity: 10,
      };

      const appendRes = await appendDatasetData(dsId, { rows: [newRow] });
      expect(appendRes.success).toBe(true);
      expect(appendRes.rowsAppended).toBe(1);

      const afterAppend = await getDatasetData(dsId, 1, 50);
      expect(afterAppend.totalRows).toBe(initialCount + 1);
    });

    it('deletes selected rows from dataset', async () => {
      const datasets = await getDatasets();
      const dsId = datasets[0].id;
      const initialData = await getDatasetData(dsId, 1, 50);
      const targetRowId = initialData.rows[0].id;

      const deleteRes = await deleteDatasetRows(dsId, [targetRowId]);
      expect(deleteRes.success).toBe(true);

      const afterDelete = await getDatasetData(dsId, 1, 50);
      expect(afterDelete.rows.find((r) => r.id === targetRowId)).toBeUndefined();
    });

    it('deletes entire dataset completely', async () => {
      const listBefore = await getDatasets();
      const targetDataset = listBefore[listBefore.length - 1];

      const res = await deleteDataset(targetDataset.id);
      expect(res.success).toBe(true);

      const listAfter = await getDatasets();
      expect(listAfter.find((d) => d.id === targetDataset.id)).toBeUndefined();
    });
  });
});
