import type { ChartTokens } from './theme'

/**
 * Tooltip content built with DOM nodes and textContent (never innerHTML):
 * value first and strong, series name secondary, keyed by a short line.
 */
export function tooltipBox(
  tk: ChartTokens,
  title: string,
  rows: { color?: string; value: string; label: string }[],
) {
  const root = document.createElement('div')
  root.style.cssText = `font-family: Inter Variable, system-ui, sans-serif; font-size: 12px; color: ${tk.textPrimary}; min-width: 140px;`
  const head = document.createElement('div')
  head.textContent = title
  head.style.cssText = `color: ${tk.muted}; margin-bottom: 4px;`
  root.appendChild(head)
  for (const r of rows) {
    const row = document.createElement('div')
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 2px;'
    if (r.color) {
      const key = document.createElement('span')
      key.style.cssText = `display: inline-block; width: 12px; height: 2px; border-radius: 1px; background: ${r.color};`
      row.appendChild(key)
    }
    const v = document.createElement('strong')
    v.textContent = r.value
    v.style.cssText = 'font-variant-numeric: tabular-nums; font-weight: 600;'
    const l = document.createElement('span')
    l.textContent = r.label
    l.style.cssText = `color: ${tk.textSecondary};`
    row.append(v, l)
    root.appendChild(row)
  }
  return root
}

export function tooltipBase(tk: ChartTokens) {
  return {
    backgroundColor: tk.surface,
    borderColor: tk.grid,
    borderWidth: 1,
    padding: [8, 10],
    extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.12); border-radius: 8px;',
  }
}
