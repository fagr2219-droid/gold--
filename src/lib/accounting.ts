import { Decimal } from 'decimal.js';
import { Karat, WageCalculationBasis, WorkshopWageInputMode, ShopWageMethod } from '../types';

export const KARAT_PURITY: Record<Karat, number> = {
  18: 18 / 24,
  21: 21 / 24,
  22: 22 / 24,
  24: 1,
};

/**
 * Calculates pure gold weight (24k equivalent) based on net weight
 */
export function calculatePureWeight(netWeight: number, karat: Karat): number {
  if (!netWeight || netWeight <= 0) return 0;
  const dWeight = new Decimal(netWeight);
  const dPurity = new Decimal(KARAT_PURITY[karat]);
  return dWeight.mul(dPurity).toDecimalPlaces(3).toNumber();
}

/**
 * Converts pure gold to a specific karat equivalent
 */
export function convertPureToKarat(pureWeight: number, targetKarat: Karat): number {
  if (!pureWeight || pureWeight <= 0) return 0;
  const dPure = new Decimal(pureWeight);
  const dPurity = new Decimal(KARAT_PURITY[targetKarat]);
  return dPure.div(dPurity).toDecimalPlaces(3).toNumber();
}

/**
 * Resolves the wage calculation weight based on chosen basis
 */
export function resolveWageCalculationWeight(
  basis: WageCalculationBasis,
  grossWeight: number,
  netWeight: number,
  manualWeight?: number
): number {
  if (basis === 'GROSS_WEIGHT') return grossWeight || 0;
  if (basis === 'MANUAL') return manualWeight || 0;
  return netWeight || 0; // Default: NET_WEIGHT
}

/**
 * Calculates workshop wage metrics when receiving goods
 */
export function calculateWorkshopWageMetrics(params: {
  inputMode: WorkshopWageInputMode;
  wageWeight: number;
  totalWageInput?: number;
  wagePerGramInput?: number;
}) {
  const { inputMode, wageWeight, totalWageInput = 0, wagePerGramInput = 0 } = params;
  const dWeight = new Decimal(wageWeight || 0);

  let totalWorkshopWage = new Decimal(0);
  let derivedWagePerGram = new Decimal(0);

  if (dWeight.isZero()) {
    return {
      totalWorkshopWage: 0,
      derivedWagePerGram: 0,
      roundedDerivedWagePerGram: 0,
      roundingDifference: 0,
    };
  }

  if (inputMode === 'TOTAL_WAGE') {
    totalWorkshopWage = new Decimal(totalWageInput || 0);
    derivedWagePerGram = totalWorkshopWage.div(dWeight);
  } else {
    // PER_GRAM mode
    const dPerGram = new Decimal(wagePerGramInput || 0);
    totalWorkshopWage = dWeight.mul(dPerGram);
    derivedWagePerGram = dPerGram;
  }

  // Rounded representation for UI display (e.g. rounded to 2 decimal places or nearest unit)
  const roundedDerived = derivedWagePerGram.toDecimalPlaces(2).toNumber();
  // Rounding difference when comparing rounded display to certified original voucher
  const simulatedFromRounded = dWeight.mul(roundedDerived);
  const roundingDiff = simulatedFromRounded.minus(totalWorkshopWage).toDecimalPlaces(2).toNumber();

  return {
    totalWorkshopWage: totalWorkshopWage.toDecimalPlaces(2).toNumber(),
    derivedWagePerGram: derivedWagePerGram.toNumber(), // High internal precision
    roundedDerivedWagePerGram: roundedDerived,
    roundingDifference: roundingDiff,
  };
}

/**
 * Calculates distribution metrics for a distributed item / partial batch
 * - Supports PER_GRAM (default), PER_PIECE, and MANUAL_TOTAL wage methods
 * - Calculates allocated workshop cost: originalTotalWorkshopWage * (distributedWeight / originalWageWeight)
 * - Computes expected profit = totalShopWage - allocatedWorkshopCost
 */
export function calculateDistributionMetrics(params: {
  distributedWageWeight: number;
  totalOriginalWageWeight: number;
  originalTotalWorkshopWage: number;
  wageMethod?: ShopWageMethod;
  finalShopWagePerGram?: number;
  count?: number | null;
  shopWagePerPiece?: number;
  manualShopWageTotal?: number;
}) {
  const {
    distributedWageWeight,
    totalOriginalWageWeight,
    originalTotalWorkshopWage,
    wageMethod = 'PER_GRAM',
    finalShopWagePerGram = 0,
    count = null,
    shopWagePerPiece = 0,
    manualShopWageTotal = 0,
  } = params;

  const dDistWeight = new Decimal(distributedWageWeight || 0);
  const dOrigWeight = new Decimal(totalOriginalWageWeight || distributedWageWeight || 1);
  const dOrigWorkshopWage = new Decimal(originalTotalWorkshopWage || 0);
  const dShopWagePerGram = new Decimal(finalShopWagePerGram || 0);

  // 1. Total shop wage depending on wageMethod
  let totalShopWage = new Decimal(0);
  if (wageMethod === 'PER_GRAM') {
    // إجمالي الأجور = الوزن الموزع × أجرة الجرام على المحل
    totalShopWage = dDistWeight.mul(dShopWagePerGram).toDecimalPlaces(2);
  } else if (wageMethod === 'PER_PIECE') {
    // إجمالي الأجور = عدد القطع × أجرة القطعة
    const dPieces = new Decimal(count || 0);
    const dPerPiece = new Decimal(shopWagePerPiece || 0);
    totalShopWage = dPieces.mul(dPerPiece).toDecimalPlaces(2);
  } else if (wageMethod === 'MANUAL_TOTAL') {
    totalShopWage = new Decimal(manualShopWageTotal || 0).toDecimalPlaces(2);
  }

  // 2. Allocated workshop cost = original workshop total * (distributed wage weight / original wage weight)
  // تكلفة الورشة المخصصة للجزء الموزع = إجمالي تكلفة الورشة الأصلية × الوزن الموزع ÷ وزن احتساب الأجور الأصلي
  const allocatedWorkshopCost = (dOrigWeight.isZero() || dDistWeight.isZero())
    ? new Decimal(0)
    : dOrigWorkshopWage.mul(dDistWeight.div(dOrigWeight)).toDecimalPlaces(2);

  // 3. Derived workshop wage per gram
  const derivedWorkshopWagePerGram = dOrigWeight.isZero()
    ? 0
    : dOrigWorkshopWage.div(dOrigWeight).toNumber();

  // 4. Profit margin per gram = final shop wage per gram - derived workshop wage per gram
  const profitMarginPerGram = new Decimal(finalShopWagePerGram)
    .minus(derivedWorkshopWagePerGram)
    .toDecimalPlaces(2)
    .toNumber();

  // 5. Total expected profit = total shop wage - allocated workshop cost (exact totals)
  const expectedProfit = totalShopWage.minus(allocatedWorkshopCost).toDecimalPlaces(2);

  return {
    totalShopWage: totalShopWage.toNumber(),
    allocatedWorkshopCost: allocatedWorkshopCost.toNumber(),
    derivedWorkshopWagePerGram,
    profitMarginPerGram,
    expectedProfit: expectedProfit.toNumber(),
  };
}

/**
 * Calculates metrics for return from shop
 */
export function calculateReturnMetrics(params: {
  actualReturnedWeight: number;
  originalDistributedWeight: number;
  originalShopWageTotal: number;
  originalAllocatedWorkshopCost: number;
}) {
  const {
    actualReturnedWeight,
    originalDistributedWeight,
    originalShopWageTotal,
    originalAllocatedWorkshopCost,
  } = params;

  const dActualReturn = new Decimal(actualReturnedWeight || 0);
  const dOrigDistWeight = new Decimal(originalDistributedWeight || actualReturnedWeight || 1);
  const dOrigShopWage = new Decimal(originalShopWageTotal || 0);
  const dOrigWorkshopCost = new Decimal(originalAllocatedWorkshopCost || 0);

  const returnRatio = dOrigDistWeight.isZero() ? new Decimal(0) : dActualReturn.div(dOrigDistWeight);

  const returnedShopWage = dOrigShopWage.mul(returnRatio).toDecimalPlaces(2);
  const returnedWorkshopCost = dOrigWorkshopCost.mul(returnRatio).toDecimalPlaces(2);
  const returnedProfit = returnedShopWage.minus(returnedWorkshopCost).toDecimalPlaces(2);
  const weightDifference = new Decimal(originalDistributedWeight).minus(dActualReturn).toDecimalPlaces(3);

  return {
    returnedShopWage: returnedShopWage.toNumber(),
    returnedWorkshopCost: returnedWorkshopCost.toNumber(),
    returnedProfit: returnedProfit.toNumber(),
    weightDifference: weightDifference.toNumber(),
  };
}

/**
 * Suggests split for a collection amount based on ratios (Applies ONLY to labor cash!)
 */
export function suggestCollectionSplit(totalLaborCash: number, workshopDue: number, distributionDue: number) {
  const dTotal = new Decimal(totalLaborCash || 0);
  const dWorkshop = new Decimal(workshopDue || 0);
  const dDist = new Decimal(distributionDue || 0);
  const dSum = dWorkshop.plus(dDist);

  if (dSum.isZero()) return { workshopPart: 0, distributionPart: 0 };

  const workshopRatio = dWorkshop.div(dSum);
  const workshopPart = dTotal.mul(workshopRatio).toDecimalPlaces(2);
  const distributionPart = dTotal.minus(workshopPart);

  return {
    workshopPart: workshopPart.toNumber(),
    distributionPart: distributionPart.toNumber(),
  };
}

/**
 * Calculates scrap gold pure weight and equivalent weight in due karat
 * - الذهب الخالص = وزن الكسر × نتيجة التحليل بالألف ÷ 1000 (أو وزن الكسر × العيار المعلن ÷ 24)
 * - الوزن المكافئ للعيار المستحق = الذهب الخالص ÷ (العيار المستحق ÷ 24)
 */
export function calculateScrapEquivalent(params: {
  actualWeight: number;
  declaredKarat: Karat;
  dueKarat: Karat;
  assayPerMille?: number;
}) {
  const { actualWeight, declaredKarat, dueKarat, assayPerMille } = params;
  const dWeight = new Decimal(actualWeight || 0);

  if (dWeight.isZero()) {
    return {
      pureGoldWeight: 0,
      certifiedEquivalentWeight: 0,
      conversionRatio: 1,
    };
  }

  let dPureGold = new Decimal(0);
  if (assayPerMille && assayPerMille > 0) {
    // التحليل بالألف
    dPureGold = dWeight.mul(new Decimal(assayPerMille).div(1000));
  } else {
    // عيار الكسر المعلن
    dPureGold = dWeight.mul(new Decimal(declaredKarat).div(24));
  }

  // الوزن المكافئ للعيار المستحق
  const dDuePurity = new Decimal(dueKarat).div(24);
  const dEquivalent = dPureGold.div(dDuePurity).toDecimalPlaces(3);

  return {
    pureGoldWeight: dPureGold.toDecimalPlaces(3).toNumber(),
    certifiedEquivalentWeight: dEquivalent.toNumber(),
    conversionRatio: dWeight.isZero() ? 1 : dEquivalent.div(dWeight).toDecimalPlaces(4).toNumber(),
  };
}

/**
 * Calculates Cash Gold Settlement / Buy-out values
 * 3 Flexible modes:
 * 1. WEIGHT_AND_PRICE: Weight + Price -> Amount = Weight * Price
 * 2. AMOUNT_AND_PRICE: Amount + Price -> Weight = Amount / Price
 * 3. WEIGHT_AND_TOTAL: Weight + Amount -> Price = Amount / Weight
 */
export function calculateGoldSettlementMetrics(params: {
  inputMode: 'WEIGHT_AND_PRICE' | 'AMOUNT_AND_PRICE' | 'WEIGHT_AND_TOTAL';
  weightInput?: number;
  priceInput?: number;
  amountInput?: number;
  priceUnit?: 'PER_GRAM' | 'PER_10_GRAMS' | 'CUSTOM_UNIT';
  customUnitGrams?: number;
}) {
  const {
    inputMode,
    weightInput = 0,
    priceInput = 0,
    amountInput = 0,
    priceUnit = 'PER_GRAM',
    customUnitGrams = 1,
  } = params;

  // Convert raw price input to effective price per single gram
  let unitDivisor = new Decimal(1);
  if (priceUnit === 'PER_10_GRAMS') unitDivisor = new Decimal(10);
  else if (priceUnit === 'CUSTOM_UNIT' && customUnitGrams && customUnitGrams > 0) {
    unitDivisor = new Decimal(customUnitGrams);
  }

  const dRawPrice = new Decimal(priceInput || 0);
  const dEffectivePricePerGram = unitDivisor.isZero() ? new Decimal(0) : dRawPrice.div(unitDivisor);

  let settledWeight = new Decimal(0);
  let totalCashAmount = new Decimal(0);
  let derivedPricePerGram = new Decimal(0);

  if (inputMode === 'WEIGHT_AND_PRICE') {
    settledWeight = new Decimal(weightInput || 0);
    totalCashAmount = settledWeight.mul(dEffectivePricePerGram).toDecimalPlaces(2);
    derivedPricePerGram = dEffectivePricePerGram;
  } else if (inputMode === 'AMOUNT_AND_PRICE') {
    totalCashAmount = new Decimal(amountInput || 0);
    if (!dEffectivePricePerGram.isZero()) {
      settledWeight = totalCashAmount.div(dEffectivePricePerGram).toDecimalPlaces(3);
    }
    derivedPricePerGram = dEffectivePricePerGram;
  } else if (inputMode === 'WEIGHT_AND_TOTAL') {
    settledWeight = new Decimal(weightInput || 0);
    totalCashAmount = new Decimal(amountInput || 0);
    if (!settledWeight.isZero()) {
      derivedPricePerGram = totalCashAmount.div(settledWeight).toDecimalPlaces(2);
    }
  }

  return {
    settledWeight: settledWeight.toDecimalPlaces(3).toNumber(),
    totalCashAmount: totalCashAmount.toNumber(),
    effectivePricePerGram: derivedPricePerGram.toNumber(),
  };
}

/**
 * Calculates complete Market Gold metrics from shops and transaction ledgers
 */
export interface ShopMarketGoldDetail {
  shopId: string;
  shopName: string;
  phone?: string;
  address?: string;
  karatBreakdown: Record<Karat, {
    distributedWeight: number;
    returnedWeight: number;
    scrapReceivedWeight: number;
    cashSettledWeight: number;
    thirdPartyWeight: number;
    remainingWeight: number;
  }>;
  totalRemainingByKarat: Record<Karat, number>;
  totalRemainingEquivalent21: number;
  oldestBalanceDate?: string;
  daysInMarket: number;
  status: 'NORMAL' | 'FOLLOW_UP' | 'OVERDUE';
  totalDistributed: number;
  totalReturned: number;
  totalScrapReceived: number;
  totalCashSettled: number;
  totalThirdParty: number;
  netRemainingTotalRaw: number;
  laborBalance: number;
}

export function calculateMarketGoldMetrics(
  shops: Array<{ id: string; name: string; phone?: string; address?: string; goldBalances: Record<Karat, number>; laborBalance: number; }>,
  transactions: Array<any>,
  referenceKarat: Karat = 21
) {
  const karats: Karat[] = [18, 21, 22, 24];
  const now = new Date().getTime();

  // 1. Initialize per-karat market aggregates
  const marketByKarat: Record<Karat, {
    distributed: number;
    returned: number;
    scrapReceived: number;
    cashSettled: number;
    thirdParty: number;
    netOutstanding: number;
  }> = {
    18: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, netOutstanding: 0 },
    21: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, netOutstanding: 0 },
    22: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, netOutstanding: 0 },
    24: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, netOutstanding: 0 },
  };

  // Physical scrap in possession
  const actualPhysicalScrapByKarat: Record<Karat, number> = { 18: 0, 21: 0, 22: 0, 24: 0 };
  let totalCashSettledGoldWeight = 0;
  let totalCashSettledMoneyAmount = 0;
  let totalLaborCashCollected = 0;

  // Collections over time frames
  let goldCollectedToday = 0;
  let goldCollectedThisWeek = 0;
  let goldCollectedThisMonth = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  monthStart.setHours(0, 0, 0, 0);

  // Parse all transactions to compute ledger statistics
  for (const tx of transactions) {
    const txTime = new Date(tx.date).getTime();

    // A. Distributions
    if (tx.type === 'DISTRIBUTE_TO_SHOP' && tx.items) {
      for (const item of tx.items) {
        const k = item.karat as Karat;
        if (marketByKarat[k]) {
          marketByKarat[k].distributed = Number((marketByKarat[k].distributed + (item.netWeight || 0)).toFixed(3));
        }
      }
    }

    // B. Returns
    if (tx.type === 'RETURN_FROM_SHOP' && tx.items) {
      for (const item of tx.items) {
        const k = item.karat as Karat;
        const w = item.actualReturnedWeight || item.netWeight || 0;
        if (marketByKarat[k]) {
          marketByKarat[k].returned = Number((marketByKarat[k].returned + w).toFixed(3));
        }
      }
    }

    // C. Collections
    if (tx.type === 'COLLECT_FROM_SHOP') {
      let txGoldWeightCollected = 0;

      if (tx.collectionItems && tx.collectionItems.length > 0) {
        for (const item of tx.collectionItems) {
          if (item.type === 'LABOR_CASH') {
            totalLaborCashCollected += (item.laborCashAmount || 0);
          } else if (item.type === 'SCRAP_GOLD') {
            const dueK = (item.dueKarat || 21) as Karat;
            const declaredK = (item.declaredScrapKarat || dueK) as Karat;
            const actualWeight = item.actualScrapWeight || 0;
            const deductedWeight = item.certifiedEquivalentWeight !== undefined ? item.certifiedEquivalentWeight : actualWeight;
            
            if (marketByKarat[dueK]) {
              marketByKarat[dueK].scrapReceived = Number((marketByKarat[dueK].scrapReceived + deductedWeight).toFixed(3));
            }
            // Increase physical scrap stock
            actualPhysicalScrapByKarat[declaredK] = Number(((actualPhysicalScrapByKarat[declaredK] || 0) + actualWeight).toFixed(3));
            txGoldWeightCollected += deductedWeight;
          } else if (item.type === 'CASH_GOLD_SETTLEMENT') {
            const dueK = (item.dueKarat || 21) as Karat;
            const settledWeight = item.settledGoldWeight || 0;
            if (marketByKarat[dueK]) {
              marketByKarat[dueK].cashSettled = Number((marketByKarat[dueK].cashSettled + settledWeight).toFixed(3));
            }
            totalCashSettledGoldWeight += settledWeight;
            totalCashSettledMoneyAmount += (item.goldSettlementCashAmount || 0);
            txGoldWeightCollected += settledWeight;
          } else if (item.type === 'THIRD_PARTY_SETTLEMENT') {
            const dueK = (item.dueKarat || 21) as Karat;
            const deductedWeight = item.thirdPartyType === 'CASH_FOR_GOLD' 
              ? (item.settledGoldWeight || 0) 
              : (item.certifiedEquivalentWeight || item.actualScrapWeight || 0);
            if (marketByKarat[dueK]) {
              marketByKarat[dueK].thirdParty = Number((marketByKarat[dueK].thirdParty + deductedWeight).toFixed(3));
            }
            txGoldWeightCollected += deductedWeight;
          }
        }
      } else {
        // Fallback
        if (tx.cashAmount) totalLaborCashCollected += tx.cashAmount;
        if (tx.totalGoldSettlementCash) totalCashSettledMoneyAmount += tx.totalGoldSettlementCash;
        if (tx.totalScrapGoldWeight) {
          for (const [k, w] of Object.entries(tx.totalScrapGoldWeight)) {
            const numK = Number(k) as Karat;
            if (marketByKarat[numK]) {
              marketByKarat[numK].scrapReceived = Number((marketByKarat[numK].scrapReceived + (w as number)).toFixed(3));
              actualPhysicalScrapByKarat[numK] = Number(((actualPhysicalScrapByKarat[numK] || 0) + (w as number)).toFixed(3));
              txGoldWeightCollected += (w as number);
            }
          }
        }
      }

      if (txTime >= todayStart.getTime()) goldCollectedToday += txGoldWeightCollected;
      if (txTime >= weekStart.getTime()) goldCollectedThisWeek += txGoldWeightCollected;
      if (txTime >= monthStart.getTime()) goldCollectedThisMonth += txGoldWeightCollected;
    }

    // D. Reversals
    if (tx.type === 'REVERSE_COLLECTION' && tx.collectionItems) {
      for (const item of tx.collectionItems) {
        if (item.type === 'SCRAP_GOLD') {
          const dueK = (item.dueKarat || 21) as Karat;
          const declaredK = (item.declaredScrapKarat || dueK) as Karat;
          const actualWeight = item.actualScrapWeight || 0;
          const deductedWeight = item.certifiedEquivalentWeight !== undefined ? item.certifiedEquivalentWeight : actualWeight;
          if (marketByKarat[dueK]) {
            marketByKarat[dueK].scrapReceived = Number(Math.max(0, marketByKarat[dueK].scrapReceived - deductedWeight).toFixed(3));
          }
          actualPhysicalScrapByKarat[declaredK] = Number(Math.max(0, (actualPhysicalScrapByKarat[declaredK] || 0) - actualWeight).toFixed(3));
        } else if (item.type === 'CASH_GOLD_SETTLEMENT') {
          const dueK = (item.dueKarat || 21) as Karat;
          const settledWeight = item.settledGoldWeight || 0;
          if (marketByKarat[dueK]) {
            marketByKarat[dueK].cashSettled = Number(Math.max(0, marketByKarat[dueK].cashSettled - settledWeight).toFixed(3));
          }
          totalCashSettledGoldWeight = Math.max(0, totalCashSettledGoldWeight - settledWeight);
        }
      }
    }
  }

  // Calculate net outstanding per karat strictly matching current shop balances
  const outstandingByKarat: Record<Karat, number> = { 18: 0, 21: 0, 22: 0, 24: 0 };
  for (const k of karats) {
    const shopSum = shops.reduce((sum, s) => sum + (s.goldBalances?.[k] || 0), 0);
    outstandingByKarat[k] = Number(shopSum.toFixed(3));
    marketByKarat[k].netOutstanding = outstandingByKarat[k];
  }

  // Calculate equivalent in reference karat (e.g. 21)
  let totalPureWeightOutstanding = 0;
  for (const k of karats) {
    totalPureWeightOutstanding += calculatePureWeight(outstandingByKarat[k], k);
  }
  const totalEquivalentReferenceKarat = convertPureToKarat(totalPureWeightOutstanding, referenceKarat);

  // 2. Compute shop-by-shop details & aging
  const shopDetails: ShopMarketGoldDetail[] = shops.map((s) => {
    // Find shop transactions
    const shopTxs = transactions.filter(t => t.entityId === s.id);
    
    // Find oldest active distribution date
    const distTxs = shopTxs.filter(t => t.type === 'DISTRIBUTE_TO_SHOP');
    const oldestTx = distTxs.length > 0 ? distTxs[distTxs.length - 1] : null;
    const oldestDate = oldestTx ? oldestTx.date : undefined;

    let daysInMarket = 0;
    if (oldestDate) {
      const diffMs = Math.max(0, now - new Date(oldestDate).getTime());
      daysInMarket = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    let status: 'NORMAL' | 'FOLLOW_UP' | 'OVERDUE' = 'NORMAL';
    if (daysInMarket > 60) status = 'OVERDUE';
    else if (daysInMarket > 30) status = 'FOLLOW_UP';

    const karatBreakdown: any = {
      18: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, remainingWeight: s.goldBalances?.[18] || 0 },
      21: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, remainingWeight: s.goldBalances?.[21] || 0 },
      22: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, remainingWeight: s.goldBalances?.[22] || 0 },
      24: { distributed: 0, returned: 0, scrapReceived: 0, cashSettled: 0, thirdParty: 0, remainingWeight: s.goldBalances?.[24] || 0 },
    };

    let shopDistTotal = 0;
    let shopReturnTotal = 0;
    let shopScrapTotal = 0;
    let shopCashSettledTotal = 0;
    let shopThirdPartyTotal = 0;

    for (const tx of shopTxs) {
      if (tx.type === 'DISTRIBUTE_TO_SHOP' && tx.items) {
        for (const item of tx.items) {
          const k = item.karat as Karat;
          if (karatBreakdown[k]) {
            karatBreakdown[k].distributed += (item.netWeight || 0);
            shopDistTotal += (item.netWeight || 0);
          }
        }
      }
      if (tx.type === 'RETURN_FROM_SHOP' && tx.items) {
        for (const item of tx.items) {
          const k = item.karat as Karat;
          const w = item.actualReturnedWeight || item.netWeight || 0;
          if (karatBreakdown[k]) {
            karatBreakdown[k].returned += w;
            shopReturnTotal += w;
          }
        }
      }
      if (tx.type === 'COLLECT_FROM_SHOP' && tx.collectionItems) {
        for (const item of tx.collectionItems) {
          if (item.type === 'SCRAP_GOLD') {
            const dueK = (item.dueKarat || 21) as Karat;
            const w = item.certifiedEquivalentWeight !== undefined ? item.certifiedEquivalentWeight : (item.actualScrapWeight || 0);
            if (karatBreakdown[dueK]) {
              karatBreakdown[dueK].scrapReceived += w;
              shopScrapTotal += w;
            }
          } else if (item.type === 'CASH_GOLD_SETTLEMENT') {
            const dueK = (item.dueKarat || 21) as Karat;
            const w = item.settledGoldWeight || 0;
            if (karatBreakdown[dueK]) {
              karatBreakdown[dueK].cashSettled += w;
              shopCashSettledTotal += w;
            }
          } else if (item.type === 'THIRD_PARTY_SETTLEMENT') {
            const dueK = (item.dueKarat || 21) as Karat;
            const w = item.thirdPartyType === 'CASH_FOR_GOLD' ? (item.settledGoldWeight || 0) : (item.certifiedEquivalentWeight || item.actualScrapWeight || 0);
            if (karatBreakdown[dueK]) {
              karatBreakdown[dueK].thirdParty += w;
              shopThirdPartyTotal += w;
            }
          }
        }
      }
    }

    let shopPure = 0;
    for (const k of karats) {
      shopPure += calculatePureWeight(s.goldBalances?.[k] || 0, k);
    }
    const equiv21 = convertPureToKarat(shopPure, 21);

    const netRemainingTotalRaw = karats.reduce((sum, k) => sum + (s.goldBalances?.[k] || 0), 0);

    return {
      shopId: s.id,
      shopName: s.name,
      phone: s.phone,
      address: s.address,
      karatBreakdown,
      totalRemainingByKarat: s.goldBalances || { 18: 0, 21: 0, 22: 0, 24: 0 },
      totalRemainingEquivalent21: equiv21,
      oldestBalanceDate: oldestDate,
      daysInMarket,
      status,
      totalDistributed: Number(shopDistTotal.toFixed(3)),
      totalReturned: Number(shopReturnTotal.toFixed(3)),
      totalScrapReceived: Number(shopScrapTotal.toFixed(3)),
      totalCashSettled: Number(shopCashSettledTotal.toFixed(3)),
      totalThirdParty: Number(shopThirdPartyTotal.toFixed(3)),
      netRemainingTotalRaw: Number(netRemainingTotalRaw.toFixed(3)),
      laborBalance: s.laborBalance || 0,
    };
  });

  // Shops with active gold
  const shopsWithGold = shopDetails.filter(s => s.netRemainingTotalRaw > 0.001);
  const overdueShops = shopDetails.filter(s => s.status === 'OVERDUE' && s.netRemainingTotalRaw > 0.001);
  const followUpShops = shopDetails.filter(s => s.status === 'FOLLOW_UP' && s.netRemainingTotalRaw > 0.001);

  // Top 5 balances
  const top5Shops = [...shopsWithGold].sort((a, b) => b.totalRemainingEquivalent21 - a.totalRemainingEquivalent21).slice(0, 5);

  return {
    outstandingByKarat,
    totalEquivalentReferenceKarat,
    totalPureWeightOutstanding: Number(totalPureWeightOutstanding.toFixed(3)),
    marketByKarat,
    actualPhysicalScrapByKarat,
    totalPhysicalScrapWeight: Number(Object.values(actualPhysicalScrapByKarat).reduce((a, b) => a + b, 0).toFixed(3)),
    totalCashSettledGoldWeight: Number(totalCashSettledGoldWeight.toFixed(3)),
    totalCashSettledMoneyAmount: Number(totalCashSettledMoneyAmount.toFixed(2)),
    totalLaborCashCollected: Number(totalLaborCashCollected.toFixed(2)),
    goldCollectedToday: Number(goldCollectedToday.toFixed(3)),
    goldCollectedThisWeek: Number(goldCollectedThisWeek.toFixed(3)),
    goldCollectedThisMonth: Number(goldCollectedThisMonth.toFixed(3)),
    shopsWithGoldCount: shopsWithGold.length,
    overdueGoldCount: overdueShops.length,
    followUpGoldCount: followUpShops.length,
    shopDetails,
    top5Shops,
  };
}

/**
 * Calculates financial, gold, and batch impact for returning goods back to workshop
 */
export function calculateWorkshopReturnMetrics(params: {
  certifiedReturnWeight: number;
  expectedNetWeight?: number;
  originalBatchWageWeight: number;
  originalBatchTotalWorkshopLabor: number;
  laborTreatment: 'CANCEL_FULL' | 'CANCEL_PARTIAL' | 'KEEP_DUE';
  partialCancelType?: 'AMOUNT' | 'PERCENTAGE' | 'PER_GRAM';
  partialCancelValue?: number;
  workshopGoldBalanceBefore?: number;
  workshopLaborBalanceBefore?: number;
  distributedWeight?: number;
  finalShopWagePerGram?: number;
}) {
  const {
    certifiedReturnWeight,
    expectedNetWeight = certifiedReturnWeight,
    originalBatchWageWeight,
    originalBatchTotalWorkshopLabor,
    laborTreatment,
    partialCancelType = 'AMOUNT',
    partialCancelValue = 0,
    workshopGoldBalanceBefore = 0,
    workshopLaborBalanceBefore = 0,
    distributedWeight = 0,
    finalShopWagePerGram = 0,
  } = params;

  const dReturnWeight = new Decimal(certifiedReturnWeight || 0);
  const dExpectedWeight = new Decimal(expectedNetWeight || certifiedReturnWeight || 0);
  const dBatchWageWeight = new Decimal(originalBatchWageWeight || certifiedReturnWeight || 1);
  const dBatchTotalLabor = new Decimal(originalBatchTotalWorkshopLabor || 0);

  // 1. Weight difference between certified/actual and expected
  const weightDifference = dReturnWeight.minus(dExpectedWeight).toDecimalPlaces(3).toNumber();

  // 2. Derived workshop wage per gram from original voucher
  const derivedWagePerGram = dBatchWageWeight.isZero()
    ? 0
    : dBatchTotalLabor.div(dBatchWageWeight).toNumber();

  // 3. Exact original workshop cost for the returned portion:
  // Cost = Total Original Labor * (Certified Return Weight / Original Wage Calculation Weight)
  const originalCostOfReturnedPart = (dBatchWageWeight.isZero() || dReturnWeight.isZero())
    ? new Decimal(0)
    : dBatchTotalLabor.mul(dReturnWeight.div(dBatchWageWeight)).toDecimalPlaces(2);

  // 4. Calculate Cancelled vs Kept Labor based on chosen treatment
  let cancelledLabor = new Decimal(0);
  let keptLabor = new Decimal(0);

  if (laborTreatment === 'CANCEL_FULL') {
    // Default: إلغاء أجور المرتجع بالكامل
    cancelledLabor = originalCostOfReturnedPart;
    keptLabor = new Decimal(0);
  } else if (laborTreatment === 'CANCEL_PARTIAL') {
    // إلغاء جزء من الأجور
    if (partialCancelType === 'AMOUNT') {
      cancelledLabor = Decimal.min(new Decimal(partialCancelValue || 0), originalCostOfReturnedPart).toDecimalPlaces(2);
    } else if (partialCancelType === 'PERCENTAGE') {
      const pct = new Decimal(partialCancelValue || 0).div(100);
      cancelledLabor = originalCostOfReturnedPart.mul(pct).toDecimalPlaces(2);
    } else if (partialCancelType === 'PER_GRAM') {
      const perGram = new Decimal(partialCancelValue || 0);
      cancelledLabor = Decimal.min(dReturnWeight.mul(perGram), originalCostOfReturnedPart).toDecimalPlaces(2);
    }
    keptLabor = Decimal.max(new Decimal(0), originalCostOfReturnedPart.minus(cancelledLabor)).toDecimalPlaces(2);
  } else if (laborTreatment === 'KEEP_DUE') {
    // الأجور تبقى مستحقة
    cancelledLabor = new Decimal(0);
    keptLabor = originalCostOfReturnedPart;
  }

  // 5. Remaining workshop cost for the rest of the batch (e.g. distributed portion)
  const remainingBatchWorkshopCost = Decimal.max(new Decimal(0), dBatchTotalLabor.minus(cancelledLabor)).toDecimalPlaces(2);

  // 6. Impact on distributed portion profit (if any distributed)
  const dDistWeight = new Decimal(distributedWeight || 0);
  const distributedShopLaborTotal = dDistWeight.mul(new Decimal(finalShopWagePerGram || 0)).toDecimalPlaces(2);
  const distributedAllocatedWorkshopCost = (dBatchWageWeight.isZero() || dDistWeight.isZero())
    ? new Decimal(0)
    : dBatchTotalLabor.mul(dDistWeight.div(dBatchWageWeight)).toDecimalPlaces(2);
  const distributedNetProfit = distributedShopLaborTotal.minus(distributedAllocatedWorkshopCost).toDecimalPlaces(2);

  // 7. Workshop Balances Before vs After
  const dGoldBefore = new Decimal(workshopGoldBalanceBefore);
  const dLaborBefore = new Decimal(workshopLaborBalanceBefore);

  const goldBalanceAfter = dGoldBefore.minus(dReturnWeight).toDecimalPlaces(3).toNumber();
  const laborBalanceAfter = dLaborBefore.minus(cancelledLabor).toDecimalPlaces(2).toNumber();

  const isCreditGold = goldBalanceAfter < 0;
  const isCreditLabor = laborBalanceAfter < 0;

  return {
    weightDifference,
    derivedWagePerGram,
    originalCostOfReturnedPart: originalCostOfReturnedPart.toNumber(),
    cancelledLabor: cancelledLabor.toNumber(),
    keptLabor: keptLabor.toNumber(),
    remainingBatchWorkshopCost: remainingBatchWorkshopCost.toNumber(),
    distributedShopLaborTotal: distributedShopLaborTotal.toNumber(),
    distributedAllocatedWorkshopCost: distributedAllocatedWorkshopCost.toNumber(),
    distributedNetProfit: distributedNetProfit.toNumber(),
    goldBalanceAfter,
    laborBalanceAfter,
    isCreditGold,
    isCreditLabor,
    creditGoldDueFromWorkshop: isCreditGold ? Math.abs(goldBalanceAfter) : 0,
    creditLaborDueFromWorkshop: isCreditLabor ? Math.abs(laborBalanceAfter) : 0,
  };
}

/**
 * Computes human-readable batch lifecycle status
 */
export function computeBatchStatus(item: {
  originalNetWeight?: number;
  netWeight: number;
  distributedWeight?: number;
  returnedWeight?: number;
  returnedToWorkshopWeight?: number;
  availableWeight?: number;
}) {
  const orig = item.originalNetWeight || item.netWeight || 0;
  const dist = item.distributedWeight || 0;
  const retToWs = item.returnedToWorkshopWeight || 0;
  const avail = item.availableWeight !== undefined ? item.availableWeight : Math.max(0, orig - dist + (item.returnedWeight || 0) - retToWs);

  if (avail <= 0.001) {
    if (dist > 0.001 && retToWs > 0.001) {
      return { code: 'PARTIALLY_DISTRIBUTED_AND_RETURNED', label: 'موزعة والباقي مرتجع للورشة', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (retToWs > 0.001 && dist <= 0.001) {
      return { code: 'FULLY_RETURNED_TO_WORKSHOP', label: 'مرتجعة بالكامل للورشة', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (dist > 0.001) {
      return { code: 'CLOSED', label: 'مكتملة التوزيع', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }

  if (retToWs > 0.001 && avail > 0.001) {
    return { code: 'PARTIALLY_RETURNED_TO_WORKSHOP', label: 'مرتجعة جزئياً للورشة', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  }

  if (dist > 0.001 && avail > 0.001) {
    return { code: 'PARTIALLY_DISTRIBUTED', label: 'موزعة جزئياً للمحلات', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }

  return { code: 'AVAILABLE', label: 'متاحة بالمخزون', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}



