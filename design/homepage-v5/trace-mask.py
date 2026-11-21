"""Trace exterior background alpha only; never write or retouch a photograph.

Optional design-time requirements: Pillow, NumPy, OpenCV.
"""
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

source = (
    Path(__file__).resolve().parents[2]
    / "public/assets/dominique/originals/02_portrait_chemise_bleue.jpg"
)
pixels = np.array(Image.open(source).convert("RGB"))
assert pixels.shape == (447, 447, 3), "Review the mask if the source image changes."

minimum = pixels.min(axis=2).astype(int)
maximum = pixels.max(axis=2).astype(int)
candidate = (minimum > 210) & ((maximum - minimum) < 20)
height, width = candidate.shape
background = np.zeros((height, width), bool)
# Do not seed the bottom: the real shirt extends beyond the original frame.
queue = deque(
    [(x, y) for y in range(height) for x in (0, width - 1)]
    + [(x, 0) for x in range(width)]
)
while queue:
    x, y = queue.popleft()
    if not (0 <= x < width and 0 <= y < height):
        continue
    if background[y, x] or not candidate[y, x]:
        continue
    background[y, x] = True
    queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

contours, _ = cv2.findContours(
    (~background).astype("uint8"), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
)
contour = cv2.approxPolyDP(max(contours, key=cv2.contourArea), 0.4, True)
points = contour.reshape(-1, 2)
path = "M " + " L ".join(f"{x} {y}" for x, y in points) + " Z"
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="447" height="447" viewBox="0 0 447 447">
<title>Exterior background mask for the original blue-shirt photograph</title>
<!-- Traced from connected light neutral background pixels in the original.
     Interior photographic pixels are retained. No facial generation or retouching. -->
<defs><filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="erode" radius="1.1" result="clean-edge"/><feGaussianBlur in="clean-edge" stdDeviation="0.25"/></filter></defs>
<path fill="white" filter="url(#edge)" d="{path}"/>
</svg>'''
source.parent.parent.joinpath("masks/02-portrait-silhouette.svg").write_text(svg)
print(f"Wrote SVG alpha contour: {len(points)} points. Original remains untouched.")
