import React from "react"

interface HighlightedTextProps {
  text: string
  searchTerm: string
  className?: string
}

/**
 * Normaliza uma string para busca (remove acentos, converte para lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
}

/**
 * Componente que destaca partes do texto que fazem match com o termo de busca
 */
export function HighlightedText({ text, searchTerm, className }: HighlightedTextProps) {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>
  }

  const normalizedSearch = normalizeString(searchTerm)
  const normalizedText = normalizeString(text)
  
  const matchIndex = normalizedText.indexOf(normalizedSearch)
  
  if (matchIndex === -1) {
    return <span className={className}>{text}</span>
  }

  // Encontra a posição real no texto original (considerando acentos)
  let realIndex = 0
  let normalizedIndex = 0
  
  while (normalizedIndex < matchIndex && realIndex < text.length) {
    const char = text[realIndex]
    const normalizedChar = normalizeString(char)
    
    if (normalizedChar) {
      normalizedIndex += normalizedChar.length
    }
    realIndex++
  }

  const matchLength = searchTerm.length
  
  return (
    <span className={className}>
      {text.slice(0, realIndex)}
      <span className="bg-primary-500 text-white dark:bg-primary-800 p-1 rounded">
        {text.slice(realIndex, realIndex + matchLength)}
      </span>
      {text.slice(realIndex + matchLength)}
    </span>
  )
}