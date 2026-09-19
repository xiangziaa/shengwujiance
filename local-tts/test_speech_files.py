import io
import tempfile
import unittest
import wave
import json
import hashlib
import threading
import urllib.request
from pathlib import Path
from unittest.mock import patch
import speech_files

class SpeechFilesTest(unittest.TestCase):
    def test_qwen_pace_cache_migration(self):
        from qwen_style import instruction, INSTRUCTION
        self.assertEqual(instruction(1), INSTRUCTION)
        self.assertNotIn('语速适中', instruction(.85))
        self.assertNotIn('语速适中', instruction(1.15))
        for rate in [.8, 1, 1.2]:
            old_key = json.dumps([1, '测试', 'qwen:vivian', float(rate)], ensure_ascii=False)
            old_name = hashlib.sha256(old_key.encode()).hexdigest() + '.wav'
            new_name = speech_files.path_for('测试', 'qwen:vivian', rate).name
            self.assertEqual(new_name == old_name, rate == 1)
        self.assertEqual(speech_files.path_for('测试', 'qwen:vivian', 1.1), speech_files.path_for('测试', 'qwen:vivian', 1.5))
        self.assertNotEqual(speech_files.path_for('测试', 'qwen:vivian', .85), speech_files.path_for('测试', 'qwen:vivian', 1.15))

    def test_http_cached_playback_without_gpu_and_while_busy(self):
        import server
        output = io.BytesIO()
        with wave.open(output, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(b'\0\0' * 240)
        audio = output.getvalue()
        with tempfile.TemporaryDirectory() as directory, patch.object(speech_files, 'ROOT', Path(directory)), patch.object(server.engines, 'qwen_ready', return_value=False), patch.object(server.engines, 'synthesize', side_effect=AssertionError('Must not synthesize cached audio')):
            speech_files.write('AI 检测', 'qwen:vivian', 1, audio)
            http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            thread = threading.Thread(target=http.serve_forever, daemon=True)
            thread.start()
            server.LOCK.acquire()
            try:
                for endpoint in ['tts', 'prepare']:
                    request = urllib.request.Request(f'http://127.0.0.1:{http.server_port}/{endpoint}', data=json.dumps({'text': 'AI 检测', 'rate': 1}).encode(), headers={'Content-Type': 'application/json'})
                    with urllib.request.urlopen(request, timeout=2) as response:
                        result = response.read()
                    if endpoint == 'tts':
                        self.assertEqual(result, audio)
                    else:
                        self.assertTrue(json.loads(result)['reused'])
            finally:
                server.LOCK.release()
                http.shutdown()
                http.server_close()
                thread.join()

    def test_reuse_identity_and_incomplete_files(self):
        output = io.BytesIO()
        with wave.open(output, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(b'\0\0' * 240)
        audio = output.getvalue()
        with tempfile.TemporaryDirectory() as directory, patch.object(speech_files, 'ROOT', Path(directory)):
            path = speech_files.write(' AI 检测 ', 'qwen:vivian', 1, audio)
            self.assertEqual(speech_files.read('人工智能 检测', 'qwen:vivian', 1.0), audio)
            for text, voice, rate in [('其他内容', 'qwen:vivian', 1), ('AI 检测', 'qwen:serena', 1), ('AI 检测', 'qwen:vivian', 1.1)]:
                self.assertIsNone(speech_files.read(text, voice, rate))
            path.write_bytes(audio[:50])
            self.assertIsNone(speech_files.read('AI 检测', 'qwen:vivian', 1))
            speech_files.write('AI 检测', 'qwen:vivian', 1, audio)
            self.assertEqual(speech_files.read('AI 检测', 'qwen:vivian', 1), audio)
            self.assertFalse(list(Path(directory).rglob('*.tmp')))

if __name__ == '__main__':
    unittest.main()
