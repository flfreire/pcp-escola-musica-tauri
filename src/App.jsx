import React, { useState, useEffect, useMemo } from 'react';
import {
  Music,
  LayoutDashboard,
  Database,
  Users,
  Calendar,
  ClipboardCheck,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Building2,
  Guitar,
  UserCheck,
  TrendingDown,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { INITIAL_DATA, DIAS_SEMANA, HORARIOS_PADRAO } from './data/initialData';
import { validarAlocacao, mapearConflitosGrade, calcularKPIs } from './utils/pcpEngine';
import { exportarRelatorioCompletoCSV, downloadCsv } from './utils/exportExcel';

const STORAGE_KEY = 'harmonia_pcp_escola_musica_v1';

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler dados locais:', e);
    }
    return INITIAL_DATA;
  });

  const [abaAtiva, setAbaAtiva] = useState('mod5'); // Inicia no Dashboard de PCP ou permite navegar pelos 5 módulos
  const [subAbaMod1, setSubAbaMod1] = useState('professores');
  const [notificacao, setNotificacao] = useState(null);

  // Estados para filtros e formulários
  const [filtroStatusAluno, setFiltroStatusAluno] = useState('Todos');
  const [buscaAluno, setBuscaAluno] = useState('');

  const [visaoGrade, setVisaoGrade] = useState('matriz'); // 'matriz' | 'tabela'
  const [filtroSalaGrade, setFiltroSalaGrade] = useState('Todas');
  const [filtroProfGrade, setFiltroProfGrade] = useState('Todos');
  const [bloquearConflitos, setBloquearConflitos] = useState(true);

  const [filtroStatusOp, setFiltroStatusOp] = useState('Todos');

  // Formulários Módulo 1
  const [novoProf, setNovoProf] = useState({
    nome: '',
    especialidades: '',
    cargaHorariaSemanal: 20,
    telefone: '',
    email: '',
    status: 'Ativo',
  });

  const [novaSala, setNovaSala] = useState({
    nome: '',
    capacidade: 4,
    equipamentos: '',
    horasDisponiveisSemana: 24,
    status: 'Disponível',
  });

  const [novoInst, setNovoInst] = useState({
    patrimonio: '',
    nome: '',
    categoria: 'Cordas',
    estado: 'Disponível',
    observacoes: '',
  });

  // Formulário Módulo 2
  const [novoAluno, setNovoAluno] = useState({
    matricula: '',
    nome: '',
    curso: '',
    professorId: state.professores[0]?.id || '',
    status: 'Ativo',
    dataMatricula: new Date().toISOString().slice(0, 10),
    mensalidade: 300,
    telefone: '',
    historico: '',
  });

  // Formulário Módulo 3 (Alocação PCP)
  const [novaAlocacao, setNovaAlocacao] = useState({
    diaSemana: 'Segunda',
    horario: '09:00',
    duracaoHoras: 1,
    professorId: state.professores[0]?.id || '',
    alunoId: state.alunos[0]?.id || '',
    salaId: state.salas[0]?.id || '',
    instrumentoId: '',
    observacoes: '',
  });

  // Formulário Módulo 4 (Registro Operacional)
  const [novoRegistro, setNovoRegistro] = useState({
    data: new Date().toISOString().slice(0, 10),
    diaSemana: 'Segunda',
    horario: '09:00',
    professorId: state.professores[0]?.id || '',
    alunoId: state.alunos[0]?.id || '',
    salaId: state.salas[0]?.id || '',
    status: 'Realizada',
    dataRemarcacao: '',
    observacoes: '',
  });

  // Persistência automática
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Se estiver em ambiente Tauri Desktop, sincroniza também via IPC se disponível
      if (window.__TAURI_INTERNALS__) {
        import('@tauri-apps/api/core')
          .then(({ invoke }) => {
            invoke('salvar_estado_pcp', { payload: JSON.stringify(state) }).catch(() => {});
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
    }
  }, [state]);

  const mostrarAviso = (msg, tipo = 'sucesso') => {
    setNotificacao({ msg, tipo });
    setTimeout(() => {
      setNotificacao((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  };

  // Cálculos de PCP em tempo real
  const kpis = useMemo(() => calcularKPIs(state), [state]);
  const infoConflitos = useMemo(() => mapearConflitosGrade(state), [state]);
  const validacaoPreviaAloc = useMemo(
    () => validarAlocacao(novaAlocacao, state),
    [novaAlocacao, state]
  );

  // Helpers de nomes
  const getNomeProf = (id) => state.professores.find((p) => p.id === id)?.nome || 'Não definido';
  const getNomeAluno = (id) => state.alunos.find((a) => a.id === id)?.nome || 'Não definido';
  const getNomeSala = (id) => state.salas.find((s) => s.id === id)?.nome || 'Não definida';
  const getNomeInst = (id) => {
    if (!id) return 'Instrumento Fixo / Próprio';
    const inst = state.instrumentos.find((i) => i.id === id);
    return inst ? `${inst.patrimonio} - ${inst.nome}` : 'Não encontrado';
  };

  // Handlers Módulo 1
  const adicionarProfessor = (e) => {
    e.preventDefault();
    if (!novoProf.nome.trim()) return;
    const item = {
      ...novoProf,
      id: `prof-${Date.now()}`,
      cargaHorariaSemanal: Number(novoProf.cargaHorariaSemanal) || 10,
    };
    setState((s) => ({ ...s, professores: [...s.professores, item] }));
    setNovoProf({
      nome: '',
      especialidades: '',
      cargaHorariaSemanal: 20,
      telefone: '',
      email: '',
      status: 'Ativo',
    });
    mostrarAviso(`Professor "${item.nome}" cadastrado com sucesso!`);
  };

  const removerProfessor = (id) => {
    setState((s) => ({
      ...s,
      professores: s.professores.filter((p) => p.id !== id),
    }));
    mostrarAviso('Professor removido do cadastro base.');
  };

  const adicionarSala = (e) => {
    e.preventDefault();
    if (!novaSala.nome.trim()) return;
    const item = {
      ...novaSala,
      id: `sala-${Date.now()}`,
      capacidade: Number(novaSala.capacidade) || 1,
      horasDisponiveisSemana: Number(novaSala.horasDisponiveisSemana) || 20,
    };
    setState((s) => ({ ...s, salas: [...s.salas, item] }));
    setNovaSala({
      nome: '',
      capacidade: 4,
      equipamentos: '',
      horasDisponiveisSemana: 24,
      status: 'Disponível',
    });
    mostrarAviso(`Sala "${item.nome}" cadastrada com sucesso!`);
  };

  const removerSala = (id) => {
    setState((s) => ({
      ...s,
      salas: s.salas.filter((sl) => sl.id !== id),
    }));
    mostrarAviso('Sala removida do cadastro base.');
  };

  const adicionarInstrumento = (e) => {
    e.preventDefault();
    if (!novoInst.nome.trim()) return;
    const item = {
      ...novoInst,
      id: `inst-${Date.now()}`,
      patrimonio: novoInst.patrimonio.trim() || `PAT-${state.instrumentos.length + 101}`,
    };
    setState((s) => ({ ...s, instrumentos: [...s.instrumentos, item] }));
    setNovoInst({
      patrimonio: '',
      nome: '',
      categoria: 'Cordas',
      estado: 'Disponível',
      observacoes: '',
    });
    mostrarAviso(`Instrumento "${item.nome}" adicionado ao inventário!`);
  };

  const alternarEstadoInstrumento = (id, novoEstado) => {
    setState((s) => ({
      ...s,
      instrumentos: s.instrumentos.map((i) => (i.id === id ? { ...i, estado: novoEstado } : i)),
    }));
    mostrarAviso(`Estado do instrumento atualizado para "${novoEstado}".`);
  };

  const removerInstrumento = (id) => {
    setState((s) => ({
      ...s,
      instrumentos: s.instrumentos.filter((i) => i.id !== id),
    }));
    mostrarAviso('Instrumento removido do inventário.');
  };

  // Handlers Módulo 2 (Alunos e Matrículas)
  const adicionarAluno = (e) => {
    e.preventDefault();
    if (!novoAluno.nome.trim()) return;
    const item = {
      ...novoAluno,
      id: `alu-${Date.now()}`,
      matricula:
        novoAluno.matricula.trim() ||
        `MAT-2026-${String(state.alunos.length + 1).padStart(3, '0')}`,
      mensalidade: Number(novoAluno.mensalidade) || 0,
      mesReferenciaStatus: novoAluno.dataMatricula.slice(0, 7),
    };
    setState((s) => ({ ...s, alunos: [...s.alunos, item] }));
    setNovoAluno({
      matricula: '',
      nome: '',
      curso: '',
      professorId: state.professores[0]?.id || '',
      status: 'Ativo',
      dataMatricula: new Date().toISOString().slice(0, 10),
      mensalidade: 300,
      telefone: '',
      historico: '',
    });
    mostrarAviso(`Matrícula de "${item.nome}" registrada no repositório unificado!`);
  };

  const alterarStatusAluno = (id, novoStatus) => {
    setState((s) => ({
      ...s,
      alunos: s.alunos.map((a) =>
        a.id === id
          ? {
              ...a,
              status: novoStatus,
              mesReferenciaStatus: new Date().toISOString().slice(0, 7),
            }
          : a
      ),
    }));
    mostrarAviso(`Status da matrícula atualizado para "${novoStatus}". KPI de Churn recalculado.`);
  };

  const removerAluno = (id) => {
    setState((s) => ({
      ...s,
      alunos: s.alunos.filter((a) => a.id !== id),
    }));
    mostrarAviso('Registro de aluno removido.');
  };

  // Handlers Módulo 3 (Quadro de Programação e Alocação PCP)
  const adicionarAlocacao = (e) => {
    e.preventDefault();
    const resultadoValidacao = validarAlocacao(novaAlocacao, state);
    if (!resultadoValidacao.valido && bloquearConflitos) {
      mostrarAviso(
        `Alocação bloqueada pelo PCP: ${resultadoValidacao.conflitos[0]}`,
        'erro'
      );
      return;
    }

    const item = {
      ...novaAlocacao,
      id: `aloc-${Date.now()}`,
      duracaoHoras: Number(novaAlocacao.duracaoHoras) || 1,
    };

    setState((s) => ({ ...s, alocacoes: [...s.alocacoes, item] }));
    if (!resultadoValidacao.valido) {
      mostrarAviso(
        'Alocação inserida com ALERTA VISUAL DE CONFLITO na grade horária!',
        'aviso'
      );
    } else {
      mostrarAviso('Aula programada na grade semanal sem conflitos!');
    }
  };

  const simularConflitoDemonstracao = () => {
    const primeira = state.alocacoes[0];
    if (!primeira) return;
    const conflitoDemo = {
      id: `aloc-conflito-${Date.now()}`,
      diaSemana: primeira.diaSemana,
      horario: primeira.horario,
      duracaoHoras: 1,
      professorId: primeira.professorId,
      alunoId: state.alunos[1]?.id || primeira.alunoId,
      salaId: primeira.salaId,
      instrumentoId: '',
      observacoes: '⚠️ SIMULAÇÃO DE OVERBOOKING DE SALA E DOCENTE',
    };
    setState((s) => ({ ...s, alocacoes: [...s.alocacoes, conflitoDemo] }));
    mostrarAviso(
      `Conflito simulado em ${primeira.diaSemana} às ${primeira.horario}! Veja o alerta vermelho piscando na grade.`,
      'aviso'
    );
  };

  const resolverTodosConflitos = () => {
    // Mantém apenas alocações sem sobreposição na ordem original
    setState((s) => {
      const limpas = [];
      for (const al of s.alocacoes) {
        const estadoParcial = { ...s, alocacoes: limpas };
        const val = validarAlocacao(al, estadoParcial, al.id);
        if (val.valido) {
          limpas.push(al);
        }
      }
      return { ...s, alocacoes: limpas };
    });
    mostrarAviso('Conflitos de overbooking e sobreposição removidos automaticamente!');
  };

  const removerAlocacao = (id) => {
    setState((s) => ({
      ...s,
      alocacoes: s.alocacoes.filter((a) => a.id !== id),
    }));
    mostrarAviso('Horário liberado na programação semanal.');
  };

  // Handlers Módulo 4 (Registro Operacional - Planejado vs Realizado)
  const adicionarRegistroOperacional = (e) => {
    e.preventDefault();
    const item = {
      ...novoRegistro,
      id: `reg-${Date.now()}`,
    };
    setState((s) => ({
      ...s,
      registrosOperacionais: [item, ...s.registrosOperacionais],
    }));
    mostrarAviso('Registro operacional salvo no acompanhamento diário!');
  };

  const atualizarStatusRegistro = (id, novoStatus) => {
    let remarcacao = '';
    if (novoStatus === 'Remarcada') {
      remarcacao = 'Sábado 14:00 (Reposição programada)';
    }
    setState((s) => ({
      ...s,
      registrosOperacionais: s.registrosOperacionais.map((r) =>
        r.id === id ? { ...r, status: novoStatus, dataRemarcacao: remarcacao || r.dataRemarcacao } : r
      ),
    }));
    mostrarAviso(`Status da aula atualizado para "${novoStatus}".`);
  };

  const gerarRegistrosDaGradeSemanal = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const novos = state.alocacoes.map((al, idx) => ({
      id: `reg-auto-${Date.now()}-${idx}`,
      alocacaoId: al.id,
      data: hoje,
      diaSemana: al.diaSemana,
      horario: al.horario,
      professorId: al.professorId,
      alunoId: al.alunoId,
      salaId: al.salaId,
      status: 'Realizada',
      dataRemarcacao: '',
      observacoes: `Gerado a partir da Grade PCP (${al.observacoes || 'Aula regular'})`,
    }));
    setState((s) => ({
      ...s,
      registrosOperacionais: [...novos, ...s.registrosOperacionais],
    }));
    mostrarAviso(`${novos.length} aulas da grade semanal importadas para o Registro Operacional!`);
  };

  const removerRegistroOperacional = (id) => {
    setState((s) => ({
      ...s,
      registrosOperacionais: s.registrosOperacionais.filter((r) => r.id !== id),
    }));
    mostrarAviso('Registro operacional removido.');
  };

  const restaurarDadosIniciais = () => {
    setState(INITIAL_DATA);
    mostrarAviso('Banco de dados restaurado para o cenário padrão da Escola de Música!');
  };

  // Alunos filtrados (Módulo 2)
  const alunosFiltrados = useMemo(() => {
    return state.alunos.filter((a) => {
      const bateStatus = filtroStatusAluno === 'Todos' || a.status === filtroStatusAluno;
      const termo = buscaAluno.toLowerCase();
      const bateBusca =
        !termo ||
        a.nome.toLowerCase().includes(termo) ||
        a.matricula.toLowerCase().includes(termo) ||
        a.curso.toLowerCase().includes(termo);
      return bateStatus && bateBusca;
    });
  }, [state.alunos, filtroStatusAluno, buscaAluno]);

  // Alocações filtradas (Módulo 3)
  const alocacoesFiltradas = useMemo(() => {
    return state.alocacoes.filter((a) => {
      const bateSala = filtroSalaGrade === 'Todas' || a.salaId === filtroSalaGrade;
      const bateProf = filtroProfGrade === 'Todos' || a.professorId === filtroProfGrade;
      return bateSala && bateProf;
    });
  }, [state.alocacoes, filtroSalaGrade, filtroProfGrade]);

  // Registros operacionais filtrados (Módulo 4)
  const registrosFiltrados = useMemo(() => {
    return state.registrosOperacionais.filter((r) => {
      return filtroStatusOp === 'Todos' || r.status === filtroStatusOp;
    });
  }, [state.registrosOperacionais, filtroStatusOp]);

  return (
    <div className="app-layout">
      {/* MENU LATERAL (5 PILARES DO PCP) */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Music size={22} />
          </div>
          <div>
            <div className="brand-title">Harmonia PCP</div>
            <div className="brand-subtitle">Gestão Integrada de Escola de Música</div>
          </div>
        </div>

        <nav className="nav-menu">
          <div className="nav-section-label">Painel Estratégico</div>
          <button
            className={`nav-btn ${abaAtiva === 'mod5' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('mod5')}
          >
            <LayoutDashboard size={18} />
            <span>Módulo 5 — Dashboard PCP</span>
          </button>

          <div className="nav-section-label">Pilares Operacionais</div>
          <button
            className={`nav-btn ${abaAtiva === 'mod1' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('mod1')}
          >
            <Database size={18} />
            <span>Módulo 1 — Cadastros Base</span>
            <span className="nav-badge">
              {state.professores.length + state.salas.length + state.instrumentos.length}
            </span>
          </button>

          <button
            className={`nav-btn ${abaAtiva === 'mod2' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('mod2')}
          >
            <Users size={18} />
            <span>Módulo 2 — Alunos & Matrículas</span>
            <span className="nav-badge">{state.alunos.length}</span>
          </button>

          <button
            className={`nav-btn ${abaAtiva === 'mod3' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('mod3')}
          >
            <Calendar size={18} />
            <span>Módulo 3 — Grade & Alocação</span>
            {infoConflitos.totalConflitos > 0 ? (
              <span className="nav-badge danger" title="Conflitos detectados na grade!">
                {infoConflitos.totalConflitos} ⚠️
              </span>
            ) : (
              <span className="nav-badge">{state.alocacoes.length}</span>
            )}
          </button>

          <button
            className={`nav-btn ${abaAtiva === 'mod4' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('mod4')}
          >
            <ClipboardCheck size={18} />
            <span>Módulo 4 — Registro Diário</span>
            <span className="nav-badge">{state.registrosOperacionais.length}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => {
              exportarRelatorioCompletoCSV(state, kpis);
              mostrarAviso('Planilha integrada CSV (compatível com Excel/Sheets) exportada!');
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Exportar p/ Excel (CSV)</span>
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={restaurarDadosIniciais}
          >
            <RotateCcw size={16} />
            <span>Restaurar Dados Padrão</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {abaAtiva === 'mod5' && 'Módulo 5 — Dashboard de Indicadores Gerenciais (Painel de PCP)'}
              {abaAtiva === 'mod1' && 'Módulo 1 — Cadastros Base (Recursos Produtivos)'}
              {abaAtiva === 'mod2' && 'Módulo 2 — Gestão de Alunos e Matrículas'}
              {abaAtiva === 'mod3' && 'Módulo 3 — Quadro de Programação e Alocação (PCP Operacional)'}
              {abaAtiva === 'mod4' && 'Módulo 4 — Registro Operacional (Planejado vs. Realizado)'}
            </h1>
            <p className="page-subtitle">
              {state.escola.nome} • Gestão orientada por dados (Data-Driven PCP)
            </p>
          </div>

          <div className="topbar-actions">
            {infoConflitos.totalConflitos > 0 && (
              <button
                className="btn btn-danger"
                onClick={() => setAbaAtiva('mod3')}
              >
                <AlertTriangle size={16} />
                <span>{infoConflitos.totalConflitos} Conflito(s) na Grade</span>
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                exportarRelatorioCompletoCSV(state, kpis);
                mostrarAviso('Planilha integrada exportada com sucesso!');
              }}
            >
              <Download size={16} />
              <span>Exportar Planilha Integrada</span>
            </button>
          </div>
        </header>

        <div className="content-body">
          {notificacao && (
            <div
              className={`alert-box ${
                notificacao.tipo === 'erro'
                  ? 'alert-danger'
                  : notificacao.tipo === 'aviso'
                  ? 'alert-warning'
                  : 'alert-success'
              }`}
            >
              {notificacao.tipo === 'erro' || notificacao.tipo === 'aviso' ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{notificacao.msg}</span>
            </div>
          )}

          {/* =====================================================================
              MÓDULO 5: DASHBOARD DE INDICADORES GERENCIAIS (PAINEL DE PCP)
          ===================================================================== */}
          {abaAtiva === 'mod5' && (
            <div>
              {/* 4 KPIs Principais do Documento */}
              <div className="kpi-grid">
                {/* KPI 1: Taxa de Ocupação das Salas */}
                <div className="card kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">1. Taxa de Ocupação das Salas</span>
                    <div
                      className="kpi-icon"
                      style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
                    >
                      <Building2 size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">{kpis.ocupacaoSalas.taxaGeral}%</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, kpis.ocupacaoSalas.taxaGeral)}%`,
                        background: '#6366f1',
                      }}
                    />
                  </div>
                  <div className="kpi-meta">
                    <span>
                      {kpis.ocupacaoSalas.horasAlocadas}h alocadas /{' '}
                      {kpis.ocupacaoSalas.horasDisponiveis}h disp.
                    </span>
                    <span className="badge badge-info">Infraestrutura</span>
                  </div>
                </div>

                {/* KPI 2: Taxa de Utilização dos Professores */}
                <div className="card kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">2. Utilização dos Professores</span>
                    <div
                      className="kpi-icon"
                      style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
                    >
                      <UserCheck size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">{kpis.utilizacaoProfessores.taxaGeral}%</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, kpis.utilizacaoProfessores.taxaGeral)}%`,
                        background: '#10b981',
                      }}
                    />
                  </div>
                  <div className="kpi-meta">
                    <span>
                      {kpis.utilizacaoProfessores.horasAlocadas}h em aula /{' '}
                      {kpis.utilizacaoProfessores.cargaDisponivel}h contratadas
                    </span>
                    <span className="badge badge-success">Docentes</span>
                  </div>
                </div>

                {/* KPI 3: Índice de Aulas Realizadas e Absenteísmo */}
                <div className="card kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">3. Aulas Realizadas vs. Absenteísmo</span>
                    <div
                      className="kpi-icon"
                      style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
                    >
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">{kpis.execucaoOperacional.indiceRealizadas}%</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, kpis.execucaoOperacional.indiceRealizadas)}%`,
                        background: '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="kpi-meta">
                    <span>
                      Absenteísmo/Cancel.: {kpis.execucaoOperacional.indiceAbsenteismo}%
                    </span>
                    <span className="badge badge-warning">
                      {kpis.execucaoOperacional.realizadas}/{kpis.execucaoOperacional.totalPlanejado} aulas
                    </span>
                  </div>
                </div>

                {/* KPI 4: Taxa de Evasão / Churn Rate */}
                <div className="card kpi-card">
                  <div className="kpi-top">
                    <span className="kpi-label">4. Taxa de Evasão / Churn Rate</span>
                    <div
                      className="kpi-icon"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                    >
                      <TrendingDown size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">{kpis.retencaoAlunos.churnRate}%</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, kpis.retencaoAlunos.taxaRetencao)}%`,
                        background: '#10b981',
                      }}
                    />
                  </div>
                  <div className="kpi-meta">
                    <span>Retenção Ativa: {kpis.retencaoAlunos.taxaRetencao}%</span>
                    <span className="badge badge-danger">
                      {kpis.retencaoAlunos.cancelados} cancel. / {kpis.retencaoAlunos.trancados} tranc.
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhamento Gerencial em 2 Colunas */}
              <div className="two-col-grid" style={{ marginBottom: 20 }}>
                {/* Ocupação por Sala */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Building2 size={18} /> Aproveitamento da Infraestrutura (Salas)
                    </h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAbaAtiva('mod1')}>
                      Gerenciar Salas
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {kpis.ocupacaoSalas.detalhesPorSala.map((sala) => (
                      <div key={sala.id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.84rem',
                            marginBottom: 4,
                          }}
                        >
                          <strong>{sala.nome}</strong>
                          <span>
                            {sala.horasAlocadas}h / {sala.horasDisponiveisSemana}h (
                            <strong>{sala.taxaOcupacao}%</strong>)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, sala.taxaOcupacao)}%`,
                              background:
                                sala.taxaOcupacao > 90
                                  ? '#ef4444'
                                  : sala.taxaOcupacao >= 50
                                  ? '#6366f1'
                                  : '#3b82f6',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alocação da Carga Horária Docente */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <UserCheck size={18} /> Eficiência de Alocação Docente (Professores)
                    </h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAbaAtiva('mod1')}>
                      Gerenciar Docentes
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {kpis.utilizacaoProfessores.detalhesPorProfessor.map((prof) => (
                      <div key={prof.id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.84rem',
                            marginBottom: 4,
                          }}
                        >
                          <span>
                            <strong>{prof.nome}</strong>{' '}
                            <small style={{ color: 'var(--text-secondary)' }}>
                              ({prof.qtdAlunos} alunos ativos)
                            </small>
                          </span>
                          <span>
                            {prof.horasAlocadas}h / {prof.cargaHorariaSemanal}h (
                            <strong>{prof.taxaUtilizacao}%</strong>)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, prof.taxaUtilizacao)}%`,
                              background:
                                prof.taxaUtilizacao > 100
                                  ? '#ef4444'
                                  : prof.taxaUtilizacao >= 60
                                  ? '#10b981'
                                  : '#f59e0b',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="two-col-grid">
                {/* Planejado vs Realizado */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <ClipboardCheck size={18} /> Balanço Operacional: Planejado vs. Realizado
                    </h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAbaAtiva('mod4')}>
                      Abrir Diário
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Status Operacional</th>
                          <th>Qtd. Aulas</th>
                          <th>Proporção (%)</th>
                          <th>Impacto no PCP</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="badge badge-success">Realizada</span>
                          </td>
                          <td>{kpis.execucaoOperacional.realizadas}</td>
                          <td>{kpis.execucaoOperacional.indiceRealizadas}%</td>
                          <td>Produtividade Efetiva</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="badge badge-warning">Remarcada</span>
                          </td>
                          <td>{kpis.execucaoOperacional.remarcadas}</td>
                          <td>
                            {kpis.execucaoOperacional.totalPlanejado > 0
                              ? Math.round(
                                  (kpis.execucaoOperacional.remarcadas /
                                    kpis.execucaoOperacional.totalPlanejado) *
                                    1000
                                ) / 10
                              : 0}
                            %
                          </td>
                          <td>Exige realocação de sala/professor</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="badge badge-danger">Falta do Aluno</span>
                          </td>
                          <td>{kpis.execucaoOperacional.faltasAluno}</td>
                          <td>{kpis.execucaoOperacional.taxaFaltasAluno}%</td>
                          <td>Absenteísmo discente (hora ociosa)</td>
                        </tr>
                        <tr>
                          <td>
                            <span className="badge badge-danger">Cancelada</span>
                          </td>
                          <td>{kpis.execucaoOperacional.canceladas}</td>
                          <td>
                            {kpis.execucaoOperacional.totalPlanejado > 0
                              ? Math.round(
                                  (kpis.execucaoOperacional.canceladas /
                                    kpis.execucaoOperacional.totalPlanejado) *
                                    1000
                                ) / 10
                              : 0}
                            %
                          </td>
                          <td>Perda de programação</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Evolução Mensal de Retenção / Churn Rate */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <Users size={18} /> Acompanhamento de Evasão / Churn Mês a Mês
                    </h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAbaAtiva('mod2')}>
                      Ver Matrículas
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th>Base Ativa</th>
                          <th>Novas</th>
                          <th>Trancados</th>
                          <th>Cancelados</th>
                          <th>Churn (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpis.retencaoAlunos.historicoMensal.map((h, i) => {
                          const churnMes =
                            h.ativosInicio > 0
                              ? Math.round((h.cancelados / h.ativosInicio) * 1000) / 10
                              : 0;
                          return (
                            <tr key={i}>
                              <td>
                                <strong>{h.mes}</strong>
                              </td>
                              <td>{h.ativosInicio}</td>
                              <td style={{ color: '#34d399' }}>+{h.novasMatriculas}</td>
                              <td style={{ color: '#fbbf24' }}>{h.trancados}</td>
                              <td style={{ color: '#f87171' }}>{h.cancelados}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    churnMes <= 4 ? 'badge-success' : 'badge-danger'
                                  }`}
                                >
                                  {churnMes}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              MÓDULO 1: CADASTROS BASE (PROFESSORES, SALAS E INSTRUMENTOS MÓVEIS)
          ===================================================================== */}
          {abaAtiva === 'mod1' && (
            <div>
              <div className="subtabs">
                <button
                  className={`subtab-btn ${subAbaMod1 === 'professores' ? 'active' : ''}`}
                  onClick={() => setSubAbaMod1('professores')}
                >
                  <UserCheck size={16} /> Professores ({state.professores.length})
                </button>
                <button
                  className={`subtab-btn ${subAbaMod1 === 'salas' ? 'active' : ''}`}
                  onClick={() => setSubAbaMod1('salas')}
                >
                  <Building2 size={16} /> Salas Disponíveis ({state.salas.length})
                </button>
                <button
                  className={`subtab-btn ${subAbaMod1 === 'instrumentos' ? 'active' : ''}`}
                  onClick={() => setSubAbaMod1('instrumentos')}
                >
                  <Guitar size={16} /> Inventário de Instrumentos Móveis (
                  {state.instrumentos.length})
                </button>
              </div>

              {/* SUB-ABA: PROFESSORES */}
              {subAbaMod1 === 'professores' && (
                <div>
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        <Plus size={18} /> Cadastrar Novo Professor
                      </h3>
                    </div>
                    <form onSubmit={adicionarProfessor}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Nome Completo do Docente *</label>
                          <input
                            className="form-control"
                            required
                            placeholder="Ex: Ana Paula Martins"
                            value={novoProf.nome}
                            onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Instrumentos / Especialidades *</label>
                          <input
                            className="form-control"
                            required
                            placeholder="Ex: Piano, Violino, Musicalização"
                            value={novoProf.especialidades}
                            onChange={(e) =>
                              setNovoProf({ ...novoProf, especialidades: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Carga Horária Semanal Contratada (h) *</label>
                          <input
                            type="number"
                            min="1"
                            max="44"
                            className="form-control"
                            required
                            value={novoProf.cargaHorariaSemanal}
                            onChange={(e) =>
                              setNovoProf({ ...novoProf, cargaHorariaSemanal: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Telefone / WhatsApp</label>
                          <input
                            className="form-control"
                            placeholder="(11) 99999-0000"
                            value={novoProf.telefone}
                            onChange={(e) => setNovoProf({ ...novoProf, telefone: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>E-mail</label>
                          <input
                            className="form-control"
                            placeholder="professor@escola.com"
                            value={novoProf.email}
                            onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary">
                        <Plus size={16} /> Salvar Professor
                      </button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Quadro Docente e Carga Horária</h3>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Nome do Professor</th>
                            <th>Especialidades</th>
                            <th>Carga Semanal</th>
                            <th>Horas Alocadas</th>
                            <th>Taxa de Utilização</th>
                            <th>Contato</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.utilizacaoProfessores.detalhesPorProfessor.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.nome}</strong>
                              </td>
                              <td>{p.especialidades}</td>
                              <td>{p.cargaHorariaSemanal}h/sem</td>
                              <td>{p.horasAlocadas}h/sem</td>
                              <td>
                                <span
                                  className={`badge ${
                                    p.taxaUtilizacao > 100
                                      ? 'badge-danger'
                                      : p.taxaUtilizacao >= 50
                                      ? 'badge-success'
                                      : 'badge-info'
                                  }`}
                                >
                                  {p.taxaUtilizacao}%
                                </span>
                              </td>
                              <td>{p.telefone}</td>
                              <td>
                                <span className="badge badge-success">{p.status}</span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removerProfessor(p.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA: SALAS DISPONÍVEIS */}
              {subAbaMod1 === 'salas' && (
                <div>
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        <Plus size={18} /> Cadastrar Nova Sala de Aula / Estúdio
                      </h3>
                    </div>
                    <form onSubmit={adicionarSala}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Nome / Identificação da Sala *</label>
                          <input
                            className="form-control"
                            required
                            placeholder="Ex: Sala 05 — Prática de Sopro"
                            value={novaSala.nome}
                            onChange={(e) => setNovaSala({ ...novaSala, nome: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Capacidade Máxima (Alunos) *</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            className="form-control"
                            required
                            value={novaSala.capacidade}
                            onChange={(e) =>
                              setNovaSala({ ...novaSala, capacidade: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Horas Disponíveis por Semana *</label>
                          <input
                            type="number"
                            min="1"
                            max="72"
                            className="form-control"
                            required
                            value={novaSala.horasDisponiveisSemana}
                            onChange={(e) =>
                              setNovaSala({
                                ...novaSala,
                                horasDisponiveisSemana: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label>Equipamentos Fixos Instalados *</label>
                          <input
                            className="form-control"
                            required
                            placeholder="Ex: Piano vertical, 2 amplificadores, estantes, tratamento acústico"
                            value={novaSala.equipamentos}
                            onChange={(e) =>
                              setNovaSala({ ...novaSala, equipamentos: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary">
                        <Plus size={16} /> Salvar Sala
                      </button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Infraestrutura Física de Salas</h3>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Sala</th>
                            <th>Capacidade</th>
                            <th>Equipamentos Instalados</th>
                            <th>Disponibilidade</th>
                            <th>Ocupação Atual</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpis.ocupacaoSalas.detalhesPorSala.map((s) => (
                            <tr key={s.id}>
                              <td>
                                <strong>{s.nome}</strong>
                              </td>
                              <td>Até {s.capacidade} alunos</td>
                              <td>{s.equipamentos}</td>
                              <td>{s.horasDisponiveisSemana}h/sem</td>
                              <td>
                                <span className="badge badge-info">
                                  {s.horasAlocadas}h ({s.taxaOcupacao}%)
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    s.status === 'Disponível' ? 'badge-success' : 'badge-warning'
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removerSala(s.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA: INVENTÁRIO DE INSTRUMENTOS MÓVEIS */}
              {subAbaMod1 === 'instrumentos' && (
                <div>
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        <Plus size={18} /> Adicionar Instrumento Móvel ao Inventário
                      </h3>
                    </div>
                    <form onSubmit={adicionarInstrumento}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Código de Patrimônio</label>
                          <input
                            className="form-control"
                            placeholder="Ex: PAT-006"
                            value={novoInst.patrimonio}
                            onChange={(e) =>
                              setNovoInst({ ...novoInst, patrimonio: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label>Instrumento / Modelo *</label>
                          <input
                            className="form-control"
                            required
                            placeholder="Ex: Saxofone Alto Yamaha YAS-280"
                            value={novoInst.nome}
                            onChange={(e) => setNovoInst({ ...novoInst, nome: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Categoria</label>
                          <select
                            className="form-control"
                            value={novoInst.categoria}
                            onChange={(e) =>
                              setNovoInst({ ...novoInst, categoria: e.target.value })
                            }
                          >
                            <option value="Cordas">Cordas</option>
                            <option value="Teclas">Teclas</option>
                            <option value="Percussão">Percussão</option>
                            <option value="Sopro">Sopro</option>
                            <option value="Áudio / Acessório">Áudio / Acessório</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Estado Operacional</label>
                          <select
                            className="form-control"
                            value={novoInst.estado}
                            onChange={(e) => setNovoInst({ ...novoInst, estado: e.target.value })}
                          >
                            <option value="Disponível">Disponível</option>
                            <option value="Manutenção">Manutenção</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label>Observações de Conservação / Luthieria</label>
                          <input
                            className="form-control"
                            placeholder="Ex: Revisado em outubro, acompanha estojo rígido"
                            value={novoInst.observacoes}
                            onChange={(e) =>
                              setNovoInst({ ...novoInst, observacoes: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary">
                        <Plus size={16} /> Cadastrar Instrumento
                      </button>
                    </form>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Inventário de Instrumentos Móveis</h3>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Patrimônio</th>
                            <th>Instrumento</th>
                            <th>Categoria</th>
                            <th>Condição / Status</th>
                            <th>Observações</th>
                            <th>Alterar Estado</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.instrumentos.map((i) => (
                            <tr key={i.id}>
                              <td>
                                <strong>{i.patrimonio}</strong>
                              </td>
                              <td>{i.nome}</td>
                              <td>{i.categoria}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    i.estado === 'Disponível' ? 'badge-success' : 'badge-danger'
                                  }`}
                                >
                                  {i.estado}
                                </span>
                              </td>
                              <td>{i.observacoes}</td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() =>
                                    alternarEstadoInstrumento(
                                      i.id,
                                      i.estado === 'Disponível' ? 'Manutenção' : 'Disponível'
                                    )
                                  }
                                >
                                  {i.estado === 'Disponível'
                                    ? 'Enviar p/ Manutenção'
                                    : 'Marcar Disponível'}
                                </button>
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removerInstrumento(i.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              MÓDULO 2: GESTÃO DE ALUNOS E MATRÍCULAS
          ===================================================================== */}
          {abaAtiva === 'mod2' && (
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <Plus size={18} /> Nova Matrícula de Aluno (Repositório Unificado)
                  </h3>
                </div>
                <form onSubmit={adicionarAluno}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nome Completo do Aluno *</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Ex: Gabriel Henrique Souza"
                        value={novoAluno.nome}
                        onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Curso / Instrumento *</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Ex: Piano Popular"
                        value={novoAluno.curso}
                        onChange={(e) => setNovoAluno({ ...novoAluno, curso: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Professor Responsável *</label>
                      <select
                        className="form-control"
                        value={novoAluno.professorId}
                        onChange={(e) =>
                          setNovoAluno({ ...novoAluno, professorId: e.target.value })
                        }
                      >
                        {state.professores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.especialidades})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status da Matrícula</label>
                      <select
                        className="form-control"
                        value={novoAluno.status}
                        onChange={(e) => setNovoAluno({ ...novoAluno, status: e.target.value })}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Trancado">Trancado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mensalidade (R$)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={novoAluno.mensalidade}
                        onChange={(e) =>
                          setNovoAluno({ ...novoAluno, mensalidade: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefone / Responsável</label>
                      <input
                        className="form-control"
                        placeholder="(11) 99999-1111"
                        value={novoAluno.telefone}
                        onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Histórico Pedagógico e Observações (Substitui Fichas de Papel)</label>
                      <input
                        className="form-control"
                        placeholder="Nível do aluno, objetivos musicais, restrições de horário, histórico de evolução..."
                        value={novoAluno.historico}
                        onChange={(e) => setNovoAluno({ ...novoAluno, historico: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Efetivar Matrícula
                  </button>
                </form>
              </div>

              <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                  <h3 className="card-title">
                    Repositório de Alunos ({alunosFiltrados.length} exibidos)
                  </h3>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="form-control"
                      style={{ width: 220 }}
                      placeholder="Buscar por nome, matrícula ou curso..."
                      value={buscaAluno}
                      onChange={(e) => setBuscaAluno(e.target.value)}
                    />
                    {['Todos', 'Ativo', 'Trancado', 'Cancelado'].map((st) => (
                      <button
                        key={st}
                        className={`btn btn-sm ${
                          filtroStatusAluno === st ? 'btn-primary' : 'btn-secondary'
                        }`}
                        onClick={() => setFiltroStatusAluno(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Matrícula</th>
                        <th>Aluno</th>
                        <th>Curso</th>
                        <th>Professor</th>
                        <th>Histórico & Anotações</th>
                        <th>Status Atual</th>
                        <th>Mudar Status (Retenção)</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunosFiltrados.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.matricula}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              Desde {a.dataMatricula}
                            </div>
                          </td>
                          <td>
                            <strong>{a.nome}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {a.telefone} • R$ {a.mensalidade}/mês
                            </div>
                          </td>
                          <td>{a.curso}</td>
                          <td>{getNomeProf(a.professorId)}</td>
                          <td style={{ maxWidth: 280, fontSize: '0.8rem' }}>{a.historico}</td>
                          <td>
                            <span
                              className={`badge ${
                                a.status === 'Ativo'
                                  ? 'badge-success'
                                  : a.status === 'Trancado'
                                  ? 'badge-warning'
                                  : 'badge-danger'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {['Ativo', 'Trancado', 'Cancelado'].map((st) => (
                                <button
                                  key={st}
                                  disabled={a.status === st}
                                  className="btn btn-secondary btn-sm"
                                  style={{ opacity: a.status === st ? 0.4 : 1 }}
                                  onClick={() => alterarStatusAluno(a.id, st)}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => removerAluno(a.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              MÓDULO 3: QUADRO DE PROGRAMAÇÃO E ALOCAÇÃO (PCP OPERACIONAL)
          ===================================================================== */}
          {abaAtiva === 'mod3' && (
            <div>
              {/* Painel de Alocação com Validação Automática Preventiva */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                  <h3 className="card-title">
                    <Calendar size={18} /> Alocar Aula na Grade Semanal (Cruzamento Professor ×
                    Aluno × Sala × Instrumento)
                  </h3>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={bloquearConflitos}
                        onChange={(e) => setBloquearConflitos(e.target.checked)}
                      />
                      Impedir Overbooking Automaticamente
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={simularConflitoDemonstracao}
                    >
                      <Sparkles size={14} /> Simular Conflito Visual
                    </button>
                    {infoConflitos.totalConflitos > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={resolverTodosConflitos}
                      >
                        Resolver Conflitos ({infoConflitos.totalConflitos})
                      </button>
                    )}
                  </div>
                </div>

                {/* Alerta de Validação em Tempo Real do Formulário (Formatação Condicional Preventiva) */}
                {!validacaoPreviaAloc.valido && (
                  <div className="alert-box alert-danger">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>CONFLITO DE PROGRAMAÇÃO DETECTADO PELO PCP:</strong>
                      <ul style={{ marginLeft: 18, marginTop: 4 }}>
                        {validacaoPreviaAloc.conflitos.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {validacaoPreviaAloc.valido && validacaoPreviaAloc.avisos.length > 0 && (
                  <div className="alert-box alert-warning">
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Aviso de Capacidade / Matrícula:</strong>
                      <ul style={{ marginLeft: 18, marginTop: 4 }}>
                        {validacaoPreviaAloc.avisos.map((av, idx) => (
                          <li key={idx}>{av}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <form onSubmit={adicionarAlocacao}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Dia da Semana *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.diaSemana}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, diaSemana: e.target.value })
                        }
                      >
                        {DIAS_SEMANA.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Horário de Início *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.horario}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, horario: e.target.value })
                        }
                      >
                        {HORARIOS_PADRAO.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Duração (Horas) *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.duracaoHoras}
                        onChange={(e) =>
                          setNovaAlocacao({
                            ...novaAlocacao,
                            duracaoHoras: Number(e.target.value),
                          })
                        }
                      >
                        <option value={1}>1 hora</option>
                        <option value={2}>2 horas</option>
                        <option value={3}>3 horas</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Professor *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.professorId}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, professorId: e.target.value })
                        }
                      >
                        {state.professores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.especialidades})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Aluno *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.alunoId}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, alunoId: e.target.value })
                        }
                      >
                        {state.alunos.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome} ({a.curso} - {a.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Sala de Aula *</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.salaId}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, salaId: e.target.value })
                        }
                      >
                        {state.salas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} (Cap: {s.capacidade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Instrumento Móvel (Opcional)</label>
                      <select
                        className="form-control"
                        value={novaAlocacao.instrumentoId}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, instrumentoId: e.target.value })
                        }
                      >
                        <option value="">Sem reserva (Instrumento fixo da sala ou próprio)</option>
                        {state.instrumentos.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.patrimonio} - {i.nome} [{i.estado}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Observações da Aula</label>
                      <input
                        className="form-control"
                        placeholder="Ex: Prática de conjunto / Repertório"
                        value={novaAlocacao.observacoes}
                        onChange={(e) =>
                          setNovaAlocacao({ ...novaAlocacao, observacoes: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Programar na Grade Semanal
                  </button>
                </form>
              </div>

              {/* Controles de Visualização da Grade */}
              <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className={`btn btn-sm ${
                        visaoGrade === 'matriz' ? 'btn-primary' : 'btn-secondary'
                      }`}
                      onClick={() => setVisaoGrade('matriz')}
                    >
                      Grade Horária Visual (Matriz)
                    </button>
                    <button
                      className={`btn btn-sm ${
                        visaoGrade === 'tabela' ? 'btn-primary' : 'btn-secondary'
                      }`}
                      onClick={() => setVisaoGrade('tabela')}
                    >
                      Visão em Planilha (Tabela)
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="form-control"
                      style={{ width: 210 }}
                      value={filtroSalaGrade}
                      onChange={(e) => setFiltroSalaGrade(e.target.value)}
                    >
                      <option value="Todas">Todas as Salas</option>
                      {state.salas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>

                    <select
                      className="form-control"
                      style={{ width: 210 }}
                      value={filtroProfGrade}
                      onChange={(e) => setFiltroProfGrade(e.target.value)}
                    >
                      <option value="Todos">Todos os Professores</option>
                      {state.professores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* VISÃO 1: MATRIZ SEMANAL COM FORMATAÇÃO CONDICIONAL */}
                {visaoGrade === 'matriz' && (
                  <div style={{ overflowX: 'auto' }}>
                    <div className="schedule-matrix">
                      <div className="matrix-header-cell">Horário</div>
                      {DIAS_SEMANA.map((dia) => (
                        <div key={dia} className="matrix-header-cell">
                          {dia}
                        </div>
                      ))}

                      {HORARIOS_PADRAO.map((hora) => (
                        <React.Fragment key={hora}>
                          <div className="matrix-time-cell">{hora}</div>
                          {DIAS_SEMANA.map((dia) => {
                            const aulasNoSlot = alocacoesFiltradas.filter(
                              (a) => a.diaSemana === dia && a.horario === hora
                            );
                            return (
                              <div key={`${dia}-${hora}`} className="matrix-slot-cell">
                                {aulasNoSlot.map((al) => {
                                  const statusConf = infoConflitos.mapaPorAlocacao[al.id];
                                  const temConflito = statusConf && !statusConf.valido;
                                  const temAviso =
                                    statusConf &&
                                    statusConf.valido &&
                                    statusConf.avisos.length > 0;

                                  return (
                                    <div
                                      key={al.id}
                                      className={`slot-card ${
                                        temConflito ? 'conflict' : temAviso ? 'warning' : ''
                                      }`}
                                      title={
                                        temConflito
                                          ? statusConf.conflitos.join('\n')
                                          : al.observacoes
                                      }
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <strong>{getNomeSala(al.salaId).split('—')[0]}</strong>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                                          {al.duracaoHoras}h
                                        </span>
                                      </div>
                                      <div>👨‍🏫 {getNomeProf(al.professorId)}</div>
                                      <div>🎓 {getNomeAluno(al.alunoId)}</div>
                                      {al.instrumentoId && (
                                        <div style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>
                                          🎸 {getNomeInst(al.instrumentoId)}
                                        </div>
                                      )}
                                      {temConflito && (
                                        <div
                                          style={{
                                            color: '#fecaca',
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            marginTop: 2,
                                          }}
                                        >
                                          ⚠️ {statusConf.conflitos[0]}
                                        </div>
                                      )}
                                      <button
                                        onClick={() => removerAlocacao(al.id)}
                                        style={{
                                          marginTop: 4,
                                          background: 'rgba(0,0,0,0.25)',
                                          border: 'none',
                                          color: '#cbd5e1',
                                          fontSize: '0.68rem',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          cursor: 'pointer',
                                          alignSelf: 'flex-end',
                                        }}
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* VISÃO 2: TABELA DE PROGRAMAÇÃO */}
                {visaoGrade === 'tabela' && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Dia & Horário</th>
                          <th>Duração</th>
                          <th>Sala Alocada</th>
                          <th>Professor</th>
                          <th>Aluno</th>
                          <th>Instrumento Móvel</th>
                          <th>Validação PCP</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alocacoesFiltradas.map((al) => {
                          const statusConf = infoConflitos.mapaPorAlocacao[al.id];
                          const temConflito = statusConf && !statusConf.valido;
                          return (
                            <tr key={al.id}>
                              <td>
                                <strong>
                                  {al.diaSemana} • {al.horario}
                                </strong>
                              </td>
                              <td>{al.duracaoHoras}h</td>
                              <td>{getNomeSala(al.salaId)}</td>
                              <td>{getNomeProf(al.professorId)}</td>
                              <td>{getNomeAluno(al.alunoId)}</td>
                              <td>{getNomeInst(al.instrumentoId)}</td>
                              <td>
                                {temConflito ? (
                                  <span className="badge badge-danger">
                                    Conflito: {statusConf.conflitos[0]}
                                  </span>
                                ) : (
                                  <span className="badge badge-success">OK • Sem Conflitos</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removerAlocacao(al.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              MÓDULO 4: REGISTRO OPERACIONAL (PLANEJADO VS. REALIZADO)
          ===================================================================== */}
          {abaAtiva === 'mod4' && (
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                  <h3 className="card-title">
                    <Plus size={18} /> Registrar Execução de Aula (Planejado vs. Realizado)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={gerarRegistrosDaGradeSemanal}
                  >
                    <Calendar size={14} /> Importar Aulas da Grade Semanal (Módulo 3)
                  </button>
                </div>

                <form onSubmit={adicionarRegistroOperacional}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Data da Aula *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={novoRegistro.data}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, data: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Dia da Semana</label>
                      <select
                        className="form-control"
                        value={novoRegistro.diaSemana}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, diaSemana: e.target.value })
                        }
                      >
                        {DIAS_SEMANA.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Horário</label>
                      <select
                        className="form-control"
                        value={novoRegistro.horario}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, horario: e.target.value })
                        }
                      >
                        {HORARIOS_PADRAO.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Professor</label>
                      <select
                        className="form-control"
                        value={novoRegistro.professorId}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, professorId: e.target.value })
                        }
                      >
                        {state.professores.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Aluno</label>
                      <select
                        className="form-control"
                        value={novoRegistro.alunoId}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, alunoId: e.target.value })
                        }
                      >
                        {state.alunos.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Sala</label>
                      <select
                        className="form-control"
                        value={novoRegistro.salaId}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, salaId: e.target.value })
                        }
                      >
                        {state.salas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status Realizado *</label>
                      <select
                        className="form-control"
                        value={novoRegistro.status}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, status: e.target.value })
                        }
                      >
                        <option value="Realizada">Realizada</option>
                        <option value="Falta do Aluno">Falta do Aluno</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Remarcada">Remarcada</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Observações / Conteúdo Ministrado</label>
                      <input
                        className="form-control"
                        placeholder="Resumo da aula ou motivo da falta/remarcação..."
                        value={novoRegistro.observacoes}
                        onChange={(e) =>
                          setNovoRegistro({ ...novoRegistro, observacoes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Lançar Registro Diário
                  </button>
                </form>
              </div>

              <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                  <h3 className="card-title">
                    Histórico Diário: Planejado vs. Realizado ({registrosFiltrados.length} aulas)
                  </h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Todos', 'Realizada', 'Falta do Aluno', 'Remarcada', 'Cancelada'].map(
                      (st) => (
                        <button
                          key={st}
                          className={`btn btn-sm ${
                            filtroStatusOp === st ? 'btn-primary' : 'btn-secondary'
                          }`}
                          onClick={() => setFiltroStatusOp(st)}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Data / Horário</th>
                        <th>Professor</th>
                        <th>Aluno</th>
                        <th>Sala</th>
                        <th>Status Realizado</th>
                        <th>Marcação Rápida (1 Clique)</th>
                        <th>Observações</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosFiltrados.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.data}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {r.diaSemana} às {r.horario}
                            </div>
                          </td>
                          <td>{getNomeProf(r.professorId)}</td>
                          <td>{getNomeAluno(r.alunoId)}</td>
                          <td>{getNomeSala(r.salaId)}</td>
                          <td>
                            <span
                              className={`badge ${
                                r.status === 'Realizada'
                                  ? 'badge-success'
                                  : r.status === 'Remarcada'
                                  ? 'badge-info'
                                  : 'badge-danger'
                              }`}
                            >
                              {r.status}
                            </span>
                            {r.dataRemarcacao && (
                              <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: 2 }}>
                                ↪ {r.dataRemarcacao}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {[
                                { label: '✓ Realizada', val: 'Realizada' },
                                { label: '✗ Falta Aluno', val: 'Falta do Aluno' },
                                { label: '↻ Remarcar', val: 'Remarcada' },
                                { label: '⊘ Cancelar', val: 'Cancelada' },
                              ].map((op) => (
                                <button
                                  key={op.val}
                                  disabled={r.status === op.val}
                                  className="btn btn-secondary btn-sm"
                                  style={{ opacity: r.status === op.val ? 0.4 : 1 }}
                                  onClick={() => atualizarStatusRegistro(r.id, op.val)}
                                >
                                  {op.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td style={{ maxWidth: 240, fontSize: '0.8rem' }}>{r.observacoes}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => removerRegistroOperacional(r.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
