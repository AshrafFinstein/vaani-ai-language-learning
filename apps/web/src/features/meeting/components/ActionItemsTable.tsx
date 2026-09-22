import type { ActionItemDTO } from '@vaani/types';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<ActionItemDTO['status'], 'default' | 'secondary' | 'success' | 'muted'> =
  {
    OPEN: 'secondary',
    IN_PROGRESS: 'default',
    DONE: 'success',
    BLOCKED: 'muted',
  };

const STATUS_LABEL: Record<ActionItemDTO['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

/** Renders the "# / item / owner / status" action-items table. */
export function ActionItemsTable({ items }: { items: ActionItemDTO[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No action items were identified.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="w-10 py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium">Owner</th>
            <th className="py-2 pr-3 font-medium">Due</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0 align-top">
              <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{item.ordinal}</td>
              <td className="py-2.5 pr-3">{item.description}</td>
              <td className="py-2.5 pr-3">
                <span className={item.owner === 'Unassigned' ? 'text-muted-foreground' : ''}>
                  {item.owner}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <span className={item.dueDate === 'Not specified' ? 'text-muted-foreground' : ''}>
                  {item.dueDate}
                </span>
              </td>
              <td className="py-2.5">
                <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
