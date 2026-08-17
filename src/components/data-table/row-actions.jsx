import { MoreHorizontal, Eye, Building2, Network, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function RowActions({ onView, onViewOffices, onViewDepartments, onEdit, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors outline-none">
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 glass-card bg-popover/95 backdrop-blur-xl border-border shadow-xl rounded-xl z-50 p-1">
        {onView && (
          <DropdownMenuItem onClick={onView} className="cursor-pointer text-xs font-medium py-2">
            <Eye size={14} className="mr-2 text-primary" /> View Details
          </DropdownMenuItem>
        )}
        {onViewOffices && (
          <DropdownMenuItem onClick={onViewOffices} className="cursor-pointer text-xs font-medium py-2">
            <Building2 size={14} className="mr-2 text-blue-500" /> Offices
          </DropdownMenuItem>
        )}
        {onViewDepartments && (
          <DropdownMenuItem onClick={onViewDepartments} className="cursor-pointer text-xs font-medium py-2">
            <Network size={14} className="mr-2 text-violet-500" /> Departments
          </DropdownMenuItem>
        )}
        {(onView || onViewOffices || onViewDepartments) && (onEdit || onDelete) && (
          <DropdownMenuSeparator className="my-1 bg-border" />
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer text-xs font-medium py-2">
            <Pencil size={14} className="mr-2 text-muted-foreground" /> Edit
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-xs font-medium py-2 text-destructive focus:text-destructive">
            <Trash2 size={14} className="mr-2" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
