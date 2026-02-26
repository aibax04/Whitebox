"""
Repository Search Engine - JSON Output Version

This script performs semantic search on a repository and outputs results as JSON.
"""

import pickle
import numpy as np
import sys
import json
from sentence_transformers import SentenceTransformer
import faiss


def search_repo(pkl_file: str, query: str, top_k: int = 5):
    """
    Search for the most similar files to a query string.
    
    Args:
        pkl_file: Path to the pickle file containing files and embeddings
        query: Search query string
        top_k: Number of top results to return
        
    Returns:
        List of dictionaries with 'path', 'content', and 'distance' keys
    """
    try:
        # Load data
        with open(pkl_file, 'rb') as f:
            data = pickle.load(f)
        
        files = data["files"]
        embeddings = data["embeddings"]
        
        # Load the embedding model
        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Build FAISS index
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings.astype('float32'))
        
        # Encode query
        query_embedding = model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=False
        ).astype('float32')
        
        query_embedding = query_embedding.reshape(1, -1)
        
        # Search
        distances, indices = index.search(query_embedding, min(top_k, len(files)))
        
        # Build results
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx < len(files):
                # Truncate content for manageable size
                content = files[idx]["content"]
                if len(content) > 2000:
                    content = content[:2000] + "..."
                
                results.append({
                    "path": files[idx]["path"],
                    "content": content,
                    "distance": float(distance)
                })
        
        return results
    
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python search_repo_json.py <pkl_file> <query> [top_k]"}))
        sys.exit(1)
    
    pkl_file = sys.argv[1]
    query = sys.argv[2]
    top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    
    results = search_repo(pkl_file, query, top_k)
    print(json.dumps(results, indent=2))

