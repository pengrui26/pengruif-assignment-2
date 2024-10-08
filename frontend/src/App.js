import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

function App() {
  const [dataPoints, setDataPoints] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const [labels, setLabels] = useState([]);
  const [initMethod, setInitMethod] = useState("random");
  const [k, setK] = useState(3);
  const [finished, setFinished] = useState(false);
  const [isValidK, setIsValidK] = useState(true);

  // Reference to the Plot component
  const plotRef = useRef(null);

  // Generate initial data when component mounts
  useEffect(() => {
    generateData();
  }, []);

  const generateData = () => {
    axios
      .get("/generate-data", { params: { samples: 300 } })
      .then((response) => {
        setDataPoints(response.data.data);
        resetAlgorithm();
      })
      .catch((error) => {
        console.error("Error generating data:", error);
      });
  };

  const initialize = () => {
    if (!isValidK) {
      alert("Please enter a valid number of clusters (k).");
      return;
    }
    if (initMethod === "manual") {
      setCentroids([]);
      setLabels([]);
      setFinished(false);
      alert(`Please click on the plot to select ${k} centroids.`);
    } else {
      axios
        .post("/initialize", { k: k, init_method: initMethod })
        .then((response) => {
          setCentroids(response.data.centroids);
          setLabels([]);
          setFinished(false);
        })
        .catch((error) => {
          console.error("Error initializing:", error);
        });
    }
  };

  const step = () => {
    axios
      .get("/step")
      .then((response) => {
        setCentroids(response.data.centroids);
        setLabels(response.data.labels);
        setFinished(response.data.finished);
      })
      .catch((error) => {
        console.error("Error performing step:", error);
      });
  };

  const runToEnd = () => {
    axios
      .get("/run")
      .then((response) => {
        setCentroids(response.data.centroids);
        setLabels(response.data.labels);
        setFinished(true);
      })
      .catch((error) => {
        console.error("Error running to convergence:", error);
      });
  };

  const resetAlgorithm = () => {
    axios
      .get("/reset")
      .then(() => {
        setCentroids([]);
        setLabels([]);
        setFinished(false);
      })
      .catch((error) => {
        console.error("Error resetting algorithm:", error);
      });
  };

  const handleInitMethodChange = (e) => {
    setInitMethod(e.target.value);
    // Reset algorithm state
    setCentroids([]);
    setLabels([]);
    setFinished(false);
  };

  const handleKChange = (e) => {
    const value = e.target.value;
    if (value === "" || isNaN(value) || parseInt(value) <= 0) {
      setIsValidK(false);
      setK(value);
    } else {
      setIsValidK(true);
      setK(parseInt(value));
    }
  };

  const handlePlotClick = (event) => {
    if (initMethod !== "manual" || centroids.length >= k) return;

    const gd = plotRef.current && plotRef.current.el;

    if (gd) {
      const xaxis = gd._fullLayout.xaxis;
      const yaxis = gd._fullLayout.yaxis;

      // Get the plot area element
      const plotArea = gd.querySelector(".nsewdrag");

      if (!plotArea) {
        console.error("Plot area not found");
        return;
      }

      const plotRect = plotArea.getBoundingClientRect();

      // Get mouse position relative to the plot area
      const mouseX = event.event.clientX - plotRect.left;
      const mouseY = event.event.clientY - plotRect.top;

      // Convert pixel positions to data coordinates
      const xInDataCoord = xaxis.p2d(mouseX);
      const yInDataCoord = yaxis.p2d(mouseY);

      // Ensure the clicked point is within the plot area
      if (
        xInDataCoord < Math.min(...xaxis.range) ||
        xInDataCoord > Math.max(...xaxis.range) ||
        yInDataCoord < Math.min(...yaxis.range) ||
        yInDataCoord > Math.max(...yaxis.range)
      ) {
        return;
      }

      const newCentroids = [...centroids, [xInDataCoord, yInDataCoord]];
      setCentroids(newCentroids);

      if (newCentroids.length === k) {
        axios
          .post("/initialize", {
            k: k,
            init_method: "manual",
            centroids: newCentroids,
          })
          .then(() => {
            setFinished(false);
          })
          .catch((error) => {
            console.error("Error initializing with manual centroids:", error);
          });
      }
    }
  };

  const plotData = () => {
    let traces = [];
    if (labels.length > 0) {
      const clusters = {};
      dataPoints.forEach((point, idx) => {
        const label = labels[idx];
        if (!clusters[label]) clusters[label] = [];
        clusters[label].push(point);
      });
      for (let label in clusters) {
        const cluster = clusters[label];
        traces.push({
          x: cluster.map((p) => p[0]),
          y: cluster.map((p) => p[1]),
          mode: "markers",
          type: "scatter",
          name: `Cluster ${label}`,
        });
      }
    } else {
      traces.push({
        x: dataPoints.map((p) => p[0]),
        y: dataPoints.map((p) => p[1]),
        mode: "markers",
        type: "scatter",
        name: "Data Points",
      });
    }
    if (centroids.length > 0) {
      traces.push({
        x: centroids.map((c) => c[0]),
        y: centroids.map((c) => c[1]),
        mode: "markers",
        type: "scatter",
        name: "Centroids",
        marker: { symbol: "x", size: 12, color: "black" },
      });
    }
    return traces;
  };

  const plotLayout = {
    width: 700,
    height: 500,
    title: "KMeans Clustering",
    clickmode: "event",
  };

  return (
    <div>
      <h1>KMeans Clustering Visualization</h1>
      <div>
        <label>Initialization Method: </label>
        <select value={initMethod} onChange={handleInitMethodChange}>
          <option value="random">Random</option>
          <option value="farthest">Farthest First</option>
          <option value="kmeans++">KMeans++</option>
          <option value="manual">Manual</option>
        </select>
        <label> Number of Clusters (k): </label>
        <input
          type="number"
          value={k}
          onChange={handleKChange}
          min="1"
          max="10"
          step="1"
        />
      </div>
      {!isValidK && (
        <p style={{ color: "red" }}>
          Please enter a valid number of clusters (k).
        </p>
      )}
      <div>
        <button onClick={generateData}>Generate New Dataset</button>
        <button onClick={initialize} disabled={!isValidK}>
          Initialize
        </button>
        <button onClick={step} disabled={finished || !isValidK}>
          Step
        </button>
        <button onClick={runToEnd} disabled={finished || !isValidK}>
          Run to Convergence
        </button>
        <button onClick={resetAlgorithm}>Reset Algorithm</button>
      </div>
      <Plot
        data={plotData()}
        layout={plotLayout}
        onClick={handlePlotClick}
        ref={plotRef}
        config={{ responsive: true }}
        key={dataPoints.length}
      />
    </div>
  );
}

export default App;
