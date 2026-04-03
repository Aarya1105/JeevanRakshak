# Jeevanrakshak-chatboat
India Emergency Chatbot 🤖 – AI-powered assistant providing instant hospital contacts, first aid guidance, ambulance info (108), and voice-enabled Q&amp;A across India. Features interactive robotic UI with voice input/output for real-time emergency support
# India Emergency Chatbot 🤖

**AI-Powered Emergency Assistant for India**  

This chatbot is a web-based AI assistant designed to provide **instant hospital contacts, first aid guidance, ambulance info (108), and city-specific hospital recommendations** across India. It features a **robotic-themed UI** with **voice input and output**, making it interactive and user-friendly for emergencies.

---

## **Features**

- 📞 **Hospital Contacts:** Instant numbers for major hospitals like AIIMS Delhi, Apollo, Fortis, etc.  
- 🚑 **Emergency Support:** Always suggests calling 108 for emergencies.  
- ⚕️ **First Aid Guidance:** Tips for bleeding, burns, fractures, and other emergencies.  
- 🏥 **Hospital Specialties:** Info on cardiology, neurology, maternity, pediatrics, and more.  
- 🕒 **Timings Info:** General hospital operating hours and emergency availability.  
- 🎤 **Voice Input:** Speak your queries using microphone.  
- 🔊 **Voice Output:** Chatbot speaks its responses for better accessibility.  
- 🤖 **Robot-Themed UI:** Full-body robot background and modern chat interface.

---

## **Sample Questions You Can Ask**

- "Call hospital"  
- "Ambulance needed"  
- "First aid for bleeding"  
- "Hospital near me in Mumbai"  
- "Best hospitals for heart surgery"  
- "COVID helpline"  
- "Child helpline number"  

---

## **Tech Stack**

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **AI Model:** Google Gemini API (Generative AI)  
- **Voice:** Web Speech API (`SpeechRecognition` and `SpeechSynthesis`)  

---

## **Setup & Run**

1. **Clone the repository**  

git clone https://github.com/yourusername/india-emergency-chatbot.git
cd india-emergency-chatbot
Install dependencies
npm install express cors @google/generative-ai
Add your Gemini API key

In server.js (or index.js backend file):

const genAI = new GoogleGenerativeAI("AIzaSyAieEPxQyL0nHJp5MQU9CzrziRKgutZoOs");
Run the server
node server.js

Server will run at: http://localhost:3000

Usage
Type your message in the input box and press Enter or click Send.
Click the 🎤 microphone button to speak to the bot.
Bot will reply and also speak responses automatically.
Ask any India-wide emergency-related queries.
