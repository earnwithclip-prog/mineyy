// ===== JOBS MODULE (Monthly Hiring) =====
import { db } from './firebase.js';
import {
    collection, addDoc, doc, updateDoc, onSnapshot, deleteDoc,
    query, where, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore';
import { requireAuth, showToast, getUser } from './auth.js';

// ===== POST JOB (Hire Monthly page) =====
export async function postJob({ title, openings, hours, salaryMin, salaryMax, experience, benefits, location, joinDate }) {
    const user = requireAuth();
    if (!user) return null;

    try {
        const jobRef = await addDoc(collection(db, 'jobs'), {
            employerId: user.uid,
            employerName: user.displayName || 'Employer',
            employerPhoto: user.photoURL || null,
            title,
            openings: parseInt(openings) || 1,
            hours: hours || 'Full Time (8 hrs)',
            salaryMin: parseInt(salaryMin) || 0,
            salaryMax: parseInt(salaryMax) || 0,
            experience: experience || 'Fresher',
            benefits: benefits || [],
            location: location || '',
            joinDate: joinDate || '',
            status: 'active',
            applicantCount: 0,
            createdAt: serverTimestamp()
        });

        showToast('✅ Job posted successfully!');
        return jobRef.id;
    } catch (error) {
        console.error('Post job error:', error);
        showToast('❌ Failed to post job.');
        return null;
    }
}

// ===== LISTEN FOR ALL ACTIVE JOBS (Find Job page) =====
export function listenForJobs(callback) {
    const q = query(
        collection(db, 'jobs'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const jobs = [];
        snapshot.forEach(docSnap => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(jobs);
    });
}

// ===== LISTEN FOR MY POSTED JOBS (Employer's sidebar) =====
export function listenForMyJobs(employerId, callback) {
    const q = query(
        collection(db, 'jobs'),
        where('employerId', '==', employerId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const jobs = [];
        snapshot.forEach(docSnap => {
            jobs.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(jobs);
    });
}

// ===== APPLY TO JOB (Find Job page) =====
export async function applyToJob(jobId, coverNote = '') {
    const user = requireAuth();
    if (!user) return null;

    try {
        // Check if already applied
        const existingQ = query(
            collection(db, 'jobs', jobId, 'applications'),
            where('seekerId', '==', user.uid)
        );
        const existing = await getDocs(existingQ);
        if (!existing.empty) {
            showToast('⚠️ You already applied to this job.');
            return null;
        }

        // Create application
        await addDoc(collection(db, 'jobs', jobId, 'applications'), {
            seekerId: user.uid,
            seekerName: user.displayName || 'Applicant',
            seekerEmail: user.email || '',
            seekerPhoto: user.photoURL || null,
            coverNote,
            status: 'pending',
            appliedAt: serverTimestamp()
        });

        // Create chat between applicant and employer
        // First, get the job to find employer
        const jobQuery = query(collection(db, 'jobs'), where('status', '==', 'active'));
        // We already have jobId, so let's use the applications to trigger chat

        const chatRef = await addDoc(collection(db, 'chats'), {
            jobId,
            participants: [user.uid],
            type: 'job_application',
            createdAt: serverTimestamp()
        });

        showToast('✅ Application submitted! You can now chat with the employer.');
        return chatRef.id;
    } catch (error) {
        console.error('Apply error:', error);
        showToast('❌ Failed to apply. Please try again.');
        return null;
    }
}

// ===== LISTEN FOR APPLICATIONS (employer views) =====
export function listenForApplications(jobId, callback) {
    const q = query(
        collection(db, 'jobs', jobId, 'applications'),
        orderBy('appliedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const apps = [];
        snapshot.forEach(docSnap => {
            apps.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(apps);
    });
}

// ===== RENDER JOBS (for find-job page) =====
export function renderJobs(jobs, container) {
    if (!container) return;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 3rem;">
                <div style="font-size: 48px; margin-bottom: 1rem;">📋</div>
                <h4>No jobs posted yet</h4>
                <p style="color: var(--text-muted);">New job listings will appear here in real-time.</p>
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
                <span class="pill pill-primary applicant-count" data-job-id="${job.id}">Loading...</span>
            </div>
        </div>
    `).join('');

    // Load applicant counts
    jobs.forEach(job => {
        listenForApplications(job.id, (apps) => {
            const countEl = container.querySelector(`.applicant-count[data-job-id="${job.id}"]`);
            if (countEl) countEl.textContent = `${apps.length} Application${apps.length !== 1 ? 's' : ''}`;
        });
    });
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
