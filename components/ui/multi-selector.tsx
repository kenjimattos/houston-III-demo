/**
 * Componente de Seleção Múltipla Genérico
 *
 * Componente reutilizável que permite seleção múltipla de itens de qualquer tipo,
 * com busca local, sistema de fixação opcional e interface configurável.
 *
 * Características:
 * - Genérico: funciona com qualquer tipo de dados
 * - Busca local: toda pesquisa é feita na lista fornecida
 * - Fixação opcional: permite fixar itens favoritos
 * - Customizável: campos de busca e exibição configuráveis
 * - Acessível: suporte completo a navegação por teclado
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/hospitais/useDebounce";

/**
 * Configuração para renderização de itens
 */
interface ItemRenderer<T> {
  /** Função para obter ID único do item */
  getId: (item: T) => string;
  /** Função para obter nome/título do item para busca e exibição */
  getSearchText: (item: T) => string;
  /** Função para obter texto de exibição principal */
  getDisplayText: (item: T) => string;
  /** Função opcional para obter texto secundário */
  getSecondaryText?: (item: T) => string | null;
}

/**
 * Props do componente MultiSelector
 */
interface MultiSelectorProps<T> {
  /** Lista completa de itens disponíveis */
  items: T[];
  /** Array de IDs dos itens selecionados (ou string única se multiple=false) */
  value: string[] | string;
  /** Callback para mudança na seleção */
  onChange: (selectedIds: string[] | string) => void;
  /** Configuração de renderização */
  renderer: ItemRenderer<T>;
  /** Se permite seleção múltipla (default: true) */
  multiple?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Placeholder do botão principal */
  placeholder?: string;
  /** Se o componente está desabilitado */
  disabled?: boolean;
  /** Label do campo */
  label?: string;
  /** ID do elemento */
  id?: string;
  /** Limite máximo de seleções (apenas para multiple=true) */
  maxSelections?: number;
  /** Se deve permitir sistema de fixação */
  allowPinning?: boolean;
  /** Chave para salvar itens fixados no localStorage */
  pinnedStorageKey?: string;
  /** Placeholder da busca */
  searchPlaceholder?: string;
  /** Texto quando nenhum item é encontrado */
  noItemsText?: string;
  /** Texto de contagem de selecionados (apenas para multiple=true) */
  getSelectionText?: (count: number) => string;
}

/**
 * Componente MultiSelector Genérico
 */
export function MultiSelector<T>({
  items,
  value = [],
  onChange,
  renderer,
  multiple = true,
  className,
  required = false,
  placeholder = "Selecionar itens...",
  disabled = false,
  label,
  id = "multi-selector",
  maxSelections,
  allowPinning = false,
  pinnedStorageKey,
  searchPlaceholder = "Digite para buscar...",
  noItemsText = "Nenhum item encontrado",
  getSelectionText = (count) =>
    `${count} item${count > 1 ? "s" : ""} selecionado${count > 1 ? "s" : ""}`,
}: MultiSelectorProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Debounce da busca
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Normalizar value para sempre ser array internamente
  const normalizedValue = Array.isArray(value) ? value : value ? [value] : [];

  // Carregar itens fixados do localStorage
  useEffect(() => {
    if (allowPinning && pinnedStorageKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(pinnedStorageKey);
        if (saved) {
          setPinnedIds(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Erro ao carregar itens fixados:", error);
        localStorage.removeItem(pinnedStorageKey);
      }
    }
  }, [allowPinning, pinnedStorageKey]);

  /**
   * Normaliza texto para busca (remove acentos e caracteres especiais)
   */
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
      .trim();
  };

  /**
   * Filtra itens baseado na busca
   */
  const filteredItems = useMemo(() => {
    if (!debouncedSearchQuery) return items;

    const normalizedQuery = normalizeText(debouncedSearchQuery);

    return items.filter((item) => {
      const searchText = normalizeText(renderer.getSearchText(item));
      return (
        searchText.includes(normalizedQuery) ||
        searchText.includes(debouncedSearchQuery.toLowerCase())
      );
    });
  }, [items, debouncedSearchQuery, renderer]);

  /**
   * Separa itens em fixados e não fixados
   */
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const pinned: T[] = [];
    const unpinned: T[] = [];

    filteredItems.forEach((item) => {
      const id = renderer.getId(item);
      if (allowPinning && pinnedIds.includes(id)) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    });

    // Manter ordem dos itens fixados
    const orderedPinned = pinnedIds
      .map((id) => pinned.find((item) => renderer.getId(item) === id))
      .filter(Boolean) as T[];

    return { pinnedItems: orderedPinned, unpinnedItems: unpinned };
  }, [filteredItems, pinnedIds, allowPinning, renderer]);

  /**
   * Obter itens selecionados para exibição
   */
  const selectedItems = useMemo(() => {
    return items.filter((item) =>
      normalizedValue.includes(renderer.getId(item))
    );
  }, [items, normalizedValue, renderer]);

  /**
   * Verifica se item está selecionado
   */
  const isSelected = (item: T) => {
    return normalizedValue.includes(renderer.getId(item));
  };

  /**
   * Verifica se item está fixado
   */
  const isPinned = (item: T) => {
    return allowPinning && pinnedIds.includes(renderer.getId(item));
  };

  /**
   * Alterna seleção de item
   */
  const toggleSelection = (item: T) => {
    const id = renderer.getId(item);

    if (!multiple) {
      // Modo seleção simples
      if (isSelected(item)) {
        // Se já está selecionado, deselecionar (permitir valor vazio)
        onChange("");
      } else {
        // Selecionar este item
        onChange(id);
      }
      // Fechar popover após seleção no modo simples
      setOpen(false);
      return;
    }

    // Modo seleção múltipla
    if (isSelected(item)) {
      // Remover da seleção
      const newSelection = normalizedValue.filter(
        (selectedId) => selectedId !== id
      );
      onChange(newSelection);
    } else {
      // Verificar limite máximo
      if (maxSelections && normalizedValue.length >= maxSelections) {
        return; // Poderia mostrar toast de erro aqui
      }

      // Adicionar à seleção
      const newSelection = [...normalizedValue, id];
      onChange(newSelection);
    }
  };

  /**
   * Alterna fixação de item
   */
  const togglePin = (item: T) => {
    if (!allowPinning || !pinnedStorageKey) return;

    const id = renderer.getId(item);
    let newPinnedIds: string[];

    if (isPinned(item)) {
      // Desfixar
      newPinnedIds = pinnedIds.filter((pinnedId) => pinnedId !== id);
    } else {
      // Fixar (adicionar no início)
      newPinnedIds = [id, ...pinnedIds];
    }

    setPinnedIds(newPinnedIds);

    // Salvar no localStorage
    try {
      localStorage.setItem(pinnedStorageKey, JSON.stringify(newPinnedIds));
    } catch (error) {
      console.error("Erro ao salvar itens fixados:", error);
    }
  };

  /**
   * Renderiza um item da lista
   */
  const renderItem = (item: T, isPinnedSection = false) => {
    const id = renderer.getId(item);
    const selected = isSelected(item);
    const pinned = isPinned(item);
    const displayText = renderer.getDisplayText(item);
    const secondaryText = renderer.getSecondaryText?.(item);

    return (
      <div key={id} className="group relative">
        <button
          onClick={() => toggleSelection(item)}
          title={`${displayText}${secondaryText ? ` - ${secondaryText}` : ""}`}
          className={cn(
            "relative flex w-full cursor-pointer select-none rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground",
            allowPinning ? "px-2 py-2 pr-10" : "px-2 py-2",
            // Usar items-center para itens fixados (layout compacto) e items-start para outros (permite quebra)
            isPinnedSection ? "items-center" : "items-start",
            selected && "bg-accent"
          )}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4 shrink-0",
              // Ajustar posicionamento do check para itens com quebra de linha
              isPinnedSection ? "" : "mt-0.5",
              selected ? "opacity-100" : "opacity-0"
            )}
          />
          <div className="flex-1 text-left ml-2 min-w-0">
            <div
              className={cn(
                "font-normal flex items-center gap-1",
                // Para itens não fixados, permitir quebra de linha
                !isPinnedSection && "flex-wrap"
              )}
            >
              {isPinnedSection && (
                <Pin className="h-3 w-3 text-primary-600 fill-current shrink-0" />
              )}
              <span
                className={cn(
                  // Itens fixados: truncate (compacto)
                  // Outros itens: quebra inteligente
                  isPinnedSection ? "truncate" : "break-words leading-relaxed"
                )}
              >
                {displayText}
              </span>
            </div>
            {secondaryText && (
              <div
                className={cn(
                  "text-xs text-muted-foreground",
                  // Aplicar quebra inteligente também no texto secundário para itens não fixados
                  isPinnedSection
                    ? "truncate"
                    : "break-words leading-relaxed mt-1"
                )}
              >
                {secondaryText}
              </div>
            )}
          </div>
        </button>

        {allowPinning && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin(item);
            }}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded transition-all w-7 h-7 flex items-center justify-center",
              pinned
                ? "opacity-100 hover:bg-red-100 text-red-500"
                : "opacity-0 group-hover:opacity-100 hover:bg-primary-100 text-primary-600"
            )}
            title={pinned ? "Desfixar item" : "Fixar item"}
          >
            {pinned ? (
              <PinOff className="h-3 w-3" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            title={
              selectedItems.length > 0 && !multiple
                ? renderer.getDisplayText(selectedItems[0])
                : undefined
            }
            className={cn(
              "w-full justify-between font-thin min-w-0",
              selectedItems.length === 0 && "text-muted-foreground",
              className
            )}
          >
            {selectedItems.length > 0 ? (
              <span className="flex items-center gap-2 min-w-0 flex-1">
                {multiple ? (
                  <span className="truncate">
                    {getSelectionText(selectedItems.length)}
                  </span>
                ) : (
                  <span className="truncate">
                    {renderer.getDisplayText(selectedItems[0])}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">{placeholder}</span>
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full border-0 bg-transparent px-0 py-3 text-sm outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {/* Itens fixados */}
              {allowPinning && pinnedItems.length > 0 && (
                <div className="border-b">
                  <div className="px-3 py-2 text-xs font-normal text-muted-foreground bg-muted/50">
                    Itens Fixados
                  </div>
                  <div className="p-1">
                    {pinnedItems.map((item) => renderItem(item, true))}
                  </div>
                </div>
              )}

              {/* Lista principal */}
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {noItemsText}
                </div>
              ) : (
                <div>
                  {unpinnedItems.length > 0 && (
                    <>
                      {allowPinning && pinnedItems.length > 0 && (
                        <div className="px-3 py-2 text-xs font-normal text-muted-foreground bg-muted/30">
                          Outros Itens
                        </div>
                      )}
                      <div className="p-1">
                        {unpinnedItems.map((item) => renderItem(item, false))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
