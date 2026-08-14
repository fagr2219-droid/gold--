import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { repository } from './storage';
import { Workshop, Shop, InventoryItem, Transaction, Karat } from '../types';
import { suggestCollectionSplit, calculateWorkshopWageMetrics, calculateDistributionMetrics, calculateReturnMetrics } from './accounting';

export function useAppStore() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) {
      setWorkshops([]);
      setShops([]);
      setInventory([]);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [w, s, i, t] = await Promise.all([
        repository.getAll('workshops'),
        repository.getAll('shops'),
        repository.getAll('inventory'),
        repository.getAll('transactions'),
      ]);
      setWorkshops(w);
      setShops(s);
      setInventory(i);
      setTransactions(t.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addTransaction = async (tx: Transaction) => {
    await repository.save('transactions', tx);
    
    // 1. Receive from Workshop
    if (tx.type === 'RECEIVE_FROM_WORKSHOP' && tx.items) {
      const workshop = await repository.getById('workshops', tx.entityId);
      if (workshop) {
        let totalLaborToAdd = 0;
        for (const item of tx.items) {
          // Strictly add exact certified total workshop wage
          totalLaborToAdd += (item.totalWorkshopWage || 0);
          
          // Update gold balance strictly using net weight (pure gold basis)
          workshop.goldBalances[item.karat] = Number(
            ((workshop.goldBalances[item.karat] || 0) + item.netWeight).toFixed(3)
          );
          
          const initialCount = (item.count !== undefined && item.count !== null && item.count > 0) ? item.count : null;

          // Add to inventory with full tracking fields for partial batch lifecycle
          const invItem: InventoryItem = {
            id: crypto.randomUUID(),
            category: item.category,
            modelCode: item.modelCode,
            count: initialCount,
            availableCount: initialCount,
            karat: item.karat,
            grossWeight: item.grossWeight || item.netWeight,
            netWeight: item.netWeight,
            originalNetWeight: item.netWeight,
            distributedWeight: 0,
            returnedWeight: 0,
            availableWeight: item.netWeight,
            weightDifference: item.weightDifference || 0,
            wageCalculationBasis: item.wageCalculationBasis || 'NET_WEIGHT',
            manualWageWeight: item.manualWageWeight,
            wageCalculationWeight: item.wageCalculationWeight || item.netWeight,
            workshopWageInputMode: item.workshopWageInputMode || 'TOTAL_WAGE',
            totalWorkshopWage: item.totalWorkshopWage || 0,
            derivedWorkshopWagePerGram: item.derivedWorkshopWagePerGram || 0,
            roundedDerivedWagePerGram: item.roundedDerivedWagePerGram || 0,
            roundingDifference: item.roundingDifference || 0,
            workshopId: tx.entityId,
            workshopDocNo: item.workshopDocNo || tx.workshopDocNo,
            workshopDocDate: item.workshopDocDate || tx.workshopDocDate,
            workshopDocImage: item.workshopDocImage || tx.workshopDocImage,
            notes: item.notes || tx.notes,
            finalShopWagePerGram: item.finalShopWagePerGram || (item.roundedDerivedWagePerGram ? item.roundedDerivedWagePerGram + 200 : 1800),
          };
          await repository.save('inventory', invItem);
        }
        workshop.laborBalance = Number((workshop.laborBalance + totalLaborToAdd).toFixed(2));
        await repository.save('workshops', workshop);
      }
    }

    // 2. Distribute to Shop (Supports Partial Batch Distribution)
    if (tx.type === 'DISTRIBUTE_TO_SHOP' && tx.items) {
      const shop = await repository.getById('shops', tx.entityId);
      if (shop) {
        let totalLabor = 0;
        let totalWorkshopDue = 0;
        let totalProfit = 0;

        for (const item of tx.items) {
          const shopWage = item.totalShopWage ?? 0;
          const workshopCost = item.allocatedWorkshopCost ?? 0;
          const profit = item.expectedProfit ?? (shopWage - workshopCost);

          totalLabor += shopWage;
          totalWorkshopDue += workshopCost;
          totalProfit += profit;
          
          // Add gold to shop strictly by the distributed net weight
          shop.goldBalances[item.karat] = Number(
            ((shop.goldBalances[item.karat] || 0) + item.netWeight).toFixed(3)
          );

          // Partial Batch Inventory Deduction
          if (item.inventoryItemId) {
            const invBatch = await repository.getById('inventory', item.inventoryItemId);
            if (invBatch) {
              const newDistributedWeight = Number(((invBatch.distributedWeight || 0) + item.netWeight).toFixed(3));
              const newAvailableWeight = Number(
                Math.max(0, (invBatch.originalNetWeight || invBatch.netWeight) - newDistributedWeight + (invBatch.returnedWeight || 0)).toFixed(3)
              );

              // Update pieces count if applicable
              let newAvailableCount = invBatch.availableCount;
              if (invBatch.availableCount !== null && invBatch.availableCount !== undefined && item.count) {
                newAvailableCount = Math.max(0, invBatch.availableCount - item.count);
              }

              // Update the batch in inventory; if available weight is virtually zero (< 0.001), keep or update
              invBatch.distributedWeight = newDistributedWeight;
              invBatch.availableWeight = newAvailableWeight;
              invBatch.availableCount = newAvailableCount;

              await repository.save('inventory', invBatch);
            }
          }
        }
        shop.laborBalance = Number((shop.laborBalance + totalLabor).toFixed(2));
        shop.workshopDueBalance = Number((shop.workshopDueBalance + totalWorkshopDue).toFixed(2));
        shop.profitBalance = Number((shop.profitBalance + totalProfit).toFixed(2));
        await repository.save('shops', shop);
      }
    }

    // 3. Return from Shop (إرجاع بضاعة من محل)
    if (tx.type === 'RETURN_FROM_SHOP' && tx.items) {
      const shop = await repository.getById('shops', tx.entityId);
      if (shop) {
        let totalLaborReversed = 0;
        let totalWorkshopDueReversed = 0;
        let totalProfitReversed = 0;

        for (const item of tx.items) {
          const actualReturnWeight = item.actualReturnedWeight || item.netWeight;
          const returnedShopWage = item.totalShopWage || 0;
          const returnedWorkshopCost = item.allocatedWorkshopCost || 0;
          const returnedProfit = item.expectedProfit || (returnedShopWage - returnedWorkshopCost);

          totalLaborReversed += returnedShopWage;
          totalWorkshopDueReversed += returnedWorkshopCost;
          totalProfitReversed += returnedProfit;

          // Deduct only the actual returned gold weight from shop
          shop.goldBalances[item.karat] = Number(
            Math.max(0, (shop.goldBalances[item.karat] || 0) - actualReturnWeight).toFixed(3)
          );

          // Restore actual returned weight to original batch in inventory
          if (item.inventoryItemId) {
            const invBatch = await repository.getById('inventory', item.inventoryItemId);
            if (invBatch) {
              invBatch.returnedWeight = Number(((invBatch.returnedWeight || 0) + actualReturnWeight).toFixed(3));
              invBatch.availableWeight = Number(
                Math.max(0, (invBatch.originalNetWeight || invBatch.netWeight) - (invBatch.distributedWeight || 0) + invBatch.returnedWeight).toFixed(3)
              );

              if (invBatch.availableCount !== null && invBatch.availableCount !== undefined && item.returnedPiecesCount) {
                invBatch.availableCount = (invBatch.availableCount || 0) + item.returnedPiecesCount;
              }

              await repository.save('inventory', invBatch);
            }
          }
        }

        // Reverse labor balances
        shop.laborBalance = Number(Math.max(0, shop.laborBalance - totalLaborReversed).toFixed(2));
        shop.workshopDueBalance = Number(Math.max(0, shop.workshopDueBalance - totalWorkshopDueReversed).toFixed(2));
        shop.profitBalance = Number(Math.max(0, shop.profitBalance - totalProfitReversed).toFixed(2));
        await repository.save('shops', shop);
      }
    }

    // 3.5. Return to Workshop (مرتجع للورشة)
    if (tx.type === 'RETURN_TO_WORKSHOP' && tx.items) {
      const workshop = await repository.getById('workshops', tx.entityId);
      if (workshop) {
        let totalLaborCancelled = 0;

        for (const item of tx.items) {
          const returnWeight = item.certifiedWeightByWorkshop || item.actualNetWeightOnReturn || item.netWeight || 0;
          const cancelledLabor = item.cancelledLaborAmount || 0;
          totalLaborCancelled += cancelledLabor;

          // Deduct certified returned gold weight from workshop balance
          workshop.goldBalances[item.karat] = Number(
            ((workshop.goldBalances[item.karat] || 0) - returnWeight).toFixed(3)
          );

          // Update Inventory Batch
          if (item.inventoryItemId) {
            const invBatch = await repository.getById('inventory', item.inventoryItemId);
            if (invBatch) {
              const prevReturnedToWs = invBatch.returnedToWorkshopWeight || 0;
              const newReturnedToWs = Number((prevReturnedToWs + returnWeight).toFixed(3));
              const originalWeight = invBatch.originalNetWeight || invBatch.netWeight;
              const distributed = invBatch.distributedWeight || 0;
              const returnedFromShop = invBatch.returnedWeight || 0;

              const newAvailableWeight = Number(
                Math.max(0, originalWeight - distributed + returnedFromShop - newReturnedToWs).toFixed(3)
              );

              invBatch.returnedToWorkshopWeight = newReturnedToWs;
              invBatch.availableWeight = newAvailableWeight;

              if (invBatch.availableCount !== null && invBatch.availableCount !== undefined && item.count) {
                invBatch.availableCount = Math.max(0, invBatch.availableCount - item.count);
              }

              // Update Batch status
              if (newAvailableWeight <= 0.001) {
                if (distributed > 0.001) {
                  invBatch.batchStatus = 'PARTIALLY_DISTRIBUTED_AND_RETURNED';
                } else {
                  invBatch.batchStatus = 'FULLY_RETURNED_TO_WORKSHOP';
                }
              } else {
                invBatch.batchStatus = 'PARTIALLY_RETURNED_TO_WORKSHOP';
              }

              await repository.save('inventory', invBatch);
            }
          }
        }

        // Deduct cancelled labor from workshop balance (can be negative if credit)
        workshop.laborBalance = Number((workshop.laborBalance - totalLaborCancelled).toFixed(2));
        await repository.save('workshops', workshop);
      }
    }

    // 4. Collect from Shop (Supports Composite Collections & Independent Gold / Labor Balances)
    if (tx.type === 'COLLECT_FROM_SHOP') {
      const shop = await repository.getById('shops', tx.entityId);
      if (shop) {
        // If modern composite collection items exist
        if (tx.collectionItems && tx.collectionItems.length > 0) {
          let totalLaborCash = 0;

          for (const item of tx.collectionItems) {
            // Case 1: Labor Cash / Transfer
            if (item.type === 'LABOR_CASH' && item.laborCashAmount) {
              totalLaborCash += item.laborCashAmount;
            }

            // Case 2: Actual Scrap Gold Receipt
            if (item.type === 'SCRAP_GOLD') {
              const dueKarat = item.dueKarat || 21;
              const weightToDeduct = item.certifiedEquivalentWeight !== undefined 
                ? item.certifiedEquivalentWeight 
                : (item.actualScrapWeight || 0);

              shop.goldBalances[dueKarat] = Number(
                Math.max(0, (shop.goldBalances[dueKarat] || 0) - weightToDeduct).toFixed(3)
              );
            }

            // Case 3: Cash Gold Settlement (قطع/تسوية الذهب نقدًا)
            if (item.type === 'CASH_GOLD_SETTLEMENT') {
              const dueKarat = item.dueKarat || 21;
              const weightToDeduct = item.settledGoldWeight || 0;

              shop.goldBalances[dueKarat] = Number(
                Math.max(0, (shop.goldBalances[dueKarat] || 0) - weightToDeduct).toFixed(3)
              );
            }

            // Case 4: Third Party Settlement (طرف ثالث / محل جملة)
            if (item.type === 'THIRD_PARTY_SETTLEMENT') {
              const dueKarat = item.dueKarat || 21;
              const weightToDeduct = item.thirdPartyType === 'CASH_FOR_GOLD' 
                ? (item.settledGoldWeight || 0) 
                : (item.certifiedEquivalentWeight || item.actualScrapWeight || 0);

              shop.goldBalances[dueKarat] = Number(
                Math.max(0, (shop.goldBalances[dueKarat] || 0) - weightToDeduct).toFixed(3)
              );
            }
          }

          // Deduct ONLY labor cash from laborBalance, and calculate split strictly on labor cash
          if (totalLaborCash > 0) {
            const split = suggestCollectionSplit(totalLaborCash, shop.workshopDueBalance, shop.profitBalance);
            shop.laborBalance = Number(Math.max(0, shop.laborBalance - totalLaborCash).toFixed(2));
            shop.workshopDueBalance = Number(Math.max(0, shop.workshopDueBalance - split.workshopPart).toFixed(2));
            shop.profitBalance = Number(Math.max(0, shop.profitBalance - split.distributionPart).toFixed(2));
          }
        } else if (tx.cashAmount) {
          // Legacy single cash collection fallback
          const split = suggestCollectionSplit(tx.cashAmount, shop.workshopDueBalance, shop.profitBalance);
          shop.laborBalance = Number(Math.max(0, shop.laborBalance - tx.cashAmount).toFixed(2));
          shop.workshopDueBalance = Number(Math.max(0, shop.workshopDueBalance - split.workshopPart).toFixed(2));
          shop.profitBalance = Number(Math.max(0, shop.profitBalance - split.distributionPart).toFixed(2));
        }

        await repository.save('shops', shop);
      }
    }

    // 5. Reverse Collection Transaction (سند عكسي للتحصيل)
    if (tx.type === 'REVERSE_COLLECTION') {
      const shop = await repository.getById('shops', tx.entityId);
      if (shop && tx.collectionItems) {
        let totalLaborCashToRestore = 0;

        for (const item of tx.collectionItems) {
          if (item.type === 'LABOR_CASH' && item.laborCashAmount) {
            totalLaborCashToRestore += item.laborCashAmount;
          }

          if (item.type === 'SCRAP_GOLD') {
            const dueKarat = item.dueKarat || 21;
            const weightToRestore = item.certifiedEquivalentWeight || item.actualScrapWeight || 0;
            shop.goldBalances[dueKarat] = Number(
              ((shop.goldBalances[dueKarat] || 0) + weightToRestore).toFixed(3)
            );
          }

          if (item.type === 'CASH_GOLD_SETTLEMENT') {
            const dueKarat = item.dueKarat || 21;
            const weightToRestore = item.settledGoldWeight || 0;
            shop.goldBalances[dueKarat] = Number(
              ((shop.goldBalances[dueKarat] || 0) + weightToRestore).toFixed(3)
            );
          }

          if (item.type === 'THIRD_PARTY_SETTLEMENT') {
            const dueKarat = item.dueKarat || 21;
            const weightToRestore = item.thirdPartyType === 'CASH_FOR_GOLD' 
              ? (item.settledGoldWeight || 0) 
              : (item.certifiedEquivalentWeight || item.actualScrapWeight || 0);
            shop.goldBalances[dueKarat] = Number(
              ((shop.goldBalances[dueKarat] || 0) + weightToRestore).toFixed(3)
            );
          }
        }

        if (totalLaborCashToRestore > 0) {
          const split = suggestCollectionSplit(totalLaborCashToRestore, shop.workshopDueBalance, shop.profitBalance);
          shop.laborBalance = Number((shop.laborBalance + totalLaborCashToRestore).toFixed(2));
          shop.workshopDueBalance = Number((shop.workshopDueBalance + (tx.workshopLaborShare || split.workshopPart)).toFixed(2));
          shop.profitBalance = Number((shop.profitBalance + (tx.distributorProfitShare || split.distributionPart)).toFixed(2));
        }

        await repository.save('shops', shop);
      }
    }
    
    await refreshData();
    // Create an automatic snapshot after every successful transaction
    await repository.createSnapshot(`تحديث تلقائي بعد حركة: ${tx.type}`);
  };

  const seedData = async (force: boolean = false) => {
    // 1. Always create an emergency snapshot tagged as pre-demo before clearing
    await repository.createSnapshot('نسخة احتياطية تلقائية قبل تحميل البيانات التجريبية', true);
    
    await repository.clearAll();
    
    const w1: Workshop = {
      id: 'w1',
      name: 'ورشة الأمل الماسية',
      phone: '771234567',
      address: 'صنعاء - شارع الذهب',
      goldBalances: { 18: 0, 21: 360.67, 22: 0, 24: 0 },
      laborBalance: 541000
    };
    
    // Seed shop initialized with exact scenario balances from user prompt:
    // Gold: 268.400g 21k, Labor: 520,810 YER (Workshop Due: 410,810 YER, Profit: 110,000 YER)
    const s1: Shop = {
      id: 's1',
      name: 'مجوهرات الزمرد والبريق',
      phone: '777889900',
      address: 'صنعاء - التحرير',
      goldBalances: { 18: 0, 21: 268.40, 22: 0, 24: 0 },
      laborBalance: 520810,
      workshopDueBalance: 410810,
      profitBalance: 110000
    };
    
    await repository.save('workshops', w1);
    await repository.save('shops', s1);
    
    // Seed item matching the user's exact specification
    const seedItem: InventoryItem = {
      id: 'inv-seed-1',
      category: 'محابس',
      modelCode: 'RNG-360',
      count: 24,
      availableCount: 24,
      karat: 21,
      grossWeight: 365.70,
      netWeight: 360.67,
      originalNetWeight: 360.67,
      distributedWeight: 0,
      returnedWeight: 0,
      availableWeight: 360.67,
      weightDifference: 5.03,
      wageCalculationBasis: 'NET_WEIGHT',
      wageCalculationWeight: 360.67,
      workshopWageInputMode: 'TOTAL_WAGE',
      totalWorkshopWage: 541000,
      derivedWorkshopWagePerGram: 541000 / 360.67,
      roundedDerivedWagePerGram: 1500,
      roundingDifference: 5,
      workshopId: 'w1',
      workshopDocNo: 'DOC-9421',
      workshopDocDate: new Date().toISOString().slice(0, 10),
      notes: 'سند صرف ورشة الأمل الماسية - أصناف محابس عيار 21',
      pricingMode: 'FINAL_PRICE',
      finalShopWagePerGram: 1800,
      profitMarginPerGram: 300,
    };
    
    await repository.save('inventory', seedItem);

    const tx1: Transaction = {
      id: 'tx-seed-1',
      date: new Date().toISOString(),
      type: 'RECEIVE_FROM_WORKSHOP',
      entityId: 'w1',
      entityName: w1.name,
      workshopDocNo: 'DOC-9421',
      workshopDocDate: new Date().toISOString().slice(0, 10),
      items: [
        {
          category: seedItem.category,
          modelCode: seedItem.modelCode,
          count: seedItem.count,
          karat: seedItem.karat,
          grossWeight: seedItem.grossWeight,
          netWeight: seedItem.netWeight,
          weightDifference: seedItem.weightDifference,
          wageCalculationBasis: seedItem.wageCalculationBasis,
          wageCalculationWeight: seedItem.wageCalculationWeight,
          workshopWageInputMode: seedItem.workshopWageInputMode,
          totalWorkshopWage: seedItem.totalWorkshopWage,
          derivedWorkshopWagePerGram: seedItem.derivedWorkshopWagePerGram,
          roundedDerivedWagePerGram: seedItem.roundedDerivedWagePerGram,
          roundingDifference: seedItem.roundingDifference,
          workshopDocNo: seedItem.workshopDocNo,
          workshopDocDate: seedItem.workshopDocDate,
          notes: seedItem.notes,
        }
      ]
    };
    
    await repository.save('transactions', tx1);
    await refreshData();
  };

  const restoreSnapshot = async (snapshotId: string) => {
    const success = await repository.restoreSnapshot(snapshotId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const getSnapshots = () => {
    return repository.getSnapshots();
  };

  const exportBackup = async () => {
    return repository.exportDatabaseToJSON();
  };

  const importBackup = async (jsonString: string) => {
    const result = await repository.importDatabaseFromJSON(jsonString);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const undoPreDemoSeed = async () => {
    const snapshots = repository.getSnapshots();
    const preDemo = snapshots.find(s => s.isPreDemoSeed);
    if (preDemo) {
      return await restoreSnapshot(preDemo.id);
    }
    // If no explicit preDemo tag, restore the most recent snapshot if available
    if (snapshots.length > 0) {
      return await restoreSnapshot(snapshots[0].id);
    }
    return false;
  };

  return {
    workshops,
    shops,
    inventory,
    transactions,
    loading,
    addTransaction,
    seedData,
    restoreSnapshot,
    getSnapshots,
    exportBackup,
    importBackup,
    undoPreDemoSeed,
    refreshData
  };
}
