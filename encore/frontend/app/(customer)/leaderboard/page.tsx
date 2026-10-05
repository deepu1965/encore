'use client';

import { useLeaderboard } from '@/features/discovery/queries';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading, error } = useLeaderboard();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1 font-bold">Leaderboard</h1>
        <p className="text-body text-muted mt-1">
          Top fans and event attendees this month.
        </p>
      </header>

      <div className="max-w-3xl">
        {isLoading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <EmptyState
            title="Unable to load leaderboard"
            description="Something went wrong while fetching the leaderboard."
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        )}

        {!isLoading && !error && leaderboard?.length === 0 && (
          <EmptyState
            title="No leaders yet"
            description="Check back later when more events have occurred."
          />
        )}

        {!isLoading && !error && leaderboard && leaderboard.length > 0 && (
          <div className="flex flex-col gap-4">
            {leaderboard.map((entry) => (
              <Card key={entry.userId} className="overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 font-bold text-lg text-muted-foreground">
                    #{entry.rank}
                  </div>
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                    <AvatarFallback>{entry.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{entry.name}</h3>
                    <p className="text-sm text-muted-foreground">{entry.points.toLocaleString()} points</p>
                  </div>
                  {entry.rank <= 3 && (
                    <Badge variant={entry.rank === 1 ? 'default' : 'secondary'}>
                      {entry.rank === 1 ? 'Gold' : entry.rank === 2 ? 'Silver' : 'Bronze'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
