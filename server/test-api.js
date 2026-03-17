// End-to-end workflow test
const BASE = 'http://localhost:5000/api';
async function post(path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
    return { status: r.status, ...(await r.json()) };
}
async function get(path, token) {
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${BASE}${path}`, { headers: h });
    return { status: r.status, ...(await r.json()) };
}
async function put(path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: h, body: JSON.stringify(body) });
    return { status: r.status, ...(await r.json()) };
}

async function test() {
    console.log('=== END-TO-END WORKFLOW TESTS ===\n');

    // Register a user
    let r = await post('/auth/register', { name: 'TestUser', email: 'test@flow.com', password: 'Test1234!' });
    const token = r.token;
    console.log(`1. Register user → ${r.success ? '✅' : '❌'} ${r.message}`);

    // === WORKFLOW 1: NEED A WORKER ===
    console.log('\n--- NEED A WORKER ---');

    // Get workers list (public)
    r = await get('/workers?available=true');
    console.log(`2. Get available workers → ${r.success ? '✅' : '❌'} ${r.count} workers found`);

    // Get workers filtered by category
    r = await get('/workers?category=plumber&available=true');
    console.log(`3. Filter plumbers → ${r.success ? '✅' : '❌'} ${r.count} plumber(s)`);

    // Create booking
    r = await post('/bookings', { category: 'plumber', description: 'Kitchen sink leak', budget: 500, date: '2026-03-20', time: '10:00' }, token);
    const bookingId = r.booking?._id;
    console.log(`4. Create booking → ${r.success ? '✅' : '❌'} ID: ${bookingId?.slice(0,8) || '?'}`);

    // === WORKFLOW 2: HIRE EMPLOYEE ===
    console.log('\n--- HIRE EMPLOYEE ---');

    // Post job
    r = await post('/jobs', { title: 'Security Guard', openings: 2, hours: 'Night Shift', salaryMin: 9000, salaryMax: 11000, experience: 'Fresher', benefits: ['🏠 Accommodation'], location: 'Kukatpally' }, token);
    const jobId = r.job?._id;
    console.log(`5. Post job → ${r.success ? '✅' : '❌'} ID: ${jobId?.slice(0,8) || '?'}`);

    // Get my jobs
    r = await get('/jobs/my', token);
    console.log(`6. Get my posted jobs → ${r.success ? '✅' : '❌'} ${r.count} job(s)`);

    // === WORKFLOW 3: NEED WORK ===
    console.log('\n--- NEED WORK ---');

    // Register as worker (update profile)
    r = await put('/auth/profile', { role: 'worker', skills: ['plumber', 'electrician'], isAvailable: true, pricePerHour: 400 }, token);
    console.log(`7. Register as worker → ${r.success ? '✅' : '❌'} ${r.message}`);

    // Update worker profile
    r = await put('/workers/profile', { isAvailable: true, pricePerHour: 450 }, token);
    console.log(`8. Update worker profile → ${r.success ? '✅' : '❌'} ${r.message}`);

    // Get pending bookings (incoming jobs)
    r = await get('/bookings/pending');
    console.log(`9. Get pending bookings → ${r.success ? '✅' : '❌'} ${r.count} pending`);

    // === WORKFLOW 4: FIND A JOB ===
    console.log('\n--- FIND A JOB ---');

    // Get all jobs (public)
    r = await get('/jobs');
    console.log(`10. List all jobs → ${r.success ? '✅' : '❌'} ${r.count} jobs`);

    // Search jobs
    r = await get('/jobs?search=cook');
    console.log(`11. Search 'cook' → ${r.success ? '✅' : '❌'} ${r.count} result(s)`);

    // Apply to job
    const allJobs = (await get('/jobs')).jobs;
    if (allJobs && allJobs.length > 0) {
        r = await post(`/jobs/${allJobs[0]._id}/apply`, { coverNote: 'I am interested' }, token);
        console.log(`12. Apply to job → ${r.success ? '✅' : '❌'} ${r.message}`);
    }

    console.log('\n=== ALL TESTS DONE ===');
}
test().catch(e => console.error(e));
