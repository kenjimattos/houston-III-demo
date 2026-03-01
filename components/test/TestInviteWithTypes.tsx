"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InviteUserForm } from "@/components/auth/InviteUserForm";

export function TestInviteWithTypes() {
  const handleSuccess = () => {
    console.log("Convite enviado com sucesso!");
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Testar Convite com Tipagem</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Estrutura dos Dados:</h3>
        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
          {`{
  "name": "João Silva",
  "email": "joao@exemplo.com", 
  "phone": "(11) 99999-9999",
  "group_id": "uuid-do-grupo",
  "role": "escalista"
}`}
        </pre>

        <h3 className="font-medium mb-2 mt-4">Roles Disponíveis:</h3>
        <ul className="text-xs space-y-1">
          <li>
            • <strong>escalista</strong> (padrão)
          </li>
          <li>• medico</li>
          <li>• enfermeiro</li>
          <li>• tecnico</li>
          <li>• coordenador</li>
          <li>• admin</li>
          <li>• super_admin</li>
        </ul>
      </div>
    </div>
  );
}
