import fetch from "node-fetch";

async function testOllama(chatString) {
    try {
        const res = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "phi", // or "phi"
                prompt: "you are a wizard in an rpg world and you will reply accordingly, if you think the player is offensive start the reply with !agressive , if you feel the player wants a quest start the reply with !quest",
            }),
        });

        let output = "";
        for await (const chunk of res.body) {
            const text = Buffer.from(chunk).toString("utf8");
            try {
                const json = JSON.parse(text);
                output += json.response || "";
            } catch {}
        }

        console.log("✅ Ollama replied:\n", output);
    } catch (err) {
        console.error("❌ Connection error:", err.message);
    }
}

testOllama();
