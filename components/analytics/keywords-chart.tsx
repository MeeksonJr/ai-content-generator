"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface KeywordsChartProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
}

export function KeywordsChart({ data, colors }: KeywordsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No keyword data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis type="number" stroke="#888" />
        <YAxis dataKey="name" type="category" stroke="#888" width={120} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
          itemStyle={{ color: "#fff" }}
          formatter={(value: unknown) => [`${value} occurrences`, "Frequency"]}
        />
        <Bar dataKey="value" name="Frequency" radius={[0, 4, 4, 0]}>
          {data.map((entry, index: number) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

