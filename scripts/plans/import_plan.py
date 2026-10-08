"""Offline XLSX → JSON. Does not evaluate formulas or publish the source workbook."""
import argparse
import json
import re
import os
import tempfile
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

HEADERS = ['Nível', 'Ordem', 'Quem faz', 'Quem faz - Secundário', 'Quando faz', 'Onde faz', 'Como faz']
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def import_plan(source):
    with zipfile.ZipFile(source) as archive:
        entries = archive.infolist()
        if len(entries) > 200 or sum(e.file_size for e in entries) > 10_000_000:
            raise ValueError('Arquivo excede limites de segurança.')
        if len({e.filename for e in entries}) != len(entries):
            raise ValueError('Entradas duplicadas no arquivo.')
        for entry in entries:
            if any(s in entry.filename.lower() for s in ('vbaproject', 'externallinks', 'embeddings', 'activex')):
                raise ValueError('Conteúdo ativo/externo não permitido.')
            if entry.filename.endswith(('.xml', '.rels')):
                raw = archive.read(entry)
                if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
                    raise ValueError('Entidades XML não permitidas.')
        sheets = [e.filename for e in entries if re.fullmatch(r'xl/worksheets/sheet\d+\.xml', e.filename)]
        if len(sheets) != 1:
            raise ValueError('O arquivo deve conter exatamente uma planilha.')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(t.text or '' for t in s.findall('.//m:t', NS))
                       for s in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        root = ET.fromstring(archive.read(sheets[0]))
        rows = []
        for row in root.findall('./m:sheetData/m:row', NS):
            number = int(row.attrib['r'])
            values = [''] * 7
            seen = set()
            for cell in row.findall('m:c', NS):
                ref = cell.attrib['r']
                if cell.find('m:f', NS) is not None:
                    raise ValueError(f'Linha {number}: fórmulas não permitidas ({ref}).')
                value = cell.find('m:v', NS)
                text = value.text or '' if value is not None else ''
                kind = cell.get('t')
                if kind == 's':
                    text = strings[int(text)]
                elif kind == 'inlineStr':
                    text = ''.join(t.text or '' for t in cell.findall('.//m:t', NS))
                elif kind not in (None, 'n', 'str'):
                    raise ValueError(f'Linha {number}: tipo de célula inválido.')
                match = re.fullmatch(r'([A-G])' + str(number), ref)
                if not match:
                    if text:
                        raise ValueError(f'Linha {number}: coluna extra ({ref}).')
                    continue
                index = ord(match[1]) - ord('A')
                if index in seen:
                    raise ValueError(f'Linha {number}: célula duplicada.')
                seen.add(index)
                values[index] = text
            if any(values):
                rows.append((number, values))
        if not rows or rows[0] != (1, HEADERS):
            raise ValueError('Linha 1: cabeçalhos devem corresponder exatamente às sete colunas.')
        actions, seen = [], set()
        for number, values in rows[1:]:
            level, order = values[:2]
            if level not in ('Emergência', 'Impacto JBS'):
                raise ValueError(f'Linha {number}: Nível inválido.')
            if not re.fullmatch(r'[1-9]\d*', order):
                raise ValueError(f'Linha {number}: Ordem deve ser inteiro positivo.')
            key = (level, int(order))
            if key in seen:
                raise ValueError(f'Linha {number}: Ordem duplicada no nível.')
            seen.add(key)
            actions.append(dict(zip(HEADERS, values)))
        if not actions:
            raise ValueError('Plano sem ações.')
        return actions


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    try:
        data = import_plan(args.source)
        args.destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='\n', dir=args.destination.parent, delete=False) as output:
                temporary = Path(output.name)
                output.write(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            os.replace(temporary, args.destination)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        print(f'Importadas {len(data)} ações. Arquivo original não publicado.')
    except (ValueError, KeyError, OSError, ET.ParseError, zipfile.BadZipFile) as error:
        parser.exit(1, f'Importação rejeitada: {error}\n')
