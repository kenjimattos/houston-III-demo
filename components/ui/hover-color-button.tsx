"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

/**
 * HoverColorButton - Botão com hover personalizado baseado em cor
 *
 * Um botão reutilizável que muda a cor da borda e texto ao passar o mouse,
 * utilizando uma cor customizável.
 *
 * @example
 * // Botão simples com ícone e texto
 * <HoverColorButton
 *   hoverColor="#3B82F6"
 *   icon={Copy}
 *   onClick={() => console.log('clicked')}
 * >
 *   Duplicar
 * </HoverColorButton>
 *
 * @example
 * // Botão apenas com texto
 * <HoverColorButton
 *   hoverColor="rgb(59, 130, 246)"
 *   onClick={handleClick}
 *   title="Tooltip text"
 * >
 *   Clique aqui
 * </HoverColorButton>
 */

interface HoverColorButtonProps {
  /** Variante do botão (padrão: "outline") */
  variant?:
    | "outline"
    | "default"
    | "destructive"
    | "secondary"
    | "ghost"
    | "link";
  /** Tamanho do botão (padrão: "sm") */
  size?: "default" | "sm" | "lg" | "icon";
  /** Classes CSS customizadas */
  className?: string;
  /** Cor para o hover (hex, rgb, hsl, etc.) */
  hoverColor: string;
  /** Texto do tooltip */
  title?: string;
  /** Função executada ao clicar */
  onClick?: () => void;
  /** Se o botão está desabilitado */
  disabled?: boolean;
  /** Ícone do Lucide React */
  icon?: LucideIcon;
  /** Conteúdo do botão */
  children?: React.ReactNode;
  /** Tipo do botão */
  type?: "button" | "submit" | "reset";
}

export const HoverColorButton: React.FC<HoverColorButtonProps> = ({
  variant = "outline",
  size = "sm",
  className = "h-full py-1 border rounded text-gray-600 border-gray-300 hover:border-current hover:text-current transition-all duration-200 group",
  hoverColor,
  title,
  onClick,
  disabled = false,
  icon: Icon,
  children,
  type = "button",
  ...props
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.borderColor = hoverColor;
      e.currentTarget.style.color = hoverColor;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.borderColor = "";
      e.currentTarget.style.color = "";
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      style={
        {
          "--hover-color": hoverColor,
        } as React.CSSProperties
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type={type}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children && Icon && <span className="ml-1">{children}</span>}
      {children && !Icon && children}
    </Button>
  );
};
