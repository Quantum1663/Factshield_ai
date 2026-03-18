import torch
import numpy as np
from captum.attr import InputXGradient
from models.classifier import model, tokenizer, CLASSES, VERACITY_INDICES

VERACITY_LABEL_TO_INDEX = {
    CLASSES[idx].replace("veracity_", ""): idx for idx in VERACITY_INDICES
}


def _resolve_target_class_index(logits, target_label=None):
    if target_label:
        normalized_label = str(target_label).strip().lower()
        mapped_index = VERACITY_LABEL_TO_INDEX.get(normalized_label)
        if mapped_index is not None:
            return mapped_index

    v_logits = logits[VERACITY_INDICES]
    return VERACITY_INDICES[torch.argmax(v_logits).item()]


def _clean_token(token):
    if token.startswith("##"):
        return token[2:]
    if token.startswith("▁") or token.startswith("Ġ"):
        return token[1:]
    return token


def _token_starts_new_word(token):
    return token.startswith("▁") or token.startswith("Ġ")


def explain_prediction(text, target_label=None):
    """
    Mechanistic Interpretability for Deberta/XLm-Roberta.
    Uses InputXGradient for signed token attribution.
    Maps subword attributions back to whole words.
    """
    print(f"DEBUG: Starting XAI Calculation for: {text[:50]}...")
    model.eval()
    
    # 1. Tokenize
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
    input_ids = inputs['input_ids']
    attention_mask = inputs['attention_mask']
    token_type_ids = inputs.get('token_type_ids')
    
    # 2. Get Predicted Class
    with torch.no_grad():
        outputs = model(input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids)
        logits = outputs.logits[0]
        target_class_idx = _resolve_target_class_index(logits, target_label=target_label)
    
    print(f"DEBUG: Attributing for class index {target_class_idx} (Logits Mode)")

    # 3. Define a wrapper for attribution
    def model_forward_with_embeddings(embeddings, attention_mask, token_type_ids):
        logits = model(inputs_embeds=embeddings, 
                      attention_mask=attention_mask, 
                      token_type_ids=token_type_ids).logits
        return logits[:, target_class_idx]

    # Get initial embeddings
    if hasattr(model, 'roberta'):
        embeddings_layer = model.roberta.embeddings
    elif hasattr(model, 'deberta'):
        embeddings_layer = model.deberta.embeddings
    else:
        embeddings_layer = list(model.children())[0].embeddings

    with torch.no_grad():
        input_embeddings = embeddings_layer(input_ids, token_type_ids=token_type_ids)

    # 4. Use signed attribution so the frontend can distinguish supportive vs opposing words
    saliency = InputXGradient(model_forward_with_embeddings)
    input_embeddings.requires_grad = True
    
    attributions = saliency.attribute(
        inputs=input_embeddings,
        additional_forward_args=(attention_mask, token_type_ids)
    )

    # 5. Process attributions while preserving direction
    attributions = attributions.sum(dim=-1).squeeze(0).detach().cpu().numpy()
    
    # 6. Map subword attributions back to words
    tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
    
    word_attributions = []
    current_word = None
    current_score = 0.0
    
    for token, score in zip(tokens, attributions):
        # Clean score
        clean_score = float(score)
        if np.isnan(clean_score) or np.isinf(clean_score):
            clean_score = 0.0

        if token in [tokenizer.cls_token, tokenizer.sep_token, tokenizer.pad_token, '<s>', '</s>', '<pad>']:
            continue

        clean_token = _clean_token(token)
        if not clean_token:
            continue

        if _token_starts_new_word(token):
            if current_word is not None:
                final_word = current_word.strip()
                if final_word:
                    word_attributions.append({
                        "word": final_word,
                        "attribution_score": float(current_score)
                    })
            current_word = clean_token
            current_score = clean_score
        else:
            if current_word is None:
                current_word = clean_token
                current_score = clean_score
            elif token.startswith("##"):
                current_word += clean_token
                current_score += clean_score
            else:
                current_word += clean_token
                current_score += clean_score
                
    if current_word is not None:
        final_word = current_word.strip()
        if final_word:
            word_attributions.append({
                "word": final_word,
                "attribution_score": float(current_score)
            })
        
    print(f"DEBUG: XAI Complete. Results: {len(word_attributions)} words.")
    return word_attributions
