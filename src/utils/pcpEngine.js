/**
 * Motor de Planejamento e Controle da Produção (PCP) para Escola de Música
 * Implementa validações de conflito (overbooking de salas, sobreposição docente,
 * instrumentos e alunos) e cálculo dos 4 KPIs gerenciais (SOMASE / CONT.SES equivalentes).
 */

export function parseHour(horarioStr) {
  if (!horarioStr) return 0;
  const [h] = horarioStr.split(':').map(Number);
  return isNaN(h) ? 0 : h;
}

export function intervalsOverlap(startA, durA, startB, durB) {
  const endA = startA + Number(durA || 1);
  const endB = startB + Number(durB || 1);
  return startA < endB && startB < endA;
}

/**
 * Valida uma alocação candidata contra a lista de alocações existentes e cadastros base.
 * Retorna lista de conflitos críticos (bloqueantes/erro) e alertas (avisos de carga/status).
 */
export function validarAlocacao(candidata, state, ignoreId = null) {
  const conflitos = [];
  const avisos = [];

  const startCand = parseHour(candidata.horario);
  const durCand = Number(candidata.duracaoHoras || 1);

  const sala = state.salas.find((s) => s.id === candidata.salaId);
  const professor = state.professores.find((p) => p.id === candidata.professorId);
  const aluno = state.alunos.find((a) => a.id === candidata.alunoId);
  const instrumento = candidata.instrumentoId
    ? state.instrumentos.find((i) => i.id === candidata.instrumentoId)
    : null;

  if (sala && sala.status !== 'Disponível') {
    conflitos.push(`A sala "${sala.nome}" está com status "${sala.status}".`);
  }

  if (professor && professor.status !== 'Ativo') {
    conflitos.push(`O professor "${professor.nome}" não está ativo.`);
  }

  if (aluno && aluno.status !== 'Ativo') {
    avisos.push(`Atenção: O aluno "${aluno.nome}" está com matrícula "${aluno.status}".`);
  }

  if (instrumento && instrumento.estado === 'Manutenção') {
    conflitos.push(
      `O instrumento móvel "${instrumento.patrimonio} - ${instrumento.nome}" está em Manutenção.`
    );
  }

  // Verificar sobreposição de horário no mesmo dia da semana
  const outrasAlocacoes = state.alocacoes.filter((a) => a.id !== (ignoreId || candidata.id));

  for (const outra of outrasAlocacoes) {
    if (outra.diaSemana !== candidata.diaSemana) continue;
    const startOutra = parseHour(outra.horario);
    const durOutra = Number(outra.duracaoHoras || 1);

    if (intervalsOverlap(startCand, durCand, startOutra, durOutra)) {
      if (outra.salaId === candidata.salaId) {
        const nomeSala = sala ? sala.nome : candidata.salaId;
        conflitos.push(
          `OVERBOOKING DE SALA: "${nomeSala}" já está ocupada em ${outra.diaSemana} às ${outra.horario} (${durOutra}h).`
        );
      }

      if (outra.professorId === candidata.professorId) {
        const nomeProf = professor ? professor.nome : candidata.professorId;
        conflitos.push(
          `SOBREPOSIÇÃO DOCENTE: Prof. "${nomeProf}" já possui aula em ${outra.diaSemana} às ${outra.horario} (${durOutra}h).`
        );
      }

      if (outra.alunoId === candidata.alunoId) {
        const nomeAluno = aluno ? aluno.nome : candidata.alunoId;
        conflitos.push(
          `CONFLITO DE ALUNO: "${nomeAluno}" já está alocado em ${outra.diaSemana} às ${outra.horario}.`
        );
      }

      if (
        candidata.instrumentoId &&
        outra.instrumentoId &&
        outra.instrumentoId === candidata.instrumentoId
      ) {
        const nomeInst = instrumento ? `${instrumento.patrimonio} (${instrumento.nome})` : candidata.instrumentoId;
        conflitos.push(
          `CONFLITO DE INSTRUMENTO: "${nomeInst}" já está reservado em ${outra.diaSemana} às ${outra.horario}.`
        );
      }
    }
  }

  // Verificar excesso de carga horária semanal do professor
  if (professor) {
    const horasAtuaisProf = outrasAlocacoes
      .filter((a) => a.professorId === professor.id)
      .reduce((acc, a) => acc + Number(a.duracaoHoras || 1), 0);
    const totalComNova = horasAtuaisProf + durCand;
    if (totalComNova > Number(professor.cargaHorariaSemanal)) {
      avisos.push(
        `SOBRECARGA DOCENTE: Prof. "${professor.nome}" ficará com ${totalComNova}h/semana (acima da carga contratada de ${professor.cargaHorariaSemanal}h).`
      );
    }
  }

  // Verificar excesso de disponibilidade da sala
  if (sala) {
    const horasAtuaisSala = outrasAlocacoes
      .filter((a) => a.salaId === sala.id)
      .reduce((acc, a) => acc + Number(a.duracaoHoras || 1), 0);
    const totalSalaComNova = horasAtuaisSala + durCand;
    if (totalSalaComNova > Number(sala.horasDisponiveisSemana)) {
      avisos.push(
        `CAPACIDADE DE SALA EXCEDIDA: "${sala.nome}" ficará com ${totalSalaComNova}h/semana (disponibilidade cadastrada: ${sala.horasDisponiveisSemana}h).`
      );
    }
  }

  return {
    valido: conflitos.length === 0,
    conflitos,
    avisos,
  };
}

/**
 * Mapeia todos os conflitos existentes na grade atual para destaque visual (formatação condicional)
 */
export function mapearConflitosGrade(state) {
  const mapaPorAlocacao = {};
  let totalConflitos = 0;

  for (const aloc of state.alocacoes) {
    const res = validarAlocacao(aloc, state, aloc.id);
    mapaPorAlocacao[aloc.id] = res;
    if (!res.valido) {
      totalConflitos += res.conflitos.length;
    }
  }

  return {
    mapaPorAlocacao,
    totalConflitos: Math.ceil(totalConflitos / 2), // Cada par de conflito é contado 2x
  };
}

/**
 * Calcula todos os Indicadores de Desempenho (KPIs) do Módulo 5
 */
export function calcularKPIs(state) {
  // 1. Taxa de Ocupação das Salas
  const detalhesSalas = state.salas.map((sala) => {
    const horasAlocadas = state.alocacoes
      .filter((a) => a.salaId === sala.id)
      .reduce((acc, a) => acc + Number(a.duracaoHoras || 1), 0);
    const disp = Number(sala.horasDisponiveisSemana) || 1;
    const taxa = Math.min(100, Math.round((horasAlocadas / disp) * 1000) / 10);
    return {
      ...sala,
      horasAlocadas,
      taxaOcupacao: taxa,
    };
  });

  const totalHorasSalasDisp = state.salas
    .filter((s) => s.status === 'Disponível')
    .reduce((acc, s) => acc + (Number(s.horasDisponiveisSemana) || 0), 0);
  const totalHorasSalasAloc = detalhesSalas.reduce((acc, s) => acc + s.horasAlocadas, 0);
  const taxaOcupacaoSalasGeral =
    totalHorasSalasDisp > 0
      ? Math.round((totalHorasSalasAloc / totalHorasSalasDisp) * 1000) / 10
      : 0;

  // 2. Taxa de Utilização dos Professores
  const detalhesProfessores = state.professores.map((prof) => {
    const horasAlocadas = state.alocacoes
      .filter((a) => a.professorId === prof.id)
      .reduce((acc, a) => acc + Number(a.duracaoHoras || 1), 0);
    const qtdAlunos = state.alunos.filter(
      (al) => al.professorId === prof.id && al.status === 'Ativo'
    ).length;
    const carga = Number(prof.cargaHorariaSemanal) || 1;
    const taxa = Math.round((horasAlocadas / carga) * 1000) / 10;
    return {
      ...prof,
      horasAlocadas,
      qtdAlunos,
      taxaUtilizacao: taxa,
    };
  });

  const totalCargaProfs = state.professores
    .filter((p) => p.status === 'Ativo')
    .reduce((acc, p) => acc + (Number(p.cargaHorariaSemanal) || 0), 0);
  const totalHorasProfsAloc = detalhesProfessores.reduce((acc, p) => acc + p.horasAlocadas, 0);
  const taxaUtilizacaoProfessoresGeral =
    totalCargaProfs > 0 ? Math.round((totalHorasProfsAloc / totalCargaProfs) * 1000) / 10 : 0;

  // 3. Índice de Aulas Realizadas e Absenteísmo (Planejado vs. Realizado)
  const totalRegistros = state.registrosOperacionais.length;
  const aulasRealizadas = state.registrosOperacionais.filter((r) => r.status === 'Realizada').length;
  const faltasAluno = state.registrosOperacionais.filter(
    (r) => r.status === 'Falta do Aluno'
  ).length;
  const aulasCanceladas = state.registrosOperacionais.filter((r) => r.status === 'Cancelada').length;
  const aulasRemarcadas = state.registrosOperacionais.filter((r) => r.status === 'Remarcada').length;

  const indiceAulasRealizadas =
    totalRegistros > 0 ? Math.round((aulasRealizadas / totalRegistros) * 1000) / 10 : 0;
  const indiceAbsenteismo =
    totalRegistros > 0
      ? Math.round(((faltasAluno + aulasCanceladas) / totalRegistros) * 1000) / 10
      : 0;
  const taxaFaltasAluno =
    totalRegistros > 0 ? Math.round((faltasAluno / totalRegistros) * 1000) / 10 : 0;

  // 4. Taxa de Evasão / Churn Rate e Retenção de Alunos
  const totalAlunos = state.alunos.length;
  const alunosAtivos = state.alunos.filter((a) => a.status === 'Ativo').length;
  const alunosTrancados = state.alunos.filter((a) => a.status === 'Trancado').length;
  const alunosCancelados = state.alunos.filter((a) => a.status === 'Cancelado').length;

  // Churn Rate sobre a base total de matrículas (Cancelados / Total) e Evasão Total (Cancelados + Trancados)
  const churnRateCancelados =
    totalAlunos > 0 ? Math.round((alunosCancelados / totalAlunos) * 1000) / 10 : 0;
  const taxaEvasaoGlobal =
    totalAlunos > 0
      ? Math.round(((alunosCancelados + alunosTrancados) / totalAlunos) * 1000) / 10
      : 0;
  const taxaRetencao = totalAlunos > 0 ? Math.round((alunosAtivos / totalAlunos) * 1000) / 10 : 0;

  const receitaMensalEstimada = state.alunos
    .filter((a) => a.status === 'Ativo')
    .reduce((acc, a) => acc + (Number(a.mensalidade) || 0), 0);

  return {
    ocupacaoSalas: {
      taxaGeral: taxaOcupacaoSalasGeral,
      horasAlocadas: totalHorasSalasAloc,
      horasDisponiveis: totalHorasSalasDisp,
      detalhesPorSala: detalhesSalas,
    },
    utilizacaoProfessores: {
      taxaGeral: taxaUtilizacaoProfessoresGeral,
      horasAlocadas: totalHorasProfsAloc,
      cargaDisponivel: totalCargaProfs,
      detalhesPorProfessor: detalhesProfessores,
    },
    execucaoOperacional: {
      totalPlanejado: totalRegistros,
      realizadas: aulasRealizadas,
      faltasAluno,
      canceladas: aulasCanceladas,
      remarcadas: aulasRemarcadas,
      indiceRealizadas: indiceAulasRealizadas,
      indiceAbsenteismo,
      taxaFaltasAluno,
    },
    retencaoAlunos: {
      total: totalAlunos,
      ativos: alunosAtivos,
      trancados: alunosTrancados,
      cancelados: alunosCancelados,
      churnRate: churnRateCancelados,
      taxaEvasaoGlobal,
      taxaRetencao,
      receitaMensalEstimada,
      historicoMensal: state.historicoRetencaoMensal || [],
    },
  };
}
