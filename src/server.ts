import app from "./app";
import { env } from "./config/env";

const start = async () => {
  try {
    app.listen(env.port, () => {
      console.log(`Servidor corriendo en http://localhost:${env.port}`);
      console.log(`Entorno: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

start();
