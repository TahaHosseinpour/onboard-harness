import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Persian digits with thousands separators. */
export function fa(value: number, fractionDigits = 0) {
  return value.toLocaleString('fa-IR', { maximumFractionDigits: fractionDigits });
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
