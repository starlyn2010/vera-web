import sys
import os

# Add the project root and server_py to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, "server_py"))

from server_py.main import app
