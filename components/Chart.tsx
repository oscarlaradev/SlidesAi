import React from 'react';
import { ChartElement } from '../types';

interface ChartProps {
  chartData: ChartElement;
}

// A simple component to render an SVG bar chart
export const Chart: React.FC<ChartProps> = ({ chartData }) => {
  const { data, options } = chartData;
  const colors = options?.colors || ['#22d3ee'];
  
  if (!data || data.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-slate-400">No chart data</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = 500; // SVG internal coordinate width
  const chartHeight = 300; // SVG internal coordinate height
  const barWidth = (chartWidth - padding.left - padding.right) / data.length * 0.8;
  const barSpacing = (chartWidth - padding.left - padding.right) / data.length * 0.2;

  return (
    <div className="w-full h-full bg-slate-900/30 backdrop-blur-sm rounded-lg p-4 text-slate-200 animate-fade-in">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            {/* Y-Axis Grid Lines */}
            {[...Array(5)].map((_, i) => {
                const y = padding.top + ((chartHeight - padding.top - padding.bottom) / 4) * i;
                return <line key={i} x1={padding.left} y1={y} x2={chartWidth-padding.right} y2={y} stroke="#475569" strokeWidth="0.5" />;
            })}
            
            {/* Bars */}
            {data.map((d, i) => {
                const barHeight = maxValue > 0 ? (d.value / maxValue) * (chartHeight - padding.top - padding.bottom) : 0;
                const x = padding.left + i * (barWidth + barSpacing);
                const y = chartHeight - padding.bottom - barHeight;
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={colors[i % colors.length]}
                            rx="2"
                        >
                            <animate
                                attributeName="height"
                                from="0"
                                to={barHeight}
                                dur="0.5s"
                                fill="freeze"
                                begin={`${i*0.1}s`}
                            />
                             <animate
                                attributeName="y"
                                from={chartHeight - padding.bottom}
                                to={y}
                                dur="0.5s"
                                fill="freeze"
                                begin={`${i*0.1}s`}
                            />
                        </rect>
                        <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fill="#E2E8F0"
                            fontSize="10"
                            fontWeight="bold"
                        >
                            {d.value}
                        </text>
                        <text
                            x={x + barWidth / 2}
                            y={chartHeight - padding.bottom + 15}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="10"
                        >
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    </div>
  );
};