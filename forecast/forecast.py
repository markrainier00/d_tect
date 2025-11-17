import warnings
warnings.filterwarnings("ignore")

from supabase import create_client
import pandas as pd
import joblib
from datetime import datetime, timedelta, date
import os
import sys
import json

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_table(table_name):
    res = supabase.table(table_name).select("*").execute()
    df = pd.DataFrame(res.data)
    if "id" in df.columns:
        df = df.drop(columns=["id"])
    return df

def get_iso_weeks(year):
    return date(year, 12, 28).isocalendar()[1]

# =========Citywide=========
def generate_citywide_forecast(num_weeks, model, le_risk):
    pop_df = fetch_table("population_records")
    weather_df = fetch_table("weather_records")

    today = datetime.today()
    current_year, current_week, _ = today.isocalendar()

    future_weeks_list = []
    for i in range(num_weeks):
        week = current_week + i
        year = current_year
        max_week = get_iso_weeks(year)
        while week > max_week:
            week -= max_week
            year += 1

        population = pop_df["Population"].sum()
        future_weeks_list.append({
            "Year": year,
            "Week": week,
            "Population": population
        })

    future_weeks = pd.DataFrame(future_weeks_list)

    weekly_avg_weather = weather_df.groupby('Week', as_index=False).agg({
        'average_weekly_temperature': 'mean',
        'average_weekly_relative_humidity': 'mean',
        'total_weekly_rainfall': 'mean',
        'average_weekly_wind_speed': 'mean',
        'average_weekly_wind_direction': 'mean'
    })

    future_weather = future_weeks.merge(weekly_avg_weather, on="Week", how="left")

    pred_encoded = model.predict(future_weather)
    pred_label = le_risk.inverse_transform(pred_encoded)
    future_weather["predicted_risk"] = pred_label

    def week_start_end(y, w):
        start = datetime.fromisocalendar(y, w, 1)
        end = start + timedelta(days=6)
        return f"{start.date()} to {end.date()}"

    future_weather["week_range"] = future_weather.apply(lambda r: week_start_end(r["Year"], r["Week"]), axis=1)

    cols = ["week_range", "predicted_risk"]
    return future_weather[cols]

# =========Barangays=========
def generate_barangay_forecast(num_weeks, model, le_barangay, le_risk):
    pop_df = fetch_table("population_records")
    weather_df = fetch_table("weather_records")

    pop_df = pop_df.sort_values(["Barangay", "Year", "Week"])
    barangays = pop_df["Barangay"].unique()
    today = datetime.today()
    current_year, current_week, _ = today.isocalendar()

    future_weeks_list = []
    for i in range(num_weeks):
        week = current_week + i
        year = current_year
        max_week = get_iso_weeks(year)
        while week > max_week:
            week -= max_week
            year += 1
        for b in barangays:
            population = pop_df[pop_df["Barangay"] == b]["Population"].iloc[-1]
            future_weeks_list.append({
                "Barangay": b,
                "Year": year,
                "Week": week,
                "Population": population
            })

    future_weeks = pd.DataFrame(future_weeks_list)

    weekly_avg_weather = weather_df.groupby('Week', as_index=False).agg({
        'average_weekly_temperature': 'mean',
        'average_weekly_relative_humidity': 'mean',
        'total_weekly_rainfall': 'mean',
        'average_weekly_wind_speed': 'mean',
        'average_weekly_wind_direction': 'mean'
    })

    future_weather = future_weeks.merge(weekly_avg_weather, on="Week", how="left")

    future_weather["Barangay"] = le_barangay.transform(future_weather["Barangay"])

    pred_encoded = model.predict(future_weather)
    pred_label = le_risk.inverse_transform(pred_encoded)
    future_weather["predicted_risk"] = pred_label
    future_weather["Barangay"] = le_barangay.inverse_transform(future_weather["Barangay"])

    def week_start_end(y, w):
        start = datetime.fromisocalendar(y, w, 1)
        end = start + timedelta(days=6)
        return f"{start.date()} to {end.date()}"
    
    future_weather["week_range"] = future_weather.apply(lambda r: week_start_end(r["Year"], r["Week"]), axis=1)

    cols = ["Barangay", "week_range", "predicted_risk"]
    return future_weather[cols]

# =========Main=========
def main(mode="barangay", num_weeks=10):

    if mode == "citywide":
        model = joblib.load("forecast/model_citywide.joblib")
        le_risk = joblib.load("forecast/le_risk_citywide.joblib")
        forecast_df = generate_citywide_forecast(num_weeks, model, le_risk)
    else:
        model = joblib.load("forecast/model_barangay.joblib")
        le_barangay = joblib.load("forecast/le_barangay.joblib")
        le_risk = joblib.load("forecast/le_risk_barangay.joblib")
        forecast_df = generate_barangay_forecast(num_weeks, model, le_barangay, le_risk)

    print(forecast_df.to_json(orient="records"))
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "barangay"
    num_weeks = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    main(mode, num_weeks)
