// Fetch trending propaganda on load
const API_BASE = 'http://127.0.0.1:8000';

async function fetchTrending() {
    const feedContainer = document.querySelector('.feed-items');
    if (!feedContainer) return;

    try {
        const response = await fetch(`${API_BASE}/trending`);
        if (response.ok) {
            const trends = await response.json();
            feedContainer.innerHTML = '';
            trends.forEach(trend => {
                const item = document.createElement('div');
                item.className = 'feed-item';
                item.innerHTML = `
                    <span class="tag tag-${trend.tag.toLowerCase()}">${trend.tag}</span>
                    <p><strong>${trend.title}:</strong> ${trend.description}</p>
                `;
                feedContainer.appendChild(item);
            });
        }
    } catch (error) {
        console.error("Trending fetch error:", error);
    }
}

window.onload = fetchTrending;

function pollTaskStatus(taskId) {
    const btn = document.getElementById('analyze-btn');
    const originalText = "Run Sami Logic";

    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/task-status/${taskId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(intervalId);
                showResults(data.result);
                btn.innerText = originalText;
                btn.disabled = false;
            } else if (data.status === 'failed') {
                clearInterval(intervalId);
                alert("Analysis failed: " + (data.error || "Unknown Error"));
                btn.innerText = originalText;
                btn.disabled = false;
            } else if (data.status === 'processing') {
                btn.innerText = "Analyzing Neural Pathways...";
            }
        } catch (error) {
            console.error("Polling error:", error);
            clearInterval(intervalId);
            alert("Critical Failure: Lost connection to the server during analysis.");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }, 2000);
}

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const claimInput = document.getElementById('claim-input');
    const claim = claimInput.value.trim();
    
    if (!claim) {
        alert("Please enter a claim to analyze.");
        return;
    }

    const btn = document.getElementById('analyze-btn');
    btn.innerText = "Initializing Pipeline...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: claim })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.task_id) {
                pollTaskStatus(data.task_id);
            } else {
                showResults(data);
                btn.innerText = "Run Sami Logic";
                btn.disabled = false;
            }
        } else {
            alert("Error connecting to FactShield API.");
            btn.innerText = "Run Sami Logic";
            btn.disabled = false;
        }
    } catch (error) {
        console.error("API Error:", error);
        alert("Critical Failure: Could not reach the backend server.");
        btn.innerText = "Run Sami Logic";
        btn.disabled = false;
    }
});

function showResults(data) {
    const overlay = document.getElementById('results-overlay');
    const veracityBadge = document.getElementById('veracity-badge');
    const claimText = document.getElementById('result-claim-text');
    const reasonText = document.getElementById('reason-text');
    const evidenceList = document.getElementById('evidence-list');
    const xaiContainer = document.getElementById('xai-container');

    claimText.innerText = data.claim;
    reasonText.innerText = data.generated_reason;
    
    // Veracity Badge
    const v = data.veracity.prediction.toLowerCase();
    veracityBadge.innerText = v.toUpperCase();
    veracityBadge.className = 'badge';
    if (v === 'real') veracityBadge.classList.add('badge-real');
    else if (v === 'fake' || v === 'misleading') veracityBadge.classList.add('badge-fake');
    else veracityBadge.classList.add('badge-unknown');

    // Evidence
    evidenceList.innerHTML = '';
    if (data.evidence && data.evidence.length > 0) {
        data.evidence.forEach(ev => {
            const li = document.createElement('li');
            li.innerText = ev;
            evidenceList.appendChild(li);
        });
    } else {
        evidenceList.innerHTML = '<li>No specific external evidence was found for this claim.</li>';
    }

    // Mechanistic Interpretability Heatmap (XAI)
    if (xaiContainer && data.xai_attributions) {
        xaiContainer.innerHTML = '';
        data.xai_attributions.forEach(item => {
            const score = item.attribution_score || item.score || 0;
            const opacity = Math.min(Math.abs(score) * 1.2, 0.9);
            const color = score > 0 ? `rgba(255, 50, 50, ${opacity})` : `rgba(50, 150, 255, ${opacity})`;
            
            const span = document.createElement('span');
            span.innerText = item.word;
            span.style.cssText = `background-color: ${color}; padding: 2px 4px; border-radius: 4px; margin-right: 2px; display: inline-block; color: ${opacity > 0.4 ? '#fff' : '#cbd5e1'}; font-size: 0.9em;`;
            span.title = `Attribution Score: ${score.toFixed(4)}`;
            xaiContainer.appendChild(span);
        });
    }

    overlay.classList.remove('hidden');
}

document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('results-overlay').classList.add('hidden');
});

document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelector('.nav-links li.active').classList.remove('active');
        li.classList.add('active');
    });
});
