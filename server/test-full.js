// Complete end-to-end workflow test
const BASE = 'http://localhost:5000/api';
const results = [];

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
async function patch(path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${BASE}${path}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
    return { status: r.status, ...(await r.json()) };
}

function log(num, label, pass, detail = '') {
    const icon = pass ? '✅' : '❌';
    const line = `${num}. ${label} ${icon} ${detail}`;
    results.push(line);
    console.log(line);
}

async function test() {
    console.log('========================================');
    console.log('   FULL END-TO-END WORKFLOW TESTS');
    console.log('========================================\n');

    // Health check
    let r = await get('/health');
    log(1, 'Health check', r.status === 200, r.status === 200 ? 'ok' : 'FAIL');

    // === REGISTER USERS ===
    console.log('\n--- REGISTER USERS ---');
    
    r = await post('/auth/register', { name: 'Customer1', email: 'cust1@test.com', password: 'Test1234!' });
    const custToken = r.token;
    log(2, 'Register customer', r.success, r.message);

    r = await post('/auth/register', { name: 'Worker1', email: 'worker1@test.com', password: 'Test1234!' });
    const workerToken = r.token;
    log(3, 'Register worker', r.success, r.message);

    // Make worker a worker role
    r = await put('/auth/profile', { role: 'worker', skills: ['plumber', 'electrician'], isAvailable: true, pricePerHour: 400 }, workerToken);
    log(4, 'Set worker role', r.success, r.message);

    r = await post('/auth/register', { name: 'Employer1', email: 'emp1@test.com', password: 'Test1234!' });
    const empToken = r.token;
    log(5, 'Register employer', r.success, r.message);

    r = await post('/auth/register', { name: 'Seeker1', email: 'seeker1@test.com', password: 'Test1234!' });
    const seekerToken = r.token;
    log(6, 'Register seeker', r.success, r.message);

    // === WORKFLOW 1: NEED A WORKER ===
    console.log('\n--- WORKFLOW 1: NEED A WORKER ---');

    r = await get('/workers?available=true');
    log(7, 'List available workers', r.success, `${r.count} found`);

    r = await get('/workers?category=plumber&available=true');
    log(8, 'Filter plumbers', r.success, `${r.count} plumber(s)`);

    r = await post('/bookings', { category: 'plumber', description: 'Fix sink', budget: 500, date: '2026-03-20', time: '10:00' }, custToken);
    const bookingId = r.booking?._id;
    log(9, 'Create booking', r.success, `ID: ${bookingId?.slice(0,8) || '?'}`);

    r = await get('/bookings/my', custToken);
    log(10, 'Customer sees booking', r.success, `${r.count} booking(s)`);

    // Worker accepts
    r = await get('/bookings/pending');
    log(11, 'Get pending bookings', r.success, `${r.count} pending`);

    r = await patch(`/bookings/${bookingId}/status`, { status: 'confirmed' }, workerToken);
    const bookingChatId = r.chatId;
    log(12, 'Worker accepts booking', r.success, `chat: ${bookingChatId ? bookingChatId.toString().slice(0,8) : 'none'}`);

    // Chat messages
    if (bookingChatId) {
        r = await post(`/chats/${bookingChatId}/messages`, { text: 'I will come tomorrow' }, workerToken);
        log(13, 'Worker sends message', r.success, 'sent');

        r = await post(`/chats/${bookingChatId}/messages`, { text: 'Great, thanks!' }, custToken);
        log(14, 'Customer replies', r.success, 'sent');

        r = await get(`/chats/${bookingChatId}/messages`, custToken);
        log(15, 'Get chat messages', r.success, `${r.messages?.length || 0} messages`);
    } else {
        log(13, 'Worker sends message', false, 'no chat created');
        log(14, 'Customer replies', false, 'no chat created');
        log(15, 'Get chat messages', false, 'no chat created');
    }

    // === WORKFLOW 2: HIRE EMPLOYEE ===
    console.log('\n--- WORKFLOW 2: HIRE EMPLOYEE ---');

    r = await post('/jobs', { title: 'Security Guard', openings: 2, hours: 'Night Shift', salaryMin: 9000, salaryMax: 11000, experience: 'Fresher', benefits: ['Accommodation'], location: 'Hyderabad' }, empToken);
    const jobId = r.job?._id;
    log(16, 'Post a job', r.success, `ID: ${jobId?.slice(0,8) || '?'}`);

    r = await get('/jobs/my', empToken);
    log(17, 'My posted jobs', r.success, `${r.count} job(s)`);

    // === WORKFLOW 3: NEED WORK ===
    console.log('\n--- WORKFLOW 3: NEED WORK ---');

    r = await put('/workers/profile', { isAvailable: true, pricePerHour: 450 }, workerToken);
    log(18, 'Update worker profile', r.success, r.message);

    r = await get('/bookings/worker', workerToken);
    log(19, 'Worker bookings dashboard', r.success, `${r.count} booking(s)`);

    // === WORKFLOW 4: FIND A JOB ===
    console.log('\n--- WORKFLOW 4: FIND A JOB ---');

    r = await get('/jobs');
    log(20, 'List all active jobs', r.success, `${r.count} jobs`);

    r = await get('/jobs?search=cook');
    log(21, 'Search jobs (cook)', r.success, `${r.count} result(s)`);

    // Seeker applies
    const allJobs = (await get('/jobs')).jobs;
    if (allJobs && allJobs.length > 0) {
        r = await post(`/jobs/${allJobs[0]._id}/apply`, { coverNote: 'I am interested in this position' }, seekerToken);
        const applyChatId = r.chatId;
        log(22, 'Apply to job', r.success, r.message);

        r = await get('/jobs/applications/my', seekerToken);
        log(23, "Seeker's applications", r.success, `${r.count} application(s)`);

        // Employer views applicants
        r = await get(`/jobs/${allJobs[0]._id}/applications`, empToken);
        const appId = r.applications?.[0]?._id;
        log(24, 'Employer sees applicants', r.success, `${r.count} applicant(s)`);

        // Employer accepts
        if (appId) {
            r = await patch(`/jobs/applications/${appId}/status`, { status: 'accepted' }, empToken);
            log(25, 'Employer accepts applicant', r.success, r.message);
        } else {
            log(25, 'Employer accepts applicant', false, 'no application found');
        }

        // Chat between employer and seeker
        if (applyChatId) {
            r = await post(`/chats/${applyChatId}/messages`, { text: 'Welcome! When can you start?' }, empToken);
            log(26, 'Employer sends in job chat', r.success, 'sent');

            r = await post(`/chats/${applyChatId}/messages`, { text: 'I can start next Monday!' }, seekerToken);
            log(27, 'Seeker replies in job chat', r.success, 'sent');
        } else {
            log(26, 'Employer sends in job chat', false, 'no chat');
            log(27, 'Seeker replies in job chat', false, 'no chat');
        }
    } else {
        log(22, 'Apply to job', false, 'no jobs found');
        log(23, "Seeker's applications", false, 'skipped');
        log(24, 'Employer sees applicants', false, 'skipped');
        log(25, 'Employer accepts applicant', false, 'skipped');
        log(26, 'Employer sends in job chat', false, 'skipped');
        log(27, 'Seeker replies in job chat', false, 'skipped');
    }

    // === CHATS ===
    console.log('\n--- CHATS ---');
    r = await get('/chats', custToken);
    log(28, 'Customer chats list', r.success, `${r.count} chat(s)`);

    r = await get('/chats', empToken);
    log(29, 'Employer chats list', r.success, `${r.count} chat(s)`);

    // === SUMMARY ===
    console.log('\n========================================');
    const passed = results.filter(r => r.includes('✅')).length;
    const failed = results.filter(r => r.includes('❌')).length;
    console.log(`   RESULTS: ${passed}/${passed + failed} PASSED`);
    if (failed > 0) console.log(`   FAILED: ${failed}`);
    console.log('========================================');
}

test().catch(e => console.error('TEST ERROR:', e));
