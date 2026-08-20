/**
 * Único script del sitio: revela las secciones al entrar en pantalla.
 * Sin dependencias y sin peticiones de red.
 */
const observados = document.querySelectorAll('.revelar');

if (!('IntersectionObserver' in window)) {
  observados.forEach((el) => el.classList.add('visible'));
} else {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('visible');
        observador.unobserve(entrada.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  observados.forEach((el) => observador.observe(el));
}
