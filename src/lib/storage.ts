import { openDB, IDBPDatabase } from 'idb';
import { Workshop, Shop, InventoryItem, Transaction, Settings } from '../types';

const DB_NAME = 'AurumLedgerDB';
const DB_VERSION = 1;
const SNAPSHOTS_STORAGE_KEY = 'aurum_gold_backup_snapshots';

export interface DBModel {
  workshops: Workshop;
  shops: Shop;
  inventory: InventoryItem;
  transactions: Transaction;
  settings: Settings;
}

export interface BackupSnapshot {
  id: string;
  label: string;
  createdAt: string;
  isPreDemoSeed?: boolean;
  counts: {
    workshops: number;
    shops: number;
    inventory: number;
    transactions: number;
  };
  data: {
    workshops: Workshop[];
    shops: Shop[];
    inventory: InventoryItem[];
    transactions: Transaction[];
  };
}

class StorageRepository {
  private dbPromise: Promise<IDBPDatabase<any>>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workshops')) db.createObjectStore('workshops', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('shops')) db.createObjectStore('shops', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      },
    });
  }

  async getAll<K extends keyof DBModel>(store: K): Promise<DBModel[K][]> {
    const db = await this.dbPromise;
    return db.getAll(store);
  }

  async getById<K extends keyof DBModel>(store: K, id: string): Promise<DBModel[K] | undefined> {
    const db = await this.dbPromise;
    return db.get(store, id);
  }

  async save<K extends keyof DBModel>(store: K, data: DBModel[K]): Promise<void> {
    const db = await this.dbPromise;
    await db.put(store, data);
  }

  async delete<K extends keyof DBModel>(store: K, id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(store, id);
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const stores = ['workshops', 'shops', 'inventory', 'transactions'];
    const tx = db.transaction(stores, 'readwrite');
    for (const s of stores) {
      await tx.objectStore(s).clear();
    }
    await tx.done;
  }

  // --- Automatic Snapshots & Backup System ---

  async createSnapshot(label: string = 'نسخة تلقائية', isPreDemoSeed: boolean = false): Promise<BackupSnapshot | null> {
    try {
      const [workshops, shops, inventory, transactions] = await Promise.all([
        this.getAll('workshops'),
        this.getAll('shops'),
        this.getAll('inventory'),
        this.getAll('transactions'),
      ]);

      // If database is completely empty and not a specific manual save, skip empty snapshots
      const totalRecords = workshops.length + shops.length + inventory.length + transactions.length;
      if (totalRecords === 0 && !isPreDemoSeed) {
        return null;
      }

      const snapshot: BackupSnapshot = {
        id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        label,
        createdAt: new Date().toISOString(),
        isPreDemoSeed,
        counts: {
          workshops: workshops.length,
          shops: shops.length,
          inventory: inventory.length,
          transactions: transactions.length,
        },
        data: {
          workshops,
          shops,
          inventory,
          transactions,
        },
      };

      const existingSnapshots = this.getSnapshots();
      // Keep up to 20 most recent snapshots
      const updated = [snapshot, ...existingSnapshots.filter(s => s.id !== snapshot.id)].slice(0, 20);
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));

      return snapshot;
    } catch (e) {
      console.error('Failed to create snapshot:', e);
      return null;
    }
  }

  getSnapshots(): BackupSnapshot[] {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse snapshots from localStorage:', e);
      return [];
    }
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const snapshots = this.getSnapshots();
      const target = snapshots.find(s => s.id === snapshotId);
      if (!target) return false;

      // Save a safety snapshot of current state before replacing
      await this.createSnapshot('نسخة أمان قبل الاسترجاع');

      const db = await this.dbPromise;
      const stores = ['workshops', 'shops', 'inventory', 'transactions'];
      const tx = db.transaction(stores, 'readwrite');

      for (const s of stores) {
        await tx.objectStore(s).clear();
      }

      for (const w of target.data.workshops || []) {
        await tx.objectStore('workshops').put(w);
      }
      for (const s of target.data.shops || []) {
        await tx.objectStore('shops').put(s);
      }
      for (const i of target.data.inventory || []) {
        await tx.objectStore('inventory').put(i);
      }
      for (const t of target.data.transactions || []) {
        await tx.objectStore('transactions').put(t);
      }

      await tx.done;
      return true;
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
      return false;
    }
  }

  async exportDatabaseToJSON(): Promise<string> {
    const [workshops, shops, inventory, transactions] = await Promise.all([
      this.getAll('workshops'),
      this.getAll('shops'),
      this.getAll('inventory'),
      this.getAll('transactions'),
    ]);

    const backupPayload = {
      app: 'AurumLedger',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      counts: {
        workshops: workshops.length,
        shops: shops.length,
        inventory: inventory.length,
        transactions: transactions.length,
      },
      data: {
        workshops,
        shops,
        inventory,
        transactions,
      },
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  async importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string; counts?: any }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || typeof parsed.data !== 'object') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح (بيانات مفقودة)' };
      }

      // Save safety snapshot before import
      await this.createSnapshot('نسخة أمان قبل الاستيراد');

      const db = await this.dbPromise;
      const stores = ['workshops', 'shops', 'inventory', 'transactions'];
      const tx = db.transaction(stores, 'readwrite');

      for (const s of stores) {
        await tx.objectStore(s).clear();
      }

      const ws = Array.isArray(parsed.data.workshops) ? parsed.data.workshops : [];
      const sh = Array.isArray(parsed.data.shops) ? parsed.data.shops : [];
      const inv = Array.isArray(parsed.data.inventory) ? parsed.data.inventory : [];
      const tr = Array.isArray(parsed.data.transactions) ? parsed.data.transactions : [];

      for (const w of ws) await tx.objectStore('workshops').put(w);
      for (const s of sh) await tx.objectStore('shops').put(s);
      for (const i of inv) await tx.objectStore('inventory').put(i);
      for (const t of tr) await tx.objectStore('transactions').put(t);

      await tx.done;

      return {
        success: true,
        message: 'تم استرجاع النسخة الاحتياطية بنجاح',
        counts: {
          workshops: ws.length,
          shops: sh.length,
          inventory: inv.length,
          transactions: tr.length,
        },
      };
    } catch (e: any) {
      return { success: false, message: 'خطأ في معالجة ملف النسخة الاحتياطية: ' + (e?.message || 'تنسيق غير صالح') };
    }
  }
}

export const repository = new StorageRepository();
