// ============================================================
// Voucher System Types
// ============================================================

export interface VoucherSettings {
  id?: string;
  user_id?: string;
  distributor_name: string;
  brand_name: string;
  activity_description: string;
  logo_url?: string | null;
  primary_phone?: string | null;
  secondary_phone?: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  footer_note?: string | null;
  default_paper_size: 'A4' | '58mm';
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_VOUCHER_SETTINGS: VoucherSettings = {
  distributor_name: 'محمد عبد الملك',
  brand_name: 'توزيع الذهب والمجوهرات',
  activity_description: 'توزيع الذهب والمجوهرات',
  logo_url: null,
  primary_phone: null,
  secondary_phone: null,
  whatsapp_number: null,
  address: null,
  footer_note: null,
  default_paper_size: 'A4',
};

// Identity snapshot saved with each archived PDF
export interface VoucherIdentitySnapshot {
  distributor_name: string;
  brand_name: string;
  activity_description: string;
  logo_url?: string | null;
  primary_phone?: string | null;
  secondary_phone?: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  footer_note?: string | null;
}

// Archived PDF record
export interface VoucherPdfRecord {
  id?: string;
  user_id?: string;
  transaction_id: string;
  voucher_number: string;
  storage_path: string;
  identity_snapshot: VoucherIdentitySnapshot;
  created_at?: string;
}

// ============================================================
// CustomerVoucherDTO - ONLY fields allowed to show the customer
// ============================================================
export interface CustomerVoucherItemDTO {
  category: string;
  modelCode: string;
  karat: number;
  netWeight: number;          // وزن صافي الجزء الموزع
  count?: number | null;      // عدد القطع (اختياري)
  shopWagePerGram: number;    // أجرة الجرام على المحل فقط
  totalShopWage: number;      // إجمالي أجور المحل فقط
}

export interface CustomerVoucherDTO {
  voucherNumber: string;
  date: string;
  type: 'DISTRIBUTE_TO_SHOP' | 'COLLECT_FROM_SHOP';

  // Customer info (from shop record, NOT internal workshop data)
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;

  // Items (distribution voucher)
  items?: CustomerVoucherItemDTO[];

  // Summaries (customer-facing only)
  totalWeight?: number;
  totalPieces?: number | null;
  totalShopWages?: number;

  // Collection voucher fields
  collectionSummary?: {
    laborCashAmount?: number;
    paymentMethod?: string;
    scrapGoldWeight?: number;
    scrapGoldKarat?: number;
    goldSettlementWeight?: number;
    goldSettlementCash?: number;
  }[];

  // Balances (customer-facing: gold & labor only - NO profit breakdown)
  previousGoldBalance?: number;
  previousGoldKarat?: number;
  previousLaborBalance?: number;
  newGoldBalance?: number;
  newLaborBalance?: number;

  // Identity at time of issue (from snapshot or live settings)
  identity: VoucherIdentitySnapshot;

  // Archive info
  isArchived?: boolean;
  archivedPath?: string | null;
}

// ============================================================
// Helper: Build CustomerVoucherDTO from transaction data
// NEVER pass full internal Transaction - use this mapper
// ============================================================
export function buildDistributionVoucherDTO(
  transaction: any,
  shop: any,
  identity: VoucherIdentitySnapshot
): CustomerVoucherDTO {
  // Map only allowed fields - strip workshop costs, profits, internal notes
  const items: CustomerVoucherItemDTO[] = (transaction.items || []).map((item: any) => ({
    category: item.category,
    modelCode: item.modelCode,
    karat: item.karat,
    netWeight: item.netWeight,
    count: item.count ?? null,
    shopWagePerGram: item.finalShopWagePerGram ?? item.roundedDerivedWagePerGram ?? 0,
    totalShopWage: item.totalShopWage ?? 0,
    // ❌ NOT included: allocatedWorkshopCost, expectedProfit, derivedWorkshopWagePerGram
    // ❌ NOT included: workshopDocNo (internal), workshopId, notes (internal)
  }));

  const totalWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const totalPieces = items.some(i => i.count != null)
    ? items.reduce((s, i) => s + (i.count || 0), 0)
    : null;
  const totalShopWages = items.reduce((s, i) => s + i.totalShopWage, 0);

  // Gold balance (karat 21 as default if multi-karat)
  const karat = items[0]?.karat ?? 21;
  const previousGoldBalance = shop?.goldBalances?.[karat] ?? 0;
  const previousLaborBalance = shop?.laborBalance ?? 0;

  return {
    voucherNumber: transaction.id,
    date: transaction.date,
    type: 'DISTRIBUTE_TO_SHOP',
    customerName: shop?.name ?? transaction.entityName ?? '---',
    customerPhone: shop?.phone ?? null,
    customerAddress: shop?.address ?? null,
    items,
    totalWeight,
    totalPieces,
    totalShopWages,
    previousGoldBalance,
    previousGoldKarat: karat,
    previousLaborBalance,
    newGoldBalance: (previousGoldBalance ?? 0) + totalWeight,
    newLaborBalance: (previousLaborBalance ?? 0) + totalShopWages,
    identity,
  };
}

// ============================================================
// Helper: Build QuickDistribution CustomerVoucherDTO
// Customer-facing only — NO internal costs, profits, or settlement status
// ============================================================
export function buildQuickDistributionVoucherDTO(
  transaction: any,
  shop: any,
  identity: VoucherIdentitySnapshot
): CustomerVoucherDTO {
  const qd = transaction.quickDistData;
  if (!qd) throw new Error('Missing quickDistData');

  const items: CustomerVoucherItemDTO[] = [{
    category: qd.category,
    modelCode: '',
    karat: qd.karat,
    netWeight: qd.totalNetWeight,
    count: qd.pieceCount ?? null,
    shopWagePerGram: qd.shopWagePerGram,
    totalShopWage: qd.totalShopWage,
  }];

  const karat = qd.karat || 21;
  const previousGoldBalance = shop?.goldBalances?.[karat] ?? 0;
  const previousLaborBalance = shop?.laborBalance ?? 0;

  return {
    voucherNumber: transaction.id,
    date: transaction.date,
    type: 'DISTRIBUTE_TO_SHOP',
    customerName: shop?.name ?? transaction.entityName ?? '---',
    customerPhone: shop?.phone ?? null,
    customerAddress: shop?.address ?? null,
    items,
    totalWeight: qd.totalNetWeight,
    totalPieces: qd.pieceCount ?? null,
    totalShopWages: qd.totalShopWage,
    previousGoldBalance,
    previousGoldKarat: karat,
    previousLaborBalance,
    newGoldBalance: (previousGoldBalance ?? 0) + qd.totalNetWeight,
    newLaborBalance: (previousLaborBalance ?? 0) + qd.totalShopWage,
    identity,
    // ❌ NOT included: workshop costs, profits, settlement status, batch info
  };
}

export function buildCollectionVoucherDTO(
  transaction: any,
  shop: any,
  identity: VoucherIdentitySnapshot
): CustomerVoucherDTO {
  const collectionSummary = (transaction.collectionItems || []).map((item: any) => {
    if (item.type === 'LABOR_CASH') {
      return {
        laborCashAmount: item.laborCashAmount ?? 0,
        paymentMethod: item.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'نقدي',
      };
    }
    if (item.type === 'SCRAP_GOLD') {
      return {
        scrapGoldWeight: item.certifiedEquivalentWeight ?? item.actualScrapWeight ?? 0,
        scrapGoldKarat: item.dueKarat ?? 21,
      };
    }
    if (item.type === 'CASH_GOLD_SETTLEMENT') {
      return {
        goldSettlementWeight: item.settledGoldWeight ?? 0,
        goldSettlementCash: item.goldSettlementCashAmount ?? 0,
      };
    }
    return {};
  });

  const karat = 21;
  const previousGoldBalance = shop?.goldBalances?.[karat] ?? 0;
  const previousLaborBalance = shop?.laborBalance ?? 0;

  return {
    voucherNumber: transaction.id,
    date: transaction.date,
    type: 'COLLECT_FROM_SHOP',
    customerName: shop?.name ?? transaction.entityName ?? '---',
    customerPhone: shop?.phone ?? null,
    customerAddress: shop?.address ?? null,
    collectionSummary,
    previousGoldBalance,
    previousGoldKarat: karat,
    previousLaborBalance,
    newGoldBalance: shop?.goldBalances?.[karat] ?? 0,
    newLaborBalance: shop?.laborBalance ?? 0,
    identity,
  };
}
