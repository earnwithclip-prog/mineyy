// Simple test - outputs results to file to avoid console interleaving
import { writeFileSync } from 'fs';
const BASE = 'http://localhost:5000/api';
const lines = [];

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

function log(line) { lines.push(line); }

async function test() {
    log('=== FULL END-TO-END WORKFLOW TESTS ===');
    log('');

    let r = await get('/health');
    log(`1. Health check: ${r.status===200 ? 'PASS' : 'FAIL'}`);

    // Register users
    r = await post('/auth/register', { name: 'Cust', email: 'c@t.com', password: 'Test1234!' });
    const ct = r.token; log(`2. Register customer: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    r = await post('/auth/register', { name: 'Wrkr', email: 'w@t.com', password: 'Test1234!' });
    const wt = r.token; log(`3. Register worker: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    r = await put('/auth/profile', { role: 'worker', skills: ['plumber','electrician'], isAvailable: true, pricePerHour: 400 }, wt);
    log(`4. Set worker role: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    r = await post('/auth/register', { name: 'Emp', email: 'e@t.com', password: 'Test1234!' });
    const et = r.token; log(`5. Register employer: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    r = await post('/auth/register', { name: 'Seekr', email: 's@t.com', password: 'Test1234!' });
    const st = r.token; log(`6. Register seeker: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    // WORKFLOW 1: NEED A WORKER
    log('\n--- WORKFLOW 1: NEED A WORKER ---');
    r = await get('/workers?available=true');
    log(`7. Available workers: ${r.success ? 'PASS' : 'FAIL'} - ${r.count} found`);

    r = await get('/workers?category=plumber&available=true');
    log(`8. Filter plumbers: ${r.success ? 'PASS' : 'FAIL'} - ${r.count} found`);

    r = await post('/bookings', { category: 'plumber', description: 'Fix sink', budget: 500, date: '2026-03-20', time: '10:00' }, ct);
    const bid = r.booking?._id;
    log(`9. Create booking: ${r.success ? 'PASS' : 'FAIL'} - ${bid?.slice(0,8)}`);

    r = await get('/bookings/my', ct);
    log(`10. Customer my bookings: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    r = await get('/bookings/pending');
    log(`11. Pending bookings: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    r = await patch(`/bookings/${bid}/status`, { status: 'confirmed' }, wt);
    const bchat = r.chatId;
    log(`12. Worker accepts booking: ${r.success ? 'PASS' : 'FAIL'} - chat: ${bchat ? 'YES' : 'NO'}`);

    if (bchat) {
        r = await post(`/chats/${bchat}/messages`, { text: 'Coming tomorrow' }, wt);
        log(`13. Worker sends msg: ${r.success ? 'PASS' : 'FAIL'}`);
        r = await post(`/chats/${bchat}/messages`, { text: 'Thanks!' }, ct);
        log(`14. Customer replies: ${r.success ? 'PASS' : 'FAIL'}`);
        r = await get(`/chats/${bchat}/messages`, ct);
        log(`15. Chat messages: ${r.success ? 'PASS' : 'FAIL'} - ${r.messages?.length} msgs`);
    } else { log('13-15. SKIP (no chat)'); }

    // WORKFLOW 2: HIRE EMPLOYEE
    log('\n--- WORKFLOW 2: HIRE EMPLOYEE ---');
    r = await post('/jobs', { title: 'Guard', openings: 2, hours: 'Night', salaryMin: 9000, salaryMax: 11000, experience: 'Fresher', location: 'Hyd' }, et);
    const jid = r.job?._id;
    log(`16. Post job: ${r.success ? 'PASS' : 'FAIL'} - ${jid?.slice(0,8)}`);

    r = await get('/jobs/my', et);
    log(`17. My posted jobs: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    // WORKFLOW 3: NEED WORK
    log('\n--- WORKFLOW 3: NEED WORK ---');
    r = await put('/workers/profile', { isAvailable: true, pricePerHour: 450 }, wt);
    log(`18. Update worker profile: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

    r = await get('/bookings/worker', wt);
    log(`19. Worker bookings: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    // WORKFLOW 4: FIND A JOB
    log('\n--- WORKFLOW 4: FIND A JOB ---');
    r = await get('/jobs');
    log(`20. All jobs: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    r = await get('/jobs?search=cook');
    log(`21. Search cook: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    const jobs = (await get('/jobs')).jobs;
    if (jobs?.length > 0) {
        r = await post(`/jobs/${jobs[0]._id}/apply`, { coverNote: 'Interested' }, st);
        const jchat = r.chatId;
        log(`22. Apply to job: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);

        r = await get('/jobs/applications/my', st);
        log(`23. Seeker apps: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

        r = await get(`/jobs/${jobs[0]._id}/applications`, et);
        const aid = r.applications?.[0]?._id;
        log(`24. Employer sees apps: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

        if (aid) {
            r = await patch(`/jobs/applications/${aid}/status`, { status: 'accepted' }, et);
            log(`25. Accept applicant: ${r.success ? 'PASS' : 'FAIL'} - ${r.message}`);
        } else { log('25. Accept applicant: FAIL - no app found'); }

        if (jchat) {
            r = await post(`/chats/${jchat}/messages`, { text: 'Welcome!' }, et);
            log(`26. Employer chat msg: ${r.success ? 'PASS' : 'FAIL'}`);
            r = await post(`/chats/${jchat}/messages`, { text: 'Thanks!' }, st);
            log(`27. Seeker reply: ${r.success ? 'PASS' : 'FAIL'}`);
        } else { log('26-27. SKIP (no chat)'); }
    } else { log('22-27. SKIP (no jobs)'); }

    // CHATS
    log('\n--- CHATS ---');
    r = await get('/chats', ct);
    log(`28. Customer chats: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);
    r = await get('/chats', et);
    log(`29. Employer chats: ${r.success ? 'PASS' : 'FAIL'} - ${r.count}`);

    // SUMMARY
    const p = lines.filter(l => l.includes('PASS')).length;
    const f = lines.filter(l => l.includes('FAIL')).length;
    log(`\n=== RESULTS: ${p}/${p+f} PASSED, ${f} FAILED ===`);

    writeFileSync('test-results.txt', lines.join('\n'));
    console.log('Results written to test-results.txt');
}

test().catch(e => { log('ERROR: ' + e.message); writeFileSync('test-results.txt', lines.join('\n')); console.log('Results written to test-results.txt'); });
