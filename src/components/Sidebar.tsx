import React, { memo } from 'react';
import { 
  LayoutDashboard,
  Upload, 
  RefreshCw, 
  Zap, 
  Mic2, 
  Thermometer, 
  Map as MapIcon,
  Calendar as CalendarIcon,
  HelpCircle, 
  FileText,
  Play,
  Loader2,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Asset } from '../App';

interface SidebarProps {
  onSync: () => void;
  onBulkAnalyze: () => void;
  isAnalyzing: boolean;
  activeModule: string;
  onModuleChange: (id: string) => void;
  onSurveyClick: () => void;
  onLogout: () => void;
  assets: Asset[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ onSync, onBulkAnalyze, isAnalyzing, activeModule, onModuleChange, onSurveyClick, onLogout, assets, isOpen, onClose }: SidebarProps) {
  const pmProgress = Math.round((assets.filter(a => a.pmStatus === 'Completed').length / assets.length) * 100) || 0;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Executive Overview', id: 'overview' },
    { icon: Upload, label: 'Upload XLSX', id: 'upload' },
    { icon: RefreshCw, label: 'Sync Smart Meter', id: 'sync_menu' },
    { icon: Zap, label: 'Transformer Selection', id: 'diagnostics' },
    { icon: Mic2, label: 'Acoustic Survey', id: 'acoustic' },
    { icon: Thermometer, label: 'Thermal Imaging', id: 'thermal' },
    { icon: CalendarIcon, label: 'Maintenance Plan', id: 'plan', badge: `${pmProgress}%` },
    { icon: MapIcon, label: 'Feeder Map (KTT)', id: 'map' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "w-72 h-screen fixed left-0 top-0 bg-[#f1f3f5] border-r border-gray-200 flex flex-col pt-20 z-40 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      <div className="px-6 py-4">
        <h2 className="font-kanit font-black text-lg text-gray-900 uppercase tracking-tight">AI-Predictive Guardian</h2>
        <p className="text-[10px] text-gray-500 font-inter uppercase font-bold tracking-widest">Industrial Intelligence</p>
      </div>

      <nav className="flex-1 mt-4">
        <div className="px-6 py-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Management</p>
          <button 
            onClick={onSync}
            disabled={isAnalyzing}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-all text-sm font-kanit mb-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Smart Meter
          </button>
          <button 
            onClick={onBulkAnalyze}
            disabled={isAnalyzing}
            className="w-full flex items-center gap-3 px-4 py-2 bg-mea-orange-light/10 text-mea-orange-light hover:bg-mea-orange-light/20 rounded-lg transition-all text-sm font-kanit disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Bulk Analysis (158 Units)
          </button>
        </div>

        <div className="mt-6">
          <p className="px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Modules</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'sync_menu') onSync();
                else onModuleChange(item.id);
              }}
              className={cn(
                "w-full flex items-center justify-between px-6 py-3 transition-all duration-200 group text-left",
                activeModule === item.id 
                  ? "bg-white border-r-4 border-mea-orange-light text-gray-900 font-bold" 
                  : "text-gray-500 hover:bg-gray-200 hover:translate-x-1"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", activeModule === item.id ? "text-mea-orange-light" : "text-gray-400")} />
                <span className="font-kanit text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  activeModule === item.id ? "bg-mea-orange-light text-white" : "bg-gray-200 text-gray-500"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-6">
        <button 
          onClick={onSurveyClick}
          className="w-full bg-gradient-to-r from-mea-orange to-mea-orange-light text-white py-3 rounded-xl font-bold font-kanit shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all"
        >
          Record Field Survey
        </button>
      </div>

      <div className="px-6 pb-8 border-t border-gray-200 pt-4 space-y-3">
        <a href="#" className="flex items-center gap-3 text-gray-500 text-xs font-kanit hover:text-mea-orange-light transition-colors">
          <HelpCircle className="w-4 h-4" /> Support
        </a>
        <a href="#" className="flex items-center gap-3 text-gray-500 text-xs font-kanit hover:text-mea-orange-light transition-colors">
          <FileText className="w-4 h-4" /> Documentation
        </a>
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 text-mea-red text-xs font-kanit hover:opacity-80 transition-opacity pt-2"
        >
          <LogOut className="w-4 h-4" /> ออกจากระบบ (Logout)
        </button>
      </div>
    </aside>
    </>
  );
});
