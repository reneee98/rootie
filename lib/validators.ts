export function isNonEmptyString(value: string) {
  return value.trim().length > 0;
}

export function isUuidLike(value: string) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
