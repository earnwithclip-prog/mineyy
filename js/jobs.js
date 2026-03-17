// ===== JOBS MODULE (Monthly Hiring) — Express/MongoDB backend =====
import { apiPostJob, apiGetJobs, apiGetMyJobs, apiApplyToJob, apiGetApplications } from './api.js';
import { requireAuth, showToast, getUser } from './auth.js';

// ===== POST JOB (Hire Monthly page) =====
export async function postJob({ title, openings, hours, salaryMin, salaryMax, experience, benefits, location, joinDate }) {
    const user = requireAuth();
    if (!user) return null;

    try {
        const data = await apiPostJob({
            title,
            openings: parseInt(openings) || 1,
            hours: hours || 'Full Time (8 hrs)',
            salaryMin: parseInt(salaryMin) || 0,
            salaryMax: parseInt(salaryMax) || 0,
            experience: experience || 'Fresher',
            benefits: benefits || [],
            location: location || '',
            joinDate: joinDate || ''
        });

        showToast('✅ Job posted successfully!');
        return data.job?._id || true;
    } catch (error) {
        console.error('Post job error:', error);
        showToast('❌ Failed to post job.');
        return null;
    }
}

// ===== FETCH ALL ACTIVE JOBS (Find Job page — polling) =====
let jobPollTimer = null;

export function listenForJobs(callback) {
    async function poll() {
        try {
            const data = await apiGetJobs();
            const jobs = (data.jobs || []).map(j => ({
                ...j,
                id: j._id,
                createdAt: j.createdAt ? { toDate: () => new Date(j.createdAt) } : null
            }));
            callback(jobs);
        } catch (e) {
            console.error('Jobs poll error:', e);
        }
    }

    poll();
    jobPollTimer = setInterval(poll, 15000); // poll every 15s

    return () => {
        if (jobPollTimer) clearInterval(jobPollTimer);
    };
}

// ===== FETCH MY POSTED JOBS (Employer's sidebar — polling) =====
let myJobPollTimer = null;

export function listenForMyJobs(employerId, callback) {
    async function poll() {
        try {
            const data = await apiGetMyJobs();
            const jobs = (data.jobs || []).map(j => ({
                ...j,
                id: j._id,
                createdAt: j.createdAt ? { toDate: () => new Date(j.createdAt) } : null
            }));
            callback(jobs);
        } catch (e) {
            console.error('My jobs poll error:', e);
        }
    }

    poll();
    myJobPollTimer = setInterval(poll, 15000);

    return () => {
        if (myJobPollTimer) clearInterval(myJobPollTimer);
    };
}

// ===== APPLY TO JOB (Find Job page) =====
export async function applyToJob(jobId, coverNote = '') {
    const user = requireAuth();
    if (!user) return null;

    try {
        const data = await apiApplyToJob(jobId, coverNote);
        showToast('✅ Application submitted! You can now chat with the employer.');
        return data.chatId || null;
    } catch (error) {
        console.error('Apply error:', error);
        const msg = error.message || 'Failed to apply.';
        showToast('❌ ' + msg);
        return null;
    }
}

// ===== LISTEN FOR APPLICATIONS (employer views) =====
export function listenForApplications(jobId, callback) {
    async function fetch() {
        try {
            const data = await apiGetApplications(jobId);
            callback(data.applications || []);
        } catch (e) {
            console.error('Applications error:', e);
        }
    }
    fetch();
    const timer = setInterval(fetch, 20000);
    return () => clearInterval(timer);
}

// ===== RENDER JOBS (for find-job page) =====
export function renderJobs(jobs, container) {
    if (!container) return;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 3rem;">
                <div style="font-size: 48px; margin-bottom: 1rem;">📋</div>
                <h4>No jobs posted yet</h4>
                <p style="color: var(--text-muted);">New job listings will appear here.</p>
            </div>
        `;
        return;
    }

    const colors = ['#7C3AED', '#4F46E5', '#6366F1', '#8B5CF6', '#A855F7'];

    container.innerHTML = jobs.map((job, i) => `
        <div class="job-card-full" data-job-id="${job.id}">
            <div class="jcf-left">
                <div class="jcf-company-logo" style="background: ${colors[i % colors.length]};">${getInitials(job.employerName)}</div>
                <div class="jcf-info">
                    <div class="job-title">${job.title}</div>
                    <div class="job-company">${job.employerName} · ${job.location || 'Remote'}</div>
                    <div class="job-meta">
                        <div class="job-meta-item">💰 ₹${formatSalary(job.salaryMin)}${job.salaryMax ? ' - ₹' + formatSalary(job.salaryMax) : ''}/month</div>
                        <div class="job-meta-item">⏰ ${job.hours || 'Full Time'}</div>
                        <div class="job-meta-item">📅 ${job.joinDate || 'Immediate'}</div>
                        <div class="job-meta-item">🎓 ${job.experience || 'Fresher OK'}</div>
                    </div>
                    ${job.benefits?.length ? `
                    <div class="job-benefits">
                        ${job.benefits.map(b => `<span class="benefit-pill">${b}</span>`).join('')}
                    </div>` : ''}
                </div>
            </div>
            <div class="jcf-actions">
                <button class="btn btn-primary btn-sm apply-job-btn" data-id="${job.id}">Apply Now</button>
                <button class="btn btn-secondary btn-sm">Save</button>
            </div>
        </div>
    `).join('');

    // Bind apply buttons
    container.querySelectorAll('.apply-job-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = 'Applying...';
            const chatId = await applyToJob(id);
            if (chatId) {
                btn.textContent = 'Applied ✓';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                window.dispatchEvent(new CustomEvent('openChat', { detail: { chatId } }));
            } else {
                btn.disabled = false;
                btn.textContent = 'Apply Now';
            }
        });
    });
}

// ===== RENDER MY JOBS (for hire-monthly sidebar) =====
export function renderMyJobs(jobs, container) {
    if (!container) return;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 2rem;">
                <p style="color: var(--text-muted);">Your posted jobs will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div>
                    <div class="job-title">${job.title}</div>
                    <div class="job-company">${job.location || 'Location not set'}</div>
                </div>
                <div class="job-salary">₹${formatSalary(job.salaryMin)} - ₹${formatSalary(job.salaryMax)}</div>
            </div>
            <div class="job-meta">
                <div class="job-meta-item">📍 ${job.location || '—'}</div>
                <div class="job-meta-item">⏰ ${job.hours || 'Full Time'}</div>
                <div class="job-meta-item">👤 ${job.openings} Opening${job.openings > 1 ? 's' : ''}</div>
            </div>
            <div class="job-applicants" style="margin-top: var(--space-md);">
                <span class="pill pill-primary">${job.applicantCount || 0} Application${job.applicantCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `).join('');
}

// ===== HELPERS =====
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function formatSalary(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
}
