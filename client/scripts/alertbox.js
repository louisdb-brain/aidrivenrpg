export function showAlert(message, duration = 2000) {
    const alertBox = document.createElement("div");
    alertBox.textContent = message;
    alertBox.className = "custom-alert";
    document.body.appendChild(alertBox);

    setTimeout(() => {
        alertBox.remove();
    }, duration);
}
