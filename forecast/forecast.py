import warnings
warnings.filterwarnings("ignore")
from supabase import create_client
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from datetime import datetime, timedelta, date
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_table(table_name, batch_size=1000):
    all_data = []
    start = 0

    while True:
        end = start + batch_size - 1
        res = supabase.table(table_name).select("*").range(start, end).execute()
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

def get_iso_weeks(year):
    return date(year, 12, 28).isocalendar()[1]

def main():
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

    merged["date"] = merged.apply(
        lambda row: datetime.fromisocalendar(int(row["Year"]), int(row["Week"]), 1),
        axis=1
    )
    merged = merged.sort_values(["Barangay", "date"]).reset_index(drop=True)
    merged["month_num"] = merged["date"].dt.month
    merged["week_num"] = merged["date"].dt.isocalendar().week.astype(int)

    # Truncate old forecast results
    supabase.table("forecast_results").delete().neq("Barangay", "").execute()

    X = merged[[
        "Barangay", "Year", "Week", "Population",
        "average_weekly_temperature",
        "average_weekly_relative_humidity",
        "total_weekly_rainfall",
        "average_weekly_wind_speed",
        "average_weekly_wind_direction",
        "month_num", "week_num"
    ]]

    y = merged["risk_classification"]

    # Encode categorical Barangay and target
    le_barangay = LabelEncoder()
    X["Barangay"] = le_barangay.fit_transform(X["Barangay"])

    le_risk = LabelEncoder()
    y_encoded = le_risk.fit_transform(y)

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    smote = SMOTE(random_state=42)
    X_balanced, y_balanced = smote.fit_resample(X_train, y_train)

    model = XGBClassifier(
        objective="multi:softmax",
        num_class=len(le_risk.classes_),
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42
    )
    model.fit(X_balanced, y_balanced)
    
    # y_pred = model.predict(X_test)

    barangays = pop_df["Barangay"].unique()
    today = datetime.today()
    current_year, current_week, _ = today.isocalendar()

    future_weeks_list = []
    for i in range(10):
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

    # Merge with historical averages
    future_weather = future_weeks.merge(
        weekly_avg_weather,
        on="Week",
        how="left"
    )

    # Add month and week number columns
    future_weather["month_num"] = future_weather.apply(
        lambda row: datetime.fromisocalendar(int(row["Year"]), int(row["Week"]), 1).month,
        axis=1
    )

    future_weather["week_num"] = future_weather["Week"]

    # Encode Barangay
    future_weather["Barangay"] = le_barangay.transform(future_weather["Barangay"])
    
    pred_encoded = model.predict(future_weather)
    pred_label = le_risk.inverse_transform(pred_encoded)
    future_weather["predicted_risk"] = pred_label

    # Clean the table
    future_weather["Barangay"] = le_barangay.inverse_transform(future_weather["Barangay"])

    weather_cols = [
        "average_weekly_temperature",
        "average_weekly_relative_humidity",
        "total_weekly_rainfall",
        "average_weekly_wind_speed",
        "average_weekly_wind_direction"
    ]
    future_weather[weather_cols] = future_weather[weather_cols].round(2)

    def week_start_end(year, week):
        start_date = datetime.fromisocalendar(year, week, 1)  # Monday
        end_date = start_date + timedelta(days=6)             # Sunday
        return f"{start_date.date()} to {end_date.date()}"

    future_weather["week_range"] = future_weather.apply(
        lambda row: week_start_end(row["Year"], row["Week"]),
        axis=1
    )

    future_weather = future_weather.drop(columns=["Year", "Week", "month_num", "week_num"])

    # Reorder columns nicely
    cols = ["Barangay", "week_range", "Population",
            "average_weekly_temperature",
            "average_weekly_relative_humidity",
            "total_weekly_rainfall",
            "average_weekly_wind_speed",
            "average_weekly_wind_direction",
            "predicted_risk"]

    future_weather = future_weather[cols]
    
    batch_size = 100
    for i in range(0, len(future_weather), batch_size):
        batch = future_weather.iloc[i:i+batch_size].to_dict(orient="records")
        supabase.table("forecast_results").insert(batch).execute()


if __name__ == "__main__":
    main()