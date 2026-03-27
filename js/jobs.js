// ===== JOBS MODULE — Express/MongoDB backend =====
import { apiGetJobs, apiGetMyJobs, apiPostJob, apiApplyToJob, apiGetJobApplications } from './api.js';
import { getUser, showToast } from './auth.js';
import { openChat } from './chat.js';

// ===== POST JOB =====
export async function postJob(data) {
    try {
        const result = await apiPostJob(data);
        showToast('✅ Job posted successfully!');
        return result.job?._id || true;
    } catch (error) {
        showToast('❌ ' + (error.message || 'Failed to post job'));
        return null;
    }
}

// ===== APPLY TO JOB =====
export async function applyToJob(jobId, coverNote) {
    try {
        const result = await apiApplyToJob(jobId, coverNote || '');
        showToast('✅ Application submitted! Chat opened with employer.');
        if (result.chatId) {
            openChat(result.chatId);
        }
        return true;
    } catch (error) {
        showToast('❌ ' + (error.message || 'Failed to apply'));
        return false;
    }
}

// ===== LISTEN FOR ALL ACTIVE JOBS (public — polling) =====
let jobPollTimer = null;

export function listenForJobs(callback) {
    if (jobPollTimer) clearInterval(jobPollTimer);

    async function fetchJobs() {
        try {
            const data = await apiGetJobs();
            callback(data.jobs || []);
        } catch (e) {
            console.error('Fetch jobs error:', e);
        }
    }

    fetchJobs();
    jobPollTimer = setInterval(fetchJobs, 15000);
}

// ===== LISTEN FOR MY POSTED JOBS (employer — polling) =====
let myJobPollTimer = null;

export function listenForMyJobs(uid, callback) {
    if (myJobPollTimer) clearInterval(myJobPollTimer);

    async function fetchMyJobs() {
        try {
            const data = await apiGetMyJobs();
            callback(data.jobs || []);
        } catch (e) {
            console.error('Fetch my jobs error:', e);
        }
    }

    fetchMyJobs();
    myJobPollTimer = setInterval(fetchMyJobs, 15000);
}

// ===== RENDER JOBS (for Find Job page) =====
export function renderJobs(jobs, container) {
    if (!container) return;

    container.innerHTML = jobs.map(job => `
        <div class="job-card-full" data-job-id="${job._id}">
            <div class="jcf-header">
                <div class="jcf-company">
                    <div class="jcf-logo">${(job.employerName || 'E')[0].toUpperCase()}</div>
                    <div>
                        <div class="jcf-company-name">${job.employerName || 'Employer'}</div>
                        <div class="jcf-location">📍 ${job.location || 'Remote'}</div>
                    </div>
                </div>
                <span class="job-type-badge">${job.hours || 'Full Time'}</span>
            </div>
            <h3 class="jcf-title">${job.title}</h3>
            <div class="jcf-meta">
                <span>💰 ₹${formatSalary(job.salaryMin)} - ₹${formatSalary(job.salaryMax)}/mo</span>
                <span>👥 ${job.openings || 1} opening${(job.openings || 1) > 1 ? 's' : ''}</span>
                <span>📋 ${job.experience || 'Fresher'}</span>
            </div>
            ${job.benefits && job.benefits.length > 0 ? `
                <div class="jcf-benefits">
                    ${job.benefits.map(b => `<span class="benefit-tag">${b}</span>`).join('')}
                </div>
            ` : ''}
            <div class="jcf-actions">
                <button class="btn btn-primary apply-job-btn" data-job-id="${job._id}" data-i18n="find_apply">Apply Now →</button>
                <button class="btn btn-outline save-job-btn">♡ Save</button>
            </div>
        </div>
    `).join('');

    // Wire Apply buttons
    container.querySelectorAll('.apply-job-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = getUser();
            if (!user) {
                // Trigger auth modal
                const { requireAuth } = await import('./auth.js');
                requireAuth();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Applying...';
            const success = await applyToJob(btn.dataset.jobId);
            if (success) {
                btn.textContent = 'Applied ✓';
                btn.style.opacity = '0.7';
            } else {
                btn.disabled = false;
                btn.textContent = 'Apply Now →';
            }
        });
    });

    // Wire Save buttons (local only)
    container.querySelectorAll('.save-job-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.textContent = btn.textContent === '♡ Save' ? '♥ Saved' : '♡ Save';
            btn.classList.toggle('saved');
        });
    });
}

// ===== RENDER MY POSTED JOBS (for employer sidebar) =====
export function renderMyJobs(jobs, container) {
    if (!container) return;

    container.innerHTML = jobs.map(job => `
        <div class="active-job-card" data-job-id="${job._id}">
            <div class="aj-header">
                <div class="aj-title">${job.title}</div>
                <span class="aj-status ${job.status === 'active' ? 'active' : ''}">${job.status === 'active' ? '🟢 Active' : '⏸ Closed'}</span>
            </div>
            <div class="aj-meta">
                <span>💰 ₹${formatSalary(job.salaryMin)}-${formatSalary(job.salaryMax)}/mo</span>
                <span>👥 ${job.applicantCount || 0} applicants</span>
            </div>
        </div>
    `).join('');
}

function formatSalary(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
}
