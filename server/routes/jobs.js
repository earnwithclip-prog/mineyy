// ===== JOB ROUTES =====
import { Router } from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/jobs — Create a job (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { title, openings, hours, salaryMin, salaryMax, experience, benefits, location, joinDate } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Job title is required.' });
        }

        const job = await Job.create({
            employerId: req.user._id,
            employerName: req.user.name,
            employerPhoto: req.user.photoURL || null,
            title,
            openings: parseInt(openings) || 1,
            hours: hours || 'Full Time (8 hrs)',
            salaryMin: parseInt(salaryMin) || 0,
            salaryMax: parseInt(salaryMax) || 0,
            experience: experience || 'Fresher',
            benefits: benefits || [],
            location: location || '',
            joinDate: joinDate || '',
            status: 'active'
        });

        res.status(201).json({ success: true, message: 'Job posted successfully!', job });
    } catch (error) {
        console.error('Post job error:', error);
        res.status(500).json({ success: false, message: 'Failed to post job.' });
    }
});

// GET /api/jobs — List all active jobs (public)
router.get('/', async (req, res) => {
    try {
        const filter = { status: 'active' };
        const { search } = req.query;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { employerName: { $regex: search, $options: 'i' } }
            ];
        }

        const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(50);

        res.json({ success: true, count: jobs.length, jobs });
    } catch (error) {
        console.error('List jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch jobs.' });
    }
});

// GET /api/jobs/my — List my posted jobs (protected)
router.get('/my', protect, async (req, res) => {
    try {
        const jobs = await Job.find({ employerId: req.user._id }).sort({ createdAt: -1 });

        // Get applicant counts
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const count = await Application.countDocuments({ jobId: job._id });
            return { ...job.toObject(), applicantCount: count };
        }));

        res.json({ success: true, count: jobsWithCounts.length, jobs: jobsWithCounts });
    } catch (error) {
        console.error('My jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your jobs.' });
    }
});

// POST /api/jobs/:id/apply — Apply to a job (protected)
router.post('/:id/apply', protect, async (req, res) => {
    try {
        const jobId = req.params.id;
        const { coverNote } = req.body;

        const job = await Job.findById(jobId);
        if (!job || job.status !== 'active') {
            return res.status(404).json({ success: false, message: 'Job not found or closed.' });
        }

        // Check duplicate
        const existing = await Application.findOne({ jobId, seekerId: req.user._id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You already applied to this job.' });
        }

        // Create application
        await Application.create({
            jobId,
            seekerId: req.user._id,
            seekerName: req.user.name,
            seekerEmail: req.user.email,
            seekerPhoto: req.user.photoURL || null,
            coverNote: coverNote || ''
        });

        // Create chat between applicant and employer
        const chat = await Chat.create({
            participants: [req.user._id, job.employerId],
            jobId: job._id,
            type: 'job_application'
        });

        // Update applicant count
        await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

        res.status(201).json({
            success: true,
            message: 'Application submitted!',
            chatId: chat._id
        });
    } catch (error) {
        console.error('Apply error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply.' });
    }
});

// GET /api/jobs/:id/applications — Get applications for a job (protected, employer only)
router.get('/:id/applications', protect, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }
        if (job.employerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }

        const applications = await Application.find({ jobId: req.params.id })
            .sort({ createdAt: -1 })
            .populate('seekerId', 'name email phone photoURL');

        res.json({ success: true, count: applications.length, applications });
    } catch (error) {
        console.error('Applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
});

export default router;
