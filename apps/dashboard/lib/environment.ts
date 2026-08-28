export function environmentLabel(value = process.env.APP_ENV) {
  return value?.trim() || 'local';
}
