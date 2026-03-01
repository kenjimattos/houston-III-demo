import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface SelectorPros {
  options: { value: string; display: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

const CustomSelector = ({
  options,
  selectedValue,
  onValueChange,
  disabled,
  placeholder,
  label,
}: SelectorPros) => {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <Select
        value={selectedValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.display}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomSelector;
