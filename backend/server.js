app.post("/triagem", (req, res) => {

  const nome = clean(req.body?.nome);

  const sintoma = clean(req.body?.sintoma) || "";

  const temperaturaBruta = req.body?.temperatura;

  const temperatura =
    temperaturaBruta === null ||
    temperaturaBruta === "" ||
    temperaturaBruta === undefined
      ? null
      : Number(temperaturaBruta);

  const alergia = clean(req.body?.alergia) || "";

  const observacao = clean(req.body?.observacao) || "";


  if (!nome) {

    return res.status(400).json({
      erro: "Informe o nome do paciente."
    });

  }


  let risco = clean(req.body?.risco);


  const vermelhos = [
    "infarto",
    "avc",
    "convulsao",
    "hemorragia",
    "falta_ar_grave"
  ];


  const amarelos = [
    "febre",
    "vomito",
    "diarreia",
    "falta_ar_moderada"
  ];


  // Conferência básica dos critérios de risco no servidor.

  if (
    (Number.isFinite(temperatura) && temperatura >= 39) ||
    vermelhos.includes(sintoma)
  ) {

    risco = "vermelho";

  } else if (
    (Number.isFinite(temperatura) && temperatura >= 38) ||
    amarelos.includes(sintoma)
  ) {

    risco = "amarelo";

  } else if (
    !["verde", "amarelo", "vermelho"].includes(risco)
  ) {

    risco = "verde";

  }


  const comoLista = valor => {

    return Array.isArray(valor)
      ? valor.filter(item => typeof item === "string")
      : [];

  };


  const db = readDB();


  const triagem = {

    id: nextId(),

    nome,

    sintoma,

    temperatura:
      Number.isFinite(temperatura) ? temperatura : null,

    alergia,

    observacao,

    risco,

    fatoresDetectados:
      comoLista(req.body?.fatoresDetectados),

    causasPossiveis:
      comoLista(req.body?.causasPossiveis),

    cuidadosImediatos:
      comoLista(req.body?.cuidadosImediatos),

    acoesSugeridas:
      comoLista(req.body?.acoesSugeridas),

    status: "aguardando_medico",

    createdAt: new Date().toISOString()

  };


  db.triagens.push(triagem);


  // Atualiza o status do paciente que veio do Atendimento.

  const paciente = db.pacientes.find(p =>

    p.nome?.trim().toLowerCase() === nome.toLowerCase() &&
    p.status === "triagem"

  );


  if (paciente) {

    paciente.status = "aguardando_medico";

  }


  writeDB(db);


  res.status(201).json(triagem);

});
