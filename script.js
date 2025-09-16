const allowedWeekdays = ["Tuesday", "Friday", "Saturday"];
const fieldData = [];
const scriptUrl = "https://script.google.com/macros/s/AKfycbyAe-BfmODSLQz8TxpzTD7vs63jC2A1P63vWUc4pLlOjXy6rHq3jXFR0IO-yTcrlgysvw/exec";
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
    input.name = `row_${i}`;
    // Set placeholder based on colType
    let placeholderText = "Enter value";
    switch (colType) {
      case "date":
        placeholderText = "Enter date (DD/MM/YYYY)";
        break;
      case "age":
        placeholderText = "Enter age as XaYmZd (use EC at start if needed)";
        break;
      case "height":
        placeholderText = "Enter height in cm (e.g., 45 or 45,5)";
        break;
      case "bmi":
        placeholderText = "Enter BMI (e.g., 17,3)";
        break;
      case "head_circumference":
        placeholderText = "Enter head circumference in cm (e.g., 34,5)";
        break;
      case "height_z":
      case "weight_z":
      case "bmi_z":
      case "head_cir_z":
      case "height_age_z":
      case "weight_age_z":
      case "weight_height_z":
        placeholderText = "Enter z-score (include minus sign for negatives, e.g., -1,5)";
        break;
      default:
        placeholderText = "Enter value";
    }
    input.placeholder = placeholderText;
    input.required = true;

    // Add hidden input for unchecked state
    const hiddenCheckbox = document.createElement("input");
    hiddenCheckbox.type = "hidden";
    hiddenCheckbox.name = `row_${i}_unreadable`;
    hiddenCheckbox.value = "0";
    div.appendChild(hiddenCheckbox);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = `row_${i}_unreadable`;
    checkbox.id = `checkbox-${i}`;
    checkbox.value = "1";
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
      case "height": {
        const heightPattern = /^\d+,?\d*$/; // e.g., 45 or 45,5 (comma as decimal)

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = ""; // not used for height but cleared for consistency

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          const match = val.match(heightPattern);
          if (!match && !isChecked) {
            warning.textContent = "Invalid format. Enter a number in centimeters, optionally with a comma for decimals (e.g., '45' or '45,5').";
            count++;
            return;
          }

          if (match) {
            // Convert comma decimal to dot for parsing
            const h = parseFloat(val.replace(",", "."));

            if (!Number.isFinite(h)) {
              warning.textContent = "Invalid height value.";
              count++;
              return;
            }

            if (h > 120) {
              warning.textContent = "The height entered is greater than 120 cm. Are you sure this is correct?";
              count++;
              return;
            }

            if (h < 30) {
              warning.textContent = "The height entered is less than 30 cm. Are you sure this is correct?";
              count++;
              return;
            }

            // Compare with previous height if present and valid
            if (i > 0) {
              const prevVal = fieldData[i - 1].input.value.trim();
              const prevMatch = prevVal.match(heightPattern);
              if (prevMatch) {
                const prevH = parseFloat(prevVal.replace(",", "."));
                if (Number.isFinite(prevH) && prevH > 0) {
                  const relChange = Math.abs(h - prevH) / prevH;
                  if (relChange > 0.5) {
                    warning.textContent = "The height entered differs by more than 50% from the previous height. Are you sure this is correct?";
                    count++;
                    return;
                  }
                }
              }
            }
          }
        });
        break;
      }
      case "height_z":
      case "weight_z":
      case "bmi_z":
      case "head_cir_z":
      case "height_age_z":
      case "weight_age_z":
      case "weight_height_z": {
        const zPattern = /^-?\d+,\d+$/; // allow minus, comma decimal
        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = "";

          if (val === "" && !isChecked) return;

          // Enforce user-stated pattern "^\d+,\d+$" while accepting minus for negatives
          const matchesStrict = /^\d+,\d+$/.test(val);
          const matchesWithMinus = zPattern.test(val);
          if (!matchesWithMinus && !isChecked) {
            warning.textContent = "Invalid format. Enter a number with a comma as the decimal separator (e.g., '1,5').";
            count++;
            return;
          }

          // Parse replacing comma with dot, keep sign if present
          const z = parseFloat(val.replace(",", "."));
          if (!Number.isFinite(z)) {
            warning.textContent = "Invalid z-score value.";
            count++;
            return;
          }

          if (Math.abs(z) >= 3) {
            warning.textContent = "The z-score entered is greater than 3 or smaller than -3. Are you sure this is correct?";
            count++;
            return;
          }

          // Compare with previous z-score if present and valid
          if (i > 0) {
            const prevVal = fieldData[i - 1].input.value.trim();
            if (zPattern.test(prevVal)) {
              const prevZ = parseFloat(prevVal.replace(",", "."));
              if (Number.isFinite(prevZ)) {
                const delta = Math.abs(z - prevZ);
                if (delta > 0.5) {
                  warning.textContent = "The z-score entered differs by more than 0,5 from the previous z-score. Are you sure this is correct?";
                  count++;
                  return;
                }
              }
            }
          }
        });
        break;
      }
      case "weight": {
        const weightPattern = /^\d+,?\d*$/; // e.g., 3 or 3,5 (comma as decimal)

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = ""; // not used for weight but cleared for consistency

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          const match = val.match(weightPattern);
          if (!match && !isChecked) {
            warning.textContent = "Invalid format. Enter a number, optionally with a comma for decimals (e.g., '3' or '3,5').";
            count++;
            return;
          }

          if (match) {
            // Convert comma decimal to dot for parsing
            const w = parseFloat(val.replace(",", "."));

            if (!Number.isFinite(w)) {
              warning.textContent = "Invalid weight value.";
              count++;
              return;
            }

            if (w > 25) {
              warning.textContent = "The weight entered is greater than 25. Are you sure this is correct?";
              count++;
              return;
            }

            if (w < 1) {
              warning.textContent = "The weight entered is less than 1. Are you sure this is correct?";
              count++;
              return;
            }

            // Compare with previous weight if present and valid
            if (i > 0) {
              const prevVal = fieldData[i - 1].input.value.trim();
              const prevMatch = prevVal.match(weightPattern);
              if (prevMatch) {
                const prevW = parseFloat(prevVal.replace(",", "."));
                if (Number.isFinite(prevW) && prevW > 0) {
                  const relChange = Math.abs(w - prevW) / prevW;
                  if (relChange > 0.5) {
                    warning.textContent = "The weight entered differs by more than 50% from the previous weight. Are you sure this is correct?";
                    count++;
                    return;
                  }
                }
              }
            }
          }
        });
        break;
      }
      case "bmi": {
        const bmiPattern = /^\d+(?:,\d+)?$/; // allow integer or comma-decimal, e.g., 17 or 17,3

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = ""; // not used for BMI but cleared for consistency

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          // Format check: must be digits, optionally comma and digits
          if (!bmiPattern.test(val) && !isChecked) {
            warning.textContent = "Invalid format. Enter BMI as an integer or with a comma as the decimal separator (e.g., '17' or '17,3').";
            count++;
            return;
          }

          if (bmiPattern.test(val)) {
            const bmi = parseFloat(val.replace(",", "."));
            if (!Number.isFinite(bmi)) {
              warning.textContent = "Invalid BMI value.";
              count++;
              return;
            }

            // Typical pediatric range: 9,0 to 30,0
            if (bmi < 9) {
              warning.textContent = "The BMI entered is less than 9,0. Are you sure this is correct?";
              count++;
              return;
            }
            if (bmi > 30) {
              warning.textContent = "The BMI entered is greater than 30,0. Are you sure this is correct?";
              count++;
              return;
            }

            // Compare with previous BMI if present and valid (rarely fluctuates > 2,0)
            if (i > 0) {
              const prevVal = fieldData[i - 1].input.value.trim();
              if (bmiPattern.test(prevVal)) {
                const prev = parseFloat(prevVal.replace(",", "."));
                if (Number.isFinite(prev)) {
                  const delta = Math.abs(bmi - prev);
                  if (delta >= 2.0) {
                    warning.textContent = "The BMI entered differs by 2,0 or more from the previous BMI. Are you sure this is correct?";
                    count++;
                    return;
                  }
                }
              }
            }
          }
        });
        break;
      }
      case "height_age":
      case "weight_age":
      case "weight_height": {
        // Percentile transcription: allow plain number (e.g., 95 or 97,5) or cutoff like ">P90" or "<P3". No percent sign allowed.
        const numericPattern = /^\d+(?:,\d+)?$/;            // 95 or 97,5
        const cutoffPattern  = /^(?:[<>]?P\d+(?:,\d+)?)$/i;  // >P90, <P3, >P97,5

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }) => {
          const raw = input.value.trim();
          const val = raw; // keep original case for messaging, but regexes are case-insensitive where needed
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = "";

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          // Disallow percent signs: user should enter just the number for percentages
          if (/%/.test(val)) {
            warning.textContent = "Do not include the percent sign; enter just the number (e.g., '95' not '95%').";
            count++;
            return;
          }

          // Enforce comma as decimal separator
          if (/\d+\.\d+/.test(val)) {
            warning.textContent = "Invalid format. Use a comma as the decimal separator (e.g., '97,5' not '97.5').";
            count++;
            return;
          }

          // Validate formats: numeric percentile or cutoff with comparator and 'P'
          if (numericPattern.test(val)) {
            const num = parseFloat(val.replace(",", "."));
            if (!Number.isFinite(num)) {
              warning.textContent = "Invalid percentile value.";
              count++;
              return;
            }
            // Typical valid range 1–99
            if (num < 0 || num > 100) {
              warning.textContent = "Invalid percentile. Percentile must be beween 0 and 100.";
              count++;
              return;
            }
            // Otherwise OK
            return;
          }

          if (cutoffPattern.test(val)) {
            // Extract the number after 'P'
            const cutNumStr = val.replace(/^.*P/i, "");
            const cutNum = parseFloat(cutNumStr.replace(",", "."));
            if (!Number.isFinite(cutNum)) {
              warning.textContent = "Invalid cutoff value after 'P'.";
              count++;
              return;
            }
            if (cutNum < 1 || cutNum > 99) {
              warning.textContent = "The cutoff percentile after 'P' should be between 1 and 99. Are you sure this is correct?";
              count++;
              return;
            }
            // Otherwise OK
            return;
          }

          // If we reach here, the format is invalid
          warning.textContent = "Invalid format. Enter a number (e.g., '95' or '97,5') or a cutoff using >P, <P, or P (e.g., '>P90', '<P3', 'P3').";
          count++;
          return;
        });
        break;
      }
      case "signature":
        // TODO: add validation for signature
        break;
      case "diagnosis": {
        const dxPattern = /^(?:DG|DM|DL|DC|E|SP|S|O)-(?:TN|DT|BT|BTG)$/; // e.g., DC-DT

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }) => {
          const raw = input.value.trim();
          const val = raw.toUpperCase();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = "";

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          if (!dxPattern.test(val) && !isChecked) {
            warning.textContent = "Invalid format. Enter a diagnosis like 'DC-DT'. Allowed codes: DG, DM, DL, DC, E, SP, S, O for the first part; TN, DT, BT, BTG for the second.";
            count++;
            return;
          }
        });
        break;
      }
      case "head_circumference": {
        const hcPattern = /^\d+(?:,\d+)?$/; // integer or comma-decimal, e.g., 34 or 34,5

        fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
          const val = input.value.trim();
          const isChecked = checkbox.checked;
          warning.textContent = "";
          dayDisplay.textContent = ""; // not used for HC but cleared for consistency

          // Allow empty if not checked
          if (val === "" && !isChecked) return;

          // Format check: number with optional comma-decimal, no units
          if (!hcPattern.test(val) && !isChecked) {
            warning.textContent = "Invalid format. Enter the number only, using a comma as the decimal separator (e.g., '34,5').";
            count++;
            return;
          }

          if (hcPattern.test(val)) {
            const hc = parseFloat(val.replace(",", "."));
            if (!Number.isFinite(hc)) {
              warning.textContent = "Invalid head circumference value.";
              count++;
              return;
            }

            // Typical pediatric range: 25,0 to 60,0
            if (hc < 25) {
              warning.textContent = "The head circumference entered is less than 25,0 cm. Are you sure this is correct?";
              count++;
              return;
            }
            if (hc > 60) {
              warning.textContent = "The head circumference entered is greater than 60,0 cm. Are you sure this is correct?";
              count++;
              return;
            }

            // Compare with previous value if present and valid
            if (i > 0) {
              const prevVal = fieldData[i - 1].input.value.trim();
              if (hcPattern.test(prevVal)) {
                const prevHC = parseFloat(prevVal.replace(",", "."));
                if (Number.isFinite(prevHC)) {
                  const diff = hc - prevHC;
                  // Sudden large decreases are almost always an error
                  if (diff <= -2.0) {
                    warning.textContent = "The head circumference entered decreases by 2,0 cm or more compared to the previous value. Are you sure this is correct?";
                    count++;
                    return;
                  }
                  // Flag unusually large changes in either direction
                  if (Math.abs(diff) > 5.0) {
                    warning.textContent = "The head circumference entered differs by more than 5,0 cm from the previous value. Are you sure this is correct?";
                    count++;
                    return;
                  }
                }
              }
            }
          }
        });
        break;
      }
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
  const payload = { record_id: recordId, user_id: username };
  fieldData.forEach(({ input, checkbox }, i) => {
    payload[`row_${i}`] = input.value.trim();
    payload[`row_${i}_unreadable`] = checkbox.checked ? 1 : 0;
  });
  console.log(payload)
  document.getElementById("form-container").style.display = "none";
  // Clear instructions on submit
  document.querySelectorAll("[id$='-instructions']").forEach(el => {
    el.style.display = "none";
  });
  document.getElementById("submit-spinner").style.display = "block";
  await fetch(scriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain" }
  });
  alert("Submission successful!");
  e.target.reset();
  // Load next record
  document.getElementById("submit-spinner").style.display = "none";
  await initializeFormPage();
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