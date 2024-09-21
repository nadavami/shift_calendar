function addDays(date, days) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function calculateWorkDays(startDate, endYear, pattern, patternIndex) {
  const events = [];
  let currentDate = new Date(startDate);

  while (currentDate.getFullYear() <= endYear) {
    const currentPattern = pattern[patternIndex];

    if (currentDate.getFullYear() > endYear) {
      break;
    }

    const eventStart = new Date(currentDate);
    const sequenceInfo = `Sequence ${patternIndex + 1}: ${
      currentPattern.on
    } on, ${currentPattern.off} off`;

    const eventEnd = addDays(currentDate, currentPattern.on);
    currentDate = new Date(eventEnd);

    events.push({
      start: eventStart,
      end: eventEnd,
      sequence: sequenceInfo,
    });

    if (currentDate.getFullYear() <= endYear) {
      currentDate = addDays(currentDate, currentPattern.off);
    }

    patternIndex = (patternIndex + 1) % pattern.length;
  }

  return events;
}

function formatICalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function createICal(events, eventName) {
  const header = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Shift Calendar//EN\n";
  const body = events
    .map((event) => {
      return (
        "BEGIN:VEVENT\n" +
        `DTSTART;VALUE=DATE:${formatICalDate(event.start)}\n` +
        `DTEND;VALUE=DATE:${formatICalDate(event.end)}\n` +
        `SUMMARY:${eventName}\n` +
        `DESCRIPTION:${event.sequence}\n` +
        "END:VEVENT"
      );
    })
    .join("\n");
  const footer = "END:VCALENDAR";

  return `${header}${body}${footer}`;
}

function renderCalendar(events) {
  const previewContainer = document.getElementById("preview-calendar");
  previewContainer.innerHTML = "";

  const previewTitle = document.createElement("h2");
  previewTitle.textContent = "Calendar Preview";
  previewContainer.appendChild(previewTitle);

  if (events.length === 0) {
    previewContainer.textContent = "No events to display.";
    return;
  }

  const firstEvent = events[0];
  let startYear = firstEvent.start.getFullYear();
  let startMonth = firstEvent.start.getMonth();

  const calendarWrapper = document.createElement("div");
  calendarWrapper.classList.add("calendar-wrapper");
  previewContainer.appendChild(calendarWrapper);

  const monthsToRender = 12;
  const eventEnd = events[events.length - 1].end;

  const endYear = eventEnd.getFullYear();
  const endMonth = eventEnd.getMonth();

  for (let i = 0; i < monthsToRender; i++) {
    const currentYear = startYear + Math.floor((startMonth + i) / 12);
    const currentMonth = (startMonth + i) % 12;

    // Stop rendering if we've passed the end of the sequence
    if (
      currentYear > endYear ||
      (currentYear === endYear && currentMonth > endMonth)
    ) {
      break;
    }

    const monthWrapper = document.createElement("div");
    monthWrapper.classList.add("calendar-container");

    const monthHeader = document.createElement("div");
    monthHeader.classList.add("month-header");
    monthHeader.textContent = new Date(
      currentYear,
      currentMonth
    ).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    monthWrapper.appendChild(monthHeader);

    const daysGrid = document.createElement("div");
    daysGrid.classList.add("calendar-grid");

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach((day) => {
      const dayLabel = document.createElement("div");
      dayLabel.classList.add("calendar-day-label");
      dayLabel.textContent = day;
      daysGrid.appendChild(dayLabel);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Fill empty cells before the first day of the month
    for (let j = 0; j < firstDay; j++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("calendar-day");
      daysGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.classList.add("calendar-day");
      const currentDay = new Date(currentYear, currentMonth, day);

      const isShiftDay = events.some((event) => {
        return currentDay >= event.start && currentDay <= event.end;
      });

      if (isShiftDay) {
        dayCell.classList.add("shift-day");
      }

      dayCell.textContent = day;
      daysGrid.appendChild(dayCell);
    }

    monthWrapper.appendChild(daysGrid);
    calendarWrapper.appendChild(monthWrapper);
  }
}

function addPatternRow(defaultRow = false) {
  const tableBody = document.querySelector("#pattern-table tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
        <td><input type="number" name="on-days" placeholder="Days" required></td>
        <td><input type="number" name="off-days" placeholder="Days" required></td>
        <td>
            <input type="radio" name="pattern-index" ${
              defaultRow ? "checked" : ""
            }>
        </td>
        <td><button type="button" class="remove-row-btn">Remove</button></td>
    `;

  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    if (tableBody.querySelectorAll("tr").length > 1) {
      row.remove();
    } else {
      alert("There must be at least one shift pattern.");
    }
  });

  tableBody.appendChild(row);
}

document.addEventListener("DOMContentLoaded", () => addPatternRow(true));

document
  .getElementById("add-row-btn")
  .addEventListener("click", () => addPatternRow());

document.getElementById("shift-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const startDate = new Date(
    `${document.getElementById("start-date").value}T00:00:00`
  );
  const endYear =
    document.getElementById("end-year").value || startDate.getFullYear();
  const eventName = document.getElementById("event-name").value;

  const rows = document.querySelectorAll("#pattern-table tbody tr");
  const pattern = Array.from(rows).map((row) => {
    return {
      on: parseInt(row.querySelector('input[name="on-days"]').value),
      off: parseInt(row.querySelector('input[name="off-days"]').value),
    };
  });

  const patternIndex = Array.from(
    document.querySelectorAll('input[name="pattern-index"]')
  ).findIndex((radio) => radio.checked);

  const events = calculateWorkDays(startDate, endYear, pattern, patternIndex);

  renderCalendar(events);

  const icalData = createICal(events, eventName);
  const blob = new Blob([icalData], { type: "text/calendar" });
  const link = document.getElementById("download-link");
  link.href = URL.createObjectURL(blob);
  link.download = "shift-calendar.ics";
  link.style.display = "block";
});
