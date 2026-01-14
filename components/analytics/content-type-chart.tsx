"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ContentTypeChartProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
}

export function ContentTypeChart({ data, colors }: ContentTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No content type data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => {
            const value = percent ?? 0
            return `${name}: ${(value * 100).toFixed(0)}%`
          }}
        >
          {data.map((entry, index: number) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
          itemStyle={{ color: "#fff" }}
          formatter={(value: unknown) => [`${value} pieces`, "Count"]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

