use std::fs;
use tauri::Manager;

#[tauri::command]
fn salvar_estado_pcp(app: tauri::AppHandle, payload: String) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?;
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Falha ao criar diretório de dados: {}", e))?;
    let file_path = app_dir.join("harmonia_pcp_db.json");
    fs::write(&file_path, payload.as_bytes())
        .map_err(|e| format!("Falha ao gravar arquivo PCP: {}", e))?;
    Ok("Estado PCP salvo com sucesso".to_string())
}

#[tauri::command]
fn carregar_estado_pcp(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?;
    let file_path = app_dir.join("harmonia_pcp_db.json");
    if !file_path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&file_path).map_err(|e| format!("Falha ao ler arquivo PCP: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            salvar_estado_pcp,
            carregar_estado_pcp
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar a aplicação Tauri Harmonia PCP");
}
