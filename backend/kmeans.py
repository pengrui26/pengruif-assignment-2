# backend/kmeans.py

import random
import numpy as np

class KMeans:
    def __init__(self, k=3, init_method='random', data=None):
        self.k = k
        self.init_method = init_method
        self.data = np.array(data)
        self.centroids = []
        self.labels = []
        self.converged = False

    def initialize_centroids(self):
        if self.init_method == 'random':
            indices = np.random.choice(self.data.shape[0], self.k, replace=False)
            self.centroids = self.data[indices]
        elif self.init_method == 'farthest':
            self.centroids = self.farthest_first_initialization()
        elif self.init_method == 'kmeans++':
            self.centroids = self.kmeans_plus_plus_initialization()
        else:
            self.centroids = []  # 手动初始化将在前端处理
        return self.centroids.tolist()

    def farthest_first_initialization(self):
        centroids = []
        centroids.append(self.data[np.random.randint(self.data.shape[0])])
        for _ in range(1, self.k):
            distances = np.array([min([np.linalg.norm(x - c) for c in centroids]) for x in self.data])
            next_centroid = self.data[np.argmax(distances)]
            centroids.append(next_centroid)
        return np.array(centroids)

    def kmeans_plus_plus_initialization(self):
        centroids = []
        centroids.append(self.data[np.random.randint(self.data.shape[0])])
        for _ in range(1, self.k):
            distances = np.array([min([np.linalg.norm(x - c)**2 for c in centroids]) for x in self.data])
            probabilities = distances / distances.sum()
            cumulative_probabilities = probabilities.cumsum()
            r = random.random()
            index = np.where(cumulative_probabilities >= r)[0][0]
            centroids.append(self.data[index])
        return np.array(centroids)

    def assign_labels(self):
        distances = np.linalg.norm(self.data[:, np.newaxis] - self.centroids, axis=2)
        self.labels = distances.argmin(axis=1)

    def update_centroids(self):
        new_centroids = []
        for i in range(self.k):
            points = self.data[self.labels == i]
            if len(points) > 0:
                new_centroid = points.mean(axis=0)
            else:
                # 如果一个簇没有数据点，随机重新初始化质心
                new_centroid = self.data[np.random.randint(self.data.shape[0])]
            new_centroids.append(new_centroid)
        new_centroids = np.array(new_centroids)
        self.converged = np.allclose(self.centroids, new_centroids)
        self.centroids = new_centroids

    def step(self):
        if self.converged:
            return True
        self.assign_labels()
        self.update_centroids()
        return self.converged
