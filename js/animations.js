// ===== ENHANCED ANIMATIONS =====

// ===== PARTICLE BACKGROUND =====
export function initParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    canvas.style.cssText = `
        position: absolute; inset: 0; z-index: 0;
        pointer-events: none; opacity: 0.6;
    `;
    hero.style.position = 'relative';
    hero.insertBefore(canvas, hero.firstChild);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.floor(canvas.width * canvas.height / 18000);
        for (let i = 0; i < Math.min(count, 60); i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                alpha: Math.random() * 0.5 + 0.1,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124, 58, 237, ${p.alpha})`;
            ctx.fill();
        });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(124, 58, 237, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
}

// ===== CARD 3D TILT =====
export function initCardTilt() {
    const cards = document.querySelectorAll('.card, .service-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ===== GRADIENT FOLLOW CURSOR =====
export function initGradientFollow() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.cssText = `
        position: absolute; width: 500px; height: 500px;
        border-radius: 50%; pointer-events: none; z-index: 0;
        background: radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%);
        transform: translate(-50%, -50%); transition: left 0.3s ease, top 0.3s ease;
    `;
    hero.appendChild(glow);

    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        glow.style.left = (e.clientX - rect.left) + 'px';
        glow.style.top = (e.clientY - rect.top) + 'px';
    });
}

// ===== STAGGERED REVEAL (enhanced version) =====
export function initStaggerReveal() {
    const grids = document.querySelectorAll('.grid-4, .services-grid, .testimonials-grid, .how-it-works-steps');

    grids.forEach(grid => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, i) => {
                        child.style.opacity = '0';
                        child.style.transform = 'translateY(30px)';
                        setTimeout(() => {
                            child.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                        }, i * 100);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        observer.observe(grid);
    });
}

// ===== TYPED TEXT EFFECT =====
export function initTypedText() {
    const el = document.querySelector('.hero-heading');
    if (!el || el.dataset.typed) return;
    // Skip typing effect, just ensure it's visible
}

// ===== COUNTER ANIMATION (number count-up) =====
export function initCounterAnimation() {
    const counters = document.querySelectorAll('.counter-value');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                const suffix = entry.target.dataset.suffix || '';
                const prefix = entry.target.dataset.prefix || '';
                const duration = 2000;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);
                    entry.target.textContent = prefix + current.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(update);
                    }
                }

                requestAnimationFrame(update);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

// ===== INIT ALL =====
export function initAnimations() {
    initParticles();
    initCardTilt();
    initGradientFollow();
    initStaggerReveal();
    initCounterAnimation();
}
