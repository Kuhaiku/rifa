const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Permite que o servidor entregue arquivos estáticos (como a sua template.jpg)
app.use(express.static(__dirname));

// ROTA DA TELA PRINCIPAL (Painel de Vendas)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// NOVA ROTA: TELA DO SORTEIO
app.get('/sorteio', (req, res) => {
    res.sendFile(path.join(__dirname, 'sorteio.html'));
});

// Configuração do Banco de Dados (Easypanel)
const pool = mysql.createPool({
    host: 'www_riffaa', 
    user: 'mysql', 
    password: 'Raposo88125442@@', 
    database: 'riffa', 
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Função para iniciar a tabela do banco de dados no estado zero
async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                number INT NOT NULL UNIQUE,
                buyer_name VARCHAR(255) NOT NULL,
                contact VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Garante que a coluna de contato exista
        try { await pool.query(`ALTER TABLE tickets ADD COLUMN contact VARCHAR(50)`); } catch (e) { }
        console.log("Banco de dados pronto.");
    } catch (err) {
        console.error("Erro ao conectar ao MySQL:", err.message);
    }
}
setTimeout(initDb, 2000); 

// ROTA: Listar todas as vendas registradas
app.get('/tickets', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT number, buyer_name, contact FROM tickets');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROTA: Registrar uma nova venda
app.post('/tickets', async (req, res) => {
    const { numbers, buyer_name, contact } = req.body;
    
    if (!numbers || numbers.length === 0 || !buyer_name) {
        return res.status(400).json({ error: 'Preencha o nome e selecione os números.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (let num of numbers) {
            await connection.query('INSERT INTO tickets (number, buyer_name, contact) VALUES (?, ?, ?)', [num, buyer_name, contact || '']);
        }
        await connection.commit();
        res.json({ success: true, message: 'Venda registrada com sucesso!' });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ error: 'Erro: Um ou mais números já foram vendidos.' });
    } finally {
        connection.release();
    }
});

// ROTA: Estornar/Excluir uma venda específica
app.delete('/tickets/:number', async (req, res) => {
    const { number } = req.params;
    try {
        await pool.query('DELETE FROM tickets WHERE number = ?', [number]);
        res.json({ success: true, message: `Número ${number} liberado com sucesso!` });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao cancelar a venda.' });
    }
});

// Inicia o servidor
app.listen(3000, () => console.log('Backend rodando na porta 3000'));