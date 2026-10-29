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

#[tauri::command]
fn salvar_relatorio_csv(
    app: tauri::AppHandle,
    conteudo: String,
    nome_arquivo: String,
) -> Result<String, String> {
    let dest_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().desktop_dir())
        .or_else(|_| app.path().document_dir())
        .map_err(|e| format!("Falha ao obter diretório de destino: {}", e))?;

    fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Falha ao acessar diretório de destino: {}", e))?;

    let file_path = dest_dir.join(&nome_arquivo);
    fs::write(&file_path, conteudo.as_bytes())
        .map_err(|e| format!("Falha ao gravar arquivo CSV: {}", e))?;

    // Destacar arquivo no explorador do sistema operacional
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&file_path)
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&dest_dir)
            .spawn();
    }

    Ok(file_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            salvar_estado_pcp,
            carregar_estado_pcp,
            salvar_relatorio_csv
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar a aplicação Tauri Instituto Nilto Musicalização");
}
