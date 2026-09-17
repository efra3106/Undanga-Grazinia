'use strict';

/* ==========================================================================
   BIRTHDAY MOTION LILAC — Grazinia Tifani Angkol
   Vanilla JS, no jQuery / no WordPress backend required.
   ========================================================================== */

// Event date: Minggu, 27 September 2026, 13:00 WITA (UTC+8)
const EVENT_DATE = new Date('2026-09-27T13:00:00+08:00');

// Fill in a real WhatsApp number (country code, no +/spaces, e.g. "6281234567890")
// to send RSVP straight to it. Leave empty to let the guest pick a contact.
const RSVP_WHATSAPP_NUMBER = '';

document.addEventListener('DOMContentLoaded', () => {
  initGuestName();
  initOpenInvitation();
  initCountdown();
  initCalendarLink();
  initRsvpForm();
  initGiftCopy();
  initGallery();
  initWishes();
  initMusicToggle();
  initRevealOnScroll();
});

/* ---------------- Guest name personalization (?to= or ?guest=) ---------------- */
function initGuestName() {
  const guestElement = document.getElementById('guestName');
  if (!guestElement) return;

  const params = new URLSearchParams(window.location.search);
  const guestName = params.get('to') || params.get('guest');

  // URLSearchParams already decodes %20 etc. into normal characters.
  // textContent (never innerHTML) keeps the guest name safe from HTML/script injection.
  guestElement.textContent = guestName ? guestName.trim() : 'Nama Tamu';
}

/* ---------------- Open invitation (unlock scroll + play music) ---------------- */
function initOpenInvitation() {
  const body = document.body;
  const openBtn = document.getElementById('openInvitation');
  const mainContent = document.getElementById('mainContent');
  const song = document.getElementById('song');

  body.classList.add('locked');

  openBtn.addEventListener('click', () => {
    body.classList.remove('locked');
    mainContent.hidden = false;
    document.getElementById('splash').style.display = 'none';

    song.play().catch(() => {
      // Autoplay may be blocked by the browser; the visible music
      // toggle button in the bottom nav lets the guest start it manually.
    });
    updateMusicIcon(true);

    document.getElementById('cover').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------------- Countdown ---------------- */
function initCountdown() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  function tick() {
    const diff = EVENT_DATE.getTime() - Date.now();

    if (diff <= 0) {
      daysEl.textContent = hoursEl.textContent = minutesEl.textContent = secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  tick();
  setInterval(tick, 1000);
}

/* ---------------- Google Calendar link (built from the real event date) ---------------- */
function initCalendarLink() {
  const link = document.getElementById('calendarLink');
  const start = EVENT_DATE;
  const end = new Date(EVENT_DATE.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const toGCalUTC = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: '5th Birthday & Holy Baptism - Grazinia Tifani Angkol',
    dates: `${toGCalUTC(start)}/${toGCalUTC(end)}`,
    location: 'Kel. Angkol - Tampi',
    details: 'Mensyukuri Berkat Tuhan dalam Kehidupan Keluarga, Baptisan dan Hari Ulang Tahun ke-5 Grazinia Tifani Angkol.',
  });

  link.href = `https://www.google.com/calendar/render?${params.toString()}`;
}

/* ---------------- RSVP via WhatsApp ---------------- */
function initRsvpForm() {
  const form = document.getElementById('rsvpForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('rsvpName').value.trim();
    const option = form.querySelector('input[name="rsvpOption"]:checked');
    if (!name || !option) return;

    const message = `Hai, saya ${name} ingin konfirmasi kehadiran pada undangan digital bahwa ${option.value}. Terima kasih ya.`;
    const base = RSVP_WHATSAPP_NUMBER
      ? `https://wa.me/${RSVP_WHATSAPP_NUMBER}`
      : 'https://api.whatsapp.com/send';

    window.location.href = `${base}?text=${encodeURIComponent(message)}`;
  });
}

/* ---------------- Gift: copy account number ---------------- */
function initGiftCopy() {
  document.querySelectorAll('[data-copy-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.gift-card');
      const value = card.querySelector('.gift-number').dataset.copy;
      const label = btn.querySelector('span');
      const original = label.textContent;

      try {
        await navigator.clipboard.writeText(value);
      } catch (err) {
        const temp = document.createElement('textarea');
        temp.value = value;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }

      label.textContent = 'Berhasil disalin';
      setTimeout(() => { label.textContent = original; }, 1500);
    });
  });
}

/* ---------------- Gallery lightbox ---------------- */
function initGallery() {
  const grid = document.getElementById('galleryGrid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');

  grid.addEventListener('click', (e) => {
    if (e.target.tagName !== 'IMG') return;
    lightboxImg.src = e.target.src;
    lightbox.classList.add('open');
  });

  const close = () => {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  };

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
}

/* ---------------- Wishes (stored locally in the guest's browser) ---------------- */
const WISHES_KEY = 'zea-alika-wishes';

function initWishes() {
  const form = document.getElementById('wishesForm');
  const list = document.getElementById('wishesList');

  renderWishes(list);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('wishName').value.trim();
    const confirmValue = document.getElementById('wishConfirm').value;
    const message = document.getElementById('wishMessage').value.trim();
    if (!name || !confirmValue || !message) return;

    const wishes = getWishes();
    wishes.unshift({ name, confirmValue, message, date: Date.now() });
    localStorage.setItem(WISHES_KEY, JSON.stringify(wishes));

    form.reset();
    renderWishes(list);
  });
}

function getWishes() {
  try {
    return JSON.parse(localStorage.getItem(WISHES_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function renderWishes(list) {
  const wishes = getWishes();

  if (wishes.length === 0) {
    list.innerHTML = '<li class="wishes-empty">Jadilah yang pertama memberi ucapan!</li>';
    return;
  }

  list.innerHTML = wishes.map((w) => `
    <li>
      <span class="wish-name">${escapeHtml(w.name)}</span>
      <span class="wish-status">(${escapeHtml(w.confirmValue)})</span>
      <p class="wish-message">${escapeHtml(w.message)}</p>
    </li>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Background music toggle ---------------- */
function initMusicToggle() {
  const song = document.getElementById('song');
  const toggle = document.getElementById('musicToggle');

  toggle.addEventListener('click', () => {
    if (song.paused) {
      song.play().catch(() => {});
      updateMusicIcon(true);
    } else {
      song.pause();
      updateMusicIcon(false);
    }
  });
}

function updateMusicIcon(playing) {
  const icon = document.getElementById('musicIcon');
  icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
}

/* ---------------- Fade-in-up sections on scroll ---------------- */
function initRevealOnScroll() {
  const sections = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  sections.forEach((section) => observer.observe(section));
}
