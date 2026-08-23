(() => {
  const grid = document.getElementById("study-grid");
  const summary = document.getElementById("results-summary");
  const emptyState = document.getElementById("empty-state");
  const template = document.getElementById("study-card-template");
  const location = window.StudyMatchState.getLocation();

  window.StudyData.loadStudies()
    .then((studies) => {
      const savedIds = new Set(window.StudyMatchState.getSaved());
      const saved = studies.filter((s) => savedIds.has(s.study_id));
      render(saved);
    })
    .catch((err) => {
      summary.textContent = "Couldn't load the studies dataset.";
      console.error(err);
    });

  function render(saved) {
    summary.textContent = `${saved.length} saved ${saved.length === 1 ? "study" : "studies"}`;
    emptyState.hidden = saved.length !== 0;
    grid.innerHTML = "";
    saved.forEach((study) => grid.appendChild(renderCard(study)));
  }

  function renderCard(study) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".study-card");
    const link = node.querySelector(".study-card-link");
    const saveBtn = node.querySelector(".save-btn");

    link.href = `study.html?id=${encodeURIComponent(study.study_id)}`;
    node.querySelector(".study-title").textContent = study.title;

    const nearest = location && location.lat != null
      ? window.StudyData.nearestOrg(study, location.lat, location.lon)
      : null;
    const orgText = nearest ? nearest.name : (study.organizations[0] || "Location not specified");
    const distanceText = nearest ? ` · ~${nearest.distance.toFixed(1)} mi away` : "";
    node.querySelector(".study-org").textContent = `${orgText}${distanceText}`;

    const tagsEl = node.querySelector(".study-tags");
    study.conditionTags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = window.StudyData.CONDITION_LABELS[tag] || tag;
      tagsEl.appendChild(span);
    });

    node.querySelector(".meta-comp").textContent = `\u{1F4B0} ${window.StudyData.compensationLabel(study)}`;
    node.querySelector(".meta-duration").textContent = `\u{23F1} ${window.StudyData.durationLabel(study)}`;

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.StudyMatchState.toggleSaved(study.study_id);
      card.remove();
      const remaining = grid.querySelectorAll(".study-card").length;
      summary.textContent = `${remaining} saved ${remaining === 1 ? "study" : "studies"}`;
      emptyState.hidden = remaining !== 0;
    });

    return card;
  }
})();
