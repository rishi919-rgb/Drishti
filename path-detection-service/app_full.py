import sys
print("Using Python:", sys.executable)
import os
import io
import base64
import json
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load Models
print("Loading YOLOv8n...")
yolo_model = YOLO('yolov8n.pt')

print("Loading MiDaS small...")
midas_model_type = "MiDaS_small"
midas = torch.hub.load("intel-isl/MiDaS", midas_model_type)
device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
midas.to(device)
midas.eval()

midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
transform = midas_transforms.small_transform

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/path', methods=['POST'])
def analyze_path():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image provided"}), 400
            
        base64_img = data['image']
        # Strip header if present
        if ',' in base64_img:
            base64_img = base64_img.split(',')[1]
            
        img_bytes = base64.b64decode(base64_img)
        img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Invalid base64 image data"}), 400
            
        H, W = img.shape[:2]
        
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # H, W = img_rgb.shape[:2] # Already obtained from img, img_rgb will have same H, W

        # 1. Run YOLOv8
        results = yolo_model(img_rgb, verbose=False)
        boxes_data = []
        
        if len(results) > 0:
            for box in results[0].boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cls_id = int(box.cls[0].item())
                conf = box.conf[0].item()
                class_name = yolo_model.names[cls_id]
                boxes_data.append({
                    "class": class_name,
                    "bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
                    "conf": conf
                })

        # 2. Run MiDaS
        input_batch = transform(img_rgb).to(device)
        with torch.no_grad():
            prediction = midas(input_batch)
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=img_rgb.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()

        depth_map = prediction.cpu().numpy()
        
        # Min-max normalize depth map for approximate relative distances
        d_min = np.min(depth_map)
        d_max = np.max(depth_map)
        if d_max - d_min > 0:
            depth_map_norm = (depth_map - d_min) / (d_max - d_min)
        else:
            depth_map_norm = depth_map

        objects_info = []
        guidance_parts = []
        
        for obj in boxes_data:
            x, y, w, h = obj['bbox']
            cy = y + h // 2
            cx = x + w // 2
            
            # Ensure coordinates are within bounds
            cy = max(0, min(cy, H - 1))
            cx = max(0, min(cx, W - 1))

            # Original median calculation (commented out as per user's diff)
            # y1, y2 = max(0, y), min(H, y + h)
            # x1, x2 = max(0, x), min(W, x + w)
            # if y2 > y1 and x2 > x1:
            #     obj_depth = np.median(depth_map_norm[y1:y2, x1:x2])
            # else:
            #     obj_depth = 0.5
                
            y1, y2 = max(0, y), min(H - 1, y + h)
            x1, x2 = max(0, x), min(W - 1, x + w)
            if y2 > y1 and x2 > x1:
                obj_depth = float(np.median(depth_map_norm[y1:y2, x1:x2]))
            else:
                obj_depth = float(depth_map_norm[cy, cx])
                
            pseudo_distance = 1.0 - obj_depth
            rough_meters = float(round((pseudo_distance * 4.5) + 0.5, 1))

            if rough_meters > 3.0:
                continue
            
            if cx < W / 3:
                pos = "left"
            elif cx > 2 * W / 3:
                pos = "right"
            else:
                pos = "center"
                
            obj["distance"] = rough_meters
            obj["horizontal"] = pos
            objects_info.append(obj)
            
        objects_info.sort(key=lambda x: x["distance"])
        
        for obj in objects_info[:3]:
            guidance_parts.append(f"{obj['class']} {obj['distance']} meters ahead, {obj['horizontal']}")
            
        guidance = "No obstacles detected. Path seems clear." if not guidance_parts else "; ".join(guidance_parts)
        
        return jsonify({
            "objects": objects_info,
            "guidance": guidance,
            "walkable_mask": None
        })

    except Exception as e:
        import traceback
        print("EXCEPTION RAISED:")
        traceback.print_exc()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5003))
    app.run(host='0.0.0.0', port=port)
