(() => {
  const form = document.getElementById("screening-form");
  const progressBar = document.getElementById("progress-bar");
  const conditionAll = document.getElementById("condition-all");
  const conditionCheckboxes = Array.from(form.querySelectorAll('input[name="condition"]'));
  const conditionOthers = conditionCheckboxes.filter((cb) => cb !== conditionAll);

  // "All" is mutually exclusive with the specific condition options.
  conditionAll.addEventListener("change", () => {
    if (conditionAll.checked) conditionOthers.forEach((cb) => (cb.checked = false));
    updateProgress();
  });
  conditionOthers.forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) conditionAll.checked = false;
      updateProgress();
    });
  });

  const REQUIRED_FIELDS = [
    { type: "number", el: document.getElementById("age") },
    { type: "text", el: document.getElementById("gender") },
    { type: "radio", name: "imaging" },
    { type: "radio", name: "invasive" },
    { type: "checkbox", name: "condition" },
  ];

  function isFieldFilled(field) {
    if (field.type === "number" || field.type === "text") return field.el.value.trim() !== "";
    if (field.type === "radio") return form.querySelector(`input[name="${field.name}"]:checked`) !== null;
    if (field.type === "checkbox")
      return form.querySelectorAll(`input[name="${field.name}"]:checked`).length > 0;
    return false;
  }

  function updateProgress() {
    const filled = REQUIRED_FIELDS.filter(isFieldFilled).length;
    progressBar.style.width = `${Math.round((filled / REQUIRED_FIELDS.length) * 100)}%`;
  }

  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);

  function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    ["age", "gender", "bmi", "race", "imaging", "invasive", "condition"].forEach((id) =>
      setError(`error-${id}`, "")
    );
  }

  function collectData() {
    const formData = new FormData(form);
    return {
      age: formData.get("age") || "",
      gender: (formData.get("gender") || "").trim(),
      bmi: formData.get("bmi") || "",
      race: formData.get("race") || "",
      imaging: formData.get("imaging") || "",
      invasive: formData.get("invasive") || "",
      conditions: formData.getAll("condition"),
    };
  }

  function validate(data) {
    let valid = true;
    clearErrors();

    const age = Number(data.age);
    if (data.age === "" || Number.isNaN(age)) {
      setError("error-age", "Please enter your age.");
      valid = false;
    } else if (age < 0 || age > 119) {
      setError("error-age", "Please enter an age between 0 and 119.");
      valid = false;
    }

    if (!data.gender) {
      setError("error-gender", "Please tell us your gender.");
      valid = false;
    }

    if (data.bmi !== "") {
      const bmi = Number(data.bmi);
      if (Number.isNaN(bmi) || bmi < 10 || bmi > 70) {
        setError("error-bmi", "Please enter a BMI between 10 and 70, or leave it blank.");
        valid = false;
      }
    }

    if (!data.imaging) {
      setError("error-imaging", "Please let us know your comfort with imaging tests.");
      valid = false;
    }

    if (!data.invasive) {
      setError("error-invasive", "Please let us know your comfort with blood/invasive tests.");
      valid = false;
    }

    if (!data.conditions.length) {
      setError("error-condition", "Please select at least one area of interest.");
      valid = false;
    }

    return valid;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = collectData();
    if (!validate(data)) {
      const firstInvalid = form.querySelector(".error:not(:empty)");
      if (firstInvalid) {
        firstInvalid.closest("fieldset").scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    window.StudyMatchState.setScreening(data);
    window.location.href = "location.html";
  });

  // Restore any previously saved answers on load.
  function restore() {
    const data = window.StudyMatchState.getScreening();
    if (!data) return;
    if (data.age) document.getElementById("age").value = data.age;
    if (data.gender) document.getElementById("gender").value = data.gender;
    if (data.bmi) document.getElementById("bmi").value = data.bmi;
    if (data.race) document.getElementById("race").value = data.race;
    if (data.imaging) {
      const el = form.querySelector(`input[name="imaging"][value="${data.imaging}"]`);
      if (el) el.checked = true;
    }
    if (data.invasive) {
      const el = form.querySelector(`input[name="invasive"][value="${data.invasive}"]`);
      if (el) el.checked = true;
    }
    if (Array.isArray(data.conditions)) {
      data.conditions.forEach((value) => {
        const el = form.querySelector(`input[name="condition"][value="${value}"]`);
        if (el) el.checked = true;
      });
    }
    updateProgress();
  }

  restore();
  updateProgress();
})();
