import { supabase } from './supabase';
import { Workshop, Shop, InventoryItem, Transaction, Karat } from '../types';

const SNAPSHOTS_STORAGE_KEY = 'aurum_gold_backup_snapshots';

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

// Helper: Convert DB row to Workshop
function rowToWorkshop(row: any): Workshop {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    address: row.address || undefined,
    goldBalances: row.gold_balances || { 18: 0, 21: 0, 22: 0, 24: 0 },
    laborBalance: Number(row.labor_balance) || 0,
  };
}

// Helper: Convert DB row to Shop
function rowToShop(row: any): Shop {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    address: row.address || undefined,
    goldBalances: row.gold_balances || { 18: 0, 21: 0, 22: 0, 24: 0 },
    laborBalance: Number(row.labor_balance) || 0,
    workshopDueBalance: Number(row.workshop_due_balance) || 0,
    profitBalance: Number(row.profit_balance) || 0,
  };
}

class SupabaseStorageRepository {

  // ==================== WORKSHOPS ====================
  async getAllWorkshops(): Promise<Workshop[]> {
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workshops:', error);
      return [];
    }
    return (data || []).map(rowToWorkshop);
  }

  async getWorkshopById(id: string): Promise<Workshop | undefined> {
    const { data, error } = await supabase
      .from('workshops')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return rowToWorkshop(data);
  }

  async saveWorkshop(workshop: Workshop): Promise<void> {
    const { error } = await supabase
      .from('workshops')
      .upsert({
        id: workshop.id,
        name: workshop.name,
        phone: workshop.phone || null,
        address: workshop.address || null,
        gold_balances: workshop.goldBalances,
        labor_balance: workshop.laborBalance,
      }, { onConflict: 'id' });

    if (error) console.error('Error saving workshop:', error);
  }

  async deleteWorkshop(id: string): Promise<void> {
    const { error } = await supabase.from('workshops').delete().eq('id', id);
    if (error) console.error('Error deleting workshop:', error);
  }

  // ==================== SHOPS ====================
  async getAllShops(): Promise<Shop[]> {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching shops:', error);
      return [];
    }
    return (data || []).map(rowToShop);
  }

  async getShopById(id: string): Promise<Shop | undefined> {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return rowToShop(data);
  }

  async saveShop(shop: Shop): Promise<void> {
    const { error } = await supabase
      .from('shops')
      .upsert({
        id: shop.id,
        name: shop.name,
        phone: shop.phone || null,
        address: shop.address || null,
        gold_balances: shop.goldBalances,
        labor_balance: shop.laborBalance,
        workshop_due_balance: shop.workshopDueBalance,
        profit_balance: shop.profitBalance,
      }, { onConflict: 'id' });

    if (error) console.error('Error saving shop:', error);
  }

  async deleteShop(id: string): Promise<void> {
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) console.error('Error deleting shop:', error);
  }

  // ==================== INVENTORY ====================
  async getAllInventory(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
    return (data || []).map(row => ({ ...row.data, id: row.id } as InventoryItem));
  }

  async getInventoryById(id: string): Promise<InventoryItem | undefined> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return { ...data.data, id: data.id } as InventoryItem;
  }

  async saveInventory(item: InventoryItem): Promise<void> {
    const { id, ...rest } = item;
    const { error } = await supabase
      .from('inventory')
      .upsert({
        id,
        data: rest,
      }, { onConflict: 'id' });

    if (error) console.error('Error saving inventory:', error);
  }

  async deleteInventory(id: string): Promise<void> {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) console.error('Error deleting inventory:', error);
  }

  // ==================== TRANSACTIONS ====================
  async getAllTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return (data || []).map(row => ({ ...row.data, id: row.id } as Transaction));
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return { ...data.data, id: data.id } as Transaction;
  }

  async saveTransaction(tx: Transaction): Promise<void> {
    const { id, ...rest } = tx;
    const { error } = await supabase
      .from('transactions')
      .upsert({
        id,
        data: rest,
      }, { onConflict: 'id' });

    if (error) console.error('Error saving transaction:', error);
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) console.error('Error deleting transaction:', error);
  }

  // ==================== GENERIC METHODS (matching old API) ====================

  async getAll(store: string): Promise<any[]> {
    switch (store) {
      case 'workshops': return this.getAllWorkshops();
      case 'shops': return this.getAllShops();
      case 'inventory': return this.getAllInventory();
      case 'transactions': return this.getAllTransactions();
      default: return [];
    }
  }

  async getById(store: string, id: string): Promise<any | undefined> {
    switch (store) {
      case 'workshops': return this.getWorkshopById(id);
      case 'shops': return this.getShopById(id);
      case 'inventory': return this.getInventoryById(id);
      case 'transactions': return this.getTransactionById(id);
      default: return undefined;
    }
  }

  async save(store: string, data: any): Promise<void> {
    switch (store) {
      case 'workshops': return this.saveWorkshop(data);
      case 'shops': return this.saveShop(data);
      case 'inventory': return this.saveInventory(data);
      case 'transactions': return this.saveTransaction(data);
    }
  }

  async delete(store: string, id: string): Promise<void> {
    switch (store) {
      case 'workshops': return this.deleteWorkshop(id);
      case 'shops': return this.deleteShop(id);
      case 'inventory': return this.deleteInventory(id);
      case 'transactions': return this.deleteTransaction(id);
    }
  }

  async clearAll(): Promise<void> {
    // Delete all data for current user
    await Promise.all([
      supabase.from('workshops').delete().neq('id', ''),
      supabase.from('shops').delete().neq('id', ''),
      supabase.from('inventory').delete().neq('id', ''),
      supabase.from('transactions').delete().neq('id', ''),
    ]);
  }

  // --- Snapshots (still localStorage for speed) ---

  async createSnapshot(label: string = 'نسخة تلقائية', isPreDemoSeed: boolean = false): Promise<BackupSnapshot | null> {
    try {
      const [workshops, shops, inventory, transactions] = await Promise.all([
        this.getAllWorkshops(),
        this.getAllShops(),
        this.getAllInventory(),
        this.getAllTransactions(),
      ]);

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

      // Clear all current data
      await this.clearAll();

      // Restore data
      for (const w of target.data.workshops || []) {
        await this.saveWorkshop(w);
      }
      for (const s of target.data.shops || []) {
        await this.saveShop(s);
      }
      for (const i of target.data.inventory || []) {
        await this.saveInventory(i);
      }
      for (const t of target.data.transactions || []) {
        await this.saveTransaction(t);
      }

      return true;
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
      return false;
    }
  }

  async exportDatabaseToJSON(): Promise<string> {
    const [workshops, shops, inventory, transactions] = await Promise.all([
      this.getAllWorkshops(),
      this.getAllShops(),
      this.getAllInventory(),
      this.getAllTransactions(),
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

      // Clear all
      await this.clearAll();

      const ws = Array.isArray(parsed.data.workshops) ? parsed.data.workshops : [];
      const sh = Array.isArray(parsed.data.shops) ? parsed.data.shops : [];
      const inv = Array.isArray(parsed.data.inventory) ? parsed.data.inventory : [];
      const tr = Array.isArray(parsed.data.transactions) ? parsed.data.transactions : [];

      for (const w of ws) await this.saveWorkshop(w);
      for (const s of sh) await this.saveShop(s);
      for (const i of inv) await this.saveInventory(i);
      for (const t of tr) await this.saveTransaction(t);

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

export const repository = new SupabaseStorageRepository();
