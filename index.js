const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('productividad.db');

// 1. Crear las tablas SIN restricciones de categoría fija
db.exec(`
  CREATE TABLE IF NOT EXISTS Categorias (
    Nombre TEXT PRIMARY KEY,
    Color TEXT
  );

  -- Insertar las categorías base de tu entorno
  INSERT OR IGNORE INTO Categorias (Nombre, Color) VALUES 
  ('Desarrollo', 'bg-blue-100 text-blue-800'),
  ('Zarzal', 'bg-green-100 text-green-800'),
  ('Hogar', 'bg-orange-100 text-orange-800'),
  ('Administrativo', 'bg-gray-100 text-gray-800');

  CREATE TABLE IF NOT EXISTS Tareas (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Titulo TEXT NOT NULL,
    Descripcion TEXT,
    EsImportante BOOLEAN NOT NULL DEFAULT 0,
    EsUrgente BOOLEAN NOT NULL DEFAULT 0,
    Categoria TEXT,
    Completada BOOLEAN NOT NULL DEFAULT 0,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FechaVencimiento DATETIME
  );
`);

// --- ENDPOINTS DE TAREAS ---
app.get('/api/tareas', (req, res) => {
    const tareas = db.prepare(`
    SELECT Id, Titulo, Categoria,
      CASE 
          WHEN EsImportante = 1 AND EsUrgente = 1 THEN 'Q1_Hacer'
          WHEN EsImportante = 1 AND EsUrgente = 0 THEN 'Q2_Planificar'
          WHEN EsImportante = 0 AND EsUrgente = 1 THEN 'Q3_Delegar'
          ELSE 'Q4_Eliminar'
      END AS Cuadrante
    FROM Tareas WHERE Completada = 0 ORDER BY Id DESC;
  `).all();
    res.json(tareas);
});

app.post('/api/tareas', (req, res) => {
    const { Titulo, EsImportante, EsUrgente, Categoria } = req.body;
    if (!Titulo) return res.status(400).json({ error: 'Título obligatorio' });
    const stmt = db.prepare('INSERT INTO Tareas (Titulo, EsImportante, EsUrgente, Categoria) VALUES (?, ?, ?, ?)');
    stmt.run(Titulo, EsImportante ? 1 : 0, EsUrgente ? 1 : 0, Categoria || 'Desarrollo');
    res.status(201).json({ mensaje: 'OK' });
});

app.put('/api/tareas/:id/completar', (req, res) => {
    db.prepare('UPDATE Tareas SET Completada = 1 WHERE Id = ?').run(req.params.id);
    res.json({ mensaje: 'OK' });
});

app.delete('/api/tareas/:id', (req, res) => {
    db.prepare('DELETE FROM Tareas WHERE Id = ?').run(req.params.id);
    res.json({ mensaje: 'OK' });
});

// --- NUEVOS ENDPOINTS DE CATEGORÍAS ---
app.get('/api/categorias', (req, res) => {
    res.json(db.prepare('SELECT * FROM Categorias').all());
});

app.post('/api/categorias', (req, res) => {
    const { Nombre, Color } = req.body;
    try {
        db.prepare('INSERT INTO Categorias (Nombre, Color) VALUES (?, ?)').run(Nombre, Color);
        res.status(201).json({ mensaje: 'OK' });
    } catch (err) {
        res.status(400).json({ error: 'La categoría ya existe' });
    }
});

app.delete('/api/categorias/:nombre', (req, res) => {
    db.prepare('DELETE FROM Categorias WHERE Nombre = ?').run(req.params.nombre);
    res.json({ mensaje: 'OK' });
});

app.listen(3000, () => console.log('Servidor corriendo en https://eisenhower-backend.soltechn.cloud:3000'));
