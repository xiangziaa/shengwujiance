"""Real model + HTTP integration; outbound network forbidden during model loading/inference."""
import hashlib
import http.client
import json
import socket
import threading
import unittest
import wave
from unittest.mock import patch
import server
from download_model import MODEL_SHA256

class OfflineAsrTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert hashlib.sha256((server.ROOT / 'model_int8.onnx').read_bytes()).hexdigest() == MODEL_SHA256
        with patch.object(socket, 'create_connection', side_effect=AssertionError('Outbound network forbidden')):
            server.recognizer = server.load_model()
            with wave.open(str(server.ROOT / 'test.wav')) as source:
                cls.pcm = source.readframes(source.getnframes())
            cls.transcript = server.transcribe(cls.pcm)
        cls.httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def request(self, method, path, body=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.httpd.server_port, timeout=10)
        connection.request(method, path, body, {'Content-Type': 'application/octet-stream'})
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_real_recognition(self):
        status, result = self.request('POST', '/recognize', self.pcm)
        self.assertEqual(status, 200)
        self.assertEqual(result['text'], self.transcript)
        self.assertIn('研究', result['text'])
        print(json.dumps(result, ensure_ascii=True))

    def test_health_and_validation(self):
        self.assertTrue(self.request('GET', '/health')[1]['offline'])
        self.assertEqual(self.request('POST', '/recognize', b'bad')[0], 400)
        self.assertEqual(self.request('GET', '/missing')[0], 404)
        with server.LOCK:
            self.assertEqual(self.request('POST', '/recognize', self.pcm)[0], 503)

if __name__ == '__main__':
    unittest.main()
