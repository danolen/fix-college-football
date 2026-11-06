const MAX_CANVAS_SIDE = 4096
const MAX_CANVAS_AREA = 16_000_000

export function canvasPixelRatio(width: number, height: number, preferred = 2) {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const sideLimit = Math.min(MAX_CANVAS_SIDE / w, MAX_CANVAS_SIDE / h)
  const areaLimit = Math.sqrt(MAX_CANVAS_AREA / (w * h))
  const ratio = Math.min(preferred, sideLimit, areaLimit)
  return Math.max(0.25, Math.floor(ratio * 100) / 100)
}

export function needsShareSheet(agent: { userAgent: string; platform: string; maxTouchPoints: number }) {
  if (/iPhone|iPad|iPod/i.test(agent.userAgent)) return true
  return agent.platform === "MacIntel" && agent.maxTouchPoints > 1
}

export type SaveResult = "shared" | "downloaded" | "cancelled" | "preview"

export async function svgElementToPngBlob(svg: SVGSVGElement): Promise<Blob> {
  const width = svg.viewBox.baseVal.width || svg.clientWidth || 960
  const height = svg.viewBox.baseVal.height || svg.clientHeight || 640
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  const xml = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)
  try {
    const image = new Image()
    image.decoding = "sync"
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("The map image could not be drawn.")), 15000)
      image.onload = () => {
        window.clearTimeout(timer)
        resolve()
      }
      image.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error("The map image could not be drawn."))
      }
      image.src = url
    })
    const scale = canvasPixelRatio(width, height)
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("The map image could not be drawn.")
    context.fillStyle = "#d5e3ea"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error("The map image could not be drawn.")
    }
    return await canvasToPngBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function savePngBlob(blob: Blob, filename: string): Promise<SaveResult> {
  if (needsShareSheet(readAgent())) {
    const shared = await sharePngFile(blob, filename)
    if (shared === "shared" || shared === "cancelled") return shared
    return "preview"
  }
  downloadBlob(blob, filename)
  return "downloaded"
}

export async function sharePngFile(blob: Blob, filename: string): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unavailable"
  const file = new File([blob], filename, { type: "image/png" })
  if (!canShareFile(file)) return "unavailable"
  try {
    await navigator.share({ files: [file], title: "Fix College Football" })
    return "shared"
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    return "unavailable"
  }
}

function canShareFile(file: File) {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return withTimeout(
    new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error("The map image could not be drawn."))
      }, "image/png")
    }),
    15000,
  )
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The picture took too long to draw.")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function readAgent() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  }
}
