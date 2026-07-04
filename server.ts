import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: any = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Local Rule-based Support Response helper when Gemini is restricted/unavailable
function getLocalRuleResponse(query: string, datasetSummary: any): string {
  const q = (query || "").toLowerCase();

  const politeHeader = "Dear Valued Customer, thank you for contacting VoltForecast support. I am absolutely delighted to share your customized home energy audit details below:\n\n";
  const politeFooter = "\n\nI hope this helpful recommendation serves you exceptionally well. Please let us know if there is anything else we can optimize for you! Have a magnificent day. 🙏";

  const total = datasetSummary?.totalConsumptionKwh || 0;
  const cost = datasetSummary?.estimatedCostInRupees || 0;
  const sub1 = datasetSummary?.subMeteringKitchenKwh || 0;
  const sub2 = datasetSummary?.subMeteringLaundryKwh || 0;
  const sub3 = datasetSummary?.subMeteringClimateControlKwh || 0;
  const avgV = datasetSummary?.averageVoltage || 230;
  const avgP = datasetSummary?.averagePowerKw || 0;

  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("namaste")) {
    return `Dear Valued Customer, warm greetings from VoltForecast! My name is VoltBot, and I am absolutely delighted to assist you today as your personal energy support executive.

Please ask me any questions about:
* **Reducing your electric bill** (₹7.50 avg unit tariff)
* **AC / climate control savings** (Sub-meter 3)
* **Kitchen appliance efficiency** (Sub-meter 1)
* **Voltage fluctuations & stabilizers** (standard 230V check)

I stand ready to assist you. What can I help you optimize today, sir/madam?`;
  }

  if (q.includes("saving") || q.includes("reduce") || q.includes("bill") || q.includes("cost") || q.includes("money") || q.includes("cut") || q.includes("optimize")) {
    const climatePct = total > 0 ? Math.round((sub3 / total) * 100) : 0;
    return politeHeader + 
      `### 📊 Active Support Summary
* **Total Usage**: **${total} Units (kWh)**
* **Estimated Charges**: **₹${cost}** (calculated at ₹7.50 per unit)
* **Climate Control (Sub-3)** represents **${climatePct}%** of your home's total load.

### 💡 High-Yield Executive Recommendations:
1. **Optimize AC/Water Heater usage**: Shifting heavy cycles away from the Indian grid peak of **6:00 PM to 10:00 PM** significantly reduces load stress.
2. **Eliminate Phantom Loads**: Turning off heavy kitchen induction and microwave units at the wall switch saves 5% on idle power consumption.
3. **Solar PV Plan**: Under the PM-Surya Ghar Yojana, a 3kW setup can bring your electric bill close to zero.` + politeFooter;
  }

  if (q.includes("kitchen") || q.includes("cook") || q.includes("sub1") || q.includes("metering1") || q.includes("microwave") || q.includes("oven") || q.includes("induction")) {
    return politeHeader + 
      `### 🍳 Kitchen Audit (Sub-meter 1)
* **Consumption**: **${sub1} Units (kWh)**
* **Induction vs Gas**: Induction stove cooking is ~85% efficient compared to gas (~40%). Always use matching flat-bottomed cookware.
* **Reheating**: Prefer microwave ovens for reheating; they consume up to 70% less energy than standard conventional ovens.` + politeFooter;
  }

  if (q.includes("laundry") || q.includes("washing") || q.includes("sub2") || q.includes("pump") || q.includes("fridge") || q.includes("refrigerator")) {
    return politeHeader + 
      `### 🧺 Laundry & Pump Audit (Sub-meter 2)
* **Consumption**: **${sub2} Units (kWh)**
* **Cold Water Wash**: Heating wash water accounts for 90% of washing machine energy. Run standard loads in cold water.
* **Pump Schedule**: Run your overhead water pump in the early morning rather than high-tariff evening hours.` + politeFooter;
  }

  if (q.includes("climate") || q.includes("ac") || q.includes("air cond") || q.includes("geyser") || q.includes("sub3") || q.includes("heater")) {
    return politeHeader + 
      `### ❄️ Climate Control Audit (Sub-meter 3)
* **Consumption**: **${sub3} Units (kWh)**
* **The 24°C Rule**: Setting ACs to 24°C instead of 18°C maintains comfort while significantly lowering the duty cycle.
* **Geyser Management**: Limit geyser pre-heating to 15-20 minutes before use to stop heat leaks and passive energy loss.` + politeFooter;
  }

  if (q.includes("voltage") || q.includes("fluct") || q.includes("volt") || q.includes("stabilizer")) {
    return politeHeader + 
      `### ⚡ Voltage Health Review
* **Average Voltage**: **${avgV} V** (Indian standard: 230V)
* **Stabilizer Advice**: For sensitive compressors (Inverter ACs & luxury refrigerators), we highly recommend digital voltage stabilizers with automatic high/low cutoff triggers to prevent winding burnouts.` + politeFooter;
  }

  if (q.includes("forecast") || q.includes("predict") || q.includes("future")) {
    return politeHeader + 
      `### 🔮 Compact Forecast projection
* **Expected Weekly Consumption**: **~250 Units (kWh)**
* **Peak Loading Hazard**: High probability of daily spikes at 8:00 PM due to residential cooling.
* **Action plan**: We politely suggest keeping heavy loads off during peak hours to preserve grid power factor.` + politeFooter;
  }

  return politeHeader + 
    `### 📋 Executive Summary
* **Total Audited Records**: ${datasetSummary?.recordCount || 0} hours
* **Active Mean Load**: ${avgP} kW
* **Estimated Period Cost**: ₹${cost}

Please feel free to ask me for custom advice regarding **"reducing bills"**, **"AC savings"**, or **"voltage fluctuations"**.` + politeFooter;
}

// API endpoint for energy data analysis and Q&A using Gemini
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { message, dataSummary, conversationHistory } = req.body;

    const ai = getAI();

    // Build the system instructions and system-infused context
    const systemPrompt = `You are a highly polite, professional, and caring Customer Service Executive for VoltForecast, dedicated to helping Indian customers optimize their household electricity usage.

Your Guidelines:
1. **Persona & Tone**: Speak with exceptional politeness, respect, and warmth. Use professional customer support language (e.g., "Dear Valued Customer," "Thank you for contacting VoltForecast support," "It is an absolute pleasure to assist you today," "Should you need further assistance, please let us know").
2. **Compactness**: Keep your responses compact, concise, and highly structured. Avoid long, dense blocks of text. Get straight to the point while maintaining your polite executive tone.
3. **User-Friendly Layout**: Use clear bullet points, short sentences, and simple bold headers. Never overwhelm the customer with excessive technical jargon unless specifically requested.
4. **Actionable Suggestions**: Provide 2 or 3 highly specific, practical energy-saving actions customized to their current data, such as shifting heavy loads (ACs, geysers, pumps) outside the evening peak (6 PM - 10 PM), using BEE 5-star labeled inverter appliances, or adopting the PM-Surya Ghar solar rooftop plan.

Dataset Context (Indian Household Electric Power Consumption style):
- Sub-metering 1: Kitchen Appliances (Induction Cooktop, Microwave, Oven, Mixer-grinder)
- Sub-metering 2: Laundry & Wet Utilities (Washing Machine, Water Pump / motor, Refrigerator)
- Sub-metering 3: Climate Control & Heavy Loads (Air Conditioners, Water Geysers)
- Other: Ceiling Fans, lighting, air coolers, and general sockets.
- Active Power (kW): Total active electricity consumed by the household (1 kW for 1 hour = 1 Unit / kWh).
- Reactive Power (kW): Reactive power of household (impacting grid power factor and grid efficiency).
- Voltage (V): Household voltage (standard in India is ~220V - 240V).
- Intensity (A): Electric current intensity in Amperes.

Indian Context-specific Guidelines:
- State all monetary values and savings in Indian Rupees (₹ or INR).
- Typical Indian domestic tariff rate averages ₹7.50 per Unit (kWh). Some Indian DISCOMs (like TNEB, MSEDCL, BESCOM, Tata Power, Adani Electricity, CESC, etc.) have tiered slabs or Time of Day (ToD) peak surcharges.
- Provide recommendations on BEE (Bureau of Energy Efficiency) star ratings (e.g., upgrading to a 5-star inverter AC or refrigerator).
- Discuss peak times relevant to Indian households (typically afternoon AC peaks 2-4 PM and evening/dinner peaks 6-11 PM).
- Mention options like installing a Solar Rooftop PV system under the PM-Surya Ghar Muft Bijli Yojana, or using smart stabilizers for voltage fluctuations.

Analyze the user's data summary and answer their specific question. Keep suggestions highly actionable and localized.

Data Summary from user's current view:
${JSON.stringify(dataSummary, null, 2)}
`;

    // Construct history for multi-turn Q&A if provided
    const contents: any[] = [];
    if (conversationHistory && conversationHistory.length > 0) {
      // Skip the initial static assistant greeting if present to start the chain with user query
      const historyToProcess = conversationHistory[0]?.role === "assistant"
        ? conversationHistory.slice(1)
        : conversationHistory;

      historyToProcess.forEach((item: any) => {
        const role = item.role === "assistant" ? "model" : "user";
        const text = item.content || item.text;
        if (!text) return;

        // Prevent consecutive duplicate roles
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push({ text });
        } else {
          contents.push({
            role,
            parts: [{ text }]
          });
        }
      });
    }

    // If contents is empty, populate it with the current user message
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: message || "Generate a general summary of my energy consumption metrics and list 3 personalized recommendations." }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error (falling back to local rule support response):", error);
    const fallbackText = getLocalRuleResponse(req.body.message, req.body.dataSummary);
    res.json({ text: fallbackText });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
