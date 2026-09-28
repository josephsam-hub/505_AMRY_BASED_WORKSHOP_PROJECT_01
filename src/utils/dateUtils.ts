import { format, parseISO, differenceInDays, isAfter } from 'date-fns';

export const formatDate = (iso: string): string => {
  try { return format(parseISO(iso), 'dd MMM yyyy'); }
  catch { return iso; }
};

export const formatDateTime = (iso: string): string => {
  try { return format(parseISO(iso), 'dd MMM yyyy HH:mm'); }
  catch { return iso; }
};

export const formatShortDate = (iso: string): string => {
  try { return format(parseISO(iso), 'dd MMM'); }
  catch { return iso; }
};

export const daysOverdue = (plannedEnd: string): number => {
  const today = new Date();
  const end = parseISO(plannedEnd);
  return isAfter(today, end) ? differenceInDays(today, end) : 0;
};

export const daysBetween = (start: string, end: string): number =>
  differenceInDays(parseISO(end), parseISO(start));

export const clsx = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(' ');
