"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Trash2, SquarePen, MoreVertical, Users, Info } from "lucide-react"
import { type Equipe, type EquipeMedicoView } from "@/services/equipesService"
import { FavoriteButton } from "./favorite-button"
import { MedicoRowEquipes } from "./medico-row-equipes"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { getValidProfilePictureUrl } from "@/lib/utils"

interface EquipeCardProps {
  equipe: Equipe
  medicos: EquipeMedicoView[]
  equipes: Equipe[] // Lista de todas as equipes para o menu
  favoritosIds: string[] // IDs dos médicos favoritos
  doctors: any[] // Lista completa de médicos para o modal
  searchTerm?: string // Termo de busca para destaque
  matchedMedicos?: Set<string> // IDs dos médicos que fazem match com a busca
  onEdit: (equipe: Equipe) => void
  onDelete: (equipeId: string) => void
  onAddMedico: (equipeId: string) => void
  onRemoveMedico: (equipeId: string, medicoId: string) => void
  onFavoriteChange: () => void
  onFavoriteSuccess: () => void
  onEquipeChange: () => void
  onOpenModal: (doctor: any) => void
}

export function EquipeCard({
  equipe,
  medicos,
  equipes,
  favoritosIds,
  doctors,
  searchTerm = "",
  matchedMedicos = new Set(),
  onEdit,
  onDelete,
  onAddMedico,
  onRemoveMedico,
  onFavoriteChange,
  onFavoriteSuccess,
  onEquipeChange,
  onOpenModal
}: EquipeCardProps) {
  const [expandedMedicos, setExpandedMedicos] = useState(false)
  const maxMedicosToShow = 3

  const toggleExpandMedicos = () => {
    setExpandedMedicos(!expandedMedicos)
  }

  const medicosToDisplay = expandedMedicos ? medicos : medicos.slice(0, maxMedicosToShow)
  const hasMoreMedicos = medicos.length > maxMedicosToShow

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-normal text-lg">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: equipe.cor }}
            />
            <HighlightedText
              text={equipe.nome}
              searchTerm={searchTerm}
              className="truncate"
            />
            <Badge variant="secondary" className="ml-2">
              {medicos.length} {medicos.length === 1 ? 'médico' : 'médicos'}
            </Badge>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(equipe)}>
                <SquarePen className="mr-2 h-4 w-4" />
                Editar equipe
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(equipe.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir equipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {medicosToDisplay.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum médico nesta equipe</p>
              <p className="text-sm mt-1">Adicione médicos do corpo clínico</p>
            </div>
          ) : (
            <>
              {medicosToDisplay.map((medico) => {
                const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`
                const medicoOriginal = doctors.find(d => d.id === medico.medico_id)

                return (
                  <div
                    key={medico.medico_id}
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group ${matchedMedicos.has(medico.medico_id) ? 'bg-primary-50 dark:bg-primary-500/20 border border-primary-200 dark:border-primary-500' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {getValidProfilePictureUrl(medicoOriginal?.profile_picture_url) && (
                          <AvatarImage src={getValidProfilePictureUrl(medicoOriginal?.profile_picture_url)} alt={nomeCompleto} />
                        )}
                        <AvatarFallback className="text-xs">
                          {medico.primeiro_nome?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <HighlightedText
                          text={nomeCompleto}
                          searchTerm={searchTerm}
                          className="text-sm font-normal truncate"
                        />
                        <p className="text-xs text-muted-foreground">
                          {medico.especialidade_nome || "Sem especialidade"} • CRM: <HighlightedText
                            text={medico.crm}
                            searchTerm={searchTerm}
                            className="text-xs text-muted-foreground"
                          />
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FavoriteButton
                        medicoId={medico.medico_id}
                        isFavorite={favoritosIds.includes(medico.medico_id)}
                        onToggle={onFavoriteChange}
                        onSuccess={onFavoriteSuccess}
                        isPrecadastro={medico.is_precadastro}
                      />
                      <MedicoRowEquipes
                        medicoId={medico.medico_id}
                        medicoNome={nomeCompleto}
                        equipes={equipes}
                        onEquipeChange={onEquipeChange}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          // Para médicos pré-cadastrados, criar objeto compatível com o modal
                          // Para médicos confirmados, usar medicoOriginal se disponível, senão criar objeto a partir dos dados da view
                          const medicoParaModal = medico.is_precadastro ? {
                            id: medico.medico_id,
                            primeiro_nome: medico.primeiro_nome,
                            sobrenome: medico.sobrenome,
                            crm: medico.crm,
                            email: medico.email || '',
                            telefone: medico.telefone || '',
                            especialidade_nome: medico.especialidade_nome,
                            is_precadastro: true
                          } : medicoOriginal || {
                            // Fallback para médicos confirmados não encontrados na lista doctors
                            id: medico.medico_id,
                            primeiro_nome: medico.primeiro_nome,
                            sobrenome: medico.sobrenome,
                            crm: medico.crm,
                            email: medico.email || '',
                            telefone: medico.telefone || '',
                            especialidade_nome: medico.especialidade_nome,
                            is_precadastro: false
                          }

                          if (medicoParaModal) {
                            onOpenModal(medicoParaModal)
                          }
                        }}
                        title="Ver detalhes do médico"
                      >
                        <Info className="h-4 w-4 text-gray-700" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemoveMedico(equipe.id, medico.medico_id)}
                        title="Remover médico da equipe"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {hasMoreMedicos && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={toggleExpandMedicos}
                >
                  {expandedMedicos ? (
                    <>Mostrar menos</>
                  ) : (
                    <>Mostrar mais {medicos.length - maxMedicosToShow} médicos</>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}