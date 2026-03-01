"use client"

import Link from "next/link"
import { FileText, BarChart3, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RelatoriosPage() {
  const relatorios = [
    {
      title: "Folha de Pagamento",
      description: "Relatório detalhado de folha de pagamento com filtros avançados e métricas",
      icon: FileText,
      href: "/relatorios/folha-pagamento",
      color: "text-blue-600"
    },
    {
      title: "Produtividade dos Escalistas",
      description: "Análise de produtividade dos escalistas com métricas de aprovação",
      icon: BarChart3,
      href: "/relatorios/produtividade-escalistas",
      color: "text-green-600"
    },
    {
      title: "Relatório de Grades",
      description: "Configurações das grades organizadas por hospital, setor e horários",
      icon: Calendar,
      href: "/relatorios/grades",
      color: "text-purple-600"
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-normal tracking-tight">Relatórios</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatorios.map((relatorio) => {
              const Icon = relatorio.icon
              return (
                <Card key={relatorio.href} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${relatorio.color}`} />
                      {relatorio.title}
                    </CardTitle>
                    <CardDescription>
                      {relatorio.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={relatorio.href}>
                      <Button className="w-full">
                        Acessar Relatório
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
