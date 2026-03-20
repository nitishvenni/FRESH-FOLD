export function formatPrice(value: number) {
  return `Rs.${Math.round(Number(value || 0))}`;
}
