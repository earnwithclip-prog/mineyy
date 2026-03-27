// ===== PAGES-JOBS.JS — Find Job + Hire Monthly (Full End-to-End) =====
import {
    apiGetJobs, apiApplyWithDetails, apiPostJob, apiGetMyJobs,
    apiGetJobApplications, apiUpdateApplicationStatus, apiGetMyApplications,
    apiGetIncomingApplications, apiCloseJob
} from './api.js';
import { requireAuth, showToast, getUser } from './auth.js';
import { openChat } from './chat.js';

const COLORS = ['#7c3aed', '#4f46e5', '#6366f1', '#8b5cf6', '#a855f7', '#7c3aed'];

function formatSalary(n) {
    if (!n) return '0';
    return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n.toString();
}

function formatTime12(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function timeAgo(date) {
    if (!date) return '';
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

function statusBadge(status) {
    const map = {
        pending: '<span class="status-badge status-pending">⏳ Pending</span>',
        accepted: '<span class="status-badge status-accepted">✅ Accepted</span>',
        rejected: '<span class="status-badge status-rejected">❌ Rejected</span>'
    };
    return map[status] || '';
}

// Map thumbnail using OpenStreetMap static
function mapThumb(lat, lng) {
    if (!lat || !lng || (lat === 0 && lng === 0)) return '';
    return `<div class="job-map-thumb" onclick="openJobMap(${lat},${lng})" title="View on map">
        <img src="https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=120&height=70&center=lonlat:${lng},${lat}&zoom=14&marker=lonlat:${lng},${lat};type:awesome;color:%237c3aed;size:small&apiKey=a5a0c3e55d6a4e5b8e0b3c3e55d6a4e5" 
             onerror="this.parentElement.style.display='none'" alt="map" loading="lazy">
        <div class="map-thumb-overlay">📍 Map</div>
    </div>`;
}

// ===== GLOBAL MAP MODAL =====
function setupMapModal() {
    if (document.getElementById('jobMapModal')) return;
    const modal = document.createElement('div');
    modal.id = 'jobMapModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;width:90%;max-width:500px;max-height:90vh;overflow:hidden;position:relative;">
            <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);">
                <h3 style="color:#fff;margin:0;">📍 Shop Location</h3>
                <button onclick="document.getElementById('jobMapModal').style.display='none'" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">×</button>
            </div>
            <div id="jobModalMapEl" style="height:300px;"></div>
            <div style="padding:16px;display:flex;gap:12px;">
                <button id="jobMapDirectionsBtn" class="btn btn-primary" style="flex:1;">🗺️ Get Directions</button>
                <button onclick="document.getElementById('jobMapModal').style.display='none'" class="btn btn-secondary" style="flex:1;">Close</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

window.openJobMap = function(lat, lng, label) {
    setupMapModal();
    const modal = document.getElementById('jobMapModal');
    modal.style.display = 'flex';
    const mapEl = document.getElementById('jobModalMapEl');
    mapEl.innerHTML = '';

    if (typeof L !== 'undefined') {
        const m = L.map(mapEl).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        L.marker([lat, lng]).addTo(m).bindPopup(label || 'Shop Location').openPopup();
        setTimeout(() => m.invalidateSize(), 100);
    } else {
        mapEl.innerHTML = `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}" style="width:100%;height:100%;border:none;"></iframe>`;
    }

    document.getElementById('jobMapDirectionsBtn').onclick = () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };
};

// ===== APPLY MODAL =====
function openApplyModal(job) {
    const user = requireAuth();
    if (!user) return;

    const existing = document.getElementById('applyJobModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'applyJobModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;border:1px solid rgba(124,58,237,0.3);">
            <div style="padding:20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);">
                <h3 style="color:#fff;margin:0;">Apply for: ${job.title}</h3>
                <button id="closeApplyModal" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;line-height:1;">×</button>
            </div>
            <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
                <p style="color:#a78bfa;font-size:0.9rem;margin:0;">📍 ${job.employerName} · ${job.location || 'Location not specified'}</p>
                <div class="form-group">
                    <label class="form-label">Your Name</label>
                    <input id="applyName" type="text" class="form-input" value="${user.name || ''}" placeholder="Full Name">
                </div>
                <div class="form-group">
                    <label class="form-label">Phone Number <span style="color:#ef4444">*</span></label>
                    <input id="applyPhone" type="tel" class="form-input" value="${user.phone || ''}" placeholder="10-digit mobile number">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input id="applyEmail" type="email" class="form-input" value="${user.email || ''}" placeholder="Email address">
                </div>
                <div class="form-group">
                    <label class="form-label">Experience</label>
                    <select id="applyExp" class="form-input">
                        <option value="Fresher">Fresher (No experience)</option>
                        <option value="1-2 Years">1-2 Years</option>
                        <option value="2-5 Years">2-5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Message (Optional)</label>
                    <textarea id="applyNote" class="form-input" rows="3" placeholder="Tell the employer why you're suitable..."></textarea>
                </div>
                <button id="submitApplyBtn" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px;">Send Application →</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('closeApplyModal').addEventListener('click', () => modal.remove());

    document.getElementById('submitApplyBtn').addEventListener('click', async () => {
        const phone = document.getElementById('applyPhone').value.trim();
        const name = document.getElementById('applyName').value.trim();
        if (!phone) { showToast('⚠️ Phone number is required'); return; }

        const btn = document.getElementById('submitApplyBtn');
        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
            await apiApplyWithDetails(job._id, {
                seekerPhone: phone,
                seekerExperience: document.getElementById('applyExp').value,
                coverNote: document.getElementById('applyNote').value.trim()
            });
            showToast('✅ Application sent! Employer will review soon.');
            modal.remove();
            // Reload the apply button state
            document.querySelectorAll(`.apply-btn[data-job-id="${job._id}"]`).forEach(b => {
                b.textContent = '✅ Applied';
                b.disabled = true;
                b.style.background = 'linear-gradient(135deg,#10b981,#059669)';
            });
        } catch (err) {
            showToast('❌ ' + err.message);
            btn.disabled = false;
            btn.textContent = 'Send Application →';
        }
    });
}

// ===== FIND JOB PAGE =====
export async function initFindJobPage() {
    const grid = document.querySelector('.jobs-grid');
    if (!grid) return;

    let userLat = null;
    let userLng = null;
    let activeRadius = null; // null = show all

    // Radius filter UI injection
    const filtersEl = document.querySelector('.filters');
    if (filtersEl) {
        const radiusBar = document.createElement('div');
        radiusBar.className = 'radius-filter-bar reveal';
        radiusBar.innerHTML = `
            <div class="radius-filter-label">📍 Distance Filter:</div>
            <div class="radius-btns">
                <button class="radius-btn active" data-radius="">All</button>
                <button class="radius-btn" data-radius="2">2 KM</button>
                <button class="radius-btn" data-radius="5">5 KM</button>
                <button class="radius-btn" data-radius="10">10 KM</button>
                <button class="radius-btn" data-radius="20">20 KM</button>
            </div>
            <div id="geoStatus" class="geo-status">📡 Detecting your location...</div>`;
        filtersEl.parentNode.insertBefore(radiusBar, filtersEl);
        setTimeout(() => radiusBar.classList.add('visible'), 50);
    }

    // My Applications panel injection
    const container = grid.closest('.jobs-section') || grid.parentElement;
    const myAppPanel = document.createElement('div');
    myAppPanel.id = 'myApplicationsPanel';
    myAppPanel.style.cssText = 'display:none;';
    myAppPanel.innerHTML = `
        <div class="section-heading" style="margin:32px 0 16px;">
            <h3 style="color:#fff;">📋 My Applications</h3>
        </div>
        <div id="myAppsList"></div>`;
    if (container) container.appendChild(myAppPanel);

    // Load jobs immediately
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:#6b7280;grid-column:1/-1">Loading jobs...</div>';
    await loadJobs(grid, '', null, null, null);

    // Auto-detect GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                const geoEl = document.getElementById('geoStatus');
                if (geoEl) geoEl.textContent = '📍 Location detected — radius filter active';
                // Auto-apply 5km default filter
                activeRadius = 5;
                document.querySelectorAll('.radius-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.radius === '5');
                });
                loadJobs(grid, '', userLat, userLng, activeRadius);
            },
            () => {
                const geoEl = document.getElementById('geoStatus');
                if (geoEl) geoEl.textContent = '⚠️ Location not available — showing all jobs';
            },
            { enableHighAccuracy: false, timeout: 8000 }
        );
    }

    // Radius button clicks
    document.querySelectorAll('.radius-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.radius-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeRadius = btn.dataset.radius ? parseFloat(btn.dataset.radius) : null;
            const search = document.querySelector('.search-input')?.value?.trim() || '';
            loadJobs(grid, search, userLat, userLng, activeRadius);
        });
    });

    // Search
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-bar .btn-primary');
    const doSearch = () => loadJobs(grid, searchInput?.value?.trim() || '', userLat, userLng, activeRadius);
    searchBtn?.addEventListener('click', doSearch);
    searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });

    // Load my applications when logged in
    window.addEventListener('authStateChanged', async (e) => {
        if (e.detail?.user) {
            myAppPanel.style.display = 'block';
            loadMyApplications(document.getElementById('myAppsList'));
        }
    });
    const user = getUser();
    if (user) {
        myAppPanel.style.display = 'block';
        loadMyApplications(document.getElementById('myAppsList'));
    }
}

async function loadJobs(grid, search = '', lat, lng, radius) {
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:#6b7280;grid-column:1/-1">🔍 Loading jobs...</div>';
    try {
        const params = {};
        if (search) params.search = search;
        if (lat && lng && radius) {
            params.lat = lat;
            params.lng = lng;
            params.radius = radius;
        }
        const data = await apiGetJobs(params);
        const jobs = data.jobs || [];

        if (jobs.length === 0) {
            const hint = radius ? `within ${radius} km. <button onclick="document.querySelector('.radius-btn[data-radius=\\'\\']').click()" class="btn btn-secondary btn-sm" style="margin-left:8px">Show All Jobs</button>` : '.';
            grid.innerHTML = `<div style="text-align:center;padding:48px;grid-column:1/-1"><div style="font-size:48px">🔍</div><p style="color:#6b7280">No jobs found${search ? ' for "' + search + '"' : ''} ${hint}</p></div>`;
            return;
        }

        grid.innerHTML = jobs.map((j, i) => {
            const color = COLORS[i % COLORS.length];
            const initials = (j.employerName || 'CO').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            const distBadge = j.distance != null ? `<span class="distance-badge">📍 ${j.distance.toFixed(1)} km away</span>` : '';
            const hours = (j.scheduleFrom && j.scheduleTo)
                ? `${formatTime12(j.scheduleFrom)} – ${formatTime12(j.scheduleTo)}`
                : (j.hours || j.workType || 'Full-time');
            const salLabel = j.salaryType === 'daily' ? '/day' : '/month';
            const mapThumbHtml = mapThumb(j.coordinates?.lat, j.coordinates?.lng);

            return `
            <div class="job-card-full reveal" data-job-id="${j._id}">
                <div class="jcf-top">
                    ${distBadge}
                    ${j.workType ? `<span class="worktype-badge">${j.workType}</span>` : ''}
                </div>
                <div class="jcf-left">
                    <div class="jcf-company-logo" style="background:${color};">${initials}</div>
                    <div class="jcf-info">
                        <div class="job-title">${j.title}</div>
                        <div class="job-company">${j.employerName || 'Company'} · ${j.location || 'Remote'}</div>
                        <div class="job-meta">
                            <div class="job-meta-item">💰 ₹${formatSalary(j.salaryMin)} – ₹${formatSalary(j.salaryMax)}${salLabel}</div>
                            <div class="job-meta-item">⏰ ${hours}</div>
                            <div class="job-meta-item">🎓 ${j.experience || 'Fresher'}</div>
                            <div class="job-meta-item">👤 ${j.openings || 1} Opening${j.openings !== 1 ? 's' : ''}</div>
                            ${j.leavePolicy ? `<div class="job-meta-item">📅 ${j.leavePolicy}</div>` : ''}
                        </div>
                        ${j.description ? `<div class="job-desc-preview">${j.description.substring(0,100)}${j.description.length > 100 ? '...' : ''}</div>` : ''}
                        ${j.benefits?.length ? `<div class="job-benefits">${j.benefits.map(b => `<span class="benefit-pill">${b}</span>`).join('')}</div>` : ''}
                        ${mapThumbHtml}
                    </div>
                </div>
                <div class="jcf-actions">
                    <button class="btn btn-primary btn-sm apply-btn" 
                        data-job-id="${j._id}" 
                        data-job-title="${j.title}"
                        style="touch-action:manipulation">Apply Now</button>
                    ${j.coordinates?.lat ? `<button class="btn btn-secondary btn-sm" onclick="openJobMap(${j.coordinates.lat},${j.coordinates.lng},'${j.employerName}')">🗺️ Map</button>` : ''}
                </div>
            </div>`;
        }).join('');

        // Wire apply buttons
        grid.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const jobId = btn.dataset.jobId;
                const job = jobs.find(j => j._id === jobId);
                if (job) openApplyModal(job);
            });
        });

        setTimeout(() => {
            grid.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }, 50);

    } catch (err) {
        grid.innerHTML = `<div style="text-align:center;padding:48px;color:#6b7280;grid-column:1/-1"><div style="font-size:48px">⚠️</div><p>Error loading jobs. Is the server running?</p></div>`;
    }
}

async function loadMyApplications(container) {
    if (!container) return;
    try {
        const data = await apiGetMyApplications();
        const apps = data.applications || [];
        if (apps.length === 0) {
            container.innerHTML = '<p style="color:#6b7280;text-align:center;padding:24px;">You have not applied to any jobs yet.</p>';
            return;
        }
        container.innerHTML = apps.map(a => {
            const job = a.jobId;
            const isAccepted = a.status === 'accepted';
            const contactBlock = isAccepted && job ? `
                <div class="contact-reveal-card">
                    <div class="contact-reveal-title">📞 Employer Contact</div>
                    <div class="contact-reveal-item">${job.employerPhone || 'Contact via chat'}</div>
                    <div class="contact-reveal-item">${job.employerEmail || ''}</div>
                </div>` : '';
            return `
                <div class="applied-job-card card">
                    <div class="applied-job-header">
                        <div>
                            <div class="job-title">${job?.title || 'Job'}</div>
                            <div class="job-company">${job?.employerName || ''} · ${job?.location || ''}</div>
                        </div>
                        ${statusBadge(a.status)}
                    </div>
                    <div class="job-meta" style="margin-top:8px;">
                        <div class="job-meta-item">💰 ₹${formatSalary(job?.salaryMin)} – ₹${formatSalary(job?.salaryMax)}/month</div>
                        <div class="job-meta-item">⏰ ${job?.workType || 'Full-time'}</div>
                        <div class="job-meta-item">📅 Applied ${timeAgo(a.createdAt)}</div>
                    </div>
                    ${contactBlock}
                </div>`;
        }).join('');
    } catch (e) { container.innerHTML = '<p style="color:#6b7280;padding:24px;">Could not load applications.</p>'; }
}

// ===== HIRE MONTHLY PAGE =====
export async function initHiringPage() {
    const postBtn = document.getElementById('postJobBtn');
    const myJobsTab = document.getElementById('myJobsTab');
    const applicantsTab = document.getElementById('applicantsTab');
    const myJobsList = document.getElementById('myJobsList');
    const applicantsList = document.getElementById('applicantsList');

    // Tab switching
    const tabBtns = document.querySelectorAll('.hire-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (myJobsTab) myJobsTab.style.display = tab === 'jobs' ? '' : 'none';
            if (applicantsTab) applicantsTab.style.display = tab === 'applicants' ? '' : 'none';
            if (tab === 'jobs') loadMyPostedJobs(myJobsList);
            if (tab === 'applicants') loadIncomingApplications(applicantsList);
        });
    });

    // Map for job posting
    let jobLat = 0, jobLng = 0;
    setupHireMap((lat, lng) => { jobLat = lat; jobLng = lng; });

    // Post Job button
    if (postBtn) {
        postBtn.addEventListener('click', async () => {
            const user = requireAuth();
            if (!user) return;

            const title = document.getElementById('jobTitle')?.value?.trim();
            if (!title || title === 'Select Job Role') {
                showToast('⚠️ Please select a job role');
                return;
            }

            const locationInput = document.getElementById('jobLocation')?.value?.trim();
            if (!locationInput && jobLat === 0) {
                showToast('⚠️ Please set the shop location on the map');
                return;
            }

            const salaryMin = parseInt(document.getElementById('jobSalaryMin')?.value) || 0;
            const salaryMax = parseInt(document.getElementById('jobSalaryMax')?.value) || 0;
            if (salaryMax > 0 && salaryMin > salaryMax) {
                showToast('⚠️ Minimum salary cannot be more than maximum');
                return;
            }

            const checkedBenefits = [...document.querySelectorAll('.hire-form input[type="checkbox"]:checked')]
                .map(cb => cb.parentElement.textContent.trim());

            const jobData = {
                title,
                openings: parseInt(document.getElementById('jobOpenings')?.value) || 1,
                scheduleFrom: document.getElementById('jobFrom')?.value || '09:00',
                scheduleTo: document.getElementById('jobTo')?.value || '18:00',
                workType: document.getElementById('jobWorkType')?.value || 'Full-time',
                leavePolicy: document.getElementById('jobLeave')?.value || 'Weekly Off',
                salaryType: document.getElementById('jobSalaryType')?.value || 'monthly',
                salaryMin,
                salaryMax,
                experience: document.getElementById('jobExperience')?.value || 'Fresher',
                benefits: checkedBenefits,
                description: document.getElementById('jobDescription')?.value?.trim() || '',
                location: locationInput,
                coordinates: { lat: jobLat, lng: jobLng },
                joinDate: document.getElementById('jobJoinDate')?.value || ''
            };

            postBtn.disabled = true;
            postBtn.textContent = 'Posting...';

            try {
                await apiPostJob(jobData);
                showToast('✅ Job posted! Job seekers nearby will see it.');
                postBtn.textContent = '✅ Posted!';
                postBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
                loadMyPostedJobs(myJobsList);
                setTimeout(() => {
                    postBtn.disabled = false;
                    postBtn.textContent = 'Post Job →';
                    postBtn.style.background = '';
                }, 3000);
            } catch (err) {
                showToast('❌ ' + err.message);
                postBtn.disabled = false;
                postBtn.textContent = 'Post Job →';
            }
        });
    }

    // Initial load
    window.addEventListener('authStateChanged', async (e) => {
        if (e.detail?.user) loadMyPostedJobs(myJobsList);
    });
    const user = getUser();
    if (user && myJobsList) loadMyPostedJobs(myJobsList);
}

function setupHireMap(onLocation) {
    const detectBtn = document.getElementById('hireDetectLocation');
    const mapEl = document.getElementById('hireMap');
    const locationText = document.getElementById('hireLocationText');
    if (!detectBtn || !mapEl) return;

    let hireMap = null;
    let hireMarker = null;

    function initMap(lat, lng) {
        mapEl.style.display = 'block';
        onLocation(lat, lng);
        if (!hireMap) {
            hireMap = L.map(mapEl).setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(hireMap);
            hireMarker = L.marker([lat, lng], { draggable: true }).addTo(hireMap);
            hireMarker.on('dragend', () => {
                const pos = hireMarker.getLatLng();
                onLocation(pos.lat, pos.lng);
                reverseGeocode(pos.lat, pos.lng, locationText);
            });
            hireMap.on('click', (e) => {
                hireMarker.setLatLng(e.latlng);
                onLocation(e.latlng.lat, e.latlng.lng);
                reverseGeocode(e.latlng.lat, e.latlng.lng, locationText);
            });
        } else {
            hireMap.setView([lat, lng], 15);
            hireMarker.setLatLng([lat, lng]);
        }
        setTimeout(() => hireMap.invalidateSize(), 100);
        reverseGeocode(lat, lng, locationText);
    }

    detectBtn.addEventListener('click', () => {
        detectBtn.textContent = '⏳ Detecting...';
        detectBtn.disabled = true;
        if (!navigator.geolocation) {
            showToast('Geolocation not supported');
            detectBtn.textContent = '📍 Auto-detect Location';
            detectBtn.disabled = false;
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                initMap(pos.coords.latitude, pos.coords.longitude);
                detectBtn.textContent = '✅ Location Set';
                detectBtn.disabled = false;
            },
            () => {
                initMap(17.385, 78.4867);
                if (locationText) locationText.textContent = 'Could not detect. Drag pin to set location.';
                detectBtn.textContent = '📍 Auto-detect Location';
                detectBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

function reverseGeocode(lat, lng, textEl) {
    if (!textEl) return;
    textEl.textContent = 'Detecting address...';
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(r => r.json())
        .then(d => { textEl.textContent = d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`; })
        .catch(() => { textEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; });
}

async function loadMyPostedJobs(container) {
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#6b7280;">Loading...</div>';
    try {
        const data = await apiGetMyJobs();
        const jobs = data.jobs || [];
        if (jobs.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:32px;color:#6b7280;"><div style="font-size:40px;margin-bottom:12px;">📋</div><p>No jobs posted yet. Post your first job!</p></div>';
            return;
        }
        container.innerHTML = jobs.map(j => `
            <div class="job-card reveal" style="margin-bottom:16px;">
                <div class="job-header">
                    <div>
                        <div class="job-title">${j.title}</div>
                        <div class="job-company">${j.location || 'Location not set'}</div>
                    </div>
                    <div class="job-salary">₹${formatSalary(j.salaryMin)}-${formatSalary(j.salaryMax)}</div>
                </div>
                <div class="job-meta" style="margin:8px 0;">
                    <div class="job-meta-item">⏰ ${j.workType || 'Full-time'}</div>
                    <div class="job-meta-item">📅 ${j.leavePolicy || ''}</div>
                    <div class="job-meta-item">👤 ${j.openings} Opening${j.openings !== 1 ? 's' : ''}</div>
                    <div class="job-meta-item">${j.status === 'filled' ? '✅ Filled' : '🟢 Active'}</div>
                </div>
                <div class="job-applicants" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span class="pill pill-primary">${j.applicantCount || 0} Application${j.applicantCount !== 1 ? 's' : ''}</span>
                    <span style="font-size:0.8rem;color:#6b7280;">${timeAgo(j.createdAt)}</span>
                    ${j.status === 'active' ? `<button class="btn btn-secondary btn-sm close-job-btn" data-id="${j._id}" style="margin-left:auto;touch-action:manipulation;">Mark as Filled ✓</button>` : ''}
                </div>
            </div>`).join('');

        container.querySelectorAll('.close-job-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Mark this job as filled? It will be removed from public listings.')) return;
                btn.disabled = true;
                btn.textContent = 'Closing...';
                try {
                    await apiCloseJob(btn.dataset.id);
                    showToast('✅ Job marked as filled.');
                    loadMyPostedJobs(container);
                } catch (err) {
                    showToast('❌ ' + err.message);
                    btn.disabled = false;
                    btn.textContent = 'Mark as Filled ✓';
                }
            });
        });

        setTimeout(() => container.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')), 50);
    } catch (e) {
        container.innerHTML = '<p style="color:#6b7280;padding:24px;">Could not load jobs. Is the server running?</p>';
    }
}

async function loadIncomingApplications(container) {
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#6b7280;">Loading applications...</div>';
    try {
        const data = await apiGetIncomingApplications();
        const apps = data.applications || [];
        if (apps.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:32px;color:#6b7280;"><div style="font-size:40px;margin-bottom:12px;">📭</div><p>No applications yet. Share your job posting!</p></div>';
            return;
        }
        container.innerHTML = apps.map(a => {
            const isAccepted = a.status === 'accepted';
            const isRejected = a.status === 'rejected';
            const contactBlock = isAccepted ? `
                <div class="contact-reveal-card">
                    <div class="contact-reveal-title">📞 Applicant Contact</div>
                    <div class="contact-reveal-item">📱 ${a.seekerPhone || 'Not provided'}</div>
                    <div class="contact-reveal-item">✉️ ${a.seekerEmail || ''}</div>
                </div>` : '';
            return `
                <div class="applicant-card card reveal" data-app-id="${a._id}">
                    <div class="applicant-header">
                        <div class="applicant-avatar">${(a.seekerName || '?')[0].toUpperCase()}</div>
                        <div class="applicant-info">
                            <div class="applicant-name">${a.seekerName || 'Applicant'}</div>
                            <div class="applicant-meta">🎓 ${a.seekerExperience || 'Not specified'} · For: ${a.jobId?.title || 'Job'}</div>
                            <div class="applicant-meta">📅 Applied ${timeAgo(a.createdAt)}</div>
                        </div>
                        ${statusBadge(a.status)}
                    </div>
                    ${a.coverNote ? `<div class="applicant-note">"${a.coverNote}"</div>` : ''}
                    ${contactBlock}
                    ${!isAccepted && !isRejected ? `
                    <div class="applicant-actions">
                        <button class="btn btn-primary btn-sm accept-app-btn" data-id="${a._id}" style="touch-action:manipulation;">✅ Accept</button>
                        <button class="btn btn-secondary btn-sm reject-app-btn" data-id="${a._id}" style="touch-action:manipulation;">❌ Reject</button>
                    </div>` : ''}
                </div>`;
        }).join('');

        container.querySelectorAll('.accept-app-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Accept this application? The applicant will be notified.')) return;
                btn.disabled = true; btn.textContent = 'Accepting...';
                try {
                    const result = await apiUpdateApplicationStatus(btn.dataset.id, 'accepted');
                    showToast('✅ Application accepted! Contact details revealed.');
                    if (result.chatId) openChat(result.chatId);
                    loadIncomingApplications(container);
                } catch (err) {
                    showToast('❌ ' + err.message);
                    btn.disabled = false; btn.textContent = '✅ Accept';
                }
            });
        });

        container.querySelectorAll('.reject-app-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true; btn.textContent = 'Rejecting...';
                try {
                    await apiUpdateApplicationStatus(btn.dataset.id, 'rejected');
                    showToast('Application rejected. Applicant notified.');
                    loadIncomingApplications(container);
                } catch (err) {
                    showToast('❌ ' + err.message);
                    btn.disabled = false; btn.textContent = '❌ Reject';
                }
            });
        });

        setTimeout(() => container.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')), 50);
    } catch (e) {
        container.innerHTML = '<p style="color:#6b7280;padding:24px;">Could not load applications.</p>';
    }
}
