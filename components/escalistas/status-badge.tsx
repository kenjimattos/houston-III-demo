import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "pendente" | "ativo" | "inativo";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pendente: {
      label: "Pendente",
      variant: "outline" as const,
      className: "border-0 text-yellow-700 bg-yellow-50",
    },
    ativo: {
      label: "Ativo",
      variant: "default" as const,
      className: "border-0 text-green-700 bg-green-50",
    },
    inativo: {
      label: "Inativo",
      variant: "secondary" as const,
      className: "border-0 text-gray-700 bg-gray-50",
    },
  };

  const config = statusConfig[status] || statusConfig.pendente;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
