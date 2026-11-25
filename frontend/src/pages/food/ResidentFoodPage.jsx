import { useQuery } from '@tanstack/react-query'
import { residentApi } from '../../services/apis'
import { Card, EmptyState, ErrorState, PageHeader, TableSkeleton } from '../../components/ui'
import { WeekMenu } from '../../components/food/WeekMenu'

export function ResidentFoodPage() {
  const query = useQuery({ queryKey: ['my-food-menu'], queryFn: residentApi.foodMenu })
  return (
    <div>
      <PageHeader title="Food menu" description={query.data?.propertyName || 'This week at your PG'} />
      {query.isLoading ? <TableSkeleton rows={4} /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={query.refetch} /> : null}
      {query.data && !query.data.entries.length ? <EmptyState title="No menu yet" description="Your PG has not added the food menu." /> : null}
      {query.data?.entries.length ? (
        <>
          {query.data.note ? <Card className="mb-4 border-brand p-4 text-sm text-ink-950">{query.data.note}</Card> : null}
          <WeekMenu menu={query.data} today={query.data.today} />
        </>
      ) : null}
    </div>
  )
}
