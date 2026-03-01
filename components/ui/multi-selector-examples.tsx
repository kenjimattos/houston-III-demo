/**
 * Exemplos de Uso do MultiSelector Genérico
 *
 * Demonstra como usar o componente MultiSelector com diferentes tipos de dados
 * em modo de seleção simples e múltipla.
 */

import { MultiSelector } from "@/components/ui/multi-selector";

// Exemplo 1: Seletor de Usuários (Múltipla Seleção)
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const userRenderer = {
  getId: (user: User) => user.id,
  getSearchText: (user: User) => `${user.name} ${user.email}`,
  getDisplayText: (user: User) => user.name,
  getSecondaryText: (user: User) => user.email,
};

export function UserMultiSelector({
  users,
  value,
  onChange,
}: {
  users: User[];
  value: string[];
  onChange: (ids: string[] | string) => void;
}) {
  return (
    <MultiSelector
      items={users}
      value={value}
      onChange={onChange}
      renderer={userRenderer}
      multiple={true} // Seleção múltipla
      label="Usuários"
      placeholder="Selecionar usuários..."
      searchPlaceholder="Digite nome ou email..."
      allowPinning={true}
      pinnedStorageKey="pinnedUsers"
      getSelectionText={(count) =>
        `${count} usuário${count > 1 ? "s" : ""} selecionado${
          count > 1 ? "s" : ""
        }`
      }
    />
  );
}

// Exemplo 2: Seletor de Hospital (Seleção Simples)
interface Hospital {
  id: string;
  name: string;
  address?: string;
}

const hospitalRenderer = {
  getId: (hospital: Hospital) => hospital.id,
  getSearchText: (hospital: Hospital) => hospital.name,
  getDisplayText: (hospital: Hospital) => hospital.name,
  getSecondaryText: (hospital: Hospital) => hospital.address || null,
};

export function HospitalSingleSelector({
  hospitals,
  value,
  onChange,
}: {
  hospitals: Hospital[];
  value: string;
  onChange: (id: string | string[]) => void;
}) {
  return (
    <MultiSelector
      items={hospitals}
      value={value}
      onChange={onChange}
      renderer={hospitalRenderer}
      multiple={false} // Seleção simples
      label="Hospital"
      placeholder="Selecionar hospital..."
      searchPlaceholder="Digite o nome do hospital..."
      allowPinning={true}
      pinnedStorageKey="pinnedHospitals"
    />
  );
}

// Exemplo 3: Seletor de Categorias (Múltipla Seleção)
interface Category {
  id: string;
  name: string;
  description?: string;
}

const categoryRenderer = {
  getId: (category: Category) => category.id,
  getSearchText: (category: Category) => category.name,
  getDisplayText: (category: Category) => category.name,
  getSecondaryText: (category: Category) => category.description || null,
};

export function CategoryMultiSelector({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string[];
  onChange: (ids: string[] | string) => void;
}) {
  return (
    <MultiSelector
      items={categories}
      value={value}
      onChange={onChange}
      renderer={categoryRenderer}
      multiple={true} // Seleção múltipla
      label="Categorias"
      placeholder="Selecionar categorias..."
      searchPlaceholder="Digite o nome da categoria..."
      allowPinning={false} // Sem fixação para categorias
      getSelectionText={(count) =>
        `${count} categoria${count > 1 ? "s" : ""} selecionada${
          count > 1 ? "s" : ""
        }`
      }
    />
  );
}

// Exemplo 4: Seletor de Tags (Múltipla Seleção com Limite)
interface Tag {
  id: string;
  name: string;
  color?: string;
}

const tagRenderer = {
  getId: (tag: Tag) => tag.id,
  getSearchText: (tag: Tag) => tag.name,
  getDisplayText: (tag: Tag) => tag.name,
  getSecondaryText: () => null, // Tags não têm texto secundário
};

export function TagMultiSelector({
  tags,
  value,
  onChange,
  maxTags = 5,
}: {
  tags: Tag[];
  value: string[];
  onChange: (ids: string[] | string) => void;
  maxTags?: number;
}) {
  return (
    <MultiSelector
      items={tags}
      value={value}
      onChange={onChange}
      renderer={tagRenderer}
      multiple={true} // Seleção múltipla
      label="Tags"
      placeholder="Selecionar tags..."
      searchPlaceholder="Digite o nome da tag..."
      maxSelections={maxTags}
      allowPinning={true}
      pinnedStorageKey="pinnedTags"
      getSelectionText={(count) =>
        `${count} tag${count > 1 ? "s" : ""} selecionada${count > 1 ? "s" : ""}`
      }
    />
  );
}

// Exemplo 5: Seletor com Textos Longos e Fixação (demonstra layout otimizado)
interface LongTextItem {
  id: string;
  title: string;
  description: string;
}

const longTextRenderer = {
  getId: (item: LongTextItem) => item.id,
  getSearchText: (item: LongTextItem) => `${item.title} ${item.description}`,
  getDisplayText: (item: LongTextItem) => item.title,
  getSecondaryText: (item: LongTextItem) => item.description,
};

export function LongTextSelector({
  items,
  value,
  onChange,
  multiple = false,
}: {
  items: LongTextItem[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}) {
  return (
    <MultiSelector
      items={items}
      value={value}
      onChange={onChange}
      renderer={longTextRenderer}
      multiple={multiple}
      label="Itens com Textos Longos"
      placeholder="Selecionar item com texto muito longo que vai ser truncado com elipses..."
      searchPlaceholder="Digite para buscar itens..."
      allowPinning={true} // Sistema de fixação com layout otimizado
      pinnedStorageKey="pinnedLongTexts"
      getSelectionText={(count) =>
        `${count} item${count > 1 ? "s" : ""} com texto longo selecionado${
          count > 1 ? "s" : ""
        }`
      }
    />
  );
}
