document.querySelectorAll("[data-lead-form]").forEach((leadForm) => {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!leadForm.reportValidity()) return;

    const details = new FormData(leadForm);
    const formStatus = leadForm.querySelector(".form-status");
    const submitButton = leadForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;

    // Show loading state
    formStatus.textContent = "Sending...";
    formStatus.style.color = "";
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
      const response = await fetch(leadForm.action, {
        method: "POST",
        body: details,
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to send enquiry");
      }

      const leadDetails = {};
      ["name", "company", "email", "phone"].forEach((field) => {
        leadDetails[field] = details.get(field) || "";
      });
      try {
        sessionStorage.setItem("novusLeadDetails", JSON.stringify(leadDetails));
      } catch (storageError) {
        console.warn("Could not save lead details for the estimate quiz.", storageError);
      }

      const destinationParams = new URLSearchParams();
      if (data.emailSent === false) destinationParams.set("notification", "email-failed");
      const query = destinationParams.toString();
      const destination = query ? `thank-you.html?${query}` : "thank-you.html";
      window.location.assign(destination);
    } catch (error) {
      console.error("Error:", error);
      formStatus.textContent = "Sorry, there was an error sending your enquiry. Please try again or call us directly.";
      formStatus.style.color = "#ef4444";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
});

document.querySelectorAll(".video-card").forEach((videoCard) => {
  const video = videoCard.querySelector("video");
  const status = videoCard.querySelector(".video-status");

  if (video && status) {
    video.addEventListener("error", () => {
      status.textContent = "The video couldn't be loaded. Please try again later.";
    });
  }
});
