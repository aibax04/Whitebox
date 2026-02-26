"""
Repository Embedding Module

This module provides functionality to:
- Clone GitHub repositories or load local directories
- Extract code/documentation files
- Generate embeddings using sentence-transformers
- Save embeddings to a pickle file
"""

import os
import pickle
import re
from pathlib import Path
from typing import List, Dict, Union
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import git
import tempfile
import shutil


# Allowed file extensions for code/documentation files
ALLOWED_EXTENSIONS = {
    '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.sql', '.json', '.md'
}


def is_binary_file(file_path: str) -> bool:
    """
    Check if a file is binary by attempting to read it as text.
    
    Args:
        file_path: Path to the file to check
        
    Returns:
        True if file appears to be binary, False otherwise
    """
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(8192)
            if b'\x00' in chunk:
                return True
            # Try to decode as UTF-8
            chunk.decode('utf-8', errors='strict')
            return False
    except (UnicodeDecodeError, PermissionError, OSError):
        return True


def clone_repo(repo_url: str, target_dir: str = None) -> str:
    """
    Clone a GitHub repository to a temporary or specified directory.
    
    Args:
        repo_url: GitHub repository URL (e.g., 'https://github.com/user/repo.git')
        target_dir: Optional target directory. If None, uses a temporary directory.
        
    Returns:
        Path to the cloned repository directory
    """
    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix='repo_clone_')
    else:
        # Check if directory already exists and has .git
        if os.path.exists(target_dir) and os.path.exists(os.path.join(target_dir, '.git')):
            print(f"Repository already exists at {target_dir}, skipping clone.")
            return target_dir
        os.makedirs(target_dir, exist_ok=True)
    
    try:
        print(f"Cloning repository from {repo_url} to {target_dir}...")
        git.Repo.clone_from(repo_url, target_dir, depth=1)
        print(f"Successfully cloned repository to {target_dir}")
        return target_dir
    except git.exc.GitCommandError as e:
        raise ValueError(f"Failed to clone repository: {e}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error during clone: {e}")


def load_repo_files(path: str) -> List[Dict[str, str]]:
    """
    Recursively load all code/documentation files from a directory.
    
    Args:
        path: Path to repository root or local directory
        
    Returns:
        List of dictionaries with 'path' and 'content' keys
    """
    files = []
    path_obj = Path(path)
    
    if not path_obj.exists():
        raise ValueError(f"Path does not exist: {path}")
    
    if not path_obj.is_dir():
        raise ValueError(f"Path is not a directory: {path}")
    
    # Get all files matching allowed extensions
    all_files = []
    for ext in ALLOWED_EXTENSIONS:
        all_files.extend(path_obj.rglob(f'*{ext}'))
    
    print(f"Found {len(all_files)} files with allowed extensions. Processing...")
    
    for file_path in tqdm(all_files, desc="Loading files"):
        # Skip binary files
        if is_binary_file(str(file_path)):
            continue
        
        # Skip common directories that shouldn't be processed
        if any(skip_dir in file_path.parts for skip_dir in ['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build']):
            continue
        
        try:
            # Read file content with UTF-8 encoding, fallback to errors='replace'
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            # Store relative path from the root
            relative_path = str(file_path.relative_to(path_obj))
            
            files.append({
                "path": relative_path,
                "content": content
            })
        except (PermissionError, OSError, UnicodeDecodeError) as e:
            print(f"Warning: Could not read file {file_path}: {e}")
            continue
    
    print(f"Successfully loaded {len(files)} files.")
    return files


def embed_files(files: List[Dict[str, str]], model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> np.ndarray:
    """
    Generate embeddings for a list of files using sentence-transformers.
    
    Args:
        files: List of dictionaries with 'path' and 'content' keys
        model_name: Name of the sentence-transformers model to use
        
    Returns:
        NumPy array of embeddings (shape: [num_files, embedding_dim])
    """
    if not files:
        raise ValueError("No files provided for embedding")
    
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    
    print(f"Generating embeddings for {len(files)} files...")
    contents = [file_dict["content"] for file_dict in files]
    
    # Generate embeddings with progress bar
    embeddings = model.encode(
        contents,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False
    )
    
    # Ensure float32 dtype
    embeddings = embeddings.astype(np.float32)
    
    print(f"Generated embeddings with shape: {embeddings.shape}")
    return embeddings


def save_embeddings(files: List[Dict[str, str]], embeddings: np.ndarray, out_file: str = "repo_store.pkl"):
    """
    Save files and embeddings to a pickle file.
    
    Args:
        files: List of dictionaries with 'path' and 'content' keys
        embeddings: NumPy array of embeddings
        out_file: Output pickle file path
    """
    if len(files) != embeddings.shape[0]:
        raise ValueError(f"Mismatch: {len(files)} files but {embeddings.shape[0]} embeddings")
    
    data = {
        "files": files,
        "embeddings": embeddings
    }
    
    print(f"Saving embeddings to {out_file}...")
    with open(out_file, 'wb') as f:
        pickle.dump(data, f)
    
    print(f"Successfully saved {len(files)} file embeddings to {out_file}")


def generate_repo_store(repo_url_or_path: str, out_file: str = "repo_store.pkl", cleanup: bool = True):
    """
    Main function to generate a repository store from a GitHub URL or local path.
    
    Args:
        repo_url_or_path: GitHub repository URL or local directory path
        out_file: Output pickle file path
        cleanup: If True and repo was cloned, remove the cloned directory after processing
    """
    temp_clone_dir = None
    
    try:
        # Determine if input is a URL or local path
        is_url = repo_url_or_path.startswith(('http://', 'https://', 'git@'))
        
        if is_url:
            # Clone repository
            temp_clone_dir = clone_repo(repo_url_or_path)
            repo_path = temp_clone_dir
        else:
            # Use local path
            repo_path = os.path.abspath(repo_url_or_path)
            if not os.path.exists(repo_path):
                raise ValueError(f"Local path does not exist: {repo_path}")
        
        # Load files
        files = load_repo_files(repo_path)
        
        if not files:
            raise ValueError("No files found to process. Check that the repository contains code/documentation files.")
        
        # Generate embeddings
        embeddings = embed_files(files)
        
        # Save embeddings
        save_embeddings(files, embeddings, out_file)
        
        print(f"\n✓ Successfully generated repository store: {out_file}")
        print(f"  - Files processed: {len(files)}")
        print(f"  - Embedding dimensions: {embeddings.shape[1]}")
        
    finally:
        # Cleanup temporary clone directory if needed
        if cleanup and temp_clone_dir and os.path.exists(temp_clone_dir):
            print(f"Cleaning up temporary directory: {temp_clone_dir}")
            shutil.rmtree(temp_clone_dir, ignore_errors=True)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python embed_repo.py <repo_url_or_path> [output_file]")
        print("Example: python embed_repo.py https://github.com/user/repo.git repo_store.pkl")
        print("Example: python embed_repo.py /path/to/local/repo repo_store.pkl")
        sys.exit(1)
    
    repo_input = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "repo_store.pkl"
    
    generate_repo_store(repo_input, output_file)

