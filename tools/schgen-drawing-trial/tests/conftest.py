"""Host-side tests for the attempt runner: put tools/schgen-drawing-trial on the import path."""

import sys
from pathlib import Path

TRIAL = Path(__file__).resolve().parents[1]
if str(TRIAL) not in sys.path:
    sys.path.insert(0, str(TRIAL))
