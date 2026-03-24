import React from 'react';
import { 
  Upload, 
  RefreshCw, 
  Zap, 
  Mic2, 
  Thermometer, 
  HelpCircle, 
  FileText,
  Play,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { icon: Upload, label: 'Upload XLSX', id: 'upload' },
  { icon: RefreshCw, label: 'Sync Smart Meter', id: 'sync_menu' },
  { icon: Zap, label: 'Transformer Selection', id: 'transformer', active: true },
  { icon: Mic2, label: 'Acoustic Survey', id: 'acoustic' },
  { icon: Thermometer, label: 'Thermal Imaging', id: 'thermal' },
];

interface SidebarProps {
  onSync: () => void;
  onBulkAnalyze: () => void;
  isAnalyzing: boolean;
}

export function Sidebar({ onSync, onBulkAnalyze, isAnalyzing }: SidebarProps) {
  return (
    <aside className="w-72 h-screen fixed left-0 top-0 bg-[#f1f3f5] border-r border-gray-200 flex flex-col pt-20 z-40">
      <div className="px-6 py-4">
        <h2 className="font-kanit font-bold text-lg text-gray-900">KTD Area Intelligence</h2>
        <p className="text-xs text-gray-500 font-inter">Predictive Maintenance AI</p>
      </div>

      <nav className="flex-1 mt-4">
        <div className="px-6 py-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Management</p>
          <button 
            onClick={onSync}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-all text-sm font-kanit mb-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Smart Meter
          </button>
          <button 
            onClick={onBulkAnalyze}
            disabled={isAnalyzing}
            className="w-full flex items-center gap-3 px-4 py-2 bg-mea-orange-light/10 text-mea-orange-light hover:bg-mea-orange-light/20 rounded-lg transition-all text-sm font-kanit disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Bulk Analysis (20 Units)
          </button>
        </div>

        <div className="mt-6">
          <p className="px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Modules</p>
          {menuItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={cn(
                "flex items-center gap-3 px-6 py-3 transition-all duration-200 group",
                item.active 
                  ? "bg-white border-r-4 border-mea-orange-light text-gray-900 font-bold" 
                  : "text-gray-500 hover:bg-gray-200 hover:translate-x-1"
              )}
            >
              <item.icon className={cn("w-5 h-5", item.active ? "text-mea-orange-light" : "text-gray-400")} />
              <span className="font-kanit text-sm">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="p-6">
        <button className="w-full bg-gradient-to-r from-mea-orange to-mea-orange-light text-white py-3 rounded-xl font-bold font-kanit shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all">
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
      </div>
    </aside>
  );
}
