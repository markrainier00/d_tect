import warnings
warnings.filterwarnings("ignore")
from supabase import create_client
import pandas as pd
from xgboost import XGBRegressor
import os

# === CONFIG ===
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabaseClient = create_client(SUPABASE_URL, SUPABASE_KEY)

# === HELPERS ===
def fetch_table(table_name, batch_size=1000):
    all_data = []
    start = 0

    while True:
        end = start + batch_size - 1
        res = supabaseClient.table(table_name).select("*").range(start, end).execute()
        data = res.data or []
        if not data:
            break
        all_data.extend(data)
        if len(data) < batch_size:
            break
        start += batch_size

    df = pd.DataFrame(all_data)
    if "id" in df.columns:
        df = df.drop(columns=["id"])
    return df

def main():
    # Fetch all tables
    rate_df = fetch_table("rate_and_classification")
    pop_df = fetch_table("population_records")
    weather_df = fetch_table("weather_records")

    # Merge data
    merged = rate_df.merge(
        pop_df[["Barangay", "Year", "Week", "Population"]],
        on=["Barangay", "Year", "Week"],
        how="left"
    ).merge(
        weather_df[[
            "Year", "Week",
            "average_weekly_temperature",
            "average_weekly_relative_humidity",
            "total_weekly_rainfall",
            "average_weekly_wind_speed",
            "average_weekly_wind_direction"
        ]],
        on=["Year", "Week"],
        how="left"
    )

    merged["date"] = pd.to_datetime(
        merged["Year"].astype(str) + merged["Week"].astype(str) + "1",
        format="%Y%W%w"
    )
    merged = merged.sort_values(["Barangay", "date"]).reset_index(drop=True)

    # Truncate old forecast results
    supabaseClient.table("forecast_results").delete().neq("Barangay", "").execute()

    all_results = []

    # Forecast per Barangay
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

        X = brgy_df[features]
        y = brgy_df["Cases"]

        model = XGBRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        model.fit(X, y)

        last_row = brgy_df.iloc[-1].copy()
        preds = []

        for _ in range(10):
            next_date = last_row["date"] + pd.Timedelta(weeks=1)
            last_row["date"] = next_date
            
            features_row = last_row[features]

            pred = float(model.predict(features_row.values.reshape(1, -1))[0])
            pred = max(0, round(pred))
            preds.append({
                "Barangay": brgy,
                "date": next_date.strftime("%Y-%m-%d"),
                "forecasted_cases": pred
            })

            # Update lags for next iteration
            last_row["cases_lag2"] = last_row["cases_lag1"]
            last_row["cases_lag1"] = pred

        all_results.extend(preds)

    all_results = pd.DataFrame(all_results)

    # === Compute Risk Levels ===
    if not all_results.empty:
        # Merge mean and std from historical data
        stats = merged.groupby("Barangay")["Cases"].agg(["mean", "std"]).reset_index()
        all_results = all_results.merge(stats, on="Barangay", how="left")

        def assign_risk_level(row):
            if pd.isna(row["std"]):
                return "Insufficient Data"
            if row["forecasted_cases"] > row["mean"] + 2 * row["std"]:
                return "High Risk"
            elif row["forecasted_cases"] > row["mean"] + row["std"]:
                return "Moderate Risk"
            else:
                return "Low Risk"

        all_results["risk_level"] = all_results.apply(assign_risk_level, axis=1)
        all_results = all_results[["Barangay", "date", "forecasted_cases", "risk_level"]]

        # Insert into Supabase (batch insert to avoid rate limits)
        batch_size = 100
        for i in range(0, len(all_results), batch_size):
            batch = all_results.iloc[i:i+batch_size].to_dict(orient="records")
            supabaseClient.table("forecast_results").insert(batch).execute()

if __name__ == "__main__":
    main()
