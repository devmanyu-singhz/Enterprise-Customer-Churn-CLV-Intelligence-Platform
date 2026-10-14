import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Sliders, 
  BarChart3, 
  Activity, 
  Zap, 
  ShieldCheck,
  Database
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, systemStatus }) {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Customer Risk Directory', icon: Users },
    { id: 'inspector', label: 'What-If Risk Simulator', icon: Sliders },
    { id: 'analytics', label: 'Model & SHAP Analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-white text-base tracking-tight">CLV Engine</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Enterprise Intelligence</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Intelligence Suite
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Live Engine Status Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-slate-300">Engine Online</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">v1.0</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/50">
            <span className="flex items-center space-x-1">
              <Database className="w-3 h-3 text-slate-400" />
              <span>Dataset Size:</span>
            </span>
            <span className="font-mono text-slate-200 font-medium">
              {systemStatus?.dataset_records ? `${systemStatus.dataset_records} rows` : '1,200 rows'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-slate-400" />
              <span>Inference:</span>
            </span>
            <span className="text-emerald-400 font-mono font-medium">XGB + Cox</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Explainability: SHAP</span>
          <span>FastAPI + Vite</span>
        </div>
      </div>
    </aside>
  );
}
