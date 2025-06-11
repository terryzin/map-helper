from flask import Flask, render_template, request, jsonify, send_file
import osmnx as ox
import geopandas as gpd
import pandas as pd
import tempfile
import json
from shapely.geometry import Point, Polygon, box
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stat', methods=['POST'])
def stat():
    data = request.json
    mode = data.get('mode')
    result = {}
    try:
        if mode == 'point':
            lat, lon, radius = data['lat'], data['lon'], data['radius']
            G = ox.graph_from_point((lat, lon), dist=radius, network_type='drive')
        elif mode == 'bbox':
            north, south, east, west = data['north'], data['south'], data['east'], data['west']
            G = ox.graph_from_bbox(north, south, east, west, network_type='drive')
        elif mode == 'polygon':
            coords = data['coordinates']
            poly = Polygon(coords)
            G = ox.graph_from_polygon(poly, network_type='drive')
        else:
            return jsonify({'error': 'Invalid mode'}), 400
        gdf = ox.graph_to_gdfs(G, nodes=False, edges=True)
        # 统计
        gdf['highway'] = gdf['highway'].apply(lambda x: ','.join(x) if isinstance(x, list) else str(x))
        gdf['length'] = pd.to_numeric(gdf['length'], errors='coerce')
        gdf = gdf.dropna(subset=['length'])
        total_length = float(gdf['length'].sum())
        road_types = gdf['highway'].value_counts().to_dict()
        type_lengths = gdf.groupby('highway')['length'].sum().to_dict()
        # 结果
        result = {
            'total_length': total_length,
            'road_types': road_types,
            'type_lengths': {k: float(v) for k, v in type_lengths.items()},
        }
        # 导出GeoJSON
        geojson = gdf.to_json()
        result['geojson'] = geojson
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export():
    data = request.json
    geojson = data.get('geojson')
    if not geojson:
        return jsonify({'error': 'No geojson'}), 400
    gdf = gpd.read_file(json.dumps(geojson))
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    gdf.to_csv(tmp.name, index=False)
    return send_file(tmp.name, as_attachment=True, download_name='roads.csv')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 