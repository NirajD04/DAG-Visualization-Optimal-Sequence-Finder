# git init


A simple web application for visualizing Directed Acyclic Graphs (DAGs) and finding optimal sequences using heuristic algorithms.

## Features

- Interactive DAG visualization
- Add/remove nodes and edges
- Topological sorting algorithm
- Optimal sequence finding using a heuristic approach
- Critical path analysis

### How to Run

1. Install the required Python dependencies:


```plaintext
pip install -r backend/requirements.txt
```

2. Download vis-network.min.js from the official VisJS website and place it in the static folder.
3. Run the Flask server:


```plaintext
python backend/app.py
```

4. Open your browser to [http://localhost:5000](http://localhost:5000)


The heuristic algorithm is implemented in Python and considers node weights, critical paths, and slack times to determine an optimal sequence while respecting all the dependencies in the DAG.
