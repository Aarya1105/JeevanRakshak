const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 👉 PASTE YOUR GEMINI API KEY HERE (inside quotes)
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY_HERE");

app.post("/chat", async (req, res) => {
    const msg = (req.body.message || "").toLowerCase();

    // ===============================
    // 📞 CONTACT HOSPITAL
    // ===============================
    if (msg.includes("contact") || msg.includes("phone") || msg.includes("call hospital")) {
        return res.json({
            reply: `📞 For hospital contacts in India, you can call the nearest hospital or the following major hospital helplines:
- AIIMS Delhi: +91 11 2658 8500
- Apollo Hospitals (multi-city): 1800 420 1234
- Fortis Hospitals (multi-city): 1800 102 3333
🚑 For emergencies, always dial 108.`
        });
    }

    // ===============================
    // 🚨 EMERGENCY
    // ===============================
    if (msg.includes("emergency") || msg.includes("urgent help") || msg.includes("ambulance")) {
        return res.json({
            reply: `🚨 For any medical emergency in India, call 108 immediately. 
You can also contact the nearest hospital directly.`
        });
    }

    // ===============================
    // 🏥 HOSPITAL SPECIALTIES
    // ===============================
    if (msg.includes("cardiology") || msg.includes("neurology") || msg.includes("maternity") || msg.includes("pediatrics")) {
        return res.json({
            reply: `💡 Common hospital specialties in India:
- Cardiology, Neurology, Orthopedics
- Maternity, Pediatrics
- Emergency and Trauma Care
Most large hospitals offer multiple specialties.`
        });
    }

    // ===============================
    // ⚕️ FIRST AID
    // ===============================
    if (msg.includes("first aid") || msg.includes("bleeding") || msg.includes("burn") || msg.includes("fracture")) {
        return res.json({
            reply: `⚕️ First aid tips in India:
- Bleeding: Apply clean cloth & pressure
- Burns: Cool under running water
- Fractures: Immobilize the limb
🚑 Always seek hospital care for serious cases or call 108.`
        });
    }

    // ===============================
    // 🕒 HOSPITAL TIMINGS
    // ===============================
    if (msg.includes("open") || msg.includes("close") || msg.includes("timing") || msg.includes("hours")) {
        return res.json({
            reply: `🕒 Most hospitals in India operate 24/7 for emergency services. General outpatient departments usually follow city-specific timings.`
        });
    }

    // ===============================
    // 📞 GOVERNMENT HELPLINES
    // ===============================
    if (msg.includes("helpline") || msg.includes("covid") || msg.includes("dengue") || msg.includes("mental health")) {
        return res.json({
            reply: `📞 Major government health helplines in India:
- National Health Helpline: 1800 180 1155
- Child Helpline: 1098
- Mental Health Helpline: 1800 599 0019`
        });
    }

    // ===============================
    // 🤖 AI FALLBACK (CITY-SPECIFIC QUERY)
    // ===============================
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(`
You are a smart emergency assistant for India.

Rules:
- Give helpful and clear answers
- Suggest hospitals and contacts if needed
- For emergency always suggest calling 108
- Provide first aid if asked
- Always provide Indian context
- Never say "I don't know"

User question: ${msg}
        `);

        const response = result.response.text();
        return res.json({ reply: response });

    } catch (error) {
        return res.json({
            reply: `⚠️ For any medical emergency in India, call 108. You can also contact the nearest hospital.`
        });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});