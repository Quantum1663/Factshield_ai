import os
from faster_whisper import WhisperModel

# Shared model instances
whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        whisper_model = WhisperModel("base", device=device, compute_type=compute_type)
    return whisper_model
