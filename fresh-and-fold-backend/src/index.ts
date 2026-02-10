import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Fresh & Fold Backend",
  });
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`🚀 Fresh & Fold backend running on http://localhost:${PORT}`);
});
