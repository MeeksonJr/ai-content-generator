"use client"

import {
  Treemap,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface KeywordsTreemapProps {
  data: Array<{ name: string; value: number }>
  colors: string[]
}

export function KeywordsTreemap({ data, colors }: KeywordsTreemapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No keyword data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap data={data} dataKey="value" nameKey="name" stroke="#333" fill="#8884d8">
        {data.map((entry, index: number) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
        <Tooltip
          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
          itemStyle={{ color: "#fff" }}
          formatter={(value: unknown) => [`${value} occurrences`, "Frequency"]}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

