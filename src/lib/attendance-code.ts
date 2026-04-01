export function generateSecureCode(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36))
    .join("")
    .substring(0, 6)
    .toUpperCase();
}
