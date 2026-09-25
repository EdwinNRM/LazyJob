import { useEffect, useRef, type ReactNode } from 'react'
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
 const ref = useRef<HTMLDivElement>(null)
 const close = useRef(onClose); close.current = onClose
 useEffect(() => {
  const previous = document.activeElement as HTMLElement
  const root = ref.current!
  const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href],[tabindex="0"]'))
  focusable()[0]?.focus()
  const key = (e: KeyboardEvent) => {
   if (e.key === 'Escape') close.current()
   if (e.key === 'Tab') {
    const elements = focusable(), first = elements[0], last = elements[elements.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
   }
  }
  root.addEventListener('keydown', key)
  return () => { root.removeEventListener('keydown', key); previous?.focus() }
 }, [])
 return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
  <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[94dvh] overflow-y-auto">
   <header className="flex items-start justify-between gap-4 p-5 border-b"><h2 className="text-lg font-semibold break-words">{title}</h2><button className="btn-secondary shrink-0" onClick={onClose} aria-label="Fechar">×</button></header>
   <div className="p-5 space-y-4">{children}</div>
  </div>
 </div>
}
