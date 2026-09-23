import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from 'recharts';

/** A single day's minutes in the weekly chart (subset of the API's WeeklyPointDTO). */
export interface WeeklyChartPoint {
  day: string;
  minutes: number;
}

/** Weekly practice-minutes bar chart. Today (last point) is highlighted. */
export function WeeklyChart({ data }: { data: WeeklyChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          className="fill-muted-foreground"
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--accent))', opacity: 0.4 }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} min`, 'Practice']}
        />
        <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={38}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={index === data.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
