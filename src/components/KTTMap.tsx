import React, { useMemo, useState, memo } from 'react';
import { RiskStatus } from '../lib/modelLogic';
import { cn } from '../lib/utils';
import { Maximize2, Minimize2, MousePointer2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  status: RiskStatus;
  riskScore: number;
}

interface KTTMapProps {
  points: MapPoint[];
  onPointClick: (id: string) => void;
  mode?: 'points' | 'heatmap';
  gisLayers?: string[];
}

export const KTTMap = memo(function KTTMap({ points, onPointClick, mode = 'points' }: KTTMapProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Calculate bounds for normalization
  const bounds = useMemo(() => {
    if (points.length === 0) return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    points.forEach(p => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    });

    // Add some padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding
    };
  }, [points]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      className={cn(
        "w-full h-full rounded-2xl overflow-hidden relative border shadow-inner transition-colors duration-500 bg-slate-950 border-slate-800",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Schematic Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', 
          backgroundSize: '40px 40px',
          transform: `translate(${offset.x % 40}px, ${offset.y % 40}px)`
        }} />
      </div>

      {/* Map Content */}
      <svg 
        className="w-full h-full pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
      >
        <g style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center' }}>
          {/* Schematic Road/Feeder Lines (Mock) */}
          <path 
            d="M 100 200 L 900 200 M 100 500 L 900 500 M 100 800 L 900 800 M 300 100 L 300 900 M 700 100 L 700 900" 
            stroke="#1e293b" 
            strokeWidth="4" 
            fill="none" 
          />
          
          {/* Points */}
          {points.map(p => {
            const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 800 + 100;
            const y = (1 - (p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 800 + 100;
            
            const color = p.status === 'Critical' ? '#ef4444' : p.status === 'Warning' ? '#f59e0b' : '#10b981';
            const isHovered = hoveredPoint === p.id;

            return (
              <g 
                key={p.id} 
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPointClick(p.id);
                }}
                onMouseEnter={() => setHoveredPoint(p.id)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Heatmap Glow */}
                {mode === 'heatmap' && (
                  <circle 
                    cx={x} cy={y} 
                    r={30 + (p.riskScore / 2)} 
                    fill={color} 
                    fillOpacity={0.15}
                  >
                    <animate attributeName="r" values={`${30 + p.riskScore/2};${40 + p.riskScore/2};${30 + p.riskScore/2}`} dur="3s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Point */}
                <circle 
                  cx={x} cy={y} 
                  r={isHovered ? 8 : 5} 
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-200"
                />
                
                {/* Label on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <rect 
                        x={x + 10} y={y - 15} 
                        width={80} height={30} 
                        rx={4} 
                        fill="#1e293b" 
                        stroke="#334155"
                      />
                      <text 
                        x={x + 50} y={y + 5} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="10" 
                        fontWeight="bold"
                        className="font-inter"
                      >
                        {p.id}
                      </text>
                    </motion.g>
                  )}
                </AnimatePresence>
              </g>
            );
          })}
        </g>
      </svg>

      {/* UI Overlays */}
      <div className="absolute top-4 left-4 z-10 backdrop-blur-md bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-white shadow-xl">
        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2 text-mea-orange-light">
          <MousePointer2 className="w-3 h-3" />
          Schematic Digital Twin Map
        </h4>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-mea-red shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            <span className="text-[10px] text-slate-400">Critical Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-mea-orange-light shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-[10px] text-slate-400">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-mea-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] text-slate-400">Healthy</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(prev * 1.2, 5)); }}
          className="p-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg text-white hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(prev / 1.2, 0.5)); }}
          className="p-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg text-white hover:bg-slate-800 transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); resetView(); }}
          className="p-2 bg-mea-orange-light text-white rounded-lg hover:bg-mea-orange transition-colors font-bold text-[10px]"
        >
          RESET
        </button>
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[9px] text-slate-500 font-inter bg-slate-950/50 px-2 py-1 rounded-full backdrop-blur-sm">
        <Info className="w-3 h-3" />
        Drag to pan • Scroll to zoom • Click assets for details
      </div>
    </div>
  );
});
