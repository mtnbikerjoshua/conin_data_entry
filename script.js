let userId = "";
let currentRecord = null;
/*
document.getElementById('start-button').addEventListener('click', () => {
  userId = document.getElementById('user_id').value.trim();
  if (!userId) {
    alert("Please enter your name or ID.");
    return;
  }
  document.getElementById('start-section').style.display = 'none';
  document.getElementById('form-section').style.display = 'block';
  fetchNextRecord();
});
*/
window.onload = function () {
  fetchNextRecord();
};

function fetchNextRecord() {
  fetch(`https://script.google.com/macros/s/AKfycbw6gLLDMwQcl_2VRjmYKwkVQ2fWt9RX5Eae0zg6dsfM6i1e2-UaHpZEylvo-o-zhcceyw/exec`)
    .then(res => res.text())
    .then(txt => {
      try {
        const data = JSON.parse(txt);
        currentRecord = data;
        // document.getElementById('record-id').textContent = data.record_id;
        const img = document.createElement('img');
        img.src = data.image_url;
        document.getElementsByTagName('body').appendChild(img);
      } catch (e) {
        alert("No more records to assign. Thank you!");
        // document.getElementById('form-section').style.display = 'none';
      }
    });
}
/*
document.getElementById('entry-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const response = document.getElementById('inputField').value;
  fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      user_id: userId,
      record_id: currentRecord.record_id,
      response: response
    })
  });
  document.getElementById('inputField').value = '';
  fetchNextRecord();
});
*/