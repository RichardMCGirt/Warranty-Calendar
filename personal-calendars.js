const AIRTABLE_API_KEY = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
const AIRTABLE_BASE_ID = 'appO21PVRA4Qa087I';
const AIRTABLE_TABLE_ID = 'tbl6EeKPsNuEvt5yJ';
const techColorMap = {}; // 🧠 Stores assigned colors per tech
let globalEventsByWorker = {};

const workerCalendarsDiv = document.getElementById('workerCalendars');

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function isMobileDevice() {
  console.log(`📏 Viewport width: ${window.innerWidth}px`);
  return window.innerWidth <= 768;
}



async function fetchEventsByWorker() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  console.log("📡 Fetching data from Airtable...");

  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`
  };

  let allRecords = [];
  let offset = null;

  do {
    const queryParams = offset ? `?offset=${offset}` : "";
    const response = await fetch(`${url}${queryParams}`, { headers });

    if (!response.ok) {
      console.error("❌ Failed to fetch records:", response.statusText);
      break;
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
  } while (offset);

  console.log("✅ Fetched records:", allRecords.length);

  const eventsMap = {};

  allRecords.forEach(record => {
    const eventId = record.id;

    const startDateRaw = record.fields["FormattedStartDate"];
    const endDateRaw = record.fields["FormattedEndDate"];
    const lotAndCommunity = record.fields["Lot Number and Community/Neighborhood"];
    const description = record.fields["Description of Issue"];
    const division = record.fields["Division"];
    const fieldTech = record.fields["field tech"];
const warrantyId = record.fields["Warranty Record ID"];

    if (!division || !startDateRaw) return;

    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw || startDateRaw);

    const time = startDate
      ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    const title = lotAndCommunity || 'Unknown Lot/Community';

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      if (!eventsMap[division]) eventsMap[division] = [];
eventsMap[division].push({ date: dateStr, title, time, description, eventId, fieldTech, warrantyId });
    }
  });

  console.log("🗂️ Grouped events by worker:", eventsMap);
  return eventsMap;
}


function renderCalendars(eventsByWorker) {
  const now = new Date();
  const calendarMonth = now.getMonth();
  const calendarYear = now.getFullYear();

  workerCalendarsDiv.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedWorkers = Object.keys(eventsByWorker)
    .filter(worker => {
      return eventsByWorker[worker].some(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });
    })
    .sort((a, b) => a.localeCompare(b));

  createCalendarDropdown(sortedWorkers, eventsByWorker);

  // Normalize URL param
  const urlParams = new URLSearchParams(window.location.search);
  const divisionFromURL = decodeURIComponent(urlParams.get('division') || '').trim().toLowerCase();
  const eventId = urlParams.get('eventId');

  const visibleEvents = [];

  for (const worker of sortedWorkers) {
    const normalizedWorker = worker.trim().toLowerCase();
    const events = eventsByWorker[worker];
    const filteredEvents = eventId
      ? events
      : events.filter(e => {
          const date = new Date(e.date);
          return date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
        });

    visibleEvents.push(...filteredEvents);

    const calendarWrapper = document.createElement('div');
    calendarWrapper.className = 'calendar-block';
    calendarWrapper.dataset.worker = normalizedWorker;
    calendarWrapper.dataset.month = calendarMonth;
    calendarWrapper.dataset.year = calendarYear;

    const title = document.createElement('h3');
    title.textContent = worker;
    title.style.cursor = 'pointer';
    title.style.color = '#007BFF';

    const nav = document.createElement('div');
    nav.className = 'calendarNav';
    nav.innerHTML = `
      <button class="prevMonth">Previous</button>
      <h1 class="monthYear">${monthNames[calendarMonth]} ${calendarYear}</h1>
      <button class="nextMonth">Next</button>
    `;

    const calendarElement = createCalendar(worker, filteredEvents, calendarMonth, calendarYear);

    calendarElement.style.display = filteredEvents.length > 0 || eventId ? 'block' : 'none';

    title.addEventListener('click', () => {
      calendarElement.style.display = calendarElement.style.display === 'none' ? 'block' : 'none';
    });

    calendarWrapper.appendChild(title);
    calendarWrapper.appendChild(nav);
    calendarWrapper.appendChild(calendarElement);
    workerCalendarsDiv.appendChild(calendarWrapper);
  }

  // Apply saved or URL-selected filter
  const selected = (divisionFromURL || localStorage.getItem('selectedWorkerCalendar') || '').trim().toLowerCase();
  const dropdown = document.getElementById('calendar-nav-dropdown');

  if (dropdown) {
    dropdown.value = selected || '';
  }

  document.querySelectorAll('.calendar-block').forEach(block => {
    const worker = block.dataset.worker;
    block.style.display = (selected === '__show_all__' || !selected || worker === selected)
      ? 'block'
      : 'none';
  });

  if (selected && selected !== '__show_all__') {
    scrollToWorkerCalendar(selected);
  }

const currentlyVisibleWorkers = sortedWorkers.filter(worker => {
  const normalizedWorker = worker.trim().toLowerCase();
  return selected === '__show_all__' || !selected || normalizedWorker === selected;
});

const eventsForVisibleDivisions = currentlyVisibleWorkers.flatMap(worker => 
  eventsByWorker[worker] || []
);

renderTechColorKey(eventsForVisibleDivisions);
  console.log("Rendered calendars for all workers.");
}


function createCalendarDropdown(workers, eventsByWorker) {
  const dropdown = document.createElement('select');
  dropdown.id = 'calendar-nav-dropdown';
  dropdown.style.margin = '1rem 0';
  dropdown.innerHTML = `
    <option value="">🔽 Jump to Calendar</option>
    <option value="__show_all__">Show All</option>
  `;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  workers.forEach(worker => {
    const futureEvents = (eventsByWorker[worker] || []).filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });

    if (futureEvents.length === 0) return;

    const option = document.createElement('option');
    option.value = worker;
    option.textContent = worker;
    dropdown.appendChild(option);
  });
dropdown.addEventListener('change', () => {
  const selected = dropdown.value;
  console.log(`📌 Dropdown changed: selected division = "${selected}"`);

  localStorage.setItem('selectedWorkerCalendar', selected);

  const url = new URL(window.location.href);
  url.searchParams.set('division', selected);
  window.history.replaceState({}, '', url);
  console.log(`🔗 URL updated to: ${url.href}`);

  const allCalendars = document.querySelectorAll('.calendar-block');

  if (!selected) {
    console.log("⚠️ No division selected, skipping display update.");
    return;
  }

  if (selected === '__show_all__') {
    console.log("🗂️ Showing all calendars.");
    allCalendars.forEach(block => block.style.display = 'block');
  } else {
    console.log(`🎯 Showing only calendar for division: ${selected}`);
    allCalendars.forEach(block => {
      const worker = block.dataset.worker;
      block.style.display = (worker.trim().toLowerCase() === selected.trim().toLowerCase()) ? 'block' : 'none';
    });
  }

  // ✅ Delay this to ensure DOM visibility is fully applied
setTimeout(() => {
  const visibleEvents = [];

  document.querySelectorAll('.calendar-block').forEach(block => {
    if (block.style.display === 'none') return;

    const calendarEl = block.querySelector('.calendar-container');
    if (!calendarEl) return;

    const eventLinks = calendarEl.querySelectorAll('.event a');

    eventLinks.forEach(link => {
      const techName = link.dataset.fieldTech;
      if (techName) {
        visibleEvents.push({ fieldTech: techName });
      }
    });
  });

  const uniqueVisibleTechs = Array.from(
    new Set(visibleEvents.map(e => e.fieldTech))
  ).filter(Boolean);

  const filteredVisibleEvents = uniqueVisibleTechs.map(fieldTech => ({ fieldTech }));

  console.log("🎯 Visible techs after dropdown filter:", uniqueVisibleTechs);

  renderTechColorKey(filteredVisibleEvents);

  if (selected !== '__show_all__') {
    scrollToWorkerCalendar(selected);
  }
}, 0);



});



let container = document.getElementById('calendarContainer');
if (!container) {
  container = document.createElement('div');
  container.id = 'calendarContainer';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';

  // Wrap the calendars
  workerCalendarsDiv.parentNode.insertBefore(container, workerCalendarsDiv);
  container.appendChild(dropdown);
  container.appendChild(workerCalendarsDiv);
} else {
  container.insertBefore(dropdown, workerCalendarsDiv);
}
}

function scrollToWorkerCalendar(worker, attempts = 10) {
  const blocks = document.querySelectorAll('.calendar-block');
  const target = Array.from(blocks).find(block =>
    block.dataset.worker?.trim().toLowerCase() === worker.trim().toLowerCase()
  );

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log(`📦 Scrolled into view: ${worker}`);
  } else if (attempts > 0) {
    setTimeout(() => scrollToWorkerCalendar(worker, attempts - 1), 300);
  } else {
    console.warn(`❌ Could not find calendar block for: ${worker} after retries`);
  }
}

function showPopup(eventData) {
  document.getElementById("popupTitle").textContent = eventData.title || "No Title";
  document.getElementById("popupDate").textContent = eventData.displayDate || "Unknown";
  document.getElementById("popupTime").textContent = eventData.time || "N/A";
  document.getElementById("popupDesc").textContent = eventData.description || "No description provided.";

  // 🛠️ Add Field Tech with color badge
  const techSpan = document.getElementById("popupTech");
  if (techSpan) {
    techSpan.textContent = eventData.fieldTech || "Unknown";
    techSpan.style.backgroundColor = getColorForTech(eventData.fieldTech);
  }

  const backdrop = document.getElementById("popupBackdrop");
  const modal = document.getElementById("popupModal");

  backdrop.style.display = "block";
  modal.style.animation = "fadeInUp 0.3s ease forwards";
}

function getColorForTech(tech) {
  if (!tech) return '#666'; // Default if no tech name

  // If already assigned, return the same color
  if (techColorMap[tech]) {
    return techColorMap[tech];
  }

  // Otherwise, generate a random bright color
  const hue = Math.floor(Math.random() * 360);
  const color = `hsl(${hue}, 70%, 50%)`;
  techColorMap[tech] = color;

  return color;
}

function closePopup(event) {
  const backdrop = document.getElementById("popupBackdrop");
  const modal = document.getElementById("popupModal");

  if (!event || event.target === backdrop || event.target.tagName === "BUTTON") {
    modal.style.animation = "fadeOutDown 0.3s ease forwards";
    setTimeout(() => {
      backdrop.style.display = "none";
    }, 300);
  }
}

function createCalendar(worker, events, month, year) {
  const container = document.createElement('div');
  container.className = 'calendar-container';

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const isMobile = isMobileDevice();
  console.log(`📱 Device type: ${isMobile ? 'Mobile (weekly view)' : 'Desktop (monthly view)'}`);

  const today = new Date();
  let startDate, endDate;

  if (isMobile) {
    const dayOfWeek = today.getDay(); // Sunday = 0
    startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek); // Start of week
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // End of week
  } else {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
  }

  console.log(`📆 Rendering calendar for: ${startDate.toDateString()} → ${endDate.toDateString()}`);

  const daysToRender = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    daysToRender.push(new Date(d));
  }

  if (!isMobile) {
    const firstDay = startDate.getDay();
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }
  }

  daysToRender.forEach(dateObj => {
    const day = dateObj.getDate();
    const dateStr = dateObj.toISOString().split("T")[0];
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.innerHTML = `<strong>${day}</strong>`;

    const dayEvents = events.filter(e => e.date === dateStr);
    console.log(`📅 ${dateStr}: ${dayEvents.length} event(s)`);

    dayEvents.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

    dayEvents.forEach(ev => {
      const span = document.createElement('span');
      span.className = 'event';

const link = document.createElement('a');
link.dataset.fieldTech = ev.fieldTech || '';
      if (ev.warrantyId) {
        link.href = `https://warranty-updates.vanirinstalledsales.info/job-details.html?id=${ev.warrantyId}`;
        link.target = "_blank";
      } else {
        link.href = "#";
      }
      link.textContent = `${ev.time ? ev.time + ' - ' : ''}${ev.title}`;

      const techColor = getColorForTech(ev.fieldTech);
      link.style.backgroundColor = techColor;
      link.style.color = '#fff';
      link.style.padding = '2px 6px';
      link.style.borderRadius = '4px';
      link.style.display = 'inline-block';
      link.style.marginTop = '4px';
      link.style.fontWeight = 'bold';
      link.style.textDecoration = 'none';

      span.appendChild(link);

      span.addEventListener('mouseenter', () => {
        const popup = document.createElement('div');
        popup.className = 'hover-popup';
        popup.innerHTML = `
          <strong>${ev.title || 'No Title'}</strong><br>
          ${new Date(ev.date).toLocaleDateString('en-US')}<br>
          ${ev.time || 'No time'}<br>
          <em>Field Tech:</em> ${ev.fieldTech || 'Unknown'}<br>
          ${ev.description || ''}
        `;
        popup.style.backgroundColor = techColor;
        popup.style.color = '#fff';
        popup.style.padding = '10px';
        popup.style.borderRadius = '6px';
        popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        popup.style.position = 'absolute';
        popup.style.zIndex = '9999';

        document.body.appendChild(popup);
        const rect = span.getBoundingClientRect();
        popup.style.left = `${rect.left + window.scrollX + 10}px`;
        popup.style.top = `${rect.top + window.scrollY + 25}px`;

        span._popup = popup;

        console.log(`🟦 Showing popup for: ${ev.title} (${ev.date})`);
      });

      span.addEventListener('mouseleave', () => {
        if (span._popup) {
          span._popup.remove();
          span._popup = null;
          console.log(`⬛ Hiding popup for: ${ev.title}`);
        }
      });

      span.style.cursor = 'pointer';
      cell.appendChild(span);
    });

    grid.appendChild(cell);
  });

  container.appendChild(grid);
  return container;
}

async function updateCalendar() {
const eventsByWorker = await fetchEventsByWorker();
globalEventsByWorker = eventsByWorker; // 🔄 Save for later use
renderCalendars(eventsByWorker);

}

workerCalendarsDiv.addEventListener('click', (e) => {
  if (e.target.classList.contains('prevMonth') || e.target.classList.contains('nextMonth')) {
    const calendarBlock = e.target.closest('.calendar-block');
    if (!calendarBlock) return;

    let month = parseInt(calendarBlock.dataset.month, 10);
    let year = parseInt(calendarBlock.dataset.year, 10);

    if (isNaN(month) || isNaN(year)) {
      console.warn("❌ Invalid month or year from dataset:", calendarBlock.dataset);
      return;
    }

    if (e.target.classList.contains('prevMonth')) {
      if (month === 0) {
        month = 11;
        year--;
      } else {
        month--;
      }
    }

    if (e.target.classList.contains('nextMonth')) {
      if (month === 11) {
        month = 0;
        year++;
      } else {
        month++;
      }
    }

    calendarBlock.dataset.month = month;
    calendarBlock.dataset.year = year;

    const monthHeader = calendarBlock.querySelector('.monthYear');
    if (monthHeader) {
      monthHeader.textContent = `${monthNames[month]} ${year}`;
    } else {
      console.warn("❌ Could not find .monthYear header to update!");
    }

    const worker = calendarBlock.querySelector('h3')?.textContent;
    if (!worker) return;

    fetchEventsByWorker().then(eventsByWorker => {
      const filteredEvents = eventsByWorker[worker]?.filter(e => {
        const date = new Date(e.date);
        return date.getMonth() === month && date.getFullYear() === year;
      }) || [];

      const calendarEl = calendarBlock.querySelector('.calendar-container');
      if (calendarEl) {
        calendarEl.replaceWith(createCalendar(worker, filteredEvents, month, year));
      }
    });
  }
});

(async () => {
  const eventsByWorker = await fetchEventsByWorker();
  renderCalendars(eventsByWorker); // this already calls renderTechColorKey()

  if (isMobileDevice()) {
    const firstBlock = document.querySelector('.calendar-block');
    if (firstBlock) {
      console.log("📱 Auto-scrolling to first calendar block...");
      firstBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();


function renderTechColorKey(eventsForVisibleDivisions = []) {
  console.log("🎨 Rendering Tech Color Key...");
  console.log("📦 Received events:", eventsForVisibleDivisions.length);

  const existing = document.getElementById('techColorKey');
  if (existing) {
    console.log("🔁 Removing existing tech color key...");
    existing.remove();
  }

  const uniqueTechs = new Set();
  eventsForVisibleDivisions.forEach(ev => {
    if (ev.fieldTech) {
      uniqueTechs.add(ev.fieldTech);
      console.log(`➕ Found tech: ${ev.fieldTech}`);
    }
  });

  if (uniqueTechs.size === 0) {
    console.warn("⚠️ No field techs to display in key.");
    return;
  }

  console.log(`✅ Unique field techs to show: ${[...uniqueTechs].join(', ')}`);

  const keyContainer = document.createElement('div');
  keyContainer.id = 'techColorKey';
  keyContainer.style.display = 'flex';
  keyContainer.style.flexWrap = 'wrap';
  keyContainer.style.gap = '12px';
  keyContainer.style.margin = '1rem 0';
  keyContainer.style.padding = '10px';
  keyContainer.style.border = '1px solid #ccc';
  keyContainer.style.borderRadius = '6px';
  keyContainer.style.backgroundColor = '#f9f9f9';

  const heading = document.createElement('h4');
  heading.textContent = 'Field Tech Color Key';
  heading.style.width = '100%';
  heading.style.margin = '0 0 10px';
  heading.style.fontWeight = 'bold';
  keyContainer.appendChild(heading);

  uniqueTechs.forEach(tech => {
    const color = getColorForTech(tech);
    console.log(`🎨 Assigning color "${color}" to tech "${tech}"`);

    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '6px';

    const swatch = document.createElement('div');
    swatch.style.width = '16px';
    swatch.style.height = '16px';
    swatch.style.borderRadius = '4px';
    swatch.style.backgroundColor = color;
    swatch.style.border = '1px solid #000';

    const label = document.createElement('span');
    label.textContent = tech;

    item.appendChild(swatch);
    item.appendChild(label);
    keyContainer.appendChild(item);
  });

  const container = document.getElementById('calendarContainer');
  if (container) {
    console.log("📍 Inserting color key above calendar container.");
    container.parentNode.insertBefore(keyContainer, container);
  } else {
    console.error("❌ Could not find #calendarContainer to insert key.");
  }
}

