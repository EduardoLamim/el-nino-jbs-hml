"""Validação OGC independente antes de publicar. Dependência: Shapely 2.1.2.
Uso: python scripts/territory/validate_geometry.py [diretório opcional de dependências]
"""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

if len(sys.argv) > 1:
    sys.path.insert(0, sys.argv[1])
import shapely  # noqa: E402
from shapely.geometry import shape  # noqa: E402
from shapely.validation import explain_validity  # noqa: E402

data = Path('.codex_work/territory/bairros.geojson').read_bytes()
document = json.loads(data)
features = document['features']
assert len(features) == 35
names = [f['properties']['nome'] for f in features]
assert len(set(names)) == 35 and all(names)
assert {'São Vicente', 'Murta', 'Imaruí', 'Cordeiros', 'Salseiros'} <= set(names)
geometries = [shape(f['geometry']) for f in features]
errors = [{ 'id': f['id'], 'motivo': explain_validity(g) } for f, g in zip(features, geometries)
          if not g.is_valid or g.is_empty or g.area <= 0]
assert not errors, errors
assert len({g.wkb for g in geometries}) == 35, 'Geometrias duplicadas'
report = {'validado_em': datetime.now(timezone.utc).isoformat(), 'validador': 'Shapely ' + shapely.__version__,
          'criterio': 'OGC is_valid; polígonos não vazios; área positiva; nomes/IDs/geometrias únicos; WGS84 lon/lat validado pelo Zod',
          'geojson_sha256': hashlib.sha256(data).hexdigest(), 'valido': True, 'feicoes': len(features), 'erros': errors}
Path('docs/fase-04-validacao-geometrica.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(report, ensure_ascii=False))
