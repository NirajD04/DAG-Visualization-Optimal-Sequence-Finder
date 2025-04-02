class Node:
    def __init__(self, id, label=None, weight=1):
        self.id = id
        self.label = label or f"Task {id}"
        self.weight = weight

class Edge:
    def __init__(self, source, target):
        self.source = source
        self.target = target
        self.id = f"e{source}-{target}"

class DAG:
    def __init__(self):
        self.nodes = {}  # id -> Node
        self.edges = []  # list of Edge objects
        
    def add_node(self, id, label=None, weight=1):
        if id not in self.nodes:
            self.nodes[id] = Node(id, label, weight)
            return True
        return False
    
    def add_edge(self, source, target):
        # Check if nodes exist
        if source not in self.nodes or target not in self.nodes:
            return False
        
        # Check if edge already exists
        if any(e.source == source and e.target == target for e in self.edges):
            return False
        
        # Add edge
        self.edges.append(Edge(source, target))
        return True
    
    def remove_node(self, id):
        if id in self.nodes:
            del self.nodes[id]
            # Remove all edges connected to this node
            self.edges = [e for e in self.edges if e.source != id and e.target != id]
            return True
        return False
    
    def remove_edge(self, source, target):
        for i, edge in enumerate(self.edges):
            if edge.source == source and edge.target == target:
                self.edges.pop(i)
                return True
        return False
    
    def get_adjacency_list(self):
        """Build adjacency list (node -> [neighbors])"""
        adj_list = {node_id: [] for node_id in self.nodes}
        for edge in self.edges:
            adj_list[edge.source].append(edge.target)
        return adj_list
    
    def get_reverse_adjacency_list(self):
        """Build reverse adjacency list (node -> [predecessors])"""
        rev_adj_list = {node_id: [] for node_id in self.nodes}
        for edge in self.edges:
            rev_adj_list[edge.target].append(edge.source)
        return rev_adj_list
    
    def to_dict(self):
        """Convert DAG to dictionary for JSON serialization"""
        return {
            "nodes": [{"id": n.id, "label": n.label, "weight": n.weight} for n in self.nodes.values()],
            "edges": [{"id": e.id, "source": e.source, "target": e.target} for e in self.edges]
        }
    
    @staticmethod
    def from_dict(data):
        """Create DAG from dictionary"""
        dag = DAG()
        for node in data.get("nodes", []):
            dag.add_node(node["id"], node.get("label"), node.get("weight", 1))
        for edge in data.get("edges", []):
            dag.add_edge(edge["source"], edge["target"])
        return dag

def topological_sort(dag):
    """
    Kahn's algorithm for topological sorting
    Returns sorted node ids or empty list if cycle exists
    """
    result = []
    adj_list = dag.get_adjacency_list()
    rev_adj_list = dag.get_reverse_adjacency_list()
    
    # Calculate in-degree for each node
    in_degree = {node_id: len(rev_adj_list[node_id]) for node_id in dag.nodes}
    
    # Queue nodes with no incoming edges
    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    
    # Process nodes
    while queue:
        current = queue.pop(0)
        result.append(current)
        
        # Reduce in-degree of neighbors
        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check if we have a valid topological sort
    if len(result) != len(dag.nodes):
        # Graph has a cycle
        return []
    
    return result

def calculate_earliest_start_times(dag, topo_order):
    """Calculate earliest start time for each node"""
    earliest_start = {node_id: 0 for node_id in dag.nodes}
    rev_adj_list = dag.get_reverse_adjacency_list()
    
    for node_id in topo_order:
        predecessors = rev_adj_list[node_id]
        
        if predecessors:
            max_predecessor_end = 0
            
            for pred_id in predecessors:
                pred_start = earliest_start[pred_id]
                pred_weight = dag.nodes[pred_id].weight
                pred_end = pred_start + pred_weight
                
                max_predecessor_end = max(max_predecessor_end, pred_end)
            
            earliest_start[node_id] = max_predecessor_end
    
    return earliest_start

def calculate_latest_start_times(dag, topo_order):
    """Calculate latest start time for each node"""
    adj_list = dag.get_adjacency_list()
    
    # Calculate project completion time
    earliest_start = calculate_earliest_start_times(dag, topo_order)
    max_completion_time = 0
    
    for node_id in topo_order:
        start = earliest_start[node_id]
        weight = dag.nodes[node_id].weight
        max_completion_time = max(max_completion_time, start + weight)
    
    # Initialize all nodes with max completion time
    latest_start = {}
    for node_id in topo_order:
        weight = dag.nodes[node_id].weight
        latest_start[node_id] = max_completion_time - weight
    
    # Process nodes in reverse topological order
    for node_id in reversed(topo_order):
        successors = adj_list[node_id]
        
        if successors:
            min_successor_start = float('inf')
            
            for succ_id in successors:
                succ_start = latest_start[succ_id]
                min_successor_start = min(min_successor_start, succ_start)
            
            weight = dag.nodes[node_id].weight
            latest_start[node_id] = min_successor_start - weight
    
    return latest_start

def calculate_slack(dag, topo_order):
    """Calculate slack for each node"""
    earliest_start = calculate_earliest_start_times(dag, topo_order)
    latest_start = calculate_latest_start_times(dag, topo_order)
    
    slack = {}
    for node_id in topo_order:
        es = earliest_start[node_id]
        ls = latest_start[node_id]
        slack[node_id] = ls - es
    
    return slack

def find_optimal_sequence(dag):
    """
    Find optimal sequence using a heuristic approach
    Returns sorted node ids or empty list if cycle exists
    """
    # First get a valid topological ordering
    topo_order = topological_sort(dag)
    
    if not topo_order:
        # Graph has a cycle, no valid sequence
        return []
    
    # Calculate slack for each node
    node_slack = calculate_slack(dag, topo_order)
    
    # Calculate priority scores
    priority_scores = {}
    for node_id in topo_order:
        slack = node_slack[node_id]
        weight = dag.nodes[node_id].weight
        
        # Nodes with zero slack are on critical path
        # Higher weights and lower slack get higher priority
        is_critical = 1 if slack == 0 else 0
        priority_score = (is_critical * 1000) + weight - (slack * 0.1)
        
        priority_scores[node_id] = priority_score
    
    # Sort nodes by priority while respecting dependencies
    result = []
    visited = set()
    in_degree = {node_id: len(dag.get_reverse_adjacency_list()[node_id]) for node_id in dag.nodes}
    
    while len(result) < len(topo_order):
        # Find available nodes (all dependencies satisfied)
        available = []
        
        for node_id in topo_order:
            if node_id not in visited and in_degree[node_id] == 0:
                available.append(node_id)
        
        if not available:
            # Something went wrong
            break
        
        # Sort available nodes by priority score
        available.sort(key=lambda x: priority_scores[x], reverse=True)
        
        # Pick the highest priority node
        next_node = available[0]
        result.append(next_node)
        visited.add(next_node)
        
        # Update in-degree for neighbors
        for neighbor in dag.get_adjacency_list()[next_node]:
            in_degree[neighbor] -= 1
    
    return result