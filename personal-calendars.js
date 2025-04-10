const AIRTABLE_API_KEY = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
const AIRTABLE_BASE_ID = 'appO21PVRA4Qa087I';
const AIRTABLE_TABLE_ID = 'tbl6EeKPsNuEvt5yJ';

const workerCalendarsDiv = document.getElementById('workerCalendars');
let currentMonth = new Date().getMonth();  // Default to current month
let currentYear = new Date().getFullYear();  // Default to current year

async function fetchEventsByWorker() {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  console.log("Fetching data from Airtable...");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`
    }
  });

  const data = await response.json();
  console.log("Fetched records:", data.records.length);

  const eventsMap = {};

  data.records.forEach(record => {
    const eventId = record.id;  // Use Airtable's record ID as eventId

    const startDateRaw = record.fields["FormattedStartDate"];
    const endDateRaw = record.fields["FormattedEndDate"];
    const lotAndCommunity = record.fields["Lot Number and Community/Neighborhood"];
    const description = record.fields["Description of Issue"];
    const manager = record.fields["field tech"];
    
    if (!manager || !startDateRaw) return;
    
    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw || startDateRaw);
    
    const time = startDateRaw
      ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

    const title = lotAndCommunity || 'Unknown Lot/Community';
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      if (!eventsMap[manager]) eventsMap[manager] = [];
      eventsMap[manager].push({ date: dateStr, title, time, description, eventId: eventId  });
    }
  });

  console.log("Grouped events by worker:", eventsMap);
  return eventsMap;
}

function renderCalendars(eventsByWorker) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthYear = `${monthNames[currentMonth]} ${currentYear}`;
  document.getElementById("monthYear").textContent = monthYear;

  workerCalendarsDiv.innerHTML = ''; // Clear existing calendars

  // Sort workers (field techs) alphabetically by first name
  const sortedWorkers = Object.keys(eventsByWorker).sort((a, b) => a.localeCompare(b));

  // Get eventId from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId'); // Get the event ID from the query string

  // Iterate over sorted workers
  for (const worker of sortedWorkers) {
    const events = eventsByWorker[worker];

    const filteredEvents = events.filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'calendar-block';

    const title = document.createElement('h3');
    title.textContent = `${worker}`;
    title.style.cursor = 'pointer';
    title.style.color = '#007BFF';
    
    const calendarElement = createCalendar(worker, filteredEvents, currentMonth, currentYear);

    // Check if the current worker's calendar is the one to show
    if (eventId) {
      // Check if any of the events match the eventId
      const eventMatches = filteredEvents.some(ev => ev.eventId === eventId);
      if (eventMatches) {
        // Show only this calendar if it contains the eventId
        calendarElement.style.display = 'block';
      } else {
        // Hide this calendar if it doesn't contain the eventId
        calendarElement.style.display = 'none';
      }
    } else {
      // If no eventId, show all calendars by default
      calendarElement.style.display = 'block';
    }

    title.addEventListener('click', () => {
      calendarElement.style.display = calendarElement.style.display === 'none' ? 'block' : 'none';
    });

    if (filteredEvents.length === 0) {
      calendarElement.style.display = 'none';
    }

    calendarContainer.appendChild(title);
    calendarContainer.appendChild(calendarElement);
    workerCalendarsDiv.appendChild(calendarContainer);
  }

  console.log("Rendered calendars for all workers.");
}



function showPopup(eventData) {
  document.getElementById("popupTitle").textContent = eventData.title || "No Title";
  document.getElementById("popupDate").textContent = eventData.displayDate || "Unknown";
  document.getElementById("popupTime").textContent = eventData.time || "N/A";
  document.getElementById("popupDesc").textContent = eventData.description || "No description provided.";

  const backdrop = document.getElementById("popupBackdrop");
  const modal = document.getElementById("popupModal");

  backdrop.style.display = "block";
  modal.style.animation = "fadeInUp 0.3s ease forwards";
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
  const eventId = eventData.eventId; // The unique ID of your event
  
  // Log eventId to make sure it exists
  console.log("Event ID:", eventId);

  // Use live URL for the deployed site
  const eventUrl = `https://richardmcgirt.github.io/proofofconcept/personal-calendars.html?eventId=${eventId}`;  // Redirect to the event page with the event ID as a query parameter
  
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

    dayEvents.forEach(ev => {
      const span = document.createElement('span');
      span.className = 'event';
    
      const eventLink = createEventPageLink(ev);
      const link = document.createElement('a');
      link.href = eventLink;
      link.target = '_blank';
      link.textContent = `${ev.time ? ev.time + ' - ' : ''}${ev.title}`;
      span.appendChild(link);
    
      // Add hover popup
      span.addEventListener('mouseenter', () => {
        const popup = document.createElement('div');
        popup.className = 'hover-popup';
        popup.innerHTML = `
          <strong>${ev.title || 'No Title'}</strong><br>
${new Date(ev.date).toLocaleDateString('en-US')}<br>
          ${ev.time || 'No time'}<br>
          ${ev.description || ''}
        `;
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
    
      // Keep the existing click behavior
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

// Handle month navigation
document.getElementById("prevMonth").addEventListener("click", () => {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear--;
  } else {
    currentMonth--;
  }
  updateCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear++;
  } else {
    currentMonth++;
  }
  updateCalendar();
});

async function updateCalendar() {
  const eventsByWorker = await fetchEventsByWorker();
  renderCalendars(eventsByWorker);
}

(async () => {
  const eventsByWorker = await fetchEventsByWorker();
  renderCalendars(eventsByWorker);
})();
