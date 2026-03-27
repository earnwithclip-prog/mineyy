// ===== JOB ROUTES =====
import { Router } from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

// Haversine distance in KM
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/jobs — Create a job (protected)
router.post('/', protect, async (req, res) => {
    try {
        const {
            title, openings, scheduleFrom, scheduleTo, workType, leavePolicy,
            salaryMin, salaryMax, salaryType, experience, benefits, description,
            location, coordinates, joinDate
        } = req.body;

        if (!title) return res.status(400).json({ success: false, message: 'Job title is required.' });

        // Fetch employer's phone and email
        const employer = await User.findById(req.user._id);

        const job = await Job.create({
            employerId: req.user._id,
            employerName: req.user.name,
            employerPhone: employer?.phone || '',
            employerEmail: employer?.email || '',
            employerPhoto: req.user.photoURL || null,
            title,
            openings: parseInt(openings) || 1,
            scheduleFrom: scheduleFrom || '09:00',
            scheduleTo: scheduleTo || '18:00',
            workType: workType || 'Full-time',
            leavePolicy: leavePolicy || 'Weekly Off',
            salaryType: salaryType || 'monthly',
            salaryMin: parseInt(salaryMin) || 0,
            salaryMax: parseInt(salaryMax) || 0,
            experience: experience || 'Fresher',
            benefits: benefits || [],
            description: description || '',
            location: location || '',
            coordinates: coordinates || { lat: 0, lng: 0 },
            joinDate: joinDate || '',
            status: 'active'
        });

        res.status(201).json({ success: true, message: 'Job posted successfully!', job });
    } catch (error) {
        console.error('Post job error:', error);
        res.status(500).json({ success: false, message: 'Failed to post job.' });
    }
});

// GET /api/jobs — List active jobs with optional radius filter (public)
router.get('/', async (req, res) => {
    try {
        const { search, lat, lng, radius } = req.query;
        const filter = { status: 'active' };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { employerName: { $regex: search, $options: 'i' } }
            ];
        }

        let jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100);

        // Radius filter using Haversine
        if (lat && lng && radius) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const km = parseFloat(radius);

            jobs = jobs
                .map(j => {
                    const jLat = j.coordinates?.lat || 0;
                    const jLng = j.coordinates?.lng || 0;
                    let distance = null;
                    if (jLat !== 0 && jLng !== 0) {
                        distance = haversineKm(userLat, userLng, jLat, jLng);
                    }
                    return { ...j.toObject(), distance };
                })
                .filter(j => j.distance === null || j.distance <= km)
                .sort((a, b) => {
                    if (a.distance === null && b.distance === null) return 0;
                    if (a.distance === null) return 1;
                    if (b.distance === null) return -1;
                    return a.distance - b.distance;
                });
        } else {
            jobs = jobs.map(j => ({ ...j.toObject(), distance: null }));
        }

        res.json({ success: true, count: jobs.length, jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch jobs.' });
    }
});

// GET /api/jobs/my — List my posted jobs (protected)
router.get('/my', protect, async (req, res) => {
    try {
        const jobs = await Job.find({ employerId: req.user._id }).sort({ createdAt: -1 });
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const count = await Application.countDocuments({ jobId: job._id });
            return { ...job.toObject(), applicantCount: count };
        }));
        res.json({ success: true, count: jobsWithCounts.length, jobs: jobsWithCounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch your jobs.' });
    }
});

// ===== THESE MUST COME BEFORE /:id ROUTES =====

// GET /api/jobs/applications/my — Get current user's applications (protected)
router.get('/applications/my', protect, async (req, res) => {
    try {
        const applications = await Application.find({ seekerId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('jobId', 'title employerName employerPhone employerEmail salaryMin salaryMax salaryType location hours status workType scheduleFrom scheduleTo');
        res.json({ success: true, count: applications.length, applications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
});

// GET /api/jobs/applications/incoming — All applications to MY jobs (employer)
router.get('/applications/incoming', protect, async (req, res) => {
    try {
        const myJobs = await Job.find({ employerId: req.user._id }, '_id title');
        const jobIds = myJobs.map(j => j._id);
        const applications = await Application.find({ jobId: { $in: jobIds } })
            .sort({ createdAt: -1 })
            .populate('jobId', 'title location salaryMin salaryMax');
        res.json({ success: true, count: applications.length, applications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch incoming applications.' });
    }
});

// PATCH /api/jobs/applications/:id/status — Accept/reject application (employer)
router.patch('/applications/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be accepted or rejected.' });
        }

        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

        const job = await Job.findById(application.jobId);
        if (!job || job.employerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        application.status = status;

        let chatId = null;
        if (status === 'accepted') {
            const existingChat = await Chat.findOne({
                participants: { $all: [req.user._id, application.seekerId] },
                jobId: job._id
            });
            if (existingChat) {
                chatId = existingChat._id;
            } else {
                const chat = await Chat.create({
                    participants: [req.user._id, application.seekerId],
                    jobId: job._id,
                    type: 'job_application'
                });
                chatId = chat._id;
            }
            application.chatId = chatId;

            // Notify applicant with contact details
            await createNotification(
                application.seekerId,
                'accepted',
                `🎉 ${req.user.name} accepted your application for "${job.title}". Contact: ${job.employerPhone || 'see profile'}`,
                chatId.toString(),
                req.user.name
            );
        } else {
            await createNotification(
                application.seekerId,
                'rejected',
                `Your application for "${job.title}" was not selected.`,
                '',
                req.user.name
            );
        }

        await application.save();

        // Build contact reveal payload
        const employer = await User.findById(req.user._id);
        const contactInfo = status === 'accepted' ? {
            employerPhone: employer?.phone || job.employerPhone || '',
            employerEmail: employer?.email || job.employerEmail || '',
            seekerPhone: application.seekerPhone || '',
            seekerEmail: application.seekerEmail || ''
        } : null;

        res.json({ success: true, message: `Application ${status}!`, application, chatId, contactInfo });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update application.' });
    }
});

// ===== /:id ROUTES =====

// POST /api/jobs/:id/apply — Apply to a job (protected)
router.post('/:id/apply', protect, async (req, res) => {
    try {
        const jobId = req.params.id;
        const { coverNote, seekerPhone, seekerExperience } = req.body;

        const job = await Job.findById(jobId);
        if (!job || job.status !== 'active') return res.status(404).json({ success: false, message: 'Job not found or closed.' });

        // Prevent employer from applying to own job
        if (job.employerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot apply to your own job.' });
        }

        // Check duplicate
        const existing = await Application.findOne({ jobId, seekerId: req.user._id });
        if (existing) return res.status(400).json({ success: false, message: 'You already applied to this job.' });

        await Application.create({
            jobId,
            seekerId: req.user._id,
            seekerName: req.user.name,
            seekerEmail: req.user.email,
            seekerPhone: seekerPhone || req.user.phone || '',
            seekerExperience: seekerExperience || '',
            seekerPhoto: req.user.photoURL || null,
            coverNote: coverNote || ''
        });

        // Update applicant count
        await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

        // Notify employer
        await createNotification(
            job.employerId,
            'application',
            `📋 ${req.user.name} applied for "${job.title}"`,
            jobId,
            req.user.name
        );

        res.status(201).json({ success: true, message: 'Application submitted! Employer will review soon.' });
    } catch (error) {
        console.error('Apply error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply.' });
    }
});

// PATCH /api/jobs/:id/close — Mark job as filled/closed (employer only)
router.patch('/:id/close', protect, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
        if (job.employerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }
        job.status = 'filled';
        await job.save();
        res.json({ success: true, message: 'Job marked as filled and removed from listings.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to close job.' });
    }
});

// GET /api/jobs/:id/applications — Get applications for a job (employer only)
router.get('/:id/applications', protect, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
        if (job.employerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }
        const applications = await Application.find({ jobId: req.params.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, count: applications.length, applications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
});

export default router;
