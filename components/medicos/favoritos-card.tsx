"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Star, Info } from "lucide-react"
import { type Medico } from "@/services/medicosService"
import { FavoriteButton } from "./favorite-button"
import { MedicoRowEquipes } from "./medico-row-equipes"
import { type Equipe } from "@/services/equipesService"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { getValidProfilePictureUrl } from "@/lib/utils"

interface FavoritosCardProps {
  medicos: Medico[] // Lista de médicos favoritos
  equipes: Equipe[] // Lista de todas as equipes para o menu
  favoritosIds: string[] // IDs dos médicos favoritos
  searchTerm?: string // Termo de busca para destaque
  matchedMedicos?: Set<string> // IDs dos médicos que fazem match com a busca
  onFavoriteChange: () => void
  onFavoriteSuccess: () => void
  onEquipeChange: () => void
  onOpenModal: (doctor: Medico) => void
}

export function FavoritosCard({
  medicos,
  equipes,
  favoritosIds,
  searchTerm = "",
  matchedMedicos = new Set(),
  onFavoriteChange,
  onFavoriteSuccess,
  onEquipeChange,
  onOpenModal
}: FavoritosCardProps) {
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
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            <span className="truncate">Médicos Favoritos</span>
            <Badge variant="secondary" className="ml-2">
              {medicos.length} {medicos.length === 1 ? 'médico' : 'médicos'}
            </Badge>
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Médicos adicionados tem suas candidaturas e trocas de plantão aprovados automaticamente.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {medicosToDisplay.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum médico favorito</p>
              <p className="text-sm mt-1">Adicione médicos aos favoritos para aprovação automática</p>
            </div>
          ) : (
            <>
              {medicosToDisplay.map((medico) => {
                const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`

                return (
                  <div
                    key={medico.id}
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group ${matchedMedicos.has(medico.id) ? 'bg-primary-50 dark:bg-primary-500/20 border border-primary-200 dark:border-primary-500' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {getValidProfilePictureUrl(medico.profile_picture_url) && (
                          <AvatarImage src={getValidProfilePictureUrl(medico.profile_picture_url)} alt={nomeCompleto} />
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
                        medicoId={medico.id}
                        isFavorite={favoritosIds.includes(medico.id)}
                        onToggle={onFavoriteChange}
                        onSuccess={onFavoriteSuccess}
                        isPrecadastro={medico.is_precadastro}
                      />
                      <MedicoRowEquipes
                        medicoId={medico.id}
                        medicoNome={nomeCompleto}
                        equipes={equipes}
                        onEquipeChange={onEquipeChange}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onOpenModal(medico)}
                        title="Ver detalhes do médico"
                      >
                        <Info className="h-4 w-4 text-gray-700" />
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