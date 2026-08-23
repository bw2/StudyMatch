(() => {
  const main = document.getElementById("study-main");
  const template = document.getElementById("study-detail-template");
  const params = new URLSearchParams(window.location.search);
  const studyId = params.get("id");

  updateSavedCount();

  if (!studyId) {
    main.innerHTML = "<p>No study specified.</p>";
    return;
  }

  window.StudyData.loadStudies()
    .then((studies) => {
      const study = studies.find((s) => s.study_id === studyId);
      if (!study) {
        main.innerHTML = "<p>We couldn't find that study.</p>";
        return;
      }
      render(study);
    })
    .catch((err) => {
      main.innerHTML = "<p>Couldn't load the studies dataset.</p>";
      console.error(err);
    });

  function render(study) {
    const node = template.content.cloneNode(true);

    node.querySelector(".detail-title").textContent = study.title;
    node.querySelector(".detail-org").textContent = study.organizations.length
      ? study.organizations.join(", ")
      : "Location not specified";

    const tagsEl = node.querySelector(".detail-tags");
    study.conditionTags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = window.StudyData.CONDITION_LABELS[tag] || tag;
      tagsEl.appendChild(span);
    });
    if (study.isHealthyVolunteers) {
      const span = document.createElement("span");
      span.className = "tag tag--muted";
      span.textContent = "Healthy volunteers welcome";
      tagsEl.appendChild(span);
    }

    node.querySelector(".stat-comp").textContent = window.StudyData.compensationLabel(study);
    node.querySelector(".stat-duration").textContent = window.StudyData.durationLabel(study);
    node.querySelector(".stat-age").textContent = study.age_display || "Any age";
    node.querySelector(".stat-activities").textContent = study.activities.length
      ? study.activities.join(", ")
      : "Not specified";

    node.querySelector(".detail-summary").textContent = study.summary || "No description provided.";
    node.querySelector(".detail-tasks").textContent =
      study.what_participants_may_be_asked_to_do || "Not specified.";

    node.querySelector(".detail-eligibility").textContent =
      study.eligibility || "No additional eligibility criteria listed for this study.";
    node.querySelector(".detail-exclusions").textContent =
      study.exclusions || "No exclusion criteria listed for this study.";

    main.innerHTML = "";
    main.appendChild(node);

    wireSaveButtons(study);
    wireEligibility(study);
  }

  function wireSaveButtons(study) {
    document.querySelectorAll(".save-btn").forEach((btn) => {
      const isSaved = window.StudyMatchState.isSaved(study.study_id);
      applySavedUI(btn, isSaved);
      btn.addEventListener("click", () => {
        const nowSaved = window.StudyMatchState.toggleSaved(study.study_id);
        applySavedUI(btn, nowSaved);
        updateSavedCount();
      });
    });
  }

  function applySavedUI(btn, saved) {
    btn.classList.toggle("is-saved", saved);
    btn.setAttribute("aria-pressed", String(saved));
    btn.innerHTML = saved ? "&#9829;" : "&#9825;";
  }

  function wireEligibility(study) {
    const checkbox = document.getElementById("confirm-eligible");
    const enrollBtn = document.getElementById("enroll-btn");
    const enrollCard = document.getElementById("enroll-card");
    const enrollIntro = document.getElementById("enroll-intro");
    const enrollForm = document.getElementById("enroll-form");
    const enrollSuccess = document.getElementById("enroll-success");
    const officialLink = document.getElementById("official-link");

    checkbox.addEventListener("change", () => {
      enrollBtn.disabled = !checkbox.checked;
    });

    enrollBtn.addEventListener("click", () => {
      enrollCard.hidden = false;
      enrollIntro.textContent =
        "This dataset doesn't include a direct coordinator email or phone number for this study, so you can send a demo interest note below, or go straight to the official Rally study page to see the real contact and enrollment steps.";
      enrollForm.hidden = false;
      officialLink.href = study.url || "#";
      enrollCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    enrollForm.addEventListener("submit", (e) => {
      e.preventDefault();
      enrollForm.hidden = true;
      enrollSuccess.hidden = false;
    });
  }

  function updateSavedCount() {
    const count = window.StudyMatchState.getSaved().length;
    const el = document.getElementById("saved-count");
    if (el) el.textContent = count ? `Saved (${count})` : "Saved";
  }
})();
