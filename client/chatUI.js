// === RPG AI Chat UI ===
const endpoint = "http://localhost:3000/chat";

// Create styles
const style = document.createElement("style");
style.textContent = `
  body {
    margin: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #1a0f0a 0%, #0b0503 100%);
    font-family: 'Cinzel', serif;
    color: #f4dcb0;
  }

  #chatBox {
    background: rgba(34, 17, 10, 0.9);
    border: 2px solid #d4a24a;
    border-radius: 16px;
    box-shadow: 0 0 20px rgba(212, 162, 74, 0.5);
    width: 400px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  #chatLog {
    flex: 1;
    height: 220px;
    overflow-y: auto;
    white-space: pre-line;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    padding: 10px;
    font-size: 15px;
    font-family: 'EB Garamond', serif;
    color: #f6f1e1;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.4);
  }

  #chatInput {
    flex: 1;
    padding: 8px;
    border: 1px solid #d4a24a;
    border-radius: 8px;
    background: #20150f;
    color: #f4dcb0;
    font-family: 'EB Garamond', serif;
  }

  #sendBtn {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(145deg, #d4a24a, #b37e25);
    color: #1a0f0a;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s ease;
  }

  #sendBtn:hover {
    background: linear-gradient(145deg, #eecb7a, #c49637);
    transform: scale(1.05);
  }

  .speaker {
    color: #ffcc66;
    font-weight: bold;
  }
`;
document.head.appendChild(style);

// Create UI elements
const chatBox = document.createElement("div");
chatBox.id = "chatBox";

const chatLog = document.createElement("div");
chatLog.id = "chatLog";
chatLog.innerHTML = `<span class="speaker">NPC:</span> Greetings, traveler...`;

const inputRow = document.createElement("div");
inputRow.style.display = "flex";
inputRow.style.gap = "5px";

const chatInput = document.createElement("input");
chatInput.id = "chatInput";
chatInput.type = "text";
chatInput.placeholder = "Speak...";

const sendBtn = document.createElement("button");
sendBtn.id = "sendBtn";
sendBtn.textContent = "Send";

inputRow.appendChild(chatInput);
inputRow.appendChild(sendBtn);

chatBox.appendChild(chatLog);
chatBox.appendChild(inputRow);
document.body.appendChild(chatBox);

// === Logic ===
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";

    appendMessage("You", text);
    const setting="you are a wizard in a magical land, respond in a single line  to this phrase: "
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: setting + text }),
        });
        const data = await res.json();
        appendMessage("NPC", data.reply || "(no reply)");
    } catch (err) {
        appendMessage("System", "⚠️ " + err.message);
    }
}

function appendMessage(speaker, text) {
    chatLog.innerHTML += `\n<span class="speaker">${speaker}:</span> ${text}`;
    chatLog.scrollTop = chatLog.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
