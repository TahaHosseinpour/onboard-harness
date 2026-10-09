import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Persian digits with thousands separators. */
export function fa(value: number, fractionDigits = 0) {
  return value.toLocaleString('fa-IR', { maximumFractionDigits: fractionDigits });
}

/** Compact Toman amount: ۱٫۲ میلیارد / ۸۴۰ میلیون / ۱۲٬۵۰۰ */
export function toman(value: number, withUnit = true) {
  const abs = Math.abs(value);
  let text: string;
  if (abs >= 1e9) text = `${fa(value / 1e9, 2)} میلیارد`;
  else if (abs >= 1e6) text = `${fa(value / 1e6, 1)} میلیون`;
  else text = fa(value);
  return withUnit ? `${text} تومان` : text;
}

export function percent(value: number, fractionDigits = 1) {
  return `${fa(Math.abs(value), fractionDigits)}٪`;
}

const jalaliLong = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** «جمعه، ۱۷ مهر ۱۴۰۵» — assembled from parts so the order never depends on the runtime's locale data. */
export function jalaliToday() {
  const parts = Object.fromEntries(jalaliLong.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.weekday}، ${parts.day} ${parts.month} ${parts.year}`;
}
