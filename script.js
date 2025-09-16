const allowedWeekdays = ["Tuesday", "Friday", "Saturday"];
const fieldData = [];
const scriptUrl = "https://script.google.com/macros/s/AKfycbx8HE_n3lE81SZRc9oqgiNwfq36SWrBxu3yFtv0s5H6qdpepqi7yxepUZE1XaZ9w4dF6w/exec";
let recordId;
let username;

const submitSpinner = document.createElement("div");
submitSpinner.id = "submit-spinner";
submitSpinner.className = "spinner";
submitSpinner.style.display = "none";
document.body.appendChild(submitSpinner);

async function fetchRecord() {
  const res = await fetch(`${scriptUrl}?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  console.log("Fetched record:", data);
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginContainer = document.getElementById("login-container");

  function showLogin() {
    document.getElementById("form-container").style.display = "none";

    loginContainer.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "username-input";
    input.placeholder = "Enter your username";

    const startButton = document.createElement("button");
    startButton.textContent = "Start";

    loginContainer.appendChild(input);
    loginContainer.appendChild(startButton);

    startButton.addEventListener("click", () => {
      const enteredUsername = input.value.trim();
      if (enteredUsername) {
        localStorage.setItem("username", enteredUsername);
        username = enteredUsername;
        loginContainer.remove();
        initializeFormPage();
      } else {
        alert("Please enter a username.");
      }
    });
  }

  function showWelcome(user) {
    document.getElementById("form-container").style.display = "none";

    loginContainer.innerHTML = "";

    const welcomeMsg = document.createElement("div");
    welcomeMsg.textContent = `Welcome, ${user}`;

    const changeUserButton = document.createElement("button");
    changeUserButton.textContent = "Change User";

    loginContainer.appendChild(welcomeMsg);
    loginContainer.appendChild(changeUserButton);

    // Add Start button below welcome message
    const startButton = document.createElement("button");
    startButton.textContent = "Start";
    loginContainer.appendChild(startButton);
    startButton.addEventListener("click", () => {
      loginContainer.remove();
      initializeFormPage();
    });

    changeUserButton.addEventListener("click", () => {
      showLogin();
    });
  }

  username = localStorage.getItem("username");
  if (username) {
    showWelcome(username);
  } else {
    showLogin();
  }
});

async function initializeFormPage() {
  const spinner = document.getElementById("loading-spinner");
  spinner.style.display = "block";
  document.getElementById("form-container").style.display = "block";
  const container = document.getElementById("output");
  container.innerHTML = "";
  fieldData.length = 0;
  document.getElementById("summary-message").textContent = "";
  const record = await fetchRecord();
  const colType = (record && record.col) ? String(record.col).trim() : "";

  (function showInstructionForCol() {
    // Hide all instruction panels first (any element whose id ends with '-instructions')
    document.querySelectorAll("[id$='-instructions']").forEach(el => {
      el.style.display = "none";
    });

    const targetId = colType ? `${colType.replace(/_/g, "-")}-instructions` : "";

    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.style.display = "";
      } else {
        console.warn(`Instruction element with id "${targetId}" not found in DOM.`);
      }
    } else if (colType) {
      console.warn(`No instruction mapping found for colType="${colType}".`);
    }
  })();

  recordId = record.record_id;
  const imageUrls = record.image_urls;

  imageUrls.forEach((url, i) => {
    if (typeof url !== "string" || url.trim() === "") return;

    const div = document.createElement("div");
    div.className = "image-block";

    const label = document.createElement("div");
    label.textContent = "Row " + (i + 1);
    label.style.fontWeight = "bold";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Row " + (i + 1);

    const input = document.createElement("input");
    input.type = "text";
    input.name = `row_${i}`; // <-- Add this
    input.placeholder = "Enter date (DD/MM/YYYY)";
    input.required = true;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = `row_${i}_unreadable`; // <-- Add this
    checkbox.id = `checkbox-${i}`;
    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = checkbox.id;
    checkboxLabel.textContent = " Incomplete/Unreadable";

    const warning = document.createElement("div");
    warning.className = "warning";

    const dayDisplay = document.createElement("div");
    dayDisplay.className = "day-display";

    div.appendChild(label);
    div.appendChild(img);
    div.appendChild(input);
    div.appendChild(checkbox);
    div.appendChild(checkboxLabel);
    div.appendChild(warning);
    div.appendChild(dayDisplay);
    container.appendChild(div);

    fieldData.push({ input, checkbox, warning, dayDisplay });
  });
  spinner.style.display = "none";

  function validateAll(colType) {
    let count = 0;

    switch (colType) {
      case "age": {
        const agePattern = /^(?:EC)?(?:\d+a)?(?:\d+m)?(?:\d+d)?$/i;
        const extractPattern = /^(?:([0-9]+)a)?(?:([0-9]+)m)?(?:([0-9]+)d)?$/;
        const toDays = (y = 0, m = 0, d = 0) => (y * 365) + (m * 30) + d;
        const maxDays = 6 * 365 - 1; // Under 6 years old

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const raw = input.value.trim();
          const val = raw.toLowerCase();
          const isChecked = checkbox.checked;

          // If 'EC' is present but not at the beginning, prompt to move it to the start
          if (/ec/i.test(val) && !/^ec\b/i.test(val)) {
            warning.textContent = "If you include EC, enter it at the beginning of the age (e.g., 'EC1y3m').";
            count++;
            return;
          }

          warning.textContent = "";
          dayDisplay.textContent = "";

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          // Pattern check
          if (!agePattern.test(val) && !isChecked) {
            warning.textContent = "Invalid format. Use 'XaYmZd' with a=años, m=meses, d=días (e.g., '3a', '2a4m', '7m12d').";
            count++;
            return;
          }

          // If it matches, parse components and validate ranges
          if (agePattern.test(val)) {
            const valNoEC = val.replace(/^ec/i, "");
            const match = extractPattern.exec(valNoEC) || [];
            const years = match[1] ? parseInt(match[1], 10) : 0;
            const months = match[2] ? parseInt(match[2], 10) : 0;
            const days = match[3] ? parseInt(match[3], 10) : 0;

            if (months > 12 || days > 31) {
              warning.textContent = "Invalid age: months cannot exceed 12 and days cannot exceed 31.";
              count++;
              return;
            }

            const totalDays = toDays(years, months, days);
            if (totalDays > maxDays) {
              warning.textContent = "The age entered is greater than 5 years 11 months. Are you sure this is correct?";
              count++;
              return;
            }

            // Compare with previous age if present
            if (i > 0) {
              const prevRaw = fieldData[i - 1].input.value.trim().toLowerCase();
              if (agePattern.test(prevRaw)) {
                const prevNoEC = prevRaw.replace(/^ec/i, "");
                const pm = extractPattern.exec(prevNoEC) || [];
                const pYears = pm[1] ? parseInt(pm[1], 10) : 0;
                const pMonths = pm[2] ? parseInt(pm[2], 10) : 0;
                const pDays = pm[3] ? parseInt(pm[3], 10) : 0;
                const prevTotalDays = toDays(pYears, pMonths, pDays);

                if (totalDays < prevTotalDays) {
                  warning.textContent = "The age entered is less than the previous age. Are you sure this is correct?";
                  count++;
                  return;
                }
              }
            }
          }
        });
        break;
      }
      case "date": {
        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = "";

          if (val === "" && !isChecked) return;

          const match = val.match(/^\d{2}\/\d{2}\/\d{4}$/);
          if (!match && !isChecked) {
            warning.textContent = "Invalid format. Use DD/MM/YYYY, including zeros and '20' where necessary.";
            count++;
            return;
          }

          if (match) {
            const [d, m, y] = val.split("/").map(Number);
            const date = new Date(y, m - 1, d);
            if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) {
              warning.textContent = "Invalid calendar date.";
              count++;
              return;
            }
            const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
            if (y < 2016 || y > 2024) {
              warning.textContent = "The date entered is not between 2016 and 2024. Are you sure this is correct?";
              count++;
              return;
            }
            dayDisplay.textContent = "Day of the week: " + weekday;

            if (!allowedWeekdays.includes(weekday)) {
              warning.textContent = "The date entered is not a Tuesday, Friday, or Saturday. Are you sure this is correct?";
              count++;
              return;
            }

            if (i > 0) {
              const prevVal = fieldData[i - 1].input.value.trim();
              const prevMatch = prevVal.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              if (prevMatch) {
                const prevDate = new Date(parseInt(prevMatch[3]), parseInt(prevMatch[2]) - 1, parseInt(prevMatch[1]));
                const prevWeekday = prevDate.toLocaleDateString("en-US", { weekday: "long" });

                if (date < prevDate) {
                  warning.textContent = "The date entered is earlier than the previous date. Are you sure this is correct?";
                  count++;
                  return;
                }

                if (date.getTime() === prevDate.getTime()) {
                  warning.textContent = "The date entered is the same as the previous date. Are you sure this is correct?";
                  count++;
                  return;
                }

                if (weekday !== prevWeekday) {
                  warning.textContent = "The date entered is on a different weekday than the previous date (the previous date was a " + prevWeekday + "). Are you sure this is correct?";
                  count++;
                  return;
                }
              }
            }
          }
        });
        break;
      }
      case "height":
        // TODO: add validation for height
        break;
      case "height_z":
        // TODO: add validation for height_z
        break;
      case "weight":
        // TODO: add validation for weight
        break;
      case "weight_z":
        // TODO: add validation for weight_z
        break;
      case "bmi":
        // TODO: add validation for bmi
        break;
      case "height_age":
        // TODO: add validation for height_age
        break;
      case "signature":
        // TODO: add validation for signature
        break;
      case "weight_age":
        // TODO: add validation for weight_age
        break;
      case "weight_height":
        // TODO: add validation for weight_height
        break;
      case "diagnosis":
        // TODO: add validation for diagnosis
        break;
      case "weight_height_z":
        // TODO: add validation for weight_height_z
        break;
      case "head_circumference":
        // TODO: add validation for head_circumference
        break;
      case "bmi_z":
        // TODO: add validation for bmi_z
        break;
      case "head_cir_z":
        // TODO: add validation for head_cir_z
        break;
      case "height_age_z":
        // TODO: add validation for height_age_z
        break;
      case "weight_age_z":
        // TODO: add validation for weight_age_z
        break;
      default:
        // Unknown colType; no validation rules applied yet
        break;
    }

    document.getElementById("summary-message").textContent = count > 0
      ? `There are ${count} fields with warnings. Please double check that these are correct before submitting.`
      : "";
  }

  fieldData.forEach(({ input, checkbox }) => {
    input.addEventListener("blur", () => {
      const raw = input.value.trim();
      if (/^\d{8}$/.test(raw) && !raw.includes("/")) {
        input.value = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
      }
      validateAll(colType);
    });
    input.addEventListener("change", () => validateAll(colType));
    checkbox.addEventListener("change", () => validateAll(colType));
  });

  startSessionTimers();
}

function startSessionTimers() {
  // 5-minute warning
  setTimeout(() => {
    alert("5 minutes remaining in your session.");
  }, 25 * 60 * 1000);

  // Session expiration
  setTimeout(() => {
    alert("Your session has expired. Please refresh the page to continue.");
    document.getElementById("form-container").style.display = "none";
  }, 30 * 60 * 1000);
}

// Prevent Enter key from submitting the form
document.getElementById("entry-form").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
  }
});

document.getElementById("entry-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    record_id: recordId,
    user_id: username
  };
  formData.forEach((value, key) => payload[key] = value);
  console.log(payload)
  document.getElementById("form-container").style.display = "none";
  document.getElementById("submit-spinner").style.display = "block";
  await fetch(scriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain" }
  });
  alert("Submission successful!");
  e.target.reset();
  // Load next record
  await initializeFormPage();
  document.getElementById("submit-spinner").style.display = "none";
});

// beforeunload listener to cancel record on page close/refresh
window.addEventListener("beforeunload", () => {
  if (!username || !recordId) return;

  navigator.sendBeacon(
    scriptUrl,
    new Blob([JSON.stringify({
      type: "cancel",
      record_id: recordId,
      user_id: username
    })], { type: "text/plain" })
  );
});