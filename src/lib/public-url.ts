export function publicUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const base = raw.endsWith("/") ? raw.slice(0, -1) : raw
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${base}${suffix}`
}
