import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  AreaChart as ReAreaChart,
  Area,
} from "recharts";
import { Maximize2, X } from "lucide-react";
import { formatCompact, formatCurrency } from "../lib/formatters";

const COLORS = [
  "#4e73df",
  "#1cc88a",
  "#36b9cc",
  "#f6c23e",
  "#e74a3b",
  "#858796",
  "#5a5c69",
  "#6f42c1",
  "#fd7e14",
  "#20c9a6",
];

// ---- Donut / Pie Chart ----

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (v: number) => string;
  colors?: string[];
}

export function DonutChart({
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  formatValue = (v) => formatCurrency(v),
  colors = COLORS,
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          label={({ name, percent }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={true}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatValue(value), "Value"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- Bar Chart ----

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey?: string;
  bars: { key: string; name: string; color: string }[];
  height?: number;
  formatTooltip?: (v: number) => string;
}

export function BarChartComponent({
  data,
  xKey = "name",
  bars,
  height = 300,
  formatTooltip = (v) => formatCurrency(v),
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatTooltip(value),
            name,
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
            barSize={30}
            label={({ x, y, width, height, value }) => {
              if (!value || value === 0 || height < 15) return null;
              return (
                <text
                  x={x! + width! / 2}
                  y={y! - 5}
                  textAnchor="middle"
                  fill={bar.color}
                  fontSize={10}
                  fontWeight={500}
                >
                  {formatCompact(value as number)}
                </text>
              );
            }}
          />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

// ---- Line Chart ----

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey?: string;
  lines: { key: string; name: string; color: string }[];
  height?: number;
  formatTooltip?: (v: number) => string;
}

export function LineChartComponent({
  data,
  xKey = "name",
  lines,
  height = 300,
  formatTooltip = (v) => formatCurrency(v),
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatTooltip(value),
            name,
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ fill: line.color, r: 4 }}
            activeDot={{ r: 6 }}
            label={({ x, y, value }) => {
              if (!value || value === 0 || !y) return null;
              return (
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fill={line.color}
                  fontSize={10}
                  fontWeight={500}
                >
                  {formatCompact(value as number)}
                </text>
              );
            }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}

// ---- Area Chart ----

interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey?: string;
  areas: { key: string; name: string; color: string }[];
  height?: number;
  formatTooltip?: (v: number) => string;
}

export function AreaChartComponent({
  data,
  xKey = "name",
  areas,
  height = 300,
  formatTooltip = (v) => formatCurrency(v),
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "#718096" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatTooltip(value),
            name,
          ]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontSize: "13px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {areas.map((area) => (
          <Area
            key={area.key}
            type="monotone"
            dataKey={area.key}
            name={area.name}
            stroke={area.color}
            fill={area.color}
            fillOpacity={0.3}
            strokeWidth={2}
            label={({ x, y, value }) => {
              if (!value || value === 0 || !y) return null;
              return (
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fill={area.color}
                  fontSize={10}
                  fontWeight={500}
                >
                  {formatCompact(value as number)}
                </text>
              );
            }}
          />
        ))}
      </ReAreaChart>
    </ResponsiveContainer>
  );
}

// ---- Chart Card Wrapper ----

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
        <div className="bg-card-bg rounded-xl shadow-2xl border border-border w-full max-w-6xl max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <button onClick={() => setExpanded(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl shadow-sm border border-border p-5 animate-fade-in-up relative group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <button 
          onClick={() => setExpanded(true)} 
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Expand chart"
        >
          <Maximize2 size={16} className="text-gray-400" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-card-bg rounded-xl shadow-sm border border-border p-5">
      <div className="skeleton h-4 w-40 mb-4" />
      <div className="skeleton w-full" style={{ height }} />
    </div>
  );
}

export { COLORS };
