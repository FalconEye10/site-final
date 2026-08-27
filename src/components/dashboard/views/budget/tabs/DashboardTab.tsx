import React from 'react';
import { Wallet, TrendingUp, TrendingDown, HeartHandshake } from 'lucide-react';
import { DonutChart, GroupedBarChart } from '../charts';
import { KpiCard, Panel } from '../ui';
import { Transaction, TreasuryPayment, formatRON } from '../types';
import { categoryBreakdown, computeKpis, quarterlyCashflow } from '../selectors';

export const DashboardTab: React.FC<{
  transactions: Transaction[];
  duesPayments?: TreasuryPayment[];
}> = ({ transactions, duesPayments = [] }) => {
  const kpis = computeKpis(transactions, duesPayments);
  const expenseSlices = categoryBreakdown(transactions, 'cheltuiala');
  const incomeSlices = categoryBreakdown(transactions, 'venit', duesPayments);
  const quarters = quarterlyCashflow(transactions, duesPayments);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sold Curent (Disponibil Casierie & Cont)"
          value={formatRON(kpis.currentBalance)}
          emphasis
          accent={kpis.currentBalance >= 0 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
          icon={<Wallet className="h-5 w-5" />}
          hint={`Total Încasat: +${formatRON(kpis.settledIncome)} RON · Total Plătit: −${formatRON(kpis.settledExpense)} RON`}
        />
        <KpiCard
          label="Total Venituri Mandat"
          value={`+${formatRON(kpis.settledIncome)}`}
          accent="var(--adm-acc-blue)"
          icon={<TrendingUp className="h-5 w-5" />}
          hint={
            kpis.duesIncome > 0
              ? `Din care cotizații: +${formatRON(kpis.duesIncome)} RON · Alte surse: +${formatRON(kpis.directIncome)} RON`
              : `Toate încasările confirmate: +${formatRON(kpis.settledIncome)} RON`
          }
        />
        <KpiCard
          label="Total Cheltuieli Mandat"
          value={`−${formatRON(kpis.settledExpense)}`}
          accent="var(--adm-acc-amber)"
          icon={<TrendingDown className="h-5 w-5" />}
          hint={`Total plăți efectuate și decontate`}
        />
        <KpiCard
          label="Donații Caritabile Redirecționate"
          value={formatRON(kpis.charityRedirected)}
          accent="var(--adm-acc-pink)"
          icon={<HeartHandshake className="h-5 w-5" />}
          hint="Fonduri direcționate către cauze caritabile"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Distribuția Cheltuielilor" subtitle="Pe categorii, sume plătite din casierie / cont">
          <DonutChart slices={expenseSlices} caption="Cheltuit" emptyLabel="Nicio cheltuială plătită" />
        </Panel>

        <Panel title="Surse de Venit" subtitle="Pe categorii, sume încasate (sponsorizări, donații, cotizații)">
          <DonutChart slices={incomeSlices} caption="Încasat" emptyLabel="Niciun venit încasat" />
        </Panel>
      </div>

      <Panel title="Cashflow Trimestrial" subtitle="Evoluția intrărilor vs. ieșirilor (Anul de mandat Iunie → Mai)">
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
      </Panel>
    </div>
  );
};
