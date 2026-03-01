"use client"

import React, { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface EquipesSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  placeholder?: string
}

export function EquipesSearch({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Buscar por nome da equipe, médico ou CRM..." 
}: EquipesSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className="pl-10"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}