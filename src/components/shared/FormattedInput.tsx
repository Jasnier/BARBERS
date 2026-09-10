import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface FormattedInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

function formatWithDots(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseFormatted(formatted: string): string {
  return formatted.replace(/\./g, "");
}

export function FormattedInput({
  value,
  onChange,
  max,
  readOnly,
  placeholder,
  className,
  id,
}: FormattedInputProps) {
  const [display, setDisplay] = useState(() => formatWithDots(value));

  useEffect(() => {
    setDisplay(formatWithDots(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFormatted(e.target.value);
    if (!/^\d*$/.test(raw)) return;
    const clamped = raw !== "" ? String(Math.min(Number(raw), max ?? Infinity)) : "";
    onChange(clamped);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      readOnly={readOnly}
      className={className}
      value={display}
      onChange={handleChange}
      placeholder={placeholder ? formatWithDots(String(placeholder)) : undefined}
    />
  );
}
