// --- Globals & State ---
let selectedFiles = { image: null, video: null };
let selectedLogo = 'none';
let customLogoDataUrl = null;
let generatedQrUrl = '';

// --- Preset SVGs for logo overlays (styled inside QR code) ---
const LOGO_SVGS = {
    link: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#db2777" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    video: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`
};

// --- Tab Switching Logic ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Remove active class from buttons and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activate chosen tab
        btn.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        clearResult();
        
        // Restore local preview of file if exists
        if ((tabName === 'image' || tabName === 'video') && selectedFiles[tabName]) {
            showLocalPreview(selectedFiles[tabName], tabName);
        } else {
            document.getElementById('media-preview-container').style.display = 'none';
        }
    });
});

// --- Drag and Drop + File Inputs Setup ---
function setupDropzone(type) {
    const dropzone = document.getElementById(`${type}-dropzone`);
    const input = document.getElementById(`${type}-input`);
    
    // Clicking on dropzone fires hidden input
    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('.remove-file-btn')) return;
        input.click();
    });
    
    // Visual indicators for dragover
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    ['dragleave', 'dragend'].forEach(evt => {
        dropzone.addEventListener(evt, () => {
            dropzone.classList.remove('dragover');
        });
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileSelection(e.dataTransfer.files[0], type);
        }
    });
    
    input.addEventListener('change', () => {
        if (input.files.length) {
            handleFileSelection(input.files[0], type);
        }
    });
}

function handleFileSelection(file, type) {
    // Validation
    if (type === 'image' && !file.type.startsWith('image/')) {
        showToast('Iltimos, rasm faylini tanlang', 'error');
        return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
        showToast('Iltimos, video faylini tanlang', 'error');
        return;
    }
    if (file.size > 100 * 1024 * 1024) {
        showToast('Faylning maksimal o\'lchami — 100 MB', 'error');
        return;
    }
    
    selectedFiles[type] = file;
    
    // Update Dropzone UI
    const dropzone = document.getElementById(`${type}-dropzone`);
    const prompt = dropzone.querySelector('.drop-zone-prompt');
    const selectedContainer = dropzone.querySelector('.drop-zone-selected');
    const nameSpan = selectedContainer.querySelector('.file-name');
    
    nameSpan.textContent = file.name;
    prompt.style.display = 'none';
    selectedContainer.style.display = 'flex';
    
    showLocalPreview(file, type);
    showToast(`"${file.name}" fayli tanlandi`, 'success');
}

function clearSelectedFile(type) {
    selectedFiles[type] = null;
    
    const dropzone = document.getElementById(`${type}-dropzone`);
    const prompt = dropzone.querySelector('.drop-zone-prompt');
    const selectedContainer = dropzone.querySelector('.drop-zone-selected');
    const input = document.getElementById(`${type}-input`);
    
    input.value = '';
    prompt.style.display = 'block';
    selectedContainer.style.display = 'none';
    
    // Hide local file preview
    document.getElementById('media-preview-container').style.display = 'none';
    document.getElementById('preview').innerHTML = '';
}

function showLocalPreview(file, type) {
    const previewContainer = document.getElementById('media-preview-container');
    const previewDiv = document.getElementById('preview');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.style.display = 'block';
        if (type === 'image') {
            previewDiv.innerHTML = `<img src="${e.target.result}" alt="Natija">`;
        } else {
            previewDiv.innerHTML = `<video controls src="${e.target.result}"></video>`;
        }
    };
    reader.readAsDataURL(file);
}

// --- Color Customizers Setup ---
const fgColorInput = document.getElementById('fg-color');
const bgColorInput = document.getElementById('bg-color');

document.querySelectorAll('.color-presets').forEach(container => {
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-color-btn');
        if (!btn) return;
        
        // Set active class on presets
        container.querySelectorAll('.preset-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const color = btn.dataset.color;
        const picker = container.parentElement.querySelector('.color-picker');
        if (picker) {
            if (color === 'transparent') {
                picker.dataset.transparent = 'true';
                picker.value = '#ffffff'; // Default mock color visual
            } else {
                delete picker.dataset.transparent;
                picker.value = color;
            }
        }
    });
});

fgColorInput.addEventListener('input', () => {
    document.querySelectorAll('#fg-color ~ .color-presets .preset-color-btn').forEach(b => b.classList.remove('active'));
});

bgColorInput.addEventListener('input', () => {
    document.querySelectorAll('#bg-color ~ .color-presets .preset-color-btn').forEach(b => b.classList.remove('active'));
    delete bgColorInput.dataset.transparent;
});

// --- Logo Presets Setup ---
const logoPresetBtns = document.querySelectorAll('.logo-presets .logo-preset-btn');
logoPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('upload-logo-btn')) {
            document.getElementById('custom-logo-input').click();
            return;
        }
        
        logoPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLogo = btn.dataset.logo;
    });
});

document.getElementById('custom-logo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Iltimos, logotip uchun rasm faylini tanlang', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        customLogoDataUrl = event.target.result;
        selectedLogo = 'custom';
        
        logoPresetBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.upload-logo-btn').classList.add('active');
        showToast('O\'z logotipingiz yuklandi', 'success');
    };
    reader.readAsDataURL(file);
});

// --- Server File Upload Function with Progress Support ---
async function uploadFile(file, onProgress) {
    const url = 'https://tmpfiles.org/api/v1/upload';
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                if (onProgress) onProgress(percent);
            }
        };
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.status === 'success' && response.data && response.data.url) {
                        resolve(response.data.url);
                    } else {
                        reject(new Error(response.message || 'Yuklashda xatolik'));
                    }
                } catch (e) {
                    reject(new Error('Fayl serveridan noto\'g\'ri javob keldi.'));
                }
            } else {
                reject(new Error(`Yuklab bo'lmadi: ${xhr.statusText || xhr.status}`));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Yuklashda tarmoq xatoligi. Internet aloqasini tekshiring.'));
        };
        
        xhr.send(formData);
    });
}

// --- Generate Trigger ---
async function handleGenerateClick() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'url') {
        const urlVal = document.getElementById('url-input').value.trim();
        if (!urlVal) {
            showToast('Iltimos, havola yoki matn kiriting', 'error');
            return;
        }
        generatedQrUrl = urlVal;
        generateQR(urlVal);
    } else {
        // Image or Video Upload to Server
        const file = selectedFiles[activeTab];
        if (!file) {
            showToast(`Iltimos, yaratish uchun ${activeTab === 'image' ? 'rasm' : 'video'} tanlang`, 'error');
            return;
        }
        
        // Progress UI init
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = progressContainer.querySelector('.progress-bar');
        const progressPercent = progressContainer.querySelector('.progress-percent');
        const progressStatus = progressContainer.querySelector('.progress-status');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressStatus.textContent = 'Fayl serverga yuklanmoqda...';
        
        const uploadToast = showToast('Fayl yuklanmoqda...', 'loading', 0);
        
        try {
            const rawUrl = await uploadFile(file, (percent) => {
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
                if (percent === 100) {
                    progressStatus.textContent = 'Havola va QR-kod yaratilmoqda...';
                }
            });
            
            // Format to direct download URL so scanned devices play/render immediately
            const directUrl = rawUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
            
            generatedQrUrl = directUrl;
            
            uploadToast.remove();
            progressContainer.style.display = 'none';
            
            generateQR(directUrl);
            
        } catch (error) {
            uploadToast.remove();
            progressContainer.style.display = 'none';
            showToast(error.message || 'Faylni yuklashda xatolik yuz berdi', 'error');
        }
    }
}

// --- Logo Drawing Helper ---
function drawLogo(canvas, logoUrl, logoSizePercent = 0.22) {
    return new Promise((resolve) => {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
            const qrSize = canvas.width;
            const logoSize = qrSize * logoSizePercent;
            const x = (qrSize - logoSize) / 2;
            const y = (qrSize - logoSize) / 2;
            
            // Draw a rounded white backdrop card for the logo
            ctx.fillStyle = '#ffffff';
            const padding = 6;
            const r = 8; // Border radius
            
            ctx.beginPath();
            ctx.moveTo(x - padding + r, y - padding);
            ctx.lineTo(x + logoSize + padding - r, y - padding);
            ctx.quadraticCurveTo(x + logoSize + padding, y - padding, x + logoSize + padding, y - padding + r);
            ctx.lineTo(x + logoSize + padding, y + logoSize + padding - r);
            ctx.quadraticCurveTo(x + logoSize + padding, y + logoSize + padding, x + logoSize + padding - r, y + logoSize + padding);
            ctx.lineTo(x - padding + r, y + logoSize + padding);
            ctx.quadraticCurveTo(x - padding, y + logoSize + padding, x - padding, y + logoSize + padding - r);
            ctx.lineTo(x - padding, y - padding + r);
            ctx.quadraticCurveTo(x - padding, y - padding, x - padding + r, y - padding);
            ctx.closePath();
            ctx.fill();
            
            // Subtle card border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw logo image
            ctx.drawImage(img, x, y, logoSize, logoSize);
            resolve();
        };
        img.onerror = () => {
            console.error("Logotip chizishda xatolik:", logoUrl);
            resolve(); // Resolve to not lock generator
        };
        img.src = logoUrl;
    });
}

// --- Main QR Generation Function ---
async function generateQR(data, shouldSave = true) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    
    // Show scanner line effect
    const scanLine = document.getElementById('scanner-line');
    scanLine.style.display = 'block';
    
    const mockupStatus = document.getElementById('mockup-status');
    mockupStatus.textContent = 'Yaratilmoqda...';
    
    try {
        // Read styling settings
        const fgColor = fgColorInput.value;
        const isBgTransparent = bgColorInput.dataset.transparent === 'true';
        const bgColor = isBgTransparent ? 'transparent' : bgColorInput.value;
        
        const errorCorrection = document.getElementById('error-level').value;
        
        // Resolve logo overlay
        let logoUrl = null;
        if (selectedLogo === 'custom' && customLogoDataUrl) {
            logoUrl = customLogoDataUrl;
        } else if (selectedLogo !== 'none' && LOGO_SVGS[selectedLogo]) {
            const logoBlob = new Blob([LOGO_SVGS[selectedLogo]], {type: 'image/svg+xml'});
            logoUrl = URL.createObjectURL(logoBlob);
        }
        
        // Call QRCodeLib wrapper
        QRCodeLib.toCanvas(qrcodeContainer, data, {
            width: 300,
            colorDark: fgColor,
            colorLight: bgColor,
            level: logoUrl ? 'H' : errorCorrection // Standardize to high error correction if logo blocks center code modules
        }, async function(error, canvas) {
            if (error) {
                scanLine.style.display = 'none';
                mockupStatus.textContent = 'Yaratishda xatolik';
                showToast('QR-kodni yaratib bo\'lmadi', 'error');
                console.error(error);
                return;
            }
            
            // Layer logo inside QR
            if (logoUrl) {
                await drawLogo(canvas, logoUrl);
            }
            
            // Re-render the image tag since we modified the canvas
            const img = qrcodeContainer.querySelector('img');
            if (img) {
                img.src = canvas.toDataURL('image/png');
            }
            
            // Success experience delay
            setTimeout(() => {
                scanLine.style.display = 'none';
                mockupStatus.textContent = 'QR-kod skanerlashga tayyor';
                
                // Slide up the action cards
                document.getElementById('actions-card').style.display = 'flex';
                
                showToast('QR-kod muvaffaqiyatli yaratildi!', 'success');
                
                // Save to Render database history
                if (shouldSave) {
                    saveToHistory(data, fgColor, bgColor, selectedLogo);
                }
                
                // Scroll to preview container on mobile screens
                if (window.innerWidth <= 900) {
                    const previewPanel = document.querySelector('.preview-panel');
                    if (previewPanel) {
                        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }, 1000);
        });
        
    } catch (error) {
        scanLine.style.display = 'none';
        mockupStatus.textContent = 'Yaratishda xatolik';
        showToast('QR-kodni yaratib bo\'lmadi', 'error');
        console.error(error);
    }
}

// --- Action Buttons ---
function downloadQR() {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        showToast('Avval QR-kodni yarating', 'error');
        return;
    }
    
    try {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('QR-kod saqlandi!', 'success');
    } catch (e) {
        showToast('Yuklab olishda xatolik yuz berdi', 'error');
        console.error(e);
    }
}

function copyQRLink() {
    if (!generatedQrUrl) {
        showToast('Avval QR-kodni yarating', 'error');
        return;
    }
    
    navigator.clipboard.writeText(generatedQrUrl)
        .then(() => {
            showToast('Havola nusxalandi!', 'success');
        })
        .catch(err => {
            showToast('Havolani nusxalab bo\'lmadi', 'error');
            console.error(err);
        });
}

function shareQR() {
    if (!generatedQrUrl) {
        showToast('Avval QR-kodni yarating', 'error');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'QR Studio Link',
            text: 'Ushbu kontentni QR-kod orqali ko\'ring:',
            url: generatedQrUrl,
        })
        .then(() => showToast('Havola ulashildi!', 'success'))
        .catch((err) => console.log(err));
    } else {
        // Fallback to copying
        copyQRLink();
    }
}

// --- Toast Notifications System ---
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        icon = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        // Loading
        icon = `<svg class="spinner" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10" stroke-dasharray="32 8"></circle></svg>`;
    }
    
    toast.innerHTML = `
        ${icon}
        <div class="toast-message">${message}</div>
    `;
    container.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px) scale(0.95)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// --- Reset / Clear Panel State ---
function clearResult() {
    const qrcode = document.getElementById('qrcode');
    qrcode.innerHTML = `
        <div class="qr-placeholder">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <rect x="6" y="6" width="4" height="4" />
                <rect x="14" y="6" width="4" height="4" />
                <rect x="6" y="14" width="4" height="4" />
            </svg>
            <p>Formani to'ldiring va yaratish tugmasini bosing</p>
        </div>
    `;
    
    document.getElementById('scanner-line').style.display = 'none';
    document.getElementById('actions-card').style.display = 'none';
    document.getElementById('mockup-status').textContent = 'Yaratilishi kutilmoqda...';
    generatedQrUrl = '';
    currentQrDbId = null;
}

// --- Initialize Drag zones ---
setupDropzone('image');
setupDropzone('video');

// --- Database History Functions ---
let currentQrDbId = null;

async function loadHistory() {
    try {
        const response = await fetch('/api/qr');
        if (!response.ok) return;
        const data = await response.json();
        
        const historyCard = document.getElementById('history-card');
        const historyList = document.getElementById('history-list');
        
        if (data && data.length > 0) {
            historyCard.style.display = 'block';
            historyList.innerHTML = '';
            
            data.forEach(item => {
                const dateStr = new Date(item.created_at).toLocaleString('uz-UZ', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let iconSvg = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect></svg>';
                
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-item-left">
                        <div class="history-icon-wrapper">
                            ${iconSvg}
                        </div>
                        <div class="history-details">
                            <span class="history-text" title="${escapeHtml(item.qr_text)}">${escapeHtml(item.qr_text)}</span>
                            <span class="history-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="history-action-btn copy-item-btn" title="Nusxalash">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="history-action-btn load-item-btn" title="Generatorga yuklash">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        <button class="history-action-btn delete-item-btn" title="Bazadan o'chirish" style="color: rgba(239, 68, 68, 0.85);">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                
                div.querySelector('.copy-item-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.qr_text);
                    showToast('Havola nusxalandi!', 'success');
                });
                
                div.querySelector('.load-item-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadHistoryItem(item.qr_text, item.fg_color, item.bg_color, item.logo, item.id);
                });

                div.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                });
                
                historyList.appendChild(div);
            });
        } else {
            historyCard.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

async function saveToHistory(qr_text, fg_color, bg_color, logo) {
    try {
        const response = await fetch('/api/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_text, fg_color, bg_color, logo })
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.id) {
                currentQrDbId = data.id;
            }
        }
        loadHistory();
    } catch (err) {
        console.error('Error saving to history:', err);
    }
}

async function deleteHistoryItem(id) {
    try {
        const response = await fetch(`/api/qr/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showToast('QR-kod bazadan o\'chirildi!', 'success');
            if (currentQrDbId === id) {
                currentQrDbId = null;
                clearResult();
            }
            loadHistory();
        } else {
            showToast('O\'chirishda xatolik yuz berdi', 'error');
        }
    } catch (err) {
        console.error('Error deleting history item:', err);
        showToast('O\'chirishda xatolik yuz berdi', 'error');
    }
}

async function deleteCurrentQR() {
    if (!currentQrDbId) {
        showToast('Bazada o\'chirish uchun ID topilmadi', 'error');
        return;
    }
    await deleteHistoryItem(currentQrDbId);
}

function loadHistoryItem(qr_text, fg_color, bg_color, logo, id) {
    const urlTabBtn = document.querySelector('.tab-btn[data-tab="url"]');
    if (urlTabBtn) urlTabBtn.click();
    
    // Set ID after the tab click (since tab click calls clearResult which resets ID to null)
    currentQrDbId = id;
    
    document.getElementById('url-input').value = qr_text;
    
    const fgColorInput = document.getElementById('fg-color');
    const bgColorInput = document.getElementById('bg-color');
    
    fgColorInput.value = fg_color || '#000000';
    if (bg_color === 'transparent') {
        bgColorInput.dataset.transparent = 'true';
        bgColorInput.value = '#ffffff';
    } else {
        delete bgColorInput.dataset.transparent;
        bgColorInput.value = bg_color || '#ffffff';
    }
    
    document.querySelectorAll('#fg-color ~ .color-presets .preset-color-btn').forEach(b => {
        if (b.dataset.color === fg_color) b.classList.add('active');
        else b.classList.remove('active');
    });
    
    document.querySelectorAll('#bg-color ~ .color-presets .preset-color-btn').forEach(b => {
        if (b.dataset.color === bg_color) b.classList.add('active');
        else b.classList.remove('active');
    });
    
    selectedLogo = logo || 'none';
    const logoBtns = document.querySelectorAll('.logo-presets .logo-preset-btn');
    logoBtns.forEach(btn => {
        if (btn.dataset.logo === selectedLogo) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    generatedQrUrl = qr_text;
    // Generate without saving to history to avoid duplicates
    generateQR(qr_text, false);
    
    showToast('QR-kod yuklandi!', 'success');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Load history logs on page load
loadHistory();
