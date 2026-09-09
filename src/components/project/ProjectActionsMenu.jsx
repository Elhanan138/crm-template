import { MoreVertical, Pencil, Trash2, ShieldCheck, Download, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { getProjectEditPath } from '@/lib/projectSlug';

export default function ProjectActionsMenu({
  projectId,
  project,
  canEdit,
  canDelete,
  isRealAdmin,
  onPermissions,
  onDelete,
  onExportPdf,
  onAlerts,
}) {
  const editPath = project ? getProjectEditPath(project) : `/projects/${projectId}/edit`;
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-9 h-9 p-0 rounded-full hover:bg-accent">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link to={editPath} className="flex items-center cursor-pointer">
                <Pencil className="w-4 h-4 me-2" />
                עריכת פרויקט
              </Link>
            </DropdownMenuItem>
          )}
          {onExportPdf && (
            <DropdownMenuItem onClick={onExportPdf} className="flex items-center cursor-pointer">
              <Download className="w-4 h-4 me-2" />
              ייצוא ל-PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onPermissions} className="flex items-center cursor-pointer">
            <ShieldCheck className="w-4 h-4 me-2" />
            הרשאות ובעלות
          </DropdownMenuItem>
          {onAlerts && (
            <DropdownMenuItem onClick={onAlerts} className="flex items-center cursor-pointer">
              <Bell className="w-4 h-4 me-2" />
              התראות פרויקט
            </DropdownMenuItem>
          )}
          {isRealAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="flex items-center text-destructive cursor-pointer">
                <Trash2 className="w-4 h-4 me-2" />
                מחק פרויקט
              </DropdownMenuItem>
            </>
          )}
          {canDelete && !isRealAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="flex items-center text-destructive cursor-pointer">
                <Trash2 className="w-4 h-4 me-2" />
                מחק פרויקט
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}