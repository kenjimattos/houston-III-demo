"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Star, MoreVertical, Search, ChevronDown, ChevronUp } from "lucide-react"
import { fetchMedicosFavoritos, type Medico } from "@/services/medicosService"
import { FavoriteButton } from "./favorite-button"
import { DoctorDetailsModal } from "./doctor-details-modal"
import { formatTelefoneBR, getValidProfilePictureUrl } from "@/lib/utils"

interface FavoritesSectionProps {
  onFavoriteChange?: () => void
}

export function FavoritesSection({ onFavoriteChange }: FavoritesSectionProps) {
  const [favoritos, setFavoritos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState<Medico | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)

  // Filtrar e ordenar médicos alfabeticamente
  const filteredAndSortedFavoritos = useMemo(() => {
    return favoritos
      .filter((medico) => {
        const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase()
        const especialidade = medico.especialidade_nome?.toLowerCase() || ""
        const crm = medico.crm?.toLowerCase() || ""
        const email = medico.email?.toLowerCase() || ""
        const termo = searchTerm.toLowerCase()

        return (
          nomeCompleto.includes(termo) ||
          especialidade.includes(termo) ||
          crm.includes(termo) ||
          email.includes(termo)
        )
      })
      .sort((a, b) => {
        const nomeA = `${a.primeiro_nome} ${a.sobrenome}`.toLowerCase()
        const nomeB = `${b.primeiro_nome} ${b.sobrenome}`.toLowerCase()
        return nomeA.localeCompare(nomeB)
      })
  }, [favoritos, searchTerm])

  const loadFavoritos = async () => {
    try {
      setLoading(true)
      const data = await fetchMedicosFavoritos()
      setFavoritos(data)
    } catch (error) {
      console.error("Erro ao carregar favoritos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavoritos()
  }, [])


  const handleFavoriteToggle = (medicoId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      // Remove da lista local quando desfavoritar
      setFavoritos(prev => prev.filter(m => m.id !== medicoId))
    }
    onFavoriteChange?.()
  }

  const handleFavoriteSuccess = () => {
    // Recarregar a lista de favoritos após sucesso
    loadFavoritos()
    onFavoriteChange?.()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            Médicos Favoritos
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 p-1 hover:bg-muted rounded-sm transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="flex justify-center items-center h-32 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (favoritos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            Médicos Favoritos
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 p-1 hover:bg-muted rounded-sm transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum médico favoritado ainda.</p>
              <p className="text-sm">Clique na estrela ao lado dos médicos para adicioná-los aos favoritos.</p>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-normal mb-4">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            Médicos Favoritos ({filteredAndSortedFavoritos.length})
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 p-1 hover:bg-muted rounded-sm transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          </CardTitle>
          {isExpanded && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, especialidade, CRM ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardHeader>
        {isExpanded && (
          <CardContent>
            {filteredAndSortedFavoritos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum médico encontrado.</p>
                <p className="text-sm">Tente ajustar o termo de busca.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="font-normal">
                      <TableHead></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedFavoritos.map((doctor) => {
                      const nomeCompleto = `${doctor.primeiro_nome} ${doctor.sobrenome}`
                      return (
                        <TableRow key={doctor.id} className="group hover:bg-muted/50">
                          <TableCell>
                            <span
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedDoctor(doctor)
                                setShowModal(true)
                              }}
                            >
                              <Avatar>
                                {getValidProfilePictureUrl(doctor.profile_picture_url) && (
                                  <AvatarImage src={getValidProfilePictureUrl(doctor.profile_picture_url)} alt={nomeCompleto} />
                                )}
                                <AvatarFallback>
                                  {doctor.primeiro_nome?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                            </span>
                          </TableCell>
                          <TableCell className="font-normal">{nomeCompleto}</TableCell>
                          <TableCell>{doctor.crm}</TableCell>
                          <TableCell>{doctor.especialidade_nome}</TableCell>
                          <TableCell>{doctor.email}</TableCell>
                          <TableCell>{formatTelefoneBR(doctor.telefone)}</TableCell>
                          <TableCell>
                            <FavoriteButton
                              medicoId={doctor.id}
                              isFavorite={true}
                              onToggle={(isFavorite) => handleFavoriteToggle(doctor.id, isFavorite)}
                              onSuccess={handleFavoriteSuccess}
                              isPrecadastro={doctor.is_precadastro}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              className="p-2 rounded hover:bg-muted/30"
                              onClick={() => {
                                setSelectedDoctor(doctor)
                                setShowModal(true)
                              }}
                            >
                              <MoreVertical className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {selectedDoctor && (
        <DoctorDetailsModal
          doctor={selectedDoctor}
          open={showModal}
          onClose={() => setShowModal(false)}
          onFavoriteChange={() => {
            // Recarregar favoritos quando houver mudança
            loadFavoritos()
            onFavoriteChange?.()
          }}
          showFavoriteButton={true}
          showEquipesButton={true}
        />
      )}
    </>
  )
} 