"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ContentHistoryChartProps {
  data: Array<{ month: string; count: number }>
}

export function ContentHistoryChart({ data }: ContentHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No content history data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="month" stroke="#888" />
        <YAxis stroke="#888" />
        <Tooltip
          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
          itemStyle={{ color: "#fff" }}
          formatter={(value: unknown) => [`${value} pieces`, "Content Created"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="Content Created"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

