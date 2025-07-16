import express from "express";
import cors from "cors"; // Importar CORS

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.APIKEY;
const CHAT_ID = process.env.CHATID;

// Objeto para almacenar IPs y su conteo de peticiones
const ipRequests = {};

const MAX_REQUESTS = 10;

// Configurar CORS para permitir peticiones desde cualquier origen
app.use(cors());
app.use(express.json());

// Endpoint para ver las IPs y sus contadores
app.get("/status", (req, res) => {
  res.status(200).json(ipRequests);
});

// Endpoint para limpiar todas las IPs
app.delete("/reset", (req, res) => {
  // Limpiar el objeto de las IPs
  for (let ip in ipRequests) {
    delete ipRequests[ip];
  }
  res.status(200).json({ message: "All IPs have been reset" });
});

// Endpoint para eliminar una IP específica
app.delete("/reset/:ip", (req, res) => {
  const { ip } = req.params;
  if (ipRequests[ip]) {
    delete ipRequests[ip];
    return res.status(200).json({ message: `IP ${ip} has been reset` });
  }
  res.status(404).json({ error: `IP ${ip} not found` });
});

app.post("/", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  // Obtener la IP del cliente
  const ip =
    req.headers["x-forwarded-for"]?.split(",").shift() ||
    req.socket.remoteAddress;

  // Inicializar contador si no existe
  if (!ipRequests[ip]) {
    ipRequests[ip] = 0;
  }

  // Verificar si ya alcanzó el límite
  if (ipRequests[ip] >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Request limit reached for this IP" });
  }

  // Incrementar el contador
  ipRequests[ip]++;

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const data = {
    chat_id: CHAT_ID,
    text: `<b>Mensaje recibido:</b> ${message}\n<b>IP:</b> ${ip}\n<b>Intentos:</b> ${ipRequests[ip]}/${MAX_REQUESTS}`,
    parse_mode: "HTML",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    res.status(200).json({
      message: "Message sent successfully",
      ip,
      attempts: ipRequests[ip],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Server is running on port ${PORT}`);
});
