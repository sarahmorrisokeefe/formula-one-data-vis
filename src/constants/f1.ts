export const CURRENT_YEAR = new Date().getFullYear()
export const MIN_YEAR = 1950

export const CONSTRUCTOR_COLORS: Record<string, string> = {
  // Current teams
  red_bull: '#3671C6',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  aston_martin: '#358C75',
  alpine: '#FF87BC',
  williams: '#64C4FF',
  rb: '#6692FF',
  alphatauri: '#6692FF',
  kick_sauber: '#52E252',
  sauber: '#52E252',
  haas: '#B6BABD',
  // Historical teams
  renault: '#FFF500',
  force_india: '#F596C8',
  racing_point: '#F596C8',
  toro_rosso: '#469BFF',
  lotus_f1: '#FFB800',
  bmw_sauber: '#006EFF',
  brawn: '#80FF00',
  honda: '#E8002D',
  toyota: '#CC1E00',
  jaguar: '#00471A',
  bar: '#ffffff',
  minardi: '#000000',
  jordan: '#FFD700',
  stewart: '#FFFFFF',
  tyrrell: '#006BA6',
  benetton: '#0067FF',
  ligier: '#0000AA',
  matra: '#0000CC',
  brabham: '#ffffff',
  cooper: '#3EC1CF',
  lotus: '#FFB800',
  vanwall: '#006600',
  // Fallback
  default: '#888888',
}

export const TIRE_COLORS: Record<string, string> = {
  SOFT: '#E8002D',
  MEDIUM: '#FFF200',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#39B54A',
  WET: '#0067FF',
  SUPERSOFT: '#FF0090',
  ULTRASOFT: '#9B26AF',
  HYPERSOFT: '#FFAAC2',
  unknown: '#888888',
}

export const FLAG_EMOJIS: Record<string, string> = {
  British: '🇬🇧',
  German: '🇩🇪',
  Dutch: '🇳🇱',
  Spanish: '🇪🇸',
  Finnish: '🇫🇮',
  French: '🇫🇷',
  Australian: '🇦🇺',
  Canadian: '🇨🇦',
  Mexican: '🇲🇽',
  Monegasque: '🇲🇨',
  Italian: '🇮🇹',
  Brazilian: '🇧🇷',
  American: '🇺🇸',
  Japanese: '🇯🇵',
  Thai: '🇹🇭',
  Chinese: '🇨🇳',
  Danish: '🇩🇰',
  Argentine: '🇦🇷',
  Austrian: '🇦🇹',
  Belgian: '🇧🇪',
  South_African: '🇿🇦',
  New_Zealander: '🇳🇿',
  Swiss: '🇨🇭',
  Swedish: '🇸🇪',
}

export const SEASON_YEARS = Array.from(
  { length: CURRENT_YEAR - MIN_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
)

export function getConstructorColor(constructorId: string): string {
  return CONSTRUCTOR_COLORS[constructorId] ?? CONSTRUCTOR_COLORS.default
}

export function getTireColor(compound: string): string {
  return TIRE_COLORS[compound.toUpperCase()] ?? TIRE_COLORS.unknown
}
