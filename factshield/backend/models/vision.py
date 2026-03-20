import base64
import logging
import os
from models.reasoning import get_groq_client

logger = logging.getLogger(__name__)

DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def analyze_image_with_vlm(image_bytes: bytes) -> str:
    """
    Analyzes an image using a Vision-Language Model to extract text and describe context.
    Uses Groq's current vision-capable model.
    """
    model_name = os.environ.get("GROQ_VISION_MODEL", DEFAULT_VISION_MODEL)
    try:
        client = get_groq_client()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = """
        Analyze this image carefully. Provide:
        1. ANY and ALL visible text in the image (as if performing OCR).
        2. A detailed description of the visual context, subjects, and setting.
        3. Note any obvious signs of digital manipulation, AI generation, or missing context if it appears to be a meme or cropped image.
        Format your response clearly.
        """
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                            }
                        }
                    ]
                }
            ],
            temperature=0.1,
            max_tokens=500
        )
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error("VLM Analysis Failed with model %s: %s", model_name, e)
        return f"Failed to analyze image with VLM: {str(e)}"
