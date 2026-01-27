
import os
import httpx
import numpy as np
import cv2
from PIL import Image
from pathlib import Path

# Config
API_URL = "http://localhost:8000/images/upload"
FIXTURES_DIR = Path("tests/fixtures")

def create_fixtures_dir():
    if not FIXTURES_DIR.exists():
        FIXTURES_DIR.mkdir(parents=True)
        print(f"Created directory: {FIXTURES_DIR}")

def create_test_images():
    print("Generating test images...")
    
    # 1. Landscape (No Rotation) structure
    img_landscape = np.zeros((400, 600, 3), dtype=np.uint8)
    # Add some pattern
    cv2.rectangle(img_landscape, (50, 50), (200, 200), (255, 0, 0), -1) # Blue box top-left
    cv2.putText(img_landscape, "Landscape", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 2)
    cv2.imwrite(str(FIXTURES_DIR / "landscape.png"), img_landscape)
    
    # 2. Portrait (Rotated via EXIF)
    # Create an image that LOOKS landscape in data (600x400) but has EXIF to rotate 90 deg CW -> Portrait
    img_portrait_raw = np.zeros((400, 600, 3), dtype=np.uint8)
    cv2.rectangle(img_portrait_raw, (50, 50), (550, 100), (0, 255, 0), -1) # Green bar "top" (left if rotated)
    # Add text that will be vertical if rotated correctly
    cv2.putText(img_portrait_raw, "Portrait if Rotated", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    # Save as JPG with EXIF
    pil_img = Image.fromarray(cv2.cvtColor(img_portrait_raw, cv2.COLOR_BGR2RGB))
    
    # EXIF tag 0x0112 is Orientation. Value 6 is "Rotate 90 CW".
    # Value 8 is "Rotate 270 CW" (90 CCW).
    # Let's use 6.
    exif = pil_img.getexif()
    exif[0x0112] = 6
    pil_img.save(str(FIXTURES_DIR / "portrait_exif.jpg"), exif=exif)

    # 3. Noise A (for comparison)
    img_a = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
    cv2.imwrite(str(FIXTURES_DIR / "noise_a.png"), img_a)

    # 4. Noise B (Blurred A)
    img_b = cv2.GaussianBlur(img_a, (15, 15), 0)
    cv2.imwrite(str(FIXTURES_DIR / "noise_b.png"), img_b)
    
    print("Test images generated.")

def upload_images():
    print("Uploading images to backend...")
    for file_path in FIXTURES_DIR.glob("*"):
        if file_path.name.startswith("."): continue
        
        with open(file_path, "rb") as f:
            files = {"file": f}
            try:
                response = httpx.post(API_URL, files=files)
                if response.status_code == 200:
                    data = response.json()
                    print(f"Uploaded {file_path.name}: ID={data['id']}")
                else:
                    print(f"Failed to upload {file_path.name}: {response.text}")
            except Exception as e:
                print(f"Error uploading {file_path.name}: {e}")

if __name__ == "__main__":
    create_fixtures_dir()
    create_test_images()
    upload_images()
