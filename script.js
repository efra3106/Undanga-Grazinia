'use strict';

/* ==========================================================================
   BIRTHDAY MOTION LILAC — Grazinia Tiffany Angkol
   Vanilla JS, no jQuery / no WordPress backend required.
   ========================================================================== */

// Event date: Minggu, 27 September 2026, 13:00 WITA (UTC+8)
const EVENT_DATE = new Date('2026-09-27T13:00:00+08:00');

document.addEventListener('DOMContentLoaded', () => {
  initGuestName();
  initOpenInvitation();
  initCountdown();
  initCalendarLink();
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
    text: '5th Birthday & Holy Baptism - Grazinia Tiffany Angkol',
    dates: `${toGCalUTC(start)}/${toGCalUTC(end)}`,
    location: 'Kel. Angkol - Tampi',
    details: 'Mensyukuri Berkat Tuhan dalam Kehidupan Keluarga, Baptisan dan Hari Ulang Tahun ke-5 Grazinia Tiffany Angkol.',
  });

  link.href = `https://www.google.com/calendar/render?${params.toString()}`;
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

/* ---------------- Wishes (Google Sheets via Google Apps Script) ---------------- */
// Ganti dengan URL Web App hasil deploy Google Apps Script (lihat apps-script/Code.gs).
const WISHES_API_URL = 'https://script.google.com/macros/s/AKfycbwjr19d0C15Kp3DMOtd1Lx5uVtdabUHHHXbGuvXAlN6WjrPekokblw10OX7_cnDNA/exec';

const WISHES_POLL_MS = 12000; // refresh ringan setiap 12 detik saat section Wishes terlihat
const WISHES_NAME_MIN_LENGTH = 2;
const WISHES_NAME_MAX_LENGTH = 60;
const WISHES_MESSAGE_MAX_LENGTH = 500;

const WISHES_TIMEOUT_MS = 25000; // batas waktu satu request
const WISHES_RETRY_COUNT = 2;    // coba ulang otomatis sebelum menampilkan error

let wishesPollTimer = null;
let wishesLoading = false;

function initWishes() {
  const section = document.getElementById('wishes');
  const form = document.getElementById('wishesForm');
  const list = document.getElementById('wishesList');
  if (!section || !form || !list) return;

  loadWishes(list);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitWish(form, list);
  });

  // Refresh ringan hanya ketika section Wishes sedang terlihat di layar
  // (observer terpisah dari sistem reveal/fade-in section, tidak konflik).
  const pollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        startWishesPolling(list);
      } else {
        stopWishesPolling();
      }
    });
  }, { threshold: 0.2 });

  pollObserver.observe(section);
}

function startWishesPolling(list) {
  if (wishesPollTimer) return;
  wishesPollTimer = setInterval(() => loadWishes(list, { silent: true }), WISHES_POLL_MS);
}

function stopWishesPolling() {
  clearInterval(wishesPollTimer);
  wishesPollTimer = null;
}

async function loadWishes(list, options = {}) {
  // Google Apps Script bisa lambat (5-20 detik); jangan kirim request baru
  // selama request sebelumnya belum selesai supaya tidak menumpuk.
  if (wishesLoading) return;
  wishesLoading = true;

  const hasWishes = list.querySelector('li:not(.wishes-empty)') !== null;
  if (!options.silent && !hasWishes) {
    setWishesLoadingState(list);
  }

  try {
    const data = await fetchWishesWithRetry();
    renderWishes(list, sortWishesNewestFirst(data));
  } catch (err) {
    console.error('Gagal memuat wishes:', err);
    // Kalau ucapan sudah pernah tampil, biarkan saja daripada diganti pesan error.
    if (!options.silent && !hasWishes) {
      renderWishesError(list);
    }
  } finally {
    wishesLoading = false;
  }
}

async function fetchWishesWithRetry() {
  let lastError;

  for (let attempt = 0; attempt <= WISHES_RETRY_COUNT; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WISHES_TIMEOUT_MS);

    try {
      const response = await fetch(`${WISHES_API_URL}?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      const result = await response.json();

      if (!result || result.success !== true || !Array.isArray(result.data)) {
        throw new Error((result && result.message) || 'Invalid wishes response');
      }

      return result.data;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

function sortWishesNewestFirst(wishes) {
  return [...wishes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function submitWish(form, list) {
  const feedback = document.getElementById('wishesFeedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  const nameInput = document.getElementById('wishName');
  const confirmSelect = document.getElementById('wishConfirm');
  const messageInput = document.getElementById('wishMessage');

  const name = nameInput.value.trim();
  const status = confirmSelect.value;
  const message = messageInput.value.trim();

  if (name.length < WISHES_NAME_MIN_LENGTH) {
    showWishesFeedback(feedback, 'Nama minimal 2 karakter.', 'error');
    return;
  }
  if (!status) {
    showWishesFeedback(feedback, 'Silakan pilih konfirmasi kehadiran.', 'error');
    return;
  }
  if (!message) {
    showWishesFeedback(feedback, 'Ucapan tidak boleh kosong.', 'error');
    return;
  }

  const payload = {
    name: name.slice(0, WISHES_NAME_MAX_LENGTH),
    status,
    message: message.slice(0, WISHES_MESSAGE_MAX_LENGTH),
  };

  setSubmitLoading(submitBtn, true);
  showWishesFeedback(feedback, '', null);

  try {
    const response = await fetch(WISHES_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!result || result.success !== true || !result.data) {
      throw new Error((result && result.message) || 'Gagal mengirim ucapan');
    }

    form.reset();
    prependWish(list, result.data);
    showWishesFeedback(feedback, 'Ucapan berhasil dikirim. Terima kasih!', 'success');
  } catch (err) {
    console.error('Gagal mengirim wishes:', err);
    showWishesFeedback(feedback, 'Maaf, ucapan belum dapat dikirim. Silakan coba lagi.', 'error');
  } finally {
    setSubmitLoading(submitBtn, false);
  }
}

function setSubmitLoading(button, isLoading) {
  const icon = button.querySelector('i');
  button.disabled = isLoading;
  if (icon) {
    icon.className = isLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-regular fa-paper-plane';
  }
}

function showWishesFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('is-success', 'is-error');
  if (type === 'success') el.classList.add('is-success');
  if (type === 'error') el.classList.add('is-error');
}

function setWishesLoadingState(list) {
  list.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'wishes-empty';
  li.textContent = 'Memuat ucapan...';
  list.appendChild(li);
}

function renderWishesError(list) {
  list.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'wishes-empty';
  li.textContent = 'Maaf, ucapan belum dapat dimuat. Silakan coba lagi nanti.';
  list.appendChild(li);
}

function renderWishes(list, wishes) {
  list.innerHTML = '';

  if (!wishes || wishes.length === 0) {
    const li = document.createElement('li');
    li.className = 'wishes-empty';
    li.textContent = 'Jadilah yang pertama memberi ucapan!';
    list.appendChild(li);
    return;
  }

  wishes.forEach((wish) => list.appendChild(buildWishItem(wish)));
}

function prependWish(list, wish) {
  const emptyState = list.querySelector('.wishes-empty');
  if (emptyState) emptyState.remove();
  list.insertBefore(buildWishItem(wish), list.firstChild);
}

// Dibangun dengan createElement + textContent (bukan innerHTML) supaya
// nama/ucapan tamu selalu diperlakukan sebagai plain text (aman dari XSS).
function buildWishItem(wish) {
  const li = document.createElement('li');

  const nameEl = document.createElement('span');
  nameEl.className = 'wish-name';
  nameEl.textContent = wish.name || '';

  const statusEl = document.createElement('span');
  statusEl.className = 'wish-status';
  statusEl.textContent = wish.status ? `(${wish.status})` : '';

  const messageEl = document.createElement('p');
  messageEl.className = 'wish-message';
  messageEl.textContent = wish.message || '';

  li.appendChild(nameEl);
  li.appendChild(statusEl);
  li.appendChild(messageEl);

  return li;
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

  initGalleryReveal();
}

/* ---------------- Gallery photos slide in one by one on scroll ---------------- */
function initGalleryReveal() {
  const photos = document.querySelectorAll('#galleryGrid img');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

  photos.forEach((photo) => observer.observe(photo));
}
