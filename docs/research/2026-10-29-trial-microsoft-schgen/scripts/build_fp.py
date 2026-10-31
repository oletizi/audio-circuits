"""Generate the other data file SchGen needs but does not ship:
export/organized_fp.json, read by get_fp() at the end of init_project.py.

Uses SchGen's own gather_footprints_by_lib() / save_organized_fp().
"""

import os
import sys

PROJECT_PATH = os.environ["PROJECT_PATH"]
sys.path.append(PROJECT_PATH)

from config import KICAD_FOOTPRINT_LIB_PATH  # noqa: E402
from modules.utils.kicad_scan_lib import gather_footprints_by_lib, save_organized_fp  # noqa: E402

print("footprint lib path:", KICAD_FOOTPRINT_LIB_PATH)
fp = gather_footprints_by_lib(KICAD_FOOTPRINT_LIB_PATH)
print("libraries scanned:", len(fp))
os.makedirs(os.path.join(PROJECT_PATH, "export"), exist_ok=True)
save_organized_fp(fp, os.path.join(PROJECT_PATH, "export"))
print("wrote export/organized_fp.json")
