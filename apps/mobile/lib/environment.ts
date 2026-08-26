export function environmentLabel(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : 'local';
}
