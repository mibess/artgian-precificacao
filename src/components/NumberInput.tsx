import React, { useState, useEffect, useRef } from "react";

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  allowDecimals?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

/** Exibe o número no padrão pt-BR (vírgula decimal); a digitação aceita vírgula ou ponto. */
function toDisplayText(value: number | null | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return String(value).replace(".", ",");
}

/**
 * Input numérico inteligente com suporte a vírgula/ponto pt-BR.
 * Evita que o valor reverta para 0 enquanto o usuário apaga o campo ou digita decimais.
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  allowDecimals = true,
  prefix,
  suffix,
  className = "",
  onBlur,
  ...rest
}) => {
  const [text, setText] = useState<string>(() => toDisplayText(value));
  const isFocusedRef = useRef(false);

  // Sincroniza estado de texto se o valor mudar externamente (sem sobrescrever digitação ativa)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(toDisplayText(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permitir apagar completamente sem forçar 0
    if (raw === "") {
      setText("");
      if (min !== undefined && min > 0) {
        onChange(min);
      } else {
        onChange(0);
      }
      return;
    }

    // Permitir estados transitórios como "-", "1.", "1,", "0."
    const normalized = raw.replace(",", ".");
    if (
      normalized === "-" ||
      normalized.endsWith(".") ||
      normalized.endsWith(",") ||
      /^0[0-9]/.test(raw)
    ) {
      setText(raw);
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
      return;
    }

    // Validação de formato numérico
    const regex = allowDecimals ? /^-?\d*([.,]\d*)?$/ : /^-?\d*$/;
    if (!regex.test(raw)) {
      return; // Ignora caracteres não numéricos
    }

    setText(raw);
    const parsed = allowDecimals ? parseFloat(normalized) : parseInt(normalized, 10);
    if (!isNaN(parsed)) {
      let finalVal = parsed;
      if (min !== undefined && finalVal < min) finalVal = min;
      if (max !== undefined && finalVal > max) finalVal = max;
      onChange(finalVal);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    if (rest.onFocus) rest.onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;

    // Ao perder o foco, normaliza o texto para o número válido final
    const normalized = text.trim().replace(",", ".");
    let parsed = parseFloat(normalized);

    if (isNaN(parsed) || text.trim() === "") {
      parsed = min !== undefined ? min : 0;
    }

    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;

    setText(toDisplayText(parsed));
    onChange(parsed);

    if (onBlur) onBlur(e);
  };

  const inputElement = (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={
        prefix || suffix
          ? "w-full bg-transparent focus:outline-none " + className
          : className
      }
    />
  );

  if (prefix || suffix) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        {prefix && <span className="text-slate-400 select-none text-xs">{prefix}</span>}
        {inputElement}
        {suffix && <span className="text-slate-400 select-none text-xs">{suffix}</span>}
      </div>
    );
  }

  return inputElement;
};
