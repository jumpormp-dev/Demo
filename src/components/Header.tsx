import React from 'react';
import { Bell, Settings } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 fixed top-0 right-0 left-0 z-50 flex justify-between items-center px-8">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-mea-orange-light font-kanit">MEA Smart Plan</span>
      </div>

      <nav className="hidden md:flex items-center gap-8 font-kanit text-sm">
        <a href="#" className="text-gray-500 hover:text-mea-orange-light transition-colors">Executive Overview</a>
        <a href="#" className="text-mea-orange-light font-bold border-b-2 border-mea-orange-light pb-1">Asset Diagnostics</a>
        <a href="#" className="text-gray-500 hover:text-mea-orange-light transition-colors">Maintenance Plan</a>
      </nav>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-mea-orange-light">
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" 
            alt="User" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
