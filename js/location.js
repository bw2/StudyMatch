(() => {
  const form = document.getElementById("location-form");
  const addressInput = document.getElementById("address");
  const useLocationBtn = document.getElementById("use-current-location");

  // Set by "Use my current location"; takes priority over the typed address.
  let geoOverride = null;

  useLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    useLocationBtn.disabled = true;
    useLocationBtn.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoOverride = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        addressInput.value = "Current location";
        useLocationBtn.textContent = "\u{1F4CD} Location captured";
        setError("");
      },
      () => {
        useLocationBtn.disabled = false;
        useLocationBtn.textContent = "\u{1F4CD} Use my current location";
        setError("Couldn't get your location — type a city/town instead.");
      }
    );
  });

  addressInput.addEventListener("input", () => {
    geoOverride = null;
  });

  function setError(message) {
    document.getElementById("error-address").textContent = message || "";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setError("");

    const address = addressInput.value.trim();
    const maxDistance = (new FormData(form).get("maxDistance")) || "25";

    if (!address) {
      setError("Please enter a city or town.");
      return;
    }

    let coords = geoOverride;
    if (!coords) {
      const geocoded = window.geocodeAddress(address);
      if (!geocoded) {
        setError(
          "We don't recognize that town yet. Try a nearby Massachusetts/New England city, or use your current location."
        );
        return;
      }
      coords = { lat: geocoded.lat, lon: geocoded.lon };
    }

    window.StudyMatchState.setLocation({
      address,
      lat: coords.lat,
      lon: coords.lon,
      maxDistance,
    });
    window.location.href = "listing.html";
  });

  function restore() {
    const data = window.StudyMatchState.getLocation();
    if (!data) return;
    addressInput.value = data.address || "";
    if (data.address === "Current location") {
      geoOverride = { lat: data.lat, lon: data.lon };
    }
    const radio = form.querySelector(`input[name="maxDistance"][value="${data.maxDistance}"]`);
    if (radio) radio.checked = true;
  }

  restore();
})();
