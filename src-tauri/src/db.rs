use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::thread;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MatchRecord {
    pub id: String,
    pub timestamp: i64,
    pub hero_id: i32,
    pub hero_name: String,
    pub hero_display_name: String,
    pub role: String,
    pub match_duration: i32,
    pub won: Option<bool>,
    pub kills: i32,
    pub deaths: i32,
    pub assists: i32,
    pub cs_at_10: i32,
    pub denies_at_10: i32,
    pub cs_benchmark_at_10: i32,
    pub net_worth: i32,
    pub gpm: i32,
    pub xpm: i32,
    pub overall_score: i32,
    pub overall_grade: String,
    pub data_json: String,
}

fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .or_else(|_| app.path().app_config_dir())
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("dotaassist_matches.db"))
}

fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS matches (
             id TEXT PRIMARY KEY,
             timestamp INTEGER NOT NULL,
             hero_id INTEGER NOT NULL,
             hero_name TEXT NOT NULL,
             hero_display_name TEXT NOT NULL,
             role TEXT NOT NULL,
             match_duration INTEGER NOT NULL,
             won INTEGER,
             kills INTEGER NOT NULL,
             deaths INTEGER NOT NULL,
             assists INTEGER NOT NULL,
             cs_at_10 INTEGER NOT NULL,
             denies_at_10 INTEGER NOT NULL,
             cs_benchmark_at_10 INTEGER NOT NULL,
             net_worth INTEGER NOT NULL,
             gpm INTEGER NOT NULL,
             xpm INTEGER NOT NULL,
             overall_score INTEGER NOT NULL,
             overall_grade TEXT NOT NULL,
             data_json TEXT NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_matches_timestamp ON matches(timestamp DESC);",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
pub fn save_match_record(app: AppHandle, record: MatchRecord) -> Result<(), String> {
    thread::spawn(move || -> Result<(), String> {
        let conn = open_connection(&app)?;
        let won_val = record.won.map(|w| if w { 1 } else { 0 });
        conn.execute(
            "INSERT OR REPLACE INTO matches (
                id, timestamp, hero_id, hero_name, hero_display_name, role,
                match_duration, won, kills, deaths, assists, cs_at_10,
                denies_at_10, cs_benchmark_at_10, net_worth, gpm, xpm,
                overall_score, overall_grade, data_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            params![
                record.id,
                record.timestamp,
                record.hero_id,
                record.hero_name,
                record.hero_display_name,
                record.role,
                record.match_duration,
                won_val,
                record.kills,
                record.deaths,
                record.assists,
                record.cs_at_10,
                record.denies_at_10,
                record.cs_benchmark_at_10,
                record.net_worth,
                record.gpm,
                record.xpm,
                record.overall_score,
                record.overall_grade,
                record.data_json
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
    .join()
    .map_err(|_| "Failed to execute database save on background worker thread".to_string())?
}

#[tauri::command]
pub fn get_match_history(app: AppHandle, limit: Option<usize>) -> Result<Vec<MatchRecord>, String> {
    thread::spawn(move || -> Result<Vec<MatchRecord>, String> {
        let conn = open_connection(&app)?;
        let max_limit = limit.unwrap_or(100) as i64;
        let mut stmt = conn
            .prepare(
                "SELECT id, timestamp, hero_id, hero_name, hero_display_name, role,
                        match_duration, won, kills, deaths, assists, cs_at_10,
                        denies_at_10, cs_benchmark_at_10, net_worth, gpm, xpm,
                        overall_score, overall_grade, data_json
                 FROM matches
                 ORDER BY timestamp DESC
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![max_limit], |row| {
                let won_raw: Option<i32> = row.get(7)?;
                Ok(MatchRecord {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    hero_id: row.get(2)?,
                    hero_name: row.get(3)?,
                    hero_display_name: row.get(4)?,
                    role: row.get(5)?,
                    match_duration: row.get(6)?,
                    won: won_raw.map(|w| w == 1),
                    kills: row.get(8)?,
                    deaths: row.get(9)?,
                    assists: row.get(10)?,
                    cs_at_10: row.get(11)?,
                    denies_at_10: row.get(12)?,
                    cs_benchmark_at_10: row.get(13)?,
                    net_worth: row.get(14)?,
                    gpm: row.get(15)?,
                    xpm: row.get(16)?,
                    overall_score: row.get(17)?,
                    overall_grade: row.get(18)?,
                    data_json: row.get(19)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item.map_err(|e| e.to_string())?);
        }
        Ok(list)
    })
    .join()
    .map_err(|_| "Failed to execute database query on background worker thread".to_string())?
}

#[tauri::command]
pub fn get_match_details(app: AppHandle, match_id: String) -> Result<Option<MatchRecord>, String> {
    thread::spawn(move || -> Result<Option<MatchRecord>, String> {
        let conn = open_connection(&app)?;
        let mut stmt = conn
            .prepare(
                "SELECT id, timestamp, hero_id, hero_name, hero_display_name, role,
                        match_duration, won, kills, deaths, assists, cs_at_10,
                        denies_at_10, cs_benchmark_at_10, net_worth, gpm, xpm,
                        overall_score, overall_grade, data_json
                 FROM matches
                 WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![match_id], |row| {
                let won_raw: Option<i32> = row.get(7)?;
                Ok(MatchRecord {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    hero_id: row.get(2)?,
                    hero_name: row.get(3)?,
                    hero_display_name: row.get(4)?,
                    role: row.get(5)?,
                    match_duration: row.get(6)?,
                    won: won_raw.map(|w| w == 1),
                    kills: row.get(8)?,
                    deaths: row.get(9)?,
                    assists: row.get(10)?,
                    cs_at_10: row.get(11)?,
                    denies_at_10: row.get(12)?,
                    cs_benchmark_at_10: row.get(13)?,
                    net_worth: row.get(14)?,
                    gpm: row.get(15)?,
                    xpm: row.get(16)?,
                    overall_score: row.get(17)?,
                    overall_grade: row.get(18)?,
                    data_json: row.get(19)?,
                })
            })
            .map_err(|e| e.to_string())?;

        if let Some(first) = rows.next() {
            Ok(Some(first.map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    })
    .join()
    .map_err(|_| "Failed to execute database lookup on background worker thread".to_string())?
}

#[tauri::command]
pub fn delete_match_record(app: AppHandle, match_id: String) -> Result<(), String> {
    thread::spawn(move || -> Result<(), String> {
        let conn = open_connection(&app)?;
        conn.execute("DELETE FROM matches WHERE id = ?1", params![match_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
    .join()
    .map_err(|_| "Failed to execute delete on background worker thread".to_string())?
}

#[tauri::command]
pub fn clear_all_matches(app: AppHandle) -> Result<(), String> {
    thread::spawn(move || -> Result<(), String> {
        let conn = open_connection(&app)?;
        conn.execute("DELETE FROM matches", params![])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
    .join()
    .map_err(|_| "Failed to clear matches on background worker thread".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_serialization() {
        let rec = MatchRecord {
            id: "match_123".into(),
            timestamp: 1727650000,
            hero_id: 1,
            hero_name: "npc_dota_hero_antimage".into(),
            hero_display_name: "Anti-Mage".into(),
            role: "carry".into(),
            match_duration: 2100,
            won: Some(true),
            kills: 12,
            deaths: 2,
            assists: 8,
            cs_at_10: 65,
            denies_at_10: 14,
            cs_benchmark_at_10: 50,
            net_worth: 24500,
            gpm: 720,
            xpm: 810,
            overall_score: 92,
            overall_grade: "S".into(),
            data_json: "{}".into(),
        };
        let json = serde_json::to_string(&rec).unwrap();
        let parsed: MatchRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "match_123");
        assert_eq!(parsed.overall_grade, "S");
        assert_eq!(parsed.won, Some(true));
    }
}
