import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
  score: number;
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const data = [
    { value: score },
    { value: 100 - score },
  ];

  const getStatus = (s: number) => {
    if (s >= 80) return { label: 'Critical', color: '#b81120' };
    if (s >= 50) return { label: 'Warning', color: '#ff8c00' };
    return { label: 'Healthy', color: '#006e25' };
  };

  const status = getStatus(score);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border-l-4 flex flex-col items-center justify-center relative h-full transition-all duration-500" style={{ borderLeftColor: status.color }}>
      <div className="absolute top-6 left-8">
        <h3 className="font-inter font-bold text-gray-900">Risk Score (%)</h3>
      </div>
      
      <div className="w-48 h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              animationDuration={1000}
            >
              <Cell fill={status.color} />
              <Cell fill="#f3f4f5" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-inter leading-none transition-colors duration-500" style={{ color: status.color }}>{score}</span>
          <span className="text-xs font-bold uppercase tracking-wider mt-1 transition-colors duration-500" style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 max-w-[220px]">
          {score >= 80 
            ? "Probability of failure within next 90 days is elevated." 
            : score >= 50 
            ? "Moderate risk detected. Scheduled maintenance recommended."
            : "Asset is operating within normal parameters."}
        </p>
      </div>
    </div>
  );
}
