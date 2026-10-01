import { TopBar } from '../components/ui';
import { t } from '../i18n/t';

const REPO = 'https://github.com/olagon/kilo';

const CREDITS: [string, string][] = [
  ['USGS The National Map', 'Public domain imagery (USGSImageryOnly)'],
  ['Esri, Maxar, Earthstar Geographics', 'World Imagery, when an ArcGIS key is set'],
  ['AWS Open Data Terrain Tiles', 'Terrain (Mapzen Terrarium), sources: USGS, NASA SRTM, and others'],
  ['OpenStreetMap contributors', 'Map data, ODbL'],
  ['OpenFreeMap and OpenMapTiles', 'Guess map tiles and style'],
  ['Mapillary contributors', 'Ground imagery, CC BY-SA (when enabled)'],
  ['MapLibre GL JS', 'BSD 3-Clause'],
  ['React, Zustand, Motion, Capacitor', 'MIT'],
  ['Inter and Fraunces', 'SIL Open Font License'],
];

export function About() {
  return (
    <div className="screen">
      <div className="screen-pad">
        <TopBar title={t('about.title')} />
        <h2 className="display" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{t('app.name')}</h2>
        <p style={{ margin: '12px 0 20px', fontSize: '1.0625rem' }}>{t('about.body')}</p>
        <p style={{ fontWeight: 500 }}>{t('about.made')}</p>
        <p style={{ marginBottom: 24 }}><a href={REPO} target="_blank" rel="noreferrer">{t('about.source')}</a></p>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8 }}>{t('about.credits')}</h3>
        <div className="card" style={{ padding: '4px 16px', marginBottom: 16 }}>
          {CREDITS.map(([k, v]) => (
            <div className="row" key={k} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 0' }}>
              <span className="label">{k}</span>
              <span className="sub">{v}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: '0.875rem' }}>
          {t('about.donate_ofm')}: <a href="https://openfreemap.org" target="_blank" rel="noreferrer">openfreemap.org</a>
        </p>
      </div>
    </div>
  );
}
