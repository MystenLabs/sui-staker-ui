import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent) => void
) {
  const handlerRef = useRef(handler)

  useLayoutEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handlerRef.current(event)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref])
}
