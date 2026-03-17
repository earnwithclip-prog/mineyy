// ===== PAGE-SPECIFIC: JOBS (Hire Monthly & Find Job) =====
import { postJob, listenForJobs, listenForMyJobs, renderJobs, renderMyJobs } from './jobs.js';
import { requireAuth, getUser } from './auth.js';

// ===== HIRE MONTHLY PAGE (Employer posts jobs) =====
export function initHiringPage() {
    const form = document.querySelector('.hiring-form');
    if (!form) return;

    const submitBtn = form.querySelector('.btn-primary');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const user = requireAuth();
        if (!user) return;

        // Gather form data
        const selects = form.querySelectorAll('select');
        const inputs = form.querySelectorAll('input');
        const title = selects[0]?.value || 'General Helper';
        const openings = inputs[0]?.value || '1';
        const hours = selects[1]?.value || 'Full Time (8 hrs)';

        // Salary inputs
        const salaryInputs = form.querySelectorAll('.salary-inputs input');
        const salaryMin = salaryInputs[0]?.value || '10000';
        const salaryMax = salaryInputs[1]?.value || '15000';

        const experience = selects[2]?.value || 'Fresher';

        // Benefits
        const benefits = [];
        form.querySelectorAll('.benefit-check input:checked').forEach(checkbox => {
            const label = checkbox.parentElement?.textContent?.trim();
            if (label) benefits.push(label);
        });

        const location = form.querySelector('input[type="text"]')?.value || '';
        const joinDate = form.querySelector('input[type="date"]')?.value || '';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        const jobId = await postJob({
            title, openings, hours, salaryMin, salaryMax,
            experience, benefits, location, joinDate
        });

        if (jobId) {
            submitBtn.textContent = 'Posted ✓';
            form.reset();
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Job →';
            }, 3000);
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Job →';
        }
    });

    // Listen for my jobs in sidebar
    const sidebar = document.querySelector('.active-jobs');
    if (sidebar) {
        const sidebarFallback = sidebar.innerHTML;

        function startJobListening(uid) {
            listenForMyJobs(uid, (jobs) => {
                if (jobs.length > 0) {
                    renderMyJobs(jobs, sidebar);
                } else {
                    sidebar.innerHTML = sidebarFallback;
                }
            });
        }

        window.addEventListener('authStateChanged', (e) => {
            const user = e.detail?.user;
            if (user) {
                startJobListening(user._id);
            } else {
                sidebar.innerHTML = sidebarFallback;
            }
        });

        const user = getUser();
        if (user) {
            startJobListening(user._id);
        }
    }
}

// ===== FIND JOB PAGE (Job seeker browses jobs) =====
export function initFindJobPage() {
    const container = document.querySelector('.jobs-grid');
    if (!container) return;

    // Save original static HTML as fallback for when Firestore is empty
    const staticFallback = container.innerHTML;

    // Listen for all active jobs (no auth required to browse)
    listenForJobs((jobs) => {
        if (jobs.length > 0) {
            renderJobs(jobs, container);
            // Keep a local copy for search
            allJobs = jobs;
        } else {
            // Keep static demo content if no Firestore jobs exist
            container.innerHTML = staticFallback;
        }
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-bar .btn-primary');
    let allJobs = [];

    if (searchInput && searchBtn) {
        function doSearch() {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                if (allJobs.length > 0) {
                    renderJobs(allJobs, container);
                } else {
                    container.innerHTML = staticFallback;
                }
                return;
            }
            if (allJobs.length > 0) {
                const filtered = allJobs.filter(job =>
                    job.title?.toLowerCase().includes(query) ||
                    job.location?.toLowerCase().includes(query) ||
                    job.employerName?.toLowerCase().includes(query)
                );
                renderJobs(filtered, container);
            }
        }

        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // Filter pills (purely visual for now)
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    // Static "Apply Now" buttons in fallback demo cards
    // should still open the auth flow so the user experiences
    // a complete journey even before real jobs exist.
    const staticApplyButtons = document.querySelectorAll('.jobs-grid .job-card-full .btn.btn-primary[data-i18n="find_apply"]');
    staticApplyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            requireAuth();
        });
    });
}
