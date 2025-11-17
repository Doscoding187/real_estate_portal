import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskCardProps {
  title: string;
  dueDate: string;
  status: 'pending' | 'screening' | 'preview' | 'presentation';
  team: string[];
}

export function TaskCard({ title, dueDate, status, team }: TaskCardProps) {
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500',
    screening: 'bg-yellow-500 text-white',
    preview: 'bg-blue-600 text-white',
    presentation: 'bg-green-600/20 text-green-700 border-green-600',
  };

  return (
    <Card className="card hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Badge className={statusColors[status]} variant="outline">
            {status}
          </Badge>
        </div>
        <h4 className="font-semibold text-foreground mb-2">{title}</h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Calendar className="h-4 w-4" />
          <span>Due {dueDate}</span>
        </div>
        <div className="flex items-center -space-x-2">
          {team.map((member, i) => (
            <Avatar key={i} className="h-8 w-8 border-2 border-card">
              <AvatarImage src={member} />
              <AvatarFallback>U{i + 1}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
