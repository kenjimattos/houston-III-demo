import { useState, useEffect, useCallback } from 'react'

interface MenuPosition {
  x: number
  y: number
}

interface ContextualMenuState {
  showPlantaoMenu: boolean
  menuClickedHour: number | null
  menuTargetRow: number | null
  menuPosition: MenuPosition
}

interface UseContextualMenuReturn {
  // Estados principais
  showPlantaoMenu: boolean
  setShowPlantaoMenu: React.Dispatch<React.SetStateAction<boolean>>
  menuClickedHour: number | null
  setMenuClickedHour: (hour: number | null) => void
  menuTargetRow: number | null
  setMenuTargetRow: (row: number | null) => void
  menuPosition: MenuPosition
  setMenuPosition: React.Dispatch<React.SetStateAction<MenuPosition>>
  
  // Métodos utilitários
  showMenu: (hour: number, row: number, position: MenuPosition) => void
  hideMenu: () => void
  updateMenuPosition: (position: MenuPosition) => void
  isMenuVisible: () => boolean
}

export const useContextualMenu = (): UseContextualMenuReturn => {
  // Estados do menu contextual
  const [showPlantaoMenu, setShowPlantaoMenu] = useState<boolean>(false)
  const [menuClickedHour, _setMenuClickedHour] = useState<number | null>(null)
  const [menuTargetRow, _setMenuTargetRow] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({x: 0, y: 0})

  // Wrappers para compatibilidade com null
  const setMenuClickedHour = (hour: number | null) => {
    _setMenuClickedHour(hour)
  }

  const setMenuTargetRow = (row: number | null) => {
    _setMenuTargetRow(row)
  }
  
  // Fechar menu com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPlantaoMenu) {
        setShowPlantaoMenu(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showPlantaoMenu])
  
  // Debug do menu (pode ser removido em produção)
  useEffect(() => {
    // Debug silencioso - mantém compatibilidade com código existente
  }, [showPlantaoMenu, menuClickedHour, menuTargetRow, menuPosition])
  
  // Mostrar menu com todos os parâmetros
  const showMenu = useCallback((hour: number, row: number, position: MenuPosition) => {
    _setMenuClickedHour(hour)
    _setMenuTargetRow(row)
    setMenuPosition(position)
    setShowPlantaoMenu(true)
  }, [])
  
  // Esconder menu
  const hideMenu = useCallback(() => {
    setShowPlantaoMenu(false)
  }, [])
  
  // Atualizar posição do menu
  const updateMenuPosition = useCallback((position: MenuPosition) => {
    setMenuPosition(position)
  }, [])
  
  // Verificar se menu está visível
  const isMenuVisible = useCallback(() => {
    return showPlantaoMenu
  }, [showPlantaoMenu])
  
  return {
    // Estados principais
    showPlantaoMenu,
    setShowPlantaoMenu,
    menuClickedHour,
    setMenuClickedHour,
    menuTargetRow,
    setMenuTargetRow,
    menuPosition,
    setMenuPosition,
    
    // Métodos utilitários
    showMenu,
    hideMenu,
    updateMenuPosition,
    isMenuVisible,
  }
}