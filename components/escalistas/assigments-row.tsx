import { ROLE_CONFIG, UserAssignment, UserRoleType } from "@/types/user-roles-shared";
import { Minus } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export type AssignmentsRowProps = {
  assignment: UserAssignment;
  table: {
    id: string;
    name: string;
  };
  handleRemove: (role: UserRoleType, tableId: string) => Promise<void>;
  isLoading: boolean;
};

export default function AssignmentsRow({
  assignment,
  table,
  handleRemove,
  isLoading,
}: AssignmentsRowProps) {
  return (
    <div
      key={`${assignment.role}-${table.id}`}
      className="flex items-center justify-between p-2 bg-gray-50 rounded"
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={ROLE_CONFIG[assignment.role].color}>
          {ROLE_CONFIG[assignment.role].label}
        </Badge>
        <span className="text-sm">{table.name}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleRemove(assignment.role, table.id)}
        disabled={isLoading}
      >
        <Minus className="w-4 h-4" />
      </Button>
    </div>
  );
}
