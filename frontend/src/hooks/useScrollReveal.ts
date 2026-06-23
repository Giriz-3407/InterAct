import { useEffect } from 'react';

/**
 * Sets up a single IntersectionObserver that watches all elements
 * with the `.lp-reveal` class and adds `.revealed` when they enter
 * the viewport. Call once in the top-level page component.
 */
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // Stop observing once revealed — no need to toggle
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );

    const elements = document.querySelectorAll('.lp-reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
