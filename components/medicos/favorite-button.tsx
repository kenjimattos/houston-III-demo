"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleMedicoFavorito } from "@/services/medicosService"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  medicoId: string
  isFavorite: boolean
  onToggle?: (isFavorite: boolean) => void
  onSuccess?: () => void
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "button"
  isPrecadastro?: boolean
}

export function FavoriteButton({
  medicoId,
  isFavorite,
  onToggle,
  onSuccess,
  size = "md",
  variant = "icon",
  isPrecadastro = false
}: FavoriteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [favorite, setFavorite] = useState(isFavorite)
  const [showPrecadastroModal, setShowPrecadastroModal] = useState(false)

  // Sincronizar estado local quando a prop isFavorite mudar
  useEffect(() => {
    setFavorite(isFavorite)
  }, [isFavorite])

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation() // Evita que clique na linha da tabela
    
    if (loading) return
    
    // Se for pré-cadastro, mostrar modal de aviso
    if (isPrecadastro) {
      setShowPrecadastroModal(true)
      return
    }
    
    setLoading(true)
    try {
      const newFavoriteState = await toggleMedicoFavorito(medicoId)
      setFavorite(newFavoriteState)
      onToggle?.(newFavoriteState)
      
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao alterar favorito:', error)
    } finally {
      setLoading(false)
    }
  }

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }[size]

  const buttonSize = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  }[size]

  if (variant === "button") {
    return (
      <>
        <Button
          variant={favorite ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            "gap-1",
            favorite && "bg-yellow-500 hover:bg-yellow-600 text-white"
          )}
        >
          <Star 
            className={cn(
              iconSize,
              favorite ? "fill-current" : ""
            )}
          />
          {favorite ? "Favoritado" : "Favoritar"}
        </Button>

        {/* Modal de aviso para pré-cadastro */}
        {showPrecadastroModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowPrecadastroModal(false)} />
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-normal mb-4 text-left">Médico em Pré-cadastro</h3>
              <p className="text-gray-600 mb-4 text-left">
                Apenas médicos com conta ativa no app Revoluna podem ser favoritos e ter aprovações automáticas.
              </p>
              <p className="text-sm text-gray-500 mb-6 text-left">
                Médicos pré-cadastrados precisam criar uma conta para se candidatar às vagas.
              </p>
              <div className="flex justify-end">
                <Button
                  variant="default"
                  onClick={() => setShowPrecadastroModal(false)}
                >
                  Entendi
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          buttonSize,
          "hover:bg-yellow-50 hover:text-yellow-600",
          favorite && "text-yellow-500"
        )}
        title={favorite ? "Desabilitar pré-aprovação" : "Habilitar pré-aprovação"}
      >
        <Star 
          className={cn(
            iconSize,
            favorite ? "fill-current" : "",
            loading && "animate-pulse"
          )}
        />
      </Button>

      {/* Modal de aviso para pré-cadastro */}
      {showPrecadastroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPrecadastroModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-normal mb-4 text-left">Médico em Pré-cadastro</h3>
            <p className="text-gray-600 mb-4 text-left">
              Apenas médicos com conta ativa no app Revoluna podem ser favoritos e ter aprovações automáticas.
            </p>
            <p className="text-sm text-gray-500 mb-6 text-left">
              Médicos pré-cadastrados precisam criar uma conta para se candidatar às vagas.
            </p>
            <div className="flex justify-end">
              <Button
                variant="default"
                onClick={() => setShowPrecadastroModal(false)}
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 