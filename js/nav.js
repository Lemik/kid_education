const nav = document.getElementById('subjectNav');
const toggle = document.getElementById('navToggle');
const backdrop = document.getElementById('navBackdrop');

function openNav() {
  nav.classList.add('open');
  backdrop.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('nav-open');
}

function closeNav() {
  nav.classList.remove('open');
  backdrop.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}

if (nav && toggle && backdrop) {
  toggle.addEventListener('click', () => {
    if (nav.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  backdrop.addEventListener('click', closeNav);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
    }
  });
}
