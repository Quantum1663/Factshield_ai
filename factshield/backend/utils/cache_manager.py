import hashlib
import time
import logging
from collections import OrderedDict

logger = logging.getLogger(__name__)

class ResultCache:
    def __init__(self, max_size=100, ttl_seconds=600):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _key(self, text):
        return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()

    def get(self, text):
        k = self._key(text)
        if k in self._cache:
            entry = self._cache[k]
            if time.time() - entry["ts"] < self._ttl:
                self._cache.move_to_end(k)
                logger.info("Cache HIT for claim")
                return entry["data"]
            del self._cache[k]
        return None

    def put(self, text, data):
        k = self._key(text)
        self._cache[k] = {"data": data, "ts": time.time()}
        self._cache.move_to_end(k)
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

class RateLimiter:
    def __init__(self, max_requests=10, window_seconds=60):
        self._requests = {}
        self._max = max_requests
        self._window = window_seconds

    def is_allowed(self, client_ip):
        now = time.time()
        if client_ip not in self._requests:
            self._requests[client_ip] = []
        self._requests[client_ip] = [t for t in self._requests[client_ip] if now - t < self._window]
        if len(self._requests[client_ip]) >= self._max:
            return False
        self._requests[client_ip].append(now)
        return True

result_cache = ResultCache(max_size=100, ttl_seconds=600)
rate_limiter = RateLimiter(max_requests=15, window_seconds=60)
