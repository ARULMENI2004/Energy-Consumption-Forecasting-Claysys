import os
from fpdf import FPDF

class ScriptPDF(FPDF):
    def header(self):
        # Arial bold
        self.set_font('Helvetica', 'B', 10)
        # Title
        self.set_text_color(100, 110, 120)
        self.cell(0, 10, 'VoltForecast ⚡ Video Explanation Script', border=0, ln=1, align='L')
        # Line break
        self.ln(2)
        # Thin divider line
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', border=0, align='C')

def create_script_pdf():
    pdf = ScriptPDF(orientation='P', unit='mm', format='A4')
    pdf.alias_nb_pages()
    
    # -------------------------------------------------------------
    # Cover / Header Section
    # -------------------------------------------------------------
    pdf.add_page()
    
    # Main Title
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_text_color(24, 28, 36) # Dark slate
    pdf.cell(0, 15, 'VoltForecast ⚡ Video Script', border=0, ln=1, align='L')
    
    # Subtitle
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(100, 110, 120)
    pdf.cell(0, 6, 'A Complete 7-Minute Explanation Video Script for YouTube Voice-Over', border=0, ln=1, align='L')
    
    # Metadata block
    pdf.ln(4)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(30, 144, 255) # Dodgy blue / accent
    pdf.cell(30, 6, 'Target Duration:', 0, 0)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(30, 6, '7 Minutes (~1,000 words)', 0, 1)
    
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(30, 144, 255)
    pdf.cell(30, 6, 'Tone:', 0, 0)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(100, 6, 'Energetic, Tech-savvy, Professional, Actionable', 0, 1)
    
    pdf.ln(5)
    
    # -------------------------------------------------------------
    # Table Content
    # -------------------------------------------------------------
    # Column widths (Total page width is 190mm for printable area)
    col_widths = [22, 78, 90] # Timing (22mm), Visuals (78mm), Audio (90mm)
    
    # Table Data
    table_rows = [
        (
            "0:00 - 0:45",
            "[Intro & Hook]\n* Dynamic B-roll of appliances turning on (AC, microwave).\n* Split screen: High electric bill in India next to VoltForecast dark dashboard.\n* Text: 'Reduce electricity bills by 30%?'",
            "[Energetic, engaging Voiceover]:\n'Ever felt a sense of dread opening your monthly electricity bill? Or worried that a sudden voltage dip in the evening might fry your expensive AC compressor?\n\nYou are not alone. Balancing residential energy bills, identifying power hogs, and protecting home appliances from grid fluctuations is a massive headache.\n\nBut what if you could have an automated, AI-driven energy audit terminal right in your browser? Welcome to VoltForecast—a premium, dark-themed energy forecasting and analytics platform that decodes your household's electric consumption, predicts your next week's demand, and uses Google Gemini AI to give you custom saving strategies. Let's dive in!'"
        ),
        (
            "0:45 - 1:45",
            "[File Upload & Getting Started]\n* Screen capture of VoltForecast landing page showing upload zone.\n* Mouse clicks 'Load Demo Data'. Dashboard populates dynamically.\n* Mouse interacts with sidebar date pickers & view modes (Hourly vs Daily Mean).",
            "[Clear, instructional Voiceover]:\n'Getting started with VoltForecast is incredibly simple. Users can securely sign in using the built-in Firebase authentication. Once inside, you have the power to analyze your own home's data.\n\nThe platform supports robust parsing of standard UCI-style Household Electric Power datasets in both CSV and JSON formats. It automatically cleans timestamp variations, maps active power, reactive power, voltage, and individual sub-meters.\n\nDon't have a dataset ready? No problem. With a single click on \"Load Demo Data\", VoltForecast seeds a highly realistic 60-day residential energy profile. Notice how the sidebar allows you to define your custom Date Horizon and toggle aggregation modes between high-frequency hourly readings and daily means instantly.'"
        ),
        (
            "1:45 - 3:00",
            "[Tab 1: Live Overview & Dashboard]\n* Zoom in on cards: Grid Consumption, Estimated Bill, Peak Demand, Mean Load.\n* Hovering over Energy Trend Visualizer (Plotly line chart) displaying interactive tooltips.\n* Show Sub-metering Distribution pie chart & Diurnal Hourly Load bar chart (peak hours 7-9 AM, 6-10 PM highlighted in green).",
            "[Professional, analytical Voiceover]:\n'Now let's explore the core dashboard: the Live Overview. At the top, you are greeted by four critical metric cards.\n\nFirst, Grid Consumption tracks your cumulative usage in kWh. Next, the Estimated Bill calculates your real-time costs using localized tariffs—for instance, here it calculates domestic rates at an average of INR 7.50 per unit. You can also spot your Peak Demand in kW, alongside the exact time it occurred, and your Mean Load representing average draw.\n\nBelow the metrics, the Energy Trend Visualizer plots your load timeline. Because the raw data contains thousands of lines, VoltForecast uses smart downsampling to render charts fast and lag-free.\n\nTo the left, the Sub-metering Distribution breaks down your consumption into four key sectors: kitchen appliances, laundry, climate control like ACs/geysers, and general fans/sockets.\n\nOn the right, the Diurnal Hourly Load Profile aggregates your hourly routine. It automatically highlights peak hours, showing you exactly when your household draws the most grid energy.'"
        ),
        (
            "3:00 - 4:15",
            "[Tab 2: Predictive Forecasting Horizon]\n* Switch to Predictive Forecasting tab.\n* Highlight the Plotly line chart: solid gray line (Historical) transitioning to a dotted green line (Predicted Forecast).\n* Zoom in on forecasting cards below the chart.",
            "[Intriguing, forward-looking Voiceover]:\n'But historical data only tells half the story. To truly master your consumption, you need to look ahead. That’s where the Predictive Forecasting Engine comes in.\n\nBy switching to this tab, VoltForecast runs a localized prediction algorithm. It takes your historic diurnal curves and weekday habits, factors in seasonal baselines, and projects a detailed 7-day, 168-hour demand forecast.\n\nLook at this interactive graph: it blends your historical usage with the dotted line of predicted demand for the upcoming week. Below, you get a clear look at your estimated upcoming consumption, the projected tariff addition to your next bill, and the peak demand probability. Knowing that your peak load will likely hit around 8 PM next Tuesday allows you to take preventive action before it even happens.'"
        ),
        (
            "4:15 - 5:30",
            "[Tab 3: Smart AI Chatbot - VoltBot]\n* Switch to Smart AI Chatbot tab.\n* User types: \"How can I reduce my AC bill?\".\n* VoltBot replies instantly with a structured, bulleted advice window.\n* User asks about voltage fluctuations; VoltBot reviews average voltage and recommends stabilizer actions.",
            "[Warm, enthusiastic Voiceover]:\n'What if you aren't a data scientist and just want direct advice? VoltForecast has you covered with VoltBot, your dedicated AI home energy advisor.\n\nPowered by the Google Gemini API, VoltBot doesn't just give generic advice. It is fed your real-time dataset metrics as context, allowing it to perform a hyper-personalized home energy audit.\n\nWhen we ask VoltBot how to reduce our bill, it observes that Climate Control represents a large portion of our total load. It politely recommends transitioning to a BEE 5-Star inverter AC, maintaining the temperature setpoint at 24 to 26 degrees Celsius, and details the benefits of the government's rooftop solar schemes like PM-Surya Ghar Yojana.\n\nAnd when fluctuations occur, VoltBot tracks our grid voltage averages. If it detects evening voltage dips, it suggests installing digital stabilizers with automatic cutoff protection to shield sensitive electronics.'"
        ),
        (
            "5:30 - 6:30",
            "[Tech Stack & Real-World Use Cases]\n* Fast-paced code folder view or architectural layout diagram.\n* Show icons/names: React, TypeScript, Vite, Tailwind CSS, Firebase, Google Gemini, Python Streamlit, Plotly.",
            "[Tech-savvy, authoritative Voiceover]:\n'Under the hood, VoltForecast is built on a modern, high-performance tech stack. The web app is engineered using React, TypeScript, and Vite for near-instant rendering. Tailwind CSS drives the dark editorial aesthetic, and Firebase Authentication and Firestore store secure user sessions and saved audit reports.\n\nThe backend leverages Node.js and Express to communicate securely with the Google GenAI SDK, bringing the power of Gemini 2.5 and Gemini Pro to the chat console.\n\nAdditionally, VoltForecast includes a standalone Streamlit application written in Python, combining Pandas, NumPy, and interactive Plotly graphs, perfect for rapid local data analysis and prototyping.\n\nIn the real world, this system solves critical problems: it eliminates billing surprises by identifying vampire standby loads, balances grid stress by pointing out load-shifting opportunities, and protects home appliance lifespans through voltage trend tracking.'"
        ),
        (
            "6:30 - 7:00",
            "[Outro & Call to Action]\n* Show running local commands: npm run dev and streamlit run voltforecast.py.\n* Show presenter or final slide with GitHub and AI Studio links.\n* Text: 'Like, Subscribe, Comment!'",
            "[Friendly, inviting Voiceover]:\n'Whether you're a homeowner looking to slash your electricity bills or a developer exploring the intersection of IoT, React, and Generative AI, VoltForecast provides a powerful blueprint.\n\nYou can run it locally in seconds with simple commands. Check out the project links in the description below to view the app in Google AI Studio and download the source code.\n\nIf you found this walkthrough helpful, make sure to hit that like button, subscribe for more developer deep dives, and leave a comment below: What's the biggest power hog in your house? Until next time, keep optimizing!'"
        )
    ]

    # Draw Table Headers
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(30, 41, 59)  # Dark slate blue header background
    pdf.set_text_color(255, 255, 255) # White text
    
    pdf.cell(col_widths[0], 8, 'Timing', border=1, ln=0, align='C', fill=True)
    pdf.cell(col_widths[1], 8, 'Visual / On-Screen Actions', border=1, ln=0, align='L', fill=True)
    pdf.cell(col_widths[2], 8, 'Audio / Voiceover Script', border=1, ln=1, align='L', fill=True)
    
    # Draw Table Body rows
    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(40, 40, 40)
    
    alternating = False
    
    for row in table_rows:
        timing, visual, audio = row
        
        # Calculate heights needed for each cell to handle cell wrapping cleanly
        # FPDF2 allows multi_cell. To draw bordered rows side-by-side, we must align heights
        # A simple trick is using FPDF's `multi_cell` positioning with split text
        
        # Split text into lines matching column width bounds
        visual_lines = pdf.multi_cell(col_widths[1], 4.5, visual, dry_run=True, output="lines")
        audio_lines = pdf.multi_cell(col_widths[2], 4.5, audio, dry_run=True, output="lines")
        
        # Height of cell is max lines * line height
        line_height = 4.5
        row_height = max(len(visual_lines), len(audio_lines)) * line_height + 4 # add padding
        
        # Prevent page break mid-row
        if pdf.get_y() + row_height > 275:
            pdf.add_page()
            # Redraw headers on new page
            pdf.set_font('Helvetica', 'B', 10)
            pdf.set_fill_color(30, 41, 59)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(col_widths[0], 8, 'Timing', border=1, ln=0, align='C', fill=True)
            pdf.cell(col_widths[1], 8, 'Visual / On-Screen Actions', border=1, ln=0, align='L', fill=True)
            pdf.cell(col_widths[2], 8, 'Audio / Voiceover Script', border=1, ln=1, align='L', fill=True)
            pdf.set_font('Helvetica', '', 8.5)
            pdf.set_text_color(40, 40, 40)
            
        # Draw cells
        x = pdf.get_x()
        y = pdf.get_y()
        
        # Backgound color for alternating rows
        bg_color = (248, 250, 252) if alternating else (255, 255, 255)
        pdf.set_fill_color(*bg_color)
        alternating = not alternating
        
        # Column 1: Timing
        pdf.rect(x, y, col_widths[0], row_height, style='DF' if bg_color != (255,255,255) else 'D')
        pdf.set_font('Helvetica', 'B', 8.5)
        pdf.cell(col_widths[0], row_height, timing, border=0, ln=0, align='C')
        
        # Column 2: Visuals
        pdf.set_xy(x + col_widths[0], y)
        pdf.rect(x + col_widths[0], y, col_widths[1], row_height, style='DF' if bg_color != (255,255,255) else 'D')
        pdf.set_font('Helvetica', '', 8)
        # Multi-cell with padding
        pdf.set_y(y + 2)
        pdf.multi_cell(col_widths[1], 4.2, visual, border=0, align='L')
        
        # Column 3: Audio
        pdf.set_xy(x + col_widths[0] + col_widths[1], y)
        pdf.rect(x + col_widths[0] + col_widths[1], y, col_widths[2], row_height, style='DF' if bg_color != (255,255,255) else 'D')
        pdf.set_font('Helvetica', '', 8)
        # Multi-cell with padding
        pdf.set_y(y + 2)
        pdf.multi_cell(col_widths[2], 4.2, audio, border=0, align='L')
        
        # Reset positioning to bottom of the row
        pdf.set_xy(x, y + row_height)
        
    # -------------------------------------------------------------
    # Cheat Sheet Section
    # -------------------------------------------------------------
    pdf.ln(10)
    
    # Section Title
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(24, 28, 36)
    pdf.cell(0, 8, '💡 Real-World Issues Solved (Cheat Sheet for Presenter)', border=0, ln=1, align='L')
    pdf.set_draw_color(30, 144, 255)
    pdf.line(10, pdf.get_y(), 110, pdf.get_y())
    pdf.ln(3)
    
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(50, 50, 50)
    
    points = [
        ("**The 'Geyser & AC' Trap:** Climate control (Sub-meter 3) accounts for the largest fraction of bills. Setting ACs to 24-26 C with dynamic fans saves up to 35% on cooling overhead.", True),
        ("**Peak Load Shifting (6 PM - 10 PM):** Indian domestic grids witness peak stress in the evenings. Shifting high-load appliances like water pumps & washing machines to off-peak morning hours saves cost under ToD billing and preserves energy health.", True),
        ("**Standby / Vampire Loads:** Identifies phantom socket draws (fans/sockets in idle) inside the 'Other' metering classification, guiding users to turn off direct wall switches.", True),
        ("**Grid Voltage Instability:** Voltage dips in peak hours damage induction and AC motors. VoltForecast warns users of averages dropping below 215V, justifying stabilizer usage.", True)
    ]
    
    for pt, is_bullet in points:
        # Check space
        if pdf.get_y() > 260:
            pdf.add_page()
            
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(4, 5, chr(149) if is_bullet else '', 0, 0)
        # Parse basic markdown bold tags (**text**) manually
        parts = pt.split('**')
        for idx, part in enumerate(parts):
            if idx % 2 == 1:
                pdf.set_font('Helvetica', 'B', 9)
                pdf.set_text_color(24, 28, 36)
            else:
                pdf.set_font('Helvetica', '', 9)
                pdf.set_text_color(60, 60, 60)
            pdf.write(5, part)
        pdf.ln(6)
        
    # Save the output file
    target_path = os.path.abspath('VoltForecast_Video_Script.pdf')
    pdf.output(target_path)
    print(f"PDF created successfully at: {target_path}")

if __name__ == '__main__':
    create_script_pdf()
