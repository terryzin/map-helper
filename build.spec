# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['client.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('config.json', '.'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'osmnx',
        'geopandas',
        'pandas',
        'shapely',
        'shapely.geometry',
        'fiona',
        'pyproj',
        'networkx',
        'requests',
        'matplotlib',
        'numpy',
        'scipy',
        'rtree',
        'geopy',
        'folium',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='道路统计分析工具',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
) 