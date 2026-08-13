import React, { useState } from 'react';
import { useAppStore } from '../lib/useAppStore';
import { repository } from '../lib/storage';
import { formatCurrency, formatWeight } from '../lib/utils';
import { Plus, Store, Phone } from 'lucide-react';
import { Shop } from '../types';

export default function Shops() {
  const { shops, refreshData } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [newShop, setNewShop] = useState({ name: '', phone: '', address: '' });

  const handleAdd = async () => {
    if (!newShop.name) return;
    const shop: Shop = {
      id: crypto.randomUUID(),
      name: newShop.name,
      phone: newShop.phone,
      address: newShop.address,
      goldBalances: { 18: 0, 21: 0, 22: 0, 24: 0 },
      laborBalance: 0,
      workshopDueBalance: 0,
      profitBalance: 0
    };
    await repository.save('shops', shop);
    setNewShop({ name: '', phone: '', address: '' });
    setShowModal(false);
    refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#000666]">إدارة العملاء والمحلات</h2>
          <p className="text-slate-500">قائمة المحلات المسجلة ومديونياتها.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#000666] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1a237e]"
        >
          <Plus className="w-5 h-5" />
          إضافة محل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone className="w-3 h-3" /> {s.phone || '---'}
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mt-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">مديونية الأجور</span>
                <span className="font-bold text-red-600 font-mono">{formatCurrency(s.laborBalance)} ر.ي</span>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">أرصدة الذهب المستحقة</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(s.goldBalances).map(([karat, weight]) => (
                    <div key={karat} className="bg-slate-50 p-2 rounded flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">عيار {karat}</span>
                      <span className="text-xs font-bold text-slate-700">{formatWeight(weight as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <button className="flex-1 text-xs py-2 rounded bg-slate-50 text-slate-600 hover:bg-slate-100">كشف حساب</button>
              <button className="flex-1 text-xs py-2 rounded bg-slate-50 text-slate-600 hover:bg-slate-100">تعديل</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4">إضافة محل جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">اسم المحل</label>
                <input 
                  className="w-full border rounded p-2"
                  value={newShop.name}
                  onChange={e => setNewShop({...newShop, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">رقم الهاتف</label>
                <input 
                  className="w-full border rounded p-2"
                  value={newShop.phone}
                  onChange={e => setNewShop({...newShop, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">العنوان</label>
                <input 
                  className="w-full border rounded p-2"
                  value={newShop.address}
                  onChange={e => setNewShop({...newShop, address: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  onClick={handleAdd}
                  className="flex-1 bg-[#000666] text-white py-2 rounded font-bold"
                >
                  حفظ
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
