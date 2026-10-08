import importlib.util
import json
import tempfile
import subprocess
import sys
import unittest
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

spec = importlib.util.spec_from_file_location('import_plan', Path('scripts/plans/import_plan.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportTests(unittest.TestCase):
    def workbook(self, rows, formula=False, extra=None):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / 'plan.xlsx'
        xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
        for number, row in enumerate(rows, 1):
            xml += f'<row r="{number}">'
            for column, value in enumerate(row):
                xml += f'<c r="{chr(65 + column)}{number}" t="inlineStr">'
                if formula and number == 2 and column == 6:
                    xml += '<f>HYPERLINK("https://example.com")</f>'
                xml += '<is><t>' + escape(value) + '</t></is></c>'
            xml += '</row>'
        xml += '</sheetData></worksheet>'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('xl/worksheets/sheet1.xml', xml)
            if extra:
                archive.writestr(*extra)
        return path

    def setUp(self):
        self.row = ['Emergência', '1', 'Áção ç', '', 'Agora', 'TI', '  Exato.\nSem reescrever.  ']

    def test_preserves_text_empty_and_whitespace(self):
        self.assertEqual(module.import_plan(self.workbook([module.HEADERS, self.row]))[0], dict(zip(module.HEADERS, self.row)))

    def test_levels(self):
        for invalid in ['Impacto confirmado', 'emergência', 'Normalidade', 'Impacto JBS ']:
            with self.subTest(invalid=invalid), self.assertRaisesRegex(ValueError, 'Linha 2: Nível'):
                module.import_plan(self.workbook([module.HEADERS, [invalid, *self.row[1:]]]))

    def test_headers(self):
        for headers in [module.HEADERS[::-1], module.HEADERS[:-1], [*module.HEADERS[:-1], 'Como Fazer']]:
            with self.subTest(headers=headers), self.assertRaisesRegex(ValueError, 'Linha 1'):
                module.import_plan(self.workbook([headers, self.row]))

    def test_order(self):
        for order in ['abc', '0', '-1', '1.5', '']:
            with self.subTest(order=order), self.assertRaisesRegex(ValueError, 'Linha 2: Ordem'):
                module.import_plan(self.workbook([module.HEADERS, [self.row[0], order, *self.row[2:]]]))

    def test_duplicate_per_level(self):
        with self.assertRaisesRegex(ValueError, 'Linha 3: Ordem duplicada'):
            module.import_plan(self.workbook([module.HEADERS, self.row, self.row]))
        self.assertEqual(len(module.import_plan(self.workbook([module.HEADERS, self.row, ['Impacto JBS', *self.row[1:]]]))), 2)

    def test_formula_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Linha 2: fórmulas'):
            module.import_plan(self.workbook([module.HEADERS, self.row], formula=True))

    def test_active_and_xml_entities(self):
        for extra in [('xl/vbaProject.bin', 'data'), ('xl/externalLinks/link.xml', '<a/>'), ('xl/evil.xml', '<!DOCTYPE foo><a/>')]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                module.import_plan(self.workbook([module.HEADERS, self.row], extra=extra))

    def test_ti_full_roundtrip(self):
        data = json.loads(Path('src/content/plans/ti.json').read_text(encoding='utf-8'))
        self.assertEqual(len(data), 13)
        self.assertEqual(sum(a['Nível'] == 'Emergência' for a in data), 7)
        self.assertEqual(sum(a['Nível'] == 'Impacto JBS' for a in data), 6)
        imported = module.import_plan(self.workbook([module.HEADERS, *[[a[h] for h in module.HEADERS] for a in data]]))
        self.assertEqual(imported, data)

    def test_cli_preserves_existing_output_when_invalid(self):
        source = self.workbook([module.HEADERS, self.row], formula=True)
        destination = source.parent / 'existing.json'
        destination.write_text('previous-valid-content', encoding='utf-8')
        result = subprocess.run([sys.executable, 'scripts/plans/import_plan.py', str(source), str(destination)], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(destination.read_text(encoding='utf-8'), 'previous-valid-content')


if __name__ == '__main__':
    unittest.main()
