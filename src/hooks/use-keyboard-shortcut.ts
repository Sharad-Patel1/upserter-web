import { useEffect } from "react"

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { meta?: boolean; shift?: boolean } = {}
) {
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (options.meta && !event.metaKey && !event.ctrlKey) return
      if (options.shift && !event.shiftKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return

      event.preventDefault()
      callback()
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [key, callback, options.meta, options.shift])
}
