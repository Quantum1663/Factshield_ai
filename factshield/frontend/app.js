// Fetch trending propaganda on load
async function fetchTrending() {
    const feedContainer = document.querySelector('.feed-items');
    try {
        const response = await fetch('http://127.0.0.1:8000/trending');
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

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const claimInput = document.getElementById('claim-input');
    const claim = claimInput.value.trim();
    
    if (!claim) {
        alert("Please enter a claim to analyze.");
        return;
    }

    // Show loading state
    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerText;
    btn.innerText = "Analyzing Neural Pathways...";
    btn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: claim })
        });

        if (response.ok) {
            const data = await response.json();
            showResults(data);
        } else {
            alert("Error connecting to FactShield API.");
        }
    } catch (error) {
        console.error("API Error:", error);
        alert("Critical Failure: Could not reach the backend server.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

function showResults(data) {
    const overlay = document.getElementById('results-overlay');
    const veracityBadge = document.getElementById('veracity-badge');
    const claimText = document.getElementById('result-claim-text');
    const reasonText = document.getElementById('reason-text');
    const evidenceList = document.getElementById('evidence-list');

    // Setup basic info
    claimText.innerText = data.claim;
    reasonText.innerText = data.generated_reason;
    
    // Setup badge
    const v = data.veracity.prediction.toLowerCase();
    veracityBadge.innerText = v.toUpperCase();
    veracityBadge.className = 'badge'; // Reset classes
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

    // Show overlay
    overlay.classList.remove('hidden');
}

// Close button logic
document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('results-overlay').classList.add('hidden');
});

// Sidebar navigation logic (Simple visual feedback)
document.querySelectorAll('.nav-links li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelector('.nav-links li.active').classList.remove('active');
        li.classList.add('active');
    });
});
