const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, "frontend");
const DB_FILE = path.join(__dirname, "backend", "db.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

function defaultDB() {
  return {
    usuarios: [
      { usuario: "triagem", senha: "123", tipo: "triagem" },
      { usuario: "medico", senha: "123", tipo: "medico" },
      { usuario: "atendimento", senha: "123", tipo: "atendimento" }
    ],
    pacientes: [],
    triagens: [],
    consultas: [],
    tv_chamada: null,
    tv_historico: []
  };
}

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDB();
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db.usuarios ||= [];
    db.pacientes ||= [];
    db.triagens ||= [];
    db.consultas ||= [];
    db.tv_chamada ??= null;
    db.tv_historico ||= [];
    return db;
  } catch (error) {
    console.error("Erro ao ler banco:", error);
    return defaultDB();
  }
}

function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const temp = `${DB_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temp, DB_FILE);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// API
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Hospital Sentinela" });
});

app.post("/login", (req, res) => {
  const usuario = clean(req.body?.usuario);
  const senha = clean(req.body?.senha);
  const db = readDB();
  const user = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (!user) return res.status(401).json({ erro: "Usuário ou senha inválidos." });
  res.json({ tipo: user.tipo });
});

app.post("/atendimento", (req, res) => {
  const nome = clean(req.body?.nome);
  const cpf = clean(req.body?.cpf);
  const tipo = clean(req.body?.tipo) || "Particular";

  if (!nome) return res.status(400).json({ erro: "Informe o nome do paciente." });

  const db = readDB();
  const paciente = {
    id: nextId(),
    nome,
    cpf: cpf || "",
    tipo,
    status: "triagem",
    createdAt: new Date().toISOString()
  };

  db.pacientes.push(paciente);
  writeDB(db);
  res.status(201).json(paciente);
});

app.get("/pacientes", (_req, res) => res.json(readDB().pacientes));

app.post("/triagem", (req, res) => {
  const nome = clean(req.body?.nome);
  const sintoma = clean(req.body?.sintoma) || "";
  const temperatura = Number(req.body?.temperatura);
  const alergia = clean(req.body?.alergia) || "";
  const observacao = clean(req.body?.observacao) || "";

  if (!nome) return res.status(400).json({ erro: "Informe o nome do paciente." });

  let risco = "verde";
  const vermelhos = ["infarto", "avc", "convulsao", "hemorragia", "falta_ar_grave"];
  const amarelos = ["febre", "vomito", "diarreia", "falta_ar_moderada"];

  if (Number.isFinite(temperatura) && temperatura >= 39) risco = "vermelho";
  else if (vermelhos.includes(sintoma)) risco = "vermelho";
  else if ((Number.isFinite(temperatura) && temperatura >= 38) || amarelos.includes(sintoma)) risco = "amarelo";

  const db = readDB();
  const triagem = {
    id: nextId(),
    nome,
    sintoma,
    temperatura: Number.isFinite(temperatura) ? temperatura : null,
    alergia,
    observacao,
    risco,
    status: "aguardando_medico",
    createdAt: new Date().toISOString()
  };

  db.triagens.push(triagem);

  // Se o paciente veio do Atendimento, deixa de aparecer na fila do guichê.
  const paciente = db.pacientes.find(p => p.nome?.trim().toLowerCase() === nome.toLowerCase() && p.status === "triagem");
  if (paciente) paciente.status = "aguardando_medico";

  writeDB(db);
  res.status(201).json(triagem);
});

app.get("/triagens", (_req, res) => {
  const db = readDB();
  res.json(db.triagens.filter(t => t.status === "aguardando_medico"));
});

app.get("/lista-medicacoes", (_req, res) => {
  res.json([
    "Dipirona", "Paracetamol", "Ibuprofeno", "Amoxicilina", "Azitromicina",
    "Loratadina", "Omeprazol", "Buscopan", "Dramin", "Soro fisiológico"
  ]);
});

app.post("/consulta", (req, res) => {
  const paciente = clean(req.body?.paciente);
  if (!paciente) return res.status(400).json({ erro: "Selecione um paciente." });

  const db = readDB();
  const consulta = {
    id: nextId(),
    paciente,
    dataConsulta: clean(req.body?.dataConsulta) || new Date().toISOString().slice(0, 10),
    sintomas: clean(req.body?.sintomas) || "",
    alergias: clean(req.body?.alergias) || "",
    diagnostico: clean(req.body?.diagnostico) || "",
    tratamento: clean(req.body?.tratamento) || "",
    medicacao: clean(req.body?.medicacao) || "",
    exames: clean(req.body?.exames) || "",
    situacaoAlta: clean(req.body?.situacaoAlta) || "",
    retorno: clean(req.body?.retorno) || "",
    orientacoes: clean(req.body?.orientacoes) || "",
    observacoes: clean(req.body?.observacoes) || "",
    medico: clean(req.body?.medico) || "",
    crm: clean(req.body?.crm) || "",
    createdAt: new Date().toISOString()
  };

  db.consultas.push(consulta);
  // Marca a triagem como atendida para não ficar na fila médica.
  const triagem = [...db.triagens].reverse().find(t => t.nome?.trim().toLowerCase() === paciente.toLowerCase() && t.status === "aguardando_medico");
  if (triagem) triagem.status = "atendido";

  writeDB(db);
  res.status(201).json(consulta);
});

app.get("/medicacoes", (_req, res) => res.json(readDB().consultas));

app.post("/tv/chamar", (req, res) => {
  const paciente = clean(req.body?.paciente);
  const localTipo = clean(req.body?.localTipo) || "GUICHÊ";
  const localNumero = clean(req.body?.localNumero) || "01";

  if (!paciente) return res.status(400).json({ erro: "Informe o paciente." });

  const db = readDB();
  const chamada = {
    id: nextId(),
    localTipo,
    localNumero,
    paciente,
    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };

  db.tv_chamada = chamada;
  db.tv_historico.unshift(chamada);
  db.tv_historico = db.tv_historico.slice(0, 5);

  writeDB(db);
  res.status(201).json(chamada);
});

app.get("/tv/chamada", (_req, res) => {
  const db = readDB();
  res.json({ chamada: db.tv_chamada, historico: db.tv_historico });
});

// Servir o frontend no mesmo domínio.
// Isso elimina o localhost:3000 fixo e funciona no Render.
app.use(express.static(FRONTEND_DIR));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (req.method !== "GET") return next();
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🏥 Hospital Sentinela rodando na porta ${PORT}`);
});
