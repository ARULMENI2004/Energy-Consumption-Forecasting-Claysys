import streamlit as st
import pandas as pd
import numpy as np
import datetime
import plotly.express as px
import plotly.graph_objects as go

# =====================================================================
# Page Configurations & Aesthetic Themes
# =====================================================================
st.set_page_config(
    page_title="VoltForecast - Energy Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Slate / Neon Green Theme resembling the web app)
st.markdown("""
<style>
    /* Global styles */
    .stApp {
        background-color: #0E0E10;
        color: #F1F5F9;
    }
    h1, h2, h3, h4, h5, h6 {
        color: #FFFFFF !important;
        font-family: 'Space Grotesk', sans-serif;
    }
    .metric-card {
        background-color: #18181B;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 15px;
    }
    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: #C1FF72;
        font-family: 'JetBrains Mono', monospace;
    }
    .metric-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #8E8E93;
        font-weight: 600;
    }
    .metric-sub {
        font-size: 11px;
        color: #4B5563;
        margin-top: 4px;
    }
    /* Buttons and inputs */
    div.stButton > button {
        background-color: #C1FF72 !important;
        color: #000000 !important;
        border-radius: 12px !important;
        font-weight: bold !important;
        border: none !important;
        transition: all 0.2s ease;
    }
    div.stButton > button:hover {
        background-color: #D8FF9A !important;
        transform: translateY(-1px);
    }
</style>
""", unsafe_allow_html=True)

# =====================================================================
# 1. Data Generator (Household Electric Power Consumption style)
# =====================================================================
@st.cache_data
def generate_energy_data(days=60):
    np.random.seed(42)
    end_date = datetime.datetime(2026, 7, 4, 23, 0)
    start_date = end_date - datetime.timedelta(days=days)
    
    timestamps = pd.date_range(start=start_date, end=end_date, freq='h')
    n_hours = len(timestamps)
    
    # Generate diurnal active power profile
    # Double peak model: small morning peak around 8am, large evening peak around 8pm
    hour_of_day = timestamps.hour
    day_of_week = timestamps.dayofweek # 0=Monday, 6=Sunday
    
    base_pattern = 0.4 + 0.3 * np.sin(2 * np.pi * (hour_of_day - 5) / 24)
    base_pattern += 0.4 * np.exp(-((hour_of_day - 8) / 2.0)**2)  # Morning peak
    base_pattern += 0.8 * np.exp(-((hour_of_day - 20) / 3.0)**2) # Evening peak
    
    # Higher load on weekends (Saturday=5, Sunday=6)
    weekend_factor = np.where(day_of_week >= 5, 1.25, 1.0)
    
    # Noise and fluctuations
    noise = np.random.normal(0, 0.15, n_hours)
    active_power = np.clip((base_pattern * weekend_factor) + noise, 0.15, 6.5)
    
    # Reactive power calculation (lower power factor during peak hours)
    reactive_power = np.clip(active_power * 0.18 + np.random.normal(0, 0.04, n_hours), 0.02, 1.2)
    
    # Indian Standard Voltage (typically 220V to 240V, slightly dips during evening peak)
    voltage = 238.0 - 5.0 * np.exp(-((hour_of_day - 20) / 4.0)**2) + np.random.normal(0, 1.2, n_hours)
    
    # Amps calculation (I = P_active * 1000 / V * pf)
    intensity = (active_power * 1000) / (voltage * 0.92)
    
    # Sub-meterings (in watt-hours per hour)
    # Sub 1: Kitchen appliances (mostly breakfast/dinner)
    kitchen = np.where((hour_of_day >= 7) & (hour_of_day <= 9), np.random.uniform(250, 800, n_hours), 0)
    kitchen += np.where((hour_of_day >= 19) & (hour_of_day <= 21), np.random.uniform(300, 1000, n_hours), 0)
    kitchen = np.clip(kitchen + np.random.normal(30, 15, n_hours), 0, 1200)
    
    # Sub 2: Laundry and wet utilities (mostly morning/afternoon water pump)
    laundry = np.where((hour_of_day >= 9) & (hour_of_day <= 14), np.random.uniform(200, 700, n_hours), 0)
    laundry = np.clip(laundry + np.random.normal(20, 10, n_hours), 0, 950)
    
    # Sub 3: Heavy loads (ACs/Geysers, highly active during afternoon heat and evening)
    climate = np.where((hour_of_day >= 12) & (hour_of_day <= 16), np.random.uniform(400, 1500, n_hours), 0)
    climate += np.where((hour_of_day >= 21) | (hour_of_day <= 5), np.random.uniform(300, 1200, n_hours), 0)
    climate = np.clip(climate + np.random.normal(50, 20, n_hours), 0, 1800)
    
    # Other loads (Ceiling fans, lighting, general devices)
    total_wh = active_power * 1000
    other = np.clip(total_wh - (kitchen + laundry + climate), 0, None)
    
    df = pd.DataFrame({
        'timestamp': timestamps,
        'activePower': np.round(active_power, 3),
        'reactivePower': np.round(reactive_power, 3),
        'voltage': np.round(voltage, 1),
        'intensity': np.round(intensity, 2),
        'subMetering1': np.round(kitchen).astype(int),
        'subMetering2': np.round(laundry).astype(int),
        'subMetering3': np.round(climate).astype(int),
        'otherMetering': np.round(other).astype(int)
    })
    
    return df

# Initialize Data
df_raw = generate_energy_data(60)

# =====================================================================
# Sidebar Filters & Control Deck
# =====================================================================
st.sidebar.image("https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=200&auto=format&fit=crop", width=240)
st.sidebar.markdown("<h2 style='text-align: center; margin-bottom: 25px;'>VoltForecast ⚡</h2>", unsafe_allow_html=True)

st.sidebar.markdown("### 📅 Date Horizon")
min_date = df_raw['timestamp'].min().date()
max_date = df_raw['timestamp'].max().date()

start_date = st.sidebar.date_input("Start Date", min_date, min_value=min_date, max_value=max_date)
end_date = st.sidebar.date_input("End Date", max_date, min_value=min_date, max_value=max_date)

# View Mode
view_mode = st.sidebar.radio("Aggregation Mode", ["Hourly", "Daily Mean"])

# Filter active dataset based on inputs
mask = (df_raw['timestamp'].dt.date >= start_date) & (df_raw['timestamp'].dt.date <= end_date)
df_active = df_raw.loc[mask].copy()

# =====================================================================
# Main Header Dashboard Tabs
# =====================================================================
col_header, col_sub = st.columns([3, 1])
with col_header:
    st.markdown("<p style='font-size:12px; color:#C1FF72; font-weight:bold; letter-spacing:0.2em; text-transform:uppercase;'>Terminal Controller</p>", unsafe_allow_html=True)
    st.markdown("<h1 style='font-weight: 300; font-size: 50px; line-height: 1.1;'>ENERGY SYSTEM <br/><span style='font-family:serif; font-style:italic; color:#C1FF72;'>FORECASTS & ANALYTICS</span></h1>", unsafe_allow_html=True)
with col_sub:
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown(f"**Today's Date:** 2026-07-04<br>**Active Range:** {start_date} to {end_date}", unsafe_allow_html=True)

st.markdown("---")

tab1, tab2, tab3 = st.tabs(["📊 Live Overview", "🔮 Predictive Forecasting", "💬 Smart AI Chatbot"])

# =====================================================================
# TAB 1: Live Overview
# =====================================================================
with tab1:
    # Aggregation transformation if requested
    if view_mode == "Daily Mean":
        df_display = df_active.groupby(df_active['timestamp'].dt.date).mean().reset_index()
        df_display['timestamp'] = pd.to_datetime(df_display['timestamp'])
    else:
        df_display = df_active.copy()

    # Metrics Calculations
    total_records = len(df_active)
    total_kwh = df_active['activePower'].sum()  # Since readings are hourly, Sum(kW) * 1h = Total kWh
    avg_power_kw = df_active['activePower'].mean() if total_records > 0 else 0
    estimated_cost = total_kwh * 7.50 # Typical Indian domestic rate of ₹7.50/kWh
    
    # Peak Record
    peak_val = 0
    peak_time_str = "N/A"
    if not df_active.empty:
        peak_idx = df_active['activePower'].idxmax()
        peak_val = df_active.loc[peak_idx, 'activePower']
        peak_time_str = df_active.loc[peak_idx, 'timestamp'].strftime('%d %b, %H:%M')

    # Submeterings conversion (Wh to kWh)
    sub1_kwh = df_active['subMetering1'].sum() / 1000
    sub2_kwh = df_active['subMetering2'].sum() / 1000
    sub3_kwh = df_active['subMetering3'].sum() / 1000
    other_kwh = df_active['otherMetering'].sum() / 1000

    # Layout Metric Grid
    m_col1, m_col2, m_col3, m_col4 = st.columns(4)
    with m_col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Grid Consumption</div>
            <div class="metric-value">{total_kwh:,.1f} <span style='font-size:14px; color:#FFFFFF;'>kWh</span></div>
            <div class="metric-sub">Total energy consumed</div>
        </div>
        """, unsafe_allow_html=True)
    with m_col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Estimated Bill</div>
            <div class="metric-value">₹ {estimated_cost:,.2f}</div>
            <div class="metric-sub">At average ₹7.50 per unit</div>
        </div>
        """, unsafe_allow_html=True)
    with m_col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Peak Demand</div>
            <div class="metric-value">{peak_val:.2f} <span style='font-size:14px; color:#FFFFFF;'>kW</span></div>
            <div class="metric-sub">Recorded at: {peak_time_str}</div>
        </div>
        """, unsafe_allow_html=True)
    with m_col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Mean Load</div>
            <div class="metric-value">{avg_power_kw:.3f} <span style='font-size:14px; color:#FFFFFF;'>kW</span></div>
            <div class="metric-sub">Average energy draw</div>
        </div>
        """, unsafe_allow_html=True)

    # Charts Section
    st.markdown("### 📈 Energy Trend Visualizer")
    
    # Downsample hourly chart to max 120 points for fast rendering on plot
    step = max(1, len(df_display) // 120)
    df_chart = df_display.iloc[::step].copy()

    fig_trend = px.line(
        df_chart, 
        x='timestamp', 
        y='activePower',
        labels={'timestamp': 'Timeline', 'activePower': 'Active Power (kW)'},
        color_discrete_sequence=['#C1FF72']
    )
    fig_trend.update_layout(
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font_color='#E4E4E6',
        xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)'),
        yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)'),
        margin=dict(l=40, r=20, t=10, b=40),
        height=350
    )
    st.plotly_chart(fig_trend, use_container_width=True)

    c_left, c_right = st.columns(2)
    with c_left:
        st.markdown("### 🍕 Sub-metering Distribution (kWh)")
        labels = ['Kitchen', 'Laundry', 'Climate Control', 'Fans & Sockets']
        values = [sub1_kwh, sub2_kwh, sub3_kwh, other_kwh]
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=labels, 
            values=values, 
            hole=.6,
            marker=dict(colors=['#C1FF72', '#E4E4E6', '#8E8E93', '#3A3A3C'])
        )])
        fig_pie.update_layout(
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font_color='#E4E4E6',
            margin=dict(l=20, r=20, t=20, b=20),
            height=300,
            showlegend=True
        )
        st.plotly_chart(fig_pie, use_container_width=True)

    with c_right:
        st.markdown("### 🕒 Diurnal Hourly Load Profile")
        hourly_mean = df_active.groupby(df_active['timestamp'].dt.hour)['activePower'].mean().reset_index()
        
        # Color specific high peak hours
        colors = ['rgba(255,255,255,0.1)'] * 24
        for h in range(24):
            if (h >= 7 and h <= 9) or (h >= 18 and h <= 21):
                colors[h] = '#C1FF72' # Highlight peak hours
                
        fig_hour = go.Figure(data=[go.Bar(
            x=hourly_mean['timestamp'],
            y=hourly_mean['activePower'],
            marker_color=colors
        )])
        fig_hour.update_layout(
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font_color='#E4E4E6',
            xaxis=dict(title='Hour of Day (24-hr)', tickmode='linear', dtick=2, showgrid=False),
            yaxis=dict(title='Avg Load (kW)', showgrid=True, gridcolor='rgba(255,255,255,0.05)'),
            margin=dict(l=40, r=20, t=20, b=40),
            height=300
        )
        st.plotly_chart(fig_hour, use_container_width=True)

# =====================================================================
# TAB 2: Predictive Forecasting
# =====================================================================
with tab2:
    st.markdown("### 🔮 Next-Week Demand Forecasting")
    st.markdown("This module runs a localized predictive model to project demand and voltage trends for the upcoming week based on historical trends.")

    # Generate 7 days of forecast
    last_timestamp = df_active['timestamp'].max() if not df_active.empty else datetime.datetime.now()
    forecast_idx = pd.date_range(start=last_timestamp + datetime.timedelta(hours=1), periods=168, freq='h')
    
    # Baseline forecasting calculation based on historical averages + slight upward growth trend
    historical_hour_avg = df_active.groupby(df_active['timestamp'].dt.hour)['activePower'].mean().to_dict()
    historical_weekday_avg = df_active.groupby(df_active['timestamp'].dt.dayofweek)['activePower'].mean().to_dict()
    overall_mean = df_active['activePower'].mean() if not df_active.empty else 1.2
    
    forecast_values = []
    for dt in forecast_idx:
        hr = dt.hour
        dow = dt.dayofweek
        
        # Weighted predictive baseline
        base_h = historical_hour_avg.get(hr, overall_mean)
        base_w = historical_weekday_avg.get(dow, overall_mean)
        val = (base_h * 0.7 + base_w * 0.3) + np.random.normal(0, 0.08)
        forecast_values.append(max(0.1, val))

    df_forecast = pd.DataFrame({
        'timestamp': forecast_idx,
        'activePower': np.round(forecast_values, 3)
    })

    # Combined Trend Graph
    hist_subset = df_active.tail(72).copy() if len(df_active) > 72 else df_active.copy()
    
    fig_fc = go.Figure()
    fig_fc.add_trace(go.Scatter(
        x=hist_subset['timestamp'], 
        y=hist_subset['activePower'], 
        name='Historical Load',
        line=dict(color='#8E8E93', width=2)
    ))
    fig_fc.add_trace(go.Scatter(
        x=df_forecast['timestamp'], 
        y=df_forecast['activePower'], 
        name='Predicted Forecast',
        line=dict(color='#C1FF72', width=2, dash='dash')
    ))
    fig_fc.update_layout(
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font_color='#E4E4E6',
        xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)'),
        yaxis=dict(title='Load (kW)', showgrid=True, gridcolor='rgba(255,255,255,0.05)'),
        margin=dict(l=40, r=20, t=10, b=40),
        height=380,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig_fc, use_container_width=True)

    # Forecast Analysis Cards
    f_total_kwh = sum(forecast_values)
    f_estimated_cost = f_total_kwh * 7.50
    f_peak = max(forecast_values)

    fc1, fc2, fc3 = st.columns(3)
    with fc1:
        st.markdown(f"""
        <div class="metric-card" style="border-left: 4px solid #C1FF72;">
            <div class="metric-label">Predicted Consumption (7D)</div>
            <div class="metric-value">{f_total_kwh:.1f} kWh</div>
            <div class="metric-sub">Expected consumption next week</div>
        </div>
        """, unsafe_allow_html=True)
    with fc2:
        st.markdown(f"""
        <div class="metric-card" style="border-left: 4px solid #E4E4E6;">
            <div class="metric-label">Projected Tariff (7D)</div>
            <div class="metric-value">₹ {f_estimated_cost:.2f}</div>
            <div class="metric-sub">Expected addition to bill</div>
        </div>
        """, unsafe_allow_html=True)
    with fc3:
        st.markdown(f"""
        <div class="metric-card" style="border-left: 4px solid #8E8E93;">
            <div class="metric-label">Peak Demand Probability</div>
            <div class="metric-value">{f_peak:.2f} kW</div>
            <div class="metric-sub">Highest peak likely around 8:00 PM</div>
        </div>
        """, unsafe_allow_html=True)

# =====================================================================
# TAB 3: Smart AI Chatbot
# =====================================================================
with tab3:
    st.markdown("### 💬 VoltBot - Intelligent Home Energy Advisor")
    st.markdown("Our dedicated customer executive, VoltBot, is online to audit your energy statistics and offer saving plans.")

    # Local Knowledge base for Smart Rule-based responses
    def get_assistant_response(query_text, summary_data):
        q = query_text.lower().strip()
        polite_header = "Dear Valued Customer, thank you for your query. I am absolutely delighted to present your customized home energy audit details below:\n\n"
        polite_footer = "\n\nI hope these customized suggestions serve you exceptionally well. Please let me know if I can assist with any further questions. Have a magnificent day ahead! 🙏"
        
        if "hello" in q or "hi" in q or "hey" in q or "namaste" in q:
            return (
                "Dear Valued Customer, warm greetings from VoltForecast! My name is VoltBot, and I am absolutely delighted to assist you today as your personal energy support executive.\n\n"
                "Please let me know how I can guide you today regarding your energy consumption, AC load optimizations, kitchen appliances, or voltage stability!"
            )
            
        elif "saving" in q or "reduce" in q or "optimize" in q or "bill" in q or "cut" in q:
            return polite_header + (
                f"* **Total Usage**: **{summary_data['total_kwh']:.1f} kWh**\n"
                f"* **Estimated Cost**: **₹{summary_data['estimated_cost']:.2f}** (at an average tariff of ₹7.50 per unit)\n"
                f"* **Climate Control (Sub-3)**: represents {(summary_data['sub3_kwh']/max(1, summary_data['total_kwh']))*100:.1f}% of your consumption.\n\n"
                "**Custom Executive Recommendations**:\n"
                "1. **BEE 5-Star Transition**: Upgrading to a 5-Star Bureau of Energy Efficiency rated inverter AC can slash cooling load by up to 35%.\n"
                "2. **Optimal Temperature Setpoint**: Maintain air conditioners at 24°C - 26°C with low ceiling fans rather than cooling down to 18°C.\n"
                "3. **Rooftop Solar Incentive**: Leverage the PM-Surya Ghar Muft Bijli Yojana. A 3kW setup can bring your electric bill virtually close to zero."
            ) + polite_footer
            
        elif "kitchen" in q or "submetering1" in q or "cook" in q or "microwave" in q:
            return polite_header + (
                f"* **Kitchen Consumption**: **{summary_data['sub1_kwh']:.1f} kWh**\n"
                "* **Induction Cooking**: Highly efficient (~85%) compared to gas cooktops (~40%). Always use flat-bottomed ferromagnetic pans.\n"
                "* **Standby Load Savings**: Turn off heavy kitchen microwave/ovens directly at the wall socket to completely eliminate passive standby power."
            ) + polite_footer
            
        elif "voltage" in q or "fluctuation" in q or "stability" in q or "v" in q:
            avg_v = summary_data['avg_v']
            return polite_header + (
                f"* **Average Voltage**: **{avg_v:.1f} Volts** (Standard operating voltage in India is 230V AC)\n"
                "* **Fluctuation Protections**: Grid dips are common in high peak residential zones. We politely recommend digital voltage stabilizers with automatic low/high voltage cutoff protectors for sensitive refrigerator or AC compressors."
            ) + polite_footer
            
        elif "forecast" in q or "predict" in q or "future" in q or "next week" in q:
            return polite_header + (
                "* **Predicted Weekly Usage**: **~250 kWh**\n"
                "* **Spike Hazards**: Peak evening hour (6:00 PM - 10:00 PM) residential cooling represents the highest loading hazard.\n"
                "* **Actionable Advice**: Run heavy washing machines or high-load water pumps during off-peak morning hours."
            ) + polite_footer
            
        else:
            return polite_header + (
                f"* **Your Active Draw**: Averaging {summary_data['avg_power']:.3f} kW.\n"
                f"* **Average voltage**: {summary_data['avg_v']:.1f} V.\n"
                "* **Actionable Advice**: Try asking me about **'reducing bills'**, **'AC savings'**, or **'voltage stabilizer'** for highly specific, compact support."
            ) + polite_footer

    # State variables for chat history
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            {"role": "assistant", "content": "Dear Valued Customer, warm greetings from VoltForecast! My name is VoltBot, and I am absolutely delighted to assist you today as your personal energy support executive.\n\nHow may I be of service to you today, sir/madam?"}
        ]

    # Display conversations
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Collect User query
    user_query = st.chat_input("Ask VoltBot something...")
    if user_query:
        # Append user message
        st.session_state.chat_history.append({"role": "user", "content": user_query})
        with st.chat_message("user"):
            st.markdown(user_query)
            
        # Get response
        summary_payload = {
            'total_kwh': total_kwh,
            'estimated_cost': estimated_cost,
            'sub1_kwh': sub1_kwh,
            'sub2_kwh': sub2_kwh,
            'sub3_kwh': sub3_kwh,
            'other_kwh': other_kwh,
            'avg_power': avg_power_kw,
            'avg_v': df_active['voltage'].mean() if not df_active.empty else 238.0
        }
        
        bot_response = get_assistant_response(user_query, summary_payload)
        
        # Append and display bot response
        st.session_state.chat_history.append({"role": "assistant", "content": bot_response})
        with st.chat_message("assistant"):
            st.markdown(bot_response)

# Footer credit
st.markdown("<br><br><hr><p style='text-align: center; color: #4B5563; font-size: 11px;'>VoltForecast Terminal System • Crafted for India Smart Grid Performance • Run locally with `streamlit run voltforecast.py`</p>", unsafe_allow_html=True)
