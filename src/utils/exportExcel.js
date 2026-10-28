/**
 * Utilitário para exportação de planilhas integradas compatíveis com Microsoft Excel e Google Planilhas
 */

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function downloadCsv(filename, headers, rows) {
  const bom = '\uFEFF';
  const headerLine = headers.map(escapeCsvCell).join(';');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
  const csvContent = `${bom}${headerLine}\r\n${bodyLines}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarRelatorioCompletoCSV(state, kpis) {
  const getProf = (id) => state.professores.find((p) => p.id === id)?.nome || '-';
  const getAluno = (id) => state.alunos.find((a) => a.id === id)?.nome || '-';
  const getSala = (id) => state.salas.find((s) => s.id === id)?.nome || '-';
  const getInst = (id) => state.instrumentos.find((i) => i.id === id)?.nome || 'Próprio / Sala';

  const headers = [
    'Módulo / Seção',
    'Identificador / Dia',
    'Nome / Horário',
    'Detalhe 1 (Professor / Curso)',
    'Detalhe 2 (Aluno / Capacidade)',
    'Detalhe 3 (Sala / Carga Horária)',
    'Status / Indicador',
    'Observações / Valor',
  ];

  const rows = [];

  // KPIs
  rows.push([
    'MÓDULO 5 - KPI',
    'KPI-01',
    'Taxa de Ocupação das Salas',
    `${kpis.ocupacaoSalas.horasAlocadas}h alocadas`,
    `${kpis.ocupacaoSalas.horasDisponiveis}h disponíveis`,
    'Infraestrutura Física',
    `${kpis.ocupacaoSalas.taxaGeral}%`,
    'Aproveitamento das salas de aula',
  ]);
  rows.push([
    'MÓDULO 5 - KPI',
    'KPI-02',
    'Taxa de Utilização dos Professores',
    `${kpis.utilizacaoProfessores.horasAlocadas}h alocadas`,
    `${kpis.utilizacaoProfessores.cargaDisponivel}h contratadas`,
    'Corpo Docente',
    `${kpis.utilizacaoProfessores.taxaGeral}%`,
    'Eficiência da alocação docente',
  ]);
  rows.push([
    'MÓDULO 5 - KPI',
    'KPI-03',
    'Índice de Aulas Realizadas',
    `${kpis.execucaoOperacional.realizadas} realizadas`,
    `${kpis.execucaoOperacional.totalPlanejado} planejadas`,
    `Absenteísmo: ${kpis.execucaoOperacional.indiceAbsenteismo}%`,
    `${kpis.execucaoOperacional.indiceRealizadas}%`,
    'Monitoramento Planejado vs Realizado',
  ]);
  rows.push([
    'MÓDULO 5 - KPI',
    'KPI-04',
    'Taxa de Evasão / Churn Rate',
    `${kpis.retencaoAlunos.ativos} ativos`,
    `${kpis.retencaoAlunos.trancados} trancados / ${kpis.retencaoAlunos.cancelados} cancelados`,
    `Retenção: ${kpis.retencaoAlunos.taxaRetencao}%`,
    `${kpis.retencaoAlunos.churnRate}%`,
    'Retenção de alunos da escola',
  ]);

  // Módulo 1 - Professores
  for (const p of state.professores) {
    rows.push([
      'MÓDULO 1 - PROFESSOR',
      p.id,
      p.nome,
      p.especialidades,
      p.telefone,
      `${p.cargaHorariaSemanal}h/semana`,
      p.status,
      p.email,
    ]);
  }

  // Módulo 1 - Salas
  for (const s of state.salas) {
    rows.push([
      'MÓDULO 1 - SALA',
      s.id,
      s.nome,
      s.equipamentos,
      `Cap: ${s.capacidade} alunos`,
      `${s.horasDisponiveisSemana}h/semana`,
      s.status,
      '',
    ]);
  }

  // Módulo 1 - Instrumentos
  for (const i of state.instrumentos) {
    rows.push([
      'MÓDULO 1 - INSTRUMENTO',
      i.patrimonio,
      i.nome,
      i.categoria,
      '-',
      '-',
      i.estado,
      i.observacoes,
    ]);
  }

  // Módulo 2 - Alunos
  for (const a of state.alunos) {
    rows.push([
      'MÓDULO 2 - ALUNO',
      a.matricula,
      a.nome,
      a.curso,
      getProf(a.professorId),
      `Matrícula: ${a.dataMatricula}`,
      a.status,
      `R$ ${a.mensalidade} | ${a.historico}`,
    ]);
  }

  // Módulo 3 - Programação Semanal
  for (const al of state.alocacoes) {
    rows.push([
      'MÓDULO 3 - GRADE PCP',
      al.diaSemana,
      `${al.horario} (${al.duracaoHoras}h)`,
      getProf(al.professorId),
      getAluno(al.alunoId),
      getSala(al.salaId),
      getInst(al.instrumentoId),
      al.observacoes,
    ]);
  }

  // Módulo 4 - Registro Operacional
  for (const r of state.registrosOperacionais) {
    rows.push([
      'MÓDULO 4 - OPERACIONAL',
      r.data,
      `${r.diaSemana} ${r.horario}`,
      getProf(r.professorId),
      getAluno(r.alunoId),
      getSala(r.salaId),
      r.status,
      r.dataRemarcacao ? `Remarcada p/ ${r.dataRemarcacao} | ${r.observacoes}` : r.observacoes,
    ]);
  }

  downloadCsv('Relatorio_PCP_Escola_de_Musica.csv', headers, rows);
}
