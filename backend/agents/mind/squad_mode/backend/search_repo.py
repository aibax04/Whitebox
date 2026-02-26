"""
Repository Search Engine Module

This module provides a FAISS-based vector search engine for repository embeddings.
"""

import pickle
import numpy as np
from typing import List, Dict
from sentence_transformers import SentenceTransformer
import faiss


class RepoSearchEngine:
    """
    A vector search engine for repository code/documentation using FAISS.
    
    This class loads pre-computed embeddings from a pickle file and provides
    semantic search functionality over the repository files.
    """
    
    def __init__(self, pkl_file: str = "repo_store.pkl", model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize the search engine by loading embeddings and building FAISS index.
        
        Args:
            pkl_file: Path to the pickle file containing files and embeddings
            model_name: Name of the sentence-transformers model (must match the one used for embedding)
        """
        print(f"Loading repository store from {pkl_file}...")
        
        try:
            with open(pkl_file, 'rb') as f:
                data = pickle.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Repository store file not found: {pkl_file}")
        except Exception as e:
            raise RuntimeError(f"Failed to load repository store: {e}")
        
        self.files = data["files"]
        self.embeddings = data["embeddings"]
        
        if len(self.files) != self.embeddings.shape[0]:
            raise ValueError(
                f"Mismatch: {len(self.files)} files but {self.embeddings.shape[0]} embeddings"
            )
        
        print(f"Loaded {len(self.files)} files with embeddings of dimension {self.embeddings.shape[1]}")
        
        # Load the embedding model for query encoding
        print(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        # Build FAISS L2 index
        print("Building FAISS L2 index...")
        dimension = self.embeddings.shape[1]
        
        # Create FAISS index (L2 distance)
        self.index = faiss.IndexFlatL2(dimension)
        
        # Add embeddings to index
        self.index.add(self.embeddings.astype('float32'))
        
        print(f"FAISS index built with {self.index.ntotal} vectors")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, any]]:
        """
        Search for the most similar files to a query string.
        
        Args:
            query: Search query string
            top_k: Number of top results to return
            
        Returns:
            List of dictionaries with 'path', 'content', and 'distance' keys,
            sorted by distance (ascending, so lower is better)
        """
        if top_k <= 0:
            raise ValueError("top_k must be positive")
        
        if top_k > len(self.files):
            top_k = len(self.files)
        
        # Encode query using the same model
        query_embedding = self.model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=False
        ).astype('float32')
        
        # Reshape for FAISS (needs to be 2D: [1, dimension])
        query_embedding = query_embedding.reshape(1, -1)
        
        # Search in FAISS index
        distances, indices = self.index.search(query_embedding, top_k)
        
        # Build results
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.files):
                results.append({
                    "path": self.files[idx]["path"],
                    "content": self.files[idx]["content"],
                    "distance": float(distance)
                })
        
        return results
    
    def get_file_count(self) -> int:
        """
        Get the total number of files in the repository store.
        
        Returns:
            Number of files
        """
        return len(self.files)
    
    def search_by_keyword(self, keyword: str, top_k: int = 5) -> List[Dict[str, any]]:
        """
        Search for files by keyword in file path or content.
        
        Args:
            keyword: Keyword to search for (case-insensitive)
            top_k: Number of top results to return
            
        Returns:
            List of dictionaries with 'path', 'content', and 'score' keys,
            sorted by relevance (higher score = more matches)
        """
        if top_k <= 0:
            raise ValueError("top_k must be positive")
        
        keyword_lower = keyword.lower()
        results = []
        
        for i, file_dict in enumerate(self.files):
            path = file_dict.get("path", "")
            content = file_dict.get("content", "")
            
            # Calculate relevance score
            score = 0
            
            # Path matches (higher weight)
            if keyword_lower in path.lower():
                score += 10
                # Exact filename match gets bonus
                if path.lower().endswith(keyword_lower):
                    score += 5
            
            # Content matches
            content_lower = content.lower()
            matches = content_lower.count(keyword_lower)
            if matches > 0:
                score += min(matches, 5)  # Cap content matches at 5
            
            if score > 0:
                results.append({
                    "path": path,
                    "content": content,
                    "score": score,
                    "distance": None  # Not applicable for keyword search
                })
        
        # Sort by score (descending) and limit to top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
    
    def search_combined(self, query: str, keyword: str = None, top_k: int = 5, vector_weight: float = 0.7) -> List[Dict[str, any]]:
        """
        Combined vector and keyword search.
        
        Args:
            query: Semantic search query for vector search
            keyword: Optional keyword for keyword search
            top_k: Number of results to return
            vector_weight: Weight for vector search results (0-1), keyword weight is 1 - vector_weight
            
        Returns:
            Combined and ranked results
        """
        vector_results = self.search(query, top_k * 2)  # Get more for combination
        keyword_results = []
        
        if keyword:
            keyword_results = self.search_by_keyword(keyword, top_k * 2)
        
        # Normalize scores
        if vector_results:
            max_distance = max(r["distance"] for r in vector_results if r["distance"] is not None)
            if max_distance > 0:
                for r in vector_results:
                    if r["distance"] is not None:
                        r["normalized_score"] = 1 - (r["distance"] / max_distance)
                    else:
                        r["normalized_score"] = 0
        
        if keyword_results:
            max_score = max(r["score"] for r in keyword_results if r["score"] is not None)
            if max_score > 0:
                for r in keyword_results:
                    if r["score"] is not None:
                        r["normalized_score"] = r["score"] / max_score
                    else:
                        r["normalized_score"] = 0
        
        # Combine results
        combined = {}
        
        for r in vector_results:
            path = r["path"]
            if path not in combined:
                combined[path] = {
                    "path": path,
                    "content": r["content"],
                    "vector_score": r.get("normalized_score", 0),
                    "keyword_score": 0,
                    "combined_score": 0
                }
            else:
                combined[path]["vector_score"] = r.get("normalized_score", 0)
        
        for r in keyword_results:
            path = r["path"]
            if path not in combined:
                combined[path] = {
                    "path": path,
                    "content": r["content"],
                    "vector_score": 0,
                    "keyword_score": r.get("normalized_score", 0),
                    "combined_score": 0
                }
            else:
                combined[path]["keyword_score"] = r.get("normalized_score", 0)
        
        # Calculate combined scores
        for path, result in combined.items():
            result["combined_score"] = (
                vector_weight * result["vector_score"] +
                (1 - vector_weight) * result["keyword_score"]
            )
        
        # Sort by combined score and return top_k
        final_results = sorted(combined.values(), key=lambda x: x["combined_score"], reverse=True)
        return final_results[:top_k]
    
    def get_file_by_path(self, file_path: str) -> Dict[str, any] | None:
        """
        Get a file by its exact path.
        
        Args:
            file_path: Exact file path to search for
            
        Returns:
            File dictionary or None if not found
        """
        for file_dict in self.files:
            if file_dict.get("path") == file_path:
                return {
                    "path": file_dict["path"],
                    "content": file_dict["content"],
                    "distance": 0,
                    "score": 100
                }
        return None
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of the embeddings.
        
        Returns:
            Embedding dimension
        """
        return self.embeddings.shape[1]


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python search_repo.py <pkl_file> [query]")
        print("Example: python search_repo.py repo_store.pkl 'authentication function'")
        sys.exit(1)
    
    pkl_file = sys.argv[1]
    query = sys.argv[2] if len(sys.argv) > 2 else "authentication"
    
    # Initialize search engine
    engine = RepoSearchEngine(pkl_file)
    
    # Perform search
    print(f"\nSearching for: '{query}'")
    print("-" * 60)
    
    results = engine.search(query, top_k=5)
    
    for i, result in enumerate(results, 1):
        print(f"\n[{i}] {result['path']}")
        print(f"    Distance: {result['distance']:.4f}")
        print(f"    Content preview (first 200 chars):")
        print(f"    {result['content'][:200]}...")

