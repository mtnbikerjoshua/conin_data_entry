const allowedWeekdays = ["Tuesday", "Friday", "Saturday"];
const fieldData = [];
const scriptUrl = "https://script.google.com/macros/s/AKfycbyP0r1Lgs08b7U_uK2z3pCGB-SWuchXmCCkNzMwR0PJgO4LQZDwgjzqyrG24_T6QXp1Zw/exec";
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
  console.log("Finished rendering")
  spinner.style.display = "none";

  function validateAll() {
    let count = 0;
    fieldData.forEach(({ input, checkbox, warning, dayDisplay }, i) => {
      const val = input.value.trim();
      const isChecked = checkbox.checked;
      warning.textContent = "";
      dayDisplay.textContent = "";

      if (val === "" && !isChecked) return;

      const match = val.match(/^\d{2}\/\d{2}\/\d{4}$/);
      if (!match && !isChecked) {
        warning.textContent = "Invalid format. Use DD/MM/YYYY.";
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
        dayDisplay.textContent = "Day of the week: " + weekday;
        if (!allowedWeekdays.includes(weekday)) {
          warning.textContent = "Not a typical visit day.";
          count++;
        }
      }
    });

    document.getElementById("summary-message").textContent = count > 0
      ? `There are ${count} fields with issues. Please check.`
      : "";
  }

  fieldData.forEach(({ input, checkbox }) => {
    input.addEventListener("input", () => {
      let val = input.value.replace(/[^\d]/g, "");
      if (val.length > 8) val = val.slice(0, 8);
      if (val.length > 4) val = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4);
      else if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
      input.value = val;
    });
    input.addEventListener("change", validateAll);
    checkbox.addEventListener("change", validateAll);
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

document.getElementById("date-form").addEventListener("submit", async (e) => {
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