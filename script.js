const AIRTABLE_API_KEY = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
const AIRTABLE_BASE_ID = 'appO21PVRA4Qa087I';
const AIRTABLE_TABLE_ID = 'tbl6EeKPsNuEvt5yJ';
let eventsByWorker = {}; // globally available
let isInitialized = false;


async function fetchFieldManagers() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });
  
    const data = await response.json();
  
    const managerSet = new Set();
  
    data.records.forEach(record => {
      const manager = record.fields["field tech"];
      if (manager) managerSet.add(manager);
    });
  
    return [...managerSet].map((name) => ({
        id: name, // Use actual name as ID
        name
      }));
      
  }
  
  async function fetchEventsByWorker() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });
    const data = await response.json();
  
    const eventsMap = {};
  
    data.records.forEach(record => {
      const manager = record.fields["field tech"];
      const startDate = record.fields["FormattedStartDate"];
      const endDate = record.fields["FormattedEndDate"];
      const lotAndCommunity = record.fields["Lot Number and Community/Neighborhood"];
    
      console.log("🧪 Record fields:", record.fields); // <-- See actual field names
      
      if (!manager || !startDate) {
        console.warn("⚠️ Skipping record due to missing manager or startDate", record);
        return;
      }
  
      const title = lotAndCommunity || 'Unknown Lot/Community';
  
      if (!eventsMap[manager]) {
        eventsMap[manager] = [];
      }
  
      // Create an event for each day in the date range
      const start = new Date(startDate);
      const end = new Date(endDate || startDate);
  
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        eventsMap[manager].push({ date: dateStr, title });
      }
      
    });
  
    return eventsMap;
  }
  

  
  const sickWorkerSelect = document.getElementById('sickWorker');
  const replacementWorkerSelect = document.getElementById('replacementWorker');
  const log = document.getElementById('log');
  const calendar = document.getElementById('calendar');
  const calendarBody = document.getElementById('calendarBody');
  
  let workers = []; // global


  function populateDropdowns(workersList) {
    workersList.forEach(worker => {
      const option1 = new Option(worker.name, worker.id);
      const option2 = new Option(worker.name, worker.id);
      sickWorkerSelect.appendChild(option1);
      replacementWorkerSelect.appendChild(option2);
    });
  }
  
  
  async function init() {
    workers = await fetchFieldManagers();
    console.log("✅ Field Managers (workers):", workers); // <-- Log workers
  
    populateDropdowns(workers);
  
    eventsByWorker = await fetchEventsByWorker();
    console.log("✅ Events by Worker:", eventsByWorker); // <-- Log events
  
    isInitialized = true;
  }
  
  
  
  init();

  
  function delegateCalendar() {
    if (!isInitialized) {
      log.style.color = "orange";
      log.textContent = "Still loading data... Please wait.";
      return;
    }
    const sickId = sickWorkerSelect.value;
    const replacementId = replacementWorkerSelect.value;
  
    if (!sickId || !replacementId) {
      log.style.color = "red";
      log.textContent = "Please select both workers.";
      calendar.style.display = "none";
      return;
    }
  
    if (sickId === replacementId) {
      log.style.color = "red";
      log.textContent = "Cannot assign calendar to the same worker.";
      calendar.style.display = "none";
      return;
    }
  
    const sickName = workers.find(w => w.id === sickId).name;
    const replacementName = workers.find(w => w.id === replacementId).name;
  
    log.style.color = "green";
    log.textContent = `✅ ${replacementName} now has access to ${sickName}'s calendar.`;
  
    const sickEvents = eventsByWorker[sickName] || [];
    const replacementEvents = eventsByWorker[replacementName] || [];
  
    const combined = [
      ...sickEvents.map(e => ({ ...e, title: `${sickName}: ${e.title}` })),
      ...replacementEvents.map(e => ({ ...e, title: `${replacementName}: ${e.title}` }))
    ];
  
    renderCalendar(combined);
  }
  
  
  function renderCalendar(events) {
    console.log("Rendering calendar with events:", events); // <-- ✅ add this

    calendarBody.innerHTML = "";
  
    const daysInApril = 30;
    const startDayOfWeek = new Date('2025-04-01').getDay();
    let currentDay = 1;
    let row = "<tr>";
  
    for (let i = 0; i < startDayOfWeek; i++) {
      row += "<td></td>";
    }
  
    for (let i = startDayOfWeek; i < 7; i++) {
      row += `<td>${createDayCell(currentDay, events)}</td>`;
      currentDay++;
    }
  
    row += "</tr>";
    calendarBody.innerHTML += row;
  
    while (currentDay <= daysInApril) {
      row = "<tr>";
      for (let i = 0; i < 7; i++) {
        if (currentDay <= daysInApril) {
          row += `<td>${createDayCell(currentDay, events)}</td>`;
          currentDay++;
        } else {
          row += "<td></td>";
        }
      }
      row += "</tr>";
      calendarBody.innerHTML += row;
    }
  
    calendar.style.display = "block";
  }
  
  function createDayCell(day, events) {
    const dateStr = `2025-04-${day.toString().padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    let cell = `<strong>${day}</strong>`;
    dayEvents.forEach(ev => {
      cell += `<span class="event">${ev.title}</span>`;
    });
    return cell;
  }
  
  