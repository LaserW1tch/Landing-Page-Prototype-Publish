"""Build the manual-install ZIP; never includes testbed data or backups."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
module = json.loads((ROOT / 'module.json').read_text())
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'dist'
out.mkdir(exist_ok=True)
target = out / f"{module['id']}-v{module['version']}.zip"
files = [ROOT / 'module.json', ROOT / 'README.md']
files += sorted(ROOT.glob('*.ttf'))
if (ROOT / 'docs/CAST.md').exists():
    files.append(ROOT / 'docs/CAST.md')
files += sorted(p for p in (ROOT / 'assets').rglob('*') if p.is_file())
files += sorted((ROOT / 'scripts').glob('*.js'))
files += sorted((ROOT / 'styles').glob('*.css'))
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, f"{module['id']}/{path.relative_to(ROOT).as_posix()}")
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert all('/backups/' not in n and '/docs/verification/' not in n and '/tests/' not in n for n in archive.namelist())
checksum = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(f'{checksum}  {target.name}\n')
print(f'{target}\n{len(files)} runtime files; ZIP verified; SHA-256 {checksum}')
