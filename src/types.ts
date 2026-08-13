/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Karat = 18 | 21 | 22 | 24;

export type WageCalculationBasis = 'NET_WEIGHT' | 'GROSS_WEIGHT' | 'MANUAL';
export type WorkshopWageInputMode = 'TOTAL_WAGE' | 'PER_GRAM';
export type PricingMode = 'FINAL_PRICE' | 'PROFIT_MARGIN';
export type ShopWageMethod = 'PER_GRAM' | 'PER_PIECE' | 'MANUAL_TOTAL';

export interface Workshop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  goldBalances: Record<Karat, number>; // in net grams
  laborBalance: number; // in YER (ر.ي)
}

export interface Shop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  goldBalances: Record<Karat, number>; // in net grams (مفصول حسب العيار)
  laborBalance: number; // in YER (ر.ي) رصيد الأجور المستحقة
  workshopDueBalance: number; // The part of laborBalance that belongs to workshops
  profitBalance: number; // The part of laborBalance that is profit
}

export interface InventoryItem {
  id: string;
  category: string;
  modelCode: string;
  count?: number | null; // عدد القطع الأصلي (Nullable: اختياري وليس إجباري)
  availableCount?: number | null; // عدد القطع المتاح حالياً
  karat: Karat;
  
  // Weights (using 3 decimals)
  grossWeight: number; // الوزن القائم الأصلي
  netWeight: number; // الوزن الصافي الأصلي
  originalNetWeight: number; // الوزن الصافي الأصلي للدفعة (ثابت للمرجع)
  distributedWeight: number; // إجمالي الوزن الذي وُزّع سابقاً
  returnedWeight: number; // إجمالي الوزن المرتجع من المحلات
  returnedToWorkshopWeight?: number; // إجمالي الوزن المرتجع للورشة
  availableWeight: number; // الوزن الصافي المتاح حالياً (originalNetWeight - distributed + returnedFromShop - returnedToWorkshop)
  
  weightDifference: number; // فرق الوزن (فصوص/أحجار)
  wageCalculationBasis: WageCalculationBasis; // أساس احتساب الأجور
  manualWageWeight?: number;
  wageCalculationWeight: number; // إجمالي وزن احتساب الأجور الأصلي للدفعة
  workshopWageInputMode: WorkshopWageInputMode;
  totalWorkshopWage: number; // إجمالي أجور الورشة كما في السند الأصلي (المعتمد محاسبياً للدفعة كاملة)
  derivedWorkshopWagePerGram: number; // أجرة الورشة المستخرجة للجرام (أصلية دقيقة)
  roundedDerivedWagePerGram: number; // أجرة الورشة المقربة للعرض
  roundingDifference: number; // فرق التقريب (للمقارنة)
  workshopId: string;
  workshopDocNo?: string; // رقم سند صرف الورشة
  workshopDocDate?: string; // تاريخ سند الورشة
  workshopDocImage?: string; // صورة السند
  notes?: string;
  
  // Batch Lifecycle Status
  batchStatus?: BatchStatus;
  
  // Distribution pricing defaults
  pricingMode?: PricingMode;
  finalShopWagePerGram?: number; // أجرة البيع النهائية للمحل لكل جرام
  profitMarginPerGram?: number; // هامش الربح لكل جرام
}

export type TransactionType = 
  | 'RECEIVE_FROM_WORKSHOP'
  | 'DISTRIBUTE_TO_SHOP'
  | 'COLLECT_FROM_SHOP'
  | 'REVERSE_COLLECTION'
  | 'PAY_TO_WORKSHOP'
  | 'RETURN_FROM_SHOP'
  | 'RETURN_TO_WORKSHOP'
  | 'SCRAP_CONVERSION'
  | 'EXPENSE';

export type WorkshopReturnReason = 
  | 'UNSOLD'                   // لم تُبع
  | 'NO_MARKET_DEMAND'         // لم يطلبها السوق
  | 'OLD_MODEL'                // موديل قديم
  | 'MANUFACTURING_DEFECT'     // عيب في التصنيع
  | 'WEIGHT_DISCREPANCY'       // اختلاف وزن
  | 'KARAT_DISCREPANCY'        // اختلاف عيار
  | 'WORKSHOP_REQUEST'         // طلب الورشة إعادتها
  | 'OTHER';                   // سبب آخر

export type WorkshopReturnLaborTreatment = 
  | 'CANCEL_FULL'              // إلغاء أجور المرتجع بالكامل (Default)
  | 'CANCEL_PARTIAL'           // إلغاء جزء من الأجور
  | 'KEEP_DUE';                // الأجور تبقى مستحقة

export type WeightDiffTreatment = 
  | 'DISTRIBUTOR_LOSS'         // فاقد على الموزع
  | 'WORKSHOP_ACCEPTED'        // فرق مقبول من الورشة
  | 'UNDER_REVIEW'             // قيد مراجعة
  | 'FUTURE_SETTLEMENT'        // تسوية ذهب لاحقة
  | 'WEIGHT_ERROR';            // خطأ وزن يحتاج إعادة قياس

export type BatchStatus = 
  | 'AVAILABLE'                                    // متاحة في المخزون
  | 'PARTIALLY_DISTRIBUTED'                        // موزعة جزئيًا
  | 'PARTIALLY_RETURNED_TO_WORKSHOP'               // مرتجعة جزئيًا للورشة
  | 'FULLY_RETURNED_TO_WORKSHOP'                   // مرتجعة بالكامل للورشة
  | 'PARTIALLY_DISTRIBUTED_AND_RETURNED'           // موزعة جزئيًا والباقي مرتجع للورشة
  | 'CLOSED'                                       // مغلقة
  | 'UNDER_REVIEW';                                // قيد مراجعة فرق وزن

export interface GoldMovement {
  karat: Karat;
  weight: number;
}

export type CollectionItemType = 
  | 'LABOR_CASH'               // قبض أجور نقدية / تحويل
  | 'SCRAP_GOLD'                // استلام ذهب كسر فعلي
  | 'CASH_GOLD_SETTLEMENT'      // قطع / تسوية الذهب نقدًا
  | 'THIRD_PARTY_SETTLEMENT';   // تسوية عن طريق طرف ثالث / محل جملة

export type CollectionPurpose = 
  | 'FOR_LABOR'                 // مقابل الأجور
  | 'FOR_GOLD_SETTLEMENT'       // مقابل تسوية رصيد الذهب نقدًا
  | 'ACTUAL_SCRAP_GOLD'         // ذهب كسر فعلي
  | 'THIRD_PARTY';              // طرف ثالث

export type GoldSettlementInputMode = 
  | 'WEIGHT_AND_PRICE'          // إدخال الوزن + سعر الجرام -> إجمالي المبلغ
  | 'AMOUNT_AND_PRICE'          // إدخال المبلغ المستلم + سعر الجرام -> الوزن المسوى
  | 'WEIGHT_AND_TOTAL';         // إدخال الوزن + إجمالي المبلغ -> سعر الجرام المستخرج

export type PriceUnit = 'PER_GRAM' | 'PER_10_GRAMS' | 'CUSTOM_UNIT';

export interface CollectionItem {
  id: string;
  type: CollectionItemType;
  purpose: CollectionPurpose; // إلزامي: هذا التحصيل مقابل ماذا؟
  
  // 1. Labor Cash Fields
  laborCashAmount?: number;
  paymentMethod?: 'CASH' | 'TRANSFER';
  transferRef?: string;
  
  // 2. Scrap Gold Fields (استلام ذهب كسر فعلي)
  actualScrapWeight?: number; // الوزن المستلم فعلياً
  grossScrapWeight?: number; // الوزن القائم (اختياري)
  dueKarat?: Karat; // العيار الذي سيُخصم منه الرصيد المستحق
  declaredScrapKarat?: Karat; // عيار الكسر المعلن
  assayPerMille?: number; // نتيجة التحليل بالألف (اختياري مثل 875)
  pureGoldWeight?: number; // الذهب الخالص عيار 24
  certifiedEquivalentWeight?: number; // الوزن المكافئ المعتمد للعيار المستحق
  receiptDocNo?: string; // رقم سند الاستلام
  docImage?: string; // صورة السند / التحليل
  
  // 3. Cash Gold Settlement Fields (قطع/تسوية الذهب نقدًا)
  settlementInputMode?: GoldSettlementInputMode;
  settledGoldWeight?: number; // الوزن الذي تمت تسويته بالجرام
  goldPricePerGram?: number; // سعر الجرام المتفق عليه
  priceUnit?: PriceUnit;
  customUnitGrams?: number;
  goldSettlementCashAmount?: number; // المبلغ المقبوض مقابل تسوية الذهب (ليس أجوراً)
  pricedKarat?: Karat; // العيار الذي تم التسعير عليه
  pricingDateTime?: string; // تاريخ ووقت تثبيت السعر
  validityDuration?: string; // مدة صلاحية الاتفاق
  agreedByPerson?: string; // اسم الشخص الذي وافق على السعر
  
  // 4. Third Party Fields (طرف ثالث / محل جملة)
  thirdPartyType?: 'CASH_FOR_GOLD' | 'ACTUAL_GOLD';
  thirdPartyName?: string;
  thirdPartyPhone?: string;
  originalParty?: string;
  whoPaidCash?: string;
  whoDeliveredGold?: string;
  directSettlementNoTreasury?: boolean; // دفع مباشر دون المرور بخزينة الموزع
  
  notes?: string;
}

export interface TransactionItem {
  category: string;
  modelCode: string;
  count?: number | null; // عدد القطع الموزعة / المستلمة (Nullable)
  karat: Karat;
  grossWeight?: number;
  netWeight: number; // الوزن الصافي للعملية
  weightDifference?: number;
  wageCalculationBasis?: WageCalculationBasis;
  manualWageWeight?: number;
  wageCalculationWeight?: number;
  workshopWageInputMode?: WorkshopWageInputMode;
  totalWorkshopWage?: number;
  derivedWorkshopWagePerGram?: number;
  roundedDerivedWagePerGram?: number;
  roundingDifference?: number;
  workshopDocNo?: string;
  workshopDocDate?: string;
  workshopDocImage?: string;
  notes?: string;
  
  // Distribution specific
  inventoryItemId?: string; // معرّف الدفعة الأصلية
  originalBatchNetWeight?: number; // وزن الدفعة الأصلي
  originalBatchWageWeight?: number; // وزن احتساب الأجور الأصلي للدفعة
  originalBatchTotalWorkshopWage?: number; // إجمالي سند الورشة الأصلي للدفعة
  
  wageMethod?: ShopWageMethod; // طريقة احتساب الأجرة (حسب الجرام | حسب القطعة | يدوي)
  pricingMode?: PricingMode;
  finalShopWagePerGram?: number; // أجرة الجرام على المحل
  shopWagePerPiece?: number; // أجرة القطعة على المحل
  manualShopWageTotal?: number; // مبلغ إجمالي يدوي
  profitMarginPerGram?: number;
  
  totalShopWage?: number; // إجمالي أجور المحل المحتسبة
  allocatedWorkshopCost?: number; // تكلفة الورشة الفعلية المخصصة للجزء الموزع
  expectedProfit?: number; // إجمالي الربح المتوقع للجزء الموزع
  
  // Shop Return specific fields
  originalDistributedWeight?: number; // الوزن عند التوزيع
  actualReturnedWeight?: number; // الوزن المرتجع فعلياً
  returnedPiecesCount?: number | null; // عدد القطع المرتجعة
  returnWeightDiff?: number; // فرق الوزن
  returnReason?: string; // سبب فرق الوزن / الإرجاع
  
  // Workshop Return specific fields
  workshopReturnReason?: WorkshopReturnReason; // سبب الإرجاع للورشة
  workshopReturnReasonText?: string; // توضيح السبب
  itemCondition?: string; // حالة البضاعة المرتجعة (سليمة، معيبة...)
  grossWeightOnReturn?: number; // الوزن القائم عند الإرجاع
  expectedNetWeight?: number; // الوزن الصافي المتوقع
  actualNetWeightOnReturn?: number; // الوزن الصافي الفعلي عند الإرجاع
  certifiedWeightByWorkshop?: number; // الوزن المعتمد من الورشة
  weightDiffTreatment?: WeightDiffTreatment; // معالجة فرق الوزن
  laborTreatment?: WorkshopReturnLaborTreatment; // معالجة الأجور (إلغاء كامل / جزئي / بقاء)
  partialCancelType?: 'AMOUNT' | 'PERCENTAGE' | 'PER_GRAM';
  partialCancelValue?: number;
  originalCostOfReturnedPart?: number; // تكلفة الورشة الأصلية للجزء المرتجع
  cancelledLaborAmount?: number; // مبلغ الأجور الملغى
  keptLaborAmount?: number; // مبلغ الأجور المتبقي مستحقاً للورشة
  keptLaborReason?: string; // سبب إبقاء جزء من الأجور
  recipientName?: string; // اسم مستلم الورشة
  itemImage?: string; // صورة الصنف المرتجع
  receiptImage?: string; // صورة سند الاستلام من الورشة
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  entityId: string; // WorkshopId or ShopId
  entityName?: string;
  items?: TransactionItem[];
  goldMovements?: GoldMovement[];
  cashAmount?: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'GOLD_SCRAP' | 'COMPOSITE';
  referenceId?: string;
  workshopDocNo?: string;
  workshopDocDate?: string;
  workshopDocImage?: string;
  notes?: string;
  
  // Workshop Return Specific Transaction Metadata
  workshopReturnReason?: WorkshopReturnReason;
  workshopReturnReasonText?: string;
  recipientName?: string;
  laborTreatment?: WorkshopReturnLaborTreatment;
  cancelledLaborTotal?: number;
  keptLaborTotal?: number;
  certifiedGoldWeightTotal?: number;
  isPrepaidCredit?: boolean; // هل أصبح للموزع رصيد دائن لدى الورشة
  creditGoldDueFromWorkshop?: number; // ذهب مستحق من الورشة
  creditLaborDueFromWorkshop?: number; // أجور مستردة أو دائنة عند الورشة
  
  // Rich Composite Collection Data
  collectionItems?: CollectionItem[];
  voucherType?: 'LABOR_ONLY' | 'SCRAP_ONLY' | 'GOLD_SETTLEMENT_ONLY' | 'COMPOSITE';
  
  // Snapshot balances before and after collection / return for audit trail
  balancesBefore?: {
    goldBalances: Record<Karat, number>;
    laborBalance: number;
  };
  balancesAfter?: {
    goldBalances: Record<Karat, number>;
    laborBalance: number;
  };
  
  // Summary metrics for collection
  totalLaborCash?: number;
  totalGoldSettlementCash?: number;
  totalScrapGoldWeight?: Record<Karat, number>;
  workshopLaborShare?: number; // حصة الورشة من الأجور النقدية فقط
  distributorProfitShare?: number; // حصة الموزع من الأجور النقدية فقط
}

export interface Settings {
  companyName: string;
  defaultCurrency: string; // 'ر.ي'
  printers: {
    thermal80mm?: string;
    thermal58mm?: string;
    a4?: string;
  };
}

