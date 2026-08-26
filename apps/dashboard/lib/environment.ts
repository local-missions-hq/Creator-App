export function environmentLabel(value = process.env.NEXT_PUBLIC_APP_ENV) {
  return value?.trim() || 'local';
}
