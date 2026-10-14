export const dotslabAgents = {
  west: { name: 'Ash', shape: 'round', color: '#eee934' },
  ted: { name: 'Ted', shape: 'pebble', color: '#6598ad' },
  indy: { name: 'Indy', shape: 'capsule', color: '#a97245' },
  livro: { name: 'Livro', shape: 'drop', color: '#b45f48' },
  figma: { name: 'Figma', shape: 'square', color: '#e66552' },
  pam: { name: 'Pam', shape: 'heart', color: '#cda98e' },
  kyle: { name: 'Kyle', shape: 'clover', color: '#22dc48' },
  sheldon: { name: 'Sheldon', shape: 'triangle', color: '#244c64' },
  dumbledore: { name: 'Dumbledore', shape: 'cloud', color: '#050505' },
  songbird: { name: 'Songbird', shape: 'flame', color: '#7d9ca0' },
  rorschach: { name: 'Rorschach', shape: 'pebble', color: '#e8e4d9' },
  homer: { name: 'Homer', shape: 'round', color: '#e6bd45' },
  c3po: { name: 'C-3PO', shape: 'briefcase', color: '#d1a548' },
  batman: { name: 'Batman', shape: 'triangle', color: '#303a52' },
  reed: { name: 'Reed Richards', shape: 'square', color: '#3579ad' },
  ultron: { name: 'Ultron', shape: 'capsule', color: '#828d99' },
  captain: { name: 'Capitão América', shape: 'star', color: '#316a9b' },
  marilia: { name: 'Marília', shape: 'heart', color: '#d9837f' },
  hal: { name: 'Hal Jordan', shape: 'clover', color: '#199a60' },
  tony: { name: 'Tony Stark', shape: 'flame', color: '#b9433f' },
} as const

export type MascotAgent = keyof typeof dotslabAgents
