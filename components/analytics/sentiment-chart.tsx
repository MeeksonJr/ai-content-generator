"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface SentimentChartProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
  sentimentColors: Record<string, string>
}

export function SentimentChart({ data, colors, sentimentColors }: SentimentChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No sentiment data available
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
          label={({ name, percent }) => {
            const value = percent ?? 0
            return `${name}: ${(value * 100).toFixed(0)}%`
          }}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index: number) => (
            <Cell
              key={`cell-${index}`}
              fill={sentimentColors[entry.name as keyof typeof sentimentColors] || colors[index % colors.length]}
            />
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

