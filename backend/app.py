# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from kmeans import KMeans
import numpy as np

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局变量，存储数据集和算法状态
data = []
kmeans_instance = None

@app.route('/generate-data', methods=['GET'])
def generate_data():
    from sklearn.datasets import make_blobs
    global data
    centers = int(request.args.get('centers', 3))
    n_samples = int(request.args.get('samples', 300))
    X, _ = make_blobs(n_samples=n_samples, centers=centers, n_features=2, random_state=42)
    data = X.tolist()
    return jsonify({'data': data})

@app.route('/initialize', methods=['POST'])
def initialize():
    global kmeans_instance
    params = request.get_json()
    k = params.get('k', 3)
    init_method = params.get('init_method', 'random')
    centroids = params.get('centroids', None)
    kmeans_instance = KMeans(k=k, init_method=init_method, data=data)
    if init_method == 'manual' and centroids is not None:
        kmeans_instance.centroids = np.array(centroids)
    else:
        centroids = kmeans_instance.initialize_centroids()
    return jsonify({'centroids': centroids})

@app.route('/step', methods=['GET'])
def step():
    global kmeans_instance
    if kmeans_instance is None:
        return jsonify({'error': 'KMeans not initialized'}), 400
    finished = kmeans_instance.step()
    response = {
        'centroids': kmeans_instance.centroids.tolist(),
        'labels': kmeans_instance.labels.tolist(),
        'finished': finished
    }
    return jsonify(response)

@app.route('/run', methods=['GET'])
def run():
    global kmeans_instance
    if kmeans_instance is None:
        return jsonify({'error': 'KMeans not initialized'}), 400
    while not kmeans_instance.converged:
        kmeans_instance.step()
    response = {
        'centroids': kmeans_instance.centroids.tolist(),
        'labels': kmeans_instance.labels.tolist(),
        'finished': True
    }
    return jsonify(response)

@app.route('/reset', methods=['GET'])
def reset():
    global kmeans_instance
    kmeans_instance = None
    return jsonify({'status': 'reset successful'})

if __name__ == '__main__':
    app.run(port=8000)
