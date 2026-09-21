export async function downloadSvgPng(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  const width = svg.viewBox.baseVal.width || svg.clientWidth
  const height = svg.viewBox.baseVal.height || svg.clientHeight
  const xml = new XMLSerializer().serializeToString(clone)
  const image = new Image()
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("The map image could not be drawn."))
    image.src = url
  })
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * 2)
  canvas.height = Math.round(height * 2)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("The map image could not be drawn.")
  context.fillStyle = "#d5e3ea"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  downloadDataUrl(canvas.toDataURL("image/png"), filename)
}

export function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
}
