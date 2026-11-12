import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  HeartHandshake,
  Calendar,
  Layers,
  Receipt,
} from 'lucide-react';
import { DonutChart, GroupedBarChart, MonthlyBarChart } from '../charts';
import { KpiCard, Panel } from '../ui';
import {
  BudgetLine,
  Transaction,
  TreasuryPayment,
  formatRON,
} from '../types';
import {
  categoryBreakdown,
  computeKpis,
  monthlyCashflow,
  quarterlyCashflow,
} from '../selectors';

interface DashboardTabProps {
  transactions: Transaction[];
  duesPayments?: TreasuryPayment[];
  lines?: BudgetLine[];
  onSaveLine?: (line: BudgetLine, previous?: BudgetLine) => Promise<void>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  duesPayments = [],
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');

  const kpis = computeKpis(transactions, duesPayments);
  const expenseSlices = categoryBreakdown(transactions, 'cheltuiala');
  const incomeSlices = categoryBreakdown(transactions, 'venit', duesPayments);
  const quarters = quarterlyCashflow(transactions, duesPayments);
  const months = monthlyCashflow(transactions, duesPayments);

  // Receipts and payments count
  const settledExpenseTxs = transactions.filter(t => t.status === 'platit' && t.type === 'cheltuiala');
  const receiptsCount = settledExpenseTxs.filter(t => Boolean(t.receiptImage || t.documentUrl)).length;

  const netResult = kpis.settledIncome - kpis.settledExpense;
  const isNetPositive = netResult >= 0;

  return (
    <div className="space-y-6 font-anthropic">
      {/* 1. 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sold Curent Disponibil"
          value={formatRON(kpis.currentBalance)}
          emphasis
          accent={kpis.currentBalance >= 0 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
          icon={<Wallet className="h-5 w-5" />}
          hint={`În mapă curent: ${formatRON(kpis.initialBalance)} RON (cu tot cu cotizații) · Încasări directe: +${formatRON(kpis.directIncome)} RON · Plăți: −${formatRON(kpis.settledExpense)} RON`}
        />
        <KpiCard
          label="Total Venituri Mandat"
          value={`+${formatRON(kpis.settledIncome)}`}
          accent="var(--adm-acc-blue)"
          icon={<TrendingUp className="h-5 w-5" />}
          hint={`Cotizații: +${formatRON(kpis.duesIncome)} RON · Proiecte/Direct: +${formatRON(kpis.directIncome)} RON`}
        />
        <KpiCard
          label="Total Cheltuieli Decontate"
          value={`−${formatRON(kpis.settledExpense)}`}
          accent="var(--adm-acc-amber)"
          icon={<TrendingDown className="h-5 w-5" />}
          hint={`${settledExpenseTxs.length} plăți confirmate · ${receiptsCount} bonuri atașate`}
        />
        <KpiCard
          label="Profit Net / Fond Caritabil"
          value={`${isNetPositive ? '+' : ''}${formatRON(netResult)}`}
          accent={isNetPositive ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
          icon={<HeartHandshake className="h-5 w-5" />}
          hint={
            kpis.charityRedirected > 0
              ? `Din care donații redirecționate: ${formatRON(kpis.charityRedirected)} RON`
              : 'Disponibil net generat în mandatul curent'
          }
        />
      </div>

      {/* 2. Central Section: Evidența Statisticilor pe Luni vs Trimestre */}
      <Panel
        title="Dinamica Financiară a Mandatului"
        subtitle="Analiza cashflow-ului pe luni și trimestre (Iunie 2026 → Mai 2027)"
        actions={
          <div className="flex items-center gap-1 rounded-[2px] p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-title uppercase tracking-wider rounded-[2px] transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-[#1C2128] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Statistici pe Luni</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quarterly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-title uppercase tracking-wider rounded-[2px] transition-all cursor-pointer ${
                viewMode === 'quarterly'
                  ? 'bg-white dark:bg-[#1C2128] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Vedere Trimestre (Q1–Q4)</span>
            </button>
          </div>
        }
      >
        {viewMode === 'monthly' ? (
          <div className="space-y-6">
            <MonthlyBarChart months={months} height={290} />

            {/* Monthly Synthetic Table */}
            <div className="overflow-x-auto rounded-[2px] border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[620px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider font-title">
                    <th className="px-3.5 py-2.5 text-left">Lună Mandat</th>
                    <th className="px-3 py-2.5 text-center">Operațiuni</th>
                    <th className="px-3.5 py-2.5 text-right">Venituri (RON)</th>
                    <th className="px-3.5 py-2.5 text-right">Cheltuieli (RON)</th>
                    <th className="px-3.5 py-2.5 text-right">Balanță / Profit Lunar</th>
                    <th className="px-3 py-2.5 text-center">Rată Economii</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-data">
                  {months.map(m => {
                    const isPositive = m.net >= 0;
                    return (
                      <tr
                        key={m.key}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 font-bold font-title text-slate-900 dark:text-white">
                          {m.label}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-500">
                          {m.txCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                              <Receipt className="h-3 w-3 text-slate-400" /> {m.txCount}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-emerald-800 dark:text-emerald-300 font-semibold">
                          {m.income > 0 ? `+${formatRON(m.income)}` : '0'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-rose-800 dark:text-rose-300 font-semibold">
                          {m.expense > 0 ? `−${formatRON(m.expense)}` : '0'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[2px] text-xs ${
                              isPositive
                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {formatRON(m.net)} RON
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {m.income > 0 ? (
                            <span
                              className={`text-xs font-bold ${
                                m.savingsRate >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {m.savingsRate}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <GroupedBarChart
              groups={quarters.map(quarter => ({
                label: quarter.label,
                span: quarter.span,
                values: [quarter.income, quarter.expense],
              }))}
              series={[
                { label: 'Venituri / Încasări', color: 'var(--adm-acc-emerald)' },
                { label: 'Cheltuieli / Plăți', color: 'var(--adm-acc-rose)' },
              ]}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-data">
              {quarters.map(q => {
                const qNet = q.income - q.expense;
                const isPos = qNet >= 0;
                return (
                  <div
                    key={q.label}
                    className="p-3 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between text-xs font-title font-bold text-slate-700 dark:text-slate-300">
                      <span>{q.label}</span>
                      <span className="text-slate-500 font-normal">{q.span}</span>
                    </div>
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                        <span>Încasat:</span>
                        <span className="font-bold">+{formatRON(q.income)}</span>
                      </div>
                      <div className="flex justify-between text-rose-800 dark:text-rose-300">
                        <span>Plătit:</span>
                        <span className="font-bold">−{formatRON(q.expense)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span>Net:</span>
                        <span className={isPos ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}>
                          {isPos ? '+' : ''}{formatRON(qNet)} RON
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* 3. Lower Section: Distribuția pe Categorii */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Distribuția Cheltuielilor" subtitle="Pe categorii, sume plătite din casierie / cont">
          <DonutChart slices={expenseSlices} caption="Cheltuit" emptyLabel="Nicio cheltuială plătită" />
        </Panel>

        <Panel title="Surse de Venit" subtitle="Pe categorii, sume încasate (sponsorizări, donații, cotizații)">
          <DonutChart slices={incomeSlices} caption="Încasat" emptyLabel="Niciun venit încasat" />
        </Panel>
      </div>
    </div>
  );
};
