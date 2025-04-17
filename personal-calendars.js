const AIRTABLE_API_KEY = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
const AIRTABLE_BASE_ID = 'appO21PVRA4Qa087I';
const AIRTABLE_TABLE_ID = 'tbl6EeKPsNuEvt5yJ';
const techColorMap = {}; // 🧠 Stores assigned colors per tech

const workerCalendarsDiv = document.getElementById('workerCalendars');



const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
      eventsMap[division].push({ date: dateStr, title, time, description, eventId, fieldTech });
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
  const sortedWorkers = Object.keys(eventsByWorker).sort((a, b) => a.localeCompare(b));
  createCalendarDropdown(sortedWorkers);

  const urlParams = new URLSearchParams(window.location.search);
  const divisionFromURL = urlParams.get('division');
  if (divisionFromURL) {
    localStorage.setItem('selectedWorkerCalendar', divisionFromURL); // so it auto-filters
  }
  const eventId = urlParams.get('eventId');

  for (const worker of sortedWorkers) {
    const events = eventsByWorker[worker];
    const filteredEvents = eventId
      ? events
      : events.filter(e => {
          const date = new Date(e.date);
          return date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
        });

    const calendarWrapper = document.createElement('div');
    calendarWrapper.className = 'calendar-block';
    calendarWrapper.dataset.month = calendarMonth;
    calendarWrapper.dataset.year = calendarYear;
    calendarWrapper.dataset.worker = worker;

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

    if (eventId) {
      calendarElement.style.display = filteredEvents.some(ev => ev.eventId === eventId) ? 'block' : 'none';
    } else {
      calendarElement.style.display = 'block';
    }

    if (filteredEvents.length === 0) {
      calendarElement.style.display = 'none';
    }

    title.addEventListener('click', () => {
      calendarElement.style.display = calendarElement.style.display === 'none' ? 'block' : 'none';
    });

    calendarWrapper.appendChild(title);
    calendarWrapper.appendChild(nav);
    calendarWrapper.appendChild(calendarElement);
    workerCalendarsDiv.appendChild(calendarWrapper);
  }

  // ✅ Make sure savedWorker is declared first
  const savedWorker = localStorage.getItem('selectedWorkerCalendar');
  if (savedWorker) {
    const dropdown = document.getElementById('calendar-nav-dropdown');
    if (dropdown) dropdown.value = savedWorker;

    const allCalendars = document.querySelectorAll('.calendar-block');
    allCalendars.forEach(block => {
      const worker = block.dataset.worker;
      block.style.display = (savedWorker === '__show_all__' || worker === savedWorker) ? 'block' : 'none';
    });

    const target = document.querySelector(`.calendar-block[data-worker="${savedWorker}"]`);
    if (target && savedWorker !== '__show_all__') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  console.log("Rendered calendars for all workers.");
}



function createCalendarDropdown(workers) {
  const dropdown = document.createElement('select');
  dropdown.id = 'calendar-nav-dropdown';
  dropdown.style.margin = '1rem 0';
  dropdown.innerHTML = `
    <option value="">🔽 Jump to Calendar</option>
    <option value="__show_all__">Show All</option>
  `;

  workers.forEach(worker => {
    const option = document.createElement('option');
    option.value = worker;
    option.textContent = worker;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener('change', () => {
    const selected = dropdown.value;
  
    // ✅ Save to localStorage
    localStorage.setItem('selectedWorkerCalendar', selected);
  
    const allCalendars = document.querySelectorAll('.calendar-block');
  
    if (!selected) return;
  
    if (selected === '__show_all__') {
      allCalendars.forEach(block => block.style.display = 'block');
    } else {
      allCalendars.forEach(block => {
        const worker = block.dataset.worker;
        block.style.display = (worker === selected) ? 'block' : 'none';
      });
  
      const target = document.querySelector(`.calendar-block[data-worker="${selected}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
  

  workerCalendarsDiv.before(dropdown);
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

function createEventPageLink(eventData) {
  const eventId = eventData.eventId;
  const division = encodeURIComponent(eventData.division || '');
  const eventUrl = `https://calendar.vanirinstalledsales.info/?eventId=${eventId}&division=${encodeURIComponent(division)}`;
  return eventUrl;
}



function createCalendar(worker, events, month, year) {
  const container = document.createElement('div');
  container.className = 'calendar-container';

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = date.getDay();

  for (let i = 0; i < startDay; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    cell.innerHTML = `<strong>${day}</strong>`;

    const dayEvents = events.filter(e => e.date === dateStr);
    dayEvents.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

    dayEvents.forEach(ev => {
      const span = document.createElement('span');
      span.className = 'event';
    
      const eventLink = createEventPageLink(ev);
      const link = document.createElement('a');
      link.href = eventLink;
      link.textContent = `${ev.time ? ev.time + ' - ' : ''}${ev.title}`;
    
      // 🎨 Add dynamic color based on Field Tech
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
    
      // 🪄 Add hover popup to show full info + Field Tech
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
      });
    
      span.addEventListener('mouseleave', () => {
        if (span._popup) {
          span._popup.remove();
          span._popup = null;
        }
      });
    
      span.style.cursor = 'pointer';
      span.addEventListener('click', () => {
        showPopup(ev);
      });
    
      cell.appendChild(span);
    });
    
    
    
    

    grid.appendChild(cell);
  }

  container.appendChild(grid);
  return container;
}



async function updateCalendar() {
  const eventsByWorker = await fetchEventsByWorker();
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




// 👇 This block should already be in your code
(async () => {
  const eventsByWorker = await fetchEventsByWorker();
  renderCalendars(eventsByWorker);
})();
