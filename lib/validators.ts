export function isNonEmptyString(value: string) {
  return value.trim().length > 0;
}

export function isUuidLike(value: string) {
  return /^[0-9a-fA-F-]{8,}$/.test(value);
}
