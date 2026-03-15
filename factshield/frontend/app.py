import streamlit as st
import requests
import time

# --- CONFIGURATION ---
API_URL = "http://127.0.0.1:8000/verify"

st.set_page_config(
    page_title="SAMI | Social Integrity System",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CUSTOM CSS ---
st.markdown("""
    <style>
    .main {background-color: #0e1117;}
    .metric-card {
        background-color: #1e212b;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .badge-real {background-color: #198754; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    .badge-fake {background-color: #dc3545; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    .badge-misleading {background-color: #ffc107; color: black; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    .badge-hate {background-color: #6f42c1; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    .badge-safe {background-color: #0dcaf0; color: black; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    .badge-unknown {background-color: #6c757d; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;}
    </style>
""", unsafe_allow_html=True)

# --- SESSION STATE (HISTORY) ---
if "history" not in st.session_state:
    st.session_state.history = []


def get_badge_html(label, category):
    label = label.lower()
    if label == "real": return f'<span class="badge-real">✓ REAL</span>'
    if label == "fake": return f'<span class="badge-fake">✕ FAKE</span>'
    if label == "misleading": return f'<span class="badge-misleading">⚠ MISLEADING</span>'
    if label == "hate": return f'<span class="badge-hate">☠ HATE SPEECH</span>'
    if label == "safe": return f'<span class="badge-safe">♥ SAFE</span>'
    return f'<span class="badge-unknown">? UNKNOWN</span>'


# --- SIDEBAR ---
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2092/2092663.png", width=80)
    st.title("SAMI System")
    st.caption("v2.0 - Live RAG + Multi-Label Classification")

    st.divider()
    st.subheader("Session History")
    if not st.session_state.history:
        st.info("No queries yet.")
    else:
        for i, item in enumerate(reversed(st.session_state.history)):
            st.text(f"🔍 {item[:30]}...")

# --- MAIN UI ---
st.title("🛡️ FactShield AI Analysis")
st.markdown(
    "Enter a social media claim below. SAMI will cross-reference the live web, classify the content, and explain its reasoning.")

# Input Form
with st.form("analysis_form"):
    user_input = st.text_area("Social Media Claim / Post:", height=120,
                              placeholder="Paste a controversial post, claim, or news headline here...")
    submitted = st.form_submit_button("Analyze Content", type="primary", use_container_width=True)

if submitted and user_input:
    with st.spinner("🧠 Scanning neural pathways, checking vector databases, and scraping live web..."):
        try:
            # Add artificial delay just for a cool "processing" feel during presentations
            time.sleep(1)

            # Call the backend API
            response = requests.post(API_URL, json={"text": user_input})

            if response.status_code == 200:
                data = response.json()
                st.session_state.history.append(user_input)

                st.divider()
                st.subheader("Analysis Results")

                # Metrics Columns
                col1, col2 = st.columns(2)

                v_label = data['veracity']['prediction']
                v_conf = data['veracity']['confidence']
                t_label = data['toxicity']['prediction']
                t_conf = data['toxicity']['confidence']

                with col1:
                    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                    st.markdown("### Veracity Engine")
                    st.markdown(get_badge_html(v_label, "veracity"), unsafe_allow_html=True)
                    st.markdown("<br>", unsafe_allow_html=True)
                    st.progress(v_conf, text=f"Confidence: {v_conf * 100:.1f}%")
                    st.markdown('</div>', unsafe_allow_html=True)

                with col2:
                    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                    st.markdown("### Toxicity Engine")
                    st.markdown(get_badge_html(t_label, "toxicity"), unsafe_allow_html=True)
                    st.markdown("<br>", unsafe_allow_html=True)
                    st.progress(t_conf, text=f"Confidence: {t_conf * 100:.1f}%")
                    st.markdown('</div>', unsafe_allow_html=True)

                st.markdown("<br>", unsafe_allow_html=True)

                # AI Reasoning Engine
                st.markdown("### 🤖 Dynamic AI Reasoning")
                if v_label in ["fake", "misleading"] or t_label == "hate":
                    st.error(data['generated_reason'], icon="🚨")
                else:
                    st.success(data['generated_reason'], icon="✅")

                # Evidence Dropdown
                with st.expander("📚 View Retrieved FAISS Evidence"):
                    if data['evidence']:
                        for i, ev in enumerate(data['evidence']):
                            st.info(f"**Source {i + 1}:** {ev}")
                    else:
                        st.warning(
                            "No highly relevant live evidence was found in the database for this specific wording.")

            else:
                st.error(f"Backend Error: {response.status_code}. Make sure your FastAPI server is running!")

        except requests.exceptions.ConnectionError:
            st.error(
                "🚨 Critical Failure: Could not connect to the backend API. Please ensure you ran `uvicorn app:app --reload` in your terminal.")