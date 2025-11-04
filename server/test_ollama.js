import fetch from "node-fetch";

async function testOllama() {
    try {
        const res = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "tinyllama", // or "phi"
                prompt: "Say hello world in a fantasy tone.",
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
