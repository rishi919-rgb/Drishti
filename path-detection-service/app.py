import os
import json
import random
from http.server import BaseHTTPRequestHandler, HTTPServer

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_POST(self):
        if self.path in ['/analyze_path', '/path']:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                self.rfile.read(content_length)
            
            # Dynamic mock generation to simulate active bounding box and depth tracking
            objects = ['chair', 'person', 'table', 'door', 'laptop', 'bottle', 'cup']
            positions = ['left', 'center', 'right']
            
            selected_objs = random.sample(objects, random.randint(1, 3))
            
            objects_info = []
            guidance_parts = []
            
            for obj in selected_objs:
                distance = round(random.uniform(0.5, 3.0), 1)
                pos = random.choice(positions)
                
                objects_info.append({
                    "class": obj,
                    "distance": distance,
                    "horizontal": pos,
                    "bbox": [random.randint(50, 400), random.randint(50, 300), 100, 100]
                })
                
            objects_info.sort(key=lambda x: x["distance"])
            
            for obj in objects_info:
                guidance_parts.append(f"{obj['class']} {obj['distance']} meters ahead, {obj['horizontal']}")
                
            guidance = "No obstacles detected. Path seems clear." if not guidance_parts else "; ".join(guidance_parts)
            
            response = {
                "objects": objects_info,
                "guidance": guidance,
                "walkable_mask": None
            }
            
            self._set_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self._set_headers(404)

def run(port=5003):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f'Starting Dynamic Mock Python Web Server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5003))
    run(port=port)
