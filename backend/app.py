from flask import Flask, jsonify, request, send_from_directory
from dag_utils import DAG, topological_sort, find_optimal_sequence
import os

app = Flask(__name__, static_folder='../static', static_url_path='/static')

# Store the DAG in memory (for simplicity)
current_dag = DAG()

# Initialize with sample data
def initialize_sample_data():
    # Add some sample nodes
    for i in range(1, 6):
        current_dag.add_node(str(i), f"Task {i}", i + 1)
    
    # Add some sample edges
    current_dag.add_edge("1", "2")
    current_dag.add_edge("1", "3")
    current_dag.add_edge("2", "4")
    current_dag.add_edge("3", "4")
    current_dag.add_edge("3", "5")
    current_dag.add_edge("4", "5")

initialize_sample_data()

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/styles.css')
def styles():
    return send_from_directory('../frontend', 'styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('../frontend', 'script.js')

@app.route('/api/dag', methods=['GET'])
def get_dag():
    return jsonify(current_dag.to_dict())

@app.route('/api/dag/node', methods=['POST'])
def add_node():
    data = request.json
    node_id = data.get('id', str(len(current_dag.nodes) + 1))
    label = data.get('label', f"Task {node_id}")
    weight = data.get('weight', 1)
    
    success = current_dag.add_node(node_id, label, weight)
    return jsonify({"success": success, "dag": current_dag.to_dict()})

@app.route('/api/dag/node/<node_id>', methods=['DELETE'])
def remove_node(node_id):
    success = current_dag.remove_node(node_id)
    return jsonify({"success": success, "dag": current_dag.to_dict()})

@app.route('/api/dag/edge', methods=['POST'])
def add_edge():
    data = request.json
    source = data.get('source')
    target = data.get('target')
    
    if not source or not target:
        return jsonify({"success": False, "error": "Source and target required"}), 400
    
    success = current_dag.add_edge(source, target)
    return jsonify({"success": success, "dag": current_dag.to_dict()})

@app.route('/api/dag/edge', methods=['DELETE'])
def remove_edge():
    data = request.json
    source = data.get('source')
    target = data.get('target')
    
    if not source or not target:
        return jsonify({"success": False, "error": "Source and target required"}), 400
    
    success = current_dag.remove_edge(source, target)
    return jsonify({"success": success, "dag": current_dag.to_dict()})

@app.route('/api/dag/topological-sort', methods=['GET'])
def get_topological_sort():
    result = topological_sort(current_dag)
    
    # Get node labels for better display
    result_with_labels = [
        {"id": node_id, "label": current_dag.nodes[node_id].label}
        for node_id in result
    ] if result else []
    
    return jsonify({
        "success": bool(result),
        "result": result,
        "resultWithLabels": result_with_labels,
        "hasCycle": not bool(result)
    })

@app.route('/api/dag/optimal-sequence', methods=['GET'])
def get_optimal_sequence():
    result = find_optimal_sequence(current_dag)
    
    # Get node labels for better display
    result_with_labels = [
        {"id": node_id, "label": current_dag.nodes[node_id].label, "weight": current_dag.nodes[node_id].weight}
        for node_id in result
    ] if result else []
    
    return jsonify({
        "success": bool(result),
        "result": result,
        "resultWithLabels": result_with_labels,
        "hasCycle": not bool(result)
    })

@app.route('/api/dag/reset', methods=['POST'])
def reset_dag():
    global current_dag
    current_dag = DAG()
    initialize_sample_data()
    return jsonify({"success": True, "dag": current_dag.to_dict()})

if __name__ == '__main__':
    app.run(debug=True, port=5000)