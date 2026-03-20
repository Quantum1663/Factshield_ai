import base64
import logging
from models.reasoning import get_groq_client

logger = logging.getLogger(__name__)

def analyze_image_with_vlm(image_bytes: bytes) -> str:
    """
    Analyzes an image using a Vision-Language Model to extract text and describe context.
    Using Groq's Llama 3.2 Vision preview model.
    """
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
            model="llama-3.2-11b-vision-preview",
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
        logger.error(f"VLM Analysis Failed: {e}")
        return f"Failed to analyze image with VLM: {str(e)}"
