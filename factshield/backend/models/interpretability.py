import torch
import numpy as np
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


def _compute_token_scores(input_ids, attention_mask, token_type_ids, target_class_idx):
    with torch.no_grad():
        base_logits = model(
            input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        ).logits[0]
        base_score = float(base_logits[target_class_idx].item())

    scores = []
    sequence_length = input_ids.shape[1]
    mask_token_id = tokenizer.mask_token_id or tokenizer.unk_token_id or tokenizer.pad_token_id
    special_ids = {token_id for token_id in [
        tokenizer.cls_token_id,
        tokenizer.sep_token_id,
        tokenizer.pad_token_id,
    ] if token_id is not None}

    for token_position in range(sequence_length):
        token_id = int(input_ids[0, token_position].item())
        if token_id in special_ids:
            scores.append(0.0)
            continue

        perturbed_ids = input_ids.clone()
        perturbed_ids[0, token_position] = mask_token_id

        with torch.no_grad():
            perturbed_logits = model(
                perturbed_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids,
            ).logits[0]
            perturbed_score = float(perturbed_logits[target_class_idx].item())

        token_score = base_score - perturbed_score
        if np.isnan(token_score) or np.isinf(token_score):
            token_score = 0.0
        scores.append(token_score)

    return scores


def explain_prediction(text, target_label=None):
    """
    Mechanistic Interpretability for Deberta/XLm-Roberta.
    Uses token occlusion for stable signed token attribution.
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

    # 3. Score token importance by how much masking the token changes the target logit
    attributions = _compute_token_scores(input_ids, attention_mask, token_type_ids, target_class_idx)
    
    # 4. Map subword attributions back to words
    tokens = tokenizer.convert_ids_to_tokens(input_ids[0])
    
    word_attributions = []
    current_word = None
    current_score = 0.0
    force_new_word = False
    
    for token, score in zip(tokens, attributions):
        # Clean score
        clean_score = float(score)
        if np.isnan(clean_score) or np.isinf(clean_score):
            clean_score = 0.0

        if token in [tokenizer.cls_token, tokenizer.sep_token, tokenizer.pad_token, '<s>', '</s>', '<pad>']:
            continue

        if token in {"▁", "Ġ"}:
            if current_word is not None:
                final_word = current_word.strip()
                if final_word:
                    word_attributions.append({
                        "word": final_word,
                        "attribution_score": float(current_score)
                    })
            current_word = None
            current_score = 0.0
            force_new_word = True
            continue

        clean_token = _clean_token(token)
        if not clean_token:
            continue

        if force_new_word or _token_starts_new_word(token):
            if current_word is not None:
                final_word = current_word.strip()
                if final_word:
                    word_attributions.append({
                        "word": final_word,
                        "attribution_score": float(current_score)
                    })
            current_word = clean_token
            current_score = clean_score
            force_new_word = False
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
