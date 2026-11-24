/** On touch devices opens the native share sheet (Save to Files, messengers…); otherwise downloads. */
export async function saveFile(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type })
  const isTouch = window.matchMedia('(pointer: coarse)').matches
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 100) || 'Смета'
