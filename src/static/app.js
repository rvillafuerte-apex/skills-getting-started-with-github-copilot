document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML for safety
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (s) => {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[s];
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section
        const participants = Array.isArray(details.participants) ? details.participants : [];
        let participantsHTML = "";
        if (participants.length) {
          // We'll render participant items as list items without bullets and include a delete icon/button
          participantsHTML = `
            <div class="participants">
              <h5>Participants</h5>
              <ul class="participants-list">
                ${participants.map(p => `
                  <li class="participant-item" data-email="${escapeHTML(p)}">
                    <span class="participant-email">${escapeHTML(p)}</span>
                    <button class="participant-remove" title="Remove participant" aria-label="Remove ${escapeHTML(p)}">✖</button>
                  </li>
                `).join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants">
              <h5>Participants</h5>
              <p class="no-participants">No participants yet</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handlers for remove buttons inside this activity card
        const removeButtons = activityCard.querySelectorAll('.participant-remove');
        removeButtons.forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            // Prevent other handlers and stop form submission
            e.stopPropagation();

            const li = btn.closest('.participant-item');
            if (!li) return;
            const email = li.getAttribute('data-email');

            if (!confirm(`Unregister ${email} from ${name}?`)) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });

              const data = await resp.json();
              if (resp.ok) {
                // Refresh activities list
                fetchActivities();
              } else {
                alert(data.detail || data.message || 'Failed to remove participant');
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              alert('Failed to remove participant. Please try again.');
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
