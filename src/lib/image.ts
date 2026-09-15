/**
 * Downscales a picked image to a square JPEG before upload. Keeps the free
 * tier's 1 GB of storage from being eaten by 6 MB phone photos, and keeps the
 * bucket's 512 KB limit satisfied without the student having to care.
 */
export async function downscaleToJpeg(file: File, size = 512, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      quality,
    )
  })
}
