// Get "today" in UTC-5 (Colombia time) as YYYY-MM-DD
function getTodayInUTCMinus5() {
  // Use the America/Bogota timezone (UTC-5, no DST) so the date
  // is calculated correctly regardless of the browser's local zone.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;

  return `${year}-${month}-${day}`;
}

// ---- CONFIGURABLE CALENDAR WINDOW (UTC-5, YYYY-MM-DD) ----
// Change these two constants to adjust when the calendar is active.
const CALENDAR_START_DATE = '2026-03-12';
const CALENDAR_END_DATE = '2026-03-31';

// Utility to add days to a YYYY-MM-DD string using pure calendar math
// so it stays consistent with the America/Bogota (UTC-5) calendar.
function addDaysToDateString(dateStr, days) {
  let [year, month, day] = dateStr.split('-').map(Number);

  // Simple loop is fine here because data-day counts are small (e.g. <= 31)
  while (days > 0) {
    const daysInMonth = new Date(year, month, 0).getDate(); // only used for month length
    day += 1;
    if (day > daysInMonth) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    days -= 1;
  }

  const y = year;
  const m = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return `${y}-${m}-${dd}`;
}

// Returns true if dateStr is between start and end (inclusive)
function isDateWithinRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

// Convert a YYYY-MM-DD (Colombia date) into a timestamp representing
// midnight in America/Bogota, expressed in UTC milliseconds.
// America/Bogota is fixed at UTC-5 with no DST, so 00:00 at that date
// corresponds to 05:00 UTC.
function getBogotaMidnightTimestamp(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day, 5, 0, 0);
}

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) {
    return '00 - 00 - 00 - 00';
  }

  let totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  totalSeconds -= days * 24 * 60 * 60;
  const hours = Math.floor(totalSeconds / (60 * 60));
  totalSeconds -= hours * 60 * 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(days)} - ${pad(hours)} - ${pad(minutes)} - ${pad(seconds)}`;
}

const todayUTCMinus5 = getTodayInUTCMinus5();

// For each card:
// - Compute its date as CALENDAR_START_DATE + (data-day - 1) days
// - Set data-date to that computed value
// - Button label states:
//   * If the date is today (within range): label "Open"
//   * If the date is in the past or out of range: label "Closed"
//   * If the date is in the future (within range): show countdown "DD - HH - MM - SS"
document.querySelectorAll('.calendar-card').forEach((card) => {
  const dayAttr = card.getAttribute('data-day');
  const dayNumber = parseInt(dayAttr, 10);
  const btn = card.querySelector('.open-btn');

  if (!btn || Number.isNaN(dayNumber)) return;

  // Clear any existing countdown interval attached to this button
  if (btn._countdownInterval) {
    clearInterval(btn._countdownInterval);
    btn._countdownInterval = null;
  }

  const offsetDays = dayNumber - 1;
  const cardDate = addDaysToDateString(CALENDAR_START_DATE, offsetDays);
  card.setAttribute('data-date', cardDate);

  const withinRange = isDateWithinRange(
    cardDate,
    CALENDAR_START_DATE,
    CALENDAR_END_DATE,
  );

  const isToday = cardDate === todayUTCMinus5;
  const isPast = cardDate < todayUTCMinus5;
  const isFuture = cardDate > todayUTCMinus5;

  if (!withinRange || isPast) {
    // Past or outside the configured window
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.textContent = 'Closed';
  } else if (isToday) {
    // Active day (today)
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.textContent = 'Open';
  } else if (isFuture) {
    // Future day within range: show live countdown and keep disabled
    btn.disabled = true;
    btn.classList.add('disabled');

    const targetTs = getBogotaMidnightTimestamp(cardDate);

    const updateCountdown = () => {
      const nowTs = Date.now();
      const diff = targetTs - nowTs;

      if (diff <= 0) {
        // Countdown reached: stop timer; on next page load
        // the "today" logic will take over. For this session,
        // treat it as open.
        clearInterval(btn._countdownInterval);
        btn._countdownInterval = null;
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.textContent = 'Open';
        return;
      }

      btn.textContent = formatCountdown(diff);
    };

    updateCountdown();
    btn._countdownInterval = setInterval(updateCountdown, 1000);
  }
});

// Handle opening modals from calendar cards
document.querySelectorAll('.open-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;

    const modalId = btn.getAttribute('data-modal');
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  });
});

// Handle closing modals via close button
document.querySelectorAll('.close-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  });
});

// Close modal when clicking outside content
document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Attach click events to all opt-in buttons
document.querySelectorAll('.optin-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tagName = btn.getAttribute('data-tag-name');
    const tagValue = btn.getAttribute('data-tag-value');

    // Call the single function you will implement later.
    // You can replace the body of handleOptinClick, or
    // redefine it elsewhere to plug in your own logic.
    handleOptinClick(tagName, tagValue);
  });
});

// Placeholder function for you to implement/replace
async function handleOptinClick(tagName, tagValue) {
  try {
    // Get existing player tags (support both result.data.tags and result.tags)
    const result = await Playtech.API.user.getPlayerTags();
    const tags =
      (result &&
        ((result.data && result.data.tags) || result.tags || [])) ||
      [];

    const normTargetValue = String(tagValue).toLowerCase();
    const normTargetName = String(tagName).toLowerCase();

    // Try to match as flexibly as possible against different field names
    const existingTag = tags.find((tag) => {
      if (!tag) return false;

      const name = String(
        tag.name ?? tag.tagName ?? tag.key ?? ''
      ).toLowerCase();

      const value = String(
        tag.value ?? tag.tagValue ?? tag.val ?? ''
      ).toLowerCase();

      return (
        value === normTargetValue &&
        (name.includes(normTargetName) || normTargetName.includes(name))
      );
    });

    if (existingTag) {
      console.log('User already has the tag', existingTag);
      return;
    }

    // Set the player tag if it does not exist yet
    await Playtech.API.user.setPlayerTags([
      { name: "Player Journey/" + String(tagName).toUpperCase(), value: tagValue, type: 'text' },
    ]);

    console.log('Opt-in clicked (tag set):', { tagName, tagValue });
  } catch (err) {
    console.error('Error in handleOptinClick:', err);
  }
}