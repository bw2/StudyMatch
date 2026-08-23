(() => {
  const grid = document.getElementById("study-grid");
  const summary = document.getElementById("results-summary");
  const emptyState = document.getElementById("empty-state");
  const template = document.getElementById("study-card-template");
  const conditionFilterBar = document.getElementById("condition-filters");
  const durationFilter = document.getElementById("duration-filter");
  const sortBy = document.getElementById("sort-by");

  const screening = window.StudyMatchState.getScreening();
  const location = window.StudyMatchState.getLocation();

  if (!screening) {
    window.location.href = "index.html";
    return;
  }

  // Condition filter chips default to whatever the user picked during
  // screening, but can be freely adjusted here.
  let activeConditions = new Set(
    screening.conditions && screening.conditions.length ? screening.conditions : ["all"]
  );

  function syncChipUI() {
    conditionFilterBar.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", activeConditions.has(chip.dataset.condition));
    });
  }

  conditionFilterBar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const value = chip.dataset.condition;
    if (value === "all") {
      activeConditions = new Set(["all"]);
    } else {
      activeConditions.delete("all");
      if (activeConditions.has(value)) activeConditions.delete(value);
      else activeConditions.add(value);
      if (activeConditions.size === 0) activeConditions = new Set(["all"]);
    }
    syncChipUI();
    render();
  });

  durationFilter.addEventListener("change", render);
  sortBy.addEventListener("change", render);

  syncChipUI();
  updateSavedCount();

  let allStudies = [];

  window.StudyData.loadStudies()
    .then((studies) => {
      allStudies = studies;
      render();
    })
    .catch((err) => {
      summary.textContent = "Couldn't load the studies dataset.";
      console.error(err);
    });

  function render() {
    const filterConditions = Array.from(activeConditions);
    const durationValue = durationFilter.value;
    const sortValue = sortBy.value;

    let matches = allStudies.filter((study) =>
      window.StudyData.matchStudy(study, screening, location)
    );

    if (!filterConditions.includes("all")) {
      matches = matches.filter((study) =>
        study.conditionTags.some((tag) => filterConditions.includes(tag))
      );
    }

    if (durationValue !== "any") {
      matches = matches.filter((study) => study.durationBucket === durationValue);
    }

    matches = matches.map((study) => ({
      study,
      nearest: location && location.lat != null
        ? window.StudyData.nearestOrg(study, location.lat, location.lon)
        : null,
    }));

    if (sortValue === "compensation") {
      matches.sort((a, b) => window.StudyData.compensationValue(b.study) - window.StudyData.compensationValue(a.study));
    } else if (sortValue === "distance") {
      matches.sort((a, b) => {
        const da = a.nearest ? a.nearest.distance : null;
        const db = b.nearest ? b.nearest.distance : null;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else if (sortValue === "duration") {
      matches.sort((a, b) => {
        const da = a.study.durationDays ?? Infinity;
        const db = b.study.durationDays ?? Infinity;
        return da - db;
      });
    }

    summary.textContent = `${matches.length} matching ${matches.length === 1 ? "study" : "studies"} found`;
    emptyState.hidden = matches.length !== 0;

    grid.innerHTML = "";
    matches.forEach(({ study, nearest }) => grid.appendChild(renderCard(study, nearest)));
  }

  function renderCard(study, nearest) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".study-card");
    const link = node.querySelector(".study-card-link");
    const saveBtn = node.querySelector(".save-btn");

    link.href = `study.html?id=${encodeURIComponent(study.study_id)}`;
    node.querySelector(".study-title").textContent = study.title;

    const orgText = nearest ? nearest.name : (study.organizations[0] || "Location not specified");
    const distanceText = nearest ? ` &middot; ~${nearest.distance.toFixed(1)} mi away` : "";
    node.querySelector(".study-org").innerHTML = `${escapeHtml(orgText)}${distanceText}`;

    const tagsEl = node.querySelector(".study-tags");
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

    node.querySelector(".meta-comp").textContent = `\u{1F4B0} ${window.StudyData.compensationLabel(study)}`;
    node.querySelector(".meta-duration").textContent = `\u{23F1} ${window.StudyData.durationLabel(study)}`;

    const isSaved = window.StudyMatchState.isSaved(study.study_id);
    saveBtn.classList.toggle("is-saved", isSaved);
    saveBtn.setAttribute("aria-pressed", String(isSaved));
    saveBtn.innerHTML = isSaved ? "&#9829;" : "&#9825;";
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const nowSaved = window.StudyMatchState.toggleSaved(study.study_id);
      saveBtn.classList.toggle("is-saved", nowSaved);
      saveBtn.setAttribute("aria-pressed", String(nowSaved));
      saveBtn.innerHTML = nowSaved ? "&#9829;" : "&#9825;";
      updateSavedCount();
    });

    return card;
  }

  function updateSavedCount() {
    const count = window.StudyMatchState.getSaved().length;
    const el = document.getElementById("saved-count");
    if (el) el.textContent = count ? `Saved (${count})` : "Saved";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
