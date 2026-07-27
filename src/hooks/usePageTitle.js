import { useEffect } from 'react'

const SUFFIX = 'TestSense AI'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX
    return () => { document.title = SUFFIX }
  }, [title])
}
