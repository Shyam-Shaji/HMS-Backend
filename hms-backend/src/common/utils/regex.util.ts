// User-typed search text must be treated as literal characters, never as a
// regex pattern: an unescaped "(" throws (a 500 for something as innocent
// as typing a bracket), and a crafted pattern can pin the CPU (ReDoS).
export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsInsensitive(input: string): RegExp {
  return new RegExp(escapeRegex(input), 'i');
}
