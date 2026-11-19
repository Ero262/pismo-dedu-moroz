const form = document.getElementById("letterForm");
const button = document.getElementById("sendButton");
const statusBox = document.getElementById("status");
const successCard = document.getElementById("successCard");
const writeAgain = document.getElementById("writeAgain");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  if (!form.reportValidity()) return;

  const payload = {
    name: document.getElementById("name").value,
    age: Number(document.getElementById("age").value),
    wish: document.getElementById("wish").value,
    website: form.elements.website.value
  };

  button.disabled = true;
  button.textContent = "Отправляем письмо…";
  try {
    const response = await fetch("/api/letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Не удалось отправить письмо.");

    form.hidden = true;
    successCard.hidden = false;
    successCard.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    statusBox.textContent = error.message || "Ошибка соединения. Попробуй ещё раз позже.";
    statusBox.style.color = "#b63f47";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Отправить письмо <span>✨</span>';
  }
});

writeAgain.addEventListener("click", () => {
  form.reset();
  form.hidden = false;
  successCard.hidden = true;
  statusBox.textContent = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
