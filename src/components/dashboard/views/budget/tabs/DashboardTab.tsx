import React from 'react';
import { Wallet, TrendingUp, TrendingDown, HeartHandshake, Clock } from 'lucide-react';
import { DonutChart, GroupedBarChart } from '../charts';
import { KpiCard, Panel } from '../ui';
import { Transaction, formatRON } from '../types';
import { categoryBreakdown, computeKpis, quarterlyCashflow } from '../selectors';

export const DashboardTab: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const kpis = computeKpis(transactions);
  const expenseSlices = categoryBreakdown(transactions, 'cheltuiala');
  const incomeSlices = categoryBreakdown(transactions, 'venit');
  const quarters = quarterlyCashflow(transactions);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sold Curent"
          value={formatRON(kpis.currentBalance)}
          emphasis
          accent={kpis.currentBalance >= 0 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
          icon={<Wallet className="h-5 w-5" />}
        />
        <KpiCard
          label="Total Venituri Mandat"
          value={formatRON(kpis.mandateIncome)}
          accent="var(--adm-acc-blue)"
          icon={<TrendingUp className="h-5 w-5" />}
          hint={`Din care încasate: ${formatRON(kpis.settledIncome)} RON`}
        />
        <KpiCard
          label="Total Cheltuieli Mandat"
          value={formatRON(kpis.mandateExpense)}
          accent="var(--adm-acc-amber)"
          icon={<TrendingDown className="h-5 w-5" />}
          hint={`Din care plătite: ${formatRON(kpis.settledExpense)} RON`}
        />
        <KpiCard
          label="Donații Caritabile Redirecționate"
          value={formatRON(kpis.charityRedirected)}
          accent="var(--adm-acc-pink)"
          icon={<HeartHandshake className="h-5 w-5" />}
        />
      </div>

      {kpis.pendingCount > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{
            background: 'color-mix(in srgb, var(--adm-acc-amber) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--adm-acc-amber) 30%, transparent)',
            borderRadius: 2,
          }}
        >
          <Clock className="h-4 w-4 shrink-0" style={{ color: 'var(--adm-acc-amber)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--adm-ink)' }}>
            {kpis.pendingCount} {kpis.pendingCount === 1 ? 'tranzacție așteaptă' : 'tranzacții așteaptă'} aprobare
            <span style={{ color: 'var(--adm-ink-dim)' }}> — {formatRON(kpis.pendingAmount)} RON neconfirmați</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Distribuția Cheltuielilor" subtitle="Pe categorii, sume plătite">
          <DonutChart slices={expenseSlices} caption="Cheltuit" emptyLabel="Nicio cheltuială plătită" />
        </Panel>

        <Panel title="Surse de Venit" subtitle="Pe categorii, sume încasate">
          <DonutChart slices={incomeSlices} caption="Încasat" emptyLabel="Niciun venit încasat" />
        </Panel>
      </div>

      <Panel title="Cashflow Trimestrial" subtitle="Anul de mandat Iulie → Iunie">
        <GroupedBarChart
          groups={quarters.map(quarter => ({
            label: quarter.label,
            span: quarter.span,
            values: [quarter.income, quarter.expense],
          }))}
          series={[
            { label: 'Venituri', color: 'var(--adm-acc-emerald)' },
            { label: 'Cheltuieli', color: 'var(--adm-acc-rose)' },
          ]}
        />
      </Panel>
    </div>
  );
};
