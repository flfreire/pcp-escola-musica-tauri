# 🎵 Instituto Nilto Musicalização — Projeto Caminhos da Música (Sistema Integrado de PCP)

Aplicação desktop multiplataforma desenvolvida com **Tauri v2 (Rust) + React + Vite**, projetada para o **Instituto Nilto Musicalização — Projeto Caminhos da Música**, substituindo controles informais, fichas de papel e anotações dispersas por uma gestão padronizada, descentralizada e orientada por dados (**Data-Driven PCP**).

---

## 🏗️ Arquitetura e Módulos da Ferramenta

O sistema é estruturado nos **cinco pilares fundamentais** de Planejamento e Controle da Produção (PCP) aplicados ao setor de serviços educacionais e musicais:

1. **Módulo 1 — Cadastros Base**:
   - Centralização do banco de dados de recursos produtivos da instituição:
   - **Professores**: Cadastro completo com especialidades e carga horária semanal disponível.
   - **Salas Disponíveis**: Capacidade máxima de alunos, disponibilidade semanal e equipamentos fixos instalados.
   - **Inventário de Instrumentos Móveis**: Controle patrimonial (`INM-xxx`) e de status (`Disponível` vs. `Manutenção`).

2. **Módulo 2 — Gestão de Alunos e Matrículas**:
   - Repositório unificado com histórico pedagógico/administrativo e controle em tempo real do status dos alunos (**Ativos**, **Trancados** ou **Cancelados**), eliminando fichas de papel.

3. **Módulo 3 — Quadro de Programação e Alocação (PCP Operacional)**:
   - Grade horária semanal que cruza **Professor × Aluno × Sala × Instrumento Móvel**.
   - Conta com **validações automáticas e alertas visuais de conflito** (formatação condicional), impedindo o *overbooking* de salas, a sobreposição de horários dos docentes ou o uso de instrumentos em manutenção.

4. **Módulo 4 — Registro Operacional (Planejado vs. Realizado)**:
   - Acompanhamento diário da execução das aulas, registrando o status de cada aula com 1 clique: **Realizada**, **Falta do Aluno**, **Cancelada** ou **Remarcada**, além de importação automática a partir da grade semanal.

5. **Módulo 5 — Dashboard de Indicadores Gerenciais (Painel de PCP)**:
   - Consolidação automática de dados operacionais em métricas estratégicas para apoiar a tomada de decisão da diretoria, com **exportação integrada para CSV compatível com Microsoft Excel e Google Planilhas**.

---

## 📊 Principais Indicadores de Desempenho (KPIs) Implementados

- **Taxa de Ocupação das Salas (%)**: Mensura o aproveitamento da infraestrutura física.
- **Taxa de Utilização dos Professores (%)**: Avalia a eficiência da alocação da carga horária docente.
- **Índice de Aulas Realizadas e Absenteísmo (%)**: Monitora cancelamentos, faltas e desvios na programação (*Planejado vs. Realizado*).
- **Taxa de Evasão / Churn Rate (%)**: Acompanha a retenção de alunos mês a mês.
