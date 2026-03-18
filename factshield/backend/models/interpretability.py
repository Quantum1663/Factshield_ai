import torch
import numpy as np
from captum.attr import LayerIntegratedGradients
from models.classifier import model, tokenizer, CLASSES, VERACITY_INDICES

def explain_prediction(text):
    """
    Mechanistic Interpretability for XLm-Roberta.
    Calculates feature attribution (Integrated Gradients) for the predicted veracity class.
    Maps subword attributions back to whole words.
    """
    model.eval()
    
    # 1. Tokenize and get predicted class
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
    input_ids = inputs['input_ids']
    attention_mask = inputs['attention_mask']
    
    with torch.no_grad():
        outputs = model(input_ids, attention_mask=attention_mask)
        probs = torch.sigmoid(outputs.logits)[0]
        # Focus on Veracity predicted class
        v_probs = probs[VERACITY_INDICES]
        predicted_class_idx = VERACITY_INDICES[torch.argmax(v_probs).item()]

    # 2. Define forward function for Captum
    # Captum needs a function that takes only the tensors to attribute
    def forward_func(inputs, attention_mask=None):
        logits = model(inputs, attention_mask=attention_mask).logits
        return torch.sigmoid(logits)[:, predicted_class_idx]

    # 3. Setup Layer Integrated Gradients
    # For XLm-Roberta, we attribute to the word embeddings
    lig = LayerIntegratedGradients(forward_func, model.roberta.embeddings)

    # 4. Construct baseline (usually all padding tokens)
    baseline_ids = input_ids.clone().fill_(tokenizer.pad_token_id)
    
    # 5. Calculate attributions
    # n_steps=50 is a good balance between accuracy and speed
    attributions, delta = lig.attribute(
        inputs=input_ids,
        baselines=baseline_ids,
        additional_forward_args=(attention_mask,),
        return_convergence_delta=True,
        internal_batch_size=1
    )

    # 6. Process attributions
    # Sum across the embedding dimension and remove batch/channel dims
    attributions = attributions.sum(dim=-1).squeeze(0).detach().cpu().numpy()
    
    # 7. Map subwords back to words
    tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
    
    word_attributions = []
    current_word = None
    current_score = 0.0
    
    for token, score in zip(tokens, attributions):
        # Skip special tokens
        if token in [tokenizer.cls_token, tokenizer.sep_token, tokenizer.pad_token]:
            continue
            
        # XLm-Roberta/SentencePiece: ' ' indicates the start of a new word
        if token.startswith(' '):
            # Save previous word if exists
            if current_word is not None:
                word_attributions.append({
                    "word": current_word.replace(' ', ''),
                    "attribution_score": float(current_score)
                })
            # Start new word
            current_word = token
            current_score = score
        else:
            # Continuation of current word
            if current_word is None: # Should not happen with valid tokenization
                current_word = token
                current_score = score
            else:
                current_word += token
                current_score += score
                
    # Add the last word
    if current_word is not None:
        word_attributions.append({
            "word": current_word.replace(' ', ''),
            "attribution_score": float(current_score)
        })
        
    return word_attributions

if __name__ == "__main__":
    # Test if captum is available and functionality
    try:
        sample_text = "The government is hiding information about aliens."
        explanation = explain_prediction(sample_text)
        print(f"Explanation for: {sample_text}")
        for item in explanation:
            print(f"{item['word']}: {item['attribution_score']:.4f}")
    except ImportError:
        print("Captum library not found. Please install it with 'pip install captum'")
    except Exception as e:
        print(f"Error during explanation: {e}")
