export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validates the two CPF check digits (módulo 11). Catches typos and most
 * made-up numbers before spending a call on the external verification API.
 */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}
