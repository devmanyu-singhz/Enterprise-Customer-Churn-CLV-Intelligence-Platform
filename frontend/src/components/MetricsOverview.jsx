import React from 'react';
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';

export default function MetricsOverview({ kpis, riskDistribution }) {
  if (!kpis) return null;

  const highRisk = riskDistribution?.find(r => r.tier === 'High Risk')?.count || 0;
  const highRiskPct = riskDistribution?.find(r => r.tier === 'High Risk')?.percentage || 0;

  const cards = [
    {
      title: 'Overall Churn Rate',
      value: `${(kpis.churn_rate * 100).toFixed(1)}%`,
      subtitle: `${kpis.churned_count} of ${kpis.total_customers} churned`,
      icon: TrendingUp,
      color: kpis.churn_rate > 0.3 ? 'text-amber-400' : 'text-emerald-400',
      badgeBg: kpis.churn_rate > 0.3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      badgeText: kpis.churn_rate > 0.3 ? 'Elevated Risk' : 'Healthy Retention'
    },
    {
      title: 'Annual Revenue at Risk',
      value: `$${kpis.annual_revenue_at_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'From High-Risk customer segment',
      icon: AlertTriangle,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
      badgeText: 'Priority Action'
    },
    {
      title: 'Monthly Recurring Revenue (MRR)',
      value: `$${kpis.total_monthly_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `Avg $${kpis.avg_monthly_charges}/mo per customer`,
      icon: DollarSign,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      badgeText: 'Active MRR'
    },
    {
      title: 'Average Customer CLV',
      value: `$${kpis.avg_customer_clv?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Dynamic Cox Survival-adjusted',
      icon: Users,
      color: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
      badgeText: 'Predictive CLV'
    },
    {
      title: 'High-Risk Customer Pool',
      value: `${highRisk} accounts`,
      subtitle: `${highRiskPct}% of total customer portfolio`,
      icon: ShieldAlert,
      color: 'text-orange-400',
      badgeBg: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
      badgeText: 'Retention Targets'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all duration-200"
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 tracking-wide">{card.title}</span>
              <div className={`p-2 rounded-lg bg-slate-800/80 ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Main Value */}
            <div className="text-2xl font-bold text-white tracking-tight font-mono mb-1">
              {card.value}
            </div>

            {/* Subtitle & Badge */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{card.subtitle}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeBg}`}>
                {card.badgeText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
