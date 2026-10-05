// Correspondências exatas observadas no JSON oficial municipal Epagri/Ciram.
// Condições novas mantêm o texto sem receber uma interpretação meteorológica.
export const iconesCondicao = {
  'Encoberto com chuva': 'rain',
  'Nebulosidade variável e chuva isolada': 'showers',
  'Céu encoberto': 'cloud',
} as const;
type Icon = 'rain' | 'showers' | 'cloud' | 'unknown';
export function WeatherIcon({ condition, kind }: { condition?: string | null; kind?: Icon }) {
  const icon = kind ?? iconesCondicao[condition as keyof typeof iconesCondicao] ?? 'unknown';
  return <svg className="weather-icon" data-weather-icon={icon} viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {icon === 'unknown' ? <><circle cx="16" cy="16" r="11" /><path d="M16 15v7m0-12v1" /></> : <>
      {icon === 'showers' && <><circle cx="22" cy="9" r="4" /><path d="M22 2V1m6 3 1-1m0 6h2M16 3l1 1" /></>}
      <path d="M8 22a5 5 0 0 1-1-10 7 7 0 0 1 13-3 6 6 0 0 1 4 13Z" />
      {icon !== 'cloud' && <path d="m10 26-1 3m8-3-1 3m8-3-1 3" />}
    </>}
  </svg>;
}
