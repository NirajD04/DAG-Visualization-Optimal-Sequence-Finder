// Global variables
let network;
let nodes;
let edges;
let currentAlgorithm = 'none';
let topoSortResult = [];
let optimalSequenceResult = [];

// Initialize the network visualization
function initializeNetwork() {
    // Create nodes and edges datasets
    nodes = new vis.DataSet();
    edges = new vis.DataSet();

    // Create network container
    const container = document.getElementById('network-container');
    
    // Network options
    const options = {
        nodes: {
            shape: 'box',
            margin: 10,
            font: {
                size: 14
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            arrows: {
                to: { enabled: true, scaleFactor: 1 }
            },
            width: 2
        },
        physics: {
            enabled: true,
            hierarchicalRepulsion: {
                nodeDistance: 150
            },
            solver: 'forceAtlas2Based',
            stabilization: {
                iterations: 100
            }
        },
        manipulation: {
            enabled: false,
            addNode: function(data, callback) {
                const nodeLabel = document.getElementById('node-label').value || `Task ${nodes.length + 1}`;
                const nodeWeight = parseInt(document.getElementById('node-weight').value) || 5;
                
                data.label = `${nodeLabel}\n(Weight: ${nodeWeight})`;
                data.weight = nodeWeight;
                data.id = Date.now().toString();
                
                callback(data);
                
                // Save to backend
                addNodeToBackend(data.id, nodeLabel, nodeWeight);
                updateNodeSelects();
            }
        },
        interaction: {
            navigationButtons: true,
            keyboard: true,
            hover: true
        }
    };

    // Initialize the network
    network = new vis.Network(container, { nodes, edges }, options);

    // Event listeners
    network.on('doubleClick', function(params) {
        // If clicked on empty space, add a new node
        if (params.nodes.length === 0 && params.edges.length === 0) {
            const nodeId = Date.now().toString();
            const nodeLabel = document.getElementById('node-label').value || `Task ${nodes.length + 1}`;
            const nodeWeight = parseInt(document.getElementById('node-weight').value) || 5;
            
            // Add node to visualization
            nodes.add({
                id: nodeId,
                label: `${nodeLabel}\n(Weight: ${nodeWeight})`,
                weight: nodeWeight,
                x: params.pointer.canvas.x,
                y: params.pointer.canvas.y
            });
            
            // Save to backend
            addNodeToBackend(nodeId, nodeLabel, nodeWeight);
            updateNodeSelects();
        }
    });

    network.on('click', function(params) {
        if (params.nodes.length === 0 && params.edges.length === 0) {
            network.disableEditMode();
        }
    });

    network.on('selectNode', function(params) {
        document.getElementById('source-node').value = params.nodes[0];
    });

    network.on('oncontext', function(params) {
        params.event.preventDefault();
        
        if (params.nodes.length > 0) {
            // Right-clicked on a node
            const nodeId = params.nodes[0];
            if (confirm(`Delete node "${nodes.get(nodeId).label}"?`)) {
                deleteNodeFromBackend(nodeId);
            }
        } else if (params.edges.length > 0) {
            // Right-clicked on an edge
            const edgeId = params.edges[0];
            const edge = edges.get(edgeId);
            if (confirm(`Delete edge from "${nodes.get(edge.from).label}" to "${nodes.get(edge.to).label}"?`)) {
                deleteEdgeFromBackend(edge.from, edge.to);
            }
        }
    });
}

// Initialize tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Set active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Set active content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Initialize controls event listeners
function initializeControls() {
    // Add node button
    document.getElementById('add-node-btn').addEventListener('click', () => {
        const nodeLabel = document.getElementById('node-label').value || `Task ${nodes.length + 1}`;
        const nodeWeight = parseInt(document.getElementById('node-weight').value) || 5;
        const nodeId = Date.now().toString();
        
        // Add node to visualization
        nodes.add({
            id: nodeId,
            label: `${nodeLabel}\n(Weight: ${nodeWeight})`,
            weight: nodeWeight
        });
        
        // Save to backend
        addNodeToBackend(nodeId, nodeLabel, nodeWeight);
        updateNodeSelects();
    });

    // Add edge button
    document.getElementById('add-edge-btn').addEventListener('click', () => {
        const sourceId = document.getElementById('source-node').value;
        const targetId = document.getElementById('target-node').value;
        
        if (!sourceId || !targetId || sourceId === targetId) {
            alert('Please select different source and target nodes');
            return;
        }
        
        // Check if edge already exists
        const existingEdges = edges.get({
            filter: function(edge) {
                return edge.from === sourceId && edge.to === targetId;
            }
        });
        
        if (existingEdges.length > 0) {
            alert('Edge already exists');
            return;
        }
        
        // Add edge to visualization
        const edgeId = `e${sourceId}-${targetId}`;
        edges.add({
            id: edgeId,
            from: sourceId,
            to: targetId
        });
        
        // Save to backend
        addEdgeToBackend(sourceId, targetId);
    });

    // Topological sort button
    document.getElementById('topo-sort-btn').addEventListener('click', () => {
        runTopologicalSort();
    });

    // Optimal sequence button
    document.getElementById('optimal-sequence-btn').addEventListener('click', () => {
        findOptimalSequence();
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        resetGraph();
    });
}

// Update node select dropdowns
function updateNodeSelects() {
    const sourceSelect = document.getElementById('source-node');
    const targetSelect = document.getElementById('target-node');
    
    // Clear existing options
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    
    // Add default empty option
    const defaultOption1 = document.createElement('option');
    defaultOption1.value = '';
    defaultOption1.textContent = '-- Select Node --';
    sourceSelect.appendChild(defaultOption1);
    
    const defaultOption2 = document.createElement('option');
    defaultOption2.value = '';
    defaultOption2.textContent = '-- Select Node --';
    targetSelect.appendChild(defaultOption2);
    
    // Add node options
    const nodeList = nodes.get();
    nodeList.forEach(node => {
        const sourceOption = document.createElement('option');
        sourceOption.value = node.id;
        sourceOption.textContent = node.label.split('\n')[0]; // Only use the first line (without weight)
        sourceSelect.appendChild(sourceOption);
        
        const targetOption = document.createElement('option');
        targetOption.value = node.id;
        targetOption.textContent = node.label.split('\n')[0]; // Only use the first line (without weight)
        targetSelect.appendChild(targetOption);
    });
}

// API Functions
async function loadInitialData() {
    try {
        const response = await fetch('/api/dag');
        const data = await response.json();
        
        // Clear existing nodes and edges
        nodes.clear();
        edges.clear();
        
        // Add nodes
        data.nodes.forEach(node => {
            nodes.add({
                id: node.id,
                label: `${node.label}\n(Weight: ${node.weight})`,
                weight: node.weight
            });
        });
        
        // Add edges
        data.edges.forEach(edge => {
            edges.add({
                id: edge.id,
                from: edge.source,
                to: edge.target
            });
        });
        
        // Update selects
        updateNodeSelects();
        
        // Reset results
        resetResults();
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

async function addNodeToBackend(id, label, weight) {
    try {
        await fetch('/api/dag/node', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, label, weight })
        });
    } catch (error) {
        console.error('Error adding node:', error);
    }
}

async function deleteNodeFromBackend(id) {
    try {
        await fetch(`/api/dag/node/${id}`, {
            method: 'DELETE'
        });
        
        // Remove from visualization
        nodes.remove(id);
        
        // Update selects
        updateNodeSelects();
        
        // Reset results
        resetResults();
    } catch (error) {
        console.error('Error deleting node:', error);
    }
}

async function addEdgeToBackend(source, target) {
    try {
        await fetch('/api/dag/edge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source, target })
        });
    } catch (error) {
        console.error('Error adding edge:', error);
    }
}

async function deleteEdgeFromBackend(source, target) {
    try {
        await fetch('/api/dag/edge', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source, target })
        });
        
        // Remove from visualization
        const edgeId = edges.get({
            filter: function(edge) {
                return edge.from === source && edge.to === target;
            }
        })[0].id;
        
        edges.remove(edgeId);
        
        // Reset results
        resetResults();
    } catch (error) {
        console.error('Error deleting edge:', error);
    }
}

async function runTopologicalSort() {
    try {
        // Reset node colors
        resetNodeColors();
        
        const response = await fetch('/api/dag/topological-sort');
        const data = await response.json();
        
        if (data.hasCycle) {
            alert('Cannot perform topological sort: Graph contains a cycle');
            return;
        }
        
        // Store result
        topoSortResult = data.result;
        currentAlgorithm = 'topo';
        
        // Highlight nodes
        highlightSequence(data.result, '#e8f4fc', '#2980b9');
        
        // Update result display
        updateResultDisplay('topo-sort-result', data.resultWithLabels);
    } catch (error) {
        console.error('Error running topological sort:', error);
    }
}

async function findOptimalSequence() {
    try {
        // Reset node colors
        resetNodeColors();
        
        const response = await fetch('/api/dag/optimal-sequence');
        const data = await response.json();
        
        if (data.hasCycle) {
            alert('Cannot find optimal sequence: Graph contains a cycle');
            return;
        }
        
        // Store result
        optimalSequenceResult = data.result;
        currentAlgorithm = 'optimal';
        
        // Highlight nodes
        highlightSequence(data.result, '#e8f0ff', '#3742fa');
        
        // Update result display
        updateResultDisplay('optimal-sequence-result', data.resultWithLabels);
    } catch (error) {
        console.error('Error finding optimal sequence:', error);
    }
}

async function resetGraph() {
    try {
        await fetch('/api/dag/reset', {
            method: 'POST'
        });
        
        // Reload data
        loadInitialData();
    } catch (error) {
        console.error('Error resetting graph:', error);
    }
}

// Helper functions
function resetNodeColors() {
    const nodeIds = nodes.getIds();
    
    nodeIds.forEach(id => {
        nodes.update({
            id: id,
            color: {
                background: undefined,
                border: undefined
            },
            borderWidth: 2,
            font: {
                color: 'black'
            }
        });
    });
}

function highlightSequence(sequence, backgroundColor, borderColor) {
    sequence.forEach((id, index) => {
        nodes.update({
            id: id,
            color: {
                background: backgroundColor,
                border: borderColor
            },
            borderWidth: 3,
            label: nodes.get(id).label + `\n(Order: ${index + 1})`
        });
    });
}

function updateResultDisplay(elementId, resultWithLabels) {
    const element = document.getElementById(elementId);
    
    if (resultWithLabels.length === 0) {
        element.innerHTML = '<p class="placeholder">No valid sequence found. Graph may contain cycles.</p>';
        return;
    }
    
    let html = '<div class="sequence-visualization">';
    
    resultWithLabels.forEach((item, index) => {
        html += `<span class="sequence-item">${item.label}`;
        
        if (item.weight !== undefined) {
            html += ` (W: ${item.weight})`;
        }
        
        html += `</span>`;
        
        if (index < resultWithLabels.length - 1) {
            html += '<span class="sequence-arrow">→</span>';
        }
    });
    
    html += '</div>';
    element.innerHTML = html;
}

function resetResults() {
    document.getElementById('topo-sort-result').innerHTML = 
        '<p class="placeholder">Run the topological sort algorithm to see results</p>';
    document.getElementById('optimal-sequence-result').innerHTML = 
        '<p class="placeholder">Run the optimal sequence algorithm to see results</p>';
    
    resetNodeColors();
    currentAlgorithm = 'none';
    topoSortResult = [];
    optimalSequenceResult = [];
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if vis is already defined
    if (typeof vis === 'undefined') {
        console.error('vis.js library is not loaded. Please ensure it is included in your HTML.');
        return; // Exit the function if vis is not defined
    }
    initializeNetwork();
    initializeTabs();
    initializeControls();
    loadInitialData();
});