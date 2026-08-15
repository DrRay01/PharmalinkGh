// Deterministic accent color per category/name string, so repeating card grids
// (medicine categories, custom pharmacist-added drugs, etc.) aren't all one flat color.
const PALETTE = [
  { border: 'border-t-sky-400', chip: 'bg-sky-50 text-sky-700' },
  { border: 'border-t-emerald-400', chip: 'bg-emerald-50 text-emerald-700' },
  { border: 'border-t-amber-400', chip: 'bg-amber-50 text-amber-700' },
  { border: 'border-t-rose-400', chip: 'bg-rose-50 text-rose-700' },
  { border: 'border-t-violet-400', chip: 'bg-violet-50 text-violet-700' },
  { border: 'border-t-indigo-400', chip: 'bg-indigo-50 text-indigo-700' },
  { border: 'border-t-teal-400', chip: 'bg-teal-50 text-teal-700' },
  { border: 'border-t-orange-400', chip: 'bg-orange-50 text-orange-700' },
];

export function categoryAccent(category: string): { border: string; chip: string } {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
