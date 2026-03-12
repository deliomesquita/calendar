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

// Utility to add days to a YYYY-MM-DD string (treated in UTC)
function addDaysToDateString(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${dd}`;
}

// Returns true if dateStr is between start and end (inclusive)
function isDateWithinRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr;
}

const todayUTCMinus5 = getTodayInUTCMinus5();

// For each card:
// - Compute its date as CALENDAR_START_DATE + (data-day - 1) days
// - Set data-date to that computed value
// - Enable the button only if:
//   * the card's date is within [CALENDAR_START_DATE, CALENDAR_END_DATE], and
//   * the card's date is equal to today's date in UTC-5
document.querySelectorAll('.calendar-card').forEach((card) => {
  const dayAttr = card.getAttribute('data-day');
  const dayNumber = parseInt(dayAttr, 10);
  const btn = card.querySelector('.open-btn');

  if (!btn || Number.isNaN(dayNumber)) return;

  const offsetDays = dayNumber - 1;
  const cardDate = addDaysToDateString(CALENDAR_START_DATE, offsetDays);
  card.setAttribute('data-date', cardDate);

  const withinRange = isDateWithinRange(
    cardDate,
    CALENDAR_START_DATE,
    CALENDAR_END_DATE
  );
  const isToday = cardDate === todayUTCMinus5;

  if (withinRange && isToday) {
    btn.disabled = false;
    btn.classList.remove('disabled');
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
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