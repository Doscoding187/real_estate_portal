import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", leads: 12, sales: 3 },
  { month: "Feb", leads: 19, sales: 5 },
  { month: "Mar", leads: 15, sales: 4 },
  { month: "Apr", leads: 25, sales: 7 },
  { month: "May", leads: 28, sales: 8 },
  { month: "Jun", leads: 32, sales: 9 },
];

export function PerformanceChart() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Your Monthly Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="leads" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Leads"
            />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
              name="Sales"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}