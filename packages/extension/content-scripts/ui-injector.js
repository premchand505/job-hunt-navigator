// This script is responsible for injecting and managing the "Quick Notes" modal.

function showNotesModal(jobId) {
    // Prevent multiple modals
    if (document.getElementById('jhn-notes-modal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'jhn-notes-modal';
    modal.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background-color: #1F2937;
        color: #F3F4F6;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        z-index: 9999;
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(100%);
        opacity: 0;
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="padding: 16px; background-color: #374151; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 18px; font-weight: 600; margin: 0;">Job Saved!</h3>
            <button id="jhn-close-btn" style="background: none; border: none; color: #9CA3AF; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <label for="jhn-notes-textarea" style="font-size: 14px; color: #D1D5DB;">Add a quick note:</label>
            <textarea id="jhn-notes-textarea" style="width: 100%; height: 80px; background-color: #374151; border: 1px solid #4B5563; border-radius: 4px; color: white; padding: 8px; resize: vertical;"></textarea>
            <button id="jhn-save-note-btn" style="background-color: #2563EB; color: white; border: none; border-radius: 4px; padding: 10px 16px; font-weight: 600; cursor: pointer; text-align: center;">Save Note</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate the modal into view
    setTimeout(() => {
        modal.style.transform = 'translateY(0)';
        modal.style.opacity = '1';
    }, 10);

    const closeModal = () => {
        modal.style.transform = 'translateY(100%)';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('jhn-close-btn').addEventListener('click', closeModal);

    document.getElementById('jhn-save-note-btn').addEventListener('click', () => {
        const noteText = document.getElementById('jhn-notes-textarea').value;
        if (noteText.trim()) {
            chrome.runtime.sendMessage({
                action: 'SAVE_NOTE',
                payload: {
                    jobId: jobId,
                    noteText: noteText
                }
            });
        }
        closeModal();
    });
}

// Listen for the message from the service worker to show the modal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SHOW_NOTES_MODAL') {
        showNotesModal(request.jobId);
    }
});
