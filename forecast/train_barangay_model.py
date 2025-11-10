import warnings
warnings.filterwarnings("ignore")

from supabase import create_client
from sklearn.preprocessing import LabelEncoder
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
import pandas as pd
import joblib
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

def main():
    rate_df = fetch_table("rate_and_classification")
    pop_df = fetch_table("population_records")
    weather_df = fetch_table("weather_records")

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

    X = merged[[
        "Barangay", "Year", "Week", "Population",
        "average_weekly_temperature",
        "average_weekly_relative_humidity",
        "total_weekly_rainfall",
        "average_weekly_wind_speed",
        "average_weekly_wind_direction"
    ]]
    y = merged["risk_classification"]

    le_barangay = LabelEncoder()
    X["Barangay"] = le_barangay.fit_transform(X["Barangay"])

    le_risk = LabelEncoder()
    y_encoded = le_risk.fit_transform(y)

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
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
    model.fit(
        X_balanced, y_balanced,
        eval_set=[(X_val, y_val)],
        verbose=False
    )

    os.makedirs("forecast", exist_ok=True)
    joblib.dump(model, "forecast/model_barangay.joblib")
    joblib.dump(le_barangay, "forecast/le_barangay.joblib")
    joblib.dump(le_risk, "forecast/le_risk_barangay.joblib")

    print("Barangay model training completed and saved successfully.")

if __name__ == "__main__":
    main()