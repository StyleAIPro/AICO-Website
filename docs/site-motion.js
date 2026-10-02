(() => {
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  if (!chapters.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  const update = () => {
    scheduled = false;
    let nearest, distance = Infinity;
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      const d = Math.abs(rect.top - 150);
      if (rect.top < innerHeight / 2 && rect.bottom > 150 && d < distance) { nearest = chapter; distance = d; }
      const steps = [...chapter.querySelectorAll('.chapter-step')];
      let active = 0, best = Infinity;
      steps.forEach((step, i) => { const d = Math.abs(step.getBoundingClientRect().top - innerHeight * .4); if (d < best) { active = i; best = d; } });
      steps.forEach((step, i) => step.classList.toggle('is-active', i === active));
      chapter.querySelector('[data-caption]').textContent = steps[active].querySelector('h3').textContent;
      // CSS custom-property/style mutations are avoided under the site's strict CSP.
      const bar = chapter.querySelector('.stage-progress');
      bar.dataset.progress = String(active);
      chapter.dataset.activeStep = String(active);
    }
    document.querySelectorAll('.chapter-nav a').forEach(a => { if (a.hash === '#' + nearest?.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); reduced.addEventListener('change', schedule); update();
  const visibility = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); }), { threshold: 0 });
  document.querySelectorAll('video').forEach(video => visibility.observe(video));
})();
