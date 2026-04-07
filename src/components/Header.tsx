import React from 'react';
import { Bell, Settings, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'diagnostics' | 'plan' | 'map') => void;
  onModuleChange?: (id: string) => void;
  isMigrating?: boolean;
  onMenuClick?: () => void;
  user?: { photoURL?: string | null; displayName?: string | null };
}

export function Header({ activeTab, onTabChange, onModuleChange, isMigrating, onMenuClick, user }: HeaderProps) {
  const handleTabClick = (tab: 'overview' | 'diagnostics' | 'plan' | 'map') => {
    onTabChange(tab);
    if (onModuleChange) {
      onModuleChange(tab);
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 fixed top-0 right-0 left-0 z-50 flex justify-between items-center px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg md:text-xl font-bold text-mea-orange-light font-kanit uppercase tracking-tight">AI-Predictive Guardian</span>
        </div>
        {isMigrating && (
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-100 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-mea-orange rounded-full animate-bounce" />
            <span className="text-[10px] font-bold text-mea-orange font-kanit">กำลังปรับปรุงข้อมูล...</span>
          </div>
        )}
      </div>

      <nav className="hidden md:flex items-center gap-8 font-kanit text-sm">
        <button 
          onClick={() => handleTabClick('overview')}
          className={cn(
            "transition-colors pb-1 border-b-2",
            activeTab === 'overview' ? "text-mea-orange-light font-bold border-mea-orange-light" : "text-gray-500 hover:text-mea-orange-light border-transparent"
          )}
        >
          Executive Overview
        </button>
        <button 
          onClick={() => handleTabClick('diagnostics')}
          className={cn(
            "transition-colors pb-1 border-b-2",
            activeTab === 'diagnostics' ? "text-mea-orange-light font-bold border-mea-orange-light" : "text-gray-500 hover:text-mea-orange-light border-transparent"
          )}
        >
          Asset Diagnostics
        </button>
        <button 
          onClick={() => handleTabClick('plan')}
          className={cn(
            "transition-colors pb-1 border-b-2",
            activeTab === 'plan' ? "text-mea-orange-light font-bold border-mea-orange-light" : "text-gray-500 hover:text-mea-orange-light border-transparent"
          )}
        >
          Maintenance Plan
        </button>
        <button 
          onClick={() => handleTabClick('map')}
          className={cn(
            "transition-colors pb-1 border-b-2",
            activeTab === 'map' ? "text-mea-orange-light font-bold border-mea-orange-light" : "text-gray-500 hover:text-mea-orange-light border-transparent"
          )}
        >
          Feeder Map
        </button>
      </nav>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider leading-none">KTT Weather</span>
            <span className="text-xs font-bold text-blue-700">32°C | Humidity 68%</span>
          </div>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-lg">☀️</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-mea-orange-light bg-gray-100">
            <img 
              src={user?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
              alt="User" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
