import warnings
warnings.filterwarnings("ignore")
from supabase import create_client
import pandas as pd
from xgboost import XGBRegressor
import numpy as np
import json
import sys
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_table(table_name, batch_size=1000):
    all_data, start = [], 0
    while True:
        end = start + batch_size - 1
        res = supabase.table(table_name).select("*").range(start, end).execute()
        data = res.data or []
        if not data: break
        all_data.extend(data)
        if len(data) < batch_size: break
        start += batch_size
    df = pd.DataFrame(all_data)
    if "id" in df.columns:
        df = df.drop(columns=["id"])
    return df

def main():
    # Fetch and merge
    rate_df = fetch_table("rate_and_classification")
    pop_df = fetch_table("population_records")
    weather_df = fetch_table("weather_records")

    merged = rate_df.merge(
        pop_df[["Barangay","Year","Week","Population"]],
        on=["Barangay","Year","Week"],
        how="left"
    ).merge(
        weather_df[[
            "Year","Week",
            "average_weekly_temperature",
            "average_weekly_relative_humidity",
            "total_weekly_rainfall",
            "average_weekly_wind_speed",
            "average_weekly_wind_direction"
        ]],
        on=["Year","Week"],
        how="left"
    )

    merged["date"] = pd.to_datetime(
        merged["Year"].astype(str) + merged["Week"].astype(str) + "0",
        format="%Y%W%w"
    )
    merged = merged.sort_values(["Barangay","date"]).reset_index(drop=True)

    results = []
    for brgy in merged["Barangay"].unique():
        brgy_df = merged[merged["Barangay"] == brgy].dropna(subset=["Cases"])
        if len(brgy_df) < 3:
            continue
        brgy_df["cases_lag1"] = brgy_df["Cases"].shift(1)
        brgy_df["cases_lag2"] = brgy_df["Cases"].shift(2)
        brgy_df["month_num"] = brgy_df["date"].dt.month
        brgy_df["week_num"] = brgy_df["date"].dt.isocalendar().week.astype(int)
        brgy_df = brgy_df.dropna()

        features = [
            "average_weekly_temperature",
            "average_weekly_relative_humidity",
            "total_weekly_rainfall",
            "average_weekly_wind_speed",
            "cases_lag1",
            "cases_lag2",
            "month_num",
            "week_num"
        ]
        X, y = brgy_df[features], brgy_df["Cases"]
        model = XGBRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=5,
            subsample=0.8, colsample_bytree=0.8, random_state=42
        )
        model.fit(X, y)

        last_row = brgy_df.iloc[-1].copy()
        preds = []
        for _ in range(10):
            next_date = last_row["date"] + pd.Timedelta(weeks=1)
            last_row["date"] = next_date
            features_row = last_row[features]
            pred = float(model.predict(features_row.values.reshape(1, -1))[0])
            preds.append({
                "Barangay": brgy,
                "predicted_date": next_date.strftime("%Y-%m-%d"),
                "predicted_cases": pred
            })

        results.extend(preds)

    print(json.dumps(results))

if __name__ == "__main__":
    main()
