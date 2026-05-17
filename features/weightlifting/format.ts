type DecimalLike = {
  toString(): string;
};

export function formatDecimal(value: DecimalLike | number | string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(number);
}

export function formatSessionDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parsePerformedDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
