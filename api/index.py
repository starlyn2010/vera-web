import sys
import os

# Get the directory of this file (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Get the root directory
root_dir = os.path.dirname(current_dir)
# Path to the python server code
server_py_dir = os.path.join(root_dir, "server_py")

# IMPORTANT: Insert server_py_dir at the BEGINNING of sys.path to avoid collisions
# with other directories in root (like 'database/')
if server_py_dir not in sys.path:
    sys.path.insert(0, server_py_dir)

# Also add root_dir to path so 'from server_py.main import app' works if needed,
# though 'from main import app' is preferred if server_py is in path.
if root_dir not in sys.path:
    sys.path.append(root_dir)

# Now we can import the app
try:
    # Try importing from main directly since server_py is in sys.path[0]
    from main import app
except ImportError as e:
    print(f"Direct import failed: {e}")
    # Fallback to absolute import if needed
    try:
        from server_py.main import app
    except ImportError as e2:
        print(f"Absolute import failed: {e2}")
        raise

# Vercel needs 'app' to be available in this module
# We also set 'handler' just in case
handler = app
